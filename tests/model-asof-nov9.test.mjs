import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const worker = fs.readFileSync('worker.js','utf8');
const ui = fs.readFileSync('app.js','utf8');
const html = fs.readFileSync('index.html','utf8');

function asset(name) {
  const start = worker.indexOf('const '+name+' = ');
  assert.ok(start>=0, 'Missing model '+name);
  const end = worker.indexOf(';\n',start);
  assert.ok(end>start);
  return JSON.parse(worker.slice(start+('const '+name+' = ').length,end));
}
const refreshed=asset('COMPETITION_REFRESH_NOV9');
const october=asset('COMPETITION_REFRESH');
const at=worker.indexOf('function competitionModelForAnnouncement(data) {');
const end=worker.indexOf('\nfunction sigmoid(',at);
assert.ok(at>0&&end>at);
const resolve=vm.runInNewContext(worker.slice(at,end)+'; competitionModelForAnnouncement', {
  COMPETITION_REFRESH_NOV9:refreshed,
  COMPETITION_REFRESH:october,
  COMPETITION_MODEL:{},COMPETITION_BUYER_HISTORY:{},
  tenderAnnouncementDate:d=>new Date(d.announcement+'T12:00:00Z')
});

test('reconciled 9 November model has a 10 November activation boundary',()=>{
  assert.equal(refreshed.cutoff,'2026-11-09');
  assert.equal(refreshed.version,'2026-11-09-items-v2');
  assert.equal(refreshed.valid_from,'2026-11-10');
  assert.ok(refreshed.model.coef.length===13);
  assert.ok(Object.keys(refreshed.buyers).length>100);
});
test('announced on 9 November continues to use October 22 model (no future leakage)',()=>{
  assert.equal(resolve({announcement:'2026-11-09'}).version,'2026-10-22-items-v2');
});
test('announced on 10 November uses new 9 November model',()=>{
  assert.equal(resolve({announcement:'2026-11-10'}).version,'2026-11-09-items-v2');
});
test('October 22 and earlier keep their original model',()=>{
  assert.equal(resolve({announcement:'2026-10-22'}).version,'2026-10-05');
  assert.equal(resolve({announcement:'2026-10-05'}),null);
});
test('frontend matches new backend model and keeps historical prices',()=>{
  assert.ok(ui.includes("if(version==='2026-11-09-items-v2') return MODEL_REFRESH_NOV9;"));
  assert.ok(ui.includes("if(version==='2026-10-22-items-v2') return MODEL_REFRESH;"));
  assert.ok(html.includes('app.js?v=20261113-contract-scope-v21'));
});
