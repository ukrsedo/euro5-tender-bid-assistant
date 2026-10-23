import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';
const ctx={};vm.createContext(ctx);vm.runInContext(fs.readFileSync('price-risk.js','utf8'),ctx);const {fit,assess,businessDays}=ctx.Euro5PriceRisk;
const rows=JSON.parse(fs.readFileSync('data/market-series.json','utf8')).records;
assert.equal(businessDays('2026-10-05','2026-10-12'),5);
const m=fit(rows,'2026-10-13',1);assert(m.ready);assert.equal(m.recent_count,17);assert(Math.abs(m.fuel.volatility_pct-1.4613915150729795)<1e-8);assert.equal(m.horizon_business_days,5);
const contaminated=fit([...rows,{date:'2027-01-01',a95:9999,dt:9999,usd:9999}],'2026-10-13',1);assert.equal(JSON.stringify(m),JSON.stringify(contaminated));
const stress={ready:true,scenarios:[{fuel:1,usd:1},{fuel:3,usd:-1},{fuel:-1,usd:3}]};
assert.equal(assess(stress,100,95,95,3).safe_count,2); // only UAH fuel changes affect cost; USD is not a second stress
assert(Math.abs(assess(stress,100,95,95,3).buffer_pct-100*2/95)<1e-9);
assert.equal(assess({ready:false},100,95,95,3).points,7.5);
const safer=assess(m,100,94,94,3),tight=assess(m,100,96.5,96.5,3);assert(safer.points>=tight.points);
const up={...m,scenarios:m.scenarios.map(s=>({fuel:s.fuel+1,usd:s.usd+1}))};assert(assess(up,100,95,95,3).points<=assess(m,100,95,95,3).points);
const falling={...m,scenarios:m.scenarios.map(s=>({fuel:s.fuel-1,usd:s.usd-1}))};assert(assess(falling,100,95,95,3).points>=assess(m,100,95,95,3).points);
assert(!fit(rows.slice(-8),'2026-10-13',1).ready);
// Walk-forward backtest: training never sees the five-business-day outcome.
const buffers=[.5,1,2],result=[];
for(const weight of [1,0])for(const buffer of buffers){let count=0,brier=0,baseline=0,predicted=0,actual=0;
 for(let i=130;i<rows.length-5;i+=5){const asOf=rows[i].date,model=fit(rows,asOf,weight);if(!model.ready||businessDays(asOf,rows[i+5].date)!==5)continue;const pct=(key)=>(rows[i+5][key]/rows[i][key]-1)*100;const event=weight*pct('a95')+(1-weight)*pct('dt')>buffer?1:0;const probability=model.scenarios.filter(s=>s.fuel>buffer).length/model.scenarios.length;brier+=(probability-event)**2;baseline+=(.5-event)**2;predicted+=probability;actual+=event;count++}
 result.push({fuel:weight?'A95':'Diesel',buffer_pct:buffer,tests:count,brier:brier/count,neutral_brier:baseline/count,mean_predicted_exceedance:predicted/count,observed_exceedance:actual/count});
}
console.log('PASS: horizon, sigma, no future leakage, cost-buffer conversion, fuel-only stress, monotonic trend/buffer, missing-data fallback');console.log(JSON.stringify(result,null,2));


