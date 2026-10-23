import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const source=fs.readFileSync('buyer-history.js','utf8'),seeds=JSON.parse(fs.readFileSync('data/buyer-evidence.json','utf8'));
const stored=new Map(),puts=[];const cache={async match(k){return stored.get(k.url)?.clone()},async put(k,v){puts.push(k.url);stored.set(k.url,v.clone())}};
const ctx=vm.createContext({console,Intl,Date,Map,Set,Number,Error,Request,Response,URL,AbortSignal,setTimeout,clearTimeout,caches:{default:cache},ALLOWED_ORIGINS:[]});
ctx.euro5ObservationDate=(d=new Date())=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
ctx.buyerCode=d=>d.procuringEntity.identifier.id;ctx.findInternalId=d=>d.id;
ctx.json=(body,status)=>new Response(JSON.stringify(body),{status});
vm.runInContext(source,ctx);vm.runInContext(fs.readFileSync('buyer-competition.js','utf8'),ctx);
let calls=0;ctx.fetch=async()=>{calls++;throw Error('API unavailable')};
const period={start:'2025-10-13',end:'2026-10-12',as_of:'2026-10-13'},rows=seeds.flatMap(e=>e.rows);
const result=await ctx.verifyBuyerRows(rows,'20001645',period,'UA-2026-10-13-014119-a',{cache});
assert.equal(result.count,7);assert.equal(result.states['Завершено лот закупівлі'],6);assert.equal(result.states['Неуспішний лот закупівлі'],1);
assert.equal(result.suppliers.leaders[0].count,5);assert.equal(result.suppliers.known_lots,6);assert.equal(result.verification.complete,true);assert.equal(calls,0);
assert.equal(ctx.Euro5BuyerCompetition.assess(result,'2026-10-13','20001645').points,-10);
// Preserved evidence cannot authenticate a subsequently changed BI value.
const poisoned=rows.map(r=>({...r,'Кіль-ть унікальних учасників лота':99}));
const clean=await ctx.verifyBuyerRows(poisoned,'20001645',period,'',{cache});assert.equal(clean.competition.mean_participants,1.5);
const synthetic={...rows[0],'Ідентифікатор лота':'UA-2026-08-01-000001-a-L1','Організатор':'Buyer | 12345678'};
let attempts=0;ctx.fetch=async u=>{attempts++;if(attempts===1)throw Error('transient failure');return {ok:true,json:async()=>u.endsWith('/summary')?{id:'internal'}:{data:{tenderID:'UA-2026-08-01-000001-a',dateCreated:'2026-08-01T12:00:00+03:00',dateModified:'2026-08-05T12:00:00+03:00',procuringEntity:{identifier:{id:'12345678'}}}}}};
const recovered=await ctx.verifyBuyerRows([synthetic],'12345678',period,'',{cache});assert.equal(recovered.count,1);assert.equal(attempts,3);
ctx.fetch=async()=>{throw Error('offline')};
const cached=await ctx.verifyBuyerRows([{...synthetic,'Кіль-ть унікальних учасників лота':99}],'12345678',period,'',{cache});assert.equal(cached.competition.mean_participants,1);
const unknown={...synthetic,'Ідентифікатор лота':'UA-2026-08-02-000002-a-L1'};
const partial=await ctx.verifyBuyerRows([synthetic,unknown],'12345678',period,'',{cache});
assert.equal(partial.count,1);assert.equal(partial.verification.candidate_lots,2);assert.equal(partial.verification.unresolved_lots,1);assert.equal(partial.verification.complete,false);
ctx.window={};vm.runInContext(fs.readFileSync('buyer-card.js','utf8'),ctx);const html=ctx.window.Euro5BuyerCard.html(partial);
assert(html.includes('знайдено 2 лотів'));assert(html.includes('Історія неповна'));assert(html.includes('підтвердженої частини'));assert(!html.includes('решту виключено'));
let loads=0;ctx.testRows=[synthetic,unknown];vm.runInContext('loadBuyerHistory=async()=>({rows:testRows})',ctx);
const request=()=>new Request('https://worker.example/buyer-history',{method:'POST',body:JSON.stringify({buyerCode:'12345678',asOf:'2026-10-13'})});
for(let i=0;i<2;i++){const h=await (await ctx.buyerHistoryRoute(request(),'')).json();assert.equal(h.verification.complete,false);loads++}
assert.equal(puts.filter(k=>k.includes('/buyer-history-cache/')).length,0);
// Excluding the analysed tender also removes it from the coverage denominator.
const excluded=await ctx.verifyBuyerRows(rows,'20001645',period,seeds[0].tender_id,{cache});assert.equal(excluded.count,6);assert.equal(excluded.verification.candidate_lots,6);
// A preserved result dated after the requested cutoff is never admitted.
const early=await ctx.verifyBuyerRows([rows.at(-1)],'20001645',{start:'2025-09-01',end:'2026-08-31',as_of:'2026-09-01'},'',{cache});assert.equal(early.count,0);
console.log('PASS: 7 historical lots / 6 successes during outage; -10 concentration; retries; preserved rows; incomplete counts; no partial aggregate cache; cutoff/exclusion');
