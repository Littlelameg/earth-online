(() => {
  const core=window.EarthLifeCore;
  let scope=()=>window.EarthAccount?.scope()||'guest';
  let activeScope=scope(), editorBase=null, editorId=null, search='', suggestions=[], requestId=0;
  const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
  const draftKey=()=>`earth-draft-v1:${encodeURIComponent(scope())}`;
  const current=()=>WorldCore.clone(state);
  function commit(next){
    try{next=WorldCore.validate(next);if(window.EarthAccount){window.EarthAccount.save(next);state=window.EarthAccount.current();}else{localStorage.setItem(key,JSON.stringify(next));state=next;}render();return true;}
    catch(e){toast(e.message==='MERGE_CONFLICT'?'这条记录在另一页面发生了修改。草稿仍保留，请先核对。':'保存没有完成，内容仍在编辑框里。请先复制备份。');return false;}
  }
  const nav=document.createElement('button');nav.dataset.page='journal';nav.innerHTML='✎ <span>随手记</span>';nav.onclick=()=>go('journal');$('nav').append(nav);
  const page=document.createElement('section');page.id='journal';page.className='page';page.hidden=true;
  page.innerHTML='<p class="eyebrow">A PLACE FOR YOUR WORDS</p><div class="section-title"><h1>随手记</h1><button class="text-button" id="backup-panel">备份与恢复</button></div><p class="muted">日记、备忘、忽然冒出的想法，都可以留在这里。</p><form id="journal-form" class="journal-editor"><label class="sr-only" for="journal-text">写一条记录</label><textarea id="journal-text" maxlength="12000" rows="6" placeholder="此刻想记下什么？"></textarea><div class="journal-options"><label>记录日期<input id="journal-date" type="date" required></label><label class="check-label"><input id="journal-ai" type="checkbox">允许用于 AI 生活推荐</label></div><p class="footnote">默认仅保存，不自动变成任务或提醒。允许后，近期内容可在你生成推荐时发送给配置的 AI 服务。</p><div class="modal-actions"><button class="primary" type="submit" id="journal-submit">保存记录</button><button type="button" id="journal-cancel" hidden>取消编辑</button><span id="draft-status" role="status"></span></div></form><label class="journal-search">找一条记录<input id="journal-search" type="search" placeholder="搜索日记与备忘"></label><div id="journal-list"></div>';
  $('main').insertBefore(page,$('footer'));
  const oldGo=go;go=function(name){if(name==='journal'){document.querySelectorAll('.page').forEach(p=>p.hidden=p.id!=='journal');document.querySelectorAll('nav button').forEach(b=>{b.classList.toggle('active',b===nav);if(b===nav)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});history.replaceState(null,'','#journal');window.scrollTo({top:0,behavior:'instant'});}else oldGo(name);};
  const oldRender=render;render=function(){oldRender();renderRecords();renderTasks();};
  function restoreDraft(){
    editorId=null;editorBase=null;$('#journal-text').value='';$('#journal-date').value=today();$('#journal-ai').checked=false;
    $('#journal-submit').textContent='保存记录';$('#journal-cancel').hidden=true;$('#draft-status').textContent='';
    try{const d=JSON.parse(localStorage.getItem(draftKey())||'null');if(d&&typeof d.text==='string'){
      $('#journal-text').value=d.text;$('#journal-date').value=d.date||today();$('#journal-ai').checked=d.allowAI===true;
      editorId=d.id||null;editorBase=d.base||null;$('#journal-cancel').hidden=!editorId;$('#journal-submit').textContent=editorId?'保存修改':'保存记录';$('#draft-status').textContent='已恢复本机草稿';
    }}catch{$('#draft-status').textContent='草稿无法读取，请先检查备份';}
  }
  function draft(){try{localStorage.setItem(draftKey(),JSON.stringify({id:editorId,base:editorBase,text:$('#journal-text').value,date:$('#journal-date').value,allowAI:$('#journal-ai').checked}));$('#draft-status').textContent='草稿已保存在本机';}catch{$('#draft-status').textContent='草稿未能保存，请复制内容备份';}}
  $('#journal-form').addEventListener('input',draft);
  $('#journal-cancel').onclick=()=>{try{localStorage.removeItem(draftKey());restoreDraft();}catch{toast('未能清除草稿。');}};
  $('#journal-form').onsubmit=e=>{
    e.preventDefault();const text=$('#journal-text').value.trim();if(!text)return;
    const next=current();next.journals ||= [];
    if(editorId&&!WorldCore.equal(next.journals.find(j=>j.id===editorId),editorBase)){toast('原记录已被修改或移走。请复制当前草稿后重新打开记录。');return;}
    const entry={id:editorId||uid(),text,date:$('#journal-date').value,updatedAt:new Date().toISOString(),allowAI:$('#journal-ai').checked};
    next.journals=[entry,...next.journals.filter(j=>j.id!==entry.id)];
    if(commit(next)){try{localStorage.removeItem(draftKey());}catch{}restoreDraft();$('#draft-status').textContent='记录已保存';suggestions=[];renderTasks();}
  };
  $('#journal-search').oninput=e=>{search=e.target.value;renderRecords();};
  function renderRecords(){
    const entries=(state.journals||[]).filter(j=>j.text.toLowerCase().includes(search.toLowerCase())).slice().sort((a,b)=>b.date.localeCompare(a.date)||b.updatedAt.localeCompare(a.updatedAt));
    $('#journal-list').innerHTML=entries.length?entries.map(j=>`<article class="entry journal-entry"><div><span class="card-tag">${esc(j.date)} · ${j.allowAI?'可用于 AI 推荐':'仅保存'}</span><p>${esc(j.text)}</p></div><div class="entry-actions"><button data-edit-j="${j.id}">编辑</button><button data-delete-j="${j.id}">移走</button><button data-memory-j="${j.id}">留作岛上回忆</button></div></article>`).join(''):'<div class="empty"><p>这里可以安静地放下几句话。</p></div>';
    page.querySelectorAll('[data-edit-j]').forEach(b=>b.onclick=()=>{
      if($('#journal-text').value.trim()){toast('请先保存或清空当前草稿，再编辑另一条。');return;}
      const j=state.journals.find(j=>j.id===b.dataset.editJ);editorId=j.id;editorBase=WorldCore.clone(j);
      $('#journal-text').value=j.text;$('#journal-date').value=j.date;$('#journal-ai').checked=j.allowAI;$('#journal-submit').textContent='保存修改';$('#journal-cancel').hidden=false;draft();$('#journal-text').focus();
    });
    page.querySelectorAll('[data-delete-j]').forEach(b=>b.onclick=()=>{
      const owner=scope();modal('<h2>移走这条记录？</h2><p>之后的推荐不会再使用它。此前已生成的任务和已保存的岛上回忆会保留，可以分别移走。</p><button class="primary" id="delete-journal">确认移走</button>');
      $('#delete-journal').onclick=()=>{if(scope()!==owner)return;const next=current();next.journals=next.journals.filter(j=>j.id!==b.dataset.deleteJ);if(commit(next)){suggestions=[];renderTasks();$('#modal').close();}};
    });
    page.querySelectorAll('[data-memory-j]').forEach(b=>b.onclick=()=>{const j=state.journals.find(j=>j.id===b.dataset.memoryJ);memoryForm(j.text.split('\n')[0].slice(0,80));});
  }
  $('#backup-panel').onclick=()=>{
    modal('<h2>把记录留在自己手里</h2><p>导出期待、足迹、日记和已保存任务。恢复时只合并记录，不清空现有内容；同一条记录有不同版本时会停止，供你核对。</p><button class="primary" id="download-backup">导出备份</button><label>选择备份文件<input type="file" id="restore-file" accept=".json,application/json"></label><div id="restore-preview" role="status"></div>');
    $('#download-backup').onclick=()=>window.EarthAccount?.exportWorld();
    $('#restore-file').onchange=async e=>{
      const file=e.target.files[0],owner=scope();if(!file)return;
      try{if(file.size>1500000)throw Error();const imported=core.backup(await file.text(),WorldCore);
        if(scope()!==owner)return;
        WorldCore.importGuest(current(),imported);
        $('#restore-preview').innerHTML=`<p>备份包含 ${imported.wishes.length} 条期待、${imported.memories.length} 条足迹、${(imported.journals||[]).length} 条记录、${(imported.tasks||[]).length} 条任务。相同记录会去重。</p><button class="primary" id="confirm-restore">合并到当前世界</button>`;
        $('#confirm-restore').onclick=()=>{try{if(scope()!==owner)throw Error();const next=WorldCore.importGuest(current(),imported);if(commit(next)){$('#modal').close();toast('备份已合并到本机；云端状态请看页面底部。');}}catch{toast('记录存在冲突，尚未导入。请先导出当前备份核对。');}};
      }catch{$('#restore-preview').textContent='无法合并：文件格式、容量不符合要求，或与当前记录存在冲突。当前内容未改变。';}
    };
  };
  const ai=document.createElement('section');ai.className='association-ai';
  ai.innerHTML='<div class="section-title"><h2>此刻，想做点什么？</h2><button class="text-button" id="ai-settings">AI 连接</button></div><label class="sr-only" for="club-intent">告诉协会你现在的想法</label><textarea id="club-intent" rows="2" maxlength="500" placeholder="只有十分钟，想出门，但不想花钱……"></textarea><p class="footnote" id="ai-disclosure"></p><button class="primary" id="generate-tasks">找一些生活可能</button><p id="ai-status" role="status"></p><div id="ai-suggestions" class="cards"></div><div id="saved-tasks"></div>';
  $('#club').insertBefore(ai,$('#filters'));
  function renderTasks(){
    const config=window.EARTH_AI||{}, count=core.context(state,'').journals.length;
    $('#ai-disclosure').textContent=config.endpoint&&config.provider?`点击生成会向 ${config.provider}（${config.model||'已配置模型'}）发送上面的想法，以及最近 30 天内允许使用的最多 6 条记录（当前 ${count} 条，每条最多 1500 字）。`:'AI 服务尚未配置。精选提案仍可浏览；你的记录不会因此发送给外部服务。';
    $('#ai-suggestions').innerHTML=suggestions.map((p,i)=>`<article class="card"><div class="card-body"><span class="card-tag">AI 生活提案 · 可自由调整</span><h3>${esc(p.title)}</h3><p>${esc(p.reason)}</p><p class="task-detail">${esc(p.detail)}</p><div class="modal-actions"><button data-save-task="${i}">留到以后</button><button data-hide-task="${i}">暂不适合</button></div></div></article>`).join('');
    ai.querySelectorAll('[data-hide-task]').forEach(b=>b.onclick=()=>{suggestions.splice(Number(b.dataset.hideTask),1);renderTasks();});
    ai.querySelectorAll('[data-save-task]').forEach(b=>b.onclick=()=>{const p=suggestions[Number(b.dataset.saveTask)],next=current();next.tasks ||= [];if(!next.tasks.some(t=>t.title===p.title&&t.detail===p.detail))next.tasks.unshift({...p,id:uid(),date:new Date().toISOString(),status:'saved'});if(commit(next))toast('提案已保存，换一批也不会丢失。');});
    const tasks=(state.tasks||[]).filter(t=>t.status!=='dismissed');
    $('#saved-tasks').innerHTML=tasks.length?'<h2>留给自己的可能</h2>'+tasks.map(t=>`<article class="entry"><div><span class="card-tag">${{saved:'留到以后',trying:'想试试',done:'已经体验'}[t.status]}</span><h3>${esc(t.title)}</h3><p class="task-detail">${esc(t.detail)}</p></div><div class="entry-actions">${t.status==='saved'?`<button data-task-status="trying" data-id="${t.id}">想试试</button>`:''}${t.status!=='done'?`<button data-task-status="done" data-id="${t.id}">已经体验</button>`:''}<button data-task-memory="${t.id}">记录经历</button><button data-task-status="dismissed" data-id="${t.id}">不再计划</button></div></article>`).join(''):'';
    ai.querySelectorAll('[data-task-status]').forEach(b=>b.onclick=()=>{const next=current();next.tasks.find(t=>t.id===b.dataset.id).status=b.dataset.taskStatus;commit(next);});
    ai.querySelectorAll('[data-task-memory]').forEach(b=>b.onclick=()=>{const t=state.tasks.find(t=>t.id===b.dataset.taskMemory);memoryForm(t.title,t.id);});
  }
  $('#ai-settings').onclick=()=>modal('<h2>AI 连接</h2><p>平台服务配置完成后，可在协会主动生成推荐。日记保存时不会调用 AI。</p><p>用户自配 API 的页面将在后续加入。请不要把密钥写进日记或聊天。</p>');
  $('#generate-tasks').onclick=async()=>{
    const config=window.EARTH_AI||{},status=$('#ai-status');
    if(!config.endpoint||!config.provider){status.textContent='还未配置真实 AI 服务。下面是编辑精选提案，不是 AI 分析结果。';return;}
    let url;try{url=new URL(config.endpoint,location.origin);if(url.origin!==location.origin)throw Error();}catch{status.textContent='AI 接口配置无效，请检查同站点服务配置。';return;}
    const owner=scope(),request=++requestId,body=core.context(state,$('#club-intent').value),controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),25000);$('#generate-tasks').disabled=true;status.textContent='正在寻找一些适合此刻的可能…';
    try{
      const response=await fetch(url,{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:controller.signal});
      if(!response.ok)throw Error();const data=await response.json(),items=core.recommendations(data.recommendations);
      if(scope()!==owner||request!==requestId||!WorldCore.equal(body,core.context(state,body.intent)))return;
      suggestions=items;renderTasks();status.textContent='不合适就略过，也可以换个想法再试。';
    }catch{if(scope()===owner&&request===requestId)status.textContent='这次没能生成，请稍后再试。记录和已保存任务没有改变。';}
    finally{clearTimeout(timeout);$('#generate-tasks').disabled=false;}
  };
  window.addEventListener('earth-world-loaded',()=>{if(scope()!==activeScope){activeScope=scope();requestId++;suggestions=[];restoreDraft();$('#club-intent').value='';$('#ai-status').textContent='';}renderRecords();renderTasks();});
  restoreDraft();renderRecords();renderTasks();if(location.hash==='#journal')go('journal');
})();
