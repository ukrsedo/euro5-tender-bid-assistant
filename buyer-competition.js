/* Explicit participation policy, not a calibrated probability of winning. */
(function(root){
 function assess(h,asOf,buyerCode){
  const unknown=reason=>({level:'unknown',points:0,label:'Конкурентність не встановлена',reason,conditional:true});
  if(!h?.ready)return unknown(h?.reason||'Історія замовника ще завантажується.');
  if(h.history_version!==2||h.as_of!==asOf||!asOf||!h.period?.end||h.period.end>=asOf||h.buyer_code!==buyerCode)return unknown('Немає підтвердженої історії цього замовника до дати оголошення тендера.');
  const v=h.verification;
  if(!v||!Number.isInteger(v.candidate_lots)||!Number.isInteger(v.verified_lots)||v.candidate_lots<0||v.verified_lots<0||v.verified_lots>v.candidate_lots)return unknown('Не підтверджено дату історичних даних.');
  if(v.candidate_lots===0)return unknown('Попередніх паливних закупівель за цей період не знайдено.');
  if(v.verified_lots/v.candidate_lots<.8)return unknown('Підтверджено менше 80% попередніх лотів; рейтинг не робить висновок про закритість замовника.');
  const c=h.competition||{},s=h.suppliers||{},n=c.observed_count;
  const counts=[n,c.one_count,c.known_count,c.zero_count,c.missing_count,c.final_count];
  if(!counts.every(x=>Number.isInteger(x)&&x>=0)||c.one_count>n||n!==c.known_count-c.zero_count||c.known_count+c.missing_count!==c.final_count)return unknown('Показники учасників неповні або неузгоджені.');
  const multi=n-c.one_count,multiShare=n?multi/n:null;
  const winnerN=s.known_lots,top=s.leaders?.[0],winnerCoverage=h.states?.['Завершено лот закупівлі']||0;
  const winnerReady=Number.isInteger(winnerN)&&winnerN>=5&&winnerN<=winnerCoverage&&winnerCoverage>0&&winnerN/winnerCoverage>=.8&&top&&Number.isInteger(top.count)&&top.count<=winnerN;
  const topShare=winnerReady?top.count/winnerN:null;
  const dominance=topShare!==null&&topShare>=.8;
  const details={observed_lots:n,multi_lots:multi,multi_share:multiShare,one_lots:c.one_count,zero_lots:c.zero_count,
   winner_lots:Number.isInteger(winnerN)?winnerN:0,distinct_winners:s.distinct_count||0,top_supplier:top||null,top_share:topShare,
   evidence_as_of:asOf,new_supplier_entry_established:false,policy:'buyer-access-v1'};
  const countText=n?`${multi} із ${n} лотів з учасниками мали двох або більше учасників.`:'Немає підтверджених лотів з учасниками.';
  const winnerText=winnerReady?` Найбільший постачальник виграв ${top.count} із ${winnerN} лотів із відомим переможцем (${Math.round(topShare*1000)/10}%).`:' Даних про переможців недостатньо для оцінки концентрації.';
  if(c.missing_count>c.final_count*.2)return {...unknown('У понад 20% лотів немає даних про учасників.'),...details};
  if(n>=5&&multiShare<=.2&&dominance)return {...details,level:'high',points:-20,label:'Високий ризик входу',conditional:true,reason:countText+winnerText+' Слабка конкуренція поєднується з концентрацією перемог. Це не доказ наперед визначеного переможця.'};
  if(n>=5&&(multiShare<.5||dominance))return {...details,level:'weak',points:-10,label:'Слабка конкуренція або концентрація перемог',conditional:true,reason:countText+winnerText+' Перед участю перевірте вимоги, покриття АЗС і витрати на підготовку пропозиції.'};
  if(n<5&&h.count>=5&&(h.groups?.direct?.count||0)/h.count>=.8)return {...details,level:'weak',points:-10,label:'Переважають прямі закупівлі',conditional:true,reason:'Щонайменше 80% перевірених лотів — без відкритого електронного відбору. Доступність конкуренції для нового постачальника потребує перевірки; це не прогноз одного учасника.'};
  if(n<5)return {...unknown('Менше 5 підтверджених лотів з учасниками. Висновок про конкурентність ненадійний.'),...details};
  if(!winnerReady)return {...unknown(countText+winnerText),...details};
  return {...details,level:'supported',points:0,label:'Конкуренція підтверджена історією',conditional:false,reason:countText+winnerText+' Це не гарантує перемогу нового учасника.'};
 }
 function recommendation(base,assessment,stop){
  if(stop)return base;
  const text=assessment.reason;
  if(assessment.level==='high')return {title:'Не рекомендуємо без перевірки доступності конкуренції',tone:'bad',summary:text};
  // Preserve an already negative economic recommendation; otherwise prevent an
  // unqualified green recommendation when access evidence is weak or missing.
  if(base.tone==='bad')return {...base,summary:base.summary+' '+text};
  if(assessment.level==='weak')return {title:'Участь лише після перевірки конкурентності замовника',tone:'warn',summary:text};
  if(assessment.level==='unknown')return {title:'Попередня оцінка: конкурентність потребує перевірки',tone:'warn',summary:base.summary+' '+text};
  return base;
 }
 root.Euro5BuyerCompetition={assess,recommendation};
})(globalThis);
