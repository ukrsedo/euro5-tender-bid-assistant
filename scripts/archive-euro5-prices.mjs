import {readFile,writeFile} from 'node:fs/promises';
import {EURO5_RETAIL_URL,parseEuro5Retail,euro5ObservationDate} from './euro5-retail.mjs';
const response=await fetch(EURO5_RETAIL_URL,{headers:{'User-Agent':'Mozilla/5.0 (compatible; EURO5-Price-Archive/1.0)'},signal:AbortSignal.timeout(30000)});
if(!response.ok)throw Error('Євро5 повернув HTTP '+response.status);
const prices= parseEuro5Retail(await response.text()),observed=new Date();
const file='data/euro5-retail-history.json';
let archive;try{archive=JSON.parse(await readFile(file,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e;archive={schema_version:1,observations:[]}}
if(archive.schema_version!==1||!Array.isArray(archive.observations))throw Error('Некоректний архів');
const date=euro5ObservationDate(observed);
if(!archive.observations.some(x=>x.date===date)){
 archive.observations.push({date,observed_at:observed.toISOString(),source_url:EURO5_RETAIL_URL,prices_uah_l_with_vat:prices});
 archive.observations.sort((a,b)=>a.date.localeCompare(b.date));
 await writeFile(file,JSON.stringify(archive,null,2)+'\n');
 console.log('Збережено ціну Євро5, дата спостереження '+date);
}else console.log('Запис на '+date+' уже збережено; історію не перезаписано');
