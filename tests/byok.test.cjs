const {test}=require('node:test');
const assert=require('node:assert/strict');
const client=require('../dist/ai-client.js');
const config={endpoint:'https://api.deepseek.com/v1/',model:'example',apiKey:'fixture-only'};
test('normalizes base URLs and rejects unsafe destinations',()=>{
  assert.equal(client.normalize(config).endpoint,'https://api.deepseek.com/v1/chat/completions');
  assert.equal(client.normalize({...config,endpoint:'https://api.deepseek.com/chat/completions'}).endpoint,'https://api.deepseek.com/chat/completions');
  for(const endpoint of ['http://example.com','https://user:pass@example.com','https://example.com/?key=x'])assert.throws(()=>client.normalize({...config,endpoint}));
});
test('connection test omits journal context, cookies and redirects',async()=>{
  await client.request(config,{journals:[{text:'private diary'}]},{test:true,fetchImpl:async(url,options)=>{
    assert.equal(options.credentials,'omit');assert.equal(options.redirect,'error');
    assert.equal(options.referrerPolicy,'no-referrer');assert.equal(options.headers.Authorization,'Bearer fixture-only');
    assert.ok(!options.body.includes('private diary'));
    return new Response(JSON.stringify({choices:[{message:{content:'OK'}}]}));
  }});
});
test('does not expose upstream error bodies or keys',async()=>{
  await assert.rejects(client.request(config,{}, {fetchImpl:async()=>new Response('fixture-only',{status:401})}),{message:'AUTH'});
  await assert.rejects(client.request(config,{}, {fetchImpl:async()=>{throw Error('fixture-only');}}),{message:'NETWORK'});
});
test('parses JSON recommendations and rejects invalid responses',async()=>{
  const data={recommendations:[{title:'散步',detail:'五分钟',reason:'休息'}]};
  assert.deepEqual(await client.request(config,{}, {fetchImpl:async()=>new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(data)}}]}))}),data);
  await assert.rejects(client.request(config,{}, {fetchImpl:async()=>new Response('bad')}),{message:'FORMAT'});
});


test('DeepSeek推荐启用JSON模式，通用服务不强加专有参数，识别截断和空正文',async()=>{
 const data={recommendations:[{title:'看看窗外',detail:'1分钟',reason:'休息'}]};
 const respond=async(url,options)=>{const payload=JSON.parse(options.body);assert.deepEqual(payload.response_format,{type:'json_object'});return new Response(JSON.stringify({choices:[{message:{content:'  ```json\n'+JSON.stringify(data)+'\n```  '}}]}));};
 assert.deepEqual(await client.request(config,{}, {fetchImpl:respond}),data);
 await client.request({...config,endpoint:'https://example.com/v1'}, {}, {fetchImpl:async(url,options)=>{assert.equal(JSON.parse(options.body).response_format,undefined);return new Response(JSON.stringify({choices:[{message:{content:JSON.stringify(data)}}]}));}});
 await assert.rejects(client.request(config,{}, {fetchImpl:async()=>new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'{bad'}}]}))}),{message:'TRUNCATED'});
 await assert.rejects(client.request(config,{}, {fetchImpl:async()=>new Response(JSON.stringify({choices:[{message:{content:''}}]}))}),{message:'EMPTY'});
});
