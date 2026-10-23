(()=>{
  let api='',lastData=null,lastSnapshot=null,lastResult=null,connected=false,generation=0,authPromise=null;
  const by=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const panel=by('memoryPanel');if(!panel)return;
  function advisory(html){const node=by('memoryAdvice');if(node)node.innerHTML=html;}
  function invalidate(){generation++;lastResult=null;lastSnapshot=null;advisory('');}
  async function call(path,payload){
    const r=await fetch(api+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(15000)});
    const d=await r.json().catch(()=>({}));if(r.status===401){connected=false;throw Error('Сесія закінчилась. Увійдіть знову через сторінку входу.');}if(!r.ok)throw Error(r.status===404?'Оновіть Worker до версії автоматичної пам’яті.':d.error||'Пам’ять тимчасово недоступна.');return d;
  }
  function reportHtml(){
    if(!lastResult)return '';
    const d=lastResult;
    const hints=d.hints.map(h=>`<li>${esc(h.text)}<br><small>Аналізи: ${h.evidence.map(esc).join(', ')}</small></li>`).join('');
    const rows=d.cases.map(x=>`<tr><td>${esc(x.case.tenderId)}</td><td>${x.match==='same_buyer'?'Той самий замовник':'Схожі параметри'}</td><td>${esc(x.case.score)}</td><td>${esc(x.case.recommendation)}</td></tr>`).join('');
    return `<section><h3>Підказки з попередніх аналізів</h3>${hints?'<ul>'+hints+'</ul>':'<p>До дати оголошення цього тендера ще немає схожих збережених аналізів. Пам’ять накопичуватиметься автоматично.</p>'}${rows?'<div class="table-wrap"><table><thead><tr><th>Тендер</th><th>Схожість</th><th>Попередній бал</th><th>Попередня рекомендація</th></tr></thead><tbody>'+rows+'</tbody></table></div>':''}<p class="muted">${esc(d.note)}${d.coverageLimited?' Перевірено лише 500 останніх доступних аналізів.':''}</p></section>`;
  }
  async function process(){
    if(!lastSnapshot)return;
    const ticket=++generation,snapshot={...lastSnapshot};
    if(!connected){advisory('<p>Перевіряю доступ до пам’яті…</p>');await connect();if(ticket!==generation||!connected)return;}
    lastResult=null;
    advisory('<p>Шукаю схожі попередні аналізи…</p>');
    try{
      const result=await call('/memory/hints',{snapshot});if(ticket!==generation)return;
      lastResult=result;advisory(reportHtml());
      const saved=await call('/memory/observe',{snapshot});if(ticket!==generation)return;
      by('memoryStatus').textContent=saved.saved?'Автоматична пам’ять підключена. Поточний аналіз збережено для майбутніх рекомендацій.':'Підказки отримано. Ваш ключ дозволяє лише читання; поточний аналіз не збережено.';
    }catch(e){if(ticket!==generation)return;by('memoryStatus').textContent=e.message;advisory((lastResult?reportHtml():'')+`<p>Пам’ять: ${esc(e.message)} Поточний рейтинг розраховано без змін.</p>`);}
  }
  function reset(){invalidate();lastData=null;by('memoryStatus').textContent='';panel.classList.add('hidden');}
  function load(data,url){reset();lastData=data;api=url;panel.classList.remove('hidden');by('memoryStatus').textContent=connected?'Пам’ять підключена. Після розрахунку аналіз збережеться автоматично.':'Пам’ять підключається автоматично після входу.';void connect();}
  function observe(snapshot){
    const date=lastData?.buyer_history_as_of||lastData?.tender_announcement_date;
    if(!/^\d{4}-\d{2}-\d{2}/.test(date||'')){advisory('<p>Пам’ять не використано: немає підтвердженої дати оголошення.</p>');return;}
    lastSnapshot={...snapshot,analysisAsOf:date.slice(0,10)+'T00:00:00Z'};void process();
  }
  async function connect(){
    if(connected||!api)return;
    if(authPromise)return authPromise;
    authPromise=(async()=>{try{await call('/memory/status',{});connected=true;by('memoryStatus').textContent='Пам’ять підключена автоматично.';}catch(e){by('memoryStatus').textContent=e.message;advisory('<p>'+esc(e.message)+'</p>');}finally{authPromise=null;}})();
    return authPromise;
  }
  window.addEventListener('pagehide',()=>{generation++;connected=false;lastResult=null;advisory('');});
  async function session(){try{
    const r=await fetch('/session',{headers:{Accept:'application/json'}});if(!r.ok){window.location.assign('/login');return;}
    const user=await r.json();by('sessionName').textContent=user.name+(user.shared?' · спільний тестовий профіль':'');
  }catch{by('sessionName').textContent='Не вдалося перевірити сесію. Оновіть сторінку.';}}
  void session();
  window.Euro5MemoryUI={load,reset,observe,invalidate,reportHtml};
})();
