const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs');
const Core=require('../dist/world-core.js');
const accountSource=fs.readFileSync(require.resolve('../dist/account.js'),'utf8');
const world=id=>({...Core.empty(),wishes:id?[{id,title:id,date:''}]:[]});
function fixture({storage=new Map(),id='A',remote=world(),configured=true,jsonb=false,initialOffline=false,server=null}={}){
  const elements=new Map(),events=[],handlers={};let callback,offline=initialOffline,calls=0,revision=0;
  const element=selector=>{if(!elements.has(selector))elements.set(selector,{textContent:'',innerHTML:'',open:false,showModal(){this.open=true},close(){this.open=false}});return elements.get(selector)};
  const session={user:{id,email:id+'@example.invalid'}};
  const api={session:async()=>session,watch:fn=>callback=fn,signOut:async()=>callback('SIGNED_OUT'),world:async data=>{
    calls++;if(offline)throw Error('NETWORK');if(server){remote=Core.clone(server.world);revision=server.revision;}
    if(data.action==='write'){if(data.revision!==revision)return {ok:true,conflict:true,world:remote,revision};remote=Core.clone(data.world);revision++;if(server){server.world=Core.clone(remote);server.revision=revision;}}
    const reorder=value=>Array.isArray(value)?value.map(reorder):value&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,reorder(value[key])])):value;
    return {ok:true,world:jsonb?reorder(remote):Core.clone(remote),revision};
  }};
  const window={WorldCore:Core,EarthRecoveryCore:require('../dist/recovery-core.js'),EARTH_CLOUDBASE:{env:configured?'fixture':'',region:'ap-shanghai'},createEarthCloud:()=>api,addEventListener:(type,fn)=>handlers[type]=fn,dispatchEvent:e=>events.push(e)};
  const document={querySelector:element,addEventListener:(type,fn)=>handlers[type]=fn};
  vm.runInNewContext(accountSource,{window,document,localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},CustomEvent:class {constructor(type,options){this.type=type;this.detail=options.detail}},setTimeout,Date,Promise,Blob,URL});
  return {window,storage,events,element,api,changeId:next=>{session.user.id=next;callback('SIGNED_IN',session);},offline:()=>offline=true,online:()=>{offline=false;handlers.online?.();},fire:type=>handlers[type]?.(),get remote(){return remote},get calls(){return calls},signout:()=>callback('SIGNED_OUT')};
}
async function settle(f,text){for(let i=0;i<100;i++){if(f.element('#storage-info').textContent===text)return;await new Promise(r=>setTimeout(r,2));}throw Error('Did not settle: '+f.element('#storage-info').textContent)}

test('PostgreSQL JSON 字段重排后正常结束同步，不反复写入',async()=>{
  const f=fixture({jsonb:true});await settle(f,'已同步到云端');
  assert.equal(f.calls,2);
  f.window.EarthAccount.save(world('jsonb-record'));await settle(f,'已同步到云端');
  assert.equal(f.calls,4);assert.equal(f.remote.wishes[0].id,'jsonb-record');
});

test('内容比较忽略对象字段顺序，但保留数组顺序及实际修改',()=>{
  assert.ok(Core.equal({id:'a',title:'A'},{title:'A',id:'a'}));
  assert.ok(!Core.equal([1,2],[2,1]));
  assert.ok(!Core.equal({title:'A'},{title:'B'}));
  assert.ok(!Core.equal({id:'a'},{id:'a',note:''}));
});
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
test('保存前合并另一标签页已写入的记录',async()=>{
  const f=fixture();await settle(f,'已同步到云端');
  const key='earth-online-account-v1:A',disk=JSON.parse(f.storage.get(key));
  disk.world=world('other-tab');f.storage.set(key,JSON.stringify(disk));
  f.window.EarthAccount.save(world('this-tab'));await settle(f,'已同步到云端');
  assert.deepEqual(new Set(f.remote.wishes.map(x=>x.id)),new Set(['other-tab','this-tab']));
});


