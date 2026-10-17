// A quiet loop: possibility → anticipation → lived moment → a personal trace.
let energy='rest';
const traceNames={walk:'那条小路',food:'野餐垫',draw:'天空画板',plant:'一盆新绿',letter:'庭院小灯',sound:'窗边风铃',other:'小花园'};
const moodPicks={rest:['draw','sound'],outside:['walk','plant'],fresh:['food','letter']};
const originalRender=render;
render=function(){originalRender();renderJourney();};
const originalCards=renderCards;
renderCards=function(){originalCards();renderSuggestions();};
function renderSuggestions(){
  const ids=moodPicks[energy];
  $('#home-cards').innerHTML=ids.map(id=>card(proposals.find(p=>p.id===id))).join('');
  $('#home-cards').querySelectorAll('[data-detail]').forEach(b=>b.onclick=()=>detail(b.dataset.detail));
}
function traceFor(source){return traceNames[source]||traceNames.other;}
function readTrace(source){
  const moments=state.memories.filter(m=>!String(m.source||'').startsWith('foot:')&&(traceNames[m.source]?m.source:'other')===source);
  modal(`<p class="eyebrow">这里藏着你的生活</p><h2>${traceFor(source)}</h2><p>物件会留下，日子也会。</p><div class="trace-moments">${moments.map(m=>`<article><span class="card-tag">${esc(m.date||'某一天')}</span><h3>${esc(m.title)}</h3><p>${esc(m.note||'那天的心情，不写下来也属于你。')}</p></article>`).join('')}</div>`);
}
function renderJourney(){
  if(!$('#mood-picker'))return;
  const groups=[...new Set(state.memories.filter(m=>!String(m.source||'').startsWith('foot:')).map(m=>traceNames[m.source]?m.source:'other'))];
  $('#trace-list').innerHTML=groups.length?groups.map(s=>`<button class="trace-chip" data-trace="${s}">✧ ${traceFor(s)} <span>翻开回忆 ↗</span></button>`).join(''):'<p class="muted">这里还没有故事。等生活发生，再慢慢留下。</p>';
  $('#trace-list').querySelectorAll('[data-trace]').forEach(b=>b.onclick=()=>readTrace(b.dataset.trace));
  const positions={walk:[25,67],food:[47,70],draw:[34,52],plant:[53,57],letter:[56,56],sound:[41,50],other:[42,76]};
  $('#trace-hotspots').innerHTML=groups.map(s=>`<button class="trace-dot" style="--x:${positions[s][0]}%;--y:${positions[s][1]}%" data-trace="${s}" aria-label="翻开${traceFor(s)}的回忆" title="${traceFor(s)}">✧</button>`).join('');
  $('#trace-hotspots').querySelectorAll('[data-trace]').forEach(b=>b.onclick=()=>readTrace(b.dataset.trace));
  const waiting=state.wishes[0];
  $('#waiting-note').innerHTML=waiting?`<span>♡ 给未来留着</span><button id="peek-wish">${esc(waiting.title)} <span>↗</span></button>`:'<span>不用安排好每一天。有一点期待，就很好。</span>';
  if($('#peek-wish'))$('#peek-wish').onclick=()=>go('wishes');
}
detail=function(id){
  const p=proposals.find(p=>p.id===id), wish=state.wishes.find(w=>w.source===id);
  modal(`<p class="eyebrow">一份生活提议 · ${p.tag}</p><h2>${p.title}</h2><div class="card-art" style="border-radius:10px">${art(p)}</div><p>${p.detail}</p><p class="footnote">想试试，就先留着。等它真的发生，小岛会留下${p.trace}，收藏时不会增加物件。</p><div class="modal-actions"><button class="primary" id="collect">${wish?'看看这份期待':'♡ 哪天想试试'}</button><button class="text-button" id="experienced">这件事已经发生了</button></div>`);
  $('#collect').onclick=()=>{
    if(wish){$('#modal').close();go('wishes');return;}
    state.wishes.unshift({id:uid(),title:p.title,date:'',source:id});save();
    modal(`<p class="eyebrow">给未来留一点空位</p><h2>这份期待，先放在这里。</h2><p>${esc(p.title)}</p><p>不用选日期，也没有提醒。哪天想起它，再出发。</p><div class="modal-actions"><button class="primary" id="see-wishes">看看我的期待</button><button class="text-button" id="keep-wandering">继续随便逛逛</button></div>`);
    $('#see-wishes').onclick=()=>{$('#modal').close();go('wishes');};
    $('#keep-wandering').onclick=()=>$('#modal').close();
  };
  $('#experienced').onclick=()=>memoryForm(p.title,id,wish?.id||'');
};
memoryForm=function(title='',source='',wishId=''){
  modal(`<p class="eyebrow">一个属于你的时刻</p><h2>${wishId?'原来，它真的发生了。':'留下一件小事'}</h2><form id="memory-form"><label>发生了什么<input name="title" required maxlength="80" value="${esc(title)}" placeholder="今天的天空是粉色的"></label><label>有哪个瞬间，想留给以后？（选填）<textarea name="note" rows="3" maxlength="1000" placeholder="一句话就好。不想写，也可以。"></textarea></label><p class="footnote">不需要照片或证明。这段经历会留在${traceFor(source)}里。</p><button class="primary" type="submit">留在我的世界里</button></form>`);
  $('#memory-form').onsubmit=e=>{
    e.preventDefault();const f=new FormData(e.target),title=String(f.get('title')).trim();
    if(!title){toast('写下几个字，就可以留下这个时刻。');return;}
    state.memories.unshift({id:uid(),title,note:String(f.get('note')).trim(),source,date:new Date().toLocaleDateString('zh-CN')});
    if(wishId)state.wishes=state.wishes.filter(w=>w.id!==wishId);
    save();
    const trace=traceNames[source]?source:'other';
    modal(`<p class="eyebrow">生活在这里留下了痕迹</p><h2>${traceFor(source)}，有了你的故事。</h2><p>${esc(title)}</p><p>以后点开它，就能回到这个时刻。</p><div class="modal-actions"><button class="primary" id="return-world">回小岛看看</button><button class="text-button" id="read-new-trace">翻开这段回忆</button></div>`);
    $('#return-world').onclick=()=>{$('#modal').close();go('world');const dot=$(`#trace-hotspots [data-trace="${trace}"]`);dot?.focus({preventScroll:true});};
    $('#read-new-trace').onclick=()=>readTrace(trace);
  };
};
$('#mood-picker').onclick=e=>{
  const b=e.target.closest('[data-mood]');if(!b)return;
  energy=b.dataset.mood;
  $('#mood-picker').querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));
  $('#mood-note').textContent={rest:'留在原地，也能遇到一点小小的新鲜。',outside:'从方便抵达的地方开始，不必走远。',fresh:'给熟悉的日子，留一个不同的可能。'}[energy];
  renderSuggestions();
};
$('#home-info').onclick=()=>modal('<h2>这里藏着你的生活。</h2><p>期待先收在心里。等一件小事真的发生，再让小岛留下它的痕迹。</p><p>点开闪光的物件，可以翻回自己的经历。离开多久，这里都不会荒芜。</p>');
render();
