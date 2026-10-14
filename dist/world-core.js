(function(root){
  const empty=()=>({wishes:[],memories:[],evening:false});
  const clone=x=>JSON.parse(JSON.stringify(x));
  const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
  function validate(world){
    if(!world||typeof world.evening!=='boolean')throw Error('INVALID_WORLD');
    const clean=empty();
    for(const kind of ['wishes','memories']){
      if(!Array.isArray(world[kind])||world[kind].length>2000)throw Error('WORLD_LIMIT');
      const seen=new Set();
      clean[kind]=world[kind].map(item=>{
        if(!item||typeof item.id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(item.id)||seen.has(item.id))throw Error('INVALID_ID');
        seen.add(item.id);
        if(typeof item.title!=='string'||!item.title.trim()||item.title.length>80)throw Error('INVALID_TITLE');
        const result={id:item.id,title:item.title};
        for(const field of ['date','source',...(kind==='memories'?['note']:[])]){
          if(item[field]!==undefined){if(typeof item[field]!=='string'||item[field].length>(field==='note'?1000:100))throw Error('INVALID_FIELD');result[field]=item[field];}
        }
        return result;
      });
    }
    clean.evening=world.evening;
    if(JSON.stringify(clean).length>350000)throw Error('WORLD_LIMIT');
    return clean;
  }
  function merge(base,local,remote){
    base=validate(base);local=validate(local);remote=validate(remote);
    const result=empty();
    for(const kind of ['wishes','memories']){
      const maps=[base,local,remote].map(w=>new Map(w[kind].map(x=>[x.id,x])));
      const ids=new Set([...local[kind],...remote[kind],...base[kind]].map(x=>x.id));
      for(const id of ids){
        const [b,l,r]=maps.map(m=>m.get(id));
        if(!equal(l,b)&&!equal(r,b)&&!equal(l,r))throw Error('MERGE_CONFLICT');
        const chosen=equal(l,b)?r:l;
        if(chosen)result[kind].push(clone(chosen));
      }
    }
    result.evening=local.evening===base.evening?remote.evening:local.evening;
    return validate(result);
  }
  function importGuest(remote,guest){
    const out=validate(remote);guest=validate(guest);
    for(const kind of ['wishes','memories']){
      const existing=new Map(out[kind].map(x=>[x.id,x]));
      for(const item of guest[kind]){
        if(existing.has(item.id)&&!equal(existing.get(item.id),item))throw Error('MERGE_CONFLICT');
        if(!existing.has(item.id))out[kind].unshift(clone(item));
      }
    }
    return validate(out);
  }
  const api={empty,clone,equal,validate,merge,importGuest};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.WorldCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
