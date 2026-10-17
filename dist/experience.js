(() => {
  const E=window.EarthExperience;
  function commit(next){try{next=WorldCore.validate(next);if(window.EarthAccount){EarthAccount.save(next);state=EarthAccount.current();}else{localStorage.setItem(key,JSON.stringify(next));state=next;}render();return true;}catch{toast('保存未完成，请保留页面后重试。');return false;}}
  const skipKey=()=>`earth-skipped-editorial:${encodeURIComponent(window.EarthAccount?.scope()||'guest')}`;
  function skipped(){try{return JSON.parse(sessionStorage.getItem(skipKey())||'[]');}catch{return [];}}
  function hideSkipped(){const ids=new Set(skipped());document.querySelectorAll('[data-detail]').forEach(b=>{if(ids.has(b.dataset.detail))b.closest('article').hidden=true;});}
  const priorCards=renderCards;renderCards=function(){priorCards();hideSkipped();};
  const memoryId=w=>'tried_'+(w.source||w.id);
  const priorRender=render;
  render=function(){priorRender();renderExperiences();};
  function renderExperiences(){
    // Existing saved tasks are presented alongside wishes without rewriting cloud data on page load.
    hideSkipped();
    const wishes=[...state.wishes,...(state.tasks||[]).filter(t=>['saved','trying'].includes(t.status)&&!state.wishes.some(w=>w.source===t.id)).map(t=>({id:'wish_'+t.id,title:t.title,source:t.id,date:''}))];
    $('#wish-count').textContent=wishes.length;
    if(wishes.length)$('#wish-list').innerHTML=wishes.map(w=>{
      const task=(state.tasks||[]).find(t=>t.id===w.source),proposal=proposals.find(p=>p.id===w.source),done=state.memories.some(m=>m.id===memoryId(w));
      return `<article class="entry"><div><span class="card-tag">${w.source?'来自协会 · ':''}${esc(w.date||'某个想出发的日子')}</span><h3>${esc(w.title)}</h3>${task||proposal?`<p class="task-detail">${esc(task?.detail||proposal.detail)}</p>`:''}${task?`<p class="footnote">${esc(task.reason)}</p>`:''}</div><div class="entry-actions"><button data-experience="${w.id}" ${done?'disabled':''}>${done?'已留下足迹':'我试过了'}</button><button data-forget="${w.id}">移走</button></div></article>`;
    }).join('');
    $('#wish-list').querySelectorAll('[data-experience]').forEach(b=>b.onclick=()=>{const w=wishes.find(w=>w.id===b.dataset.experience);const next=WorldCore.clone(state);if(!next.wishes.some(x=>x.id===w.id))next.wishes.unshift(w);if(commit(E.tried(next,w,new Date().toLocaleDateString('zh-CN'))))toast('已留下足迹，可在生活足迹中撤销。');});
    $('#wish-list').querySelectorAll('[data-forget]').forEach(b=>b.onclick=()=>{const w=wishes.find(w=>w.id===b.dataset.forget),next=WorldCore.clone(state);next.wishes=next.wishes.filter(x=>x.id!==w.id);const t=(next.tasks||[]).find(t=>t.id===w.source);if(t)t.status='dismissed';if(commit(next))toast('已从期待中移走，已有足迹会保留。');});
    // Old done tasks without a memory remain visible until the user chooses to record them.
    const legacy=(state.tasks||[]).filter(t=>t.status==='done'&&!state.memories.some(m=>E.source(m)===t.id));
    if(state.memories.length||legacy.length)$('#memory-list').innerHTML=state.memories.map(m=>`<article class="entry"><div><span class="card-tag">${esc(m.date||'某一天')} · ${E.pinned(m)?'已留在岛上':'生活足迹'}</span><h3>${esc(m.title)}</h3><p>${esc(m.note||'')}</p></div><div class="entry-actions"><button data-pin="${m.id}">${E.pinned(m)?'从岛上收起':'留在岛上'}</button>${m.id.startsWith('tried_')?`<button data-undo-experience="${m.id}">撤销试过</button>`:`<button data-remove-memory="${m.id}">移走</button>`}</div></article>`).join('')+legacy.map(t=>`<article class="entry"><div><span class="card-tag">此前标记为已体验</span><h3>${esc(t.title)}</h3></div><button data-legacy="${t.id}">留下足迹</button></article>`).join('');
    $('#memory-list').querySelectorAll('[data-pin]').forEach(b=>b.onclick=()=>commit(E.pin(state,b.dataset.pin)));
    $('#memory-list').querySelectorAll('[data-undo-experience]').forEach(b=>b.onclick=()=>{if(commit(E.undo(state,b.dataset.undoExperience)))toast('已撤销，期待仍可继续保留。');});
    $('#memory-list').querySelectorAll('[data-remove-memory]').forEach(b=>b.onclick=()=>removeEntry('memories',b.dataset.removeMemory));
    $('#memory-list').querySelectorAll('[data-legacy]').forEach(b=>b.onclick=()=>{const t=state.tasks.find(t=>t.id===b.dataset.legacy);commit(E.tried(state,{id:t.id,title:t.title,source:t.id},new Date().toLocaleDateString('zh-CN')));});
  }
  detail=function(id){
    const p=proposals.find(p=>p.id===id),saved=state.wishes.some(w=>w.source===id),done=state.memories.some(m=>m.id==='tried_'+id);
    modal(`<p class="eyebrow">协会生活提案 · ${esc(p.tag)}</p><h2>${esc(p.title)}</h2><p>${esc(p.detail)}</p><p class="footnote">${esc(p.context||'不设期限，按自己的步调尝试。')}</p><div class="modal-actions"><button id="collect" class="primary">${saved?'看看我的期待':'留到以后'}</button><button id="experienced" ${done?'disabled':''}>${done?'已留下足迹':'我试过了'}</button><button id="skip-proposal">略过</button></div>`);
    $('#collect').onclick=()=>{if(saved){$('#modal').close();go('wishes');return;}const next=WorldCore.clone(state);next.wishes.unshift({id:uid(),title:p.title,date:'',source:id});if(commit(next)){$('#modal').close();toast('已放进我的期待。');}};
    $('#experienced').onclick=()=>{if(commit(E.tried(state,{id,title:p.title,source:id},new Date().toLocaleDateString('zh-CN')))){$('#modal').close();toast('已留下足迹，可在生活足迹中撤销。');}};
    $('#skip-proposal').onclick=()=>{try{sessionStorage.setItem(skipKey(),JSON.stringify([...new Set([...skipped(),id]) ]));}catch{}$('#modal').close();document.querySelectorAll(`[data-detail="${id}"]`).forEach(b=>b.closest('article').hidden=true);};
  };
  // Writing a memory is a deliberate action, separate from one-click experience.
  memoryForm=function(title='',source='',wishId=''){
    modal(`<h2>留下一件小事</h2><form id="memory-form"><label>发生了什么<input name="title" required maxlength="80" value="${esc(title)}"></label><label>想记下的话（选填）<textarea name="note" maxlength="1000"></textarea></label><p class="footnote">先留下足迹，之后可以自己选择是否留在岛上。</p><button class="primary" type="submit">保存足迹</button></form>`);
    $('#memory-form').onsubmit=e=>{e.preventDefault();const f=new FormData(e.target),text=String(f.get('title')).trim();if(!text)return;const next=WorldCore.clone(state);next.memories.unshift({id:uid(),title:text,note:String(f.get('note')).trim(),date:new Date().toLocaleDateString('zh-CN'),source:'foot:'+source});if(commit(next)){$('#modal').close();toast('足迹已保存。');}};
  };
  $('#home-info').onclick=()=>modal('<h2>这里藏着你愿意珍藏的生活。</h2><p>试过一件事，先留下一条足迹。想让小岛记住它时，再去生活足迹选择“留在岛上”。</p><p>离开多久，这里都不会荒芜。</p>');
  const sources=document.createElement('button');sources.className='text-button';sources.textContent='关于这些生活提案';
  sources.onclick=()=>modal('<h2>一些可选择的生活可能</h2><p>当前精选提案由地球 Online 原创编写，标注时间、花费和适用情境，供你自由取舍。AI 可以据此调整，也可以提供其他想法。</p><p>整理方式参考 <a href="https://github.com/eternity4719/HowToLiveBetter" target="_blank" rel="noopener noreferrer">HowToLiveBetter</a> 的成本、适用条件与出处意识，以及 <a href="https://github.com/Anduin2017/HowToCook" target="_blank" rel="noopener noreferrer">HowToCook</a> 的具体步骤表达。没有直接复制它们的正文，提案也不代表研究证实的效果。</p>');
  $('#club').append(sources);
  render();
})();
