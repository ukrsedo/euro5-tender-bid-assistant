import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const w=vm.createContext({console,Intl,Date,URL,AbortSignal});vm.runInContext(fs.readFileSync('worker.js','utf8').split('export default {')[0],w);
const p=(t,f='gasoline')=>w.fuelProductProfile(t,f);
assert.equal(p('Бензин А-95 Євро-5').tier,'unspecified');assert.equal(p('Бензин А-95 Євро-5').grade,'95');assert.equal(p('А-95 преміальний').tier,'premium');assert.equal(p('А-95 непреміальний').tier,'regular');
for(const [t,f] of [['А-92 звичайний','gasoline'],['А-98 звичайний','gasoline'],['А-95 premium','gasoline'],['ДП зимовий','diesel'],['ДП арктичний','diesel']])assert.equal(w.qualityAllowsStandard(p(t,f),f),false);
assert(w.qualityAllowsStandard(p('А-95 звичайний'),'gasoline'));
const html=['95:78.9','95 EURO:88.9','92:76.5','ДП:97.9','ДП EURO:105'].map(t=>{let[n,v]=t.split(':');return `<div class="fuel__col"><div class="elementor-heading-title">${n}</div><span class="elementor-heading-title">${v}</span></div>`}).join('');
assert.equal(w.parseEuro5Retail(html).a95Euro,88.9);assert.equal(w.parseEuro5Retail(html).a95premium,undefined);
const d=new Date('2026-10-20T12:00:00Z'),ctx={today:'2026-10-24',live:null,archive:[{date:'2026-10-20',prices_uah_l_with_vat:{a95:78.9,a95premium:88.9}}]},mf={date:'20.10.2026',priceWithVat:89.85,priceWithoutVat:89.85/1.2,source:'Minfin'};
w.fixture=mf;vm.runInContext('fetchMinfinPrice=async()=>fixture',w);
let r=await w.fetchRetailPrice('a95',d,ctx);assert.equal(r.priceWithVat,89.85);assert(r.check.difference_pct>5);assert.match(r.check.reason,/EURO/);
w.fixture=null;assert.equal((await w.fetchRetailPrice('a95',d,ctx)).priceWithoutVat,null);
w.fixture={...mf,date:'19.10.2026'};assert.equal((await w.fetchRetailPrice('a95',d,ctx)).priceWithoutVat,null);w.fixture=mf;
for(const [price,expected] of [[89,89],[70,89.85]]){const c={...ctx,archive:[{date:'2026-10-20',prices_uah_l_with_vat:{a95:price}}]};assert.equal((await w.fetchRetailPrice('a95',d,c)).priceWithVat,expected)}
const els=new Map();const el=id=>{if(!els.has(id))els.set(id,{value:'',textContent:'',innerHTML:'',disabled:false,events:{},classList:{add(){},remove(){},toggle(){}},addEventListener(n,fn){this.events[n]=fn},focus(){},scrollIntoView(){},appendChild(){},options:[{text:'Test'}],selectedIndex:0});return els.get(id)};
const a=vm.createContext({console,Intl,Date,document:{getElementById:el,createElement:el,body:el('body')},window:{addEventListener(){}},setTimeout});for(const f of ['price-risk.js','buyer-competition.js','app.js'])vm.runInContext(fs.readFileSync(f,'utf8'),a);
a.fixture={fuel_type:'gasoline',fuel_products:{gasoline:{grade:'95',tier:'unspecified',season:'unspecified',items:[{grade:'95'}]}},market_reference_candidates:{policy:'fuel-quality-v1',gasoline:{retail:89.85/1.2,bulk:null}}};vm.runInContext('lastExtraction=fixture;confirmedData=null',a);
assert.equal(vm.runInContext('benchmarkFor("retail","gasoline")',a),null);assert.equal(vm.runInContext('submissionRiskModel(100,100).ready',a),false);
vm.runInContext('confirmedData={...lastExtraction,gasoline_product:"a95_regular"}',a);assert.equal(vm.runInContext('benchmarkFor("retail","gasoline")',a),89.85/1.2);assert.equal(vm.runInContext('productRiskSupported()',a),true);
for(const product of ['a92','a98','premium','other','unknown']){a.product=product;vm.runInContext('confirmedData.gasoline_product=product',a);assert.equal(vm.runInContext('benchmarkFor("retail","gasoline")',a),null);assert.equal(vm.runInContext('productRiskSupported()',a),false)}
vm.runInContext('confirmedData.gasoline_product="a95_regular";lastExtraction.fuel_products.gasoline.tier="premium"',a);assert.equal(vm.runInContext('benchmarkFor("retail","gasoline")',a),null);
vm.runInContext('lastExtraction.fuel_products.gasoline.tier="unspecified";lastExtraction.fuel_products.gasoline.items=[{grade:"92"},{grade:"95"}]',a);assert.equal(vm.runInContext('productRiskSupported()',a),false);
vm.runInContext('lastExtraction={fuel_type:"gasoline"};confirmedData=null',a);assert.equal(vm.runInContext('benchmarkFor("retail","gasoline")',a),null);
console.log('PASS fuel quality: grade, premium/Euro, seasons, stale/absent checks, catalog ambiguity, safe fallback, confirmations, mixed grades, old backend.');
// API boundary: unsupported products must not leak a usable standard benchmark.
w.marketCtx={today:'2026-10-24',live:null,archive:[]};
vm.runInContext(`loadEuro5RetailContext=async()=>marketCtx;fetchMinfinPrice=async(slug,date)=>({date:formatUaDate(date),source:'Minfin',priceWithVat:slug==='a95'?90:100,priceWithoutVat:(slug==='a95'?90:100)/1.2});fetchEnkorrCurrentPrices=async()=>null;`,w);
const tender=description=>({tenderID:'UA-2026-10-13-014119-a',enquiryPeriod:{startDate:'2026-10-13T12:00:00+03:00'},dateCreated:'2026-10-13T12:00:00+03:00',items:[{description,classification:{id:'09132000-3'},quantity:10000,unit:{code:'LTR'}}]});
for(const description of ['Бензин А-92 звичайний','Бензин А-95 premium','Бензин А-95 Євро-5']){
 const ref=await w.buildMarketReference(tender(description),{fuel_type:'gasoline',gasoline_volume_l:10000},{normalizedWithoutVat:2000000},{supplyFormat:'retail'});
 assert.equal(ref.available,false);assert.equal(ref.retailGasolinePriceWithoutVat,null);assert.equal(ref.gasolinePriceWithoutVat??null,null);assert.match(ref.note,/Підтвердьте/);assert.equal(ref.referenceCandidates.gasoline.retail,75);
}
const ordinary=await w.buildMarketReference(tender('Бензин А-95 звичайний'),{fuel_type:'gasoline',gasoline_volume_l:10000},{normalizedWithoutVat:2000000},{supplyFormat:'retail'});assert(ordinary.available);assert.equal(ordinary.marketValueWithoutVat,750000);
console.log('PASS API: unsupported/unknown product has no usable standard price; supported regular product uses checked reference.');
