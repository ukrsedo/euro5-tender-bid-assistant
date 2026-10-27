import app, {buildMarketReference,buildCompetitionForecast} from './worker.js';
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
    const upstream=await fetcher(source.toString(),/** @type {any} */ ({method:request.method,redirect:'manual',headers:{Accept:'*/*'},cf:{cacheEverything:true,cacheTtl:300}}));
    if(!upstream.ok){console.error('Shared frontend HTTP',upstream.status,name);return json({error:'Не вдалося завантажити єдиний інтерфейс. Оновіть сторінку.',code:'shared_frontend_http_'+upstream.status},502);}
    const headers=new Headers({'Content-Type':ASSET_TYPES[name.split('.').at(-1)]});
    headers.set('X-Euro5-Frontend','shared-main');
    headers.set('Cache-Control','no-store, max-age=0');
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
    try{
      const upstream=await env.TENDER_AI.fetch(new Request('https://internal.euro5/tender-check',/** @type {any} */ ({method:'POST',headers,body:request.body,duplex:'half'})));
      if(!upstream.ok)return upstream;
      // The AI service is deployed independently and may not yet include the
      // buyer-history metadata added to this protected Worker. The official
      // tender identifier provides a conservative pre-announcement cutoff.
      const data=await upstream.clone().json().catch(()=>null);
      if(!data||typeof data!=='object'||Array.isArray(data))return upstream;
      if(!data.buyer_history_as_of){
        const match=String(data.tender_id||'').match(/^UA-(\d{4}-\d{2}-\d{2})-\d+-[a-z]$/i);
        if(match){
          const day=new Date(match[1]+'T12:00:00Z');
          if(Number.isFinite(day.getTime())&&day.toISOString().slice(0,10)===match[1]&&day.getTime()<=Date.now())
            data.buyer_history_as_of=match[1];
        }
      }
      // The independently deployed TENDER_AI service can still run the old
      // strict dateCreated check. Rebuild only its missing market reference in
      // this authenticated Worker using the official Prozorro tender record.
      if(typeof data.market_comparison_note==='string'&&
         data.market_comparison_note.includes('Не вдалося підтвердити дату оприлюднення')&&
         data.api_url&&Number(data.expected_value_uah)>0){
        try{
          const sourceUrl=new URL(data.api_url);
          if(sourceUrl.protocol==='https:'&&sourceUrl.hostname==='public-api.prozorro.gov.ua'&&
             /^\/api\/2\.5\/tenders\/[a-zA-Z0-9-]+$/.test(sourceUrl.pathname)){
            const source=await fetch(sourceUrl.toString(),{headers:{Accept:'application/json'}});
            if(source.ok){
              const payload=await source.json();
              const tender=payload?.data||payload;
              if(tender?.tenderID===data.tender_id){
                const marketResult=await buildMarketReference(
                  tender,
                  {fuel_type:data.fuel_type,gasoline_volume_l:data.gasoline_volume_l,diesel_volume_l:data.diesel_volume_l},
                  {normalizedWithoutVat:Number(data.expected_value_uah)},
                  {supplyFormat:data.supply_format,gasolineSupplyFormat:data.gasoline_supply_format,dieselSupplyFormat:data.diesel_supply_format}
                );
                // Preserve a complete shape for the short unavailable-market response.
                const market=Object.assign({available:false,note:null,tenderDate:null,referenceCandidates:null,fuelProducts:null,referenceDate:null,retailReferenceDate:null,retailSource:null,wholesaleReferenceDate:null,marketValueWithoutVat:null,budgetVsMarketPct:null,text:null,fuelTrend30dPct:null},marketResult);
                data.market_comparison_available=!!market.available;
                data.market_comparison_note=market.note||'Ринкове порівняння не підтверджено.';
                data.tender_announcement_date=market.tenderDate||null;
                data.market_reference_candidates=market.referenceCandidates||null;
                data.fuel_products=market.fuelProducts||data.fuel_products||null;
                data.market_reference_date=market.referenceDate||null;
                data.market_retail_reference_date=market.retailReferenceDate||null;
                data.market_retail_source=market.retailSource||null;
                data.market_wholesale_reference_date=market.wholesaleReferenceDate||null;
                data.market_value_uah_without_vat=market.marketValueWithoutVat||null;
                data.budget_vs_market_pct=market.budgetVsMarketPct??null;
                data.budget_vs_market_text=market.text||null;
                data.fuel_market_trend_30d_pct=market.fuelTrend30dPct??null;
              }
            }
          }
        }catch(e){console.error('Market reference fallback failed',e?.message);}
        if(data.market_comparison_note.includes('Не вдалося підтвердити дату оприлюднення')){
          data.market_comparison_note='Дата оголошення визначена за офіційним ID тендера, але ринкові ціни на цю дату поки не підтверджені. Порівняння не розраховано.';
        }
      }
      // Independently deployed TENDER_AI may omit competition_forecast.
      // Recover the original statistical model from the official Prozorro
      // record; never invent percentages or treat missing data as zero.
      const forecast=data.competition_forecast;
      const validForecast=forecast &&
        Number.isFinite(forecast.one_participant_pct) &&
        Number.isFinite(forecast.two_plus_participants_pct) &&
        forecast.one_participant_pct>=0 && forecast.one_participant_pct<=100 &&
        forecast.two_plus_participants_pct>=0 && forecast.two_plus_participants_pct<=100 &&
        Math.abs(forecast.one_participant_pct+forecast.two_plus_participants_pct-100)<1;
      if(!validForecast && data.api_url && Number(data.expected_value_uah)>=1000000){
        try{
          const sourceUrl=new URL(data.api_url);
          if(sourceUrl.protocol==='https:' && sourceUrl.hostname==='public-api.prozorro.gov.ua' &&
             /^\\/api\\/2\\.5\\/tenders\\/[a-zA-Z0-9-]+$/.test(sourceUrl.pathname)){
            const response=await fetch(sourceUrl.toString(),{headers:{Accept:'application/json'},signal:AbortSignal.timeout(12000)});
            if(response.ok){
              const payload=await response.json();
              const tender=payload?.data||payload;
              if(tender?.tenderID===data.tender_id){
                const recovered=buildCompetitionForecast(tender,data.fuel_type,Number(data.expected_value_uah));
                if(recovered)data.competition_forecast=recovered;
              }
            }
          }
        }catch(e){console.error('Competition forecast recovery failed',e?.message);}
      }
      return json(data,upstream.status);
    }catch{return json({error:'Сервіс аналізу тимчасово недоступний. Спробуйте ще раз.'},502);}
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
