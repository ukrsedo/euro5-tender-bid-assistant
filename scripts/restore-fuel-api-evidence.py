"""Recover independently verifiable Prozorro item evidence for historically audited fuel lots.
Snapshot cutoff is fixed at 2026-11-09; later modified payloads are NOT as-of evidence.
Artifact output is for retraining only and never automatically deploys a model.
"""
import sys,json,datetime,urllib.request,urllib.error,time,pathlib,collections,random
root=pathlib.Path(__file__).resolve().parents[1]
audit=json.loads((root/'models/filter-v2-audit.json').read_text())
cutoff='2026-11-09'
out=pathlib.Path(sys.argv[1]);out.parent.mkdir(parents=True,exist_ok=True)
ids={x.rsplit('-L',1)[0] for key in ('added_lot_ids','removed_lot_ids','reclassified_lot_ids') for x in audit[key]}
# Old API evidence should not be replaced by the title-only guess, even when current
# API is unavailable. Query all historically affected parents.
existing={}
if out.exists():
 for line in out.read_text().splitlines():
  try:r=json.loads(line);existing[r['tender_id']]=r
  except:pass
headers={'User-Agent':'EURO5-audited-model-refresh/2026-11-09','Accept':'application/json'}
counts=collections.Counter();last=0
def get(url):
 global last
 delay=max(0,2-(time.monotonic()-last))
 if delay:time.sleep(delay)
 last=time.monotonic()
 with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=25) as res:return json.load(res)
def check_date(d):
 try: return datetime.datetime.fromisoformat(d.replace('Z','+00:00')).astimezone(datetime.timezone(datetime.timedelta(hours=2))).date().isoformat()
 except:return None
with out.open('a',encoding='utf8') as f:
 for i,id in enumerate(sorted(ids)):
  if id in existing and existing[id].get('as_of_eligible'):continue
  row={'tender_id':id,'attempted_at':datetime.datetime.now(datetime.timezone.utc).isoformat(),'as_of_eligible':False}
  try:
   summary=get('https://prozorro.gov.ua/api/tenders/'+id+'/summary')
   internal=summary['id']
   data=get('https://public-api.prozorro.gov.ua/api/2.5/tenders/'+internal)['data']
   if data.get('tenderID')!=id:raise ValueError('Tender ID mismatch')
   row.update(internal_id=internal,date_modified=data.get('dateModified'),
       buyer_code=data.get('procuringEntity',{}).get('identifier',{}).get('id'),
       lots=[{k:l.get(k) for k in ['id','title','value']} for l in data.get('lots',[])],
       items=[{k:item.get(k) for k in ['id','description','classification','unit','quantity','relatedLot']} for item in data.get('items',[])])
   day=check_date(data.get('dateModified',''))
   row['date_modified_kyiv_day']=day
   row['as_of_eligible']=bool(day and day<=cutoff)
   row['status']='verified_asof' if row['as_of_eligible'] else 'modified_after_cutoff_or_unknown'
  except urllib.error.HTTPError as e:
   row.update(status='HTTP_'+str(e.code),error=str(e))
   if e.code==429:
    f.write(json.dumps(row,ensure_ascii=False)+'\n');f.flush();print('rate limit encountered, stopping safely',flush=True);break
  except Exception as e:
   row.update(status='error',error=type(e).__name__+': '+str(e))
  counts[row['status']]+=1
  f.write(json.dumps(row,ensure_ascii=False)+'\n');f.flush()
  if i%20==0:print('processed',i+1,'/',len(ids),dict(counts),flush=True)
# Deduplicate: enrichment reads latest successful record if a lot was retried.
saved={}
for line in out.read_text().splitlines():
 r=json.loads(line)
 if r.get('as_of_eligible'):saved[r['tender_id']]=r
report={'cutoff':cutoff,'target_parents':len(ids),'verified_asof':len(saved),
        'unverified':sorted(ids-set(saved)),'statuses_this_run':dict(counts),
        'note':'No future modified API payload is permitted into as-of training.'}
out.with_suffix('.audit.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps({k:v if k!='unverified' else len(v) for k,v in report.items()},ensure_ascii=False),flush=True)
