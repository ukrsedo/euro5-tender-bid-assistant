// Buyer evidence: only snapshots confirmed to predate the analysed announcement.
const BUYER_BI_APP='fba3f2f2-cf55-40a0-a79f-b74f5ce947c2';
function buyerHistoryPeriod(now=new Date()){
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const end=new Date(day+'T00:00:00Z');end.setUTCDate(end.getUTCDate()-1);
 const start=new Date(day+'T00:00:00Z');start.setUTCFullYear(start.getUTCFullYear()-1);
 return {start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)};
}
function buyerProcedureGroup(name){
 if(/Запит ціни пропозиції|Запит пропозицій постачальників/i.test(name))return 'catalog';
 if(/Відкриті торги|Спрощена (?:процедура )?закупівл[ія]|Допорогова закупівля/i.test(name)&&!/рамков|другий етап/i.test(name))return 'open';
 if(/без використання електронної системи|Звіт про.*договір|Переговорна процедура/i.test(name))return 'direct';
 return 'other';
}
function summarizeBuyerHistory(rows,code,period){
 const unique=new Map();for(const row of rows){const id=row['Ідентифікатор лота'];if(!id)throw Error('BI не повернув ідентифікатор лота.');unique.set(id,row)}
 const lots=[...unique.values()],groups=Object.fromEntries(['open','catalog','direct','other'].map(k=>[k,{count:0,value_without_vat:0,unknown_vat:0,procedures:{}}]));
 const finished=[],states={},cpv=new Set(),winners=new Map();let totalValue=0,unknownVat=0,winnerLots=0;
 for(const r of lots){
  const name=r['Процедура закупівлі']||'Не визначено',g=groups[buyerProcedureGroup(name)];g.count++;g.procedures[name]=(g.procedures[name]||0)+1;
  const amount=r['Очікувана вартість'],vat=r['ПДВ в очікуваній вартості'];
  if(Number.isFinite(amount)&&['з ПДВ','без ПДВ'].includes(vat)){const value=vat==='з ПДВ'?amount/1.2:amount;g.value_without_vat+=value;totalValue+=value}else{g.unknown_vat++;unknownVat++}
  const state=r['Статус лота'];states[state]=(states[state]||0)+1;cpv.add(r['Класифікація CPV']);
  const winner=String(r['Переможець']||'').trim();
  if(state==='Завершено лот закупівлі'&&winner&&winner!=='-'){const m=winner.match(/(?:\|\s*|#)(\d{8,10})\s*$/);if(m){const key=m[1];winners.set(key,{id:key,name:winner.replace(/\s*\|\s*\d{8,10}\s*$/,''),count:(winners.get(key)?.count||0)+1});winnerLots++}}
  if(['open','catalog'].includes(buyerProcedureGroup(name))&&['Завершено лот закупівлі','Неуспішний лот закупівлі'].includes(state))finished.push(r);
 }
 const participants=finished.map(r=>r['Кіль-ть унікальних учасників лота']),known=participants.filter(n=>Number.isFinite(n)&&n>=0),positive=known.filter(n=>n>0);
 return {ready:true,buyer_code:code,buyer_name:lots[0]?.['Організатор']?.split(' | ')[0]||null,period,as_of:new Date().toISOString(),source:'Prozorro BI',source_url:'https://bi.prozorro.org/sense/app/'+BUYER_BI_APP+'',count:lots.length,value_without_vat:totalValue,unknown_vat:unknownVat,groups,states,cpv:[...cpv],suppliers:{known_lots:winnerLots,distinct_count:winners.size,leaders:[...winners.values()].sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id)),new_supplier_entry_established:false},competition:{final_count:finished.length,known_count:known.length,observed_count:positive.length,mean_participants:positive.length?positive.reduce((a,b)=>a+b,0)/positive.length:null,one_count:known.filter(n=>n===1).length,zero_count:known.filter(n=>n===0).length,missing_count:participants.length-known.length}};
}
class BuyerBiConnection{
 constructor(){this.seq=0;this.pending=new Map()}
 async connect(){
  const response=await fetch('https://bi.prozorro.org/app/'+BUYER_BI_APP,{headers:{Upgrade:'websocket',Origin:'https://bi.prozorro.org'}});this.socket=response.webSocket;
  if(!this.socket)throw Error('BI не прийняв з’єднання.');this.socket.accept();
  this.socket.addEventListener('message',event=>{let r;try{r=JSON.parse(event.data)}catch{return}const p=this.pending.get(r.id);if(!p)return;clearTimeout(p.timer);this.pending.delete(r.id);r.error?p.reject(Error(r.error.message||'Помилка BI')):p.resolve(r.result)});
  this.socket.addEventListener('close',()=>this.rejectPending());this.socket.addEventListener('error',()=>this.rejectPending());
  this.doc=(await this.rpc(-1,'OpenDoc',{qDocName:BUYER_BI_APP})).qReturn.qHandle;
 }
 rejectPending(){for(const p of this.pending.values()){clearTimeout(p.timer);p.reject(Error('З’єднання з BI перервано.'))}this.pending.clear()}
 rpc(handle,method,params={}){return new Promise((resolve,reject)=>{const id=++this.seq,timer=setTimeout(()=>{this.pending.delete(id);reject(Error('BI не відповідає.'))},20000);this.pending.set(id,{resolve,reject,timer});try{this.socket.send(JSON.stringify({jsonrpc:'2.0',id,handle,method,params}))}catch(e){clearTimeout(timer);this.pending.delete(id);reject(e)}})}
 async select(field,values){const f=(await this.rpc(this.doc,'GetField',{qFieldName:field})).qReturn.qHandle;const r=await this.rpc(f,'SelectValues',{qFieldValues:values,qToggleMode:false});if(!r.qReturn)throw Error('BI не застосував фільтр '+field)}
 close(){this.socket?.close();this.rejectPending()}
 async download(code,period){
  await this.connect();
  await this.select('Код організатора',[{qText:code,qIsNumeric:false}]);
  const list=(await this.rpc(this.doc,'CreateSessionObject',{qProp:{qInfo:{qType:'list'},qListObjectDef:{qDef:{qFieldDefs:['Класифікація CPV лота']},qInitialDataFetch:[{qTop:0,qLeft:0,qWidth:1,qHeight:10000}]}}})).qReturn.qHandle;
  const cpvs=(await this.rpc(list,'GetLayout')).qLayout.qListObject.qDataPages[0].qMatrix;
  const codes=cpvs.map(r=>r[0].qText).filter(x=>ALLOWED_CPV.has(x.split(' ')[0]));
  if(!codes.length)throw Error('BI не повернув довідник паливних кодів.');
  await this.select('Класифікація CPV лота',codes.map(qText=>({qText,qIsNumeric:false})));
  const epoch=Date.UTC(1899,11,30),day=86400000,first=Math.round((Date.parse(period.start)-epoch)/day),last=Math.round((Date.parse(period.end)-epoch)/day);
  await this.select('Дата',Array.from({length:last-first+1},(_,i)=>({qNumber:first+i,qIsNumeric:true})));
  const original=(await this.rpc(this.doc,'GetObject',{qId:'VcLPJX'})).qReturn.qHandle;
  const hc=structuredClone((await this.rpc(original,'GetProperties')).qProp.qHyperCubeDef);
  if(hc.qDimensions.length<30)throw Error('Структура BI змінилася.');
  hc.qDimensions=[0,2,3,4,5,7,18,19,23,24].map(i=>hc.qDimensions[i]);hc.qMeasures=[];
  for(const c of hc.qDimensions){c.qCalcCondition={qCond:{},qMsg:{}};c.qCalcCond={}}
  hc.qInitialDataFetch=[];hc.qColumnOrder=hc.qInterColumnSortOrder=Array.from({length:10},(_,i)=>i);delete hc.qLayoutExclude;
  const cube=(await this.rpc(this.doc,'CreateSessionObject',{qProp:{qInfo:{qType:'table'},qHyperCubeDef:hc}})).qReturn.qHandle;
  const layout=(await this.rpc(cube,'GetLayout')).qLayout.qHyperCube;
  if(layout.qError||layout.qCalcCondMsg)throw Error('BI не дозволив розрахувати історію.');
  const width=layout.qSize.qcx,n=layout.qSize.qcy;if(n>100000)throw Error('Історія перевищує 100 000 лотів.');
  const headers=layout.qDimensionInfo.map(d=>d.qFallbackTitle);for(const key of ['Ідентифікатор лота','Процедура закупівлі','Організатор','Кіль-ть унікальних учасників лота'])if(!headers.includes(key))throw Error('BI змінив колонку '+key);
  const rows=[];for(let top=0;top<n;top+=1000){const height=Math.min(1000,n-top),pages=(await this.rpc(cube,'GetHyperCubeData',{qPath:'/qHyperCubeDef',qPages:[{qTop:top,qLeft:0,qWidth:width,qHeight:height}]})).qDataPages;const matrix=pages?.[0]?.qMatrix;if(matrix?.length!==height)throw Error('Історію отримано не повністю.');rows.push(...matrix.map(cells=>Object.fromEntries(headers.map((h,i)=>[h,Number.isFinite(cells[i]?.qNum)?cells[i].qNum:cells[i]?.qText]))))}
  if(rows.some(r=>!String(r['Організатор']).endsWith(' | '+code)))throw Error('BI повернув дані іншого замовника.');
  return {rows,code,period};
 }
}
async function loadBuyerHistory(code,period){const connection=new BuyerBiConnection();let timer;try{return await Promise.race([connection.download(code,period),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Історія замовника не завантажилась за 55 секунд.')),55000)})])}finally{clearTimeout(timer);connection.close()}}
function validBuyerAsOf(value){
 if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value))return false;
 const d=new Date(value+'T12:00:00Z');return Number.isFinite(d.getTime())&&d.toISOString().slice(0,10)===value&&value<=euro5ObservationDate();
}
// BEGIN VERIFIED BUYER SNAPSHOTS
const BUYER_VERIFIED_SNAPSHOTS = [{"tender_id":"UA-2025-12-04-020528-a","buyer_code":"20001645","created_day":"2025-12-04","modified_day":"2025-12-17","source":"Prozorro public API; identity and dateModified verified 2026-10-23","rows":[{"Ідентифікатор лота":"UA-2025-12-04-020528-a-L1","Лот":"ДК 021:2015 : 09130000-9 «Нафта і дистиляти» (бензин А-95-Євро5 по талонах/скретч картах, та дизельне паливо-Євро5 по талонах/скретч картах)","Очікувана вартість":5256009.6,"ПДВ в очікуваній вартості":"без ПДВ","Процедура закупівлі":"Спрощена процедура закупівлі","Статус лота":"Завершено лот закупівлі","Організатор":"Управління Служби безпеки України в Одеській області | 20001645","Переможець":"ТОВАРИСТВО З ОБМЕЖЕНОЮ ВІДПОВІДАЛЬНІСТЮ \"ПЕТРОЛ ПАРТНЕР\" | 44763104","Класифікація CPV":"09130000-9 Нафта і дистиляти","Кіль-ть унікальних учасників лота":1}]},{"tender_id":"UA-2026-03-09-011486-a","buyer_code":"20001645","created_day":"2026-03-09","modified_day":"2026-03-20","source":"Prozorro public API; identity and dateModified verified 2026-10-23","rows":[{"Ідентифікатор лота":"UA-2026-03-09-011486-a-L1","Лот":"ДК 021:2015 09130000-9 Нафта і дистиляти (Бензин А-95 по талонах, дизпаливо по талонах)","Очікувана вартість":3459016,"ПДВ в очікуваній вартості":"без ПДВ","Процедура закупівлі":"Спрощена процедура закупівлі","Статус лота":"Завершено лот закупівлі","Організатор":"Управління Служби безпеки України в Одеській області | 20001645","Переможець":"ТОВАРИСТВО З ОБМЕЖЕНОЮ ВІДПОВІДАЛЬНІСТЮ \"ПЕТРОЛ ПАРТНЕР\" | 44763104","Класифікація CPV":"09130000-9 Нафта і дистиляти","Кіль-ть унікальних учасників лота":1}]},{"tender_id":"UA-2026-05-08-012643-a","buyer_code":"20001645","created_day":"2026-05-08","modified_day":"2026-05-25","source":"Prozorro public API; identity and dateModified verified 2026-10-23","rows":[{"Ідентифікатор лота":"UA-2026-05-08-012643-a-L1","Лот":"ДК 021:2015 : 09130000-9 «Нафта і дистиляти» (бензин А-95-Євро5 по талонах/скретч картах, та дизельне паливо-Євро5 по талонах/скретч картах)","Очікувана вартість":5960000,"ПДВ в очікуваній вартості":"без ПДВ","Процедура закупівлі":"Спрощена процедура закупівлі","Статус лота":"Завершено лот закупівлі","Організатор":"Управління Служби безпеки України в Одеській області | 20001645","Переможець":"ТОВАРИСТВО З ОБМЕЖЕНОЮ ВІДПОВІДАЛЬНІСТЮ \"ПЕТРОЛ ПАРТНЕР\" | 44763104","Класифікація CPV":"09130000-9 Нафта і дистиляти","Кіль-ть унікальних учасників лота":2}]},{"tender_id":"UA-2026-07-17-009760-a","buyer_code":"20001645","created_day":"2026-07-17","modified_day":"2026-07-28","source":"Prozorro public API; identity and dateModified verified 2026-10-23","rows":[{"Ідентифікатор лота":"UA-2026-07-17-009760-a-L1","Лот":"ДК 021:2015 : 09130000-9 «Нафта і дистиляти» (бензин А-95-Євро5 по талонах/скретч картах, та дизельне паливо-Євро5 по талонах/скретч картах)","Очікувана вартість":7542800,"ПДВ в очікуваній вартості":"без ПДВ","Процедура закупівлі":"Спрощена процедура закупівлі","Статус лота":"Неуспішний лот закупівлі","Організатор":"Управління Служби безпеки України в Одеській області | 20001645","Переможець":"-","Класифікація CPV":"09130000-9 Нафта і дистиляти","Кіль-ть унікальних учасників лота":0}]},{"tender_id":"UA-2026-07-28-009801-a","buyer_code":"20001645","created_day":"2026-07-28","modified_day":"2026-08-07","source":"Prozorro public API; identity and dateModified verified 2026-10-23","rows":[{"Ідентифікатор лота":"UA-2026-07-28-009801-a-L1","Лот":"ДК 021:2015 : 09130000-9 «Нафта і дистиляти» (бензин А-95-Євро5 по талонах/скретч картах, та дизельне паливо-Євро5 по талонах/скретч картах)","Очікувана вартість":7542800,"ПДВ в очікуваній вартості":"без ПДВ","Процедура закупівлі":"Спрощена процедура закупівлі","Статус лота":"Завершено лот закупівлі","Організатор":"Управління Служби безпеки України в Одеській області | 20001645","Переможець":"ТОВАРИСТВО З ОБМЕЖЕНОЮ ВІДПОВІДАЛЬНІСТЮ \"ПЕТРОЛ ПАРТНЕР\" | 44763104","Класифікація CPV":"09130000-9 Нафта і дистиляти","Кіль-ть унікальних учасників лота":1}]},{"tender_id":"UA-2026-07-30-010070-a","buyer_code":"20001645","created_day":"2026-07-30","modified_day":"2026-08-19","source":"Prozorro public API; identity and dateModified verified 2026-10-23","rows":[{"Ідентифікатор лота":"UA-2026-07-30-010070-a-L1","Лот":"ДК 021:2015 : 09130000-9 «Нафта і дистиляти» (бензин А-95-Євро5 по талонах/скретч картах, та дизельне паливо-Євро5 по талонах/скретч картах)","Очікувана вартість":4648087.5,"ПДВ в очікуваній вартості":"без ПДВ","Процедура закупівлі":"Спрощена процедура закупівлі","Статус лота":"Завершено лот закупівлі","Організатор":"Управління Служби безпеки України в Одеській області | 20001645","Переможець":"ТОВАРИСТВО З ОБМЕЖЕНОЮ ВІДПОВІДАЛЬНІСТЮ \"ПЕТРОЛ ПАРТНЕР\" | 44763104","Класифікація CPV":"09130000-9 Нафта і дистиляти","Кіль-ть унікальних учасників лота":2}]},{"tender_id":"UA-2026-08-21-012048-a","buyer_code":"20001645","created_day":"2026-08-21","modified_day":"2026-09-14","source":"Prozorro public API; identity and dateModified verified 2026-10-23","rows":[{"Ідентифікатор лота":"UA-2026-08-21-012048-a-L1","Лот":"ДК 021:2015 : 09130000-9 «Нафта і дистиляти» (бензин А-95-Євро5 по талонах/скретч картах, та дизельне паливо-Євро5 по талонах/скретч картах)","Очікувана вартість":1598037.5,"ПДВ в очікуваній вартості":"без ПДВ","Процедура закупівлі":"Спрощена процедура закупівлі","Статус лота":"Завершено лот закупівлі","Організатор":"Управління Служби безпеки України в Одеській області | 20001645","Переможець":"ТОВАРИСТВО З ОБМЕЖЕНОЮ ВІДПОВІДАЛЬНІСТЮ \"УКРНАФТА-ПОСТАЧ\" | 43012009","Класифікація CPV":"09130000-9 Нафта і дистиляти","Кіль-ть унікальних учасників лота":2}]}];
// END VERIFIED BUYER SNAPSHOTS
function buyerParentId(row){return String(row['Ідентифікатор лота']).match(/^UA-\d{4}-\d{2}-\d{2}-\d+-[a-z]/i)?.[0]}
async function verifyBuyerRows(rows,code,period,excludedTenderId,options={}){
 const unique=[...new Map(rows.filter(r=>buyerParentId(r)!==excludedTenderId).map(r=>[r['Ідентифікатор лота'],r])).values()];
 const parents=[...new Set(unique.map(buyerParentId).filter(Boolean))].sort().reverse();
 const states=new Map(),proofs=new Map();let cursor=0;const deadline=Date.now()+40000;
 const cache=options.cache,base=options.baseUrl||'https://euro5-tender-bid-assistant.ukrsedo-e2e.workers.dev';
 const key=id=>new Request(new URL('/buyer-evidence/v1/'+code+'/'+period.as_of+'/'+id,base));
 const usable=(e,id)=>e?.buyer_code===code&&e.tender_id===id&&/^\d{4}-\d{2}-\d{2}$/.test(e.modified_day)&&e.modified_day<=period.end&&e.created_day>=period.start&&e.created_day<=period.end&&e.modified_day>=e.created_day&&Array.isArray(e.rows)&&unique.filter(r=>buyerParentId(r)===id).every(r=>e.rows.some(x=>x['Ідентифікатор лота']===r['Ідентифікатор лота']&&String(x['Організатор']).endsWith(' | '+code)));
 for(const id of parents){
  let e;
  try{const hit=await cache?.match(key(id));if(hit)e=await hit.json()}catch{}
  if(!usable(e,id))e=BUYER_VERIFIED_SNAPSHOTS.find(x=>usable(x,id));
  if(e){states.set(id,'verified');proofs.set(id,e)}
 }
 const candidates=parents.filter(id=>!proofs.has(id));
 const headers={Accept:'application/json','User-Agent':'Mozilla/5.0 (compatible; EURO5-Tender-Assistant/1.0)'};
 await Promise.all(Array.from({length:Math.min(4,candidates.length)},async()=>{
  while(cursor<Math.min(candidates.length,60)&&Date.now()<deadline){
   const id=candidates[cursor++];
   // A transient response/timeout gets another attempt, never an eligibility verdict.
   for(let attempt=0;attempt<2&&Date.now()<deadline;attempt++){
    try{
     const summary=await fetch('https://prozorro.gov.ua/api/tenders/'+encodeURIComponent(id)+'/summary',{headers,signal:AbortSignal.timeout(Math.min(6000,Math.max(1,deadline-Date.now())))});
     if(!summary.ok)throw Error('summary');const raw=await summary.json(),internal=findInternalId(raw);if(!internal)throw Error('id');
     const response=await fetch('https://public-api.prozorro.gov.ua/api/2.5/tenders/'+internal,{headers,signal:AbortSignal.timeout(Math.min(6000,Math.max(1,deadline-Date.now())))});
     if(!response.ok)throw Error('api');const payload=await response.json(),data=payload.data||payload;
     if(data.tenderID!==id||buyerCode(data)!==code){states.set(id,'identity_mismatch');break}
     const modified=new Date(data.dateModified),created=new Date(data.dateCreated);
     if(!Number.isFinite(modified.getTime())||!Number.isFinite(created.getTime()))throw Error('date');
     const e={buyer_code:code,tender_id:id,created_day:euro5ObservationDate(created),modified_day:euro5ObservationDate(modified),rows:unique.filter(r=>buyerParentId(r)===id),source:'Prozorro API verified snapshot'};
     if(!usable(e,id)){states.set(id,'after_cutoff');break}
     states.set(id,'verified');proofs.set(id,e);
     if(cache)try{await cache.put(key(id),new Response(JSON.stringify(e),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=31536000'}}))}catch{}
     break;
    }catch{states.set(id,'unavailable')}
   }
  }
 }));
 // Take the preserved row, not a later BI row paired with an old verification flag.
 const eligible=unique.flatMap(r=>{const e=proofs.get(buyerParentId(r));return e?[e.rows.find(x=>x['Ідентифікатор лота']===r['Ідентифікатор лота'])]:[]});
 const unresolved=unique.filter(r=>!['verified','after_cutoff','identity_mismatch'].includes(states.get(buyerParentId(r))));
 const reasons=unique.filter(r=>states.get(buyerParentId(r))!=='verified').map(r=>({lot_id:r['Ідентифікатор лота'],reason:states.get(buyerParentId(r))||'not_checked'}));
 const history=summarizeBuyerHistory(eligible,code,period);
 return {...history,history_version:2,as_of:period.as_of,excluded_tender_id:excludedTenderId,
  verification:{candidate_lots:unique.length,verified_lots:eligible.length,unresolved_lots:unresolved.length,excluded_lots:unique.length-eligible.length-unresolved.length,complete:unresolved.length===0,excluded_or_unverified_lots:unique.length-eligible.length,details:reasons,
   method:'Preserved verified rows or public Prozorro snapshot last modified before announcement'},
  evidence_note:unresolved.length?'Перевірка неповна через недоступні відповіді. Знайдені лоти не зникли; показники нижче стосуються лише підтвердженої частини.':'Використано збережені підтверджені дані до дати оголошення. Пізніші результати аналізованого тендера не враховано.'};
}
async function buyerHistoryRoute(request,origin,ctx){
 if(origin&&!ALLOWED_ORIGINS.includes(origin))return json({error:'Forbidden origin'},403,origin);
 const body=await request.json().catch(()=>({})),code=String(body.buyerCode||''),asOf=body.asOf;
 if(!/^\d{8,10}$/.test(code)||!validBuyerAsOf(asOf))return json({ready:false,reason:'Потрібні код замовника та дата оголошення тендера.'},400,origin);
 const excluded=String(body.excludeTenderId||'');
 const period={...buyerHistoryPeriod(new Date(asOf+'T12:00:00Z')),as_of:asOf},cache=caches.default;
 const key=new Request(new URL('/buyer-history-cache/v4/'+code+'/'+asOf+'/'+encodeURIComponent(excluded),request.url));
 try{const hit=await cache.match(key);if(hit){const h=await hit.json();if(h.verification?.complete)return json({...h,cached:true},200,origin)}}catch{}
 try{
  const raw=await loadBuyerHistory(code,period),history=await verifyBuyerRows(raw.rows,code,period,excluded,{cache,baseUrl:request.url});
  // Do not preserve a failed verification as the buyer's history for another day.
  if(history.verification.complete){
   const response=new Response(JSON.stringify(history),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=86400'}});
   const write=cache.put(key,response).catch(()=>{});if(ctx?.waitUntil)ctx.waitUntil(write);else await write;
  }
  return json(history,200,origin);
 }catch(e){return json({ready:false,buyer_code:code,period,as_of:asOf,reason:e.message},200,origin)}
}
