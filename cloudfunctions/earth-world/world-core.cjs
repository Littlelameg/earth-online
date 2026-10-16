(function(root){
  const empty=()=>({wishes:[],memories:[],evening:false});
  const clone=x=>JSON.parse(JSON.stringify(x));
  // PostgreSQL jsonb may reorder object keys; array order still matters.
  function equal(a,b){
    if(a===b)return true;
    if(!a||!b||typeof a!=='object'||typeof b!=='object')return false;
    if(Array.isArray(a)!==Array.isArray(b))return false;
    if(Array.isArray(a))return a.length===b.length&&a.every((value,i)=>equal(value,b[i]));
    const keys=Object.keys(a);
    return keys.length===Object.keys(b).length&&keys.every(key=>Object.prototype.hasOwnProperty.call(b,key)&&equal(a[key],b[key]));
  }
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
    for(const kind of ['journals','tasks']){
      if(world[kind]===undefined)continue;
      if(!Array.isArray(world[kind])||world[kind].length>2000)throw Error('WORLD_LIMIT');
      const ids=new Set();
      clean[kind]=world[kind].map(item=>{
        if(!item||typeof item.id!=='string'||!/^[A-Za-z0-9_-]{1,100}$/.test(item.id)||ids.has(item.id))throw Error('INVALID_ID');
        ids.add(item.id);
        const fields=kind==='journals'?{text:12000,date:10,updatedAt:30}:{title:80,detail:3000,date:30,status:20,reason:300};
        const out={id:item.id};
        for(const [field,max] of Object.entries(fields)){
          if(typeof item[field]!=='string'||item[field].length>max)throw Error('INVALID_FIELD');
          out[field]=item[field];
        }
        if(kind==='journals'){
          if(!out.text.trim()||!/^\d{4}-\d{2}-\d{2}$/.test(out.date)||!Number.isFinite(Date.parse(out.updatedAt))||typeof item.allowAI!=='boolean')throw Error('INVALID_JOURNAL');
          out.allowAI=item.allowAI;
        }else if(!out.title.trim()||!['saved','trying','done','dismissed'].includes(out.status))throw Error('INVALID_TASK');
        return out;
      });
    }
    if(JSON.stringify(clean).length>350000)throw Error('WORLD_LIMIT');
    return clean;
  }
  function merge(base,local,remote){
    base=validate(base);local=validate(local);remote=validate(remote);
    const result=empty();
    for(const kind of ['wishes','memories','journals','tasks']){
      if(![base,local,remote].some(w=>w[kind]!==undefined))continue;
      result[kind]=[];
      const maps=[base,local,remote].map(w=>new Map((w[kind]||[]).map(x=>[x.id,x])));
      const ids=new Set([...(local[kind]||[]),...(remote[kind]||[]),...(base[kind]||[])].map(x=>x.id));
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
    for(const kind of ['wishes','memories','journals','tasks']){
      if(guest[kind]===undefined)continue;
      out[kind] ||= [];
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
