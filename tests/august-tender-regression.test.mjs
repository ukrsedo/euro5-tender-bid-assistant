import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('worker.js','utf8');
function part(from,to){
  const start=source.indexOf(from),end=source.indexOf(to,start+from.length);
  assert.ok(start>=0&&end>start,from+' missing');
  return source.slice(start,end).replaceAll('export function ','function ');
}
const code=part('function sigmoid(','function cors(')+
  part('function normalizeEvidenceText(','// Buyer evidence:')+
  part('function buyerParentId(','function summarizeSupplierBehavior(');
const {actualTenderParticipants,buildCompetitionForecast,directDocumentHighlights,extractSupplierBidEvidence}=vm.runInNewContext(
  'const COMPETITION_BUYER_HISTORY={};const COMPETITION_MODEL={};'+
  'const COMPETITION_REFRESH_NOV9={};const COMPETITION_REFRESH={};'+
  'function competitionModelForAnnouncement(data){return null}'+
  code+';({actualTenderParticipants,buildCompetitionForecast,directDocumentHighlights,extractSupplierBidEvidence})',
  {Date,Number,String,Math,Set,Map,Array}
);

const tenderId='UA-2026-08-06-012044-a';
const buyerRow={
  'Ідентифікатор лота':tenderId+'-L1',
  'Очікувана вартість':7533933,
  'Переможець':'ТОВ «УКРНАФТА-ПОСТАЧ» | 43012009'
};
const bids=[
  ['43012009','ТОВ «УКРНАФТА-ПОСТАЧ»',6643400],
  ['12345678','ТОВ «ОРІОН НАВІТЕК»',7379600],
  ['23456789','ПП «ОККО-СЕРВІС»',6896800],
  ['34567890','ПП «Укрпалетсистем»',7283000],
  ['45678901','ТОВ «ВЄНТУС РЕСУРС»',6814900]
].map(([code,name,amount],i)=>({id:String(i),status:'active',tenderers:[{name,identifier:{id:code}}],value:{amount}}));

test('single-lot catalog bids without API lots retain five supplier prices',()=>{
  const evidence=extractSupplierBidEvidence({bids},tenderId,[buyerRow]);
  assert.equal(evidence.length,5);
  assert.equal(evidence.find(x=>x.supplier_code==='43012009').won,true);
  assert.equal(evidence[0].bid_value,6643400);
  assert.ok(evidence.every(x=>x.expected_value===7533933&&x.lot_id===buyerRow['Ідентифікатор лота']));
});

test('completed August procurement shows observed participation without a later-trained forecast',()=>{
  const data={tenderID:tenderId,dateCreated:'2026-08-06T12:00:00Z',tenderPeriod:{endDate:'2026-08-11T08:00:00Z'},bids};
  assert.equal(buildCompetitionForecast(data,'mixed',7533933),null);
  assert.equal(actualTenderParticipants(data)?.count,5);
});

test('document excerpt must occur verbatim in a numbered paragraph',()=>{
  const doc={title:'Проект договір талони серпень.docx',kind:'docx',status:'read',source_id:'DOC-01',source_url:'https://public-docs.prozorro.gov.ua/get/document',text:'[абзац 1] Проект договору\n[абзац 2] Строк дії талонів становить не менше 12 місяців від дати передачі.\n[абзац 3] Текст без умов.'};
  const highlights=directDocumentHighlights([doc]);
  assert.equal(highlights.length,1);
  assert.equal(highlights[0].source.location,'абзац 2');
  assert.ok(doc.text.includes(highlights[0].text));
  assert.equal(highlights[0].source_verified,true);
  assert.equal(directDocumentHighlights([{...doc,status:'error'}]).length,0);
});

test('current buyer-history schema is assessed instead of rejected as unverified',()=>{
  const policy=fs.readFileSync('buyer-competition.js','utf8');
  const root={};
  vm.runInNewContext(policy,{globalThis:root,Number,Math});
  const h={ready:true,history_version:5,as_of:'2026-08-11',buyer_code:'01993807',period:{end:'2026-08-10'},
    verification:{candidate_lots:30,verified_lots:29},count:29,
    competition:{observed_count:27,known_count:27,one_count:3,zero_count:0,missing_count:0,final_count:27},
    suppliers:{known_lots:27,distinct_count:8,leaders:[{name:'Постачальник',count:7}]},
    states:{'Завершено лот закупівлі':27}};
  const result=root.Euro5BuyerCompetition.assess(h,'2026-08-11','01993807');
  assert.equal(result.level,'supported');
  assert.equal(result.multi_lots,24);
});
