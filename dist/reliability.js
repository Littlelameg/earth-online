(() => {
  const owner=()=>EarthAccount.scope();
  function recoveryPanel(){
    const scope=owner();let entries;
    try{entries=EarthAccount.recovery();}catch{toast('暂时无法读取最近移走的记录。');return;}
    modal('<h2>最近移走</h2><p class="footnote">从本版本开始保留移走的记录，仅保存在操作时的这个浏览器，按账号隔离。不会自动清空，也不包含在普通世界备份中。恢复不会覆盖同名编号的新版本。</p><div id="recovery-list"></div><p id="recovery-status" role="status"></p>');
    $('#recovery-list').innerHTML=entries.length?entries.map(e=>`<article class="entry"><div><span class="card-tag">${esc({wishes:'期待',memories:'足迹',journals:'随手记',tasks:'协会收藏'}[e.kind]||'记录')} · ${esc(String(e.removedAt||'').slice(0,10))}</span><h3>${esc(String(e.item?.title||e.item?.text||'记录').slice(0,80))}</h3></div><button data-recover="${esc(e.id)}">恢复</button></article>`).join(''):'<p>这里还没有移走的记录。</p>';
    $('#recovery-list').querySelectorAll('[data-recover]').forEach(b=>b.onclick=()=>{if(owner()!==scope){$('#modal').close();return;}try{EarthAccount.restoreRemoved(b.dataset.recover);b.textContent='已恢复';b.disabled=true;$('#recovery-status').textContent='已恢复到本机，云端状态请看页面底部。恢复副本仍保留。';}catch(e){$('#recovery-status').textContent=e.message==='MERGE_CONFLICT'?'当前已有不同版本，未覆盖。请先导出当前备份核对。':'恢复未完成，原恢复副本仍保留。';}});
  }
  for(const id of ['wishes','memories','journal']){const button=document.createElement('button');button.className='text-button';button.textContent='最近移走';button.onclick=recoveryPanel;$('#'+id).append(button);}
  const testButton=document.createElement('button');testButton.className='text-button';testButton.textContent='用虚构场景试运行';$('#club').append(testButton);
  let controller;
  testButton.onclick=()=>{
    const scope=owner();
    modal('<h2>试试 AI 是否听懂当下</h2><p>只发送下方的虚构场景和编辑候选，不发送日记，不修改你的提案。每次运行会调用一次你配置的模型，按服务商规则计费。</p><label>测试场景<select id="quality-scenario"><option value="0">很累 · 不出门 · 不花钱</option><option value="1">半小时 · 零预算 · 想探索</option><option value="2">喜欢音乐 · 不想社交 · 手腕不舒服</option></select></label><button class="primary" id="run-quality">运行一次</button><button id="cancel-quality" hidden>取消</button><p id="quality-status" role="status"></p><div id="quality-output"></div>');
    const scenarios=['【虚构测试，不代表用户本人】今天很累，只有5分钟，不想出门、不想社交，也不想花钱。给少量不需要准备的选择。','【虚构测试，不代表用户本人】有30分钟，预算0元，想探索一点新鲜事，不想购物。不要编造本地活动或店铺。','【虚构测试，不代表用户本人】喜欢音乐，今天不想社交，手腕不舒服，不想做手工或运动。给一些轻松的生活可能，不要诊断或治疗建议。'];
    $('#cancel-quality').onclick=()=>controller?.abort();
    $('#run-quality').onclick=async()=>{
      const status=$('#quality-status'),output=$('#quality-output'),button=$('#run-quality'),cancel=$('#cancel-quality');
      let config;try{config=JSON.parse(localStorage.getItem('earth-ai-local-v1:'+encodeURIComponent(scope))||'null');if(!config)throw Error();}catch{status.textContent='请先在 AI 连接里配置服务。';return;}
      controller=new AbortController();const active=controller,started=Date.now(),timer=setTimeout(()=>active.abort(),60000);
      button.disabled=true;cancel.hidden=false;status.textContent='正在试运行，不使用日记…';output.innerHTML='';
      try{const data=await EarthAIClient.request(config,{intent:scenarios[Number($('#quality-scenario').value)],journals:[],editorialCandidates:EarthEditorialContext()},{signal:active.signal});const items=EarthLifeCore.recommendations(data.recommendations);
        if(owner()!==scope||!output.isConnected)return;
        output.innerHTML=items.map(p=>`<article class="entry"><div><h3>${esc(p.title)}</h3><p>${esc(p.detail)}</p><p class="footnote">${esc(p.reason)}</p></div></article>`).join('');status.textContent=`已返回 ${items.length} 条，耗时 ${Math.round((Date.now()-started)/1000)} 秒。请核对时间、预算、精力和意愿；格式通过不代表内容一定合适。`;
      }catch(e){if(owner()===scope&&status.isConnected)status.textContent=active.signal.aborted?'已停止等待，原提案没有变化。服务商可能已开始计费。':EarthAIClient.error(e);}finally{clearTimeout(timer);button.disabled=false;cancel.hidden=true;}
    };
  };
  $('#modal').addEventListener('close',()=>controller?.abort());
})();
