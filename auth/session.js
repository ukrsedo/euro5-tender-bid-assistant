const encoder=new TextEncoder();
const b64=bytes=>btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/=/g,'').replace(/\+/g,'-').replace(/\//g,'_');
const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
export async function hash(value){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value)))).map(x=>x.toString(16).padStart(2,'0')).join('');}
async function key(env){if(!env.SESSION_SECRET||env.SESSION_SECRET.length<48)throw Error('Session secret missing');return crypto.subtle.importKey('raw',encoder.encode(env.SESSION_SECRET),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);}
export function profiles(env){
  const users=JSON.parse(env.ACCESS_USERS||'[]');
  if(!Array.isArray(users))throw Error('Invalid profiles');
  const ids=new Set(),emails=new Set();
  for(const u of users){
    if(!/^[a-zA-Z0-9_-]{1,80}$/.test(u.id||'')||!/^[a-zA-Z0-9_-]{1,80}$/.test(u.company||'')||!['reader','editor','admin'].includes(u.role)||typeof u.name!=='string'||!u.name.trim()||typeof u.email!=='string'||!u.email.includes('@'))throw Error('Invalid profile');
    const email=u.email.trim().toLowerCase();if(ids.has(u.id)||emails.has(email)||u.id==='test-team')throw Error('Duplicate profile');ids.add(u.id);emails.add(email);
  }
  return users;
}
export function tester(env){return env.TEST_LOGIN_ENABLED==='1'&&/^[a-f0-9]{64}$/.test(env.TEST_PASSWORD_SHA256||'')?{id:'test-team',company:'euro5',role:'editor',name:'Тестувальник ЄВРО5'}:null;}
async function version(user,env){return hash(JSON.stringify(user)+(user.id==='test-team'?env.TEST_PASSWORD_SHA256:''));}
export async function issue(user,env){
  const now=Math.floor(Date.now()/1000),exp=now+(user.id==='test-team'?28800:3600);
  const body=b64(encoder.encode(JSON.stringify({id:user.id,exp,iat:now,nonce:crypto.randomUUID(),version:await version(user,env)})));
  const signature=b64(await crypto.subtle.sign('HMAC',await key(env),encoder.encode(body)));
  return {value:body+'.'+signature,maxAge:exp-now};
}
export async function authenticate(request,env){
  try{
    const raw=request.headers.get('Cookie')?.split(';').map(x=>x.trim()).find(x=>x.startsWith('__Host-euro5='))?.slice(13);
    if(!raw||raw.length>3000)return null;
    const [body,signature,extra]=raw.split('.');if(!body||!signature||extra)return null;
    if(!await crypto.subtle.verify('HMAC',await key(env),decode(signature),encoder.encode(body)))return null;
    const claims=JSON.parse(new TextDecoder().decode(decode(body))),now=Math.floor(Date.now()/1000);
    if(!Number.isFinite(claims.exp)||claims.exp<=now||!Number.isFinite(claims.iat)||claims.iat>now)return null;
    const user=claims.id==='test-team'?tester(env):profiles(env).find(x=>x.id===claims.id);
    if(!user||claims.version!==await version(user,env))return null;
    return user;
  }catch{return null;}
}
export const cookie=(value,maxAge)=>`__Host-euro5=${value}; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
// Atomic fixed-window limits in shared D1 work across concurrent Worker instances.
export async function allowPasswordAttempt(request,env){
  if(!env.EURO5_MEMORY_DB)throw Error('Authentication storage missing');
  const now=Date.now(),window=Math.floor(now/900000),ip=request.headers.get('CF-Connecting-IP')||'unknown';
  const ipKey=await hash(env.SESSION_SECRET+':'+ip);
  for(const [bucket,limit] of [['ip:'+ipKey,10],['global',200]]){
    const result=await env.EURO5_MEMORY_DB.prepare(`INSERT INTO euro5_login_limits(bucket,window,attempts) VALUES (?1,?2,1)
      ON CONFLICT(bucket) DO UPDATE SET window=excluded.window,attempts=CASE WHEN window=excluded.window THEN attempts+1 ELSE 1 END RETURNING attempts`)
      .bind(bucket,window).first();
    if(!result||result.attempts>limit)return false;
  }
  await env.EURO5_MEMORY_DB.prepare('DELETE FROM euro5_login_limits WHERE window<?1').bind(window-1).run();
  return true;
}
