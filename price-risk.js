/* Empirical five-business-day price-risk model. No normal-distribution assumption. */
(function(root){
 const day=s=>Date.parse(s+'T00:00:00Z'),pct=(a,b)=>(b/a-1)*100;
 const mean=xs=>xs.reduce((s,x)=>s+x,0)/xs.length;
 const sd=xs=>{if(xs.length<2)return null;const m=mean(xs);return Math.sqrt(xs.reduce((s,x)=>s+(x-m)**2,0)/(xs.length-1))};
 function businessDays(a,b){let n=0;for(let t=day(a)+86400000;t<=day(b);t+=86400000){const w=new Date(t).getUTCDay();if(w!==0&&w!==6)n++}return n}
 function windows(rows){const out=[];for(let i=5;i<rows.length;i++){const a=rows[i-5],b=rows[i];if(businessDays(a.date,b.date)!==5)continue;out.push({start:a.date,end:b.date,a95:pct(a.a95,b.a95),dt:pct(a.dt,b.dt),usd:pct(a.usd,b.usd)})}return out}
 function fit(rows,asOf,gasWeight=0){
  const cutoff=day(asOf),start=cutoff-30*86400000,historyStart=cutoff-365*86400000;
  const clean=[...new Map(rows.filter(r=>/^\d{4}-\d{2}-\d{2}$/.test(r.date)&&day(r.date)<=cutoff&&day(r.date)>=historyStart&&[r.a95,r.dt,r.usd].every(v=>Number.isFinite(v)&&v>0)&&![0,6].includes(new Date(day(r.date)).getUTCDay())).map(r=>[r.date,r])).values()].sort((a,b)=>a.date.localeCompare(b.date));
  const all=windows(clean),recent=all.filter(r=>day(r.start)>=start),historical=all.filter(r=>day(r.end)<start);
  if(recent.length<10||historical.length<60)return {ready:false,reason:'Недостатньо п’ятиденних вікон для оцінки ризику.',recent_count:recent.length,historical_count:historical.length};
  if(cutoff-day(clean.at(-1).date)>4*86400000)return {ready:false,reason:'Ряд цін не містить достатньо свіжих спостережень.'};
  const w=Math.max(0,Math.min(1,gasWeight)),fuel=r=>w*r.a95+(1-w)*r.dt;
  const f=recent.map(fuel),x=recent.map(r=>r.usd),hf=historical.map(fuel),hx=historical.map(r=>r.usd);
  const muF=mean(f),muX=mean(x),sF=sd(f),sX=sd(x),hmF=mean(hf),hmX=mean(hx),hsF=sd(hf),hsX=sd(hx);
  const shrink=recent.length/(recent.length+historical.length);
  const transform=(v,m,s,hm,hs)=>{const pooledMean=hm+shrink*(m-hm),pooledSd=hs+shrink*(s-hs);return hs>1e-12?pooledMean+(v-hm)*pooledSd/hs:pooledMean};
  // Keep the paired historical fuel/USD observations; do not resample them independently.
  const scenarios=historical.map((r,i)=>({fuel:transform(hf[i],muF,sF,hmF,hsF),usd:transform(hx[i],muX,sX,hmX,hsX)}));
  return {ready:true,horizon_business_days:5,as_of:asOf,last_observation:clean.at(-1).date,recent_count:recent.length,historical_count:historical.length,recent_weight:shrink,fuel:{trend_pct:muF,volatility_pct:sF},usd:{trend_pct:muX,volatility_pct:sX},scenarios};
 }
 function assess(model,bid,totalCost,fuelCost,minMargin){
  if(!model?.ready)return {ready:false,points:7.5,reason:model?.reason||'Статистична модель ще недоступна.'};
  if(!(bid>0&&totalCost>0&&fuelCost>0)||!Number.isFinite(minMargin))return {ready:false,points:7.5,reason:'Немає повних даних ціни, собівартості та мінімальної маржі.'};
  const buffer=(bid*(1-minMargin/100)-totalCost)/fuelCost*100;
  const count=model.scenarios.length;
  // Two alternative stress channels on the SAME fuel cost. Taking the larger
  // stress avoids adding FX growth to a UAH fuel price that already embeds FX.
  const safe=model.scenarios.filter(s=>Math.max(s.fuel,s.usd)<=buffer).length;
  return {ready:true,points:15*safe/count,buffer_pct:buffer,safe_fraction:safe/count,safe_count:safe,total_count:count,model};
 }
 root.Euro5PriceRisk={fit,assess,windows,businessDays};
})(globalThis);
