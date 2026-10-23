"""Reproducible temporal competition/discount refresh. See MODEL_METHOD.md.
Usage: python3 scripts/retrain-model.py INPUT.jsonl.gz OUTPUT_DIR
"""
import sys,json,gzip,re,datetime,hashlib,heapq,collections,pathlib,math,importlib.metadata
import numpy as np
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import log_loss,brier_score_loss,roc_auc_score,accuracy_score
import fuel_filter
EPOCH=datetime.date(1899,12,30)
CUTOFF='2026-10-22'
ALLOWED={'09130000-9','09132000-3','09132100-4','09132200-5','09132300-6','09134100-8','09134200-9','09134210-2','09134220-5'}
def text(r,k):return str(r[k]['text'])
def number(r,k):
 try:return float(r[k]['num'])
 except (ValueError,TypeError):return float('nan')
def date(r,k):
 n=number(r,k)
 return (EPOCH+datetime.timedelta(days=int(n))).isoformat() if math.isfinite(n) else None
def proc(s,d):
 s=s.lower()
 if 'запит ціни' in s:return 'rfq'
 if 'особливост' in s:return 'open_special'
 if 'спрощен' in s:return 'simplified'
 if 'відкриті торги' in s:return 'open_special' if d>='2022-10-19' else 'open'
 return 'other'
def fuel(title,cpv):
 return fuel_filter.product(title,cpv)[0]

def normalize(path):
 rows=[];rejected=collections.Counter();seen=set();updates=set()
 for s in gzip.open(path,'rt',encoding='utf8'):
  r=json.loads(s);updates.add(text(r,'Дата/час початку останнього оновлення даних у додатку'))
  id=text(r,'Ідентифікатор лота');pub=date(r,'Дата');known=date(r,'Дата останньої зміни статусу лота')
  cpv=text(r,'Класифікація CPV')[:10];title=text(r,'Лот');decision=r.get('fuel_filter_v2') or fuel_filter.classify(r);kind=decision['fuel'];procedure=proc(text(r,'Процедура закупівлі'),pub or '')
  reason=None
  if id in seen:raise ValueError('Duplicate lot '+id)
  seen.add(id)
  amount=number(r,'Очікувана вартість');net=amount/(1.2 if text(r,'ПДВ в очікуваній вартості')=='з ПДВ' else 1)
  n=number(r,'Кіль-ть унікальних учасників лота');win=number(r,'Сума переможної пропозиції')
  if cpv not in ALLOWED:reason='cpv_outside_scope'
  elif kind is None:reason='fuel_'+decision['reason']
  elif procedure=='other':reason='non_modelled_procedure'
  elif not (net>=1e6):reason='below_1m_net'
  elif text(r,'Статус лота')!='Завершено лот закупівлі':reason='not_successfully_completed'
  elif not pub or not known or known<pub or known>CUTOFF:reason='completion_unknown_or_after_cutoff'
  elif not math.isfinite(n) or n<1 or int(n)!=n:reason='participants_missing'
  elif not math.isfinite(win) or not (0<win<=amount*1.001):reason='winning_amount_invalid'
  if reason:rejected[reason]+=1;continue
  rows.append(dict(id=id,published=pub,known=known,buyer=text(r,'Код організатора'),title=title,procedure=procedure,fuel=kind,expected=amount,expected_net=net,participants=int(n),discount=max(0,100*(1-win/amount)),winner=text(r,'Переможець'),fuel_basis=decision['basis']))
 return sorted(rows,key=lambda r:(r['published'],r['id'])),dict(rejected),sorted(updates),len(seen)

def features(rows):
 history={};pending=[];X=[]
 def observe(r):
  h=history.setdefault(r['buyer'],[0,0,0,2]);n=r['participants'];h[0]+=1;h[1]+=n;h[2]+=n==1;h[3]=n
 for i,r in enumerate(rows):
  while pending and pending[0][0]<r['published']:
   _,j=heapq.heappop(pending);observe(rows[j])
  c,total,singles,last=history.get(r['buyer'],[0,0,0,2]);p=r['procedure'];t=r['title'].lower()
  X.append([math.log(r['expected_net']),math.log1p(c),total/c if c else 2,singles/c if c else .36,min(last,6),int(r['fuel']=='gasoline'),int(r['fuel']=='diesel'),int(p=='rfq'),int(p=='open_special'),int(p=='simplified'),int(p=='open'),int(bool(re.search('талон|картк|смарт',t))),int(bool(re.search('налив|оптов|резервуар|бензовоз',t)))])
  heapq.heappush(pending,(r['known'],i))
 while pending:_,i=heapq.heappop(pending);observe(rows[i])
 snapshot={k:[v[0],round(v[1]/v[0],6),round(v[2]/v[0],6),v[3]] for k,v in sorted(history.items())}
 return np.asarray(X),np.asarray([r['participants']>=2 for r in rows],dtype=int),snapshot

