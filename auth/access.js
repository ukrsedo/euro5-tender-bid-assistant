// Verify Access assertions against the configured team, never against a request-supplied issuer.
const certificates = new Map();
const bytes = s => Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')), c=>c.charCodeAt(0));
export async function verifyAccess(request, env, fetcher=fetch) {
  const issuer=env.ACCESS_TEAM_DOMAIN, audience=env.ACCESS_AUD;
  if (!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer||'') || !audience) throw Error('Access is not configured');
  const token=request.headers.get('Cf-Access-Jwt-Assertion')||'';
  if(token.length>16000)throw Error('Invalid assertion');
  const parts=token.split('.');if(parts.length!==3)throw Error('Missing assertion');
  const header=JSON.parse(new TextDecoder().decode(bytes(parts[0])));
  const claims=JSON.parse(new TextDecoder().decode(bytes(parts[1])));
  const now=Math.floor(Date.now()/1000);
  if(header.alg!=='RS256'||typeof header.kid!=='string'||claims.iss!==issuer||claims.type!=='app'||
    !Array.isArray(claims.aud)||!claims.aud.includes(audience)||!Number.isFinite(claims.exp)||claims.exp<=now||
    !Number.isFinite(claims.nbf)||claims.nbf>now||!Number.isFinite(claims.iat)||claims.iat>now||
    typeof claims.sub!=='string'||!claims.sub||typeof claims.email!=='string'||!claims.email.includes('@'))throw Error('Invalid assertion');
  let cache=certificates.get(issuer);
  if(!cache||cache.until<Date.now()){
    const response=await fetcher(issuer+'/cdn-cgi/access/certs',{signal:AbortSignal.timeout(8000)});
    if(!response.ok)throw Error('Access certificates unavailable');
    const data=await response.json();if(!Array.isArray(data.keys))throw Error('Invalid certificates');
    cache={keys:data.keys,until:Date.now()+300000};certificates.set(issuer,cache);
  }
  const jwk=cache.keys.find(k=>k.kid===header.kid&&k.kty==='RSA');
  // Unknown keys fail closed; the short cache expiry allows rotation without unbounded refetches.
  if(!jwk)throw Error('Unknown signing key');
  const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
  if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,bytes(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw Error('Invalid signature');
  return claims;
}
