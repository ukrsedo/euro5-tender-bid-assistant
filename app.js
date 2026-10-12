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
let lastExtraction=null;

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
function parseGroupedNumber(value){
  const cleaned=String(value??'').replace(/[\s\u00A0\u202F]/g,'').replace(',', '.').replace(/[^0-9.\-]/g,'');
  const n=Number(cleaned);
  return Number.isFinite(n)?n:0;
}
function formatGrouped(value){
  const n=typeof value==='number'?value:parseGroupedNumber(value);
  return Number.isFinite(n)&&String(value??'').trim()!=='' ? grouped.format(n) : '';
}
function setGroupedNumber(input,value){ input.value=Number.isFinite(Number(value)) ? formatGrouped(Number(value)) : ''; }
function installGroupedInput(input){
  input.addEventListener('blur',()=>{ if(input.value.trim()!=='') input.value=formatGrouped(input.value); });
}

function marketComparison(expectedValue, gasolineVolume, dieselVolume, fuelType){
  if(!lastExtraction) return null;
  const gasPrice=Number(lastExtraction.market_gasoline_price_uah_l_without_vat);
  const dieselPrice=Number(lastExtraction.market_diesel_price_uah_l_without_vat);
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
  return { gap, marketValue };
}

function marketGapText(gap){
  const a=Math.abs(gap);
  if(a<0.05) return 'Очікувана вартість практично відповідає ринковій вартості такого обсягу на дату оголошення.';
  return `Очікувана вартість на ${num.format(a)}% ${gap>0?'вища':'нижча'} за ринкову вартість такого обсягу на дату оголошення.`;
}

function renderReviewMarket(){
  const box=document.getElementById('marketComparisonReview');
  const v=reviewValues();
  const cmp=marketComparison(v.expectedValue,v.gasolineVolume,v.dieselVolume,v.fuelType);
  if(!cmp){
    box.classList.add('hidden');
    return;
  }
  box.classList.remove('hidden');
  document.getElementById('marketComparisonReviewValue').textContent=`${cmp.gap>=0?'+':''}${num.format(cmp.gap)}%`;
  document.getElementById('marketComparisonReviewText').textContent=marketGapText(cmp.gap);
}


analyzeBtn.addEventListener('click', async()=>{
  const status=document.getElementById('aiStatus');
  const tenderId=tenderIdInput.value.trim();
  if(!tenderId){status.textContent='Введіть ID тендера Prozorro.';return;}

  const api=(window.EURO5_CONFIG?.apiUrl||'').replace(/\/$/,'');
  if(!api){status.textContent='Адресу сервера не налаштовано у config.js.';return;}

  analyzeBtn.disabled=true;
  status.textContent='Завантажую дані з Prozorro та перевіряю умови тендера…';
  reviewSection.classList.add('hidden');
  calculatorSection.classList.add('hidden');

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
  setGroupedNumber(document.getElementById('reviewExpectedValue'),data.expected_value_uah);
  setGroupedNumber(document.getElementById('reviewGasolineVolume'),data.gasoline_volume_l);
  setGroupedNumber(document.getElementById('reviewDieselVolume'),data.diesel_volume_l);

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
    dieselVolume:parseGroupedNumber(document.getElementById('reviewDieselVolume').value)
  };
}

function validateReview(v){
  if(!['gasoline','diesel','mixed'].includes(v.fuelType)) return 'Оберіть тип пального.';
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
  validation.textContent='Дані підтверджено.'; validation.classList.remove('error-text');
  document.getElementById('reviewState').textContent='ПІДТВЕРДЖЕНО';
  document.getElementById('reviewState').classList.add('accepted');

  document.getElementById('fuelType').value=v.fuelType;
  setGroupedNumber(document.getElementById('expectedValue'),v.expectedValue);
  setGroupedNumber(document.getElementById('gasolineVolume'),v.gasolineVolume);
  setGroupedNumber(document.getElementById('dieselVolume'),v.dieselVolume);

  calculatorSection.classList.remove('hidden');
  recalc();
  calculatorSection.scrollIntoView({behavior:'smooth',block:'start'});
});

const ids = [
  'fuelType','expectedValue','gasolineVolume','gasolineCost','dieselVolume','dieselCost',
  'competitionMode','logistics','riskReserve','minMargin'
];
const el = Object.fromEntries(ids.map(id=>[id,document.getElementById(id)]));
function value(id){ return ['expectedValue','gasolineVolume','dieselVolume'].includes(id) ? parseGroupedNumber(el[id].value) : Number(el[id].value || 0); }

function costsComplete(){
  const fuel=el.fuelType.value;
  if(fuel==='gasoline') return value('gasolineVolume')>0 && value('gasolineCost')>0;
  if(fuel==='diesel') return value('dieselVolume')>0 && value('dieselCost')>0;
  return value('gasolineVolume')>0 && value('gasolineCost')>0 && value('dieselVolume')>0 && value('dieselCost')>0;
}

