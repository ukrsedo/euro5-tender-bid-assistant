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
