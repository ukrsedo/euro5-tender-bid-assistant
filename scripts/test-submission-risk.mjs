import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const elements=new Map();
function element(id){
 if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',disabled:false,events:{},classList:{add(){},remove(){},toggle(){}},addEventListener(name,fn){this.events[name]=fn},focus(){},scrollIntoView(){},appendChild(){},options:[{text:'Test'}],selectedIndex:0});
 return elements.get(id);
}
const context=vm.createContext({console,Intl,Date,document:{getElementById:element,createElement:()=>element('new-row'),body:element('body')},window:{addEventListener(){}},setTimeout});
vm.runInContext(fs.readFileSync('price-risk.js','utf8'),context);
vm.runInContext(fs.readFileSync('buyer-competition.js','utf8'),context);
vm.runInContext(fs.readFileSync('app.js','utf8'),context);
const risk=context.Euro5PriceRisk;
assert.equal(risk.riskPeriod('2026-10-13').risk_end_date,'2026-10-20');
assert.equal(risk.riskPeriod('2026-10-23').risk_end_date,'2026-10-30');
assert.equal(risk.riskPeriod('2026-10-24').risk_end_date,'2026-10-30');
assert.equal(risk.riskPeriod('2026-12-31').risk_end_date,'2027-01-07');
assert.equal(risk.riskPeriod('2028-02-28').risk_end_date,'2028-03-06');
for(const d of ['',null,'2026-02-30','not a date'])assert.equal(risk.riskPeriod(d),null);

const archive=JSON.parse(fs.readFileSync('data/market-series.json','utf8'));
context.historyFixture={ready:true,as_of:'2026-10-23',records:archive.records};
vm.runInContext('lastExtraction={price_risk_history:historyFixture};',context);
element('submissionDate').value='2026-10-13';
const m13=vm.runInContext('submissionRiskModel(100,40)',context);
assert(m13.ready);
assert.equal(m13.submission_date,'2026-10-13');
assert.equal(m13.risk_end_date,'2026-10-20');
assert(m13.last_observation<='2026-10-13');
const noLater=risk.fit(archive.records.filter(r=>r.date<='2026-10-13'),'2026-10-13',.4);
assert.deepEqual(JSON.parse(JSON.stringify(m13)),JSON.parse(JSON.stringify(noLater)));

element('submissionDate').value='2026-10-23';
element('submissionDate').events.input();
assert.equal(element('exportPdfBtn').disabled,true);
assert(element('riskPeriodHint').textContent.includes('30.10.2026'));
const m23=vm.runInContext('submissionRiskModel(100,40)',context);
assert(m23.ready);
assert.equal(m23.submission_date,'2026-10-23');
assert.equal(m23.risk_end_date,'2026-10-30');
assert(m23.last_observation<='2026-10-23');
assert.notEqual(m13.as_of,m23.as_of);
const result=risk.simulate(m23,[110,108,106,104],100,95,2);
assert(result.ready);
assert.equal(result.iterations,10000);
assert.equal(result.submission_date,'2026-10-23');
assert.equal(result.risk_end_date,'2026-10-30');
context.resultFixture=result;
const html=vm.runInContext('forecastCardHtml(resultFixture)',context);
assert(html.includes('23.10.2026')&&html.includes('30.10.2026'));

// Date validation blocks blank/future dates; an older Worker cannot silently
// reuse publication-date history as if it were current submission-date history.
element('submissionDate').value='';
assert.equal(vm.runInContext('recalc()',context),false);
assert(element('calculateStatus').textContent.includes('дату подання'));
element('submissionDate').value='2099-01-01';
assert.equal(vm.runInContext('submissionRiskModel(100,40).ready',context),false);
element('submissionDate').value='2026-10-23';
vm.runInContext("lastExtraction.price_risk_history.as_of='2026-10-13'",context);
assert.equal(vm.runInContext('submissionRiskModel(100,40).ready',context),false);

// Both rating and PDF use the anchored model, not a second date-selection rule.
element('submissionDate').value='2026-10-13';
for(const [id,value] of Object.entries({expectedValue:'4861400',gasolineVolume:'40000',dieselVolume:'40000',gasolineCost:'40',dieselCost:'40',riskReserve:'1',logistics:'1',minMargin:'2',fuelType:'mixed',competitionMode:'market'}))element(id).value=value;
assert.equal(vm.runInContext('recalc()',context),true);
vm.runInContext('buildPdfReport()',context);
assert(element('pdfReport').innerHTML.includes('13.10.2026'));
assert(element('pdfReport').innerHTML.includes('20.10.2026'));
const rating=vm.runInContext('buildParticipationRating({expected:4861400,full:3312000,complete:true,cfg:MODEL.market.mixed,cmp:null,minMargin:2,fuelCost:3200000,gasCostAmount:1600000})',context);
assert.equal(rating.priceRisk.model.submission_date,'2026-10-13');
assert.equal(rating.priceRisk.model.risk_end_date,'2026-10-20');

console.log('PASS: submission-date horizon, weekends/leap/year boundaries, dated history, 10000 simulations, date edit invalidation, missing/future/stale-history rejection, rating and PDF agreement.');

// A buyer-history result must invalidate a previously exported/rated result.
vm.runInContext('calculationIsCurrent=true; window.onBuyerHistoryLoaded(lastExtraction,{ready:false,reason:"Test update"});',context);
assert.equal(element('exportPdfBtn').disabled,true);
assert(element('calculateStatus').textContent.includes('конкурентності'));

// The separate buyer factor changes the total and is printed in the PDF.
const buyer={ready:true,history_version:2,buyer_code:'20001645',as_of:'2026-10-13',period:{start:'2025-10-13',end:'2026-10-12'},count:7,value_without_vat:100,unknown_vat:0,verification:{candidate_lots:7,verified_lots:7},groups:{open:{count:7,value_without_vat:100},catalog:{count:0,value_without_vat:0},direct:{count:0,value_without_vat:0},other:{count:0,value_without_vat:0}},states:{'Завершено лот закупівлі':6,'Неуспішний лот закупівлі':1},competition:{final_count:7,known_count:7,observed_count:6,one_count:3,zero_count:1,missing_count:0,mean_participants:1.5},suppliers:{known_lots:6,distinct_count:2,leaders:[{id:'44763104',name:'Supplier A',count:3}]}};
context.buyerFixture=buyer;
vm.runInContext("lastExtraction.buyer_profile=buyerFixture;lastExtraction.buyer_code='20001645';lastExtraction.buyer_history_as_of='2026-10-13'",context);
const ratingExpr='buildParticipationRating({expected:4861400,full:3312000,complete:true,cfg:MODEL.market.mixed,cmp:null,minMargin:2,fuelCost:3200000,gasCostAmount:1600000})';
const before=vm.runInContext(ratingExpr,context);
vm.runInContext('buyerFixture.suppliers.leaders[0].count=5',context);
const after=vm.runInContext(ratingExpr,context);
assert.equal(before.total-after.total,10);
assert.equal(after.buyerCompetition.points,-10);
assert.equal(after.recommendation.tone,'warn');
vm.runInContext(fs.readFileSync('buyer-card.js','utf8'),context);
assert.equal(vm.runInContext('recalc()',context),true);
vm.runInContext('buildPdfReport()',context);
assert(element('pdfReport').innerHTML.includes('Конкурентність замовника'));
assert(element('pdfReport').innerHTML.includes('🚩 Концентрація перемог'));
assert(element('pdfReport').innerHTML.includes('83,33%'));
