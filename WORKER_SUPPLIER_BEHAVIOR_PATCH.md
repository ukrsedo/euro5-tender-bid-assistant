# Worker patch: supplier commercial behavior

Цей патч навмисно не застосований до worker.js. Додайте зміни через редактор Cloudflare, після перевірки.

## Що він додає

- Зберігає для кожного підтвердженого історичного тендера назву та код постачальника, початкову і фінальну ціну пропозиції, результат та ID лота.
- Будує зведення за постачальниками лише з історії картки, яку вже перевірено за замовником, 12-місячним періодом і датою відсікання.
- Оцінює повторювану комерційну поведінку за даними про ціну: схильність знижувати пропозицію, середній відсоток зниження, участі та перемоги.
- Повертає `supplier_behavior` у відповіді `POST /buyer-history`, яку вже вміє відобразити frontend-гілка.

## Обмеження даних

Prozorro може не повертати історичні ставки або журнал версій. Такий тендер не включається в комерційну оцінку. Не підставляйте поточні дані тендера, якщо його `dateModified` пізніша за дату відсікання. При недостатній кількості підтверджених цін картка має показувати «Недостатньо зіставних даних», а не вигадувати прогноз.

## Код для Worker

Додайте ці функції перед `verifyBuyerRows`:

```js
function supplierCode(entity) {
  const code = String(entity?.identifier?.id || entity?.identifier?.scheme || "").match(/\d{8,10}/)?.[0];
  return code || null;
}

function supplierName(entity) {
  return String(entity?.name || entity?.identifier?.legalName || "").trim() || "Постачальник без підтвердженої назви";
}

function supplierBidSnapshot(data, expectedBuyerCode, tenderId, cutoffDay) {
  const lots = Array.isArray(data?.lots) ? data.lots : [];
  const bids = Array.isArray(data?.bids) ? data.bids : [];
  const awards = Array.isArray(data?.awards) ? data.awards : [];
  const lotById = new Map(lots.map(lot => [lot.id, lot]));
  const awardByBid = new Map();
  for (const award of awards) {
    if (!["active", "pending"].includes(award.status)) continue;
    for (const bidId of award.relatedBid || []) awardByBid.set(bidId, award);
  }
  const modifiedDay = String(data?.dateModified || "").slice(0, 10);
  if (data?.tenderID !== tenderId || buyerCode(data) !== expectedBuyerCode || !/^\d{4}-\d{2}-\d{2}$/.test(modifiedDay) || modifiedDay > cutoffDay) {
    return [];
  }
  return bids.flatMap(bid => {
    const code = supplierCode(bid.tenderers?.[0]);
    const name = supplierName(bid.tenderers?.[0]);
    if (!code || !Array.isArray(bid.requirementResponses) && !Array.isArray(bid.lotValues)) return [];
    const related = Array.isArray(bid.relatedLots) ? bid.relatedLots : [];
    const award = awardByBid.get(bid.id);
    const awardValue = Number(award?.value?.amount);
    const bidValue = Number(bid.value?.amount);
    const values = Number.isFinite(bidValue) ? bidValue : Number.isFinite(awardValue) ? awardValue : null;
    return (related.length ? related : [null]).map(lotId => ({
      tender_id: tenderId,
      lot_id: lotId,
      lot_title: lotById.get(lotId)?.title || null,
      supplier_code: code,
      supplier_name: name,
      bid_value: values,
      award_value: Number.isFinite(awardValue) ? awardValue : null,
      status: bid.status || null,
      won: Boolean(award && award.relatedBid?.includes(bid.id)),
      modified_day: modifiedDay
    }));
  });
}

function summarizeSupplierBehavior(entries) {
  const bySupplier = new Map();
  for (const row of entries) {
    if (!row.supplier_code || !row.tender_id || !row.lot_id) continue;
    const key = row.supplier_code;
    if (!bySupplier.has(key)) bySupplier.set(key, { code:key, name:row.supplier_name, tenders:new Set(), wins:new Set(), bidValues:[], reductions:[], records:[] });
    const s = bySupplier.get(key);
    s.tenders.add(row.tender_id);
    if (row.won) s.wins.add(row.tender_id);
    if (Number.isFinite(row.bid_value) && row.bid_value > 0) s.bidValues.push({ tender_id:row.tender_id, lot_id:row.lot_id, value:row.bid_value });
    s.records.push(row);
  }
  const suppliers = [...bySupplier.values()].map(s => {
    const grouped = new Map();
    for (const x of s.bidValues) {
      const k = x.tender_id + "|" + x.lot_id;
      const previous = grouped.get(k);
      if (!previous || x.value < previous.value) grouped.set(k, x);
    }
    const prices = [...grouped.values()];
    const explicitReductions = s.records
      .map(x => Number.isFinite(x.bid_value) && Number.isFinite(x.award_value) && x.bid_value > 0 && x.award_value <= x.bid_value
        ? (x.bid_value - x.award_value) / x.bid_value * 100 : null)
      .filter(Number.isFinite);
    const avgReduction = explicitReductions.length ? explicitReductions.reduce((a,b)=>a+b,0)/explicitReductions.length : null;
    const label = explicitReductions.length >= 3
      ? (avgReduction >= 3 ? "Знижував ціну під час торгів" : "Знижував ціну незначно або не знижував")
      : "Недостатньо зіставних даних про ціну";
    const forecast = explicitReductions.length >= 3
      ? (avgReduction >= 3 ? "Імовірне активне зниження" : "Імовірне обмежене зниження")
      : "Не оцінено";
    return {
      name:s.name, code:s.code, bids:s.tenders.size, tenders:s.tenders.size, wins:s.wins.size,
      avg_reduction_pct:avgReduction,
      behavior_label:label,
      behavior_basis:explicitReductions.length
        ? "Середнє фактичне зниження за " + explicitReductions.length + " підтвердженими ціновими спостереженнями."
        : "У Prozorro немає достатніх підтверджених початкових і фінальних цін.",
      forecast_label:forecast,
      forecast_reason:explicitReductions.length >= 3
        ? "Повторювана історична поведінка; це не прогноз конкретної ціни й не гарантія участі."
        : "Потрібно щонайменше 3 підтверджені порівнювані спостереження.",
      observation_count:explicitReductions.length
    };
  }).sort((a,b)=>b.tenders-a.tenders || b.wins-a.wins || a.code.localeCompare(b.code));
  return {
    suppliers,
    coverage_note:"Постачальники з підтвердженими пропозиціями в паливних тендерах цього замовника за 12 місяців до оголошення. Неопрацьовані або пізніше змінені записи не включено."
  };
}
```

