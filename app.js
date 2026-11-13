const MODEL = {
  market: {
    gasoline: { discounts:[0.50,2.50,5.75,8.50], competitiveness:[21.21212121,50.13774105,79.61432507,90.35812672] },
    diesel:   { discounts:[0.25,2.50,5.00,7.25], competitiveness:[21.21212121,50.13774105,79.61432507,90.35812672] },
    mixed:    { discounts:[0.25,2.50,4.75,6.75], competitiveness:[21.21212121,50.13774105,79.61432507,90.35812672] }
  },
  n1: {
    gasoline: { discounts:[0.25,1.75,5.50,10.25], competitiveness:[34.45378151,60.50420168,77.31092437,91.59663866] },
    diesel:   { discounts:[0.25,1.25,5.50,10.50], competitiveness:[34.45378151,60.50420168,77.31092437,91.59663866] },
    mixed:    { discounts:[0.25,1.75,5.50,9.75], competitiveness:[34.45378151,60.50420168,77.31092437,91.59663866] }
  }
};

// BEGIN GENERATED PRICE REFRESH
const MODEL_REFRESH = {"market":{"gasoline":{"discounts":[0.75,5.5,9.5,11.25],"competitiveness":[32.26495726495727,66.02564102564102,84.82905982905983,94.01709401709401],"sample":133,"in_window_coverage":[27.06766917293233,51.127819548872175,75.93984962406014,90.22556390977444]},"diesel":{"discounts":[1.25,4.25,7.0,10.0],"competitiveness":[32.26495726495727,66.02564102564102,84.82905982905983,94.01709401709401],"sample":525,"in_window_coverage":[25.333333333333336,50.857142857142854,76.38095238095238,90.28571428571428]},"mixed":{"discounts":[1.0,4.0,6.75,9.5],"competitiveness":[32.26495726495727,66.02564102564102,84.82905982905983,94.01709401709401],"sample":360,"in_window_coverage":[25.833333333333336,51.11111111111111,76.11111111111111,90.0]}},"n1":{"gasoline":{"discounts":[0.25,1.5,5.5,10.25],"competitiveness":[36.734693877551024,63.94557823129252,80.95238095238095,93.19727891156462],"sample":320,"in_window_coverage":[30.0,51.24999999999999,75.3125,91.25]},"diesel":{"discounts":[0.25,1.25,5.25,10.25],"competitiveness":[36.734693877551024,63.94557823129252,80.95238095238095,93.19727891156462],"sample":657,"in_window_coverage":[32.115677321156774,50.68493150684932,75.03805175038052,89.95433789954338]},"mixed":{"discounts":[0.25,1.75,5.25,9.75],"competitiveness":[36.734693877551024,63.94557823129252,80.95238095238095,93.19727891156462],"sample":1024,"in_window_coverage":[29.1015625,50.78125,75.09765625,90.13671875]}}};
const MODEL_REFRESH_V1 = {"market":{"gasoline":{"discounts":[0.75,5.5,9.5,11.25],"competitiveness":[32.18884120171674,66.52360515021459,84.76394849785407,93.99141630901288],"sample":131,"in_window_coverage":[27.480916030534353,51.14503816793893,75.57251908396947,90.07633587786259]},"diesel":{"discounts":[1.25,4.25,7.0,10.0],"competitiveness":[32.18884120171674,66.52360515021459,84.76394849785407,93.99141630901288],"sample":520,"in_window_coverage":[25.384615384615383,50.57692307692307,76.34615384615384,90.1923076923077]},"mixed":{"discounts":[1.0,4.0,6.75,9.5],"competitiveness":[32.18884120171674,66.52360515021459,84.76394849785407,93.99141630901288],"sample":361,"in_window_coverage":[26.038781163434905,51.24653739612188,76.17728531855957,90.02770083102493]}},"n1":{"gasoline":{"discounts":[0.25,1.5,5.5,10.25],"competitiveness":[36.734693877551024,63.26530612244898,80.95238095238095,93.19727891156462],"sample":319,"in_window_coverage":[30.094043887147336,51.410658307210035,75.23510971786834,91.22257053291536]},"diesel":{"discounts":[0.25,1.25,5.5,10.5],"competitiveness":[36.734693877551024,63.26530612244898,80.95238095238095,93.19727891156462],"sample":651,"in_window_coverage":[32.104454685099846,50.84485407066052,76.34408602150538,90.62980030721967]},"mixed":{"discounts":[0.25,1.75,5.25,9.75],"competitiveness":[36.734693877551024,63.26530612244898,80.95238095238095,93.19727891156462],"sample":1043,"in_window_coverage":[29.242569511025884,51.006711409395976,75.16778523489933,90.12464046021093]}}};
const MODEL_REFRESH_NOV9 = {"market":{"gasoline":{"discounts":[0.75,5.25,9.75,12.25],"competitiveness":[30.949105914718018,63.411279229711134,81.56808803301237,92.84731774415405],"sample":127,"in_window_coverage":[26.77165354330709,50.39370078740157,76.37795275590551,90.5511811023622]},"diesel":{"discounts":[1.0,4.0,6.75,9.25],"competitiveness":[30.949105914718018,63.411279229711134,81.56808803301237,92.84731774415405],"sample":478,"in_window_coverage":[25.313807531380757,51.67364016736402,77.19665271966527,90.3765690376569]},"mixed":{"discounts":[1.0,3.75,6.5,9.25],"competitiveness":[30.949105914718018,63.411279229711134,81.56808803301237,92.84731774415405],"sample":369,"in_window_coverage":[27.100271002710024,51.21951219512195,75.33875338753387,90.2439024390244]}},"n1":{"gasoline":{"discounts":[0.25,1.5,5.5,10.25],"competitiveness":[35.8974358974359,62.39316239316239,85.47008547008546,95.2991452991453],"sample":328,"in_window_coverage":[30.182926829268293,51.829268292682926,75.60975609756098,91.46341463414635]},"diesel":{"discounts":[0.25,1.25,5.0,9.75],"competitiveness":[35.8974358974359,62.39316239316239,85.47008547008546,95.2991452991453],"sample":689,"in_window_coverage":[32.075471698113205,50.943396226415096,75.47169811320755,90.27576197387518]},"mixed":{"discounts":[0.25,1.75,5.25,9.75],"competitiveness":[35.8974358974359,62.39316239316239,85.47008547008546,95.2991452991453],"sample":1052,"in_window_coverage":[29.467680608365022,51.235741444866925,76.04562737642586,90.5893536121673]}}};
// END GENERATED PRICE REFRESH

function activeStatisticalModel(){
  const version=activeTenderData()?.competition_forecast?.model_version;
  if(version==='2026-11-09-items-v2') return MODEL_REFRESH_NOV9;
  if(version==='2026-10-22-items-v2') return MODEL_REFRESH;
  if(version==='2026-10-22') return MODEL_REFRESH_V1;
  return MODEL;
}
function statisticalModelNote(){
  const qualityScope=" Узагальнена модель без поділу за маркою, преміальністю та сезонністю; точність для окремого різновиду не підтверджена.";
  const selected=activeStatisticalModel();
  if(selected===MODEL_REFRESH_NOV9) return qualityScope+'Версія 09.11.2026: 10646 завершених паливних лотів за даними Prozorro BI станом на 09.11.2026; перевірені позиції товарів та історія замовників. Застосовується до тендерів, оголошених з 10.11.2026.';
  if(selected===MODEL_REFRESH) return qualityScope+'Версія 22.10.2026, фільтр v2: 10 391 завершених лотів у статистичній базі. Загальні назви уточнюються за підтвердженими позиціями або описом єдиного товару. Перевірка решти спірних записів неповна через обмеження API.';
  if(selected===MODEL_REFRESH_V1) return qualityScope+'Версія 22.10.2026, попередній фільтр: 10 259 завершених лотів. Для нового фільтра потрібне оновлення Worker.';
  return qualityScope+'Попередня версія 05.10.2026: 11 858 завершених паливних тендерів Prozorro за 2022–05.10.2026. Для цього оголошення збережено попередню версію.';
}

const POSITIONS = [
  ['Обережна','Більше прибутку, нижча історична конкурентність'],
  ['Помірна','Компроміс між ціною та прибутком'],
  ['Сильна','Нижча ціна заради більшої історичної конкурентності'],
  ['Дуже агресивна','Максимальний тиск ціною']
];

const money = new Intl.NumberFormat('uk-UA',{maximumFractionDigits:0});
const grouped = new Intl.NumberFormat('uk-UA',{maximumFractionDigits:2});
const num = new Intl.NumberFormat('uk-UA',{maximumFractionDigits:2});
const tenderIdInput=document.getElementById('tenderId');
const analyzeBtn=document.getElementById('analyzeBtn');
const reviewSection=document.getElementById('reviewSection');
const calculatorSection=document.getElementById('calculatorSection');
const acceptBtn=document.getElementById('acceptBtn');
const exportPdfBtn=document.getElementById('exportPdfBtn');
const calculateBtn=document.getElementById('calculateBtn');
const recommendationCard=document.getElementById('recommendationCard');
const resultsCard=document.getElementById('resultsCard');
let lastExtraction=null;
let confirmedData=null;
let calculationIsCurrent=false;

function pct(v){ return `${num.format(v)}%`; }


function vatBasisLabel(value){
  const map={
    'without VAT':'без ПДВ',
    'with VAT':'з ПДВ',
    'unknown':'не визначено',
    'без ПДВ':'без ПДВ',
    'з ПДВ':'з ПДВ'
  };
  return map[value] || 'не визначено';
}
function volumeSourceLabel(value){
  const map={
    'public tender page':'публічна сторінка тендера',
    'not found':'не знайдено',
    'публічна сторінка тендера':'публічна сторінка тендера',
    'не знайдено':'не знайдено'
  };
  return map[value] || value;
}
function parseFlexibleNumber(value){
  let s=String(value??'').trim().replace(/[\s\u00A0\u202F]/g,'');
  if(!s) return 0;
  s=s.replace(/[^0-9,.-]/g,'');

  const comma=s.lastIndexOf(',');
  const dot=s.lastIndexOf('.');
  if(comma>=0 && dot>=0){
    const decimalSep=comma>dot ? ',' : '.';
    const thousandSep=decimalSep===',' ? '.' : ',';
    s=s.split(thousandSep).join('');
    if(decimalSep===',') s=s.replace(',', '.');
  }else if(comma>=0){
    const parts=s.split(',');
    if(parts.length>2){
      const dec=parts.pop();
      s=parts.join('')+'.'+dec;
    }else{
      s=s.replace(',', '.');
    }
  }else if(dot>=0){
    const parts=s.split('.');
    if(parts.length>2){
      const dec=parts.pop();
      s=parts.join('')+'.'+dec;
    }
  }

  const n=Number(s);
  return Number.isFinite(n)?n:0;
}
function parseGroupedNumber(value){ return parseFlexibleNumber(value); }
function formatGrouped(value){
  const n=typeof value==='number'?value:parseGroupedNumber(value);
  return Number.isFinite(n)&&String(value??'').trim()!=='' ? grouped.format(n) : '';
}
function setGroupedNumber(input,value){ input.value=Number.isFinite(Number(value)) ? formatGrouped(Number(value)) : ''; }
function installGroupedInput(input){
  input.addEventListener('blur',()=>{ if(input.value.trim()!=='') input.value=formatGrouped(input.value); });
}
function formatDecimalInput(value,maxDecimals=2){
  const raw=String(value??'').trim();
  if(raw==='') return '';
  const n=parseFlexibleNumber(raw);
  if(!Number.isFinite(n)) return '';
  return new Intl.NumberFormat('uk-UA',{minimumFractionDigits:0,maximumFractionDigits:maxDecimals}).format(n);
}
function installDecimalInput(input,maxDecimals=2){
  input.addEventListener('blur',()=>{
    if(input.value.trim()!=='') input.value=formatDecimalInput(input.value,maxDecimals);
  });
}

