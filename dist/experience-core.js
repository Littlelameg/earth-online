(function(root){
  const clone=x=>JSON.parse(JSON.stringify(x));
  const pinned=m=>!String(m.source||'').startsWith('foot:');
  const source=m=>String(m.source||'').replace(/^foot:/,'');
  function collect(world,proposal,id,date){
    const w=clone(world);w.tasks ||= [];
    let t=w.tasks.find(t=>t.title===proposal.title&&t.detail===proposal.detail);
    if(!t){t={...proposal,id,date,status:'saved'};w.tasks.unshift(t);}else if(t.status==='dismissed')t.status='saved';
    if(!w.wishes.some(x=>x.source===t.id))w.wishes.unshift({id:'wish_'+t.id,title:t.title,date:'',source:t.id});
    return w;
  }
  function tried(world,{id,title,source:origin=''},date){
    const w=clone(world),memoryId='tried_'+(origin||id);
    if(!w.memories.some(m=>m.id===memoryId))w.memories.unshift({id:memoryId,title,date,note:'',source:'foot:'+origin});
    const t=(w.tasks||[]).find(t=>t.id===origin);if(t)t.status='done';
    return w;
  }
  function undo(world,memoryId){
    const w=clone(world),m=w.memories.find(m=>m.id===memoryId);if(!m)return w;
    const t=(w.tasks||[]).find(t=>t.id===source(m));if(t)t.status=w.wishes.some(wish=>wish.source===t.id)?'saved':'dismissed';
    w.memories=w.memories.filter(m=>m.id!==memoryId);return w;
  }
  function pin(world,id){const w=clone(world),m=w.memories.find(m=>m.id===id);if(m)m.source=pinned(m)?'foot:'+source(m):source(m);return w;}
  const api={pinned,source,collect,tried,undo,pin};
  if(typeof module==='object')module.exports=api;else root.EarthExperience=api;
})(typeof globalThis==='object'?globalThis:this);
