import copy,unittest
import fuel_filter as f
class FilterTest(unittest.TestCase):
 def item(self,text,cpv='09130000-9',unit='LTR'):return dict(description=text,classification={'id':cpv},unit={'code':unit},quantity=100)
 def test_generic_title_is_not_a_fuel_label(self):self.assertEqual(f.product('Нафта і дистиляти','09130000-9')[0],None)
 def test_items_recover_generic_titles(self):
  self.assertEqual(f.classify_items([self.item('Бензин А-95')])['fuel'],'gasoline')
  self.assertEqual(f.classify_items([self.item('ДП-Л-Євро5')])['fuel'],'diesel')
  self.assertEqual(f.classify_items([self.item('Бензин A95'),self.item('Дизельне паливо')])['fuel'],'mixed')
 def test_other_goods_never_disappear_from_bundle(self):
  for text in ['Газ скраплений','Мастило моторне','Бензиновий генератор','Бензинова газонокосарка','Керосин','Біодизель','Газ']:
   self.assertIsNone(f.classify_items([self.item('Бензин А-95'),self.item(text)])['fuel'],text)
 def test_boundaries_not_substrings(self):
  self.assertEqual(f.product('Дизельне паливо для поливу','09130000-9')[0],'diesel')
  self.assertEqual(f.product('Дизельне паливо для забезпечення роботи дизельних генераторів','09130000-9')[0],'diesel')
  self.assertEqual(f.product('Бензин А-95 для генераторів','09130000-9')[0],'gasoline')
  self.assertEqual(f.product('Бензин та дизельне паливо для транспортних засобів, оглядів, ремонтів та експлуатації мереж','09130000-9')[0],'mixed')
 def test_units_and_quantity(self):
  self.assertIsNone(f.classify_items([self.item('Бензин А-95',unit='MTR')])['fuel'])
  self.assertEqual(f.classify_items([self.item('Дизельне паливо',unit='TNE')])['fuel'],'diesel')
  self.assertIsNone(f.classify_items([{**self.item('Бензин А-95'),'quantity':0}])['fuel'])
 def test_lot_isolation_and_identity(self):
  row={'Ідентифікатор лота':{'text':'UA-2026-08-01-000001-a-L2'},'Код організатора':{'text':'12345678'},'Очікувана вартість':{'num':2000000},'Лот':{'text':'Лот 2'}}
  proof=dict(tender_id='UA-2026-08-01-000001-a',buyer_code='12345678',date_modified='2026-08-20T09:00:00+03:00',lots=[dict(id='gas',title='Лот 1',value={'amount':1000000}),dict(id='diesel',title='Лот 2',value={'amount':2000000})],items=[{**self.item('Бензин А-95'),'relatedLot':'gas'},{**self.item('Дизельне паливо'),'relatedLot':'diesel'}])
  self.assertEqual(f.classify(row,proof)['fuel'],'diesel')
  later={**proof,'date_modified':'2026-10-23T09:00:00+03:00'};self.assertEqual(f.classify(row,later)['reason'],'evidence_after_cutoff')
  self.assertEqual(f.classify(row,{**proof,'buyer_code':'00000000'})['reason'],'evidence_identity_mismatch')
  self.assertEqual(f.classify(row,{**proof,'lots':[proof['lots'][0],proof['lots'][0]]})['reason'],'lot_mapping_unresolved')
if __name__=='__main__':unittest.main()
