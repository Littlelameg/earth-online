const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const Core=require('../dist/world-core.js');
const accountSource=fs.readFileSync(require.resolve('../dist/account.js'),'utf8');
const world=id=>({...Core.empty(),wishes:id?[{id,title:id,date:''}]:[]});
function fixture({storage=new Map(),id='A',remote=world(),configured=true}={}){
  const elements=new Map(),events=[],handlers={};let callback,offline=false,calls=0,revision=0;
  const element=selector=>{if(!elements.has(selector))elements.set(selector,{textContent:'',innerHTML:'',open:false,showModal(){this.open=true},close(){this.open=false}});return elements.get(selector)};
  const session={user:{id,email:id+'@example.invalid'}};
  const api={session:async()=>session,watch:fn=>callback=fn,signOut:async()=>callback('SIGNED_OUT'),world:async data=>{
    calls++;if(offline)throw Error('NETWORK');
    if(data.action==='write'){if(data.revision!==revision)return {ok:true,conflict:true,world:remote,revision};remote=Core.clone(data.world);revision++;}
    return {ok:true,world:Core.clone(remote),revision};
  }};
  const window={WorldCore:Core,EARTH_CLOUDBASE:{env:configured?'fixture':'',region:'ap-shanghai'},createEarthCloud:()=>api,addEventListener:(type,fn)=>handlers[type]=fn,dispatchEvent:e=>events.push(e)};
  const document={querySelector:element,addEventListener:(type,fn)=>handlers[type]=fn};
  vm.runInNewContext(accountSource,{window,document,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail}},setTimeout,Date,Promise,Blob,URL});
  return {window,storage,events,element,offline:()=>offline=true,get remote(){return remote},get calls(){return calls},signout:()=>callback('SIGNED_OUT')};
}
async function settle(f,text){for(let i=0;i<100;i++){if(f.element('#storage-info').textContent===text)return;await new Promise(r=>setTimeout(r,2));}throw Error('Did not settle: '+f.element('#storage-info').textContent)}
test('未配置环境不加载云端、不假登录；游客记录保存在本地',()=>{
  const f=fixture({configured:false});f.window.EarthAccount.save(world('guest'));
  assert.equal(f.calls,0);assert.equal(JSON.parse(f.storage.get('earth-online-v1')).wishes[0].id,'guest');
  f.window.EarthAccount.panel();assert.match(f.element('#modal-content').innerHTML,/尚未开通/);
});
test('登录只读取当前账号，游客记录等待用户主动合并',async()=>{
  const storage=new Map([['earth-online-v1',JSON.stringify(world('guest'))]]);
  const f=fixture({storage,remote:world('cloud')});await settle(f,'已同步到云端');
  assert.equal(f.remote.wishes.length,1);assert.equal(f.remote.wishes[0].id,'cloud');
  assert.equal(JSON.parse(storage.get('earth-online-v1')).wishes[0].id,'guest');
});
test('网络失败时保留账号待同步缓存，重开后可以同步',async()=>{
  const f=fixture();await settle(f,'已同步到云端');f.offline();f.window.EarthAccount.save(world('pending'));
  await settle(f,'本机已保存 · 尚未同步');assert.equal(f.remote.wishes.length,0);
  const reopened=fixture({storage:f.storage});await settle(reopened,'已同步到云端');assert.equal(reopened.remote.wishes[0].id,'pending');
});
test('账号A缓存不迁移给账号B，退出显示游客世界',async()=>{
  const storage=new Map([['earth-online-v1',JSON.stringify(world('guest'))]]);
  const a=fixture({storage,id:'A'});await settle(a,'已同步到云端');a.window.EarthAccount.save(world('privateA'));await settle(a,'已同步到云端');
  const b=fixture({storage,id:'B'});await settle(b,'已同步到云端');assert.equal(b.remote.wishes.length,0);
  b.signout();const last=b.events.filter(e=>e.type==='earth-world-loaded').at(-1);assert.equal(last.detail.wishes[0].id,'guest');
});
