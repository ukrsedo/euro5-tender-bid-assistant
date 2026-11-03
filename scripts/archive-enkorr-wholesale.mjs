import {readFile,writeFile} from 'node:fs/promises';
import {ENKORR_URL,parseEnkorrWholesale,addEnkorrObservation} from './enkorr-wholesale.mjs';

const response = await fetch(ENKORR_URL, {headers:{'Accept':'text/html,application/xhtml+xml','User-Agent':'Mozilla/5.0 (compatible; EURO5-Price-Archive/1.0)'},signal:AbortSignal.timeout(30000)});
if (!response.ok) throw Error('Enkorr повернув HTTP ' + response.status);
const observation = parseEnkorrWholesale(await response.text());
const file = 'data/enkorr-wholesale-history.json';
const archive = JSON.parse(await readFile(file, 'utf8'));
const observed = new Date();
if (addEnkorrObservation(archive, observation, observed)) {
  await writeFile(file, JSON.stringify(archive, null, 2) + '\n');
  console.log(`Збережено Enkorr за ${observation.date}, отримано ${observed.toISOString()}`);
} else console.log(`Enkorr за ${observation.date} вже збережено`);
