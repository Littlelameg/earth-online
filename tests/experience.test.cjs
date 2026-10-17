const {test}=require('node:test');const assert=require('node:assert/strict');
const E=require('../dist/experience-core.js'),W=require('../dist/world-core.js');
const p={title:'画一张卡片',detail:'五分钟，用手边的纸',reason:'想试试画画'};
test('收藏保留完整提案并合入期待，重复收藏不重复插入',()=>{
  const a=E.collect(W.empty(),p,'task1','2026-10-17');const b=E.collect(a,p,'task2','2026-10-17');
  assert.equal(b.wishes.length,1);assert.equal(b.tasks.length,1);assert.equal(b.tasks[0].detail,p.detail);assert.deepEqual(W.validate(b),b);
});
test('试过不自动上岛，不重复生成足迹；上岛与撤销保持期待',()=>{
  const a=E.collect(W.empty(),p,'task1','2026-10-17');const wish=a.wishes[0];
  const b=E.tried(a,wish,'2026-10-17');assert.equal(b.memories.length,1);assert.equal(E.pinned(b.memories[0]),false);
  assert.equal(E.tried(b,wish,'2026-10-17').memories.length,1);
  const c=E.pin(b,b.memories[0].id);assert.equal(E.pinned(c.memories[0]),true);
  const d=E.undo(c,c.memories[0].id);assert.equal(d.memories.length,0);assert.equal(d.wishes.length,1);assert.equal(d.tasks[0].status,'saved');
  assert.deepEqual(W.validate(c),c);
});
test('未收藏就尝试，撤销不会凭空增加期待',()=>{
  const a={...W.empty(),tasks:[{...p,id:'task1',date:'2026-10-17',status:'done'}]};
  const b=E.tried(a,{id:'task1',title:p.title,source:'task1'},'2026-10-17');
  const c=E.undo(b,b.memories[0].id);assert.equal(c.tasks[0].status,'dismissed');assert.equal(c.wishes.length,0);
});
test('原有岛上回忆不改变；新足迹合并和备份保持岛屿选择',()=>{
  const a={...W.empty(),memories:[{id:'old',title:'旧回忆',source:'walk',date:'昨天'}]};assert.ok(E.pinned(a.memories[0]));
  const b=E.tried(a,{id:'new',title:'新体验',source:'draw'},'今天');
  const merged=W.merge(a,b,a);assert.equal(merged.memories.filter(E.pinned).length,1);
  assert.deepEqual(W.validate(JSON.parse(JSON.stringify(merged))),merged);
});
