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

test('same-day tender ID remains valid before noon UTC; future Kyiv date is rejected',()=>{
  const start=worker.indexOf('function tenderAnnouncementDate(');
  const end=worker.indexOf('\n// History is sampled',start);
  const code=worker.slice(start,end);
  class FixedDate extends Date {
    constructor(value){super(value===undefined?'2026-11-13T09:00:00Z':value)}
    static now(){return Date.parse('2026-11-13T09:00:00Z')}
  }
  const dateContext={Date:FixedDate,Intl,String,Number};
  dateContext.euro5ObservationDate=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(d??new FixedDate());
  vm.createContext(dateContext);vm.runInContext(code+';this.pick=tenderAnnouncementDate',dateContext);
  assert.equal(dateContext.pick({tenderID:'UA-2026-11-13-002719-a'}).toISOString(),'2026-11-13T12:00:00.000Z');
  assert.equal(dateContext.pick({tenderID:'UA-2026-11-14-002719-a'}),null);
});

test('document-derived commercial terms keep exact source and conflicting values are withheld',()=>{
  const extract=context.directDocumentConditionEvidence;
  const docs=[{title:'Contract.docx',status:'read',source_url:'/document',segments:[
    {location:'абзац 109',body:'4.1. Розрахунки проводяться шляхом оплати Замовником суми згідно рахунку та видаткової накладної в строк 10 (десять) календарних днів. У разі затримки фінансування оплата буде здійснюватись протягом 7 банківських днів.'},
    {location:'абзац 110',body:'5.1. Термін постачання товару починається з моменту направлення заявки протягом 5 (п’яти) робочих днів.'},
    {location:'абзац 220',body:'Постачальник зобов’язаний надати забезпечення виконання цього Договору у вигляді гарантії, у розмірі 5% від вартості договору.'}
  ]}];
  const result=extract(docs);
  assert.equal(result.values.payment_days,10);
  assert.equal(result.values.delivery_days,5);
  assert.equal(result.values.performance_security_pct,5);
  assert.ok(result.evidence.some(x=>x.source.location==='абзац 109'&&x.source.quote.includes('10 (десять) календарних днів')));
  const conflict=extract([{...docs[0],segments:[...docs[0].segments,{location:'абзац 221',body:'Оплата за партію проводиться протягом 30 календарних днів.'}]}]);
  assert.equal(Object.hasOwn(conflict.values,'payment_days'),false);
});

test('explicit fuel wording in a read contract is classified with its exact citation',()=>{
  const helperStart=worker.indexOf('function classifyContractParagraph(');
  const start=worker.indexOf('export function directDocumentHighlights(');
  const end=worker.indexOf('\n// Extract only simple, explicit numeric terms',start);
  const code=(worker.slice(helperStart,start)+worker.slice(start,end)).replaceAll('export function','function');
  const ctx={Array,RegExp,String,Math};vm.createContext(ctx);vm.runInContext(code+';this.h=directDocumentHighlights',ctx);
  const quote='1.2. Найменування Товару: бензин автомобільний А-95-Євро5 та дизельне паливо ДП-Євро5 (наливом).';
  const result=ctx.h([{status:'read',kind:'docx',title:'Проєкт договору.docx',source_url:'/document',text:`[абзац 14] ${quote}`,segments:[{location:'абзац 14',body:quote}]}]);
  assert.equal(result.length,1);
  assert.match(result[0].category,/Технічні вимоги до пального/);
  assert.equal(result[0].source.location,'абзац 14');
  assert.equal(result[0].source.quote,quote);
});

test('capitalized Ukrainian contract terms are classified and payment evidence is source-linked',()=>{
  const helperStart=worker.indexOf('function classifyContractParagraph(');
  const start=worker.indexOf('export function directDocumentHighlights(');
  const end=worker.indexOf('\n// Extract only simple, explicit numeric terms',start);
  const code=(worker.slice(helperStart,start)+worker.slice(start,end)).replaceAll('export function','function');
  const ctx={Array,RegExp,String,Math};vm.createContext(ctx);vm.runInContext(code+';this.h=directDocumentHighlights',ctx);
  const body='4.1. Розрахунки проводяться шляхом оплати Замовником суми згідно рахунку та видаткової накладної в строк 10 (десять) календарних днів.';
  const result=ctx.h([{status:'read',kind:'docx',title:'Проєкт договору.docx',source_url:'/document',text:`[абзац 33] ${body}`,segments:[{location:'абзац 33',body}]}]);
  assert.equal(result.length,1);
  assert.match(result[0].category,/Оплата та розрахунки/);
  assert.equal(result[0].source.location,'абзац 33');
  assert.equal(result[0].source.quote,body);
});

