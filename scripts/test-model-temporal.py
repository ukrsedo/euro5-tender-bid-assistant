import importlib.util,math
from pathlib import Path
spec=importlib.util.spec_from_file_location('model',Path(__file__).with_name('retrain-model.py'));m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
def row(i,pub,known,n):return dict(id=str(i),published='2026-01-'+pub,known='2026-01-'+known,buyer='12345678',participants=n,expected_net=1e6,procedure='rfq',title='Дизельне паливо',fuel='diesel')
rows=[row(1,'01','20',6),row(2,'10','12',1),row(3,'12','30',3),row(4,'13','15',2)]
x,y,h=m.features(rows)
assert x[1,1]==0 # First result is not yet known.
assert x[2,1]==0 # Result on this announcement day remains unavailable.
assert x[3,1]==math.log1p(1)
assert tuple(x[3,2:5])==(1,1,1) # Only lot2 is available; no future 6/3 participants.
assert h['12345678'][0]==4
rows[0]['participants']=60;rows[2]['participants']=30
x2,_,_=m.features(rows)
assert (x2[3]==x[3]).all() # Changing unknown future outcomes cannot change features.
assert m.fuel('Скраплений газ','09130000-9') is None
assert m.proc('Закупівля без використання електронної системи (базова)','2026-01-01')=='other'
print('Training: delayed outcomes, same-day exclusion, future-mutation invariance and scope passed')
