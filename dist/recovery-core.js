(function(root){
  const kinds=['wishes','memories','journals','tasks'];
  function removed(before,after){return kinds.flatMap(kind=>(before[kind]||[]).filter(item=>!(after[kind]||[]).some(x=>x.id===item.id)||(kind==='tasks'&&item.status!=='dismissed'&&(after.tasks||[]).some(x=>x.id===item.id&&x.status==='dismissed'))).map(item=>({kind,item,related:(before.tasks||[]).find(t=>t.id===String(item.source||'').replace(/^foot:/,''))||null})));}
  function restore(world,entry,core){
    if(!kinds.includes(entry.kind))throw Error('INVALID_RECOVERY');
    const clean=core.validate({...core.empty(),[entry.kind]:[entry.item]}),item=clean[entry.kind][0],next=core.clone(world);
    next[entry.kind] ||= [];const existing=next[entry.kind].find(x=>x.id===item.id);
    if(existing&&!core.equal(existing,item)){if(entry.kind==='tasks'&&existing.status==='dismissed'&&core.equal({...existing,status:item.status},item))existing.status=item.status;else throw Error('MERGE_CONFLICT');}
    if(!existing)next[entry.kind].unshift(item);
    if(entry.related){
      const task=core.validate({...core.empty(),tasks:[entry.related]}).tasks[0];next.tasks ||= [];
      const current=next.tasks.find(t=>t.id===task.id);
      if(!current)next.tasks.unshift(task);
      else if(current.status==='dismissed'&&core.equal({...current,status:task.status},task))current.status=task.status;
    }
    return core.validate(next);
  }
  const api={removed,restore};if(typeof module==='object')module.exports=api;else root.EarthRecoveryCore=api;
})(typeof globalThis==='object'?globalThis:this);
