(()=>{
  let api='',lastData=null,generation=0;
  const by=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const panel=by('memoryPanel'); if(!panel)return;
  async function call(path,payload){
    const key=by('memoryKey').value.trim();
    if(!key)throw Error('Введіть персональний ключ доступу.');
    const r=await fetch(api+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+key},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
    const d=await r.json();if(!r.ok)throw Error(d.error||'Помилка пам’яті.');return d;
  }
  function reset(){generation++;lastData=null;by('memoryRecords').innerHTML='';by('memoryStatus').textContent='';panel.classList.add('hidden');by('memoryContent').value='';}
  function load(data,url){reset();lastData=data;api=url;panel.classList.remove('hidden');
    // A date-only cutoff excludes the whole announcement day conservatively.
    const date=data.buyer_history_as_of||data.tender_announcement_date;
    by('memoryAsOf').value=date?date.slice(0,10)+'T00:00:00Z':'';
    by('memoryStatus').textContent='Пам’ять не завантажено. Вкажіть ключ і точний момент аналізу. Дата без часу: використано початок доби UTC.';
  }
  async function refresh(){const ticket=++generation;by('memoryRecords').innerHTML='';
    const d=await call('/memory/context',{asOf:by('memoryAsOf').value,buyerCode:lastData?.buyer_code||'',tenderId:lastData?.tender_id||''});
    if(ticket!==generation)return;
    by('memoryRecords').innerHTML=d.records.map(r=>`<article class="notice"><strong>${esc(({profile:'Профіль компанії',preference:'Особисті налаштування',buyer_note:'Нотатка про замовника',decision:'Рішення щодо тендера'})[r.kind])}</strong><p style="white-space:pre-wrap">${esc(r.content)}</p><small>Відомо: ${esc(r.available_at)} · Автор: ${esc(r.actor_id)} · Версія: ${esc(r.record_key)}${r.source_url?' · Джерело: '+esc(r.source_url):''}</small></article>`).join('');
    by('memoryStatus').textContent=`${d.records.length} записів станом на ${d.asOf}. ${d.note}${d.truncated?' Показано перші 100 записів.':''}`;
  }
  by('memoryLoad').onclick=()=>refresh().catch(e=>by('memoryStatus').textContent=e.message);
  by('memoryLock').onclick=()=>{generation++;by('memoryKey').value='';by('memoryRecords').innerHTML='';by('memoryStatus').textContent='Доступ закрито.';};
  by('memoryKey').oninput=()=>{generation++;by('memoryRecords').innerHTML='';};
  window.addEventListener('pagehide',()=>{generation++;by('memoryKey').value='';by('memoryRecords').innerHTML='';});
  by('memoryAsOf').oninput=()=>{generation++;by('memoryRecords').innerHTML='';by('memoryStatus').textContent='Момент аналізу змінено. Завантажте пам’ять повторно.';};
  by('memorySave').onclick=async()=>{try{
    const kind=by('memoryKind').value,key=by('memoryRecordKey').value.trim()||crypto.randomUUID();
    const b={kind,recordKey:key,content:by('memoryContent').value,buyerCode:kind==='buyer_note'?lastData?.buyer_code:'',tenderId:kind==='decision'?lastData?.tender_id:'',sourceUrl:by('memorySource').value};
    if(by('memoryAvailable').value.trim())b.availableAt=by('memoryAvailable').value.trim();
    const saved=await call('/memory/save',b);by('memoryRecordKey').value=key;
    by('memoryStatus').textContent=`Збережено. Ключ версій: ${key}. Відомо з ${saved.availableAt}. Новий запис не потрапить до аналізу на ранішу дату.`;
    by('memoryContent').value='';
  }catch(e){by('memoryStatus').textContent=e.message;}};
  window.Euro5MemoryUI={load,reset};
})();
