import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('worker.js','utf8');
const start=source.indexOf('export async function buildMarketReference(');
const end=source.indexOf('function nbuDateKey(',start);
assert.ok(start>=0&&end>start);
const code=source.slice(start,end).replace('export async function','async function');
const fixedNow=new Date('2026-11-03T12:00:00Z');
class FixedDate extends Date { constructor(value){super(value===undefined?fixedNow:value)} static now(){return fixedNow.getTime()} }
const day=d=>new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Kyiv',year:'numeric',month:'2-digit',day:'2-digit'}).format(d);
const ua=d=>day(d).split('-').reverse().join('.');
const ctx={
  Date:FixedDate,Math,Number,Promise,
  tenderAnnouncementDate:()=>new FixedDate('2026-10-29T12:00:00Z'),
  euro5ObservationDate:day,formatUaDate:ua,
  tenderFuelProducts:()=>({gasoline:{tier:'unspecified'},diesel:{tier:'unspecified'}}),
  qualityAllowsStandard:()=>false,
  loadEuro5RetailContext:async()=>({}),
  fetchRetailPrice:async()=>null,
  fetchMinfinPrice:async(slug,date)=>day(date)==='2026-11-02'
    ? {date:'02.11.2026',priceWithVat:slug==='a95'?90.08:104.5,priceWithoutVat:(slug==='a95'?90.08:104.5)/1.2}
    : null,
  fetchEnkorrCurrentPrices:async()=>({date:new FixedDate('2026-11-02T12:00:00Z'),
    gasoline:{wholesale:87.68,retail:90.08},diesel:{wholesale:101.78,retail:104.5}}),
  percentDifference:(a,b)=>a>0&&b>0?Math.abs(a/b-1)*100:null,
  wholesaleBenchmarkAge:(t,p)=>{
    const end=Date.parse(day(t)+'T00:00:00Z'),start=Date.parse(day(p)+'T00:00:00Z');
    if(start>end)return null;
    let age=0;
    for(let d=start+86400000;d<=end;d+=86400000)if(![0,6].includes(new Date(d).getUTCDay()))age++;
    return age;
  },
  normalizeSupplyFormat:v=>v,chooseMarketPrice:()=>null,UKRAINE_STANDARD_VAT:0.2
};
const {buildMarketReference}=vm.runInNewContext(code+';({buildMarketReference})',ctx);

test('29 October bulk tender exposes 2 November prices only as current context',async()=>{
  const result=await buildMarketReference({tenderID:'UA-2026-10-29-008698-a'},
    {fuel_type:'mixed',gasoline_volume_l:5000,diesel_volume_l:10000},
    {normalizedWithoutVat:1245000},{supplyFormat:'bulk'});
  assert.equal(result.available,false);
  assert.equal(result.marketValueWithoutVat,undefined);
  assert.equal(result.referenceCandidates.gasoline.bulk,null);
  assert.equal(result.referenceCandidates.diesel.bulk,null);
  assert.equal(result.currentMarketReferenceDate,'02.11.2026');
  assert.ok(Math.abs(result.currentMarketCandidates.gasoline-87.68/1.2)<1e-9);
  assert.ok(Math.abs(result.currentMarketCandidates.diesel-101.78/1.2)<1e-9);
});