function nullableNumber(id){
  const raw=document.getElementById(id).value.trim();
  if(raw==='') return null;
  const n=parseFlexibleNumber(raw);
  return Number.isFinite(n)?n:null;
}
function nullableBoolean(id){
  const raw=document.getElementById(id).value;
  if(raw==='true') return true;
  if(raw==='false') return false;
  return null;
}
function setNullableNumber(id,value){
  document.getElementById(id).value=Number.isFinite(Number(value))?String(Number(value)):'';
}
function setNullableBoolean(id,value){
  document.getElementById(id).value=value===true?'true':value===false?'false':'';
}
function recommendedCompetitionMode(data){
  const fc=data?.competition_forecast;
  const one=Number(fc?.one_participant_pct);
  const two=Number(fc?.two_plus_participants_pct);
  if(Number.isFinite(one) && Number.isFinite(two)) return one>two?'n1':'market';
  return 'market';
}
function activeTenderData(){
  return confirmedData || lastExtraction;
}

function supplierScenarioData(expected,cfg){
  const profile=activeTenderData()?.buyer_profile;
  const history=profile?.supplier_behavior;
  if(profile?.ready!==true||!Array.isArray(history?.suppliers))return {suppliers:[],note:'Історичні цінові орієнтири постачальників не надійшли; значення не підставлено.'};
  const suppliers=history.suppliers.filter(x=>typeof x?.name==='string'&&x.name.trim()).map(x=>{
    const ratio=Number(x.avg_price_pct_of_budget);
    const observations=Number(x.observation_count);
    const valid=Number.isFinite(ratio)&&ratio>0&&Number.isFinite(expected)&&expected>0&&Number.isFinite(observations)&&observations>0;
    const closestIndex=valid&&Array.isArray(cfg?.discounts)
      ? cfg.discounts.reduce((best,discount,i)=>Math.abs(100-discount-ratio)<Math.abs(100-cfg.discounts[best]-ratio)?i:best,0)
      : 0;
    return {name:x.name.trim(),code:String(x.code||''),ratio:valid?ratio:null,observations:Number.isFinite(observations)?observations:0,amount:valid?expected*ratio/100:null,closestIndex};
  });
  const dates=profile.period?.start&&profile.period?.end?` Період історії: ${profile.period.start} — ${profile.period.end}.`:'';
  const basis=history.coverage_note||'Підтверджені історичні пропозиції постачальників.';
  const note=`Орієнтир кожного постачальника показано один раз біля найближчої за ціною ставки ЄВРО5. Його суму отримано множенням медіанного історичного відсотка від очікуваної вартості на очікувану вартість поточного тендера без ПДВ. ${basis}${dates} Це порівняльна оцінка за попередньою поведінкою, а не фактична або гарантована пропозиція в поточному тендері.`;
  return {suppliers,note};
}

function renderScenarioHeader(suppliers){
  const head=document.getElementById('resultsHead');
  if(!head)return;
  head.replaceChildren();
  const row=document.createElement('tr');
  ['Варіант','Історична конкурентність','Знижка','Пропозиція ЄВРО5, грн','Прибуток, грн','Маржа','Мін. маржа?'].forEach(label=>{
    const th=document.createElement('th');th.textContent=label;row.appendChild(th);
  });
  suppliers.forEach(supplier=>{
    const th=document.createElement('th');
    th.textContent=`Орієнтир · ${supplier.name}`;
    th.title=supplier.ratio===null?'Немає підтверджених цінових спостережень':`${supplier.observations} історичних цінових спостережень; медіана від очікуваної вартості.`;
    row.appendChild(th);
  });
  head.appendChild(row);
}

function appendSupplierEstimateCell(row,supplier,scenarioIndex){
  const td=document.createElement('td');
  if(scenarioIndex!==supplier.closestIndex){row.appendChild(td);return;}
  if(supplier.ratio===null){td.textContent='Немає цінових даних';row.appendChild(td);return;}
  const amount=document.createElement('strong');amount.className='supplier-estimate-value';amount.textContent=`≈ ${money.format(supplier.amount)} грн`;
  const basis=document.createElement('small');basis.className='supplier-estimate-basis';basis.textContent=`${num.format(supplier.ratio)}% · ${supplier.observations} проп.`;
  td.append(amount,basis);row.appendChild(td);
}

function supplyFormatLabel(format,gasFormat,dieselFormat){
  if(format==='bulk') return 'Налив';
  if(format==='retail') return 'Талони / паливні картки';
  if(format==='split'){
    const gl=gasFormat==='bulk'?'налив':gasFormat==='retail'?'талони / картки':'не визначено';
    const dl=dieselFormat==='bulk'?'налив':dieselFormat==='retail'?'талони / картки':'не визначено';
    return `Різний формат: бензин — ${gl}; дизель — ${dl}`;
  }
  return 'Не визначено';
}
function syncSplitSupplyVisibility(){
  const split=document.getElementById('reviewSupplyFormat').value==='split';
  document.getElementById('splitSupplyFormats').classList.toggle('hidden',!split);
}
function selectedProduct(family,d=activeTenderData()){
  const key=family==='gasoline'?'gasoline_product':'diesel_product';
  return d?.[key]||'unknown';
}
function productLabel(family,d=activeTenderData()){
 const labels={unknown:'не підтверджено',a95_regular:'А-95 звичайний',a92:'А-92',a98:'А-98 / А-100',diesel_regular:'ДП звичайний без спеціальних вимог до сезонності',premium:'преміальний / брендований',winter:'зимовий',arctic:'арктичний',other:'інший або кілька різновидів'};
 return labels[selectedProduct(family,d)]||'не підтверджено';
}
function standardProductConfirmed(family,d=activeTenderData()){
  if(!d?.product_selection_confirmed)return false;
  if(!lastExtraction?.market_reference_candidates||lastExtraction.market_reference_candidates.policy!=='fuel-quality-v1')return false;
  const selection=selectedProduct(family,d),profile=lastExtraction?.fuel_products?.[family];
  if(!profile?.items?.length)return false;
  if(profile.tier==='premium'||profile.tier==='ambiguous'||standardProductContradicted(family,d))return false;
  // User confirmation upgrades an evidence-supported indicative standard benchmark
  // to a confirmed selection. It does not waive contradictory grade/season evidence.
  if(selection!==(family==='gasoline'?'a95_regular':'diesel_regular'))return false;
  return indicativeStandardProductSupported(family,d);
}
// Lack of server-side quality evidence is not the same as evidence of a
// conflicting product. Permit manual review in that case, but never enable
// regular-fuel benchmarks or price-risk models without strict confirmation.
function standardProductContradicted(family,d){
  const selection=selectedProduct(family,d),profile=lastExtraction?.fuel_products?.[family];
  if(!profile?.items?.length)return false;
  if(family==='gasoline'&&selection!=='a95_regular')return false;
  if(family==='diesel'&&selection!=='diesel_regular')return false;
  // An ambiguous or missing server classification is NOT evidence that the
  // operator selected the wrong product. Only explicit contradictory facts
  // should block manual confirmation. Unverified market benchmarks stay off.
  if(profile.tier==='premium'||profile.items.some(item=>item.tier==='premium'))return true;
  if(family==='gasoline'){
    const grades=[profile.grade,...(profile.grades||[]),...profile.items.map(item=>item.grade)].filter(Boolean);
    return grades.some(grade=>!['95','A95','А95'].includes(String(grade).replace(/[\s-]/g,'')));
  }
  return ['winter','arctic'].includes(profile.season)||
    profile.items.some(item=>['winter','arctic'].includes(item.season));
}
function productBenchmarkSupported(){
 const d=activeTenderData(),type=d?.fuel_type;
 return (type==='diesel'||standardProductConfirmed('gasoline',d))&&(type==='gasoline'||standardProductConfirmed('diesel',d))&&['gasoline','diesel','mixed'].includes(type);
}
function indicativeStandardProductSupported(fuel,d){
  const standard=fuel==='gasoline'?'a95_regular':'diesel_regular';
  const selection=selectedProduct(fuel,d);
  // A deliberate non-standard selection always overrides any automatic guess.
  if(selection!=='unknown'&&selection!==standard)return false;
  const profile=lastExtraction?.fuel_products?.[fuel]||{};
  const items=Array.isArray(profile.items)?profile.items:[];
  const title=String(lastExtraction?.tender_title||'');
  if(profile.tier==='premium'||(items.length>0&&profile.tier==='ambiguous'))return false;
  if(items.some(item=>item.tier==='premium'||item.tier==='ambiguous'))return false;
  // Check contradictions as if the operator had chosen the standard grade.
  const checked={...d,[fuel==='gasoline'?'gasoline_product':'diesel_product']:standard};
  if(standardProductContradicted(fuel,checked))return false;
  if(fuel==='gasoline'){
    // Indicative only: explicit A-95 evidence may come from title or structured data.
    // A deployed older API might not expose indicative_grade yet.
    const titleGrades=[...new Set([...title.matchAll(/(?:[аa](?:[іиi])?\s*[-–]?\s*|бензин\s*)9([2458])(?!\d)/gi)].map(x=>'9'+x[1]))];
    const candidateGrades=[profile.grade,profile.indicative_grade,...items.map(item=>item.grade),...titleGrades].filter(Boolean);
    return candidateGrades.length>0&&candidateGrades.every(g=>g==='95')&&
      items.every(item=>!item.grade||item.grade==='95');
  }
  const hasDieselEvidence=/дизел|дизель|\bдп\b|diesel/i.test(title)||items.length>0;
  return hasDieselEvidence&&(items.length===0||['unspecified','summer',undefined].includes(profile.season))&&
    !/зимов|арктич|winter|arctic/i.test(title)&&
    items.every(item=>['unspecified','summer',undefined].includes(item.season));
}

