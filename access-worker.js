import app from './worker.js';
export { Euro5CategoryAI } from './worker.js';
import {verifyAccess} from './auth/access.js';
import {authenticate,issue,cookie,profiles,tester,hash,allowPasswordAttempt} from './auth/session.js';
import {loginHtml} from './auth/login.js';
const FRONTEND='https://raw.githubusercontent.com/ukrsedo/euro5-tender-bid-assistant/main/';
const ASSET_TYPES={html:'text/html; charset=utf-8',js:'application/javascript; charset=utf-8',css:'text/css; charset=utf-8',png:'image/png'};
const ASSET_NAMES=new Set(['index.html','app.js','styles.css','euro5-logo.png','price-risk.js','buyer-card.js','buyer-competition.js','memory.js']);
export async function sharedAsset(request,fetcher=fetch){
  const url=new URL(request.url);
  if(url.pathname==='/config.js')return new Response("window.EURO5_CONFIG = {apiUrl: window.location.origin, authMode: 'session'};\n",{headers:{'Content-Type':'application/javascript; charset=utf-8'}});
  const name=url.pathname==='/'?'index.html':url.pathname.slice(1);
  if(!ASSET_NAMES.has(name))return json({error:'Не знайдено'},404);
  try{
    const source=new URL(FRONTEND+name);source.searchParams.set('release',url.searchParams.get('v')||'current');source.searchParams.set('refresh',String(Math.floor(Date.now()/300000)));
    const upstream=await fetcher(source.toString(),{method:request.method,redirect:'manual',headers:{Accept:'*/*'},cf:{cacheEverything:true,cacheTtl:300}});
    if(!upstream.ok){console.error('Shared frontend HTTP',upstream.status,name);return json({error:'Не вдалося завантажити єдиний інтерфейс. Оновіть сторінку.',code:'shared_frontend_http_'+upstream.status},502);}
    const headers=new Headers({'Content-Type':ASSET_TYPES[name.split('.').at(-1)]});
    headers.set('X-Euro5-Frontend','shared-main');
    return new Response(request.method==='HEAD'?null:upstream.body,{status:200,headers});
  }catch(e){console.error('Shared frontend fetch failed',e?.message);return json({error:'Не вдалося завантажити єдиний інтерфейс. Оновіть сторінку.',code:'shared_frontend_fetch_failed'},502);}
}
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
const login=(message='',status=200)=>new Response(loginHtml(message),{status,headers:{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store'}});
const redirect=(location,session)=>new Response(null,{status:303,headers:{Location:location,'Cache-Control':'no-store',...(session?{'Set-Cookie':cookie(session.value,session.maxAge)}:{})}});
function secure(response){const result=new Response(response.body,response);for(const [name,value] of Object.entries({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'same-origin','X-Frame-Options':'DENY','Content-Security-Policy':"frame-ancestors 'none'; base-uri 'self'; form-action 'self'"}))result.headers.set(name,value);return result;}
export async function handle(request,env,ctx,application=app){
  const url=new URL(request.url),path=url.pathname,origin=request.headers.get('Origin');
  if(url.protocol!=='https:')return json({error:'HTTPS required'},400);
  if(!env.SESSION_SECRET||env.SESSION_SECRET.length<48)return json({error:'Вхід ще не налаштовано.'},503);
  if(!['GET','HEAD','POST'].includes(request.method))return json({error:'Method not allowed'},405);
  if(request.method==='POST'&&origin&&origin!==url.origin)return json({error:'Forbidden origin'},403);
  if(path==='/login'&&request.method==='GET'){
    if(url.searchParams.get('check')==='frontend'){
      const probe=await sharedAsset(new Request(url.origin+'/'));
      return json({release:'2026.10.24-unified-access-2',frontend:probe.ok?'ready':'unavailable',status:probe.status},probe.ok?200:503);
    }
    return login();
  }
  if(path==='/auth/test'&&request.method==='POST'){
    try{
      const user=tester(env);if(!user)return login('Спільний тестовий вхід вимкнено.',403);
      if(!await allowPasswordAttempt(request,env))return login('Забагато спроб. Спробуйте через 15 хвилин.',429);
      if(Number(request.headers.get('Content-Length')||0)>2048)return login('Некоректний запит.',413);
      const raw=await request.text();if(raw.length>2048)return login('Некоректний запит.',413);
      if(!request.headers.get('Content-Type')?.startsWith('application/x-www-form-urlencoded'))return login('Некоректний запит.',400);
      const password=new URLSearchParams(raw).get('password')||'';
      if(password.length<12||password.length>256||await hash(password)!==env.TEST_PASSWORD_SHA256)return login('Невірний пароль.',401);
      return redirect('/',await issue(user,env));
    }catch{return login('Вхід тимчасово недоступний.',503);}
  }
  if(path==='/admin-login'&&request.method==='GET'){
    try{
      const identity=await verifyAccess(request,env);
      const user=profiles(env).find(x=>x.email.trim().toLowerCase()===identity.email.trim().toLowerCase());
      if(!user)return login('Вашому акаунту доступ не надано.',403);
      return redirect('/',await issue(user,env));
    }catch{return login('Індивідуальний вхід недоступний. Перевірте налаштування Cloudflare Access.',403);}
  }
  if(path==='/logout'&&request.method==='POST')return redirect('/login',{value:'',maxAge:0});
  const user=await authenticate(request,env);
  if(!user)return request.method==='GET'&&!path.startsWith('/memory/')&&path!=='/session'?redirect('/login'):json({error:'Сесія закінчилась. Увійдіть знову.',loginUrl:'/login'},401);
  if(path==='/session'&&request.method==='GET')return json({id:user.id,name:user.name,role:user.role,shared:user.id==='test-team',frontend:'shared-main',release:'2026.10.24-unified-access-2'});
  if(path==='/tender-check'){
    if(request.method!=='POST')return json({error:'Method not allowed'},405);
    if(!env.TENDER_AI?.fetch)return json({error:'Внутрішнє підключення аналізу ще не налаштовано.'},503);
    // The existing backend keeps its own AI secrets. Only this authenticated route may call it.
    // Forward the analysis payload without browser session, Access assertions or credentials.
    const headers=new Headers({'Content-Type':'application/json'});
    try{return await env.TENDER_AI.fetch(new Request('https://internal.euro5/tender-check',{method:'POST',headers,body:request.body,duplex:'half'}));}
    catch{return json({error:'Сервіс аналізу тимчасово недоступний. Спробуйте ще раз.'},502);}
  }
  if(['/buyer-history','/health'].includes(path)||path.startsWith('/memory/')){
    // Identity is a trusted internal object, never a client header or selected profile ID.
    const headers=new Headers(request.headers);headers.delete('Origin');headers.delete('Authorization');
    return application.fetch(new Request(request,{headers}),{...env,MEMORY_AUTH_MODE:'session',EURO5_SESSION_ACTOR:user},ctx);
  }
  if(request.method==='GET'||request.method==='HEAD')return sharedAsset(request);
  return json({error:'Не знайдено'},404);
}
export default {async fetch(request,env,ctx){try{return secure(await handle(request,env,ctx));}catch{return secure(json({error:'Сервіс тимчасово недоступний.'},503));}}};
