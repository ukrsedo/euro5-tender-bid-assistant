export const ENKORR_URL = 'https://enkorr.ua/';

const text = html => String(html).replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
  .replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ')
  .replace(/&nbsp;|&#160;/gi, ' ').replace(/\s+/g, ' ').trim();

export function parseEnkorrWholesale(html) {
  const page = text(html);
  const dates = [...page.matchAll(/Ціни\s+в\s+Україні\s*\((\d{2})\.(\d{2})\.(\d{2}|\d{4})\)/gi)];
  if (dates.length !== 1) throw Error('Enkorr: потрібна одна датована таблиця «Ціни в Україні»');
  const [, dd, mm, yy] = dates[0];
  const year = yy.length === 2 ? 2000 + Number(yy) : Number(yy);
  const date = `${year}-${mm}-${dd}`;
  const parsed = new Date(date + 'T00:00:00Z');
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw Error('Enkorr: некоректна дата');

  const afterTitle = String(html).slice(String(html).search(/Ціни\s+в\s+Україні/i));
  const rows = afterTitle.match(/<tr\b[\s\S]*?<\/tr>/gi) || [];
  const prices = {};
  for (const row of rows) {
    const cells = [...row.matchAll(/<t[dh]\b[^>]*>([\s\S]*?)<\/t[dh]>/gi)].map(x => text(x[1]));
    if (cells.length < 3) continue;
    const key = /^A-?95$/i.test(cells[0]) ? 'a95' : /^Diesel$/i.test(cells[0]) ? 'dt' : null;
    if (!key) continue;
    const pair = cells.slice(1, 3).map(x => /^\d{1,3}(?:[.,]\d{1,2})?$/.test(x) ? Number(x.replace(',', '.')) : NaN);
    if (!pair.every(x => Number.isFinite(x) && x > 0 && x < 1000)) throw Error('Enkorr: некоректні ціни ' + key);
    if (prices[key]) throw Error('Enkorr: дубльована позиція ' + key);
    prices[key] = {wholesale: pair[0], retail: pair[1]};
    if (prices.a95 && prices.dt) break;
  }
  if (!prices.a95 || !prices.dt) throw Error('Enkorr: бракує A-95 або Diesel в таблиці');
  return {date, prices_uah_l_with_vat: prices};
}

export function addEnkorrObservation(archive, observation, observed) {
  if (archive.schema_version !== 1 || !Array.isArray(archive.observations)) throw Error('Некоректний архів Enkorr');
  const today = new Intl.DateTimeFormat('en-CA', {timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(observed);
  const age = (Date.parse(today) - Date.parse(observation.date)) / 86400000;
  if (!Number.isInteger(age) || age < 0 || age > 5) throw Error('Enkorr: дата котирування майбутня або застаріла');
  const previous = archive.observations.find(x => x.date === observation.date);
  if (previous) {
    if (JSON.stringify(previous.prices_uah_l_with_vat) !== JSON.stringify(observation.prices_uah_l_with_vat))
      throw Error('Enkorr: ціна за вже збережену дату змінилася; перевірте джерело вручну');
    return false;
  }
  archive.observations.push({date:observation.date, observed_at:observed.toISOString(), source_url:ENKORR_URL, ...observation});
  archive.observations.sort((a,b) => a.date.localeCompare(b.date));
  return true;
}
