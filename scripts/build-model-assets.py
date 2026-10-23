"""Embed validated dated model artifacts in Worker and frontend, preserving legacy."""
from pathlib import Path
import json,re
root=Path(__file__).resolve().parents[1]
data=json.loads((root/'models/model-2026-10-22.json').read_text())
report=json.loads((root/'models/validation-2026-10-22.json').read_text())
p=root/'worker.js';s=p.read_text()
block='// BEGIN GENERATED COMPETITION REFRESH\nconst COMPETITION_REFRESH = '+json.dumps(data,ensure_ascii=False,separators=(',',':'))+';\n// END GENERATED COMPETITION REFRESH\n'
if '// BEGIN GENERATED COMPETITION REFRESH' in s:s=re.sub(r'// BEGIN GENERATED COMPETITION REFRESH.*?// END GENERATED COMPETITION REFRESH\n',lambda _:block,s,flags=re.S)
else:
 s=s.replace('function sigmoid(x) {',block+'''\nfunction competitionModelForAnnouncement(data) {
  const date=tenderAnnouncementDate(data);
  const day=date?.toISOString().slice(0,10);
  if(!day || day<"2026-10-06") return null;
  if(day>=COMPETITION_REFRESH.valid_from) return COMPETITION_REFRESH;
  return {version:"2026-10-05",cutoff:"2026-10-05",model:COMPETITION_MODEL,buyers:COMPETITION_BUYER_HISTORY};
}

function sigmoid(x) {''')
 s=s.replace('  const buyer = buyerCode(data);\n  const h = buyer && COMPETITION_BUYER_HISTORY[buyer]\n    ? COMPETITION_BUYER_HISTORY[buyer]', '  const state = competitionModelForAnnouncement(data);\n  if (!state) return null;\n  const model=state.model;\n  const buyer = buyerCode(data);\n  const h = buyer && state.buyers[buyer]\n    ? state.buyers[buyer]')
 start=s.index('function buildCompetitionForecast(');end=s.index('\nfunction cors(',start)
 f=s[start:end].replace('COMPETITION_MODEL.','model.')
 f=f.replace('  return {\n    one_participant_pct:', '  return {\n    model_version: state.version,\n    training_cutoff: state.cutoff,\n    one_participant_pct:')
 s=s[:start]+f+s[end:]
 s=s.replace('2026.10.23-buyer-competition','2026.10.23-model-20261022')
p.write_text(s)
p=root/'app.js';s=p.read_text()
price='// BEGIN GENERATED PRICE REFRESH\nconst MODEL_REFRESH = '+json.dumps(data['price'],ensure_ascii=False,separators=(',',':'))+';\n// END GENERATED PRICE REFRESH\n'
if '// BEGIN GENERATED PRICE REFRESH' in s:s=re.sub(r'// BEGIN GENERATED PRICE REFRESH.*?// END GENERATED PRICE REFRESH\n',lambda _:price,s,flags=re.S)
else:
 s=s.replace('const POSITIONS = [',price+'''\nfunction activeStatisticalModel(){
  // Old Workers lack this version: frontend must not silently use a newer model.
  return activeTenderData()?.competition_forecast?.model_version==='2026-10-22' ? MODEL_REFRESH : MODEL;
}
function statisticalModelNote(){
  return activeStatisticalModel()===MODEL_REFRESH
    ? 'Версія 22.10.2026: 10 259 завершених лотів у статистичній базі Prozorro за 2022–2026; зріз BI від 22.10.2026. Модель застосовується до оголошень від 23.10.2026.'
    : 'Попередня версія 05.10.2026: 11 858 завершених паливних тендерів Prozorro за 2022–05.10.2026. Для цього оголошення збережено попередню версію.';
}

const POSITIONS = [''')
 s=s.replace('const cfg=MODEL[el.competitionMode.value][el.fuelType.value];','const cfg=activeStatisticalModel()[el.competitionMode.value][el.fuelType.value];')
 s=s.replace('Розрахунок базується на 11 858 завершених паливних тендерах Prozorro за 2022–05.10.2026.','${statisticalModelNote()}')
p.write_text(s)
p=root/'index.html';s=p.read_text()
s=s.replace('Розрахунок побудовано на 11 858 завершених паливних тендерах Prozorro за 2022–05.10.2026.', 'Нова версія побудована на базі 10 259 завершених паливних лотів Prozorro за 2022–2026 зі срезу BI від 22.10.2026. Вона застосовується до оголошень від 23.10.2026. Для оголошень 06–22.10 зберігається попередня версія від 05.10.2026 (11 858 тендерів).')
s=s.replace('11 858 завершених паливних тендерів Prozorro, 2022–05.10.2026','срез Prozorro BI 22.10.2026 · 10 259 відібраних завершених лотів · попередня версія для оголошень до 23.10')
s=s.replace('срез','зріз')
p.write_text(s)
print('Embedded version',data['version'],'eligible lots',report['eligible_completed_lots'])
