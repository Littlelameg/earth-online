const test=require('node:test');
const assert=require('node:assert/strict');
const Core=require('../dist/world-core.js');
const {createHandler}=require('../cloudfunctions/earth-world/handler.cjs');
const wish=(id,title=id)=>({id,title,date:''});
function world(wishes=[],memories=[]){return {...Core.empty(),wishes,memories};}
test('游客记录与云端记录合并；重复导入幂等',()=>{
  const remote=world([wish('remote')]),guest=world([wish('guest')]);
  const merged=Core.importGuest(remote,guest);
  assert.equal(merged.wishes.length,2);assert.deepEqual(Core.importGuest(merged,guest),merged);
  assert.equal(remote.wishes.length,1);
});
test('不同设备新增的记录都保留',()=>{
  const merged=Core.merge(world(),world([wish('a')]),world([wish('b')]));
  assert.deepEqual(merged.wishes.map(x=>x.id),['a','b']);
});
test('远端删除不会被未修改的旧缓存复活',()=>{
  const base=world([wish('a')]);assert.deepEqual(Core.merge(base,base,world()),world());
});
test('本地删除保留远端新记录',()=>{
  assert.deepEqual(Core.merge(world([wish('a')]),world(),world([wish('a'),wish('b')])),world([wish('b')]));
});
test('同一条记录的并发修改阻止覆盖',()=>{
  assert.throws(()=>Core.merge(world([wish('a')]),world([wish('a','本地')]),world([wish('a','远端')])),/MERGE_CONFLICT/);
});
test('发送期间新增的记录不会被返回结果清掉',()=>{
  const sent=world([wish('a')]),latest=world([wish('b'),wish('a')]);
  assert.deepEqual(Core.merge(sent,latest,sent),latest);
});
test('校验拒绝重复ID、超长内容、无效结构并丢弃额外字段',()=>{
  assert.throws(()=>Core.validate(world([wish('a'),wish('a')])),/INVALID_ID/);
  assert.throws(()=>Core.validate(world([wish('a','x'.repeat(81))])),/INVALID_TITLE/);
  assert.throws(()=>Core.validate({wishes:[],memories:[]}),/INVALID_WORLD/);
  assert.deepEqual(Core.validate({...world(),token:'secret'}),world());
});
function backend(){
  const records=new Map();let current={uid:'user-a',isAnonymous:false};
  const app={auth:()=>({getUserInfo:()=>current,getEndUserInfo:async uid=>({userInfo:{uid,email:'test@example.invalid'}})}),database:()=>({runTransaction:async fn=>fn({collection:()=>({doc:id=>({get:async()=>({data:records.get(id)}),set:async value=>records.set(id,value)})})})})};
  return {handler:createHandler(app),switchUser:user=>current=user,records};
}
test('服务端拒绝未登录及匿名调用',async()=>{
  const b=backend();b.switchUser({});assert.equal((await b.handler({action:'read'})).code,'UNAUTHENTICATED');
  b.switchUser({uid:'anon',isAnonymous:true});assert.equal((await b.handler({action:'read'})).code,'UNAUTHENTICATED');
});
test('服务端以认证上下文隔离账号，忽略客户端伪造 uid',async()=>{
  const b=backend();await b.handler({action:'write',revision:0,world:world([wish('a')]),uid:'user-b'});
  b.switchUser({uid:'user-b',isAnonymous:false});assert.deepEqual((await b.handler({action:'read',uid:'user-a'})).world,world());
  b.switchUser({uid:'user-a',isAnonymous:false});assert.equal((await b.handler({action:'read'})).world.wishes[0].id,'a');
});
test('旧版本写入返回冲突与新快照，不覆盖云端',async()=>{
  const b=backend();await b.handler({action:'write',revision:0,world:world([wish('a')])});
  const response=await b.handler({action:'write',revision:0,world:world([wish('b')])});
  assert.equal(response.conflict,true);assert.equal(response.revision,1);assert.equal(response.world.wishes[0].id,'a');
  assert.equal((await b.handler({action:'read'})).world.wishes[0].id,'a');
});
test('无效输入不会写入数据库',async()=>{
  const b=backend();assert.equal((await b.handler({action:'write',revision:-1,world:world()})).code,'INVALID_REVISION');
  assert.equal((await b.handler({action:'write',revision:0,world:world([wish('../x')])})).code,'INVALID_ID');assert.equal(b.records.size,0);
});