test('contract extracts include only payment, operative supply and specific fuel specifications',()=>{
  const helperStart=worker.indexOf('function classifyContractParagraph(');
  const start=worker.indexOf('export function directDocumentHighlights(');
  const end=worker.indexOf('\n// Extract only simple, explicit numeric terms',start);
  const code=(worker.slice(helperStart,start)+worker.slice(start,end)).replaceAll('export function','function');
  const ctx={Array,RegExp,String,Math};vm.createContext(ctx);vm.runInContext(code+';this.h=directDocumentHighlights',ctx);
  const bodies=[
    ['абзац 3','м. Київ “___” ________ 2026 року'],
    ['абзац 4','Національна академія Служби безпеки України, в особі проректора ______, що діє на підставі Довіреності, та ______, в особі директора ______ уклали цей Договір.'],
    ['абзац 5','1. ВИЗНАЧЕННЯ ТЕРМІНІВ, ЩО ВИКОРИСТОВУЮТЬСЯ В ЦЬОМУ ДОГОВОРІ'],
    ['абзац 6','АЗС – автозаправні станції, на яких Покупець має право отримати паливо відповідно до умов даного Договору.'],
    ['абзац 7','Талон/скретч-карта – документ, що має серію, номер і дозволяє пред’явнику отримувати паливо на АЗС.'],
    ['абзац 18','Продавець гарантує, що Товар належить йому на праві власності та не перебуває під обтяженням.'],
    ['абзац 20','Продавець повинен передати товар, якість якого відповідає сертифікату відповідності та підтверджується паспортом виробника.'],
    ['абзац 21','Країною походження Товару не є Російська Федерація чи Республіка Білорусь.'],
    ['абзац 14','Найменування Товару: бензин автомобільний А-95-Євро5 та дизельне паливо ДП-Євро5 (наливом).'],
    ['абзац 24','При коливанні цін на ринку в сторону зменшення, Продавець поставляє Товар по ціні меншій, ніж вказана в Специфікації.'],
    ['абзац 26','Розрахунки проводяться шляхом оплати Покупцем відповідних грошових сум на поточний рахунок Продавця протягом 10 календарних днів.'],
    ['абзац 27','Постачання пального здійснюється виключно за талонами на АЗС у місті Києві протягом 5 робочих днів після заявки.'],
    ['абзац 28','Спосіб розрахунків за Товар – у національній валюті України в безготівковій формі шляхом перерахування Покупцем грошових сум на поточний рахунок Продавця.'],
    ['абзац 29','Передача/отримання Товару здійснюється виключно з використанням дійсних талонів/скретч-карт під час заправки автотранспорту Замовника.'],
    ['абзац 30','Термін дії Талонів/скретч-карт не менш як 6 місяців з моменту їх отримання.']
  ];
  const result=ctx.h([{status:'read',kind:'docx',title:'ПРОЕКТ ДОГОВОРУ.docx',source_url:'/document',text:bodies.map(([location,body])=>`[${location}] ${body}`).join('\n'),segments:bodies.map(([location,body])=>({location,body}))}]);
  assert.deepEqual(Array.from(result, item=>item.category),[
    'Технічні вимоги до пального','Оплата та розрахунки','Постачання та відпуск',
    'Оплата та розрахунки','Постачання та відпуск','Постачання та відпуск'
  ]);
  assert.deepEqual(Array.from(result,item=>item.source.location),['абзац 14','абзац 26','абзац 27','абзац 28','абзац 29','абзац 30']);
});

