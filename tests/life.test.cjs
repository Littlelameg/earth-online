const test=require('node:test'),assert=require('node:assert/strict');
const W=require('../dist/world-core.js'),L=require('../dist/life-core.js');
const journal=(id,text='一段记录',allowAI=false)=>({id,text,allowAI,date:'2026-10-16',updatedAt:'2026-10-16T01:00:00.000Z'});
test('旧备份导入保持原记录，日记与任务可往返恢复',()=>{
 const old=W.empty();old.wishes.push({id:'wish',title:'散步'});
 const restored=L.backup(JSON.stringify({format:'earth-online-backup-v1',world:old}),W);
 const latest={...W.empty(),journals:[journal('a')],tasks:[{id:'t',title:'小路',detail:'走走',reason:'想出门',date:'2026-10-16',status:'saved'}]};
 const merged=W.importGuest(restored,latest);
 assert.equal(merged.wishes.length,1);assert.equal(merged.journals.length,1);
 assert.deepEqual(L.backup(JSON.stringify({format:'earth-online-backup-v2',world:merged}),W),merged);
 assert.deepEqual(W.importGuest(merged,latest),merged);
});
test('日记并发编辑、同ID备份冲突均拒绝静默覆盖',()=>{
 const base={...W.empty(),journals:[journal('a')]};
 assert.throws(()=>W.merge(base,{...base,journals:[journal('a','本机修改')]},{...base,journals:[journal('a','另一台修改')]}),/MERGE_CONFLICT/);
 assert.throws(()=>W.importGuest(base,{...base,journals:[journal('a','备份修改')]}),/MERGE_CONFLICT/);
 assert.equal(W.merge(base,{...base,journals:[]},base).journals.length,0);
});
test('AI上下文排除未授权、过期、未来记录，限条数和长度，不带身份或密钥',()=>{
 const now=Date.parse('2026-10-16T12:00:00Z');
 const data={...W.empty(),journals:[journal('private'),{...journal('old','旧',true),date:'2020-01-01'},{...journal('future','未来',true),date:'2030-01-01'},...Array.from({length:10},(_,i)=>journal('j'+i,'a'.repeat(2000),true))],apiKey:'secret'};
 const out=L.context(data,'想法',now);assert.equal(out.journals.length,6);assert.ok(out.journals.every(j=>j.text.length===1500));assert.equal(out.apiKey,undefined);assert.ok(!JSON.stringify(out).includes('private'));
});
test('非法备份和模型输出在提交前拒绝',()=>{
 assert.throws(()=>L.backup('{',W));assert.throws(()=>L.backup(JSON.stringify({format:'other',world:W.empty()}),W));
 assert.throws(()=>W.validate({...W.empty(),journals:[{...journal('a'),allowAI:'yes'}]}));
 assert.throws(()=>L.recommendations([{title:'标题',detail:123,reason:'原因'}]));
 assert.throws(()=>L.recommendations(Array(5).fill({title:'a',detail:'b',reason:'c'})));
 assert.deepEqual(L.recommendations([{title:'a',detail:'b',reason:'c',html:'<script>bad</script>'}]),[{title:'a',detail:'b',reason:'c'}]);
});
