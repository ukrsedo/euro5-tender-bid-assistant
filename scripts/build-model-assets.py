"""Embed dated model assets into the current Worker without overwriting other features."""
from pathlib import Path
import json,re
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'models/model-2026-10-22.json').read_text());report=json.loads((root/'models/validation-2026-10-22.json').read_text());previous=json.loads((root/'models/model-2026-10-22-v1.json').read_text())
def update_block(s,name,body):
 pattern=r'// BEGIN GENERATED '+name+r'.*?// END GENERATED '+name+r'\n'
 if len(re.findall(pattern,s,re.S))!=1:raise ValueError('Missing or duplicated generated '+name)
 return re.sub(pattern,lambda _: '// BEGIN GENERATED '+name+'\n'+body+'\n// END GENERATED '+name+'\n',s,flags=re.S)
compact=lambda x:json.dumps(x,ensure_ascii=False,separators=(',',':'))
p=root/'worker.js';s=p.read_text();s=update_block(s,'COMPETITION REFRESH','const COMPETITION_REFRESH = '+compact(data)+';');s=re.sub(r'version: "2026\.10\.23-[^"]+"','version: "2026.10.23-fuel-filter-v2"',s,count=1);p.write_text(s)
p=root/'app.js';s=p.read_text();s=update_block(s,'PRICE REFRESH','const MODEL_REFRESH = '+compact(data['price'])+';\nconst MODEL_REFRESH_V1 = '+compact(previous['price'])+';')
a=s.index('function activeStatisticalModel()');b=s.index('\nconst POSITIONS',a)
count=f"{report['eligible_completed_lots']:,}".replace(',',' ')
s=s[:a]+'''function activeStatisticalModel(){
  const version=activeTenderData()?.competition_forecast?.model_version;
  if(version==='2026-10-22-items-v2') return MODEL_REFRESH;
  if(version==='2026-10-22') return MODEL_REFRESH_V1;
  return MODEL;
}
function statisticalModelNote(){
  const selected=activeStatisticalModel();
  if(selected===MODEL_REFRESH) return 'Версія 22.10.2026, фільтр v2: '''+count+''' завершених лотів у статистичній базі. Загальні назви уточнюються за підтвердженими позиціями або описом єдиного товару. Перевірка решти спірних записів неповна через обмеження API.';
  if(selected===MODEL_REFRESH_V1) return 'Версія 22.10.2026, попередній фільтр: 10 259 завершених лотів. Для нового фільтра потрібне оновлення Worker.';
  return 'Попередня версія 05.10.2026: 11 858 завершених паливних тендерів Prozorro за 2022–05.10.2026. Для цього оголошення збережено попередню версію.';
}
''' +s[b:];p.write_text(s)
p=root/'index.html';s=p.read_text();s=re.sub(r'(?<=на базі )[\d ]+(?= завершених паливних лотів)',count,s);s=re.sub(r'\d[\d ]*(?= відібраних завершених лотів)',count,s);s=s.replace('зі зрізу BI від 22.10.2026.', 'зі зрізу BI від 22.10.2026 (фільтр v2). Спірні назви уточнюються за позиціями або описом єдиного товару; частина перевірок API ще не завершена.');p.write_text(s)
print('Embedded',data['version'],report['eligible_completed_lots'])
