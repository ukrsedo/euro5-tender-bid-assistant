"""Export public BI fuel lots. Output includes snapshot reload timestamp.
Usage: python3 scripts/export-training-bi.py OUTPUT.jsonl.gz
Requires websockets. Snapshot is not a complete event archive.
"""
import json,datetime,copy,gzip,pathlib,sys
from websockets.sync.client import connect
app='2595af2b-985f-4771-aa36-2133e1f89df0';seq=0
out=pathlib.Path(sys.argv[1] if len(sys.argv)>1 else 'bi-lot-composition.jsonl.gz')
with connect('wss://bi.prozorro.org/app/'+app,origin='https://bi.prozorro.org',open_timeout=20,max_size=12000000,ping_interval=None) as ws:
 def rpc(h,m,p={}):
  global seq
  seq+=1;req=seq;ws.send(json.dumps({'jsonrpc':'2.0','id':req,'handle':h,'method':m,'params':p}))
  while True:
   r=json.loads(ws.recv(timeout=180))
   if r.get('id')==req:
    if 'error' in r: raise RuntimeError(r['error'])
    return r['result']
 doc=rpc(-1,'OpenDoc',{'qDocName':app})['qReturn']['qHandle']
 def search(field,query):
  h=rpc(doc,'GetField',{'qFieldName':field})['qReturn']['qHandle']
  print('select',field,rpc(h,'Select',{'qMatch':query,'qSoftLock':False}),flush=True)
 h=rpc(doc,'GetField',{'qFieldName':'Дата'})['qReturn']['qHandle']
 epoch=datetime.date(1899,12,30)
 dates=[{'qNumber':i,'qIsNumeric':True} for i in range((datetime.date(2022,1,1)-epoch).days,(datetime.date(2026,10,22)-epoch).days+1)]
 print('dates',rpc(h,'SelectValues',{'qFieldValues':dates,'qToggleMode':False}),flush=True)
 search('Очікувана вартість лота','>=1000000')
 search('Класифікація CPV лота','0913*')
 h=rpc(doc,'GetObject',{'qId':'VcLPJX'})['qReturn']['qHandle'];hc=rpc(h,'GetProperties')['qProp']['qHyperCubeDef']
 hc['qDimensions']=[hc['qDimensions'][0]]
 for d in hc['qDimensions']: d['qCalcCondition']={'qCond':{},'qMsg':{}};d['qCalcCond']={}
 fields=['Опис лота','Одиниця виміру лота','Очікувана кількість одиниць предмета лота','Кількість унікальних предметів лота в лоті','Дата/час початку останнього оновлення даних у додатку']
 for field in fields: hc['qDimensions'].append({'qDef':{'qFieldDefs':[field]}})
 hc['qMeasures']=[];hc['qInitialDataFetch']=[];hc.pop('qLayoutExclude',None)
 w=len(hc['qDimensions']);hc['qColumnOrder']=hc['qInterColumnSortOrder']=list(range(w))
 h=rpc(doc,'CreateSessionObject',{'qProp':{'qInfo':{'qType':'table'},'qHyperCubeDef':hc}})['qReturn']['qHandle']
 lay=rpc(h,'GetLayout')['qLayout']['qHyperCube'];n=lay['qSize']['qcy'];headers=[d['qFallbackTitle'] for d in lay['qDimensionInfo']]
 print(n,headers,flush=True)
 out.parent.mkdir(exist_ok=True)
 with gzip.open(str(out)+'.part','wt',encoding='utf8') as f:
  for start in range(0,n,600):
   matrix=rpc(h,'GetHyperCubeData',{'qPath':'/qHyperCubeDef','qPages':[{'qTop':start,'qLeft':0,'qWidth':w,'qHeight':min(600,n-start)}]})['qDataPages'][0]['qMatrix']
   for cells in matrix:
    # Preserve both formatted values and numeric Qlik values to avoid losing dates/leading zeroes.
    f.write(json.dumps({k:{'text':v.get('qText'),'num':v.get('qNum')} for k,v in zip(headers,cells)},ensure_ascii=False,allow_nan=True)+'\n')
   print('rows',min(start+600,n),'/',n,flush=True)
 pathlib.Path(str(out)+'.part').rename(out)
 print('saved',out,flush=True)
