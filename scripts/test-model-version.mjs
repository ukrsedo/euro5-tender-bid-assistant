import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const source=fs.readFileSync('worker.js','utf8');
const c=vm.createContext({Intl,Date,Map,Set,Number,console});
vm.runInContext(source.slice(0,source.indexOf('export default {')),c);
const legacy=JSON.parse(fs.readFileSync('models/model-2026-10-05.json','utf8'));
const refresh=JSON.parse(fs.readFileSync('models/model-2026-10-22.json','utf8'));
const fixtures=JSON.parse(fs.readFileSync('models/parity-fixtures.json','utf8'));
function data(day){return {tenderID:`UA-${day}-014119-a`,dateCreated:`${day}T09:00:00+03:00`,enquiryPeriod:{startDate:`${day}T09:00:00+03:00`},title:'Дизельне паливо, талони',procurementMethodType:'aboveThresholdUA',procuringEntity:{identifier:{id:'20001645'}}};}
function run(day){c.fixture=data(day);return JSON.parse(JSON.stringify(vm.runInContext('buildCompetitionForecast(fixture,"diesel",1500000)',c)));}
assert.equal(run('2026-10-05'),null);
assert.equal(run('2026-10-06').model_version,'2026-10-05');
const oct13=run('2026-10-13');assert.equal(oct13.model_version,'2026-10-05');assert.equal(oct13.buyer_history_tenders,19);
assert.equal(run('2026-10-22').model_version,'2026-10-05');
const oct23=run('2026-10-23');assert.equal(oct23.model_version,refresh.version);assert.equal(oct23.buyer_history_tenders,refresh.buyers['20001645'][0]);
assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(COMPETITION_BUYER_HISTORY)',c)),legacy.buyers);
assert.deepEqual(JSON.parse(vm.runInContext('JSON.stringify(COMPETITION_MODEL)',c)),legacy.model);
for(const fixture of fixtures){c.parity=fixture;const p=vm.runInContext('(()=>{const m=COMPETITION_REFRESH.model;let d=m.intercept;parity.x.forEach((v,i)=>d+=m.coef[i]*(v-m.mean[i])/m.scale[i]);return Math.max(.01,Math.min(.99,sigmoid(m.calibrationIntercept+m.calibrationCoef*d)));})()',c);assert(Math.abs(p-fixture.expected)<1e-12);}
const element=()=>({value:'',textContent:'',innerHTML:'',disabled:false,classList:{add(){},remove(){},toggle(){}},addEventListener(){},focus(){},scrollIntoView(){},options:[{text:'Test'}],selectedIndex:0});
const a=vm.createContext({Intl,Date,console,document:{getElementById:element,createElement:element,body:element()},window:{addEventListener(){}},setTimeout});
for(const file of ['price-risk.js','buyer-competition.js','app.js'])vm.runInContext(fs.readFileSync(file,'utf8'),a);
a.result=oct13;vm.runInContext('lastExtraction={competition_forecast:result}',a);assert.equal(vm.runInContext('activeStatisticalModel()===MODEL',a),true);
a.result=oct23;vm.runInContext('lastExtraction={competition_forecast:result}',a);assert.equal(vm.runInContext('activeStatisticalModel()===MODEL_REFRESH',a),true);
assert.equal(vm.runInContext('activeStatisticalModel().market.diesel.discounts[1]',a),refresh.price.market.diesel.discounts[1]);
a.result={model_version:'2026-10-22'};vm.runInContext('lastExtraction={competition_forecast:result}',a);assert.equal(vm.runInContext('activeStatisticalModel()===MODEL_REFRESH_V1',a),true);
vm.runInContext('lastExtraction={competition_forecast:{}}',a);assert.equal(vm.runInContext('activeStatisticalModel()===MODEL',a),true);
console.log('Model: dated selection, unchanged Oct13 legacy, Python/JS parity, Worker/frontend selection passed');