test('UA-2026-11-12-017662-a clauses are extracted from the same paragraphs read by the Worker',()=>{
  const helperStart=worker.indexOf('function classifyContractParagraph(');
  const start=worker.indexOf('export function directDocumentHighlights(');
  const end=worker.indexOf('\n// Extract only simple, explicit numeric terms',start);
  const code=(worker.slice(helperStart,start)+worker.slice(start,end)).replaceAll('export function','function');
  const ctx={Array,RegExp,String,Math};vm.createContext(ctx);vm.runInContext(code+';this.h=directDocumentHighlights',ctx);
  const bodies=[
    ['абзац 6','1.1. АЗС – автозаправні станції, на яких Покупець має право отримати паливо відповідно до умов даного Договору.'],
    ['абзац 7','1.2. Талон/скретч-карта – документ, що має серію, номер, захисні водяні знаки та інші захисні ознаки встановленої Продавцем форми, який дозволяє його пред’явнику отримувати паливо на АЗС.'],
    ['абзац 15','2.2. Передача/отримання Товару здійснюється, виключно, з використанням дійсних Талонів/скрейч-карт під час заправки автотранспорту Замовника.'],
    ['абзац 16','2.3. Термін дії Талон/скрейч-карта не менш як 6 (шість) місяців з моменту їх отримання (передачі). Всього загальний період використання дійсних Талонів/скрейч-карт, з урахуванням їх пролонгації, становить 1 рік.'],
    ['абзац 26','5.1. Спосіб розрахунків за Товар – у національній валюті України в безготівковій формі шляхом перерахування Покупцем відповідних грошових сум на поточний рахунок Продавця.'],
    ['абзац 27','5.2. Оплата за Товар здійснюється – лише за фактично отриманий Товар на підставі належним чином оформлених документів Продавця при наявності бюджетних призначень на ці цілі, з можливістю відстрочки платежу на 30 календарних днів.'],
    ['абзац 30','6.1. Продавець протягом строку дії цього Договору зобов’язується здійснювати постачання Товару Покупцю на умовах EXW за місцезнаходженням АЗС, а Покупець зобов’язується приймати такий Товар, оплачений на умовах цього Договору.'],
    ['абзац 31','6.1. Строк поставки Товару – до 30 листопада 2026 року.'],
    ['абзац 34',"6.3. Продавець зобов'язаний забезпечити зберігання придбаного Покупцем Товару до його повного використання. Видача Товару зі зберігання здійснюється на АЗС згідно переліку АЗС."],
    ['абзац 35','6.4. Товар передається за Талонами/скрейч-картами, з використанням яких Покупець чи інша особа можуть замовляти та отримувати Товар на АЗС Продавця. Кожному Талону присвоюється термін його дії, номінал (від 2 до 300 літрів), вид нафтопродукту.'],
    ['абзац 36','6.5. Товар вважається поставленим з моменту його фактичного отримання Покупцем. Перехід права власності на Товар відбувається в момент фактичного отримання Товару на АЗС.'],
    ['абзац 37','6.6. Поставка Товару здійснюється у робочі години АЗС з дотриманням інших умов Договору. При цьому поставка здійснюється по дійсних Талонах/скрейч-картах.'],
    ['абзац 38','6.7. У випадку закінчення строку дії Талону/скрейч-карти Продавцем здійснюється обмін протягом 10 робочих днів з дати закінчення строку дії.'],
    ['абзац 39','6.8. Продавець не проводить відпуск Товару по погашеному чи простроченому Талону/скрейч-карті.'],
    ['абзац 156','Бензин А-95 Євро 5 в талонах/скретч-картах.'],
    ['абзац 160','Дизельне пальне Євро 5 в талонах/скретч-картах.'],
    ['абзац 202','Технічні та якісні вимоги до Товару повинні відповідати Технічному регламенту щодо вимог до автомобільних бензинів, суднових та котельних палив та ДСТУ 7687:2015 «Бензини автомобільні Євро».'],
    ['абзац 203','Відпуск Товару Покупцю здійснюється цілодобово по довірчим документам на АЗС Продавця. Продавець повинен мати діючу мережу АЗС по всій території України, з обов’язковою наявністю не менше 3 АЗС у кожній області, не менше 2 у кожному обласному центрі та 5 у місті Києві.'],
    ['абзац 214','Номінал талонів 10, 20 літрів.'],
    ['абзац 215','Термін дії не менш як 6 (шість) місяців.'],
    ['абзац 216','Термін дії невикористаних талонів повинен продовжуватися не менше як на 1 рік.']
  ];
  const doc={status:'read',kind:'docx',title:'ПРОЕКТ ДОГОВОРУ.docx',source_id:'DOC-01',source_url:'/tender-document',text:bodies.map(([location,body])=>`[${location}] ${body}`).join('\n'),segments:bodies.map(([location,body])=>({location,body}))};
  const result=ctx.h([doc]);
  const locations=Array.from(result,item=>item.source.location);
  for(const location of ['абзац 15','абзац 16','абзац 26','абзац 27','абзац 30','абзац 31','абзац 34','абзац 35','абзац 36','абзац 37','абзац 38','абзац 39','абзац 156','абзац 160','абзац 202','абзац 203','абзац 214'])assert.ok(locations.includes(location),`missing ${location}`);
  assert.equal(locations.filter(location=>['абзац 16','абзац 216'].includes(location)).length,1,'repeated coupon-validity clauses should be consolidated');
  assert.ok(!locations.includes('абзац 6'));
  assert.ok(!locations.includes('абзац 7'));
  assert.ok(result.every(item=>doc.text.includes(item.text)&&item.source_verified));
});

test('irrelevant or boilerplate contract text produces no fallback excerpts',()=>{
  const helperStart=worker.indexOf('function classifyContractParagraph(');
  const start=worker.indexOf('export function directDocumentHighlights(');
  const end=worker.indexOf('\n// Extract only simple, explicit numeric terms',start);
  const code=(worker.slice(helperStart,start)+worker.slice(start,end)).replaceAll('export function','function');
  const ctx={Array,RegExp,String,Math};vm.createContext(ctx);vm.runInContext(code+';this.h=directDocumentHighlights',ctx);
  const result=ctx.h([{status:'read',kind:'docx',title:'Договір.docx',text:'[абзац 3] м. Київ “___” ________ 2026 року\n[абзац 4] Продавець гарантує, що Товар належить йому на праві власності.',segments:[
    {location:'абзац 3',body:'м. Київ “___” ________ 2026 року'},
    {location:'абзац 4',body:'Продавець гарантує, що Товар належить йому на праві власності.'}
  ]}]);
  assert.equal(result.length,0);
});