## Точні точки інтеграції

У `verifyBuyerRows` знайдіть рядок `const states=new Map(),proofs=new Map();` та додайте поруч:

```js
const bidEvidence = new Map();
```

У блоці, де вже отримано `payload` і перевірено `data.tenderID`, замовника та дату `dateModified`, до запису `proofs.set(id,e)` додайте:

```js
bidEvidence.set(id, supplierBidSnapshot(data, code, id, period.end));
```

Після рядка `const history=summarizeBuyerHistory(eligible,code,period);` додайте:

```js
const supplierRows = [...proofs.keys()].flatMap(id => bidEvidence.get(id) || []);
history.supplier_behavior = summarizeSupplierBehavior(supplierRows);
```

Важливо: наявні збережені докази в `BUYER_VERIFIED_SNAPSHOTS` містять лише переможця та число учасників, без пропозицій. Вони залишаться у загальній статистиці, але не дадуть цінового прогнозу. Для них картка правильно покаже недостатність цінових даних.

Перед застосуванням треба звірити структуру об'єктів `bids` і `awards` у публічному Prozorro API на реальному тендері: назви полів ціни/статусу можуть відрізнятися для конкретних процедур. Патч не додає аналіз тендерних файлів; цей потік має окремо витягати файли й цитовані вимоги, і його ще не реалізовано в цій гілці.
