const test=require('node:test'),assert=require('node:assert/strict');
test('AI适配器只有服务端持有密钥，剔除额外输入并校验输出',async()=>{
 const {generateRecommendations}=await import('../server/recommendations.mjs');let sent;
 const result=await generateRecommendations({intent:'想散步',journals:[{date:'2026-10-16',text:'喜欢小路',token:'do-not-send'}],key:'do-not-send'},
 {endpoint:'https://example.invalid/chat/completions',apiKey:'server-secret',model:'fixture',fetchImpl:async(url,options)=>{sent=options;return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify({recommendations:[{title:'看看街角',detail:'选择方便安全的小路，走五分钟；免费。',reason:'想出门走走'}]})}}]}));}});
 assert.equal(result.recommendations.length,1);assert.equal(sent.headers.Authorization,'Bearer server-secret');assert.ok(!sent.body.includes('do-not-send'));assert.ok(!JSON.stringify(result).includes('server-secret'));
});
test('未认证、无持久化额度、超额均不得调用付费模型',async()=>{
 const {createHandler}=await import('../server/recommendations.mjs');let calls=0;
 const config={endpoint:'https://example.invalid/chat/completions',apiKey:'secret',model:'fixture'},fetchImpl=async()=>{calls++;throw Error('must not call');};
 const request=()=>new Request('https://example.invalid/api/recommend',{method:'POST',body:JSON.stringify({intent:'',journals:[]})});
 assert.equal((await createHandler({config,fetchImpl})(request())).status,503);
 assert.equal((await createHandler({config,fetchImpl,authorize:async()=>null,reserveQuota:async()=>true})(request())).status,401);
 assert.equal((await createHandler({config,fetchImpl,authorize:async()=>({id:'A'}),reserveQuota:async()=>false})(request())).status,429);
 assert.equal(calls,0);
});
test('模型输出异常返回通用错误，不泄漏上游信息',async()=>{
 const {createHandler}=await import('../server/recommendations.mjs');
 const handler=createHandler({config:{endpoint:'https://example.invalid/chat/completions',apiKey:'secret',model:'fixture'},authorize:async()=>({id:'A'}),reserveQuota:async()=>true,fetchImpl:async()=>new Response('private diagnostic',{status:500})});
 const response=await handler(new Request('https://example.invalid/api/recommend',{method:'POST',body:JSON.stringify({intent:'',journals:[]})}));
 assert.equal(response.status,502);assert.deepEqual(await response.json(),{error:'GENERATION_UNAVAILABLE'});
});