test('core clauses survive a read document with numbered segments even if its combined text is missing',()=>{
  const start=worker.indexOf('export function coreDocumentClauses(');
  const end=worker.indexOf('\n// Extract only simple, explicit numeric terms',start);
  const ctx={Array,RegExp,String};vm.createContext(ctx);
  vm.runInContext(worker.slice(start,end).replace('export function','function')+';this.extract=coreDocumentClauses',ctx);
  const result=ctx.extract([{status:'read',title:'ПРОЕКТ ДОГОВОРУ.docx',source_url:'/doc',segments:[
    {location:'абзац 7',body:'1.2. Талон/скретч-карта – документ, який дозволяє отримати паливо на АЗС.'},
    {location:'абзац 26',body:'5.1. Спосіб розрахунків за Товар – у безготівковій формі шляхом перерахування коштів.'},
    {location:'абзац 31',body:'6.1. Строк поставки Товару – до 30 листопада 2026 року.'},
    {location:'абзац 183',body:'Бензин А-95 (Євро 5) в талонах/скретч-картах, 9 000 літрів.'}
  ]}]);
  assert.deepEqual(Array.from(result,x=>x.source.location),['абзац 26','абзац 31','абзац 183']);
  assert.ok(result.every(x=>x.source_verified&&x.text===x.source.quote));
});

test('retail benchmark uses the last verified observation within five business days and keeps its date',async()=>{
  const start=worker.indexOf('async function fetchRetailPrice(');
  const end=worker.indexOf('\n}\n\n/**',start)+2;
  const code=worker.slice(start,end);
  const target=new Date('2026-11-13T12:00:00Z');
  const context={archive:[{date:'2026-11-09',prices_uah_l_with_vat:{a95:75.6}}],today:'2026-11-13'};
  const ctx={Date,Number,String,Math,UKRAINE_STANDARD_VAT:0.2,euro5ObservationDate:d=>d.toISOString().slice(0,10),formatUaDate:d=>`${String(d.getUTCDate()).padStart(2,'0')}.${String(d.getUTCMonth()+1).padStart(2,'0')}.${d.getUTCFullYear()}`,
    parseUaDate:s=>{const [d,m,y]=s.split('.').map(Number);return new Date(Date.UTC(y,m-1,d,12));},
    wholesaleBenchmarkAge:(t,p)=>{let age=0;for(let d=Date.parse(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv'}).format(p)+'T00:00:00Z')+86400000;d<=Date.parse(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv'}).format(t)+'T00:00:00Z');d+=86400000){const w=new Date(d).getUTCDay();if(w!==0&&w!==6)age++;}return age;},
    fetchMinfinPrice:async()=>({source:'Minfin archive',date:'09.11.2026',priceWithVat:75,priceWithoutVat:62.5}),
    euro5RetailRecord:(slug,date,c)=>{const e=c.archive.find(x=>x.date===date.toISOString().slice(0,10));const price=e?.prices_uah_l_with_vat?.[slug];return price?{source:'EURO5 archive',date:'09.11.2026',priceWithVat:price,priceWithoutVat:price/1.2}:null;}};
  vm.createContext(ctx);vm.runInContext(code+';this.f=fetchRetailPrice',ctx);
  const result=await ctx.f('a95',target,context);
  assert.equal(result.date,'09.11.2026');
  assert.equal(result.check.status,'reference_only');
  assert.match(result.check.reason,/п’ять робочих днів/);
  assert.equal(result.priceWithVat,75.6);
});

test('market comparison exposes calculated market value and breakdown in review',()=>{
  const app=fs.readFileSync('app.js','utf8');
  assert.match(app,/Розрахункова ринкова вартість без ПДВ/);
  assert.match(app,/грн\/л =/);
  assert.match(app,/marketCalculationText\(cmp,v\.fuelType,v\.gasolineVolume,v\.dieselVolume\)/);
});

test('every tender attachment status is represented in the review UI',()=>{
  const app=fs.readFileSync('app.js','utf8');
  for(const status of ['excluded_after_cutoff','date_unverified','unsupported','signature_file','not_processed_limit']) assert.ok(app.includes(status));
  assert.match(app,/Вкладення Prozorro: \$\{summary\.available\} загалом/);
});

test('training-sample history is distinguished from the 12-month buyer card',()=>{
  assert.match(worker,/окрема вибірка від картки історії замовника за останні 12 місяців/);
});
