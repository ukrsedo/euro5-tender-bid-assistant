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

test('Tender Assistant exposes deadline and term provenance without changing Roadmap',()=>{
  const app=fs.readFileSync('app.js','utf8');
  const html=fs.readFileSync('index.html','utf8');
  assert.match(worker,/proposal_deadline: source\.data\?\.tenderPeriod\?\.endDate/);
  assert.match(worker,/delivery_source: structuredDeliveryDays !== null/);
  assert.match(app,/Строк подання пропозицій завершився/);
  assert.match(html,/id="proposalDeadlineNotice"/);
  assert.match(html,/id="reviewDeliverySource"/);
});
