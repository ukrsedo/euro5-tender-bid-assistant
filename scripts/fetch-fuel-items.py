"""Checkpointed API enrichment; stops on rate limiting instead of discarding records.
Usage: python3 scripts/fetch-fuel-items.py TARGET_LOT_IDS.json EVIDENCE.jsonl
Successful parents are never fetched again. Errors can be retried on a later run.
Uses one connection at a time, a >=2 second interval, and respects HTTP 429/Retry-After.
"""
import sys,json,pathlib,urllib.request,urllib.error,time,datetime
ids_path,out=map(pathlib.Path,sys.argv[1:]);parents=sorted({id.rsplit('-L',1)[0] for id in json.loads(ids_path.read_text())},reverse=True)
existing=[json.loads(s)for s in out.read_text().splitlines()]if out.exists()else []
done={x['tender_id']for x in existing if 'error'not in x};last=0
headers={'User-Agent':'Mozilla/5.0','Accept':'application/json'}
def get(url):
 global last
 delay=2-(time.monotonic()-last)
 if delay>0:time.sleep(delay)
 last=time.monotonic()
 with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=20)as r:return json.load(r)
with out.open('a',encoding='utf8')as f:
 for id in parents:
  if id in done:continue
  try:
   summary=get('https://prozorro.gov.ua/api/tenders/'+id+'/summary');internal=summary['id'];d=get('https://public-api.prozorro.gov.ua/api/2.5/tenders/'+internal)['data']
   if d.get('tenderID')!=id:raise ValueError('Tender identity mismatch')
   r=dict(tender_id=id,internal_id=internal,date_modified=d.get('dateModified'),buyer_code=d.get('procuringEntity',{}).get('identifier',{}).get('id'),lots=[{k:l.get(k)for k in ['id','title','value']}for l in d.get('lots',[])],items=[{k:i.get(k)for k in ['id','description','classification','unit','quantity','relatedLot']}for i in d.get('items',[])],retrieved_at=datetime.datetime.now(datetime.timezone.utc).isoformat())
  except urllib.error.HTTPError as e:
   if e.code==429:
    print(json.dumps({'stopped':'rate_limit','retry_after':e.headers.get('Retry-After'),'remaining_parents':sum(p not in done for p in parents)}),flush=True);sys.exit(75)
   r={'tender_id':id,'error':'HTTP '+str(e.code)}
  except Exception as e:r={'tender_id':id,'error':type(e).__name__+': '+str(e)}
  f.write(json.dumps(r,ensure_ascii=False)+'\n');f.flush()
  if 'error'not in r:done.add(id)
  print(id,'OK'if 'error'not in r else r['error'],flush=True)
