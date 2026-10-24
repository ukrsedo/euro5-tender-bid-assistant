import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {pathToFileURL} from 'node:url';
import {authenticate,issue,cookie,hash} from '../auth/session.js';
import {verifyAccess} from '../auth/access.js';
const src=readFileSync('access-worker.js','utf8').replace("import app from './worker.js';",'const app={};').replace("export { Euro5CategoryAI } from './worker.js';",'').replaceAll("'./auth/","'"+pathToFileURL(process.cwd()+'/auth/').href);
const {default:gateway,handle}=await import('data:text/javascript;base64,'+Buffer.from(src).toString('base64'));
const sql=new DatabaseSync(':memory:');sql.exec(readFileSync('migrations/0002_login_limits.sql','utf8'));
const db={prepare(query){let args=[];return{bind(...a){args=a;return this},async first(){return sql.prepare(query).get(...args)},async all(){return {results:sql.prepare(query).all(...args)}},async run(){return sql.prepare(query).run(...args)}}}};
const admin={id:'sergii',company:'euro5',name:'Administrator',email:'admin@example.com',role:'admin'};
const env={SESSION_SECRET:'s'.repeat(64),TEST_LOGIN_ENABLED:'1',TEST_PASSWORD_SHA256:await hash('Test-random-password-12345'),ACCESS_USERS:JSON.stringify([admin]),EURO5_MEMORY_DB:db,ASSETS:{fetch:async()=>new Response('private asset')}};
const request=(path,options={})=>new Request('https://test.example'+path,options);
const form=(password,ip='192.0.2.1',origin='https://test.example')=>({method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded','CF-Connecting-IP':ip},body:new URLSearchParams({password}).toString()});
for(const path of ['/','/app.js','/index.html','/worker.js','/health'])assert.equal((await handle(request(path),env)).status,303,path);
for(const path of ['/tender-check','/buyer-history','/memory/observe'])assert.equal((await handle(request(path,{method:'POST',headers:{Origin:'https://test.example'}}),env)).status,401,path);
assert.equal((await handle(request('/login'),env)).status,200);
assert.equal((await handle(request('/auth/test',form('wrongpassword-123')),env)).status,401);
assert.equal((await handle(request('/auth/test',form('Test-random-password-12345','192.0.2.1','https://attacker.example')),env)).status,403);
const first=await handle(request('/auth/test',form('Test-random-password-12345')),env);
const second=await handle(request('/auth/test',form('Test-random-password-12345')),env);
assert.equal(first.status,303);assert.notEqual(first.headers.get('Set-Cookie'),second.headers.get('Set-Cookie'));
const sessionCookie=first.headers.get('Set-Cookie').split(';')[0];
assert(first.headers.get('Set-Cookie').includes('HttpOnly'));assert(first.headers.get('Set-Cookie').includes('Secure'));
const signed=path=>request(path,{headers:{Cookie:sessionCookie}});
const identity=await (await handle(signed('/session'),env)).json();assert.equal(identity.id,'test-team');assert.equal(identity.role,'editor');assert.equal(identity.shared,true);
const originalAssetFetch=globalThis.fetch;let assetRequest;
globalThis.fetch=async(url,options)=>{assert.equal(options.redirect,'manual','Workers supports manual redirect handling; error mode must never be sent');assetRequest={url,options};return new Response('shared main asset',{headers:{'Content-Type':'application/javascript'}});};
assert.equal(await (await handle(signed('/app.js?v=current'),env)).text(),'shared main asset');
assert.equal(new URL(assetRequest.url).origin,'https://raw.githubusercontent.com');assert.equal(new URL(assetRequest.url).pathname,'/ukrsedo/euro5-tender-bid-assistant/main/app.js');assert.equal(new URL(assetRequest.url).searchParams.get('release'),'current');
assert.equal(assetRequest.options.headers.Cookie,undefined);
assert.equal(assetRequest.options.headers.Authorization,undefined);
assert.equal(assetRequest.options.headers['Cache-Control'],'no-cache');assert.equal(assetRequest.options.cf,undefined);
assert.equal((await handle(signed('/worker.js'),env)).status,404);
assert.equal((await handle(signed('/auth/session.js'),env)).status,404);
const config=await (await handle(signed('/config.js'),env)).text();assert(config.includes("authMode: 'session'"));assert(config.includes('window.location.origin'));
// The upstream must not receive arbitrary routes; failure cannot expose a stale private copy.
const assetCallsBefore=assetRequest.url;
assert.equal((await handle(signed('/app.js/../../auth/session.js'),env)).status,404);
assert.equal(assetRequest.url,assetCallsBefore);
globalThis.fetch=async()=>new Response('unavailable',{status:503});
assert.equal((await handle(signed('/app.js'),env)).status,502);
globalThis.fetch=originalAssetFetch;
let passed;
const mock={fetch:async(req,e)=>{passed={req,e};return new Response('ok')}};
await handle(request('/memory/observe',{method:'POST',headers:{Cookie:sessionCookie,Origin:'https://test.example',Authorization:'Bearer evil','X-User-Role':'admin'},body:'{}'}),env,{},mock);
assert.equal(passed.e.EURO5_SESSION_ACTOR.id,'test-team');assert.equal(passed.e.EURO5_SESSION_ACTOR.role,'editor');assert.equal(passed.req.headers.get('Authorization'),null);assert.equal(passed.req.headers.get('Origin'),null);
assert.equal(await authenticate(request('/',{headers:{Cookie:sessionCookie+'x'}}),env),null);
assert.equal(await authenticate(signed('/'),{...env,TEST_PASSWORD_SHA256:await hash('new-password-456')}),null);
assert.equal(await authenticate(signed('/'),{...env,TEST_LOGIN_ENABLED:'0'}),null);
const adminSession=await issue(admin,env),adminCookie=cookie(adminSession.value,adminSession.maxAge);
assert.equal((await authenticate(request('/',{headers:{Cookie:adminCookie}}),env)).id,'sergii');
assert.equal(await authenticate(request('/',{headers:{Cookie:adminCookie}}),{...env,ACCESS_USERS:'[]'}),null);
assert.equal((await handle(request('/logout',{method:'POST',headers:{Cookie:sessionCookie,Origin:'https://test.example'}}),env)).headers.get('Set-Cookie').includes('Max-Age=0'),true);
for(let i=0;i<10;i++)await handle(request('/auth/test',form('wrong-password-123','192.0.2.2')),env);
assert.equal((await handle(request('/auth/test',form('Test-random-password-12345','192.0.2.2')),env)).status,429);
assert.equal((await handle(request('/auth/test',form('Test-random-password-12345','192.0.2.3')),{...env,EURO5_MEMORY_DB:null})).status,503);
const secure=await gateway.fetch(request('/login'),env);assert.equal(secure.headers.get('X-Frame-Options'),'DENY');assert(secure.headers.get('Cache-Control').includes('no-store'));
// Real RSA signatures verify the email assertion; spoofed headers and modified claims fail.
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);jwk.kid='test-key';
const authEnv={...env,ACCESS_TEAM_DOMAIN:'https://unit-test-team.cloudflareaccess.com',ACCESS_AUD:'app-audience'};
const certs=async()=>new Response(JSON.stringify({keys:[jwk]}));
const base64=x=>Buffer.from(x).toString('base64url');
const now=Math.floor(Date.now()/1000),claims={iss:authEnv.ACCESS_TEAM_DOMAIN,aud:[authEnv.ACCESS_AUD],type:'app',sub:'unique-user',email:admin.email,exp:now+600,iat:now-1,nbf:now-1};
async function jwt(p=claims,h={alg:'RS256',kid:'test-key'}){const data=base64(JSON.stringify(h))+'.'+base64(JSON.stringify(p));return data+'.'+base64(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(data)));}
const assertion=t=>request('/admin-login',{headers:{'Cf-Access-Jwt-Assertion':t}});
assert.equal((await verifyAccess(assertion(await jwt()),authEnv,certs)).email,admin.email);
for(const change of [{aud:['other']},{iss:'https://evil.example'},{exp:now-1},{nbf:now+100},{email:''},{sub:''},{type:'org'}])await assert.rejects(()=>jwt({...claims,...change}).then(t=>verifyAccess(assertion(t),authEnv,certs)));
await assert.rejects(()=>verifyAccess(assertion('invalid'),authEnv,certs));
const valid=await jwt(),parts=valid.split('.');parts[1]=base64(JSON.stringify({...claims,email:'intruder@example.com'}));await assert.rejects(()=>verifyAccess(assertion(parts.join('.')),authEnv,certs));
const originalFetch=globalThis.fetch;globalThis.fetch=certs;
const adminLogin=await handle(assertion(valid),authEnv);assert.equal(adminLogin.status,303);
const adminUser=await authenticate(request('/',{headers:{Cookie:adminLogin.headers.get('Set-Cookie')}}),authEnv);assert.equal(adminUser.id,'sergii');
assert.equal((await handle(assertion(await jwt({...claims,email:'unknown@example.com'})),authEnv)).status,403);
globalThis.fetch=originalFetch;
console.log('Protected auth: concurrent shared sessions, admin RSA login, role isolation, forgery rejection, cookie/CSRF protections, revocation and shared D1 rate limits passed.');
// Exercise the actual fuel Worker HTTP guard and memory routes, not a duplicate implementation.
const workerSrc=readFileSync('worker.js','utf8').replace("import { WorkerEntrypoint as Euro5CategoryWorkerEntrypoint } from 'cloudflare:workers';",'class Euro5CategoryWorkerEntrypoint {}');
const {default:realWorker}=await import('data:text/javascript;base64,'+Buffer.from(workerSrc).toString('base64'));
const lockedEnv={...env,MEMORY_AUTH_MODE:'session',MEMORY_ENABLED:'1'};
for(const path of ['/health','/tender-check','/buyer-history','/memory/status'])assert.equal((await realWorker.fetch(request(path,{method:'POST',headers:{'X-User-Role':'admin','Cf-Access-Authenticated-User-Email':admin.email}}),lockedEnv,{})).status,401);
const statusRequest=()=>request('/memory/status',{method:'POST',headers:{Cookie:sessionCookie,Origin:'https://test.example','Content-Type':'application/json'},body:'{}'});
const memoryStatus=await handle(statusRequest(),{...env,MEMORY_ENABLED:'1'}, {},realWorker);assert.equal(memoryStatus.status,200);assert.equal((await memoryStatus.json()).role,'editor');
const unauthorizedProfile=await handle(request('/memory/save',{method:'POST',headers:{Cookie:sessionCookie,Origin:'https://test.example','Content-Type':'application/json'},body:JSON.stringify({kind:'profile',recordKey:'company',content:'Unauthorized company profile change'})}),{...env,MEMORY_ENABLED:'1'}, {},realWorker);assert.equal(unauthorizedProfile.status,403);
console.log('Real Worker integration: direct URL guard, authenticated memory and shared-profile privilege restriction passed.');
// Tender analysis uses the existing backend service, never a copied API credential.
let forwarded=0,forwardedBody;
const serviceEnv={...env,TENDER_AI:{fetch:async r=>{forwarded++;assert.equal(r.url,'https://internal.euro5/tender-check');assert.equal(r.headers.get('Origin'),null);assert.equal(r.headers.get('Cookie'),null);assert.equal(r.headers.get('Authorization'),null);assert.equal(r.headers.get('Cf-Access-Jwt-Assertion'),null);forwardedBody=await r.json();return new Response(JSON.stringify({ready:true,tender_id:forwardedBody.tenderId}),{headers:{'Content-Type':'application/json'}});}}};
const tenderRequest=(extra={})=>request('/tender-check',{method:'POST',headers:{Cookie:sessionCookie,Origin:'https://test.example','Content-Type':'application/json','Cf-Access-Jwt-Assertion':'must-not-forward',...extra},body:JSON.stringify({tenderId:'UA-2026-10-13-014119-a'})});
assert.equal((await handle(tenderRequest({Cookie:''}),serviceEnv)).status,401);assert.equal(forwarded,0);
assert.equal((await handle(tenderRequest({Origin:'https://attacker.example'}),serviceEnv)).status,403);assert.equal(forwarded,0);
const analyzed=await handle(tenderRequest(),serviceEnv);assert.equal(analyzed.status,200);assert.equal(forwardedBody.tenderId,'UA-2026-10-13-014119-a');assert.equal(forwarded,1);
assert.equal((await handle(tenderRequest(),env)).status,503);
assert.equal((await handle(tenderRequest(),{...env,TENDER_AI:{fetch:async()=>{throw Error('private backend failure')}}})).status,502);
const statusBefore=forwarded;assert.equal((await handle(statusRequest(),{...serviceEnv,MEMORY_ENABLED:'1'}, {},realWorker)).status,200);assert.equal(forwarded,statusBefore);
console.log('Internal AI service: authenticated forwarding without key duplication, blocked anonymous/CSRF calls, stripped browser credentials, local author-aware memory and backend failure handling passed.');