function benchmarkFor(format,fuel,d=activeTenderData(),indicative=false){
  if(indicative){
    if(!indicativeStandardProductSupported(fuel,d)||!lastExtraction?.tender_announcement_date)return null;
  }else if(!standardProductConfirmed(fuel,d))return null;
  if(lastExtraction?.market_reference_candidates?.policy!=='fuel-quality-v1')return null;
  const candidate=lastExtraction.market_reference_candidates[fuel];
  if(format==='retail')return candidate?.retail>0?candidate.retail:null;
  if(format==='bulk')return candidate?.bulk>0?candidate.bulk:null;
  return null;
}

function benchmarkDescription(format,gasFormat,dieselFormat){
  if(format==='bulk'){
    const d=lastExtraction?.market_wholesale_reference_date;
    return `Ринковий орієнтир: опт Enkorr${d?` (${d})`:''}.`;
  }
  if(format==='retail'){
    const d=lastExtraction?.market_retail_reference_date;
    const source=lastExtraction?.market_retail_source||'Minfin';
    return `Роздрібний орієнтир: ${source}${d?` (${d})`:''}.`;
  }
  if(format==='split') return 'Для кожної позиції використовується орієнтир відповідно до її підтвердженого формату постачання.';
  return '';
}
function invalidateCalculation(){
  window.Euro5MemoryUI?.invalidate();
  calculationIsCurrent=false;
  recommendationCard.classList.add('hidden');
  resultsCard.classList.add('hidden');
  exportPdfBtn.disabled=true;
  const status=document.getElementById('calculateStatus');
  if(status) status.textContent='Дані змінено. Натисніть «Розрахувати», щоб оновити результат.';
}

function marketComparison(expectedValue, gasolineVolume, dieselVolume, fuelType, supplyData=null, indicative=false){
  if(!lastExtraction) return null;
  const d=supplyData || activeTenderData() || {};
  const format=d.supplyFormat || d.supply_format || 'unknown';
  const gasFormat=format==='split'?(d.gasolineSupplyFormat || d.gasoline_supply_format || 'unknown'):format;
  const dieselFormat=format==='split'?(d.dieselSupplyFormat || d.diesel_supply_format || 'unknown'):format;
  const gasPrice=benchmarkFor(gasFormat,'gasoline',d,indicative);
  const dieselPrice=benchmarkFor(dieselFormat,'diesel',d,indicative);
  let marketValue=0;
  if(fuelType==='gasoline'){
    if(!(gasolineVolume>0) || !(gasPrice>0)) return null;
    marketValue=gasolineVolume*gasPrice;
  } else if(fuelType==='diesel'){
    if(!(dieselVolume>0) || !(dieselPrice>0)) return null;
    marketValue=dieselVolume*dieselPrice;
  } else if(fuelType==='mixed'){
    if(!(gasolineVolume>0) || !(dieselVolume>0) || !(gasPrice>0) || !(dieselPrice>0)) return null;
    marketValue=gasolineVolume*gasPrice+dieselVolume*dieselPrice;
  } else return null;
  if(!(expectedValue>0) || !(marketValue>0)) return null;
  const gap=(expectedValue/marketValue-1)*100;
  return {gap,marketValue,format,gasFormat,dieselFormat,indicative,source:benchmarkDescription(format,gasFormat,dieselFormat)};
}

function displayMarketComparison(expectedValue,gasolineVolume,dieselVolume,fuelType,supplyData){
  const calculated=marketComparison(expectedValue,gasolineVolume,dieselVolume,fuelType,supplyData)||
    marketComparison(expectedValue,gasolineVolume,dieselVolume,fuelType,supplyData,true)||
    currentMarketComparison(expectedValue,gasolineVolume,dieselVolume,fuelType,supplyData);
  if(calculated)return calculated;
  // The Worker has already calculated the announcement-date comparison. Keep
  // that result visible when the browser cannot reproduce its classification.
  const gap=Number(lastExtraction?.budget_vs_market_pct);
  const marketValue=Number(lastExtraction?.market_value_uah_without_vat);
  if(!Number.isFinite(gap)||!(marketValue>0))return null;
  const format=lastExtraction.market_benchmark_type||'unknown';
  const source=lastExtraction.market_benchmark_label
    ?`${lastExtraction.market_benchmark_label}${lastExtraction.market_reference_date?` (${lastExtraction.market_reference_date})`:''}.`:'';
  return {gap,marketValue,format,gasFormat:format,dieselFormat:format,indicative:false,referenceContext:'announcement',source};
}

function currentMarketComparison(expectedValue,gasolineVolume,dieselVolume,fuelType,supplyData){
  const d=supplyData||activeTenderData()||{};
  const format=d.supplyFormat||d.supply_format||'unknown';
  const gasFormat=format==='split'?(d.gasolineSupplyFormat||d.gasoline_supply_format):format;
  const dieselFormat=format==='split'?(d.dieselSupplyFormat||d.diesel_supply_format):format;
  const candidates=lastExtraction?.current_market_candidates;
  const date=lastExtraction?.current_market_reference_date;
  if(!candidates||!date||!(expectedValue>0))return null;
  let marketValue=0;
  if(fuelType==='gasoline'){
    if(gasFormat!=='bulk'||!indicativeStandardProductSupported('gasoline',d)||!(gasolineVolume>0)||!(candidates.gasoline>0))return null;
    marketValue=gasolineVolume*candidates.gasoline;
  }else if(fuelType==='diesel'){
    if(dieselFormat!=='bulk'||!indicativeStandardProductSupported('diesel',d)||!(dieselVolume>0)||!(candidates.diesel>0))return null;
    marketValue=dieselVolume*candidates.diesel;
  }else if(fuelType==='mixed'){
    if(gasFormat!=='bulk'||dieselFormat!=='bulk'||!indicativeStandardProductSupported('gasoline',d)||!indicativeStandardProductSupported('diesel',d)||!(gasolineVolume>0)||!(dieselVolume>0)||!(candidates.gasoline>0)||!(candidates.diesel>0))return null;
    marketValue=gasolineVolume*candidates.gasoline+dieselVolume*candidates.diesel;
  }else return null;
  return {gap:(expectedValue/marketValue-1)*100,marketValue,format,gasFormat,dieselFormat,
    indicative:true,referenceContext:'current',source:`Поточний гуртовий орієнтир Enkorr (${date}); ціна після оголошення тендера.`};
}

function marketGapText(gap,referenceContext='announcement'){
  const a=Math.abs(gap);
  const when=referenceContext==='current'?'за поточним гуртовим орієнтиром (після оголошення)':'на дату оголошення';
  if(a<0.05) return `Очікувана вартість практично відповідає ринковій вартості такого обсягу ${when}.`;
  return `Очікувана вартість на ${num.format(a)}% ${gap>0?'вища':'нижча'} за ринкову вартість такого обсягу ${when}.`;
}

function renderReviewMarket(){
  const box=document.getElementById('marketComparisonReview');
  const v=reviewValues();
  // Only use the accepted selection while the visible pricing inputs still match it.
  if(confirmedData?.product_selection_confirmed&&
      v.fuelType===confirmedData.fuel_type&&
      v.gasoline_product===confirmedData.gasoline_product&&
      v.diesel_product===confirmedData.diesel_product&&
      v.supplyFormat===confirmedData.supply_format&&
      v.gasolineSupplyFormat===confirmedData.gasoline_supply_format&&
      v.dieselSupplyFormat===confirmedData.diesel_supply_format&&
      v.expectedValue===confirmedData.expected_value_uah&&
      v.gasolineVolume===confirmedData.gasoline_volume_l&&
      v.dieselVolume===confirmedData.diesel_volume_l){
    v.product_selection_confirmed=true;
  }
  const cmp=displayMarketComparison(v.expectedValue,v.gasolineVolume,v.dieselVolume,v.fuelType,v);
  if(!cmp){
    box.classList.remove('hidden');
    document.getElementById('marketComparisonReviewValue').textContent='—';
    document.getElementById('marketComparisonReviewText').textContent=lastExtraction?.market_comparison_note || (v.supplyFormat==='unknown'?'Оберіть формат постачання, щоб визначити правильний ринковий орієнтир.':'Ринкове порівняння для вибраного формату недоступне.');
    document.getElementById('marketBenchmarkSource').textContent='';
    return;
  }
  box.classList.remove('hidden');
  document.getElementById('marketComparisonReviewValue').textContent=`${cmp.indicative?'≈ ':''}${cmp.gap>=0?'+':''}${num.format(cmp.gap)}%`;
  document.getElementById('marketComparisonReviewText').textContent=(cmp.indicative?'Орієнтовна оцінка за звичайним пальним; у рейтингу не враховується. ':'')+marketGapText(cmp.gap,cmp.referenceContext);
  document.getElementById('marketBenchmarkSource').textContent=(cmp.indicative?'Марку не підтверджено автоматично. ':'')+(cmp.source || '');
}


