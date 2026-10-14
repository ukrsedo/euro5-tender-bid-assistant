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
function benchmarkFor(format,fuel){
  if(!lastExtraction) return null;
  if(format==='retail'){
    return Number(lastExtraction[`market_retail_${fuel}_price_uah_l_without_vat`]);
  }
  if(format==='bulk'){
    const usable=lastExtraction[`market_wholesale_${fuel}_usable`]===true;
    if(!usable) return null;
    return Number(lastExtraction[`market_wholesale_${fuel}_price_uah_l_without_vat`]);
  }
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
  calculationIsCurrent=false;
  recommendationCard.classList.add('hidden');
  resultsCard.classList.add('hidden');
  exportPdfBtn.disabled=true;
  const status=document.getElementById('calculateStatus');
  if(status) status.textContent='Дані змінено. Натисніть «Розрахувати», щоб оновити результат.';
}

function marketComparison(expectedValue, gasolineVolume, dieselVolume, fuelType, supplyData=null){
  if(!lastExtraction) return null;
  const d=supplyData || activeTenderData() || {};
  const format=d.supplyFormat || d.supply_format || 'unknown';
  const gasFormat=format==='split'?(d.gasolineSupplyFormat || d.gasoline_supply_format || 'unknown'):format;
  const dieselFormat=format==='split'?(d.dieselSupplyFormat || d.diesel_supply_format || 'unknown'):format;
  const gasPrice=benchmarkFor(gasFormat,'gasoline');
  const dieselPrice=benchmarkFor(dieselFormat,'diesel');
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
  return {gap,marketValue,format,gasFormat,dieselFormat,source:benchmarkDescription(format,gasFormat,dieselFormat)};
}

function marketGapText(gap){
  const a=Math.abs(gap);
  if(a<0.05) return 'Очікувана вартість практично відповідає ринковій вартості такого обсягу на дату оголошення.';
  return `Очікувана вартість на ${num.format(a)}% ${gap>0?'вища':'нижча'} за ринкову вартість такого обсягу на дату оголошення.`;
}

function renderReviewMarket(){
  const box=document.getElementById('marketComparisonReview');
  const v=reviewValues();
  const cmp=marketComparison(v.expectedValue,v.gasolineVolume,v.dieselVolume,v.fuelType,v);
  if(!cmp){
    box.classList.remove('hidden');
    document.getElementById('marketComparisonReviewValue').textContent='—';
    document.getElementById('marketComparisonReviewText').textContent=lastExtraction?.market_comparison_note || (v.supplyFormat==='unknown'?'Оберіть формат постачання, щоб визначити правильний ринковий орієнтир.':'Ринкове порівняння для вибраного формату недоступне.');
    document.getElementById('marketBenchmarkSource').textContent='';
    return;
  }
  box.classList.remove('hidden');
  document.getElementById('marketComparisonReviewValue').textContent=`${cmp.gap>=0?'+':''}${num.format(cmp.gap)}%`;
  document.getElementById('marketComparisonReviewText').textContent=marketGapText(cmp.gap);
  document.getElementById('marketBenchmarkSource').textContent=cmp.source || '';
}


function renderCompetitionForecast(data){
  const box=document.getElementById('competitionForecast');
  const fc=data?.competition_forecast;
  if(!fc || !Number.isFinite(Number(fc.one_participant_pct)) || !Number.isFinite(Number(fc.two_plus_participants_pct))){
    box.classList.add('hidden');
    return;
  }
  const one=Number(fc.one_participant_pct);
  const two=Number(fc.two_plus_participants_pct);
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

  fillList('conditionsList',data.conditions,'Нетипових або суттєвих умов не виявлено.');
  fillList('actionsList',data.actions,'Додаткових перевірок за завантаженими даними не потрібно.');
  document.getElementById('sourceScope').textContent=data.source_scope || '';
  document.getElementById('reviewValidation').textContent='';
  renderReviewMarket();
  renderCompetitionForecast(data);
}

function fillList(id,items,fallback){
  const ul=document.getElementById(id); ul.innerHTML='';
  const values=Array.isArray(items)&&items.length?items:[fallback];
  values.forEach(x=>{const li=document.createElement('li');li.textContent=x;ul.appendChild(li);});
}

