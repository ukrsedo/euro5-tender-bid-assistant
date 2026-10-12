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
    if(days<=10) p=2;
    else if(days<=30) p=0;
    else if(days<=45) p=-1;
    else if(days<=60) p=-2;
    else p=-4;
    points+=p;
    if(p!==0) reasons.push({points:p,text:`Післяплата ${money.format(days)} днів ${p>0?'краща':'гірша'} за стандартні 30 днів.`});
    else reasons.push({points:0,text:`Післяплата ${money.format(days)} днів — стандартна умова, без коригування рейтингу.`});
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

function buildParticipationRating({expected,full,complete,cfg,cmp,minMargin}){
  if(!complete || !(expected>=1000000) || !(full>0)) return null;

  const discount50=discountAtCompetitiveness(cfg,50);
  const bid50=expected*(1-discount50/100);
  const margin50=(bid50-full)/bid50*100;
  const marginDelta=margin50-minMargin;
  const marginScore=clamp(20+10*marginDelta,0,40);

  const budgetScore=cmp?clamp(10+cmp.gap,0,20):10;
  const sizeScore=tenderSizeScore(expected);

  const fuelTrend=Number(lastExtraction?.fuel_market_trend_30d_pct);
  const fuelTrendKnown=Number.isFinite(fuelTrend);
  const fuelTrendScore=fuelTrendKnown?clamp(5-fuelTrend,0,10):5;

  const fxTrend=Number(lastExtraction?.usd_uah_change_30d_pct);
  const fxKnown=Number.isFinite(fxTrend);
  const fxScore=fxKnown?clamp(2.5-0.5*fxTrend,0,5):2.5;

  const conditions=conditionAdjustment(lastExtraction);
  const base=marginScore+budgetScore+sizeScore+fuelTrendScore+fxScore;
  const total=clamp(base+conditions.points,0,100);

  const cautiousBid=expected*(1-cfg.discounts[0]/100);
  const cautiousMargin=(cautiousBid-full)/cautiousBid*100;
  const stop=cautiousMargin<minMargin;
  const recommendation=recommendationFromScore(total,stop);

  return {
    total:Math.round(total),base:round1(base),conditions,discount50,margin50,marginDelta,
    marginScore:round1(marginScore),budgetScore:round1(budgetScore),sizeScore,
    fuelTrendScore:round1(fuelTrendScore),fuelTrend:fuelTrendKnown?fuelTrend:null,
    fxScore:round1(fxScore),fxTrend:fxKnown?fxTrend:null,cautiousMargin,stop,recommendation
  };
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
  const fuelText=rating.fuelTrend===null
    ? '30-денний тренд пального недоступний; використано нейтральні 5/10 балів.'
    : `Ринкова вартість відповідного обсягу за 30 днів ${rating.fuelTrend<0?'знизилась':'зросла'} на ${num.format(Math.abs(rating.fuelTrend))}%.`;
  const fxText=rating.fxTrend===null
    ? '30-денна зміна USD/UAH недоступна; використано нейтральні 2,5/5 бала.'
    : `USD/UAH за 30 днів ${rating.fxTrend<0?'знизився':'зріс'} на ${num.format(Math.abs(rating.fxTrend))}%.`;
  const condText=rating.conditions.points===0
    ? 'Підтверджені умови тендера не змінюють рейтинг.'
    : `Умови тендера коригують рейтинг на ${rating.conditions.points>0?'+':''}${num.format(rating.conditions.points)} балів.`;

  breakdown.innerHTML=[
    scoreRow('Маржа за ціни з 50% історичної конкурентності',rating.marginScore,40,`Маржа ${num.format(rating.margin50)}% при мінімально допустимих ${num.format(minMargin)}%. Різниця: ${rating.marginDelta>=0?'+':''}${num.format(rating.marginDelta)} п.п.`),
    scoreRow('Бюджет замовника проти ринку',rating.budgetScore,20,budgetText),
    scoreRow('Розмір тендера',rating.sizeScore,15,`Очікувана вартість: ${money.format(expected)} грн без ПДВ.`),
    scoreRow('Тренд ціни пального за 30 днів',rating.fuelTrendScore,10,fuelText),
    scoreRow('Зміна USD/UAH за 30 днів',rating.fxScore,5,fxText),
    scoreRow('Умови тендера',rating.conditions.points,0,condText,'condition-row')
  ].join('');

  const details=[];
  rating.conditions.reasons.forEach(r=>details.push(`<li><strong>${r.points>0?'+':''}${num.format(r.points)}:</strong> ${escapeHtml(r.text)}</li>`));
  if(rating.stop) details.unshift(`<li><strong>Стоп-фактор:</strong> обережна ставка дає маржу ${num.format(rating.cautiousMargin)}%, що нижче мінімальних ${num.format(minMargin)}%.</li>`);
  warnings.innerHTML=details.length?`<h3>Як умови вплинули на рекомендацію</h3><ul>${details.join('')}</ul>`:'';
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
  const rating=buildParticipationRating({expected,full,complete,cfg,cmp,minMargin:value('minMargin')});
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
}

