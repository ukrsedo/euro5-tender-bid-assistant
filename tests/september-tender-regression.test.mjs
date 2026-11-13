import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const worker=fs.readFileSync(new URL('../worker.js',import.meta.url),'utf8');
function extract(first,last){const start=worker.indexOf(first),end=worker.indexOf(last,start+first.length);assert.ok(start>=0&&end>start);return worker.slice(start,end)}
const products=vm.runInNewContext(extract('function classifyFuelItem(','function qualityAllowsStandard(')+';tenderFuelProducts',{});

test('September technical annex supplies an evidenced indicative A-95 grade',()=>{
 const doc={status:'read',title:'Додаток 2 до тендерної документації (технічні вимоги до предмета закупівлі).docx',source_url:'/tender-document?tid=UA-2026-09-28-012925-a&doc=c652e2fa8c4d4a3ca19238719b0768b0',
  segments:[{location:'абзац 12',body:'Бензин А-95 – 09132100-4 Неетильований бензин;'},
   {location:'абзац 16',body:'Бензин А-95-Євро5-Е5 або еквівалент -'},
   {location:'абзац 18',body:'Дизельне паливо ДП-Євро5-ВО або еквівалент – 6 000 літрів'}]};
 const result=products({title:'Бензин та Дизельне паливо (в талонах)',items:[]},[doc]);
 assert.equal(result.gasoline.indicative_grade,'95');
 assert.equal(result.gasoline.indicative_source.location,'абзац 16');
 assert.equal(result.gasoline.grade,null);
 assert.equal(result.gasoline.requires_confirmation,true);
 assert.equal(result.diesel.indicative_grade,null);
});

test('unsupported or contradictory grades cannot create an A-95 indicative price',()=>{
 const doc={status:'read',title:'Технічні вимоги.docx',segments:[
  {location:'абзац 1',body:'Бензин А-95-Євро5-Е5'},
  {location:'абзац 2',body:'Бензин А-98-Євро5-Е5'}]};
 assert.equal(products({items:[]},[doc]).gasoline.indicative_grade,null);
 assert.equal(products({items:[]},[{...doc,status:'error'}]).gasoline.indicative_grade,null);
});

test('verified open tenders are counted with participants in the historical denominator',()=>{
 const code=extract('function buyerProcedureGroup(name){','class BuyerBiConnection');
 const fn=vm.runInNewContext('const BUYER_BI_APP="fixture";'+code+';summarizeBuyerHistory',{Date,Number,Map,Set,Object});
 const rows=Array.from({length:5},(_,i)=>({
  'Ідентифікатор лота':'UA-2026-01-0'+(i+1)+'-000001-a-L1',
  'Процедура закупівлі':'Відкриті торги з особливостями',
  'Кіль-ть унікальних учасників лота':[2,1,3,2,0][i],
  'Статус лота':i===4?'Неуспішний лот закупівлі':'Завершено лот закупівлі',
  'Очікувана вартість':2000000,'ПДВ в очікуваній вартості':'без ПДВ',
  'Класифікація CPV':'09130000-9'}));
 const h=fn(rows,'04012460',{start:'2025-10-14',end:'2026-10-13'});
 assert.equal(h.groups.open.count,5);
 assert.equal(h.competition.final_count,5);
 assert.equal(h.competition.observed_count,4);
 assert.equal(h.competition.one_count,1);
 assert.equal(h.competition.mean_participants,2);
});

test('document links fetch the current official URL through the shared Worker',async()=>{
 const id='c652e2fa8c4d4a3ca19238719b0768b0',tid='UA-2026-09-28-012925-a';
 let fetched=null;
 const fn=vm.runInNewContext(extract('async function tenderDocumentRoute(','export default {')+';tenderDocumentRoute',{
  URL,Response,normalizeTenderId:raw=>raw===tid?{parent:tid,lotSuffix:null}:null,
  fetchTenderData:async()=>({data:{documents:[{id,title:'Технічні вимоги.docx',url:'https://public-docs.prozorro.gov.ua/get/current-signature'}]}}),
  fetchProzorroDocument:async url=>{fetched=url;return new Response('DOCX BYTES',{status:200})},
  cors:()=>({}),json:(obj,status)=>new Response(JSON.stringify(obj),{status})
 });
 const response=await fn(new Request(`https://worker.example/tender-document?tid=${tid}&doc=${id}`),'');
 assert.equal(response.status,200);
 assert.equal(await response.text(),'DOCX BYTES');
 assert.equal(fetched,'https://public-docs.prozorro.gov.ua/get/current-signature');
 assert.equal(response.headers.get('Cache-Control'),'no-store');
 assert.equal((await fn(new Request(`https://worker.example/tender-document?tid=${tid}&doc=${'a'.repeat(32)}`),'')).status,404);
 assert.match(worker,/url\.pathname === "\/tender-document"/);
 const protectedCode=fs.readFileSync(new URL('../access-worker.js',import.meta.url),'utf8');
 assert.match(protectedCode,/\['\/buyer-history','\/health','\/tender-document'\]/);
});