function reviewValues(){
  return {
    fuelType:document.getElementById('reviewFuelType').value,
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
  return '';
}

acceptBtn.addEventListener('click',()=>{
  const v=reviewValues();
  const error=validateReview(v);
  const validation=document.getElementById('reviewValidation');
  if(error){validation.textContent=error;validation.classList.add('error-text');return;}

  confirmedData={
    ...lastExtraction,
    fuel_type:v.fuelType,
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

  validation.textContent='Показники підтверджено і передано в калькулятор.';
  validation.classList.remove('error-text');
  document.getElementById('reviewState').textContent='ПІДТВЕРДЖЕНО';
  document.getElementById('reviewState').classList.add('accepted');

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
  const cmp=marketComparison(v.expectedValue,v.gasolineVolume,v.dieselVolume,v.fuelType,v);
  document.getElementById('budgetVsMarket').textContent=cmp?`${cmp.gap>=0?'+':''}${num.format(cmp.gap)}%`:'—';
  document.getElementById('marketComparisonNote').textContent=cmp?marketGapText(cmp.gap):'Ринкове порівняння недоступне.';
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

  const history=lastExtraction?.price_risk_history;
  const model=history?.ready?Euro5PriceRisk.fit(history.records,history.as_of,fuelCost>0?gasCostAmount/fuelCost:0):{ready:false,reason:history?.reason||'Оновіть дані тендера після підключення статистичного Worker.'};
  const priceRisk=Euro5PriceRisk.assess(model,bid50,full,fuelCost,minMargin);
  const conditions=conditionAdjustment(activeTenderData());
  const base=marginScore+budgetScore+sizeScore+priceRisk.points;
  const total=clamp(base+conditions.points,0,100);

  const cautiousBid=expected*(1-cfg.discounts[0]/100);
  const cautiousMargin=(cautiousBid-full)/cautiousBid*100;
  const stop=cautiousMargin<minMargin;
  const recommendation=recommendationFromScore(total,stop);

  return {
    total:Math.round(total),base:round1(base),conditions,discount50,margin50,marginDelta,
    marginScore:round1(marginScore),budgetScore:round1(budgetScore),sizeScore,
    priceRisk,cautiousMargin,stop,recommendation
  };
}

function marginRatingDescription(rating,minMargin){
  const multiple=rating.margin50/minMargin;
  return `Маржа ${num.format(rating.margin50)}% при вашому мінімумі ${num.format(minMargin)}% — ${num.format(multiple)} від мінімуму. Бал: 20 × ${num.format(multiple)}, з обмеженням до 40 → ${num.format(rating.marginScore)} із 40. Мінімум дає 20 балів, 1,5 мінімуму — 30, подвійний — 40.`;
}
function priceRiskDescription(risk){
  if(!risk.ready)return 'Недостатньо даних: ризик не визначений, нейтральні 7,5 із 15.';
  return `У ${num.format(risk.safe_fraction*100)}% модельних сценаріїв на 5 робочих діб зберігається мінімальна маржа. Запас до її втрати — подорожчання закупівлі на ${num.format(risk.buffer_pct)}%.`;
}
function priceRiskDetails(risk,forPrint=false){
  if(!risk.ready)return '';
  const m=risk.model,change=v=>(v>=0?'+':'')+num.format(v)+'%',date=m.last_observation.split('-').reverse().join('.');
  const section=`<h4>1. Дані та горизонт</h4><p>5 робочих діб — погоджений час цінового ризику. Пальне: <a href="https://index.minfin.com.ua/ua/markets/fuel/" target="_blank" rel="noopener">Minfin / А-95</a>. Валюта: <a href="https://charts.finance.ua/ua/currency/official/-/1/usd" target="_blank" rel="noopener">Finance.ua — офіційний USD/UAH НБУ</a>. Остання спільна дата: ${escapeHtml(date)}. Поточна статистика: ${num.format(m.recent_count)} п’ятиденних вікон за 30 днів; довша історія: ${num.format(m.historical_count)} вікон до цього періоду, максимум за рік. Ціни на майбутні дати не використовуються.</p><h4>2. Тренд та волатильність</h4><table><thead><tr><th>Показник</th><th>Середня зміна за 5 робочих діб</th><th>Волатильність за 5 робочих діб</th></tr></thead><tbody><tr><td>Пальне</td><td>${change(m.fuel.trend_pct)}</td><td>${num.format(m.fuel.volatility_pct)}%</td></tr><tr><td>USD/UAH</td><td>${change(m.usd.trend_pct)}</td><td>${num.format(m.usd.volatility_pct)}%</td></tr></tbody></table><p>Тренд — середнє відсоткових змін; волатильність — стандартне відхилення цих змін. Вищий додатний тренд підвищує ризик подорожчання. Волатильність визначає розкид сценаріїв. Для змішаного тендера пальне зважується за закупівельною вартістю бензину й дизеля.</p><h4>3. Скільки подорожчання витримує маржа</h4><p>Ціна пропозиції: ${money.format(risk.bid)} грн. Мінімальна маржа: ${num.format(risk.min_margin)}%. Максимальні витрати при цій маржі: ${money.format(risk.bid*(1-risk.min_margin/100))} грн. Повна собівартість: ${money.format(risk.total_cost)} грн. Залишок до мінімальної маржі: ${money.format(risk.cost_buffer_uah)} грн.</p><p>Допустиме подорожчання = залишок / закупівельна вартість пального × 100 = ${money.format(risk.cost_buffer_uah)} / ${money.format(risk.fuel_cost)} × 100 = <b>${num.format(risk.buffer_pct)}%</b>. Логістика не множиться на зміну ціни пального.</p><h4>4. Як утворюються сценарії</h4><p>Використано ${num.format(m.historical_count)} історичних пар «пальне + USD/UAH». Їхні відхилення масштабуються під тренд та волатильність. Щоб коротка вибірка не визначала весь прогноз, вага останніх 30 днів становить ${num.format(m.recent_weight*100)}%: ${num.format(m.recent_count)} / (${num.format(m.recent_count)} + ${num.format(m.historical_count)}). Решта — довша історія. Це правило згладжування прототипу.</p><p>У кожній парі береться більше паливного або валютного подорожчання. Вони не додаються, оскільки гривнева ціна пального вже може включати зміну курсу. Валютний сценарій припускає повну валютну чутливість паливної закупівлі. Сценарій проходить перевірку, якщо подорожчання не перевищує ${num.format(risk.buffer_pct)}%.</p><h4>5. Звідки бал</h4><p>Максимум 15 балів — об’єднані попередні ваги пального (10) та валюти (5), щоб не штрафувати один ціновий ризик двічі.</p><p><b>15 × ${num.format(risk.safe_count)} / ${num.format(risk.total_count)} = ${num.format(round1(risk.points))} із 15.</b> ${num.format(risk.safe_fraction*100)}% сценаріїв зберігають мінімальну маржу. Більший запас маржі підвищує бал; сильніший зростаючий тренд знижує його за незмінних інших умов.</p><h4>Межі оцінки</h4><p>Це модельна частка сценаріїв, а не підтверджена ймовірність майбутньої ціни. Історичні вікна перекриваються. Роздрібний ряд є допоміжним ринковим сигналом і не дорівнює фактичній закупівельній чи оптовій ціні Євро5. Перевірка на історії була невеликою; для малих запасів маржі результат не завжди кращий за нейтральну оцінку.</p>`;
  const title=`Як отримано ${num.format(round1(risk.points))} із 15 балів`;
  return forPrint?`<section class="price-risk-details"><h3>${title}</h3>${section}</section>`:`<details class="price-risk-details"><summary>${title}</summary>${section}</details>`;
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
    scoreRow('Ціновий ризик за 5 робочих діб',round1(rating.priceRisk.points),15,priceRiskDescription(rating.priceRisk)),
    scoreRow('Умови тендера',rating.conditions.points,0,condText,'condition-row')
  ].join('')+priceRiskDetails(rating.priceRisk);

  const details=[];
  rating.conditions.reasons.forEach(r=>details.push(`<li><strong>${r.points>0?'+':''}${num.format(r.points)}:</strong> ${escapeHtml(r.text)}</li>`));
  if(rating.stop) details.unshift(`<li><strong>Стоп-фактор:</strong> обережна ставка дає маржу ${num.format(rating.cautiousMargin)}%, що нижче мінімальних ${num.format(minMargin)}%.</li>`);
  warnings.innerHTML=details.length?`<h3>Як умови вплинули на рекомендацію</h3><ul>${details.join('')}</ul>`:'';
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

  const cmp=marketComparison(expected,gasVol,dieVol,el.fuelType.value,activeTenderData());
  const budgetMarket=document.getElementById('budgetVsMarket');
  const marketNote=document.getElementById('marketComparisonNote');
  if(cmp){
    budgetMarket.textContent=`${cmp.gap>=0?'+':''}${num.format(cmp.gap)}%`;
    budgetMarket.className=cmp.gap>=0?'market-positive':'market-negative';
    marketNote.textContent=marketGapText(cmp.gap) + (cmp.source ? ` ${cmp.source}` : '');
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

  const cfg=MODEL[el.competitionMode.value][el.fuelType.value];
  const rating=buildParticipationRating({expected,full,complete,cfg,cmp,minMargin:value('minMargin'),fuelCost,gasCostAmount:gasVol*gasCost});
  renderRecommendation(rating,cmp,expected,value('minMargin'));
  const tbody=document.getElementById('resultsBody'); tbody.innerHTML='';
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
    tr.title=POSITIONS[i][1];
    tbody.appendChild(tr);
  });
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

function listHtml(items,fallback){
  const arr=Array.isArray(items)&&items.length?items:[fallback];
  return `<ul>${arr.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
}



function competitionPdfHtml(){
  const fc=lastExtraction?.competition_forecast;
  if(!fc) return '';
  const confirmedMode=activeTenderData()?.competition_mode==='n1'?'Очікується 1 учасник':'Ринок (два або більше постачальників)';
  return `<section class="pdf-competition"><h3>Очікувана конкуренція</h3><div class="pdf-grid"><div><span>Один учасник</span><strong>${num.format(fc.one_participant_pct)}%</strong></div><div><span>Два або більше</span><strong>${num.format(fc.two_plus_participants_pct)}%</strong></div><div><span>Підтверджений режим</span><strong>${escapeHtml(confirmedMode)}</strong></div></div><p>${escapeHtml(fc.conclusion||'')}</p><p>${escapeHtml(fc.history_note||'')}</p></section>`;
}

function ratingPdfHtml(rating,cmp,expected,minMargin){
  if(!rating) return '';
  const rows=[
    ['Маржа за ціни з 50% історичної конкурентності',`${num.format(rating.marginScore)}/40`,marginRatingDescription(rating,minMargin)],
    ['Бюджет замовника проти ринку',`${num.format(rating.budgetScore)}/20`,cmp?`${cmp.gap>=0?'+':''}${num.format(cmp.gap)}% до ринку.`:'Дані недоступні; нейтральна оцінка.'],
    ['Розмір тендера',`${num.format(rating.sizeScore)}/15`,`${money.format(expected)} грн без ПДВ.`],
    ['Ціновий ризик за 5 робочих діб',`${num.format(round1(rating.priceRisk.points))}/15`,priceRiskDescription(rating.priceRisk)],
    ['Умови тендера',`${rating.conditions.points>0?'+':''}${num.format(rating.conditions.points)}`,'Коригування базового рейтингу.']
  ].map(x=>`<tr><td>${escapeHtml(x[0])}</td><td>${escapeHtml(x[1])}</td><td>${escapeHtml(x[2])}</td></tr>`).join('');
  const cond=rating.conditions.reasons.length?`<ul>${rating.conditions.reasons.map(r=>`<li>${r.points>0?'+':''}${num.format(r.points)}: ${escapeHtml(r.text)}</li>`).join('')}</ul>`:'';
  return `<section class="pdf-recommendation"><div class="pdf-score"><strong>${rating.total}/100</strong><span>${escapeHtml(rating.recommendation.title)}</span></div><p>${escapeHtml(rating.recommendation.summary)}</p><table><thead><tr><th>Фактор</th><th>Бали</th><th>Пояснення</th></tr></thead><tbody>${rows}</tbody></table>${cond}</section>`;
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
  const cfg=MODEL[el.competitionMode.value][el.fuelType.value];
  const rating=buildParticipationRating({expected,full,complete:true,cfg,cmp,minMargin:value('minMargin'),fuelCost,gasCostAmount:gasVol*gasCost});
  const fuelLabel=el.fuelType.options[el.fuelType.selectedIndex].text;
  const modeLabel=el.competitionMode.options[el.competitionMode.selectedIndex].text;
  const rows=cfg.discounts.map((discount,i)=>{
    const bid=expected*(1-discount/100);
    const profit=bid-full;
    const margin=bid>0?profit/bid*100:0;
    const ok=margin>=value('minMargin');
    return `<tr><td>${POSITIONS[i][0]}</td><td>${pct(cfg.competitiveness[i])}</td><td>${pct(discount)}</td><td>${money.format(bid)}</td><td>${money.format(profit)}</td><td>${pct(margin)}</td><td>${ok?'ТАК':'НІ'}</td></tr>`;
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
      <div><span>Бюджет замовника до ринку</span><strong>${cmp?`${cmp.gap>=0?'+':''}${num.format(cmp.gap)}%`:'—'}</strong></div>
    </div>
    ${cmp?`<p class="pdf-market">${escapeHtml(marketGapText(cmp.gap))} ${escapeHtml(cmp.source||'')}</p>`:`<p class="pdf-market">${escapeHtml(lastExtraction?.market_comparison_note||'Ринкове порівняння недоступне.')}</p>`}
    <h3>Умови, на які варто звернути увагу</h3>
    <div class="pdf-two"><div><h4>Нетипові або суттєві умови</h4>${listHtml(lastExtraction?.conditions,'Нетипових або суттєвих умов не виявлено.')}</div><div><h4>Що потрібно зробити перед участю</h4>${listHtml(lastExtraction?.actions,'Додаткових перевірок за завантаженими даними не потрібно.')}</div></div>
    <h3>Економіка ЄВРО5</h3>
    <div class="pdf-grid">
      <div><span>Вартість пального</span><strong>${money.format(fuelCost)} грн</strong></div>
      <div><span>Резерв на ризики</span><strong>${money.format(risk)} грн</strong></div>
      <div><span>Логістика</span><strong>${money.format(logistics)} грн</strong></div>
      <div><span>Повна собівартість</span><strong>${money.format(full)} грн</strong></div>
      <div><span>Мінімальна маржа</span><strong>${pct(value('minMargin'))}</strong></div>
    </div>
    <h3>Варіанти ставки</h3>
    <table><thead><tr><th>Варіант</th><th>Історична конкурентність</th><th>Знижка</th><th>Пропозиція, грн</th><th>Прибуток, грн</th><th>Маржа</th><th>Мін. маржа?</th></tr></thead><tbody>${rows}</tbody></table>
    <div class="pdf-footnotes"><p><sup>1</sup> Розрахунок базується на 11 858 завершених паливних тендерах Prozorro за 2022–05.10.2026.</p><p><sup>2</sup> Історична конкурентність — частка контрольних завершених тендерів, де така ціна була б не вищою за ціну переможця; це не ймовірність перемоги.</p><p><sup>3</sup> Для рейтингу маржа рахується за ціною, що відповідає 50% історичної конкурентності. Рейтинг також враховує бюджет до ринку, розмір тендера, спільний п’ятиденний ціновий ризик пального та USD/UAH і підтверджені умови тендера.</p><p><sup>4</sup> Порівняння бюджету й тренд пального використовують стелу / архів Євро5 та історичні дані Minfin / Консалтингової групи А-95; валютний фактор — офіційний курс НБУ.</p><p><sup>5</sup> Прогноз конкуренції формує рекомендований режим. У розрахунку використовується лише режим, який користувач підтвердив або змінив перед переходом у калькулятор.</p></div>`;
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
