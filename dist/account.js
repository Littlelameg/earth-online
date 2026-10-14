(() => {
  const Core=window.WorldCore, config=window.EARTH_CLOUDBASE;
  const guestKey='earth-online-v1';
  let cloud, session=null, account=null, syncing=false, status='', cooldown=0, verifier=null, email='', activating=false;
  const cacheKey=id=>'earth-online-account-v1:'+encodeURIComponent(id);
  const read=(key,fallback)=>{const raw=localStorage.getItem(key);return raw?JSON.parse(raw):fallback;};
  const write=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const emit=world=>window.dispatchEvent(new CustomEvent('earth-world-loaded',{detail:Core.clone(world)}));
  function guest(){return Core.validate(read(guestKey,Core.empty()));}
  function cache(){if(account)write(cacheKey(account.id),account);}
  function updateStatus(){
    document.querySelector('#account-button').textContent=session?'我的账号':'保存我的世界';
    if(status)document.querySelector('#storage-info').textContent=status;
  }
  function setStatus(text){status=text;updateStatus();}
  function errorText(e){
    const message=String(e?.message||'');
    if(message==='MERGE_CONFLICT')return '两台设备修改了同一条记录，暂未覆盖。请先导出本机备份，再核对记录。';
    if(message==='ACCOUNT_CHANGED')return '登录状态已变化，请重新登录。本机待同步记录已保留。';
    if(message==='WORLD_LIMIT')return '记录超过当前版本的同步容量，请先导出备份。';
    return '暂时没能连接云端，请稍后重试。本机记录会保留。';
  }
  function show(html){document.querySelector('#modal-content').innerHTML=html;const d=document.querySelector('#modal');if(!d.open)d.showModal();}
  function escape(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function notify(text){window.dispatchEvent(new CustomEvent('earth-notice',{detail:text}));}
  async function ensureCloud(){
    if(!config?.env)throw Error('NOT_CONFIGURED');
    if(!cloud){
      if(!window.createEarthCloud){await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='vendor/cloudbase.js';script.onload=resolve;script.onerror=()=>{script.remove();reject(Error('SDK_UNAVAILABLE'));};document.head.append(script);});}
      cloud=window.createEarthCloud(config);
      cloud.watch((event,next)=>{
        if(event==='SIGNED_OUT'||(event==='SIGNED_IN'&&account&&String(next?.user?.id)!==account.id)){
          session=null;account=null;emit(guest());setStatus('登录状态已变化 · 点击重新连接');
          if(document.querySelector('#modal').open)document.querySelector('#modal').close();
        }
      });
    }
    return cloud;
  }
  async function checkedWorld(data,id){
    const active=await cloud.session();
    if(!active||String(active.user.id)!==id)throw Error('ACCOUNT_CHANGED');
    return cloud.world(data);
  }
  async function activate(next){
    if(!next?.user?.id)throw Error('SESSION_MISSING');
    activating=true;
    try{
      const id=String(next.user.id), remote=await checkedWorld({action:'read'},id);
      const cached=read(cacheKey(id),null);
      const world=cached?Core.merge(cached.base,cached.world,remote.world):Core.validate(remote.world);
      const candidate={id,world,base:remote.world,revision:remote.revision};
      write(cacheKey(id),candidate);
      session=next;account=candidate;emit(world);setStatus('已连接 · 正在核对记录');
      await sync();
    }finally{activating=false;}
  }
  async function sync(){
    if(!account||syncing)return false;
    syncing=true;const id=account.id;
    setStatus('正在同步…');
    try{
      let remote=await checkedWorld({action:'read'},id);
      for(let attempts=0;attempts<4;attempts++){
        if(!account||account.id!==id)throw Error('ACCOUNT_CHANGED');
        const merged=Core.merge(account.base,account.world,remote.world);
        account={...account,base:Core.validate(remote.world),world:merged,revision:remote.revision};cache();emit(merged);
        if(Core.equal(merged,remote.world)){setStatus('已同步到云端');return true;}
        const sent=Core.clone(merged);
        const result=await checkedWorld({action:'write',revision:remote.revision,world:sent},id);
        if(!account||account.id!==id)throw Error('ACCOUNT_CHANGED');
        if(result.conflict){remote=result;continue;}
        // Changes made while the request was in flight remain pending.
        const latest=Core.merge(sent,account.world,result.world);
        account={...account,base:result.world,world:latest,revision:result.revision};cache();emit(latest);
        if(Core.equal(latest,result.world)){setStatus('已同步到云端');return true;}
        remote=result;
      }
      setStatus('本机已保存 · 点击重试同步');return false;
    }catch(e){setStatus('本机已保存 · 尚未同步');notify(errorText(e));return false;}
    finally{syncing=false;}
  }
  function save(world){
    world=Core.validate(world);
    if(account){const next={...account,world};write(cacheKey(account.id),next);account=next;setStatus('本机已保存 · 等待同步');void sync();}
    else {write(guestKey,world);setStatus('记录保存在此浏览器');}
  }
  function exportWorld(){
    const world=account?account.world:guest();
    const url=URL.createObjectURL(new Blob([JSON.stringify({format:'earth-online-backup-v1',exportedAt:new Date().toISOString(),world},null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='地球Online-我的世界.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function panel(){
    if(!config?.env){
      show('<h2>先把小世界留在身边。</h2><p>云端保存尚未开通。目前的期待和足迹只保存在此浏览器，换设备暂时看不到。</p><p>可以先导出一份备份，继续安心体验。</p><button class="primary" id="export-world">导出我的世界</button>');
    }else if(session&&account){
      let local;try{local=guest();}catch{local=Core.empty();}
      const hasGuest=local.wishes.length+local.memories.length>0;
      show(`<h2>我的世界，随身带着。</h2><p>${escape(session.user.email||'已登录')}</p><p id="account-status" role="status">${escape(status)}</p>${hasGuest?'<p>此浏览器还有游客阶段的记录，可以合并到当前账号。</p><button class="primary" id="import-guest">合并本机游客记录</button>':''}<div class="modal-actions"><button class="primary" id="retry-sync">同步最新记录</button><button class="text-button" id="export-world">导出备份</button></div><button class="text-button" id="sign-out">退出账号</button><p class="footnote">退出后显示游客世界。未同步的记录仍按账号保留在本机，下次登录同一账号可继续同步。</p>`);
      document.querySelector('#retry-sync').onclick=async e=>{e.target.disabled=true;await sync();panel();};
      if(hasGuest)document.querySelector('#import-guest').onclick=async e=>{
        e.target.disabled=true;
        try{
          if(syncing)throw Error('SYNC_BUSY');
          const snapshot=guest();save(Core.importGuest(account.world,snapshot));
          // save starts asynchronous synchronization; do not clear the guest copy until it finishes.
          while(syncing)await new Promise(r=>setTimeout(r,100));
          if(Core.equal(account.world,account.base)&&Core.equal(guest(),snapshot)){write(guestKey,Core.empty());notify('游客记录已合并并保存到云端。');}
          else notify('游客原件仍保留，确认同步成功后可再次合并。');
        }catch(e){notify(errorText(e));}panel();
      };
      document.querySelector('#sign-out').onclick=async e=>{
        e.target.disabled=true;
        if(syncing){notify('正在同步，请稍后再退出。');e.target.disabled=false;return;}
        try{await cloud.signOut();session=null;account=null;emit(guest());setStatus('记录保存在此浏览器');document.querySelector('#modal').close();}
        catch{notify('退出未完成，请重试。');e.target.disabled=false;}
      };
    }else{
      show('<h2>保存我的世界</h2><p>用邮箱验证码登录，就能在手机和电脑接着生活。首次使用会自动创建账号。</p><form id="email-form"><label>邮箱<input id="login-email" type="email" autocomplete="email" maxlength="254" required placeholder="你的邮箱地址"></label><button type="submit" class="primary">发送验证码</button><p id="login-message" role="status" aria-live="polite"></p></form><p class="footnote">邮箱将发送给腾讯云用于身份验证。登录后，你可以选择合并本机游客记录。</p>');
      document.querySelector('#email-form').onsubmit=async e=>{
        e.preventDefault();const button=e.target.querySelector('button'), message=document.querySelector('#login-message');
        if(Date.now()<cooldown){message.textContent='请稍后再发送，或查看上一封验证码邮件。';return;}
        button.disabled=true;email=document.querySelector('#login-email').value.trim();message.textContent='正在发送…';
        try{const api=await ensureCloud();verifier=await api.send(email);cooldown=Date.now()+60000;otpPanel();}
        catch{message.textContent='暂时未能发送验证码，请检查网络或稍后再试。';button.disabled=false;}
      };
    }
    const exportButton=document.querySelector('#export-world');if(exportButton)exportButton.onclick=exportWorld;
  }
  function otpPanel(){
    show(`<h2>看看你的邮箱</h2><p>验证码已发送至 ${escape(email)}。也请检查垃圾邮件。</p><form id="otp-form"><label>6 位验证码<input id="login-otp" inputmode="numeric" autocomplete="one-time-code" pattern="[0-9]{6}" minlength="6" maxlength="6" required></label><button class="primary" type="submit">验证并进入我的世界</button><p id="login-message" role="status" aria-live="polite"></p></form><button class="text-button" id="send-again">重新发送验证码</button><button class="text-button" id="change-email">换一个邮箱</button>`);
    document.querySelector('#otp-form').onsubmit=async e=>{
      e.preventDefault();const b=e.target.querySelector('button'),m=document.querySelector('#login-message');b.disabled=true;
      document.querySelector('#send-again').disabled=true;document.querySelector('#change-email').disabled=true;
      try{const next=await verifier(document.querySelector('#login-otp').value);m.textContent='邮箱已验证，正在连接你的世界…';await activate(next);verifier=null;panel();}
      catch(e){m.textContent=String(e.message).includes('SYNC')?'邮箱已验证，但云端记录暂不可用；本机记录未改动。请关闭后重试连接。':'验证或连接未完成，请检查验证码是否正确、是否过期，然后重试。';b.disabled=false;document.querySelector('#send-again').disabled=false;document.querySelector('#change-email').disabled=false;}
    };
    document.querySelector('#send-again').onclick=async e=>{
      const m=document.querySelector('#login-message');
      if(Date.now()<cooldown){m.textContent=`请在 ${Math.ceil((cooldown-Date.now())/1000)} 秒后重试。`;return;}
      e.target.disabled=true;try{verifier=await cloud.send(email);cooldown=Date.now()+60000;m.textContent='新验证码已发送，请使用最新的一封。';}catch{m.textContent='发送未完成，请稍后重试。';}e.target.disabled=false;
    };
    document.querySelector('#change-email').onclick=()=>{verifier=null;panel();};
  }
  window.EarthAccount={save,updateStatus,panel};
  document.querySelector('#account-button').onclick=async()=>{
    if(config?.env&&!session){try{await ensureCloud();const existing=await cloud.session();if(existing)await activate(existing);}catch(e){notify(errorText(e));}}
    panel();
  };
  document.querySelector('#storage-info').onclick=panel;
  window.addEventListener('online',()=>void sync());
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)void sync();});
  // Avoid two tabs silently overwriting the same browser cache.
  window.addEventListener('storage',e=>{if(e.key===(account?cacheKey(account.id):guestKey)){
    if(account){try{const next=read(cacheKey(account.id),null);if(next){account=next;emit(account.world);}}catch{notify('另一页面更新了记录，请导出备份后刷新。');}}
    else {try{emit(guest());}catch{notify('本机记录暂时无法读取。');}}
  }});
  if(config?.env){void (async()=>{try{await ensureCloud();const existing=await cloud.session();if(existing)await activate(existing);}catch{setStatus('云端暂未连接 · 本机记录保留');}})();}
  updateStatus();
})();
