const {test}=require('node:test'),assert=require('node:assert/strict');
const R=require('../dist/recovery-core.js'),W=require('../dist/world-core.js');
test('恢复日记保留授权状态，重复恢复不重复插入，冲突不覆盖',()=>{
 const a={...W.empty(),journals:[{id:'j',text:'记录',date:'2026-10-17',updatedAt:'2026-10-17T00:00:00Z',allowAI:false}]};
 const [entry]=R.removed(a,W.empty());const b=R.restore(W.empty(),entry,W);
 assert.equal(b.journals[0].allowAI,false);assert.equal(R.restore(b,entry,W).journals.length,1);
 b.journals[0].text='新版本';assert.throws(()=>R.restore(b,entry,W),/MERGE_CONFLICT/);assert.equal(b.journals[0].text,'新版本');
});
test('旧版虚拟收藏被移走也可恢复，提案内容不会丢',()=>{
 const a={...W.empty(),tasks:[{id:'t',title:'原提案',detail:'完整步骤',reason:'理由',date:'今天',status:'saved'}]};
 const b=W.clone(a);b.tasks[0].status='dismissed';const [entry]=R.removed(a,b);
 assert.equal(entry.kind,'tasks');assert.deepEqual(R.restore(b,entry,W),a);
});
test('恢复期待的关联快照不覆盖其他变化',()=>{
 const a={...W.empty(),wishes:[{id:'w',title:'期待',source:'t'}],tasks:[{id:'t',title:'提案',detail:'旧步骤',reason:'理由',date:'今天',status:'saved'}]};
 const b=W.clone(a);b.wishes=[];b.tasks[0].status='dismissed';b.tasks[0].detail='新步骤';
 const entry=R.removed(a,b).find(e=>e.kind==='wishes');const restored=R.restore(b,entry,W);
 assert.equal(restored.wishes.length,1);assert.equal(restored.tasks[0].detail,'新步骤');
});
