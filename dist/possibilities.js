// Original editorial prompts, not quotations or medical advice.
window.EarthPossibilities=[
  {id:'listen',tag:'创作',title:'给一段路选首配乐',desc:'熟悉的路，也可以有新的声音。',detail:'先在家选一首喜欢的歌，给一段熟悉的路起个歌单名字。不想出门，只想象那段路也可以。',context:'5–10 分钟 · 无需购买 · 独处、听歌时；出门时留意周围环境。',keywords:'音乐 歌 散步',art:'sky',color:'#dde1d7'},
  {id:'tinyrecipe',tag:'日常',title:'给熟悉的早餐换一个小配角',desc:'从家里已经有的食材开始。',detail:'看看现有食材，给平常的早餐搭配一种自己能吃、也喜欢的小配菜。没有合适食材，先记下想法就好。',context:'10–20 分钟 · 用现有食材 · 想做饭时；按自己的饮食限制选择。',keywords:'做饭 早餐 厨房',art:'food',color:'#eee0cd'},
  {id:'shelf',tag:'日常',title:'给一件喜欢的东西找个位置',desc:'只挪动一件，不用收拾整个房间。',detail:'找一件看见会开心的小物件，把它放在自己容易看到的地方。试一试位置，不喜欢再放回去。',context:'2–5 分钟 · 无需购买 · 想待在家里、精力不多时。',keywords:'家 房间 累 整理',art:'plant',color:'#dfe5cd'},
  {id:'postcard',tag:'创作',title:'给今天画一张小小的明信片',desc:'几个色块也能留下当天的样子。',detail:'用手边的纸或已有绘图工具，画今天想到的三个形状。不需要像什么，也不用发出去。',context:'5–15 分钟 · 用已有工具 · 想创作、独处时。',keywords:'画 创作 颜色',art:'sky',color:'#dce6e7'},
  {id:'bookpage',tag:'日常',title:'翻开一本搁了很久的书',desc:'读一小段，或只看看目录。',detail:'找一本已经有的书，挑一个好奇的标题。读到哪里都可以合上，不需要从第一页开始。',context:'3–10 分钟 · 无需购买 · 想安静一会儿时。',keywords:'书 阅读 安静 累',art:'sky',color:'#e9dccc'},
  {id:'message',tag:'日常',title:'把一件小事分享给熟悉的人',desc:'不用等到有大事发生。',detail:'如果此刻想联系谁，可以发一句最近遇到的小事。不必追问回复；不想发送，留在自己的记录里也可以。',context:'2–5 分钟 · 无需购买 · 想联系别人时；不适合想独处的此刻。',keywords:'朋友 想念 联系 分享',art:'food',color:'#e9dccc'}
];
const originalConditions={walk:'5–15 分钟 · 无需购买 · 精力允许、周边路线安全时。',food:'10–30 分钟 · 按自己的预算 · 想吃早餐时，不要求额外消费。',draw:'2–10 分钟 · 用已有工具 · 窗边也可以，不用分享。',plant:'3–10 分钟 · 无需购买 · 附近观察，不采摘。',letter:'时间与花费按双方安排 · 想联系对方时，不催促回应。',sound:'3–10 分钟 · 用已有音乐工具 · 独处或休息时。'};
proposals.forEach(p=>p.context=originalConditions[p.id]);
proposals.push(...window.EarthPossibilities);
window.EarthEditorialContext=()=>proposals.map(p=>({title:p.title,detail:p.detail,conditions:p.context||'时间和费用按实际情况选择',keywords:p.keywords||p.tag}));