// Real participation route records the authenticated tester rather than a client identity.
sql.exec(readFileSync('migrations/0001_project_memory.sql','utf8'));
const decisionBody={tenderId:'UA-2026-10-13-014119-a',buyerCode:'20001645',choice:'decline',comment:'Перевіряємо умови',actor:'forged-admin'};
const decisionRequest=path=>request(path,{method:'POST',headers:{Cookie:sessionCookie,Origin:'https://test.example','Content-Type':'application/json'},body:JSON.stringify(decisionBody)});
const saved=await handle(decisionRequest('/memory/participation'),{...env,MEMORY_ENABLED:'1'}, {},realWorker);
assert.equal(saved.status,200);const savedBody=await saved.json();assert.equal(savedBody.actor,'test-team');assert.equal(savedBody.decision.choice,'decline');
const found=await (await handle(decisionRequest('/memory/participation/current'),{...env,MEMORY_ENABLED:'1'}, {},realWorker)).json();assert.equal(found.decision.choice,'decline');
console.log('Unified protected participation: real route saves/reads decision with authenticated tester identity.');

// Raw repository responses are text/plain; every shared asset needs its actual browser MIME type.
const beforeMimeFetch=globalThis.fetch;globalThis.fetch=async()=>new Response('body',{headers:{'Content-Type':'text/plain'}});
for(const [path,type] of [['/','text/html'],['/index.html','text/html'],['/app.js','application/javascript'],['/memory.js','application/javascript'],['/styles.css','text/css'],['/euro5-logo.png','image/png']]){const result=await handle(signed(path),env);assert.equal(result.status,200,path);assert(result.headers.get('Content-Type').startsWith(type),path);}
globalThis.fetch=beforeMimeFetch;console.log('Shared raw source: correct HTML/JS/CSS/image MIME and cache-independent source requests passed.');

// Public readiness probe reveals no application content, user data or credentials.
const probeFetch=globalThis.fetch;globalThis.fetch=async()=>new Response('private shared HTML body',{headers:{'Content-Type':'text/plain'}});
const ready=await handle(request('/login?check=frontend'),env);assert.equal(ready.status,200);const readiness=await ready.json();assert.equal(readiness.frontend,'ready');assert(!JSON.stringify(readiness).includes('private shared'));globalThis.fetch=probeFetch;

// A redirect is rejected by the status check without following it.
const redirectFetch=globalThis.fetch;globalThis.fetch=async()=>new Response(null,{status:302,headers:{Location:'https://untrusted.example/'}});assert.equal((await handle(signed('/app.js'),env)).status,502);globalThis.fetch=redirectFetch;
