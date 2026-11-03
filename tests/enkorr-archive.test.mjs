import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {parseEnkorrWholesale,addEnkorrObservation} from '../scripts/enkorr-wholesale.mjs';

const sample = `<h2>Ціни в Україні (02.11.26)</h2><table><tr><th></th><th>Опт, грн/л</th><th>Роздріб, грн/л</th></tr><tr><td>A-95</td><td>87,68</td><td>90.08</td></tr><tr><td>Diesel</td><td>101.78</td><td>104.5</td></tr></table>`;
test('dated wholesale table is parsed and never relabelled as collection day',()=>{
  const row=parseEnkorrWholesale(sample);
  assert.equal(row.date,'2026-11-02');
  assert.deepEqual(row.prices_uah_l_with_vat.a95,{wholesale:87.68,retail:90.08});
  const archive={schema_version:1,observations:[]};
  assert.equal(addEnkorrObservation(archive,row,new Date('2026-11-03T08:00:00Z')),true);
  assert.equal(archive.observations[0].date,'2026-11-02');
  assert.equal(addEnkorrObservation(archive,row,new Date('2026-11-03T12:00:00Z')),false);
});
test('malformed rows and historical price revisions fail closed',()=>{
  assert.throws(()=>parseEnkorrWholesale(sample.replace('101.78','—')));
  const row=parseEnkorrWholesale(sample),archive={schema_version:1,observations:[]};
  addEnkorrObservation(archive,row,new Date('2026-11-03T08:00:00Z'));
  assert.throws(()=>addEnkorrObservation(archive,{...row,prices_uah_l_with_vat:{...row.prices_uah_l_with_vat,a95:{wholesale:99,retail:90.08}}},new Date('2026-11-03T12:00:00Z')));
});

const source=fs.readFileSync('worker.js','utf8');
const start=source.indexOf('const ENKORR_ARCHIVE_URL =');
const end=source.indexOf('function percentDifference(',start);
const archiveCode=source.slice(start,end);
const age=(t,p)=>{
  const diff=(Date.parse(t.toISOString().slice(0,10))-Date.parse(p.toISOString().slice(0,10)))/86400000;
  return diff < 0 ? null : diff;
};
const archive={schema_version:1,source_url:'https://enkorr.ua/',observations:[
  {date:'2026-10-29',observed_at:'2026-10-29T15:00:00Z',source_url:'https://enkorr.ua/',prices_uah_l_with_vat:{a95:{wholesale:80,retail:82},dt:{wholesale:95,retail:98}}},
  {date:'2026-11-02',observed_at:'2026-11-02T12:00:00Z',source_url:'https://enkorr.ua/',prices_uah_l_with_vat:{a95:{wholesale:87,retail:90},dt:{wholesale:101,retail:104}}}
]};
test('Worker archive lookup selects only dated quotes on or before tender',async()=>{
  const ctx={fetch:async()=>({ok:true,json:async()=>archive}),AbortSignal,Date,
    euro5ObservationDate:d=>d ? d.toISOString().slice(0,10) : '2026-11-03',wholesaleBenchmarkAge:age};
  const {fetchArchivedEnkorrPrices}=vm.runInNewContext(archiveCode+';({fetchArchivedEnkorrPrices})',ctx);
  const quote=await fetchArchivedEnkorrPrices(new Date('2026-10-29T12:00:00Z'));
  assert.equal(quote.date.toISOString().slice(0,10),'2026-10-29');
  assert.equal(quote.gasoline.wholesale,80);
  assert.equal(await fetchArchivedEnkorrPrices(new Date('2026-10-28T12:00:00Z')),null);
});
