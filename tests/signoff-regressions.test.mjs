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

test('document-derived commercial terms keep exact source and conflicting values are withheld',()=>{
  const extract=context.directDocumentConditionEvidence;
  const docs=[{title:'Contract.docx',status:'read',source_url:'/document',segments:[
    {location:'абзац 109',body:'Оплата здійснюється протягом 15 календарних днів після отримання рахунку.'},
    {location:'абзац 220',body:'Розмір забезпечення тендерної пропозиції становить 5% від очікуваної вартості.'}
  ]}];
  const result=extract(docs);
  assert.equal(result.values.payment_days,15);
  assert.equal(result.values.bid_security_pct,5);
  assert.ok(result.evidence.some(x=>x.source.location==='абзац 109'&&x.source.quote.includes('15 календарних днів')));
  const conflict=extract([{...docs[0],segments:[...docs[0].segments,{location:'абзац 221',body:'Оплата протягом 30 календарних днів.'}]}]);
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