function renderCompetitionForecast(data){
  const box=document.getElementById('competitionForecast');
  const fc=data?.competition_forecast;
  const oneValid=typeof fc?.one_participant_pct==='number'&&Number.isFinite(fc.one_participant_pct);
  const twoValid=typeof fc?.two_plus_participants_pct==='number'&&Number.isFinite(fc.two_plus_participants_pct);
  const valid=oneValid&&twoValid&&fc.one_participant_pct>=0&&fc.two_plus_participants_pct>=0&&
    fc.one_participant_pct<=100&&fc.two_plus_participants_pct<=100&&
    Math.abs(fc.one_participant_pct+fc.two_plus_participants_pct-100)<1;
  box.classList.remove('hidden');
  if(!valid){
    const actual=Number(data?.competition_actual?.count);
    const actualKnown=Number.isInteger(actual)&&actual>0;
    document.getElementById('competitionProbabilityBars').classList.add('hidden');
    document.getElementById('competitionKicker').textContent=actualKnown?'Фактична конкуренція':'Очікувана конкуренція';
    document.getElementById('competitionConclusion').textContent=actualKnown?`${actual} учасників подали пропозиції`:'Прогноз недоступний';
    document.getElementById('competitionOnePct').textContent='—';
    document.getElementById('competitionTwoPct').textContent='—';
    document.getElementById('competitionOneBar').style.width='0%';
    document.getElementById('competitionTwoBar').style.width='0%';
    document.getElementById('competitionHistoryNote').textContent=actualKnown
      ? 'Кількість учасників підтверджена пропозиціями Prozorro. Модель, доступна з жовтня 2026 року, не могла дати прогноз на дату цього серпневого тендера.'
      : 'Статистичний прогноз недоступний для цієї дати або вартості; учасників із пропозицій Prozorro не підтверджено. Відсотки не вигадуються.';
    document.getElementById('reviewCompetitionMode').value='market';
    document.getElementById('competitionModeReason').textContent=
      actualKnown?'Фактична кількість не є прогнозом на дату участі. Для розрахунку оберіть режим конкуренції вручну.':'Оберіть режим конкуренції вручну. Автоматичної рекомендації наразі немає.';
    return;
  }
  const one=Number(fc.one_participant_pct);
  const two=Number(fc.two_plus_participants_pct);
  document.getElementById('competitionProbabilityBars').classList.remove('hidden');
  document.getElementById('competitionKicker').textContent='Очікувана конкуренція';
  box.classList.remove('hidden');
  document.getElementById('competitionConclusion').textContent=fc.conclusion || '—';
  document.getElementById('competitionOnePct').textContent=`${num.format(one)}%`;
  document.getElementById('competitionTwoPct').textContent=`${num.format(two)}%`;
  document.getElementById('competitionOneBar').style.width=`${Math.max(0,Math.min(100,one))}%`;
  document.getElementById('competitionTwoBar').style.width=`${Math.max(0,Math.min(100,two))}%`;
  document.getElementById('competitionHistoryNote').textContent=fc.history_note || '';
  const mode=recommendedCompetitionMode(data);
  document.getElementById('reviewCompetitionMode').value=mode;
  document.getElementById('competitionModeReason').textContent=
    mode==='n1'
      ? `Рекомендація системи: «Очікується 1 учасник», оскільки цей сценарій має вищу прогнозовану ймовірність (${num.format(one)}%). За потреби змініть його вручну.`
      : `Рекомендація системи: «Ринок (два або більше постачальників)», оскільки сценарій двох або більше учасників має вищу прогнозовану ймовірність (${num.format(two)}%). За потреби змініть його вручну.`;
}


analyzeBtn.addEventListener('click', async()=>{
  const status=document.getElementById('aiStatus');
  const tenderId=tenderIdInput.value.trim();
  if(!tenderId){status.textContent='Введіть ID тендера Prozorro.';return;}

  const api=(window.EURO5_CONFIG?.apiUrl||'').replace(/\/$/,'');
  if(!api){status.textContent='Адресу сервера не налаштовано у config.js.';return;}

  window.Euro5BuyerCard?.reset();
  window.Euro5MemoryUI?.reset();
  analyzeBtn.disabled=true;
  status.textContent='Завантажую дані з Prozorro та перевіряю умови тендера…';
  reviewSection.classList.add('hidden');
  calculatorSection.classList.add('hidden');
  recommendationCard.classList.add('hidden');
  resultsCard.classList.add('hidden');
  confirmedData=null;
  calculationIsCurrent=false;

  try{
    const res=await fetch(`${api}/tender-check`,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({tenderId})
    });
    const data=await res.json().catch(()=>({}));
    if(!res.ok){
      const prefix=res.status===422?'Тендер не підходить для розрахунку: ':'';
      throw new Error(prefix + (data.detail || data.error || `HTTP ${res.status}`));
    }
    lastExtraction=data;
    renderReview(data);
    window.Euro5MemoryUI?.load(data,api);
    window.Euro5BuyerCard?.load(data,api);
    status.textContent='Дані завантажено. Перевірте Крок 2.';
    reviewSection.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){
    status.textContent=`Помилка: ${e.message}`;
  }finally{
    analyzeBtn.disabled=false;
  }
});

function renderReview(data){
  document.getElementById('reviewGasolineProduct').value='unknown';
  document.getElementById('reviewDieselProduct').value='unknown';
  const products=data.fuel_products;
  document.getElementById('fuelProductEvidence').textContent=products?['gasoline','diesel'].flatMap(f=>(products[f]?.items||[]).map(p=>p.source_text)).join('; '):'Сервер не передав підтверджений профіль продукту. Потрібне оновлення сервера; стандартні ціни не застосовуються.';
  document.getElementById('fuelPriceVerification').textContent=['gasoline','diesel'].map(f=>data.market_reference_candidates?.[f]?.check?.reason).filter(Boolean).join(' ');
  reviewSection.classList.remove('hidden');
  document.getElementById('reviewState').textContent='ПОТРІБНЕ ПІДТВЕРДЖЕННЯ';
  document.getElementById('reviewState').classList.remove('accepted');
  document.getElementById('reviewTenderId').textContent=data.tender_id || '—';
  document.getElementById('reviewTenderTitle').textContent=data.tender_title || 'Назву не знайдено';
  document.getElementById('reviewVatBasis').textContent=vatBasisLabel(data.vat_basis);
  document.getElementById('reviewCpv').textContent=data.cpv_code || '—';
  document.getElementById('reviewRawExpectedValue').textContent=Number.isFinite(Number(data.expected_value_raw_uah)) ? `${money.format(Number(data.expected_value_raw_uah))} грн` : '—';
  document.getElementById('reviewNormalization').textContent=data.normalization_note || data.scope_note || '';

  const sourceLink=document.getElementById('sourceLink');
  sourceLink.href=data.source_url || '#';
  sourceLink.classList.toggle('disabled-link',!data.source_url);

  document.getElementById('reviewFuelType').value=['gasoline','diesel','mixed'].includes(data.fuel_type) ? data.fuel_type : '';
  document.getElementById('reviewSupplyFormat').value=['bulk','retail','split'].includes(data.supply_format) ? data.supply_format : 'unknown';
  document.getElementById('reviewGasolineSupplyFormat').value=['bulk','retail'].includes(data.gasoline_supply_format) ? data.gasoline_supply_format : 'unknown';
  document.getElementById('reviewDieselSupplyFormat').value=['bulk','retail'].includes(data.diesel_supply_format) ? data.diesel_supply_format : 'unknown';
  document.getElementById('reviewSupplyFormatSource').textContent=(data.supply_format_source || 'Визначено автоматично') + ' · можна редагувати';
  syncSplitSupplyVisibility();
  setGroupedNumber(document.getElementById('reviewExpectedValue'),data.expected_value_uah);
  setGroupedNumber(document.getElementById('reviewGasolineVolume'),data.gasoline_volume_l);
  setGroupedNumber(document.getElementById('reviewDieselVolume'),data.diesel_volume_l);

  setNullableNumber('reviewAdvancePaymentPct',data.advance_payment_pct);
  setNullableNumber('reviewPaymentDays',data.payment_days);
  setNullableNumber('reviewBidSecurityPct',data.bid_security_pct);
  setNullableNumber('reviewPerformanceSecurityPct',data.performance_security_pct);
  setNullableNumber('reviewDeliveryDays',data.delivery_days);
  setNullableNumber('reviewMinStations',data.min_stations);
  setNullableNumber('reviewMaxRadiusKm',data.max_radius_km);
  setNullableBoolean('reviewNationwideCoverage',data.nationwide_coverage);
  setNullableBoolean('reviewAdvancePaymentGuarantee',data.advance_payment_guarantee);
  document.getElementById('reviewNamedNetwork').value=data.named_network || '';

  const note=document.getElementById('volumeNote');
  const volumeParts=[];
  if(data.volume_source) volumeParts.push(`Джерело обсягу: ${volumeSourceLabel(data.volume_source)}.`);
  if(data.volume_note) volumeParts.push(data.volume_note);
  note.textContent=volumeParts.join(' ');
  note.classList.toggle('hidden',!volumeParts.length);

  const reviewItems=[
    ...(Array.isArray(data.fuel_requirements)?data.fuel_requirements.map(x=>({...x,type:'Технічний параметр пального'})):[]),
    ...(Array.isArray(data.conditions)?data.conditions.map(x=>({...x,type:'Умова тендера'})):[]),
    ...(Array.isArray(data.actions)?data.actions.map(x=>({...x,type:'Фрагмент для перевірки'})):[]),
    ...(Array.isArray(data.document_highlights)?data.document_highlights.map(x=>({...x,type:'Дослівний витяг із документа'})):[])
  ];
  renderDocumentReadSummary(data);
  renderRequirements(reviewItems,data.document_read_summary?.read||0);
  document.getElementById('sourceScope').textContent=data.source_scope || '';
  document.getElementById('reviewValidation').textContent='';
  renderReviewMarket();
  renderCompetitionForecast(data);
}

function renderDocumentReadSummary(data){
  const box=document.getElementById('documentReadSummary');
  if(!box)return;
  box.replaceChildren();
  const summary=data.document_read_summary;
  if(!summary){box.textContent='Worker не повернув статус читання документів. Оновіть обидва Worker-и.';return;}
  const heading=document.createElement('strong');
  heading.textContent=`Документи Prozorro: ${summary.supported_before_cutoff} PDF/DOCX до ${summary.cutoff_date||'дати подання'}, прочитано ${summary.read}.`;
  box.appendChild(heading);
  const statuses=Array.isArray(data.document_read_status)?data.document_read_status:[];
  if(!statuses.length){
    const p=document.createElement('p');p.textContent=summary.available?'Придатних PDF/DOCX за цю дату не відібрано.':'Prozorro не повернув вкладених документів.';box.appendChild(p);return;
  }
  const list=document.createElement('ul');
  statuses.forEach(item=>{
    const li=document.createElement('li');
    const readable=item.status==='read'||(item.status==='truncated'&&item.extracted_chars>0);
    const volume=item.paragraphs?`${item.paragraphs} абзаців`:item.pages?`${item.pages} сторінок`:'';
    li.appendChild(document.createTextNode(`${readable?(item.status==='truncated'?'Частково прочитано':'Прочитано'):'Не прочитано'}: ${item.title}${volume?' · '+volume:''}${item.reason?' · '+item.reason:''}`));
    const url=safeDocumentCitationUrl(item.source_url);
    if(url){const link=document.createElement('a');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.textContent=' · Відкрити документ';li.appendChild(link);}
    list.appendChild(li);
  });
  box.appendChild(list);
}