def fit(X,y,train,cal):
 model=make_pipeline(StandardScaler(),LogisticRegression(C=1,max_iter=2000,random_state=22)).fit(X[train],y[train])
 # Independent calendar calibration; no random row split.
 calibrator=LogisticRegression(C=1,max_iter=2000,random_state=22).fit(model.decision_function(X[cal]).reshape(-1,1),y[cal])
 return model,calibrator

def predict(m,c,X):return np.clip(c.predict_proba(m.decision_function(X).reshape(-1,1))[:,1],.01,.99)
def metrics(y,p):return dict(n=len(y),two_plus_rate=float(y.mean()),log_loss=float(log_loss(y,p)),brier=float(brier_score_loss(y,p)),auc=float(roc_auc_score(y,p)),accuracy=float(accuracy_score(y,p>=.5)))
def curves(rows,asof):
 out={}
 end=datetime.date.fromisoformat(asof)
 for mode,days in [('market',90),('n1',730)]:
  out[mode]={}
  for kind in ['gasoline','diesel','mixed']:
   values=[r['discount'] for r in rows if r['fuel']==kind and r['published']>=(end-datetime.timedelta(days=days)).isoformat() and r['known']<=asof and (mode!='n1' or r['participants']==1)]
   if len(values)<30:raise ValueError('Insufficient price sample '+str((asof,mode,kind,len(values))))
   discounts=np.ceil(np.quantile(values,[.25,.5,.75,.9])*4)/4
   out[mode][kind]=dict(discounts=discounts.tolist(),competitiveness=[float(np.mean(np.asarray(values)<=d)*100) for d in discounts],sample=len(values))
 return out

