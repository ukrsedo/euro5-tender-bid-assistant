"""Auditable product filter. Detailed API items take precedence over generic lot titles."""
import datetime,re,unicodedata,zoneinfo
CUTOFF='2026-10-22'
ALLOWED={'09130000-9','09132000-3','09132100-4','09132200-5','09132300-6','09134100-8','09134200-9','09134210-2','09134220-5'}
# Whole words avoid false exclusions such as 'поливу' matching the former 'олив'.
OTHER=re.compile(r'(?<!\w)(?:engine\s+oil|lubricant\w*|kerosene\w*|газ\b|газу\b|пропан\w*|бутан\w*|мазут\w*|мастил\w*|олив\w*|масл\w*|керосин\w*|гас\b|скраплен\w*|сжиженн\w*|lpg\b|авіаці\w*|авиаци\w*|біоетанол\w*|біодизел\w*)',re.I)
EQUIPMENT=re.compile(r'^\s*(?:\d+[.)]\s*)?(?:генератор\w*|газонокос\w*|бензопил\w*|запчастин\w*|ремонт\w*|послуг\w*)|(?<!\w)(?:бензиновий|дизельний|дизельні|бензинові)\s+генератор(?:и)?(?!\w)|(?<!\w)(?:бензинова|дизельна)\s+газонокосарка(?!\w)',re.I)
GAS=re.compile(r'бензин|gasoline|petrol|(?<!\w)[аa](?:[іиi])?\s*[-–]?\s*9[2458](?!\d)',re.I)
DIESEL=re.compile(r'дизел|diesel|газойл|(?<!\w)дп(?!\w)',re.I)
def clean(s):return re.sub(r'\s+',' ',unicodedata.normalize('NFKC',str(s or '')).lower()).strip()
def product(description,cpv=''):
 s=clean(description);cpv=str(cpv or '')
 if OTHER.search(s) or EQUIPMENT.search(s):return None,'other_product'
 if cpv and cpv not in ALLOWED:return None,'other_cpv'
 gas=bool(GAS.search(s)) or cpv.startswith('09132')
 diesel=bool(DIESEL.search(s)) or cpv.startswith('09134')
 if gas and diesel:return 'mixed','explicit_fuel'
 if gas:return 'gasoline','explicit_fuel'
 if diesel:return 'diesel','explicit_fuel'
 return None,'unresolved_product'
def unit_kind(unit):
 code=clean((unit or {}).get('code'));name=clean((unit or {}).get('name'))
 if code in {'ltr','mtq','m3'} or re.search('літр|литр|кубічн|кубическ',name):return 'volume'
 if code in {'kgm','tne'} or re.search('кілограм|килограмм|тонн|^тона$',name):return 'mass'
 return None
def classify_items(items):
 if not items:return dict(fuel=None,reason='items_missing',basis='api_items')
 kinds=set();units=set()
 for item in items:
  kind,reason=product(item.get('description'),(item.get('classification')or{}).get('id'))
  if not kind:return dict(fuel=None,reason=reason,basis='api_items')
  unit=unit_kind(item.get('unit'))
  quantity=item.get('quantity')
  if not unit or not isinstance(quantity,(int,float)) or isinstance(quantity,bool) or not quantity>0:return dict(fuel=None,reason='unit_or_quantity_unresolved',basis='api_items')
  kinds.update(['gasoline','diesel'] if kind=='mixed' else [kind]);units.add(unit)
 return dict(fuel='mixed' if len(kinds)>1 else next(iter(kinds)),reason='accepted',basis='api_items',item_count=len(items),unit_bases=sorted(units))
def evidence_items(row,evidence):
 if not evidence or evidence.get('error'):return None,'api_unavailable'
 id=row['Ідентифікатор лота']['text'];parent,suffix=id.rsplit('-L',1)
 if evidence.get('tender_id')!=parent or str(evidence.get('buyer_code'))!=str(row['Код організатора']['text']):return None,'evidence_identity_mismatch'
 try:day=datetime.datetime.fromisoformat(evidence['date_modified'].replace('Z','+00:00')).astimezone(zoneinfo.ZoneInfo('Europe/Kyiv')).date().isoformat()
 except (KeyError,ValueError,AttributeError):return None,'evidence_date_unknown'
 if day>CUTOFF:return None,'evidence_after_cutoff'
 lots=evidence.get('lots') or [];items=evidence.get('items') or []
 if not lots:
  if suffix!='1' or any(i.get('relatedLot') for i in items):return None,'lot_mapping_unresolved'
  return items,None
 amount=row['Очікувана вартість']['num'];title=clean(row['Лот']['text'])
 def value_matches(l):
  n=(l.get('value')or{}).get('amount');return isinstance(n,(int,float)) and abs(n-float(amount))<.02
 matches=[l for l in lots if value_matches(l) and clean(l.get('title'))==title]
 if len(matches)!=1:
  if len(lots)==1 and suffix=='1' and value_matches(lots[0]):matches=lots
  else:return None,'lot_mapping_unresolved'
 lotid=matches[0].get('id')
 if not lotid:return None,'lot_mapping_unresolved'
 selected=[i for i in items if i.get('relatedLot')==lotid or (len(lots)==1 and not i.get('relatedLot'))]
 return selected,None
def classify(row,evidence=None):
 if evidence is not None:
  items,error=evidence_items(row,evidence)
  if error:return dict(fuel=None,reason=error,basis='api_items')
  return classify_items(items)
 kind,reason=product(row['Лот']['text'],row['Класифікація CPV']['text'][:10])
 return dict(fuel=kind,reason='accepted' if kind else reason,basis='explicit_title_cpv')

def classify_bi(row,composition=None):
 decision=classify(row)
 if decision['fuel'] or decision['reason']!='unresolved_product' or not composition:return decision
 # A single item plus an explicit description is usable BI evidence. Multi-item
 # lots require item-level data because a description may mention only one product.
 count=composition.get('Кількість унікальних предметів лота в лоті',{}).get('num')
 if count!=1:return decision
 description=composition.get('Опис лота',{}).get('text','')
 unit=composition.get('Одиниця виміру лота',{}).get('text','')
 quantity=composition.get('Очікувана кількість одиниць предмета лота',{}).get('num')
 classified=classify_items([{'description':description,'classification':{'id':row['Класифікація CPV']['text'][:10]},'unit':{'name':unit},'quantity':quantity}])
 classified['basis']='bi_single_item_description'
 return classified