function renderRequirements(items,readCount=0){
  const ul=document.getElementById('requirementsList');
  if(!ul)return;
  ul.innerHTML='';
  const rows=items.filter(x=>x?.source_verified===true&&x?.source?.title&&typeof x.text==='string'&&x.text.trim());
  if(!rows.length){
    const li=document.createElement('li');
    li.textContent=readCount?'Із прочитаних документів не отримано пунктів із перевіреною дослівною цитатою. Перегляньте файли вище.':'Умови не витягнуто, бо документи не прочитано. Причини показано вище.';
    ul.appendChild(li);
    return;
  }
  for(const item of rows){
    const li=document.createElement('li');
    const body=document.createElement('div');
    const label=document.createElement('strong');
    label.textContent=(item.type||'Підтверджений фрагмент')+': ';
    body.append(label,document.createTextNode(item.text));
    li.appendChild(body);
    const citation=document.createElement('small');
    citation.className='requirement-source';
    citation.appendChild(document.createTextNode(`Джерело: ${item.source.title}${item.source.location?`, ${item.source.location}`:''}`));
    const sourceUrl=safeDocumentCitationUrl(item.source.url);
    if(sourceUrl){
      citation.appendChild(document.createTextNode(' · '));
      const link=document.createElement('a');
      link.href=sourceUrl;
      link.target='_blank';
      link.rel='noopener noreferrer';
      link.textContent='Відкрити документ';
      citation.appendChild(link);
    }
    li.appendChild(citation);
    ul.appendChild(li);
  }
}

function safeDocumentCitationUrl(value){
  try{
    if(typeof value==='string'&&value.startsWith('/tender-document?')){
      const api=String(window.EURO5_CONFIG?.apiUrl||'');
      const url=new URL(value,api.endsWith('/')?api:api+'/');
      if(url.pathname==='/tender-document'&&/^UA-\d{4}-\d{2}-\d{2}-\d{6}-[a-z]$/i.test(url.searchParams.get('tid')||'')&&
        /^[a-f0-9]{32}$/i.test(url.searchParams.get('doc')||'')&&url.searchParams.size===2&&
        url.origin===new URL(api).origin&&url.protocol==='https:')return url.href;
      return null;
    }
    const url=new URL(value);
    const host=url.hostname.toLowerCase();
    const trusted=['prozorro.gov.ua','openprocurement.org'].some(domain=>host===domain||host.endsWith('.'+domain));
    return url.protocol==='https:'&&!url.username&&!url.password&&(!url.port||url.port==='443')&&trusted?url.href:null;
  }catch{return null;}
}

function fillList(id,items,fallback){
  const ul=document.getElementById(id); ul.innerHTML='';
  const values=Array.isArray(items)&&items.length?items:[fallback];
  values.forEach(x=>{const li=document.createElement('li');li.textContent=x;ul.appendChild(li);});
}

function reviewValues(){
  return {
    fuelType:document.getElementById('reviewFuelType').value,
    gasoline_product:document.getElementById('reviewGasolineProduct').value,
    diesel_product:document.getElementById('reviewDieselProduct').value,
    expectedValue:parseGroupedNumber(document.getElementById('reviewExpectedValue').value),
    gasolineVolume:parseGroupedNumber(document.getElementById('reviewGasolineVolume').value),
    dieselVolume:parseGroupedNumber(document.getElementById('reviewDieselVolume').value),
    supplyFormat:document.getElementById('reviewSupplyFormat').value,
    gasolineSupplyFormat:document.getElementById('reviewGasolineSupplyFormat').value,
    dieselSupplyFormat:document.getElementById('reviewDieselSupplyFormat').value,
    competitionMode:document.getElementById('reviewCompetitionMode').value,
    advance_payment_pct:nullableNumber('reviewAdvancePaymentPct'),
    payment_days:nullableNumber('reviewPaymentDays'),
    bid_security_pct:nullableNumber('reviewBidSecurityPct'),
    performance_security_pct:nullableNumber('reviewPerformanceSecurityPct'),
    delivery_days:nullableNumber('reviewDeliveryDays'),
    min_stations:nullableNumber('reviewMinStations'),
    max_radius_km:nullableNumber('reviewMaxRadiusKm'),
    nationwide_coverage:nullableBoolean('reviewNationwideCoverage'),
    advance_payment_guarantee:nullableBoolean('reviewAdvancePaymentGuarantee'),
    named_network:document.getElementById('reviewNamedNetwork').value.trim() || null
  };
}

function validateReview(v){
  if(!['gasoline','diesel','mixed'].includes(v.fuelType)) return 'Оберіть тип пального.';
  if(!['market','n1'].includes(v.competitionMode)) return 'Оберіть режим конкуренції для калькулятора.';
  if(!['bulk','retail','split'].includes(v.supplyFormat)) return 'Оберіть формат постачання: налив або талони / паливні картки.';
  if(v.supplyFormat==='split'){
    if(v.fuelType==='gasoline' && !['bulk','retail'].includes(v.gasolineSupplyFormat)) return 'Оберіть формат постачання бензину.';
    if(v.fuelType==='diesel' && !['bulk','retail'].includes(v.dieselSupplyFormat)) return 'Оберіть формат постачання дизеля.';
    if(v.fuelType==='mixed' && (!['bulk','retail'].includes(v.gasolineSupplyFormat) || !['bulk','retail'].includes(v.dieselSupplyFormat))) return 'Для різного формату вкажіть окремо формат бензину та дизеля.';
  }
  if(v.expectedValue<1000000) return 'Очікувана вартість має бути не менше 1 млн грн без ПДВ.';
  if(v.fuelType==='gasoline' && v.gasolineVolume<=0) return 'Вкажіть обсяг бензину.';
  if(v.fuelType==='diesel' && v.dieselVolume<=0) return 'Вкажіть обсяг дизеля.';
  if(v.fuelType==='mixed' && (v.gasolineVolume<=0 || v.dieselVolume<=0)) return 'Для змішаного тендера потрібні окремі обсяги бензину та дизеля.';
  // Manual confirmation must not be blocked by the server's heuristic
  // fuel-quality classifier. Any mismatch is reported as a warning below;
  // strict quality verification still gates market benchmarks and price risk.
  return '';
}

acceptBtn.addEventListener('click',()=>{
  const v=reviewValues();
  const error=validateReview(v);
  const validation=document.getElementById('reviewValidation');
  if(error){validation.textContent=error;validation.classList.add('error-text');return;}

  confirmedData={
    ...lastExtraction,
    product_selection_confirmed:true,
    fuel_type:v.fuelType,
    gasoline_product:v.gasoline_product,
    diesel_product:v.diesel_product,
    expected_value_uah:v.expectedValue,
    gasoline_volume_l:v.gasolineVolume,
    diesel_volume_l:v.dieselVolume,
    supply_format:v.supplyFormat,
    gasoline_supply_format:v.gasolineSupplyFormat,
    diesel_supply_format:v.dieselSupplyFormat,
    competition_mode:v.competitionMode,
    advance_payment_pct:v.advance_payment_pct,
    payment_days:v.payment_days,
    bid_security_pct:v.bid_security_pct,
    performance_security_pct:v.performance_security_pct,
    delivery_days:v.delivery_days,
    min_stations:v.min_stations,
    max_radius_km:v.max_radius_km,
    nationwide_coverage:v.nationwide_coverage,
    advance_payment_guarantee:v.advance_payment_guarantee,
    named_network:v.named_network
  };

  document.getElementById('confirmedFuelProducts').textContent='Підтверджений продукт: бензин — '+productLabel('gasoline',confirmedData)+'; дизель — '+productLabel('diesel',confirmedData)+'.';
  const acceptedReview={...v,product_selection_confirmed:true};
  const unverified=['gasoline','diesel'].filter(family=>(v.fuelType===family||v.fuelType==='mixed')&&
    ['a95_regular','diesel_regular'].includes(selectedProduct(family,acceptedReview))&&!standardProductConfirmed(family,acceptedReview));
  const contradicted=unverified.filter(family=>standardProductContradicted(family,v));
  validation.textContent=unverified.length
    ? 'Показники передано в калькулятор. '+(contradicted.length?'Увага: автоматична класифікація виявила можливу невідповідність марки або сезонності. ':'')+
      'Для '+unverified.map(f=>f==='gasoline'?'бензину':'дизеля').join(' та ')+' стандартний продукт не підтверджено сервером: ринкові орієнтири та ціновий ризик для нього не застосовуються.'
    : 'Показники підтверджено і передано в калькулятор.';
  validation.classList.remove('error-text');
  document.getElementById('reviewState').textContent='ПІДТВЕРДЖЕНО';
  document.getElementById('reviewState').classList.add('accepted');
  renderReviewMarket();

  document.getElementById('fuelType').value=v.fuelType;
  setGroupedNumber(document.getElementById('expectedValue'),v.expectedValue);
  setGroupedNumber(document.getElementById('gasolineVolume'),v.gasolineVolume);
  setGroupedNumber(document.getElementById('dieselVolume'),v.dieselVolume);
  document.getElementById('competitionMode').value=v.competitionMode;
  document.getElementById('confirmedSupplyFormat').value=supplyFormatLabel(v.supplyFormat,v.gasolineSupplyFormat,v.dieselSupplyFormat);

  
  document.getElementById('gasolineCost').value='';
  document.getElementById('dieselCost').value='';
  document.getElementById('totalLitres').textContent=money.format(v.gasolineVolume+v.dieselVolume);
  document.getElementById('fuelCostTotal').textContent='—';
  document.getElementById('riskAmount').textContent='—';
  document.getElementById('logisticsAmount').textContent='—';
  document.getElementById('fullCost').textContent='—';
  document.getElementById('minBid').textContent='—';
  // Step 3 must use the accepted product selection, not the pre-confirmation form snapshot.
  const cmp=displayMarketComparison(v.expectedValue,v.gasolineVolume,v.dieselVolume,v.fuelType,confirmedData);
  document.getElementById('budgetVsMarket').textContent=cmp?`${cmp.indicative?'≈ ':''}${cmp.gap>=0?'+':''}${num.format(cmp.gap)}%`:'—';
  document.getElementById('marketComparisonNote').textContent=cmp?(cmp.indicative?'Орієнтовна оцінка, у рейтингу не враховується. ':'')+marketGapText(cmp.gap,cmp.referenceContext)+' '+(cmp.referenceContext==='current'?cmp.source:''):'Ринкове порівняння недоступне.';
  document.getElementById('calculateStatus').textContent='Додайте внутрішні параметри ЄВРО5 і натисніть «Розрахувати».';

  recommendationCard.classList.add('hidden');
  resultsCard.classList.add('hidden');
  exportPdfBtn.disabled=true;
  calculationIsCurrent=false;
  calculatorSection.classList.remove('hidden');
  calculatorSection.scrollIntoView({behavior:'smooth',block:'start'});
});

const ids = [
  'fuelType','expectedValue','gasolineVolume','gasolineCost','dieselVolume','dieselCost',
  'competitionMode','logistics','riskReserve','minMargin'
];
const el = Object.fromEntries(ids.map(id=>[id,document.getElementById(id)]));
function value(id){ return parseFlexibleNumber(el[id].value); }

