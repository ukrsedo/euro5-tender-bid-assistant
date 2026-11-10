"""Install reconciled 9-Nov-2026 competition + discount models without future leakage.
Usage: python3 scripts/install-model-2026-11-09.py ARTIFACT_DIR
Only installs if evidence reconciliation and source integrity gates pass.
"""
from pathlib import Path
import json,sys,re,hashlib
root=Path(__file__).resolve().parents[1]
a=Path(sys.argv[1])
model=json.loads((a/'model-2026-11-09.json').read_text())
validation=json.loads((a/'validation-2026-11-09.json').read_text())
report=json.loads((a/'reconciliation-report.json').read_text())
assert model['version']=='2026-11-09-items-v2'
assert model['cutoff']=='2026-11-09' and model['valid_from']=='2026-11-10'
assert validation['cutoff']=='2026-11-09'
assert validation['source_update']==['09.11.2026 21:00:31']
assert report['deployment_gate']=='EVIDENCE_CHECK_PASSED_REQUIRES_DEPLOYMENT'
assert not report['blockers'] and report['api_parent_evidence_missing']==0
assert report['candidate_eligible_completed_lots']==validation['eligible_completed_lots']
assert validation['eligible_completed_lots']>=10391
assert model['price']['market']['mixed']['sample']>0
compact=lambda obj:json.dumps(obj,ensure_ascii=False,separators=(',',':'))
w=root/'worker.js';s=w.read_text()
if 'COMPETITION_REFRESH_NOV9' not in s:
  marker='// END GENERATED COMPETITION REFRESH'
  assert s.count(marker)==1
  s=s.replace(marker,'const COMPETITION_REFRESH_NOV9 = '+compact(model)+';\n'+marker)
  anchor='  if(day>=COMPETITION_REFRESH.valid_from) return COMPETITION_REFRESH;'
  assert s.count(anchor)==1
  s=s.replace(anchor,'  if(day>=COMPETITION_REFRESH_NOV9.valid_from) return COMPETITION_REFRESH_NOV9;\n'+anchor)
  w.write_text(s)
else:
  raise RuntimeError('Model was already installed, refusing silent second install')
p=root/'app.js';s=p.read_text()
assert 'MODEL_REFRESH_NOV9' not in s
marker='// END GENERATED PRICE REFRESH'
assert s.count(marker)==1
s=s.replace(marker,'const MODEL_REFRESH_NOV9 = '+compact(model['price'])+';\n'+marker)
anchor="  if(version==='2026-10-22-items-v2') return MODEL_REFRESH;"
assert s.count(anchor)==1
s=s.replace(anchor,"  if(version==='2026-11-09-items-v2') return MODEL_REFRESH_NOV9;\n"+anchor)
anchor='  if(selected===MODEL_REFRESH) return qualityScope+'
assert s.count(anchor)==1
s=s.replace(anchor,"  if(selected===MODEL_REFRESH_NOV9) return qualityScope+'Версія 09.11.2026: "+str(validation['eligible_completed_lots'])+" завершених паливних лотів за даними Prozorro BI станом на 09.11.2026; перевірені позиції товарів та історія замовників. Застосовується до тендерів, оголошених з 10.11.2026.';\n"+anchor)
p.write_text(s)
p=root/'index.html';s=p.read_text()
s,n=re.subn(r'app\.js\?v=[^"]+','app.js?v=20261110-fuel-model-asof-nov9',s)
assert n==1
old='Нова версія побудована на базі 10 391 завершених паливних лотів Prozorro за 2022–2026 зі зрізу BI від 22.10.2026 (фільтр v2).'
assert old in s
s=s.replace(old,'Модель для тендерів з 10.11.2026 побудована на базі '+str(validation['eligible_completed_lots'])+' завершених паливних лотів Prozorro зі зрізу BI від 09.11.2026 (фільтр товарів v2). Модель від 22.10.2026 збережено для тендерів 23.10–09.11.2026.')
s=s.replace('Вона застосовується до оголошень від 23.10.2026.','Попередня версія застосовується до оголошень 23.10–09.11.2026.')
s=s.replace('Дані:</strong> зріз Prozorro BI 22.10.2026 · 10 391 відібраних завершених лотів','Дані:</strong> зріз Prozorro BI 09.11.2026 · '+str(validation['eligible_completed_lots'])+' відібраних завершених лотів')
p.write_text(s)
p=root/'MODEL_METHOD.md';s=p.read_text()
head='## Оновлення моделі за станом на 09.11.2026'
assert head not in s
s+='\n\n'+head+'\n\n'+f"Зріз Prozorro BI: 09.11.2026 21:00:31; сирі лоти: {validation['raw_lots']}; відібрані завершені паливні лоти: {validation['eligible_completed_lots']}. Збережено версії 05.10 та 22.10 для раніше оголошених тендерів. Версія 09.11 застосовується лише до оголошень від 10.11.2026; це усуває витік майбутніх результатів.\n\n"
s+=f"Перевірено {report['api_parent_evidence_recovered']} раніше аудованих API-записів, пропущено: {report['api_parent_evidence_missing']}. Валідація: accuracy {validation['test']['accuracy']:.4f}; AUC {validation['test']['auc']:.4f}; Brier {validation['test']['brier']:.4f}. Вибірка валідації відрізняється від попереднього зрізу; пряме порівняння показників не є коректним.\n\n"
s+='Виробнича модель зберігає правила: CPV 0913*, від 1 млн грн без ПДВ, бензин/дизель, лише підтверджені результати станом на відповідний cutoff; не включає змішані закупівлі інших товарів. Джерело: GitHub Actions 42796095795, артефакт euro5-reconciled-fuel-model-2026-11-09.\n'
p.write_text(s)
print(json.dumps({'version':model['version'],'cutoff':model['cutoff'],'lots':validation['eligible_completed_lots'],'verified_api_parents':report['api_parent_evidence_recovered'],'worker_bytes':w.stat().st_size,'app_bytes':(root/'app.js').stat().st_size}))
