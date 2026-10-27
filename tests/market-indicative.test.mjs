import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('app.js','utf8');
function between(start,end){
  const a=source.indexOf(start),b=source.indexOf(end,a+start.length);
  assert.ok(a>=0&&b>a,'Required function missing: '+start);
  return source.slice(a,b);
}
const code=between('function indicativeStandardProductSupported(','function benchmarkDescription(')+
  between('function marketComparison(','function marketGapText(');
const ctx={
  lastExtraction:{tender_announcement_date:'22.10.2026',
    fuel_products:{
      gasoline:{grade:'95',tier:'unspecified',items:[{grade:'95',tier:'unspecified',source_text:'Бензин А-95 (Євро 5), талон'}]},
      diesel:{season:'unspecified',tier:'unspecified',items:[{season:'unspecified',tier:'unspecified',source_text:'Дизельне паливо (Євро 5), талон'}]}
    },
    market_reference_candidates:{policy:'fuel-quality-v1',
      gasoline:{retail:50,bulk:40},diesel:{retail:45,bulk:35}}},
  selectedProduct:(fuel,d)=>d[fuel+'_product'],
  standardProductConfirmed:()=>false,
  standardProductContradicted:()=>false,
  activeTenderData:()=>({}),
  benchmarkDescription:()=> 'Джерело / дата',
};
const {marketComparison,displayMarketComparison}=vm.runInNewContext(
  code+';({marketComparison,displayMarketComparison})',ctx);
const data={supply_format:'retail',gasoline_product:'a95_regular',diesel_product:'diesel_regular'};
test('unconfirmed quality is excluded from confirmed scoring',()=>{
  assert.equal(marketComparison(1000,10,10,'mixed',data),null);
});
test('manual standard products permit a labelled indicative market estimate',()=>{
  const c=displayMarketComparison(1140,10,10,'mixed',data);
  assert.equal(c.indicative,true);
  assert.equal(c.marketValue,950);
  assert.ok(Math.abs(c.gap-20)<1e-9);
});
test('unconfirmed dropdowns still display an indicative price for evidenced A-95 and diesel',()=>{
  const c=displayMarketComparison(1140,10,10,'mixed',{
    ...data,gasoline_product:'unknown',diesel_product:'unknown'
  });
  assert.equal(c.indicative,true);
  assert.equal(c.marketValue,950);
});
test('unknown grade cannot be guessed from a generic gasoline description',()=>{
  const old=ctx.lastExtraction.fuel_products.gasoline;
  ctx.lastExtraction.fuel_products.gasoline={...old,grade:null,items:[{grade:null,tier:'unspecified'}]};
  assert.equal(displayMarketComparison(1140,10,10,'mixed',data),null);
  ctx.lastExtraction.fuel_products.gasoline=old;
});
test('explicit premium fuel blocks a generic benchmark',()=>{
  const old=ctx.lastExtraction.fuel_products.diesel;
  ctx.lastExtraction.fuel_products.diesel={...old,tier:'premium'};
  assert.equal(displayMarketComparison(1140,10,10,'mixed',data),null);
  ctx.lastExtraction.fuel_products.diesel=old;
});
test('missing announcement day prevents indicative comparisons',()=>{
  ctx.lastExtraction.tender_announcement_date=null;
  assert.equal(displayMarketComparison(1140,10,10,'mixed',data),null);
  ctx.lastExtraction.tender_announcement_date='22.10.2026';
});
test('missing market candidates do not crash the calculator',()=>{
  const candidates=ctx.lastExtraction.market_reference_candidates;
  ctx.lastExtraction.market_reference_candidates=null;
  assert.equal(displayMarketComparison(1140,10,10,'mixed',data),null);
  ctx.lastExtraction.market_reference_candidates=candidates;
});
test('a different manually selected product is not silently priced as standard',()=>{
  assert.equal(displayMarketComparison(1140,10,10,'mixed',{...data,gasoline_product:'premium'}),null);
});
test('explicit quality contradiction prevents indicative comparisons',()=>{
  ctx.standardProductContradicted=()=>true;
  assert.equal(displayMarketComparison(1140,10,10,'mixed',data),null);
  ctx.standardProductContradicted=()=>false;
});
test('confirmed price takes priority and is not marked indicative',()=>{
  ctx.standardProductConfirmed=()=>true;
  assert.equal(displayMarketComparison(1140,10,10,'mixed',data).indicative,false);
});
