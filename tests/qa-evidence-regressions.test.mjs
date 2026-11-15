import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const worker=fs.readFileSync('worker.js','utf8');
const app=fs.readFileSync('app.js','utf8');
const classifyStart=worker.indexOf('function classifyContractParagraph(');
const classifyEnd=worker.indexOf('// Extract only simple, explicit numeric terms',classifyStart);
const classify=vm.runInNewContext(worker.slice(classifyStart,classifyEnd).replaceAll('export function','function')+
  ';({classifyContractParagraph,directDocumentHighlights,coreDocumentClauses})',{Array,Map,RegExp,String,Math});

test('price adjustment mentioning fuel is never mislabeled as technical fuel requirements',()=>{
  const clause='2) узгодженого сторонами збільшення ціни за одиницю товару не більше ніж на 10 відсотків пропорційно коливанню ціни такого товару на ринку, включно з бензином А-95 Євро 5.';
  assert.equal(classify.classifyContractParagraph(clause).length,0);
  const doc={status:'read',title:'Договір.docx',text:'[абзац 107] '+clause,segments:[{location:'абзац 107',body:clause}]};
  assert.equal(classify.directDocumentHighlights([doc]).length,0);
  assert.equal(classify.coreDocumentClauses([doc]).length,0);
});

test('long verified clauses appear complete, without a silent 700-character cut',()=>{
  const clause='2.1. Якість бензину А-95 Євро 5 відповідає ДСТУ 7687:2015; '+
    'постачальник підтверджує характеристики для кожної партії. '.repeat(15);
  const doc={status:'read',title:'Договір.docx',text:'[абзац 26] '+clause,segments:[{location:'абзац 26',body:clause}]};
  const rows=classify.directDocumentHighlights([doc]);
  assert.equal(rows.length,1);
  assert.equal(rows[0].text,clause.trim());
  assert.equal(rows[0].source.quote,clause.trim());
});

test('duplicate payment citation is shown once with a document source',()=>{
  const start=app.indexOf('function uniqueRequirementItems('),end=app.indexOf('\nfunction safeDocumentCitationUrl(',start);
  const fn=vm.runInNewContext(app.slice(start,end)+';uniqueRequirementItems',{Array,Map,Set,String});
  const clause='4.1. Оплата за поставлений Товар здійснюється протягом 15 робочих днів.';
  const rows=fn([
    {text:'Строк оплати: '+clause,source_verified:true,source:{title:'Договір.docx',url:'/tender-document?tid=x'}},
    {text:clause,source_verified:true,source:{title:'Договір.docx',url:'/tender-document?tid=x'}},
    {text:clause,source_verified:true,source:{title:'Структуровані дані Prozorro'}}
  ]);
  assert.equal(rows.length,1);
  assert.equal(rows[0].text,clause);
  assert.equal(rows[0].source.title,'Договір.docx');
});

test('identical market reasons for both fuels are shown once',()=>{
  assert.match(app,/\[\.\.\.new Set\(\['gasoline','diesel'\]/);
});

test('indicative market comparison cannot increase the budget score',()=>{
  const start=app.indexOf('function buildParticipationRating(');
  const end=app.indexOf('\nfunction marginRatingDescription(',start);
  const fn=vm.runInNewContext(app.slice(start,end)+';buildParticipationRating',{
    discountAtCompetitiveness:()=>0,marginRatingScore:()=>20,
    budgetAssessment:gap=>gap===null||gap===undefined?10:Math.min(20,10+2*gap),
    tenderSizeScore:()=>10,conditionAdjustment:()=>({points:0,reasons:[]}),
    activeTenderData:()=>({}),round1:x=>Math.round(x*10)/10,clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),
    Euro5BuyerCompetition:{assess:()=>({points:0}),recommendation:r=>r},
    lastExtraction:{},recommendationFromScore:()=>({tone:'warn',title:'Оцінка',summary:''}),
    productBenchmarkSupported:()=>true,Math
  });
  const common={expected:2000000,full:1000000,complete:true,cfg:{discounts:[0]},minMargin:10};
  assert.equal(fn({...common,cmp:{gap:5,indicative:true}}).budgetScore,10);
  assert.equal(fn({...common,cmp:{gap:5,indicative:false}}).budgetScore,20);
  assert.match(app,/const scoredCmp=marketComparison\(expected,gasVol,dieVol,el\.fuelType\.value,activeTenderData\(\)\);/);
});
