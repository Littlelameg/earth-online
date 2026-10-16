(function(root){
  function context(world,intent,now=Date.now()){
    const journals=(world.journals||[]).filter(j=>j.allowAI&&now-Date.parse(j.date+'T12:00:00')<30*86400000&&Date.parse(j.date+'T00:00:00')<=now)
      .sort((a,b)=>b.date.localeCompare(a.date)).slice(0,6).map(j=>({date:j.date,text:j.text.slice(0,1500)}));
    return {intent:String(intent||'').trim().slice(0,500),journals};
  }
  function recommendations(value){
    if(!Array.isArray(value)||value.length<1||value.length>4)throw Error('INVALID_RECOMMENDATIONS');
    return value.map(item=>{
      const out={};
      for(const [key,max] of Object.entries({title:80,detail:3000,reason:300})){
        if(typeof item?.[key]!=='string'||!item[key].trim()||item[key].length>max)throw Error('INVALID_RECOMMENDATIONS');
        out[key]=item[key];
      }
      return out;
    });
  }
  function backup(text,core){
    if(text.length>1500000)throw Error('BACKUP_LIMIT');
    const data=JSON.parse(text);
    if(!['earth-online-backup-v1','earth-online-backup-v2'].includes(data?.format))throw Error('INVALID_BACKUP');
    return core.validate(data.world);
  }
  const api={context,recommendations,backup};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.EarthLifeCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
