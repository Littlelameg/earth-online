const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
function adapter(reply){
  const calls=[];
  const context={window:{},cloudbase:{init:()=>({auth:()=>({}),rdb:()=>({rpc:async(name,args)=>{calls.push({name,args});return reply;}})})}};
  vm.runInNewContext(fs.readFileSync('src/cloudbase-entry.js','utf8').replace("import cloudbase from '@cloudbase/js-sdk';",''),context);
  return {cloud:context.window.createEarthCloud({}),calls};
}
test('PG adapter uses RPC without accepting a caller-supplied owner identity',async()=>{
  const {cloud,calls}=adapter({data:{ok:true,revision:0,world:{}}});
  await cloud.world({action:'read',owner_uid:'someone-else'});
  assert.deepEqual(JSON.parse(JSON.stringify(calls)),[{name:'earth_world_sync',args:{p_action:'read',p_revision:null,p_world:null}}]);
});
test('PG adapter retains conflicts and surfaces auth and transport failures',async()=>{
  const result={ok:true,conflict:true,revision:4,world:{}};
  assert.equal(await adapter({data:result}).cloud.world({action:'write',revision:3,world:{}}),result);
  await assert.rejects(adapter({data:{ok:false,code:'UNAUTHENTICATED'}}).cloud.world({action:'read'}),/UNAUTHENTICATED/);
  await assert.rejects(adapter({error:Error('network')}).cloud.world({action:'read'}),/network/);
});