test('有有效账号会话时断网重开仍可读写缓存，联网后恢复同步',async()=>{
  const first=fixture();await settle(first,'已同步到云端');first.window.EarthAccount.save(world('cached'));await settle(first,'已同步到云端');
  const reopened=fixture({storage:first.storage,initialOffline:true,remote:world('cached')});await settle(reopened,'本机记录已打开 · 尚未连接云端');
  assert.equal(reopened.window.EarthAccount.scope(),'A');assert.equal(reopened.window.EarthAccount.current().wishes[0].id,'cached');
  reopened.window.EarthAccount.save({...world('cached'),memories:[{id:'offline',title:'离线足迹',source:'foot:',date:'今天'}]});await settle(reopened,'本机已保存 · 尚未同步');
  reopened.online();await settle(reopened,'已同步到云端');assert.equal(reopened.remote.memories[0].id,'offline');
});

test('两台独立缓存并发添加不丢记录，同条修改冲突不静默覆盖',async()=>{
  const server={world:world(),revision:0},a=fixture({server}),b=fixture({server});await settle(a,'已同步到云端');await settle(b,'已同步到云端');
  a.window.EarthAccount.save(world('a'));b.window.EarthAccount.save(world('b'));await settle(a,'已同步到云端');await settle(b,'已同步到云端');
  assert.deepEqual(new Set(server.world.wishes.map(w=>w.id)),new Set(['a','b']));
  a.fire('online');b.fire('online');await settle(a,'已同步到云端');await settle(b,'已同步到云端');a.offline();b.offline();
  const aw=a.window.EarthAccount.current(),bw=b.window.EarthAccount.current();aw.wishes.find(w=>w.id==='a').title='版本甲';bw.wishes.find(w=>w.id==='a').title='版本乙';
  a.window.EarthAccount.save(aw);b.window.EarthAccount.save(bw);await settle(a,'本机已保存 · 尚未同步');await settle(b,'本机已保存 · 尚未同步');
  a.online();await settle(a,'已同步到云端');b.online();await settle(b,'本机已保存 · 尚未同步');
  assert.equal(server.world.wishes.find(w=>w.id==='a').title,'版本甲');assert.equal(b.window.EarthAccount.current().wishes.find(w=>w.id==='a').title,'版本乙');
});

test('移走先保存恢复副本，恢复副本按账号隔离',async()=>{
 const a=fixture();await settle(a,'已同步到云端');a.window.EarthAccount.save(world('recover'));await settle(a,'已同步到云端');a.window.EarthAccount.save(world());await settle(a,'已同步到云端');
 const entries=a.window.EarthAccount.recovery();assert.equal(entries[0].item.id,'recover');a.window.EarthAccount.restoreRemoved(entries[0].id);await settle(a,'已同步到云端');assert.equal(a.remote.wishes[0].id,'recover');
 const b=fixture({storage:a.storage,id:'B'});await settle(b,'已同步到云端');assert.equal(b.window.EarthAccount.recovery().length,0);
});


test('恢复副本写入失败时阻止删除，原记录保持',()=>{
 const f=fixture({configured:false});f.window.EarthAccount.save(world('keep'));
 const original=f.storage.set.bind(f.storage);f.storage.set=(key,value)=>{if(key.startsWith('earth-recovery'))throw Error('QUOTA');return original(key,value);};
 assert.throws(()=>f.window.EarthAccount.save(world()),/QUOTA/);assert.equal(f.window.EarthAccount.current().wishes[0].id,'keep');
});

test('同步读取途中切换账号，不把旧账号结果显示到新会话',async()=>{
 const f=fixture();await settle(f,'已同步到云端');const original=f.api.world;let release;const gate=new Promise(r=>release=r);
 f.api.world=async data=>{await gate;return original(data);};f.window.EarthAccount.save(world('privateA'));f.changeId('B');release();await new Promise(r=>setTimeout(r,20));
 assert.equal(f.window.EarthAccount.scope(),'guest');assert.equal(f.window.EarthAccount.current().wishes.length,0);assert.equal(f.remote.wishes.length,0);
});
