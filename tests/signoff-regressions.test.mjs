import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const worker=fs.readFileSync('worker.js','utf8');
const start=worker.indexOf('export function directDocumentConditionEvidence(');
const end=worker.indexOf('\n// Buyer evidence:',start);
assert.ok(start>=0&&end>start);
const source=worker.slice(start,end).replace('export function','function');
const context={Map,Set,Number,String,Array};
vm.createContext(context);vm.runInContext(source,context);

test('same-day tender ID remains valid before noon UTC; future Kyiv date is rejected',()=>{
  const start=worker.indexOf('function tenderAnnouncementDate(');
  const end=worker.indexOf('\n// History is sampled',start);
  const code=worker.slice(start,end);
  class FixedDate extends Date { static now(){return Date.parse('2026-11-13T09:00:00Z')} }
  const dateContext={Date:FixedDate,Intl,String,Number};
  dateContext.euro5ObservationDate=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
  vm.createContext(dateContext);vm.runInContext(code+';this.pick=tenderAnnouncementDate',dateContext);
  assert.equal(dateContext.pick({tenderID:'UA-2026-11-13-002719-a'}).toISOString(),'2026-11-13T12:00:00.000Z');
  assert.equal(dateContext.pick({tenderID:'UA-2026-11-14-002719-a'}),null);
});

test('document-derived commercial terms keep exact source and conflicting values are withheld',()=>{
  const extract=context.directDocumentConditionEvidence;
  const docs=[{title:'Contract.docx',status:'read',source_url:'/document',segments:[
    {location:'абзац 109',body:'4.1. Розрахунки проводяться шляхом оплати Замовником суми згідно рахунку та видаткової накладної в строк 10 (десять) календарних днів. У разі затримки фінансування оплата буде здійснюватись протягом 7 банківських днів.'},
    {location:'абзац 110',body:'5.1. Термін постачання товару починається з моменту направлення заявки протягом 5 (п’яти) робочих днів.'},
    {location:'абзац 220',body:'Постачальник зобов’язаний надати забезпечення виконання цього Договору у вигляді гарантії, у розмірі 5% від вартості договору.'}
  ]}];
  const result=extract(docs);
  assert.equal(result.values.payment_days,10);
  assert.equal(result.values.delivery_days,5);
  assert.equal(result.values.performance_security_pct,5);
  assert.ok(result.evidence.some(x=>x.source.location==='абзац 109'&&x.source.quote.includes('10 (десять) календарних днів')));
  const conflict=extract([{...docs[0],segments:[...docs[0].segments,{location:'абзац 221',body:'Оплата за партію проводиться протягом 30 календарних днів.'}]}]);
  assert.equal(Object.hasOwn(conflict.values,'payment_days'),false);
});

test('explicit fuel wording in a read contract is classified with its exact citation',()=>{
  const start=worker.indexOf('export function directDocumentHighlights(');
  const end=worker.indexOf('\n// Extract only simple, explicit numeric terms',start);
  const code=worker.slice(start,end).replace('export function','function');
  const ctx={Array,RegExp,String,Math};vm.createContext(ctx);vm.runInContext(code+';this.h=directDocumentHighlights',ctx);
  const quote='1.2. Найменування Товару: бензин автомобільний А-95-Євро5 та дизельне паливо ДП-Євро5 (наливом).';
  const result=ctx.h([{status:'read',kind:'docx',title:'Проєкт договору.docx',source_url:'/document',text:`[абзац 14] ${quote}`,segments:[{location:'абзац 14',body:quote}]}]);
  assert.equal(result.length,1);
  assert.match(result[0].category,/Технічні вимоги до пального/);
  assert.equal(result[0].source.location,'абзац 14');
  assert.equal(result[0].source.quote,quote);
});

test('retail benchmark uses the last verified observation within five business days and keeps its date',async()=>{
  const start=worker.indexOf('async function fetchRetailPrice(');
  const end=worker.indexOf('\n}\n\n/**',start)+2;
  const code=worker.slice(start,end);
  const target=new Date('2026-11-13T12:00:00Z');
  const context={archive:[{date:'2026-11-09',prices_uah_l_with_vat:{a95:75.6}}],today:'2026-11-13'};
  const ctx={Date,Number,String,Math,UKRAINE_STANDARD_VAT:0.2,euro5ObservationDate:d=>d.toISOString().slice(0,10),formatUaDate:d=>`${String(d.getUTCDate()).padStart(2,'0')}.${String(d.getUTCMonth()+1).padStart(2,'0')}.${d.getUTCFullYear()}`,
    parseUaDate:s=>{const [d,m,y]=s.split('.').map(Number);return new Date(Date.UTC(y,m-1,d,12));},
    wholesaleBenchmarkAge:(t,p)=>{let age=0;for(let d=Date.parse(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv'}).format(p)+'T00:00:00Z')+86400000;d<=Date.parse(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv'}).format(t)+'T00:00:00Z');d+=86400000){const w=new Date(d).getUTCDay();if(w!==0&&w!==6)age++;}return age;},
    fetchMinfinPrice:async()=>({source:'Minfin archive',date:'09.11.2026',priceWithVat:75,priceWithoutVat:62.5}),
    euro5RetailRecord:(slug,date,c)=>{const e=c.archive.find(x=>x.date===date.toISOString().slice(0,10));const price=e?.prices_uah_l_with_vat?.[slug];return price?{source:'EURO5 archive',date:'09.11.2026',priceWithVat:price,priceWithoutVat:price/1.2}:null;}};
  vm.createContext(ctx);vm.runInContext(code+';this.f=fetchRetailPrice',ctx);
  const result=await ctx.f('a95',target,context);
  assert.equal(result.date,'09.11.2026');
  assert.equal(result.check.status,'reference_only');
  assert.match(result.check.reason,/п’ять робочих днів/);
  assert.equal(result.priceWithVat,75.6);
});

test('market comparison exposes calculated market value and breakdown in review',()=>{
  const app=fs.readFileSync('app.js','utf8');
  assert.match(app,/Розрахункова ринкова вартість без ПДВ/);
  assert.match(app,/грн\/л =/);
  assert.match(app,/marketCalculationText\(cmp,v\.fuelType,v\.gasolineVolume,v\.dieselVolume\)/);
});

test('every tender attachment status is represented in the review UI',()=>{
  const app=fs.readFileSync('app.js','utf8');
  for(const status of ['excluded_after_cutoff','date_unverified','unsupported','not_processed_limit']) assert.ok(app.includes(status));
  assert.match(app,/Вкладення Prozorro: \$\{summary\.available\} загалом/);
});

test('training-sample history is distinguished from the 12-month buyer card',()=>{
  assert.match(worker,/окрема вибірка від картки історії замовника за останні 12 місяців/);
});
