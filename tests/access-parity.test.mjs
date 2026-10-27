import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=name=>readFileSync(name,'utf8');
const config=read('config.js');
const protectedConfig=JSON.parse(read('wrangler.protected.jsonc'));
const gateway=read('access-worker.js');
const html=read('index.html');
const publicWorker=read('worker.js');

test('public and protected tender analysis use the same named Cloudflare service',()=>{
  const publicApi=config.match(/apiUrl:\s*["']https:\/\/([a-z0-9-]+)\.ukrsedo-e2e\.workers\.dev["']/);
  assert.ok(publicApi,'public frontend API hostname');
  const binding=protectedConfig.services.find(x=>x.binding==='TENDER_AI');
  assert.ok(binding,'protected Worker TENDER_AI binding');
  assert.equal(publicApi[1],binding.service,'both must route to same Cloudflare Worker service');
  assert.match(gateway,/env\.TENDER_AI\.fetch\(/,'protected gateway forwards analysis to service binding');
  assert.match(gateway,/new Request\('https:\/\/internal\.euro5\/tender-check'/);
});

test('protected and public frontends use one source of HTML, JS and CSS',()=>{
  assert.match(gateway,/const FRONTEND='https:\/\/raw\.githubusercontent\.com\/ukrsedo\/euro5-tender-bid-assistant\/main\//);
  assert.match(gateway,/if\(url\.pathname==='\/config\.js'\)/);
  const assets=[...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css)(?:\?[^"]*)?)"/g)]
    .map(x=>x[1].split('?')[0]);
  assert.ok(assets.includes('app.js'));
  assert.ok(assets.includes('config.js'));
  for(const asset of assets.filter(x=>x!=='config.js')){
    assert.ok(gateway.includes("'"+asset+"'"),'protected frontend must allow '+asset);
  }
});

test('protected API requires session and does not forward browser credentials',()=>{
  assert.match(gateway,/const user=await authenticate\(request,env\)/);
  assert.match(gateway,/if\(!user\)return/);
  assert.match(gateway,/if\(path==='\/tender-check'\)/);
  assert.match(gateway,/const headers=new Headers\(\{'Content-Type':'application\/json'\}\)/);
  assert.match(gateway,/new Request\('https:\/\/internal\.euro5\/tender-check'/);
});

test('competition forecast uses the same deterministic model implementation',()=>{
  assert.match(gateway,/import app, \{buildMarketReference,buildCompetitionForecast\} from '\.\/worker\.js'/);
  assert.match(publicWorker,/export function buildCompetitionForecast\(/);
  assert.match(gateway,/buildCompetitionForecast\(tender,data\.fuel_type,Number\(data\.expected_value_uah\)\)/);
});