function costsComplete(){
  const fuel=el.fuelType.value;
  if(fuel==='gasoline') return value('gasolineVolume')>0 && value('gasolineCost')>0;
  if(fuel==='diesel') return value('dieselVolume')>0 && value('dieselCost')>0;
  return value('gasolineVolume')>0 && value('gasolineCost')>0 && value('dieselVolume')>0 && value('dieselCost')>0;
}


function clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
function round1(v){ return Math.round(v*10)/10; }

function discountAtCompetitiveness(cfg,target=50){
  const xs=cfg.competitiveness, ys=cfg.discounts;
  if(target<=xs[0]) return ys[0];
  for(let i=1;i<xs.length;i++){
    if(target<=xs[i]){
      const t=(target-xs[i-1])/(xs[i]-xs[i-1]);
      return ys[i-1]+t*(ys[i]-ys[i-1]);
    }
  }
  return ys[ys.length-1];
}

function tenderSizeScore(expected){
  if(expected>=20000000) return 15;
  if(expected>=10000000) return 12;
  if(expected>=5000000) return 9;
  if(expected>=2000000) return 6;
  return expected>=1000000 ? 3 : 0;
}

function conditionAdjustment(data){
  let points=0;
  const reasons=[];
  const advance=Number(data?.advance_payment_pct);
  const days=Number(data?.payment_days);

  if(Number.isFinite(advance) && advance>0){
    let p=advance>=50?5:advance>=20?3:1;
    points+=p;
    reasons.push({points:p,text:`Передоплата ${num.format(advance)}% покращує умови фінансування.`});
    if(data?.advance_payment_guarantee===true){
      points-=1;
      reasons.push({points:-1,text:'Для передоплати потрібна гарантія — частина переваги передоплати втрачається.'});
    }
  }else if(Number.isFinite(days) && days>=0){
    let p=0;
    if(days<=5) p=2;
    else if(days<=10) p=0;
    else p=-2;
    points+=p;
    if(p!==0) reasons.push({points:p,text:`Післяплата ${money.format(days)} днів ${p>0?'краща':'гірша'} за стандартні 6–10 днів.`});
    else reasons.push({points:0,text:`Післяплата ${money.format(days)} днів — стандартна для паливних тендерів умова, без коригування рейтингу.`});
  }

  const bidSec=Number(data?.bid_security_pct);
  if(Number.isFinite(bidSec) && bidSec>0){
    const p=bidSec>1?-2:-1; points+=p;
    reasons.push({points:p,text:`Забезпечення пропозиції ${num.format(bidSec)}% збільшує навантаження на участь.`});
  }
  const perfSec=Number(data?.performance_security_pct);
  if(Number.isFinite(perfSec) && perfSec>0){
    const p=perfSec>5?-2:-1; points+=p;
    reasons.push({points:p,text:`Забезпечення виконання договору ${num.format(perfSec)}% погіршує комерційні умови.`});
  }
  const delivery=Number(data?.delivery_days);
  if(Number.isFinite(delivery) && delivery>0 && delivery<=7){
    const p=delivery<=3?-2:-1; points+=p;
    reasons.push({points:p,text:`Строк поставки ${money.format(delivery)} дн. є коротким і зменшує гнучкість виконання.`});
  }
  const stations=Number(data?.min_stations);
  if(Number.isFinite(stations) && stations>=10){
    const p=stations>=20?-2:-1; points+=p;
    reasons.push({points:p,text:`Вимога щонайменше ${money.format(stations)} АЗС звужує гнучкість участі.`});
  }
  const radius=Number(data?.max_radius_km);
  if(Number.isFinite(radius) && radius>0 && radius<=10){
    const p=radius<=5?-2:-1; points+=p;
    reasons.push({points:p,text:`Обмеження радіуса до ${num.format(radius)} км є додатковою умовою покриття.`});
  }
  if(data?.nationwide_coverage===true){
    points-=2; reasons.push({points:-2,text:'Потрібне всеукраїнське покриття мережі АЗС.'});
  }
  if(data?.named_network){
    points-=2; reasons.push({points:-2,text:'Є вимога, пов’язана з конкретною мережею або брендом АЗС.'});
  }

  const raw=points;
  points=clamp(points,-10,10);
  if(raw!==points) reasons.push({points:0,text:`Сумарне коригування за умовами обмежено діапазоном від −10 до +10 балів.`});
  return {points,reasons};
}

function recommendationFromScore(score,stop){
  if(stop) return {title:'Не рекомендуємо участь',tone:'bad',summary:'Навіть обережна ставка не забезпечує введену мінімальну маржу. Економіка тендера не проходить базову умову прибутковості.'};
  if(score>=80) return {title:'Рекомендуємо брати участь',tone:'good',summary:'Сукупна економіка тендера виглядає привабливою. Основні фактори підтримують участь за поточних вхідних даних.'};
  if(score>=65) return {title:'Тендер привабливий, але є фактори, які варто врахувати',tone:'warn',summary:'Економіка загалом позитивна, але один або кілька факторів знижують запас привабливості.'};
  if(score>=50) return {title:'Участь можлива, але привабливість обмежена',tone:'warn',summary:'Тендер не виглядає однозначно сильним. Перед участю варто особливо перевірити фактори з низькими балами.'};
  return {title:'Не рекомендуємо участь за поточних умов',tone:'bad',summary:'Сукупний рейтинг низький: економічні або ринкові фактори не дають достатньої привабливості.'};
}

function budgetAssessment(gap){
  if(gap===null||gap===undefined||String(gap).trim()===''||!Number.isFinite(Number(gap)))return 10;
  return clamp(10+2*Number(gap),0,20);
}

function marginRatingScore(margin,minMargin){
  if(!Number.isFinite(minMargin) || minMargin<=0 || minMargin>=100) throw new RangeError('Мінімальна маржа має бути більшою за 0% і меншою за 100%.');
  return clamp(20*margin/minMargin,0,40);
}

function buildParticipationRating({expected,full,complete,cfg,cmp,minMargin,fuelCost,gasCostAmount=0}){
  if(!complete || !(expected>=1000000) || !(full>0)) return null;

  const discount50=discountAtCompetitiveness(cfg,50);
  const bid50=expected*(1-discount50/100);
  const margin50=(bid50-full)/bid50*100;
  const marginDelta=margin50-minMargin;
  const marginScore=marginRatingScore(margin50,minMargin);

  const budgetScore=budgetAssessment(cmp?.gap);
  const sizeScore=tenderSizeScore(expected);

  const conditions=conditionAdjustment(activeTenderData());
  const base=round1((marginScore+budgetScore+sizeScore)*1.2);
  const buyerCompetition=Euro5BuyerCompetition.assess(lastExtraction?.buyer_profile,lastExtraction?.buyer_history_as_of,lastExtraction?.buyer_code);
  const total=clamp(base+conditions.points+buyerCompetition.points,0,100);

  const cautiousBid=expected*(1-cfg.discounts[0]/100);
  const cautiousMargin=(cautiousBid-full)/cautiousBid*100;
  const stop=cautiousMargin<minMargin;
  let recommendation=Euro5BuyerCompetition.recommendation(recommendationFromScore(total,stop),buyerCompetition,stop);

  if(!productBenchmarkSupported()){
    if(!stop&&recommendation.tone!=='bad')recommendation={...recommendation,title:'Попередня оцінка — перевірте продукт',tone:'warn'};
    recommendation.summary+=' Марка або різновид не підтверджені чи не мають окремого цінового ряду; історична конкурентність узагальнена.';
  }
  return {
    total:Math.round(total),base:round1(base),conditions,discount50,margin50,marginDelta,
    marginScore:round1(marginScore),budgetScore:round1(budgetScore),sizeScore,
    buyerCompetition,cautiousMargin,stop,recommendation
  };
}

function marginRatingDescription(rating,minMargin){
  const multiple=rating.margin50/minMargin;
  return `Маржа ${num.format(rating.margin50)}% при вашому мінімумі ${num.format(minMargin)}% — ${num.format(multiple)} від мінімуму. Бал: 20 × ${num.format(multiple)}, з обмеженням до 40 → ${num.format(rating.marginScore)} із 40. Мінімум дає 20 балів, 1,5 мінімуму — 30, подвійний — 40.`;
}
function scoreRow(label,score,max,text,cls=''){
  return `<div class="rating-row ${cls}"><div class="rating-label"><strong>${escapeHtml(label)}</strong><span>${escapeHtml(text)}</span></div><div class="rating-points">${score>0&&String(score).charAt(0)!=='-'?'' : ''}${num.format(score)}${max?`/${max}`:''}</div></div>`;
}

function renderRecommendation(rating,cmp,expected,minMargin){
  const scoreEl=document.getElementById('ratingScore');
  const title=document.getElementById('recommendationTitle');
  const summary=document.getElementById('recommendationSummary');
  const breakdown=document.getElementById('ratingBreakdown');
  const warnings=document.getElementById('recommendationWarnings');
  if(!rating){
    scoreEl.textContent='—'; title.textContent='Введіть собівартість пального, щоб отримати рекомендацію.'; title.className='recommendation-title muted';
    summary.textContent=''; breakdown.innerHTML=''; warnings.innerHTML=''; return;
  }
  scoreEl.textContent=rating.total;
  title.textContent=rating.recommendation.title;
  title.className=`recommendation-title ${rating.recommendation.tone}`;
  summary.textContent=rating.recommendation.summary;

  const budgetText=cmp
    ? `Бюджет замовника ${cmp.gap>=0?'на '+num.format(Math.abs(cmp.gap))+'% вище':'на '+num.format(Math.abs(cmp.gap))+'% нижче'} ринкової вартості відповідного обсягу.`
    : 'Ринкове порівняння недоступне; використано нейтральні 10/20 балів.';
  const condText=rating.conditions.points===0
    ? 'Підтверджені умови тендера не змінюють рейтинг.'
    : `Умови тендера коригують рейтинг на ${rating.conditions.points>0?'+':''}${num.format(rating.conditions.points)} балів.`;

  breakdown.innerHTML=[
    scoreRow('Маржа за ціни з 50% історичної конкурентності',rating.marginScore,40,marginRatingDescription(rating,minMargin)),
    scoreRow('Бюджет замовника проти ринку',rating.budgetScore,20,budgetText),
    scoreRow('Розмір тендера',rating.sizeScore,15,`Очікувана вартість: ${money.format(expected)} грн без ПДВ.`),
    scoreRow('Умови тендера',rating.conditions.points,0,condText,'condition-row'),
    scoreRow('Конкурентність замовника',rating.buyerCompetition.points,0,rating.buyerCompetition.label+'. '+rating.buyerCompetition.reason,'condition-row')
  ].join('');

  const details=[`<li><strong>Конкурентність замовника (${rating.buyerCompetition.points} балів):</strong> ${escapeHtml(rating.buyerCompetition.reason)}</li>`];
  rating.conditions.reasons.forEach(r=>details.push(`<li><strong>${r.points>0?'+':''}${num.format(r.points)}:</strong> ${escapeHtml(r.text)}</li>`));
  if(rating.stop) details.unshift(`<li><strong>Стоп-фактор:</strong> обережна ставка дає маржу ${num.format(rating.cautiousMargin)}%, що нижче мінімальних ${num.format(minMargin)}%.</li>`);
  warnings.innerHTML=details.length?`<h3>Як умови вплинули на рекомендацію</h3><ul>${details.join('')}</ul>`:'';
}

