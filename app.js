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

const ids = [
  'fuelType','expectedValue','gasolineVolume','gasolineCost','dieselVolume','dieselCost',
  'competitionMode','logistics','riskReserve','minMargin'
];
const el = Object.fromEntries(ids.map(id=>[id,document.getElementById(id)]));
const money = new Intl.NumberFormat('uk-UA',{maximumFractionDigits:0});
const num = new Intl.NumberFormat('uk-UA',{maximumFractionDigits:2});

function value(id){ return Number(el[id].value || 0); }
function pct(v){ return `${num.format(v)}%`; }

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

  document.getElementById('totalLitres').textContent=money.format(litres);
  document.getElementById('fuelCostTotal').textContent=`${money.format(fuelCost)} грн`;
  document.getElementById('riskAmount').textContent=`${money.format(risk)} грн`;
  document.getElementById('logisticsAmount').textContent=`${money.format(logistics)} грн`;
  document.getElementById('fullCost').textContent=`${money.format(full)} грн`;
  document.getElementById('minBid').textContent=Number.isFinite(minBid)?`${money.format(minBid)} грн`:'—';

  document.getElementById('scopeWarning').classList.toggle('hidden', expected>=1000000);
  const cfg=MODEL[el.competitionMode.value][el.fuelType.value];
  const tbody=document.getElementById('resultsBody'); tbody.innerHTML='';

  let conservativeProfit=null;
  cfg.discounts.forEach((discount,i)=>{
    const bid=expected*(1-discount/100);
    const profit=bid-full;
    const margin=bid>0 ? profit/bid*100 : 0;
    if(i===0) conservativeProfit=profit;
    const delta=profit-conservativeProfit;
    const ok=margin>=value('minMargin');
    const tr=document.createElement('tr');
    tr.innerHTML=`
      <td>${POSITIONS[i][0]}</td>
      <td>${pct(cfg.competitiveness[i])}</td>
      <td>${pct(discount)}</td>
      <td>${money.format(bid)}</td>
      <td>${money.format(profit)}</td>
      <td>${pct(margin)}</td>
      <td class="${ok?'ok':'no'}">${ok?'ТАК':'НІ'}</td>
      <td>${money.format(delta)}</td>`;
    tr.title=POSITIONS[i][1];
    tbody.appendChild(tr);
  });
}
ids.forEach(id=>el[id].addEventListener('input',recalc));
recalc();

const sample=`Замовник вимагає забезпечення тендерної пропозиції у розмірі 3% від очікуваної вартості. Учасник повинен підтвердити виконання щонайменше одного аналогічного договору на постачання пального. Поставка здійснюється протягом 2 робочих днів після заявки. Оплата — протягом 30 календарних днів. Мінімальна кількість АЗС або обмеження радіусу не встановлені.`;
document.getElementById('sampleBtn').addEventListener('click',()=>{document.getElementById('tenderText').value=sample;});

document.getElementById('analyzeBtn').addEventListener('click', async()=>{
  const status=document.getElementById('aiStatus');
  const text=document.getElementById('tenderText').value.trim();
  const tenderUrl=document.getElementById('tenderUrl').value.trim();
  if(!text && !tenderUrl){status.textContent='Додайте текст або URL тендера.';return;}
  const api=(window.EURO5_CONFIG?.apiUrl||'').replace(/\/$/,'');
  if(!api){
    status.textContent='Demo mode: Worker URL ще не налаштований.';
    renderAi({
      competition_friction:'Medium',
      conditions:['3% забезпечення тендерної пропозиції','Аналогічний договір обов’язковий','Поставка протягом 2 робочих днів','Оплата протягом 30 календарних днів'],
      actions:['Підтвердити можливість надати банківську гарантію/забезпечення','Перевірити відповідність аналогічного договору вимогам документації','Підтвердити логістичну спроможність виконати 2-денний строк']
    });
    return;
  }
  status.textContent='Аналізую…';
  try{
    const res=await fetch(`${api}/tender-check`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tenderUrl,text})});
    if(!res.ok) throw new Error(`HTTP ${res.status}`);
    const data=await res.json(); renderAi(data); status.textContent='Готово.';
  }catch(e){status.textContent=`Помилка AI-перевірки: ${e.message}`;}
});

function renderAi(data){
  const box=document.getElementById('aiOutput');box.classList.remove('hidden');
  const badge=document.getElementById('frictionBadge');
  const level=(data.competition_friction||'Medium').toLowerCase();
  badge.className=`friction ${level}`; badge.textContent=(data.competition_friction||'Medium');
  const c=document.getElementById('conditionsList');c.innerHTML='';
  (data.conditions||data.critical_flags||[]).forEach(x=>{const li=document.createElement('li');li.textContent=x;c.appendChild(li)});
  const a=document.getElementById('actionsList');a.innerHTML='';
  (data.actions||[]).forEach(x=>{const li=document.createElement('li');li.textContent=x;a.appendChild(li)});
}
