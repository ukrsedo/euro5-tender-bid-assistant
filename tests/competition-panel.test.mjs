import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
const access=fs.readFileSync('access-worker.js','utf8');
const backend=fs.readFileSync('worker.js','utf8');
const start=app.indexOf('function renderCompetitionForecast(data){');
const end=app.indexOf('\n\nanalyzeBtn.addEventListener',start);
assert.ok(start>=0&&end>start,'competition renderer exists');
const elements=new Map();
function el(id){
  if(!elements.has(id))elements.set(id,{
    textContent:'',value:'',style:{width:''},
    classList:{hidden:true,add(v){if(v==='hidden')this.hidden=true},remove(v){if(v==='hidden')this.hidden=false}}
  });
  return elements.get(id);
}
const context={
  document:{getElementById:el},
  num:{format:n=>String(n)},
  recommendedCompetitionMode:data=>data.competition_forecast.one_participant_pct>data.competition_forecast.two_plus_participants_pct?'n1':'market'
};
const render=vm.runInNewContext(app.slice(start,end)+';renderCompetitionForecast',context);

test('competition row is present in HTML',()=>{
  assert.match(html,/id="competitionForecast"/);
  assert.match(html,/id="reviewCompetitionMode"/);
});
test('missing forecast leaves panel visible and manual mode available',()=>{
  render({});
  assert.equal(el('competitionForecast').classList.hidden,false);
  assert.equal(el('competitionConclusion').textContent,'Прогноз поки недоступний');
  assert.equal(el('reviewCompetitionMode').value,'market');
  assert.equal(el('competitionOnePct').textContent,'—');
});
test('null or invalid percentages are not rendered as 0%',()=>{
  render({competition_forecast:{one_participant_pct:null,two_plus_participants_pct:null}});
  assert.equal(el('competitionOnePct').textContent,'—');
  render({competition_forecast:{one_participant_pct:20,two_plus_participants_pct:20}});
  assert.equal(el('competitionTwoPct').textContent,'—');
});
test('valid forecast shows probabilities and recommended mode',()=>{
  render({competition_forecast:{one_participant_pct:70,two_plus_participants_pct:30,conclusion:'Один учасник'}});
  assert.equal(el('competitionOnePct').textContent,'70%');
  assert.equal(el('competitionTwoPct').textContent,'30%');
  assert.equal(el('reviewCompetitionMode').value,'n1');
  assert.equal(el('competitionForecast').classList.hidden,false);
});
test('protected Worker recovers forecast from official tender data',()=>{
  assert.match(access,/buildCompetitionForecast\(tender,data\.fuel_type,Number\(data\.expected_value_uah\)\)/);
  assert.match(access,/tender\?\.tenderID===data\.tender_id/);
  assert.match(backend,/export function buildCompetitionForecast\(/);
});
