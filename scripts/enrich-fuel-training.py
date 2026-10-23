"""Join saved BI composition and API product evidence without changing outcome labels.
Usage: python3 scripts/enrich-fuel-training.py RAW.gz COMPOSITION.gz ITEMS.jsonl OUTPUT.gz
"""
import json,gzip,sys,collections,pathlib,hashlib
import fuel_filter
source,composition,items,out=map(pathlib.Path,sys.argv[1:])
bi={r['Ідентифікатор лота']['text']:r for r in map(json.loads,gzip.open(composition,'rt'))}
proofs={}
for line in items.read_text().splitlines():
 r=json.loads(line)
 if 'error'not in r:proofs[r['tender_id']]=r
counts=collections.Counter();decisions=[]
with gzip.open(source,'rt')as src,gzip.open(out,'wt',encoding='utf8')as dest:
 for line in src:
  r=json.loads(line);id=r['Ідентифікатор лота']['text'];parent=id.rsplit('-L',1)[0]
  if id not in bi:raise ValueError('Missing BI composition '+id)
  if bi[id]['Дата/час початку останнього оновлення даних у додатку']['text']!=r['Дата/час початку останнього оновлення даних у додатку']['text']:raise ValueError('Snapshot dates differ')
  decision=fuel_filter.classify(r,proofs[parent])if parent in proofs else fuel_filter.classify_bi(r,bi[id])
  r['fuel_filter_v2']=decision;counts[(decision['basis'],decision['reason'])]+=1
  dest.write(json.dumps(r,ensure_ascii=False)+'\n')
  decisions.append({'id':id,**decision})
report={'raw_sha256':hashlib.sha256(source.read_bytes()).hexdigest(),'composition_sha256':hashlib.sha256(composition.read_bytes()).hexdigest(),'items_sha256':hashlib.sha256(items.read_bytes()).hexdigest(),'saved_api_parents':len(proofs),'lots':len(decisions),'classification':{' / '.join(k):v for k,v in counts.items()},'limitations':['API enrichment was interrupted by HTTP 429; unknown lots remain unresolved.','API snapshots modified after 2026-10-22 are not used.','Detailed BI descriptions are used only when BI reports exactly one item with valid physical quantity.']}
out.with_suffix('.audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
print(json.dumps(report,ensure_ascii=False,indent=2))
