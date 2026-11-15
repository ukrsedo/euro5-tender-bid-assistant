import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync('app.js','utf8');
const html=fs.readFileSync('index.html','utf8');
function between(start,end){
  const a=app.indexOf(start),b=app.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,start);
  return app.slice(a,b);
}
class Node{
  constructor(tag='text'){this.tag=tag;this.children=[];this._text='';this.className='';this.href='';}
  set textContent(value){this.children=[];this._text=String(value);}
  get textContent(){return this._text+this.children.map(x=>x.textContent).join('');}
  append(...nodes){this.children.push(...nodes);}
  appendChild(node){this.children.push(node);return node;}
  replaceChildren(...nodes){this._text='';this.children=[...nodes];}
}
const nodes=new Map();
const document={createElement:tag=>new Node(tag),createTextNode:text=>{const n=new Node();n.textContent=text;return n;},
  getElementById:id=>{if(!nodes.has(id))nodes.set(id,new Node('div'));return nodes.get(id);}};
const context={document,window:{EURO5_CONFIG:{apiUrl:'https://euro5-tender-test.example'}},URL,Map,Set};
const code=between('function renderRequirements(','function fillList(')+
  between('function setMarketScoreStatus(','function renderCompetitionForecast(');
const {renderRequirements,setMarketScoreStatus}=vm.runInNewContext(
  code+';({renderRequirements,setMarketScoreStatus})',context);
const walk=node=>[node,...node.children.flatMap(walk)];

test('source-backed payment, delivery and technical clauses retain full quotes and links',()=>{
  const long='4.1. Оплата за поставлений товар здійснюється протягом 15 днів. '+
    'Постачальник передає первинні документи покупцю. '.repeat(9);
  const url='/tender-document?tid=UA-2026-11-10-015939-a&doc=1234567890abcdef1234567890abcdef';
  renderRequirements([
    {type:'Оплата та розрахунки',text:long,source_verified:true,source:{title:'Договір.docx',location:'абзац 41',url}},
    {type:'Умова тендера',text:'Строк оплати: '+long,source_verified:true,source:{title:'Prozorro'}},
    {type:'Місце й дата постачання',text:'Місце постачання: Запоріжжя.',source_verified:true,source:{title:'Prozorro',location:'items[0].deliveryAddress'}},
    {type:'Технічні вимоги до пального',text:'Бензин А-95 відповідає ДСТУ 7687:2015.',source_verified:true,source:{title:'Технічне завдання',location:'абзац 9'}}
  ],1);
  const all=walk(document.getElementById('requirementsList'));
  const headings=all.filter(x=>x.tag==='summary'&&x.tag!=='text');
  assert.ok(headings.some(x=>x.textContent==='Оплата та розрахунки (1)'));
  assert.ok(headings.some(x=>x.textContent==='Постачання та відпуск (1)'));
  assert.ok(headings.some(x=>x.textContent==='Технічні вимоги до пального (1)'));
  assert.ok(all.some(x=>x.className==='requirement-full'&&x.textContent===long.trim()));
  assert.ok(all.some(x=>x.tag==='a'&&x.href.endsWith(url)));
  assert.ok(all.some(x=>x.textContent.includes('Договір.docx, абзац 41')));
});

test('market status states what affects the rating',()=>{
  setMarketScoreStatus('marketComparisonStatus',{gap:1,indicative:true});
  assert.match(document.getElementById('marketComparisonStatus').textContent,/не враховано/);
  setMarketScoreStatus('marketComparisonStatus',{gap:1,indicative:false});
  assert.equal(document.getElementById('marketComparisonStatus').textContent,'Враховано в рейтингу');
  setMarketScoreStatus('marketScoreStatus',null);
  assert.match(document.getElementById('marketScoreStatus').textContent,/нейтральний бал/);
});

test('review summary links to unresolved fields and updates after edits',()=>{
  const values={fuelType:'mixed',supplyFormat:'unknown',expectedValue:1500000,
    gasolineVolume:1000,dieselVolume:0,gasoline_product:'unknown',diesel_product:'diesel_regular',
    advance_payment_pct:null,payment_days:5,bid_security_pct:null,performance_security_pct:null,
    delivery_days:null,min_stations:null,max_radius_km:null,nationwide_coverage:null,
    advance_payment_guarantee:null,named_network:null};
  const render=vm.runInNewContext(between('function renderReviewChecklist(','function renderDocumentReadSummary(')+
    ';renderReviewChecklist',{document,lastExtraction:{},reviewValues:()=>values,Array});
  render();
  let box=document.getElementById('reviewChecklist');
  assert.ok(walk(box).some(x=>x.href==='#reviewSupplyFormat'));
  assert.ok(walk(box).some(x=>x.href==='#reviewDieselVolume'));
  assert.ok(walk(box).some(x=>x.href==='#reviewGasolineProduct'));
  assert.match(box.textContent,/це не означає, що відповідних вимог немає/i);
  values.supplyFormat='retail';values.dieselVolume=2000;values.gasoline_product='a95_regular';
  render();box=document.getElementById('reviewChecklist');
  assert.ok(!walk(box).some(x=>x.href==='#reviewSupplyFormat'||x.href==='#reviewDieselVolume'));
  assert.match(box.textContent,/Ключові поля заповнені/);
});

test('review summary and market badges exist in the current page',()=>{
  for(const id of ['reviewChecklist','marketComparisonStatus','marketScoreStatus','requirementsList'])
    assert.ok(html.includes(`id="${id}"`),id);
  assert.ok(html.includes('app.js?v=20261115-review-ux-v27'));
  assert.ok(html.includes('styles.css?v=20261115-review-ux-v27'));
});
