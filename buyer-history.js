// Public BI history; informational, never changes the participation rating.
const BUYER_BI_APP='fba3f2f2-cf55-40a0-a79f-b74f5ce947c2';
function buyerHistoryPeriod(now=new Date()){
 const day=new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);
 const end=new Date(day+'T00:00:00Z');end.setUTCDate(end.getUTCDate()-1);
 const start=new Date(day+'T00:00:00Z');start.setUTCFullYear(start.getUTCFullYear()-1);
 return {start:start.toISOString().slice(0,10),end:end.toISOString().slice(0,10)};
}
function buyerProcedureGroup(name){
 if(/Запит ціни пропозиції|Запит пропозицій постачальників/i.test(name))return 'catalog';
 if(/Відкриті торги|Спрощена закупівля|Допорогова закупівля/i.test(name)&&!/рамков|другий етап/i.test(name))return 'open';
 if(/без використання електронної системи|Звіт про.*договір|Переговорна процедура/i.test(name))return 'direct';
 return 'other';
}
function summarizeBuyerHistory(rows,code,period){
 const unique=new Map();for(const row of rows){const id=row['Ідентифікатор лота'];if(!id)throw Error('BI не повернув ідентифікатор лота.');unique.set(id,row)}
 const lots=[...unique.values()],groups=Object.fromEntries(['open','catalog','direct','other'].map(k=>[k,{count:0,value_without_vat:0,unknown_vat:0,procedures:{}}]));
 const finished=[],states={},cpv=new Set();let totalValue=0,unknownVat=0;
 for(const r of lots){
  const name=r['Процедура закупівлі']||'Не визначено',g=groups[buyerProcedureGroup(name)];g.count++;g.procedures[name]=(g.procedures[name]||0)+1;
  const amount=r['Очікувана вартість'],vat=r['ПДВ в очікуваній вартості'];
  if(Number.isFinite(amount)&&['з ПДВ','без ПДВ'].includes(vat)){const value=vat==='з ПДВ'?amount/1.2:amount;g.value_without_vat+=value;totalValue+=value}else{g.unknown_vat++;unknownVat++}
  const state=r['Статус лота'];states[state]=(states[state]||0)+1;cpv.add(r['Класифікація CPV']);
  if(['open','catalog'].includes(buyerProcedureGroup(name))&&['Завершено лот закупівлі','Неуспішний лот закупівлі'].includes(state))finished.push(r);
 }
 const participants=finished.map(r=>r['Кіль-ть унікальних учасників лота']),known=participants.filter(n=>Number.isFinite(n)&&n>=0),positive=known.filter(n=>n>0);
 return {ready:true,buyer_code:code,buyer_name:lots[0]?.['Організатор']?.split(' | ')[0]||null,period,as_of:new Date().toISOString(),source:'Prozorro BI',source_url:'https://bi.prozorro.org/sense/app/'+BUYER_BI_APP+'',count:lots.length,value_without_vat:totalValue,unknown_vat:unknownVat,groups,states,cpv:[...cpv],competition:{final_count:finished.length,known_count:known.length,observed_count:positive.length,mean_participants:positive.length?positive.reduce((a,b)=>a+b,0)/positive.length:null,one_count:known.filter(n=>n===1).length,zero_count:known.filter(n=>n===0).length,missing_count:participants.length-known.length}};
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
  hc.qDimensions=[0,2,3,4,5,7,18,23,24].map(i=>hc.qDimensions[i]);hc.qMeasures=[];
  for(const c of hc.qDimensions){c.qCalcCondition={qCond:{},qMsg:{}};c.qCalcCond={}}
  hc.qInitialDataFetch=[];hc.qColumnOrder=hc.qInterColumnSortOrder=Array.from({length:9},(_,i)=>i);delete hc.qLayoutExclude;
  const cube=(await this.rpc(this.doc,'CreateSessionObject',{qProp:{qInfo:{qType:'table'},qHyperCubeDef:hc}})).qReturn.qHandle;
  const layout=(await this.rpc(cube,'GetLayout')).qLayout.qHyperCube;
  if(layout.qError||layout.qCalcCondMsg)throw Error('BI не дозволив розрахувати історію.');
  const width=layout.qSize.qcx,n=layout.qSize.qcy;if(n>100000)throw Error('Історія перевищує 100 000 лотів.');
  const headers=layout.qDimensionInfo.map(d=>d.qFallbackTitle);for(const key of ['Ідентифікатор лота','Процедура закупівлі','Організатор','Кіль-ть унікальних учасників лота'])if(!headers.includes(key))throw Error('BI змінив колонку '+key);
  const rows=[];for(let top=0;top<n;top+=1000){const height=Math.min(1000,n-top),pages=(await this.rpc(cube,'GetHyperCubeData',{qPath:'/qHyperCubeDef',qPages:[{qTop:top,qLeft:0,qWidth:width,qHeight:height}]})).qDataPages;const matrix=pages?.[0]?.qMatrix;if(matrix?.length!==height)throw Error('Історію отримано не повністю.');rows.push(...matrix.map(cells=>Object.fromEntries(headers.map((h,i)=>[h,Number.isFinite(cells[i]?.qNum)?cells[i].qNum:cells[i]?.qText]))))}
  if(rows.some(r=>!String(r['Організатор']).endsWith(' | '+code)))throw Error('BI повернув дані іншого замовника.');
  return summarizeBuyerHistory(rows,code,period);
 }
}
async function loadBuyerHistory(code,period){const connection=new BuyerBiConnection();let timer;try{return await Promise.race([connection.download(code,period),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('Історія замовника не завантажилась за 55 секунд.')),55000)})])}finally{clearTimeout(timer);connection.close()}}
async function buyerHistoryRoute(request,origin,ctx){
 if(origin&&!ALLOWED_ORIGINS.includes(origin))return json({error:'Forbidden origin'},403,origin);
 const body=await request.json().catch(()=>({})),code=String(body.buyerCode||'');if(!/^\d{8,10}$/.test(code))return json({ready:false,reason:'Код замовника не визначено.'},400,origin);
 const period=buyerHistoryPeriod(),cache=caches.default,key=new Request(new URL('/buyer-history-cache/v1/'+code+'/'+period.end,request.url));
 try{const hit=await cache.match(key);if(hit)return json({...await hit.json(),cached:true},200,origin)}catch{}
 try{const history=await loadBuyerHistory(code,period);const response=new Response(JSON.stringify(history),{headers:{'Content-Type':'application/json','Cache-Control':'public, max-age=86400'}});const write=cache.put(key,response).catch(()=>{});if(ctx?.waitUntil)ctx.waitUntil(write);else await write;return json(history,200,origin)}catch(e){return json({ready:false,buyer_code:code,period,reason:e.message},200,origin)}
}
