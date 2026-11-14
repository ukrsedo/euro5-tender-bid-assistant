import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const worker=fs.readFileSync('worker.js','utf8');
const start=worker.indexOf('function extractPaymentTerms(');
const end=worker.indexOf('\nfunction supplyFormatFromText(',start);
assert.ok(start>=0&&end>start);
const {extractPaymentTerms,extractDeliveryTerms}=vm.runInNewContext(
  worker.slice(start,end)+';({extractPaymentTerms,extractDeliveryTerms})',
  {Array,Number});

test('structured Prozorro milestones retain five-day postpayment and delivery',()=>{
  const data={milestones:[
    {type:'financing',code:'postpayment',percentage:100,duration:{days:5,type:'calendar'}},
    {type:'delivery',code:'delivery',percentage:100,duration:{days:5,type:'calendar'}}
  ]};
  assert.equal(extractPaymentTerms(data).paymentDays,5);
  assert.equal(extractDeliveryTerms(data),5);
  assert.equal(extractDeliveryTerms({milestones:[]}),null);
});

test('actual contract wording exposes payment conditions and voucher validity with paragraph citations',()=>{
  const a=worker.indexOf('function classifyContractParagraph(');
  const b=worker.indexOf('// Extract only simple, explicit numeric terms',a);
  const code=worker.slice(a,b).replaceAll('export function','function');
  const c={Array,RegExp,String,Math};vm.createContext(c);
  vm.runInContext(code+';this.highlights=directDocumentHighlights;this.core=coreDocumentClauses',c);
  const rows=[
    {location:'абзац 54',body:'4.1. Оплата за поставлений Товар здійснюється Покупцем впродовж 5 (п’яти) календарних днів з моменту отримання паливних карток/талонів (якщо інше не визначено Договором), за умови надання Постачальником супровідних документів, рахунку на оплату та належно оформлених первинних документів, а також реєстрації Постачальником в Єдиному реєстрі податкових накладних належним чином оформленої податкової накладної та за умови відсутності не усунених зауважень Покупця до змісту та форми зазначених документів.'},
    {location:'абзац 65',body:'5.3. Умови постачання Товару – самовивіз. Покупець має право отримувати Товар на АЗС Постачальника до закінчення терміну дії довірчого документу. Термін дії довірчого документу зазначений на довірчому документі, але у будь якому випадку, не може перевищувати 60 календарних днів з дати видаткової накладної, якою оформлено передачу Товару від Постачальника до Покупця.'}
  ];
  const doc={status:'read',title:'Проект договору ЗЦП А-95, ДТ.docx',text:rows.map(x=>x.body).join('\n'),segments:rows};
  assert.deepEqual(Array.from(c.highlights([doc]),x=>x.source.location),['абзац 54','абзац 65']);
  assert.equal(c.core([doc])[0].source.location,'абзац 54');
  const start=worker.indexOf('export function directDocumentConditionEvidence(');
  const end=worker.indexOf('// Buyer evidence:',start);
  const numeric=vm.runInNewContext(worker.slice(start,end).replace('export function','function')+';directDocumentConditionEvidence',{Map,Set,Number,String,Array});
  assert.equal(numeric([doc]).values.payment_days,5);
});

test('Tender Assistant exposes deadline and term provenance without changing Roadmap',()=>{
  const app=fs.readFileSync('app.js','utf8');
  const html=fs.readFileSync('index.html','utf8');
  assert.match(worker,/proposal_deadline: source\.data\?\.tenderPeriod\?\.endDate/);
  assert.match(worker,/delivery_source: structuredDeliveryDays !== null/);
  assert.match(app,/Строк подання пропозицій завершився/);
  assert.match(html,/id="proposalDeadlineNotice"/);
  assert.match(html,/id="reviewDeliverySource"/);
});