def main():
 source=pathlib.Path(sys.argv[1]);dest=pathlib.Path(sys.argv[2]);dest.mkdir(parents=True,exist_ok=True)
 rows,rejections,updates,raw=normalize(source)
 X,y,buyers=features(rows)
 pub=np.array([r['published'] for r in rows]);known=np.array([r['known'] for r in rows])
 # Fit Jan2025-Jun2026, calibrate Jul-Aug2026, untouched Sep-Oct2026 test.
 train=(pub>='2025-01-01')&(known<'2026-07-01')
 cal=(pub>='2026-07-01')&(known<'2026-09-01')
 test=pub>='2026-09-01'
 m,c=fit(X,y,train,cal);p=predict(m,c,X[test]);validation=metrics(y[test],p)
 # Matched no-buyer baseline assesses buyer-history contribution without using future outcomes.
 no_history=X.copy();no_history[:,1:5]=[0,2,.36,2]
 mb,cb=fit(no_history,y,train,cal);baseline=metrics(y[test],predict(mb,cb,no_history[test]))
 # Compare against frozen legacy coefficients only on announcements after their Oct5 cutoff.
 legacy_path=pathlib.Path(__file__).resolve().parents[1]/'models/model-2026-10-05.json'
 comparison=None
 if legacy_path.exists():
  legacy=json.loads(legacy_path.read_text());lm=legacy['model'];lx=X.copy()
  for i,r in enumerate(rows):
   h=legacy['buyers'].get(r['buyer'],[0,2,.36,2]);lx[i,1:5]=[math.log1p(h[0]),h[1],h[2],min(h[3],6)]
  score=((lx-np.array(lm['mean']))/np.array(lm['scale']))@np.array(lm['coef'])+lm['intercept']
  lp=np.clip(1/(1+np.exp(-(lm['calibrationIntercept']+lm['calibrationCoef']*score))),.01,.99)
  recent=pub>'2026-10-05'
  comparison=dict(period='2026-10-06..2026-10-22 announcements completed by cutoff',legacy=metrics(y[recent],lp[recent]),refreshed_frozen_before_test=metrics(y[recent],predict(m,c,X[recent])))
 # Final: core fit through Aug; independent calibration Sept-Oct22. Validation above remains frozen.
 ft=(pub>='2025-01-01')&(known<'2026-09-01');fc=(pub>='2026-09-01')&(known<=CUTOFF)
 final,platt=fit(X,y,ft,fc);scaler=final[0];lr=final[1]
 model=dict(intercept=float(lr.intercept_[0]),coef=lr.coef_[0].tolist(),mean=scaler.mean_.tolist(),scale=scaler.scale_.tolist(),calibrationIntercept=float(platt.intercept_[0]),calibrationCoef=float(platt.coef_[0][0]))
 data=dict(version='2026-10-22-items-v2',cutoff=CUTOFF,valid_from='2026-10-23',model=model,buyers=buyers,price=curves(rows,CUTOFF))
 report=dict(cutoff=CUTOFF,source_update=updates,source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),raw_lots=raw,fuel_filter_version=2,fuel_classification_basis=dict(collections.Counter(r['fuel_basis'] for r in rows)),eligible_completed_lots=len(rows),period=[rows[0]['published'],rows[-1]['published']],rejected=rejections,train=int(train.sum()),calibration=int(cal.sum()),test=validation,baseline_without_buyer_history=baseline,final_core_fit=int(ft.sum()),final_calibration=int(fc.sum()),new_announcements_after_oct5=sum(r['published']>'2026-10-05' for r in rows),new_completions_after_oct5=sum(r['known']>'2026-10-05' for r in rows),price_samples={m:{f:v['sample'] for f,v in kinds.items()} for m,kinds in data['price'].items()},limitations=['Reconstructed pipeline: previous training source code is unavailable; not an identical rerun.','Fuel items resolve generic titles; remaining unresolved evidence and lots containing other products are excluded. Explicit, unambiguous title/CPV labels remain a fallback where no detailed item evidence was fetched.','Historical net threshold uses app convention 20% conversion, not reconstructed historical tax treatment.','Winning amount/expected amount follows BI exported VAT bases; bidder-specific VAT basis is not independently reconstructed.','Completion status-change date conservatively defines outcome availability. Same-day outcomes excluded from features.','UI competitiveness is rolling out-of-time coverage, pooled by competition mode; in_window_coverage is separately stored.'])
 # Walk-forward price validation, rebuild windows on each earlier announcement date.
 price_test={}
 for mode in ['market','n1']:
  hits=[]
  for r in rows:
   if r['published']<'2026-09-01' or (mode=='n1' and r['participants']!=1):continue
   day=(datetime.date.fromisoformat(r['published'])-datetime.timedelta(days=1)).isoformat()
   try:cfg=curves(rows,day)[mode][r['fuel']]
   except ValueError:continue
   hits.append([r['discount']<=d for d in cfg['discounts']])
  price_test[mode]=dict(n=len(hits),observed_coverage=np.mean(hits,axis=0).tolist() if hits else [])
 report['runtime_versions']={k:importlib.metadata.version(k) for k in ['numpy','scikit-learn','websockets']}
 report['legacy_comparison']=comparison
 report['price_backtest']=price_test
 for mode in data['price']:
  for cfg in data['price'][mode].values():
   cfg['in_window_coverage']=cfg['competitiveness']
   cfg['competitiveness']=[100*v for v in price_test[mode]['observed_coverage']]
 (dest/'model-2026-10-22.json').write_text(json.dumps(data,ensure_ascii=False,separators=(',',':'))+'\n')
 (dest/'validation-2026-10-22.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 with gzip.open(dest/'training-lots-2026-10-22.jsonl.gz','wt',encoding='utf8') as f:
  for r in rows:f.write(json.dumps(r,ensure_ascii=False)+'\n')
 (dest/'parity-fixtures.json').write_text(json.dumps([dict(x=X[i].tolist(),expected=float(predict(final,platt,X[i:i+1])[0])) for i in np.linspace(0,len(rows)-1,15,dtype=int)]))
 print(json.dumps(report,ensure_ascii=False,indent=2),flush=True)
if __name__=='__main__':main()
