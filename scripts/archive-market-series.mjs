import {readFile,writeFile} from 'node:fs/promises';
const file='data/market-series.json',old=JSON.parse(await readFile(file,'utf8'));
if(old.schema_version!==1||!Array.isArray(old.records))throw Error('Некоректний ряд ринку');
const now=new Date(),iso=d=>d.toISOString().slice(0,10),latest=iso(now),earliest=iso(new Date(now.getTime()-400*86400000));
const months=[latest.slice(0,7),iso(new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-1,1))).slice(0,7)];
const records=new Map(old.records.map(r=>[r.date,{...r}]));
const text=s=>s.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ');
async function load(url){const r=await fetch(url,{headers:{'User-Agent':'Mozilla/5.0 (compatible; EURO5-Market-Archive/1.0)'},signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error('Джерело повернуло '+r.status+': '+url);return r.text()}
for(const fuel of ['a95','dt'])for(const month of months){
 const html=await load(`https://index.minfin.com.ua/ua/markets/fuel/${fuel}/${month}/`);let count=0;
 for(const row of html.match(/<tr\b[\s\S]*?<\/tr>/gi)||[]){const value=text(row),match=value.match(/(\d{2}\.\d{2}\.\d{4})/);if(!match)continue;const d=match[0].split('.').reverse().join('-'),p=value.slice(match.index+match[0].length).match(/(\d{1,3}[,.]\d{2})/);if(!p||d<earliest||d>latest)continue;const price=Number(p[0].replace(',','.'));if(!(price>0))continue;const item=records.get(d)||{date:d};item[fuel]=price;records.set(d,item);count++}
 if(!count)throw Error('Minfin: не знайдено ряд ціни '+fuel+' за '+month);
}
const finance=JSON.parse(await load('https://charts.finance.ua/ua/currency/data-archive?for=official&source=1&indicator=usd'));let currency=0;
if(!Array.isArray(finance))throw Error('Finance.ua: некоректний архів');
for(const entry of finance){if(!Array.isArray(entry)||!/^\d{2}\/\d{2}\/\d{4}$/.test(entry[0]))continue;const [month,day,year]=entry[0].split('/'),d=`${year}-${month}-${day}`,value=Number(entry[1]);if(d<earliest||d>latest||!(value>0))continue;const item=records.get(d)||{date:d};item.usd=value;records.set(d,item);currency++}
if(!currency)throw Error('Finance.ua: немає датованих курсів');
const result=[...records.values()].filter(r=>r.date>=earliest&&r.date<=latest&&[r.a95,r.dt,r.usd].every(v=>Number.isFinite(v)&&v>0)).sort((a,b)=>a.date.localeCompare(b.date));
if(result.length<100)throw Error('Недостатня історія ринку');
await writeFile(file,JSON.stringify({...old,updated_at:now.toISOString(),records:result},null,2)+'\n');console.log(`Збережено ${result.length} спільних дат, остання ${result.at(-1).date}`);
