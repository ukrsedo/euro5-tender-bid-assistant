import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const source=fs.readFileSync(new URL('../worker.js',import.meta.url),'utf8');
const start=source.indexOf('function buyerProcedureGroup(name){');
const end=source.indexOf('\nfunction summarizeBuyerHistory',start);
assert.ok(start>=0&&end>start,'buyerProcedureGroup must be present in worker.js');
const classify=new Function(source.slice(start,end)+'; return buyerProcedureGroup;')();

test('simplified procurement is included in competitive procedure history',()=>{
 assert.equal(classify('Спрощена процедура закупівлі'),'open');
 assert.equal(classify('  СПРОЩЕНА\u00a0ПРОЦЕДУРА\u202fЗАКУПІВЛІ  '),'open');
});

test('other procedure groups remain distinct',()=>{
 assert.equal(classify('Відкриті торги з особливостями'),'open');
 assert.equal(classify('Запит ціни пропозиції'),'catalog');
 assert.equal(classify('Звіт про договір без використання електронної системи'),'direct');
 assert.equal(classify('Процедура, що потребує перевірки'),'other');
});

test('history cache requires its current schema marker',()=>{
 assert.match(source,/buyer_history_cache_schema===7/);
 assert.match(source,/buyer-history-cache\/v12\//);
});