function recalc(){
  const expected=value('expectedValue');
  const gasVol=value('gasolineVolume'), gasCost=value('gasolineCost');
  const dieVol=value('dieselVolume'), dieCost=value('dieselCost');
  const litres=gasVol+dieVol;
  const fuelCost=gasVol*gasCost+dieVol*dieCost;
  const risk=fuelCost*(value('riskReserve')/100);
  const logistics=litres*value('logistics');
  const full=fuelCost+risk+logistics;
  const mm=value('minMargin')/100;
  const minBid=mm>=1 ? NaN : full/(1-mm);
  const complete=costsComplete();

  document.getElementById('totalLitres').textContent=money.format(litres);
  document.getElementById('fuelCostTotal').textContent=complete?`${money.format(fuelCost)} грн`:'—';
  document.getElementById('riskAmount').textContent=complete?`${money.format(risk)} грн`:'—';
  document.getElementById('logisticsAmount').textContent=`${money.format(logistics)} грн`;
  document.getElementById('fullCost').textContent=complete?`${money.format(full)} грн`:'—';
  document.getElementById('minBid').textContent=complete&&Number.isFinite(minBid)?`${money.format(minBid)} грн`:'—';

  const cmp=marketComparison(expected,gasVol,dieVol,el.fuelType.value);
  const budgetMarket=document.getElementById('budgetVsMarket');
  const marketNote=document.getElementById('marketComparisonNote');
  if(cmp){
    budgetMarket.textContent=`${cmp.gap>=0?'+':''}${num.format(cmp.gap)}%`;
    budgetMarket.className=cmp.gap>=0?'market-positive':'market-negative';
    marketNote.textContent=marketGapText(cmp.gap) + (lastExtraction?.market_reference_date ? ` Ринкова дата: ${lastExtraction.market_reference_date}.` : '');
  }else{
    budgetMarket.textContent='—';
    budgetMarket.className='';
    marketNote.textContent=lastExtraction?.market_comparison_note || 'Ринкове порівняння недоступне для цього набору даних.';
  }

  document.getElementById('scopeWarning').classList.toggle('hidden', expected>=1000000);
  document.getElementById('costWarning').classList.toggle('hidden',complete);
  exportPdfBtn.disabled=!complete || expected<1000000;

  const cfg=MODEL[el.competitionMode.value][el.fuelType.value];
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
}

function escapeHtml(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function listHtml(items,fallback){
  const arr=Array.isArray(items)&&items.length?items:[fallback];
  return `<ul>${arr.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
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
  const cmp=marketComparison(expected,gasVol,dieVol,el.fuelType.value);
  const cfg=MODEL[el.competitionMode.value][el.fuelType.value];
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
    <div class="pdf-grid">
      <div><span>Тип пального</span><strong>${escapeHtml(fuelLabel)}</strong></div>
      <div><span>Очікувана вартість без ПДВ</span><strong>${money.format(expected)} грн</strong></div>
      <div><span>Обсяг бензину</span><strong>${money.format(gasVol)} л</strong></div>
      <div><span>Обсяг дизеля</span><strong>${money.format(dieVol)} л</strong></div>
      <div><span>Формат конкуренції</span><strong>${escapeHtml(modeLabel)}</strong></div>
      <div><span>Бюджет замовника до ринку</span><strong>${cmp?`${cmp.gap>=0?'+':''}${num.format(cmp.gap)}%`:'—'}</strong></div>
    </div>
    ${cmp?`<p class="pdf-market">${escapeHtml(marketGapText(cmp.gap))}${lastExtraction?.market_reference_date?` Ринкова дата: ${escapeHtml(lastExtraction.market_reference_date)}.`:''}</p>`:''}
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
    <div class="pdf-footnotes"><p><sup>1</sup> Розрахунок базується на 11 858 завершених паливних тендерах Prozorro за 2022–05.10.2026.</p><p><sup>2</sup> Історична конкурентність — частка контрольних завершених тендерів, де така ціна була б не вищою за ціну переможця; це не ймовірність перемоги.</p><p><sup>3</sup> Порівняння бюджету з ринком використовує середні ціни Minfin / Консалтингової групи А-95, приведені до бази без ПДВ; це не собівартість ЄВРО5.</p></div>`;
}

exportPdfBtn.addEventListener('click',()=>{
  if(exportPdfBtn.disabled) return;
  buildPdfReport();
  document.body.classList.add('printing-report');
  setTimeout(()=>window.print(),60);
});
window.addEventListener('afterprint',()=>document.body.classList.remove('printing-report'));


['reviewExpectedValue','reviewGasolineVolume','reviewDieselVolume','expectedValue','gasolineVolume','dieselVolume']
  .forEach(id=>installGroupedInput(document.getElementById(id)));

['reviewExpectedValue','reviewGasolineVolume','reviewDieselVolume','reviewFuelType']
  .forEach(id=>document.getElementById(id).addEventListener('input',renderReviewMarket));

ids.forEach(id=>el[id].addEventListener('input',recalc));
exportPdfBtn.disabled=true;