function escapeHtml(value){
  return String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
}

function listHtml(items,fallback){
  const arr=Array.isArray(items)&&items.length?items:[fallback];
  return `<ul>${arr.map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
}


function ratingPdfHtml(rating,cmp,expected,minMargin){
  if(!rating) return '';
  const rows=[
    ['Маржа за ціни з 50% історичної конкурентності',`${num.format(rating.marginScore)}/40`,`Маржа ${num.format(rating.margin50)}% при мінімумі ${num.format(minMargin)}%.`],
    ['Бюджет замовника проти ринку',`${num.format(rating.budgetScore)}/20`,cmp?`${cmp.gap>=0?'+':''}${num.format(cmp.gap)}% до ринку.`:'Дані недоступні; нейтральна оцінка.'],
    ['Розмір тендера',`${num.format(rating.sizeScore)}/15`,`${money.format(expected)} грн без ПДВ.`],
    ['Тренд ціни пального за 30 днів',`${num.format(rating.fuelTrendScore)}/10`,rating.fuelTrend===null?'Дані недоступні; нейтральна оцінка.':`${rating.fuelTrend>=0?'+':''}${num.format(rating.fuelTrend)}%.`],
    ['Зміна USD/UAH за 30 днів',`${num.format(rating.fxScore)}/5`,rating.fxTrend===null?'Дані недоступні; нейтральна оцінка.':`${rating.fxTrend>=0?'+':''}${num.format(rating.fxTrend)}%.`],
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
  const cmp=marketComparison(expected,gasVol,dieVol,el.fuelType.value);
  const cfg=MODEL[el.competitionMode.value][el.fuelType.value];
  const rating=buildParticipationRating({expected,full,complete:true,cfg,cmp,minMargin:value('minMargin')});
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
    ${ratingPdfHtml(rating,cmp,expected,value('minMargin'))}
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
    <div class="pdf-footnotes"><p><sup>1</sup> Розрахунок базується на 11 858 завершених паливних тендерах Prozorro за 2022–05.10.2026.</p><p><sup>2</sup> Історична конкурентність — частка контрольних завершених тендерів, де така ціна була б не вищою за ціну переможця; це не ймовірність перемоги.</p><p><sup>3</sup> Для рейтингу маржа рахується за ціною, що відповідає 50% історичної конкурентності. Рейтинг також враховує бюджет до ринку, розмір тендера, 30-денний тренд пального, USD/UAH та підтверджені умови тендера.</p><p><sup>4</sup> Порівняння бюджету й тренд пального використовують дані Minfin / Консалтингової групи А-95; валютний фактор — офіційний курс НБУ.</p></div>`;
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
