(()=>{
  let api='',lastData=null,lastSnapshot=null,lastResult=null,connected=false,generation=0,authPromise=null;
  const sessionMode=window.EURO5_CONFIG?.authMode==='session';
  let role='',decisionEpoch=0,draft=0,saving=false,savedDecision=null;
  const by=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const panel=by('memoryPanel');if(!panel)return;
  const label=choice=>choice==='participate'?'Беремо участь':'Не беремо участі';
  function advisory(html){const node=by('memoryAdvice');if(node)node.innerHTML=html;}
  function decisionState(){
    if(!by('participationSave'))return;
    by('participationSave').disabled=saving||!connected||role==='reader'||!lastData?.tender_id||!['participate','decline'].includes(by('participationChoice').value);
    by('participationContext').textContent=lastSnapshot?'До рішення буде додано поточний розрахунок.':'До рішення не буде додано розрахунок. За потреби спочатку розрахуйте актуальні параметри.';
  }
  function invalidate(){generation++;draft++;lastResult=null;lastSnapshot=null;advisory('');decisionState();}
  async function call(path,payload){
    const headers={'Content-Type':'application/json'};
    if(!sessionMode){const key=by('memoryKey').value.trim();if(!key)throw Error('Введіть персональний ключ доступу.');headers.Authorization='Bearer '+key;}
    const r=await fetch(api+path,{method:'POST',headers,body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
    const d=await r.json().catch(()=>({}));if(r.status===401&&sessionMode){connected=false;decisionState();throw Error('Сесія закінчилась. Увійдіть знову через сторінку входу.');}if(!r.ok)throw Error(r.status===404?'Оновіть Worker до версії з рішеннями закупівельника.':d.error||'Пам’ять тимчасово недоступна.');return d;
  }
  function savedText(d){return `${label(d.decision.choice)} · ${d.recordedAt} · ${d.actor}${d.decision.comment?'\nКоментар: '+d.decision.comment:''}`;}
  function reportHtml(){
    let html='';
    if(lastResult){
      const d=lastResult;
      const hints=d.hints.map(h=>`<li>${esc(h.text)}<br><small>Аналізи: ${h.evidence.map(esc).join(', ')}</small></li>`).join('');
      const rows=d.cases.map(x=>`<tr><td>${esc(x.case.tenderId)}</td><td>${x.match==='same_buyer'?'Той самий замовник':'Схожі параметри'}</td><td>${esc(x.case.score)}</td><td>${esc(x.case.recommendation)}</td></tr>`).join('');
      const decisions=(d.decisions||[]).map(x=>`<tr><td>${esc(x.tenderId)}</td><td>${esc(label(x.choice))}</td><td>${esc(x.comment||'Без коментаря')}</td><td>${esc(x.actor)}<br>${esc(x.recordedAt)}</td></tr>`).join('');
      html=`<section><h3>Попередні розрахунки асистента</h3>${hints?'<ul>'+hints+'</ul>':'<p>До дати оголошення цього тендера ще немає схожих збережених аналізів.</p>'}${rows?'<div class="table-wrap"><table><thead><tr><th>Тендер</th><th>Схожість</th><th>Попередній бал</th><th>Попередня рекомендація</th></tr></thead><tbody>'+rows+'</tbody></table></div>':''}${decisions?'<h3>Рішення закупівельників у попередніх тендерах</h3><div class="table-wrap"><table><thead><tr><th>Тендер</th><th>Рішення</th><th>Коментар</th><th>Автор і час</th></tr></thead><tbody>'+decisions+'</tbody></table></div><p>Це збережені рішення щодо участі, а не підтвердження подання пропозиції чи перемоги. Поточний рейтинг від них не змінюється.</p>':'<p>Підтверджених закупівельниками рішень за схожими тендерами до дати оголошення ще немає.</p>'}<p class="muted">${esc(d.note)}${d.coverageLimited||d.decisionCoverageLimited?' Покриття попередніх записів обмежене.':''}</p></section>`;
    }
    if(savedDecision&&savedDecision.decision?.tenderId===lastData?.tender_id)html+=`<section><h3>Збережене рішення закупівельника</h3><p>${esc(savedText(savedDecision)).replace(/\n/g,'<br>')}</p><p>Час збереження рішення наведено окремо від дати історичного прогнозу.</p></section>`;
    return html;
  }
  async function readDecision(){
    if(!connected||!lastData?.tender_id)return;
    const epoch=decisionEpoch,revision=draft,ref={tenderId:lastData.tender_id,buyerCode:lastData.buyer_code};
    try{
      const d=await call('/memory/participation/current',ref);if(epoch!==decisionEpoch||ref.tenderId!==lastData?.tender_id)return;
      savedDecision=d.decision?d:null;by('participationSaved').textContent=d.decision?'Останнє збережене рішення: '+savedText(d):'Збереженого рішення ще немає.';
      if(d.decision&&revision===draft){by('participationChoice').value=d.decision.choice;by('participationComment').value=d.decision.comment||'';}
      decisionState();
    }catch(e){if(epoch===decisionEpoch)by('participationStatus').textContent='Рішення не завантажено: '+e.message;}
  }
  async function process(){
    decisionState();if(!lastSnapshot)return;
    if(sessionMode&&!connected){const revision=generation;await connect();if(revision!==generation||!connected)return;}
    if(!connected){advisory('<p>Для підказок і збереження рішення підключіть пам’ять ЄВРО5 внизу сторінки.</p>');return;}
    const ticket=++generation,snapshot={...lastSnapshot};lastResult=null;
    advisory('<p>Шукаю попередні розрахунки та рішення…</p>');
    try{
      const result=await call('/memory/hints',{snapshot});if(ticket!==generation)return;
      lastResult=result;advisory(reportHtml());
      const saved=await call('/memory/observe',{snapshot});if(ticket!==generation)return;
      by('memoryStatus').textContent=saved.saved?'Розрахунок збережено. Рішення щодо участі зберігається окремою кнопкою.':'Підказки отримано. Ваш доступ — лише читання.';
    }catch(e){if(ticket!==generation)return;by('memoryStatus').textContent=e.message;advisory((lastResult?reportHtml():'')+`<p>Пам’ять: ${esc(e.message)} Поточний рейтинг розраховано без змін.</p>`);}
  }
  function reset(){
    invalidate();decisionEpoch++;draft=0;saving=false;savedDecision=null;lastData=null;by('memoryStatus').textContent='';panel.classList.add('hidden');
    by('participationDecision')?.classList.add('hidden');
    for(const id of ['participationChoice','participationComment'])if(by(id))by(id).value='';
    for(const id of ['participationStatus','participationSaved'])if(by(id))by(id).textContent='';
    decisionState();
  }
  function load(data,url){
    reset();lastData=data;api=url;panel.classList.remove('hidden');by('participationDecision')?.classList.remove('hidden');
    by('memoryStatus').textContent=connected?'Пам’ять підключена. Оберіть і збережіть рішення щодо участі.':sessionMode?'Пам’ять підключається автоматично після входу.':'Підключіть пам’ять, щоб зберегти рішення щодо участі.';
    if(!connected)by('participationStatus').textContent=sessionMode?'Пам’ять підключається автоматично після входу.':'Для збереження рішення спочатку підключіть пам’ять нижче.';
    decisionState();if(sessionMode){const epoch=decisionEpoch;void connect().then(()=>{if(epoch===decisionEpoch)void readDecision();});}else void readDecision();
  }
  function observe(snapshot){
    const date=lastData?.buyer_history_as_of||lastData?.tender_announcement_date;
    if(!/^\d{4}-\d{2}-\d{2}/.test(date||'')){advisory('<p>Пам’ять не використано: немає підтвердженої дати оголошення.</p>');return;}
    lastSnapshot={...snapshot,analysisAsOf:date.slice(0,10)+'T00:00:00Z'};void process();
  }
  async function connect(){
    if(connected||!api)return;
    if(authPromise)return authPromise;
    authPromise=(async()=>{try{const status=await call('/memory/status',{});connected=true;role=status.role||'';by('memoryStatus').textContent='Пам’ять підключена автоматично.';by('participationStatus').textContent=role==='reader'?'Ваш доступ — лише читання.':'';decisionState();}catch(e){by('memoryStatus').textContent=e.message;decisionState();}finally{authPromise=null;}})();
    return authPromise;
  }
  by('memoryLoad').onclick=async()=>{
    const ticket=++generation;try{
      const status=await call('/memory/status',{});if(ticket!==generation)return;connected=true;role=status.role||'';decisionEpoch++;
      by('memoryStatus').textContent='Пам’ять підключена.';by('participationStatus').textContent=role==='reader'?'Ваш доступ — лише читання. Збереження рішення недоступне.':'';
      decisionState();await Promise.all([readDecision(),process()]);
    }catch(e){if(ticket===generation){connected=false;by('memoryStatus').textContent=e.message;decisionState();}}
  };
  by('participationSave').onclick=async()=>{
    if(saving||!connected||role==='reader'||!lastData?.tender_id)return;
    const choice=by('participationChoice').value;if(!['participate','decline'].includes(choice)){by('participationStatus').textContent='Оберіть рішення щодо участі.';return;}
    const epoch=decisionEpoch,revision=draft;
    const payload={tenderId:lastData.tender_id,buyerCode:lastData.buyer_code,choice,comment:by('participationComment').value.trim(),snapshot:lastSnapshot?{...lastSnapshot}:null};
    saving=true;decisionState();by('participationStatus').textContent='Зберігаю рішення…';
    try{
      const d=await call('/memory/participation',payload);if(epoch!==decisionEpoch||payload.tenderId!==lastData?.tender_id)return;
      if(!d.saved||!d.decision)throw Error('Сервер не підтвердив збереження рішення.');
      savedDecision=d;by('participationSaved').textContent='Останнє збережене рішення: '+savedText(d);
      by('participationStatus').textContent=revision===draft?'Рішення збережено.':'Попередній вибір збережено. Поточні зміни ще не збережені.';
      if(lastResult)advisory(reportHtml());
    }catch(e){if(epoch===decisionEpoch)by('participationStatus').textContent='Рішення не збережено: '+e.message;}
    finally{if(epoch===decisionEpoch){saving=false;decisionState();}}
  };
  for(const id of ['participationChoice','participationComment'])by(id).oninput=()=>{draft++;by('participationStatus').textContent='Зміни ще не збережені.';decisionState();};
  function lock(){connected=false;role='';generation++;decisionEpoch++;saving=false;lastResult=null;savedDecision=null;by('memoryKey').value='';advisory('');by('memoryStatus').textContent='Пам’ять відключено.';by('participationSaved').textContent='';decisionState();}
  by('memoryLock').onclick=lock;
  by('memoryKey').oninput=()=>{connected=false;role='';generation++;decisionEpoch++;saving=false;lastResult=null;savedDecision=null;by('participationSaved').textContent='';advisory('');decisionState();};
  window.addEventListener('pagehide',lock);
  if(sessionMode){
    by('memoryCredentials')?.classList.add('hidden');by('sessionBar')?.classList.remove('hidden');
    void(async()=>{try{const r=await fetch('/session',{headers:{Accept:'application/json'}});if(!r.ok){window.location.assign('/login');return;}const user=await r.json();by('sessionName').textContent=user.name+(user.shared?' · спільний тестовий профіль':'');}catch{by('sessionName').textContent='Не вдалося перевірити сесію. Оновіть сторінку.';}})();
  }
  window.Euro5MemoryUI={load,reset,observe,invalidate,reportHtml};
})();