function renderAnalysisCards({expected,full,cfg,minMargin}){
  const bids=cfg.discounts.map(d=>expected*(1-d/100));
  const eligible=bids.map((bid,i)=>({i,margin:(bid-full)/bid*100})).filter(r=>r.margin>=minMargin);
  const best=eligible.sort((a,b)=>cfg.competitiveness[b.i]-cfg.competitiveness[a.i])[0];
  document.getElementById('historicalRecommendation').textContent=best?`За історією найконкурентніша ставка, що проходить мінімальну маржу за введеної собівартості, — «${POSITIONS[best.i][0]}». Базовий рейтинг нормовано до 90 балів без моделі надійності прибутку. Історична конкурентність не є ймовірністю перемоги.`:'Жодна ставка не проходить мінімальну маржу за введеної собівартості. Перегляньте економіку закупівлі.';
}


function recalc(){
  const status=document.getElementById('calculateStatus');
  const expected=value('expectedValue');
  const gasVol=value('gasolineVolume'), gasCost=value('gasolineCost');
  const dieVol=value('dieselVolume'), dieCost=value('dieselCost');
  const litres=gasVol+dieVol;
  const fuelCost=gasVol*gasCost+dieVol*dieCost;
  const risk=fuelCost*(value('riskReserve')/100);
  const logistics=litres*value('logistics');
  const full=fuelCost+risk+logistics;
  const minimumMargin=value('minMargin');
  if(!Number.isFinite(minimumMargin) || minimumMargin<=0 || minimumMargin>=100){
    status.textContent='Мінімальна маржа має бути більшою за 0% і меншою за 100%.';
    recommendationCard.classList.add('hidden');
    resultsCard.classList.add('hidden');
    exportPdfBtn.disabled=true;
    calculationIsCurrent=false;
    return false;
  }
  const mm=minimumMargin/100;
  const minBid=mm>=1 ? NaN : full/(1-mm);
  const complete=costsComplete();

  document.getElementById('totalLitres').textContent=money.format(litres);
  document.getElementById('fuelCostTotal').textContent=complete?`${money.format(fuelCost)} грн`:'—';
  document.getElementById('riskAmount').textContent=complete?`${money.format(risk)} грн`:'—';
  document.getElementById('logisticsAmount').textContent=`${money.format(logistics)} грн`;
  document.getElementById('fullCost').textContent=complete?`${money.format(full)} грн`:'—';
  document.getElementById('minBid').textContent=complete&&Number.isFinite(minBid)?`${money.format(minBid)} грн`:'—';

  const cmp=displayMarketComparison(expected,gasVol,dieVol,el.fuelType.value,activeTenderData());
  const budgetMarket=document.getElementById('budgetVsMarket');
  const marketNote=document.getElementById('marketComparisonNote');
  if(cmp){
    budgetMarket.textContent=`${cmp.indicative?'≈ ':''}${cmp.gap>=0?'+':''}${num.format(cmp.gap)}%`;
    budgetMarket.className=cmp.indicative?'':(cmp.gap>=0?'market-positive':'market-negative');
    marketNote.textContent=(cmp.indicative?'Орієнтовна оцінка за звичайним пальним; у рейтингу не враховується. ':'')+marketGapText(cmp.gap,cmp.referenceContext) + (cmp.source ? ` ${cmp.source}` : '');
  }else{
    budgetMarket.textContent='—';
    budgetMarket.className='';
    marketNote.textContent=lastExtraction?.market_comparison_note || 'Ринкове порівняння недоступне для цього набору даних.';
  }

  document.getElementById('scopeWarning').classList.toggle('hidden', expected>=1000000);
  document.getElementById('costWarning').classList.toggle('hidden',complete);

  if(!complete){
    status.textContent='Введіть закупівельну собівартість потрібного виду пального.';
    recommendationCard.classList.add('hidden');
    resultsCard.classList.add('hidden');
    exportPdfBtn.disabled=true;
    calculationIsCurrent=false;
    return false;
  }
  if(expected<1000000){
    status.textContent='Очікувана вартість менша за 1 млн грн без ПДВ.';
    recommendationCard.classList.add('hidden');
    resultsCard.classList.add('hidden');
    exportPdfBtn.disabled=true;
    calculationIsCurrent=false;
    return false;
  }

  const cfg=activeStatisticalModel()[el.competitionMode.value][el.fuelType.value];
  const rating=buildParticipationRating({expected,full,complete,cfg,cmp,minMargin:value('minMargin'),fuelCost,gasCostAmount:gasVol*gasCost});
  renderRecommendation(rating,cmp,expected,value('minMargin'));
  window.Euro5MemoryUI?.observe({
    tenderId:lastExtraction?.tender_id,buyerCode:lastExtraction?.buyer_code,
    fuelType:el.fuelType.value,supplyFormat:activeTenderData()?.supply_format,
    expectedValue:expected,totalCost:full,minMargin:value('minMargin'),margin50:rating.margin50,
    score:rating.total,stop:rating.stop,paymentDays:activeTenderData()?.payment_days??null,
    buyerPenalty:rating.buyerCompetition.points,recommendation:rating.recommendation.title,
    modelVersion:String(lastExtraction?.competition_forecast?.model_version||'')
  });
  const tbody=document.getElementById('resultsBody'); tbody.innerHTML='';
  const supplierEvidence=supplierScenarioData(expected,cfg);
  renderScenarioHeader(supplierEvidence.suppliers);
  document.getElementById('supplierScenarioSource').textContent=supplierEvidence.note;
  cfg.discounts.forEach((discount,i)=>{
    const bid=expected*(1-discount/100);
    const profit=complete ? bid-full : null;
    const margin=complete && bid>0 ? profit/bid*100 : null;
    const ok=complete ? margin>=value('minMargin') : null;
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${POSITIONS[i][0]}</td>
      <td>${pct(cfg.competitiveness[i])}</td>
      <td>${pct(discount)}</td>
      <td>${money.format(bid)}</td>
      <td>${complete?money.format(profit):'—'}</td>
      <td>${complete?pct(margin):'—'}</td>
      <td class="${ok===true?'ok':ok===false?'no':''}">${ok===true?'ТАК':ok===false?'НІ':'—'}</td>`;
    supplierEvidence.suppliers.forEach(supplier=>appendSupplierEstimateCell(tr,supplier,i));
    tr.title=POSITIONS[i][1];
    tbody.appendChild(tr);
  });
  renderAnalysisCards({expected,full,fuelCost,gasCostAmount:gasVol*gasCost,cfg,minMargin:minimumMargin});
  recommendationCard.classList.remove('hidden');
  resultsCard.classList.remove('hidden');
  exportPdfBtn.disabled=false;
  calculationIsCurrent=true;
  status.textContent='Розрахунок виконано.';
  recommendationCard.scrollIntoView({behavior:'smooth',block:'start'});
  return true;
}

function escapeHtml(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function evidenceListHtml(items,fallback){
  const arr=Array.isArray(items)?items.filter(x=>x?.source_verified&&x?.source?.title&&x?.text):[];
  if(!arr.length)return `<p>${escapeHtml(fallback)}</p>`;
  return `<ul>${arr.map(x=>{
    const url=safeDocumentCitationUrl(x.source.url);
    const citation=`Джерело: ${escapeHtml(x.source.title)}${x.source.location?', '+escapeHtml(x.source.location):''}`;
    return `<li>${escapeHtml(x.text)}<br><small>${citation}${url?` · <a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Відкрити документ</a>`:''}</small></li>`;
  }).join('')}</ul>`;
}



function competitionPdfHtml(){
  const fc=lastExtraction?.competition_forecast;
  if(!fc){
    const actual=Number(lastExtraction?.competition_actual?.count);
    return Number.isInteger(actual)&&actual>0
      ? `<section class="pdf-competition"><h3>Фактична конкуренція</h3><p>${num.format(actual)} учасників подали пропозиції за даними Prozorro. Прогноз на дату тендера недоступний; фактична кількість не є прогнозом.</p></section>`
      : '';
  }
  const confirmedMode=activeTenderData()?.competition_mode==='n1'?'Очікується 1 учасник':'Ринок (два або більше постачальників)';
  return `<section class="pdf-competition"><h3>Очікувана конкуренція</h3><div class="pdf-grid"><div><span>Один учасник</span><strong>${num.format(fc.one_participant_pct)}%</strong></div><div><span>Два або більше</span><strong>${num.format(fc.two_plus_participants_pct)}%</strong></div><div><span>Підтверджений режим</span><strong>${escapeHtml(confirmedMode)}</strong></div></div><p>${escapeHtml(fc.conclusion||'')}</p><p>${escapeHtml(fc.history_note||'')}</p></section>`;
}

function ratingPdfHtml(rating,cmp,expected,minMargin){
  if(!rating) return '';
  const rows=[
    ['Маржа за ціни з 50% історичної конкурентності',`${num.format(rating.marginScore)}/40`,marginRatingDescription(rating,minMargin)],
    ['Бюджет замовника проти ринку',`${num.format(rating.budgetScore)}/20`,cmp?`${cmp.gap>=0?'+':''}${num.format(cmp.gap)}% до ринку.`:'Дані недоступні; нейтральна оцінка.'],
    ['Розмір тендера',`${num.format(rating.sizeScore)}/15`,`${money.format(expected)} грн без ПДВ.`],
    ['Умови тендера',`${rating.conditions.points>0?'+':''}${num.format(rating.conditions.points)}`,'Коригування базового рейтингу.'],
    ['Конкурентність замовника',`${rating.buyerCompetition.points}`,rating.buyerCompetition.label+'. '+rating.buyerCompetition.reason]
  ].map(x=>`<tr><td>${escapeHtml(x[0])}</td><td>${escapeHtml(x[1])}</td><td>${escapeHtml(x[2])}</td></tr>`).join('');
  const cond=rating.conditions.reasons.length?`<ul>${rating.conditions.reasons.map(r=>`<li>${r.points>0?'+':''}${num.format(r.points)}: ${escapeHtml(r.text)}</li>`).join('')}</ul>`:'';
  return `<section class="pdf-recommendation"><div class="pdf-score"><strong>${rating.total}/100</strong><span>${escapeHtml(rating.recommendation.title)}</span></div><p>${escapeHtml(rating.recommendation.summary)}</p><table><thead><tr><th>Фактор</th><th>Бали</th><th>Пояснення</th></tr></thead><tbody>${rows}</tbody></table>${cond}${window.Euro5MemoryUI?.reportHtml()||''}</section>`;
}

function buildPdfReport(){
  const expected=value('expectedValue');
  const gasVol=value('gasolineVolume'), dieVol=value('dieselVolume');
  const litres=gasVol+dieVol;
  const gasCost=value('gasolineCost'), dieCost=value('dieselCost');
  const fuelCost=gasVol*gasCost+dieVol*dieCost;
  const risk=fuelCost*(value('riskReserve')/100);
  const logistics=litres*value('logistics');
  const full=fuelCost+risk+logistics;
  const cmp=marketComparison(expected,gasVol,dieVol,el.fuelType.value,activeTenderData());
  const displayCmp=displayMarketComparison(expected,gasVol,dieVol,el.fuelType.value,activeTenderData());
  const cfg=activeStatisticalModel()[el.competitionMode.value][el.fuelType.value];
  const rating=buildParticipationRating({expected,full,complete:true,cfg,cmp,minMargin:value('minMargin'),fuelCost,gasCostAmount:gasVol*gasCost});
  const fuelLabel=el.fuelType.options[el.fuelType.selectedIndex].text;
  const modeLabel=el.competitionMode.options[el.competitionMode.selectedIndex].text;
  const supplierEvidence=supplierScenarioData(expected,cfg);
  const supplierHeaders=supplierEvidence.suppliers.map(s=>`<th>Орієнтир · ${escapeHtml(s.name)}<br><small>${s.observations?`${money.format(s.observations)} іст. проп.`:'без цінових даних'}</small></th>`).join('');
  const rows=cfg.discounts.map((discount,i)=>{
    const bid=expected*(1-discount/100);
    const profit=bid-full;
    const margin=bid>0?profit/bid*100:0;
    const ok=margin>=value('minMargin');
    const supplierCells=supplierEvidence.suppliers.map(s=>i!==s.closestIndex?'<td></td>':s.ratio===null?'<td>Немає цінових даних</td>':`<td>≈ ${money.format(s.amount)} грн<br><small>${num.format(s.ratio)}% бюджету</small></td>`).join('');
    return `<tr><td>${POSITIONS[i][0]}</td><td>${pct(cfg.competitiveness[i])}</td><td>${pct(discount)}</td><td>${money.format(bid)}</td><td>${money.format(profit)}</td><td>${pct(margin)}</td><td>${ok?'ТАК':'НІ'}</td>${supplierCells}</tr>`;
  }).join('');
  const report=document.getElementById('pdfReport');
  report.innerHTML=`
    <div class="pdf-head"><img src="euro5-logo.png" alt="ЄВРО5"><div><h1>Асистент тендерної пропозиції</h1><div>${escapeHtml(lastExtraction?.tender_id||'')}</div></div></div>
    <h2>${escapeHtml(lastExtraction?.tender_title||'Тендер')}</h2>
    ${lastExtraction?.buyer_profile?.ready?window.Euro5BuyerCard.html(lastExtraction.buyer_profile):''}
    ${competitionPdfHtml()}
    ${ratingPdfHtml(rating,cmp,expected,value('minMargin'))}
    <div class="pdf-grid">
      <div><span>Тип пального</span><strong>${escapeHtml(fuelLabel)}</strong></div>
      <div><span>Формат постачання</span><strong>${escapeHtml(supplyFormatLabel(activeTenderData()?.supply_format,activeTenderData()?.gasoline_supply_format,activeTenderData()?.diesel_supply_format))}</strong></div>
      <div><span>Очікувана вартість без ПДВ</span><strong>${money.format(expected)} грн</strong></div>
      <div><span>Обсяг бензину</span><strong>${money.format(gasVol)} л</strong></div>
      <div><span>Обсяг дизеля</span><strong>${money.format(dieVol)} л</strong></div>
      <div><span>Формат конкуренції</span><strong>${escapeHtml(modeLabel)}</strong></div>
      <div><span>Бюджет замовника до ринку</span><strong>${displayCmp?`${displayCmp.indicative?'≈ ':''}${displayCmp.gap>=0?'+':''}${num.format(displayCmp.gap)}%`:'—'}</strong></div>
    </div>
    ${displayCmp?`<p class="pdf-market">${displayCmp.indicative?'Орієнтовна оцінка, у рейтингу не враховується. ':''}${escapeHtml(marketGapText(displayCmp.gap,displayCmp.referenceContext))} ${escapeHtml(displayCmp.source||'')}</p>`:`<p class="pdf-market">${escapeHtml(lastExtraction?.market_comparison_note||'Ринкове порівняння недоступне.')}</p>`}
    <h3>Умови, на які варто звернути увагу</h3>
    <p>Документи Prozorro: прочитано ${money.format(lastExtraction?.document_read_summary?.read??0)} із ${money.format(lastExtraction?.document_read_summary?.supported_before_cutoff??0)} відібраних PDF/DOCX.</p>
    <div class="pdf-two"><div><h4>Умови та технічні параметри</h4>${evidenceListHtml([...(lastExtraction?.conditions||[]),...(lastExtraction?.fuel_requirements||[])],'Пунктів із перевіреною цитатою не отримано.')}</div><div><h4>Дослівні витяги з документів</h4>${evidenceListHtml(lastExtraction?.document_highlights,'Підтверджених витягів не отримано.')}</div></div>
    <h3>Економіка ЄВРО5</h3>
    <div class="pdf-grid">
      <div><span>Вартість пального</span><strong>${money.format(fuelCost)} грн</strong></div>
      <div><span>Резерв на ризики</span><strong>${money.format(risk)} грн</strong></div>
      <div><span>Логістика</span><strong>${money.format(logistics)} грн</strong></div>
      <div><span>Повна собівартість</span><strong>${money.format(full)} грн</strong></div>
      <div><span>Дата подання нашої пропозиції</span><strong>${displayRiskDate(selectedRiskPeriod().submission_date)}</strong></div>
      <div><span>Кінець 5 робочих діб</span><strong>${displayRiskDate(selectedRiskPeriod().risk_end_date)}</strong></div>
      <div><span>Мінімальна маржа</span><strong>${pct(value('minMargin'))}</strong></div>
    </div>
    <h3>Картка 1 · Історична конкурентність</h3>
    <table><thead><tr><th>Варіант</th><th>Історична конкурентність</th><th>Знижка</th><th>Пропозиція ЄВРО5, грн</th><th>Прибуток, грн</th><th>Маржа</th><th>Мін. маржа?</th>${supplierHeaders}</tr></thead><tbody>${rows}</tbody></table>
    <p>${escapeHtml(supplierEvidence.note)}</p>
    <p>${escapeHtml(document.getElementById('historicalRecommendation').textContent)}</p>
    <div class="pdf-footnotes"><p><sup>1</sup> ${statisticalModelNote()} Підтверджений продукт: бензин — ${productLabel("gasoline")}; дизель — ${productLabel("diesel")}.</p><p><sup>2</sup> Історична конкурентність — частка контрольних завершених тендерів, де така ціна була б не вищою за ціну переможця; це не ймовірність перемоги.</p><p><sup>3</sup> Для рейтингу маржа рахується за ціною, що відповідає 50% історичної конкурентності. Рейтинг також враховує бюджет до ринку, розмір тендера, підтверджені умови тендера.</p><p><sup>4</sup> Порівняння бюджету й тренд пального використовують стелу / архів Євро5 та історичні дані Minfin / Консалтингової групи А-95. Окремий валютний стрес не застосовується.</p><p><sup>5</sup> Прогноз конкуренції формує рекомендований режим. У розрахунку використовується лише режим, який користувач підтвердив або змінив перед переходом у калькулятор.</p></div>`;
}

exportPdfBtn.addEventListener('click',()=>{
  if(exportPdfBtn.disabled || !calculationIsCurrent) return;
  buildPdfReport();
  document.body.classList.add('printing-report');
  setTimeout(()=>window.print(),60);
});
window.addEventListener('afterprint',()=>document.body.classList.remove('printing-report'));


['reviewExpectedValue','reviewGasolineVolume','reviewDieselVolume','expectedValue','gasolineVolume','dieselVolume']
  .forEach(id=>installGroupedInput(document.getElementById(id)));

['reviewExpectedValue','reviewGasolineVolume','reviewDieselVolume','reviewFuelType']
  .forEach(id=>document.getElementById(id).addEventListener('input',renderReviewMarket));
['reviewSupplyFormat','reviewGasolineSupplyFormat','reviewDieselSupplyFormat']
  .forEach(id=>document.getElementById(id).addEventListener('change',()=>{syncSplitSupplyVisibility();renderReviewMarket();}));

['gasolineCost','dieselCost','logistics'].forEach(id=>installDecimalInput(document.getElementById(id),2));
['riskReserve','minMargin'].forEach(id=>installDecimalInput(document.getElementById(id),1));
['reviewAdvancePaymentPct','reviewBidSecurityPct','reviewPerformanceSecurityPct','reviewMaxRadiusKm']
  .forEach(id=>installDecimalInput(document.getElementById(id),1));

['gasolineCost','dieselCost','logistics','riskReserve','minMargin']
  .forEach(id=>document.getElementById(id).addEventListener('input',invalidateCalculation));

calculateBtn.addEventListener('click',()=>recalc());
exportPdfBtn.disabled=true;





window.onBuyerHistoryLoaded=(data,history)=>{
 if(data!==lastExtraction)return;
 lastExtraction.buyer_profile=history;
 if(confirmedData)confirmedData.buyer_profile=history;
 const wasCurrent=calculationIsCurrent;
 invalidateCalculation();
 if(wasCurrent)document.getElementById('calculateStatus').textContent='Історію конкурентності оновлено. Натисніть «Розрахувати», щоб оновити рейтинг і рекомендацію.';
};



['reviewGasolineProduct','reviewDieselProduct'].forEach(id=>document.getElementById(id).addEventListener('change',()=>{
 confirmedData=null;invalidateCalculation();calculatorSection.classList.add('hidden');
 document.getElementById('reviewState').textContent='ПОТРІБНЕ ПІДТВЕРДЖЕННЯ';
 renderReviewMarket();
}));
