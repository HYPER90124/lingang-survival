/* =============================================================================
 * qin.js — 老秦（秦烈）剧情·前半（M5：警惕→熟识→信任）
 * -----------------------------------------------------------------------------
 * 节拍一览（flag 均存 npc.qin.*，锁序规则：cond 锁上一段 flag，结尾写本段 flag）：
 *   警惕（stage 0）
 *     qin_s0_1  酒吧初遇，被当成屠夫帮探子（enter/talk，夜间酒吧）
 *     qin_s0_2  委托：取回警局旧案卷宗（talk；拒绝可改日再谈，接受写 fetch）
 *     qin_s0_3  警局档案室取卷宗（enter/action @police，发 qin_dossier）
 *     qin_s0_4  交还卷宗，改观（talk，需持有 qin_dossier）
 *     qin_s0_5  升阶→熟识：正式认识（talk，需好感≥20，fx.stage）
 *   熟识（stage 1）
 *     qin_s1_1  教近战技巧（talk @police 白天，发 skill:melee）
 *     qin_s1_2  搭档之死（talk @bar 夜间）
 *     qin_s1_3  并肩清剿居民区尸群 + 升阶→信任（talk，需好感≥40，fx.stage）
 *   信任（stage 2）
 *     qin_s2_1  委托：侦查商场外围（talk，接受写 scout）
 *     qin_s2_2  商场外围侦查（enter/action @mall，完成写 scoutDone）
 *     qin_s2_3  回报情报（talk @bar 夜间，报酬 15 子弹）
 *     qin_s2_4  酒后自白：封城开枪打过平民（talk @bar 深夜；亲密铺垫，M6 接 stage 3）
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  var story = G.data.story, events = G.data.events;

  function P(id, text, choices) { story.register({ id: id, text: text, choices: choices }); }
  var NIGHT_BAR = [1140, 120];   // 老秦在酒吧的时段 19:00–02:00

  // ==========================================================================
  // 警惕（stage 0）
  // ==========================================================================

  // ---- qin_s0_1 酒吧初遇 ----------------------------------------------------
  events.register({
    id: 'qin_s0_1', type: 'story', npc: 'qin', when: ['enter', 'talk'], once: true, priority: 8,
    cond: { loc: 'bar', timeRange: NIGHT_BAR, stage: { qin: 0 }, flag: { 'intro.done': true, 'npc.qin.s0_1': false } },
    passage: 'qin_s0_1_p1'
  });

  P('qin_s0_1_p1',
    function (s) {
      s.npcs.qin.met = true;
      return '酒吧的门帘一掀，烟味和酒气糊了你一脸，油灯把十几条人影钉在墙上。你刚迈进两步，一只手按住你的肩，力道大得像钳子——[npc:qin]老秦[/npc]把你转过来，目光从你的脸一路刮到你的鞋，“生面孔。谁让你来的？”';
    },
    [
      { label: '报上名字，说自己是来找活路的', fx: { aff: { qin: 2 }, goto: 'qin_s0_1_p2' } },
      { label: '摊开双手，示意自己没带武器', fx: { aff: { qin: 2 }, goto: 'qin_s0_1_p2' } },
      { label: '“放开手，我自己会走。”', fx: { aff: { qin: -2 }, goto: 'qin_s0_1_p2b' } }
    ]);

  P('qin_s0_1_p2',
    '“商场那帮吃人饭的，最近往各处塞探子。”[npc:qin]老秦[/npc]松开手，人却仍挡在你和吧台之间，“进来可以，规矩三条：不带枪，不闹事，不打听别人的底。”吧台后的[npc:su]苏曼[/npc]笑着插话：“老秦，别把客人吓跑了。”他哼了一声，退回门边的高脚凳上，眼睛还钉在你身上。',
    [
      { label: '找个角落坐下', fx: { goto: 'qin_s0_1_p3' } },
      { label: '问他“商场那帮人”是什么来头', fx: { goto: 'qin_s0_1_p2q' } }
    ]);

  P('qin_s0_1_p2b',
    '[npc:qin]老秦[/npc]盯了你两秒，手指一根根松开。“行，嘴硬的探子我也见过。”他抱着胳膊靠回门框，“今晚我就守在这儿，你最好只喝酒。”吧台后的[npc:su]苏曼[/npc]朝你耸耸肩，示意你别往心里去。',
    [{ label: '找个位子坐下', fx: { goto: 'qin_s0_1_p3' } }]);

  P('qin_s0_1_p2q',
    '“屠夫帮。”[npc:qin]老秦[/npc]吐出三个字，像吐一口痰，“占了中环商场，抢货，抓人，也吃人。离他们远点——要是你真跟他们没关系的话。”他说完便不再看你，你在他那句话的后半截里听出了没散干净的怀疑。',
    [{ label: '记住这个名字', fx: { aff: { qin: 1 }, flag: { 'npc.qin.s0_1': true }, milestone: '初遇老秦' } }]);

  P('qin_s0_1_p3',
    '你挑了张离门最远的桌子，背靠着墙坐下。酒吧不大，十来个幸存者各占一角，压着嗓子交换消息，没人多看你一眼。这里的安静让你绷了一路的后背松了半寸——除了门口那道始终没挪开的视线。',
    [{ label: '（今晚先到这里）', fx: { flag: { 'npc.qin.s0_1': true }, milestone: '初遇老秦' } }]);

  // ---- qin_s0_2 委托：旧案卷宗 ----------------------------------------------
  // 拒绝不落死局：不 once，冷却一天后可再谈；接受才写 s0_2+fetch。
  events.register({
    id: 'qin_s0_2', type: 'story', npc: 'qin', when: ['talk'], once: false, cooldown: 1440, priority: 5,
    cond: { stage: { qin: 0 }, flag: { 'npc.qin.s0_1': true, 'npc.qin.s0_2': false } },
    passage: 'qin_s0_2_p1'
  });

  P('qin_s0_2_p1',
    '[npc:qin]老秦[/npc]难得先开口。他把烟头在鞋底摁灭，从怀里摸出半张手绘的楼层图：“看你进出的做派，手脚还算干净。警局二楼档案室塌了半边，里头压着一份[item]旧案卷宗[/item]，九十七号柜。我这身板钻不进缺口。”他的指节在图上敲了敲，“你去，报酬十发子弹。”',
    [
      { label: '应下这单活', fx: { flag: { 'npc.qin.s0_2': true, 'npc.qin.fetch': true }, aff: { qin: 2 }, appointment: { inDays: 2, minute: 1020, label: '帮老秦取回旧案卷宗' }, goto: 'qin_s0_2_p2' } },
      { label: '问他为什么信得过你', fx: { goto: 'qin_s0_2_p1q' } },
      { label: '“这活我不接。”', fx: { aff: { qin: -1 }, goto: 'qin_s0_2_pno' } }
    ]);

  P('qin_s0_2_p1q',
    '“信不过。”[npc:qin]老秦[/npc]回答得很快，“所以才让你去。那卷宗对外人是废纸，对我有用——你拿了它，卖不掉，也跑不掉。”他把楼层图往你这边推了半寸，“这叫试探，听明白就好。”',
    [
      { label: '应下这单活', fx: { flag: { 'npc.qin.s0_2': true, 'npc.qin.fetch': true }, aff: { qin: 2 }, appointment: { inDays: 2, minute: 1020, label: '帮老秦取回旧案卷宗' }, goto: 'qin_s0_2_p2' } },
      { label: '还是算了', fx: { aff: { qin: -1 }, goto: 'qin_s0_2_pno' } }
    ]);

  P('qin_s0_2_p2',
    '“档案室在二楼东侧，正门堵死了，走外墙的消防梯。”[npc:qin]老秦[/npc]把楼层图塞进你手里，“里面黑，也不干净，能不动手就别动手。东西到手，晚上来酒吧找我。”',
    [{ label: '收好楼层图', fx: {} }]);

  P('qin_s0_2_pno',
    '[npc:qin]老秦[/npc]收回楼层图，脸上没什么表情：“随你。”他转回门口的位置，这一晚没再看你一眼。',
    [{ label: '（离开）', fx: {} }]);

  // ---- qin_s0_3 警局档案室取卷宗 --------------------------------------------
  events.register({
    id: 'qin_s0_3', type: 'story', npc: 'qin', when: ['enter', 'action'], once: true, priority: 7,
    cond: { loc: 'police', flag: { 'npc.qin.fetch': true, 'npc.qin.s0_3': false } },
    passage: 'qin_s0_3_p1'
  });

  P('qin_s0_3_p1',
    '你顺着消防梯爬上警局二楼。走廊里积着厚灰，鞋印只有你自己的，档案室的门框歪塌下来，留出半人高的缺口，里面黑得像一口井。你屏住呼吸，听见纸页被什么东西缓慢碾过的声响。',
    [
      { label: '侧身钻进缺口，摸黑往里挪', fx: { stat: { energy: -8, sanity: -3 }, time: 20, goto: 'qin_s0_3_p2a' } },
      { label: '敲响门框，把里面的东西引出来打', fx: { combat: 'zombie_pair', goto: 'qin_s0_3_p2b' } }
    ]);

  P('qin_s0_3_p2a',
    '你贴着档案柜一格一格往里数，灰呛得喉咙发痒也不敢咳。黑暗里那阵碾纸声停了一停，又继续。九十七号柜半埋在塌梁底下，柜门变形卡死，你抵住柜身慢慢发力，铰链呻吟着让了步。',
    [{ label: '抽出卷宗，原路退出去', fx: { item: { qin_dossier: 1 }, flag: { 'npc.qin.s0_3': true }, time: 20, goto: 'qin_s0_3_p3' } }]);

  P('qin_s0_3_p2b',
    '走廊重新静下来，你侧身钻进缺口。手电够不着的角落里横着翻倒的柜子，九十七号柜半埋在塌梁底下，你把变形的柜门别开，里面的牛皮纸袋码得整整齐齐。',
    [{ label: '抽出卷宗就走', fx: { item: { qin_dossier: 1 }, flag: { 'npc.qin.s0_3': true }, time: 15, goto: 'qin_s0_3_p3' } }]);

  P('qin_s0_3_p3',
    '[item]旧案卷宗[/item]比想象中薄，牛皮纸封皮盖着警局的红章，边角被水泡过又干透，皱得像老人的手背。卷宗被麻绳捆了三道，你掂了掂，没有拆——这是老秦的东西，也是他给你出的题。',
    [{ label: '收进背包，去酒吧交差', fx: {} }]);

  // ---- qin_s0_4 交还卷宗 ----------------------------------------------------
  events.register({
    id: 'qin_s0_4', type: 'story', npc: 'qin', when: ['talk'], once: true, priority: 5,
    cond: { stage: { qin: 0 }, flag: { 'npc.qin.s0_3': true, 'npc.qin.s0_4': false }, has: { item: 'qin_dossier' } },
    passage: 'qin_s0_4_p1'
  });

  P('qin_s0_4_p1',
    '你把[item]旧案卷宗[/item]放到桌上。[npc:qin]老秦[/npc]伸手前停了一瞬，随即解开麻绳，就着油灯一页页地翻，翻得很慢，指间的烟烧完了一整根，他像忘了你还站在旁边。末了他合上卷宗，从口袋里数出十发子弹排在桌沿：“点点。”',
    [
      { label: '收下子弹，问卷宗里是什么', fx: { item: { qin_dossier: -1 }, bullets: 10, aff: { qin: 8 }, goto: 'qin_s0_4_p2q' } },
      { label: '收下子弹，什么都不问', fx: { item: { qin_dossier: -1 }, bullets: 10, aff: { qin: 9 }, goto: 'qin_s0_4_p2' } }
    ]);

  P('qin_s0_4_p2q',
    '“旧账。”[npc:qin]老秦[/npc]把卷宗揣进怀里，隔着衣服拍了拍，“人没了，账还在，总得有人记着。”他给你倒了小半杯酒——这是他头一回主动递东西给你，“先前疑你，是职业病，别记仇。”',
    [{ label: '碰一下杯', fx: { flag: { 'npc.qin.s0_4': true } } }]);

  P('qin_s0_4_p2',
    '[npc:qin]老秦[/npc]把卷宗揣进怀里，多看了你一眼，那眼神不再是审人的了。“不多嘴，是好习惯。”他给你倒了小半杯酒，“先前疑你，是职业病，别记仇。”',
    [{ label: '碰一下杯', fx: { flag: { 'npc.qin.s0_4': true } } }]);

  // ---- qin_s0_5 升阶→熟识 ---------------------------------------------------
  events.register({
    id: 'qin_s0_5', type: 'story', npc: 'qin', when: ['talk'], once: true, priority: 6,
    cond: { stage: { qin: 0 }, flag: { 'npc.qin.s0_4': true, 'npc.qin.s0_5': false }, aff: { qin: { gte: 20 } } },
    passage: 'qin_s0_5_p1'
  });

  P('qin_s0_5_p1',
    '[npc:qin]老秦[/npc]从吧台底下摸出一瓶没开封的[item]烈酒[/item]，倒了两杯，把其中一杯推到你面前：“正式认识一下。秦烈，从前在刑警队干，现在替苏曼看门。”他举起杯，不等你回话就干了，“这世道能处的人不多，你算一个。”',
    [
      { label: '干了这杯', fx: { stat: { alcohol: 10 }, aff: { qin: 3 }, stage: { qin: 1 }, flag: { 'npc.qin.s0_5': true }, milestone: '老秦不再把你当外人', goto: 'qin_s0_5_p2' } },
      { label: '以水代酒', fx: { aff: { qin: 2 }, stage: { qin: 1 }, flag: { 'npc.qin.s0_5': true }, milestone: '老秦不再把你当外人', goto: 'qin_s0_5_p2' } }
    ]);

  P('qin_s0_5_p2',
    '“白天我都在警局那栋废楼，翻旧档案，也活动手脚。”[npc:qin]老秦[/npc]把空杯倒扣在桌上，“有空过来，我教你两手近身的东西——外头那些玩意儿，光靠跑是躲不完的。”',
    [{ label: '记下这个约', fx: {} }]);

  // ==========================================================================
  // 熟识（stage 1）
  // ==========================================================================

  // ---- qin_s1_1 教近战技巧 --------------------------------------------------
  events.register({
    id: 'qin_s1_1', type: 'story', npc: 'qin', when: ['talk'], once: true, priority: 5,
    cond: { loc: 'police', timeRange: [480, 1020], stage: { qin: 1 }, flag: { 'npc.qin.s1_1': false } },
    passage: 'qin_s1_1_p1'
  });

  P('qin_s1_1_p1',
    '警局后院清出了一小块空地。[npc:qin]老秦[/npc]扔给你一根缠了布条的钢管：“站稳，护住喉咙和手腕。”他不讲理论，抬手就是一下——慢，但每一下都逼你挪到对的位置。“死人不怕疼。砍脖子不如敲膝盖，它跪了，你才有第二下。”',
    [{ label: '咬牙跟着练', fx: { stat: { energy: -10 }, time: 90, goto: 'qin_s1_1_p2' } }]);

  P('qin_s1_1_p2',
    '两个钟头下来，你的虎口震得发麻，后背湿透，可挥出去的每一下都比先前扎实。[npc:qin]老秦[/npc]接住你最后一击，点了点头：“记三条——看腿，别看脸；敲了就退，别恋战；背后永远留一条路。”',
    [{ label: '把这三条刻进脑子', fx: { skill: 'melee', aff: { qin: 5 }, flag: { 'npc.qin.s1_1': true }, milestone: '老秦教你近身搏杀' } }]);

  // ---- qin_s1_2 搭档之死 ----------------------------------------------------
  events.register({
    id: 'qin_s1_2', type: 'story', npc: 'qin', when: ['talk'], once: true, priority: 5,
    cond: { loc: 'bar', timeRange: NIGHT_BAR, stage: { qin: 1 }, flag: { 'npc.qin.s1_1': true, 'npc.qin.s1_2': false } },
    passage: 'qin_s1_2_p1'
  });

  P('qin_s1_2_p1',
    '这晚酒吧人少，[npc:qin]老秦[/npc]破例坐到你桌边，面前的杯子空得比平时快。那份[item]旧案卷宗[/item]摊在他膝盖上，翻在贴着照片的一页，他盯着看了半天，忽然开口：“我带过一个兵，枪法比我准。封城第二年，他投了屠夫帮。”',
    [
      { label: '给他把酒满上，听下去', fx: { aff: { qin: 2 }, goto: 'qin_s1_2_p2' } },
      { label: '不说话，坐着陪他', fx: { aff: { qin: 2 }, goto: 'qin_s1_2_p2' } }
    ]);

  P('qin_s1_2_p2',
    '“我搭档不信人心喂不熟，自己去劝他回头。”[npc:qin]老秦[/npc]的拇指摩挲着杯沿，声音平得像在念别人的案卷，“人是被送回来的，装在麻袋里，捆麻袋的绳结，还是队里教的那种。”他把杯中酒一口倒进喉咙，“卷宗我拿回来，就是想留着证据——总有一天，我要拿它跟那个人当面对账。”',
    [
      { label: '“要动手的时候，算我一个。”', fx: { aff: { qin: 6 }, flag: { 'npc.qin.s1_2': true }, milestone: '老秦说出搭档之死', goto: 'qin_s1_2_p3' } },
      { label: '陪他把这杯喝完', fx: { stat: { alcohol: 10 }, aff: { qin: 5 }, flag: { 'npc.qin.s1_2': true }, milestone: '老秦说出搭档之死', goto: 'qin_s1_2_p3' } }
    ]);

  P('qin_s1_2_p3',
    '[npc:qin]老秦[/npc]没接话，只把卷宗仔细捆好，起身时用拳头轻轻碰了碰你的肩。他走回门口的高脚凳，背影跟平时一样直，压在那背影上的东西，你今晚才第一次看清。',
    [{ label: '（离开）', fx: {} }]);

  // ---- qin_s1_3 清剿尸群 + 升阶→信任 ----------------------------------------
  // 「改天」不落死局：不 once，冷却半天后可再约；走完全程才写 s1_3。
  events.register({
    id: 'qin_s1_3', type: 'story', npc: 'qin', when: ['talk'], once: false, cooldown: 720, priority: 6,
    cond: { stage: { qin: 1 }, flag: { 'npc.qin.s1_2': true, 'npc.qin.s1_3': false }, aff: { qin: { gte: 40 } } },
    passage: 'qin_s1_3_p1'
  });

  P('qin_s1_3_p1',
    '[npc:qin]老秦[/npc]把一张草图铺在你面前，居民区一栋筒子楼被红笔圈住：“这窝死人堵了三号井，附近的活人取不了水。我打算去清了它，一个人手不够。”他抬眼看你，“你要肯搭手，现在就走。”',
    [
      { label: '抄家伙，跟他走', fx: { time: 30, goto: 'qin_s1_3_p2' } },
      { label: '今天状态不行，改天', fx: {} }
    ]);

  P('qin_s1_3_p2',
    '筒子楼的楼道又窄又黑，腐臭顺着楼梯往下淌。[npc:qin]老秦[/npc]打手势让你贴墙，他自己踩着满地碎玻璃走在前面，脚步轻得不像他的块头。二楼平台上，三具[zed]尸体[/zed]背对楼梯口蠕动着，他竖起三根手指，往下压了压——按练过的来。',
    [
      { label: '和他一前一后压上去', fx: { combat: 'zombie_trio', goto: 'qin_s1_3_p3' } },
      { label: '扔瓶子引开一只，再动手', fx: { stat: { sanity: -2 }, combat: 'zombie_pair', goto: 'qin_s1_3_p3' } }
    ]);

  P('qin_s1_3_p3',
    '你们退到楼外的巷口，[npc:qin]老秦[/npc]抹了把脸上溅的黑血，靠着墙大口换气。楼里没有新的动静了。他走到井台边，把缠住的井绳解开摆正，像干完一件再平常不过的活，“打得不赖，比我当年带的兵强。”',
    [{ label: '“往后这种活，都叫上我。”', fx: { stage: { qin: 2 }, aff: { qin: 7 }, flag: { 'npc.qin.s1_3': true }, time: 90, stat: { energy: -10 }, milestone: '与老秦并肩清剿尸群', goto: 'qin_s1_3_p4' } }]);

  P('qin_s1_3_p4',
    '回程的路上，[npc:qin]老秦[/npc]的话比平时多。“信得过的人，这些年我数得出三个。”他在岔路口停下，看了你一眼，“现在是四个。往后有些事，我只跟你说。”',
    [{ label: '（和他道别）', fx: {} }]);

  // ==========================================================================
  // 信任（stage 2）
  // ==========================================================================

  // ---- qin_s2_1 委托：侦查商场外围 ------------------------------------------
  events.register({
    id: 'qin_s2_1', type: 'story', npc: 'qin', when: ['talk'], once: false, cooldown: 1440, priority: 5,
    cond: { stage: { qin: 2 }, flag: { 'npc.qin.s2_1': false } },
    passage: 'qin_s2_1_p1'
  });

  P('qin_s2_1_p1',
    '[npc:qin]老秦[/npc]把四下扫了一圈，才压低声音：“屠夫帮最近往商场运货，车次比先前密了一倍。我要知道他们外围的布防——几个哨位，几点换班，车从哪条路进出。”他用指节敲了敲桌面，“只看，只记，不动手。这活比清死人凶险，你可以不接。”',
    [
      { label: '“我去。”', fx: { flag: { 'npc.qin.s2_1': true, 'npc.qin.scout': true }, aff: { qin: 3 }, appointment: { inDays: 3, minute: 1020, label: '替老秦侦查商场外围' }, goto: 'qin_s2_1_p2' } },
      { label: '这趟太险，再想想', fx: {} }
    ]);

  P('qin_s2_1_p2',
    '“西边天桥塌了一半，桥墩后面看得见商场正门。”[npc:qin]老秦[/npc]用指尖蘸着酒在桌上画出路线，“别走近，别开枪，被盯上就往地铁方向跑，他们不追黑的地方。记住——你活着回来，情报才算数。”',
    [{ label: '记下路线', fx: {} }]);

  // ---- qin_s2_2 商场外围侦查 ------------------------------------------------
  events.register({
    id: 'qin_s2_2', type: 'story', npc: 'qin', when: ['enter', 'action'], once: true, priority: 7,
    cond: { loc: 'mall', flag: { 'npc.qin.scout': true, 'npc.qin.s2_2': false } },
    passage: 'qin_s2_2_p1'
  });

  P('qin_s2_2_p1',
    '你贴着塌了半边的天桥摸到桥墩后面，商场正门尽收眼底：门口用集装箱垒了道矮墙，两个哨位各站着一个挎枪的人，一辆货车正往里倒车，卸货的人影在雨棚下进进出出。你数着换岗的间隔，手指在膝盖上打拍子。',
    [
      { label: '记满两轮换岗就撤', fx: { time: 90, stat: { energy: -8 }, flag: { 'npc.qin.s2_2': true, 'npc.qin.scoutDone': true }, goto: 'qin_s2_2_p3' } },
      { label: '再绕近一点，看清货箱上的标记', fx: { stat: { sanity: -2 }, time: 30, goto: 'qin_s2_2_p2' } }
    ]);

  P('qin_s2_2_p2',
    '你借着一辆翻倒的公交车又挪近三十米。货箱上的字看清了——军用涂装，检查站方向流出来的批号。就在这时，矮墙后面响起一声口哨，一队巡逻的人影朝你这边散开，手电光扫过车底。',
    [
      { label: '趁包围没合拢，先下手', fx: { combat: 'thug_patrol', goto: 'qin_s2_2_p3b' } },
      { label: '弃了观察点，往地铁方向狂奔', fx: { stat: { energy: -12, hp: -5 }, time: 40, goto: 'qin_s2_2_p3b' } }
    ]);

  P('qin_s2_2_p3',
    '换岗的规律进了你的脑子：四小时一换，交接的空档正门只剩一个人。你顺着来路退出去，直到商场缩成天际线上的一块灰影，才敢直起腰。',
    [{ label: '把情报带回给老秦', fx: {} }]);

  P('qin_s2_2_p3b',
    '你钻进地铁口的阴影，靠着湿冷的墙听自己的心跳，外面的手电光晃了几趟，骂骂咧咧地远了。哨位、换岗的空档、还有那批军用涂装的货箱，都装进了你的脑子。',
    [{ label: '把情报带回给老秦', fx: { flag: { 'npc.qin.s2_2': true, 'npc.qin.scoutDone': true, 'npc.qin.sawCargo': true } } }]);

  // ---- qin_s2_3 回报情报 ----------------------------------------------------
  events.register({
    id: 'qin_s2_3', type: 'story', npc: 'qin', when: ['talk'], once: true, priority: 5,
    cond: { loc: 'bar', timeRange: NIGHT_BAR, stage: { qin: 2 }, flag: { 'npc.qin.scoutDone': true, 'npc.qin.s2_3': false } },
    passage: 'qin_s2_3_p1'
  });

  P('qin_s2_3_p1',
    function (s) {
      var base = '你把看到的一样样报给[npc:qin]老秦[/npc]：哨位、人数、换岗的间隔。他用炭笔在烟盒背面画出布防图，笔尖顿在正门的位置——“交接的时候只剩一个人……好，很好。”';
      if (G.engine.getFlag('npc.qin.sawCargo')) {
        base += '你提起货箱上的军用批号，他的笔停了半晌，“检查站的东西会自己长腿？他们的路子，比我想的野。”他把烟盒揣好，没再往下说。';
      }
      return base;
    },
    [{ label: '收下报酬', fx: { bullets: 15, aff: { qin: 8 }, flag: { 'npc.qin.s2_3': true }, milestone: '替老秦摸清商场外围', goto: 'qin_s2_3_p2' } }]);

  P('qin_s2_3_p2',
    '“这份情报，值你拿的每一发子弹。”[npc:qin]老秦[/npc]把子弹推过来，难得地也给你倒了杯酒，“先不动他们，等我把路子摸全。这阵子你少往商场去——他们丢了脸，会记人。”',
    [{ label: '（离开）', fx: {} }]);

  // ---- qin_s2_4 酒后自白 ----------------------------------------------------
  events.register({
    id: 'qin_s2_4', type: 'story', npc: 'qin', when: ['talk'], once: true, priority: 5,
    cond: { loc: 'bar', timeRange: [1320, 120], stage: { qin: 2 }, flag: { 'npc.qin.s2_3': true, 'npc.qin.s2_4': false } },
    passage: 'qin_s2_4_p1'
  });

  P('qin_s2_4_p1',
    '打烊前的酒吧只剩你们两个，[npc:su]苏曼[/npc]收拾完柜台就上了楼。[npc:qin]老秦[/npc]面前摆着三只空杯——这不是他平时的量。“封城第七天，我在北桥执勤。”他忽然开口，眼睛看着杯底，“命令是一个活口不放。人潮冲卡的时候，我开了枪。”',
    [{ label: '听他说完', fx: { goto: 'qin_s2_4_p2' } }]);

  P('qin_s2_4_p2',
    '“倒下的是个抱着包袱的男人。包袱里是衣服，不是孩子——这是我后来翻他遗物才知道的。”[npc:qin]老秦[/npc]的声音没有起伏，攥着空杯的手却绷得指节发白，“第二天检疫报告出来，他没感染。干了三十年警察，我最后一枪，打在一个干净人身上。”',
    [
      { label: '“那是命令压下来的，不是你。”', fx: { aff: { qin: 5 }, goto: 'qin_s2_4_p3' } },
      { label: '什么都不说，把你的杯子碰上去', fx: { aff: { qin: 6 }, goto: 'qin_s2_4_p3' } },
      { label: '问他后来是怎么处理的', fx: { aff: { qin: 2 }, goto: 'qin_s2_4_p3b' } }
    ]);

  P('qin_s2_4_p3',
    '[npc:qin]老秦[/npc]沉默了很久，攥着杯子的手一根根松开。“这事连苏曼都不知道。”他抬起头，眼里的血丝在灯下看得清楚，“说给你，是想让你明白——我不是什么好人，跟着我讨不到光。”可他看你的眼神，比说出口的话软得多。',
    [{ label: '“我又没打算讨光。”', fx: { flag: { 'npc.qin.s2_4': true }, milestone: '老秦的自白' } }]);

  P('qin_s2_4_p3b',
    '“处理？”[npc:qin]老秦[/npc]扯了下嘴角，“处分书我原样收着，跟那份检疫报告钉在一起，压在卷宗最底下。”他把杯子倒扣在桌上，“别问了，今天到这儿。”',
    [{ label: '（离开）', fx: { flag: { 'npc.qin.s2_4': true }, milestone: '老秦的自白' } }]);

})();

/* =============================================================================
 * qin.js·后半（M6：亲密→羁绊）
 * -----------------------------------------------------------------------------
 * 节拍一览（衔接 M5：stage 2 + npc.qin.s2_4:true 起步）：
 *   亲密（stage 3）
 *     qin_s3_1  大型事件：屠夫帮伏击老秦，主角救援（enter @bar 夜；败分支=
 *               搬救兵迟到 rescueLate，不掉线）
 *     qin_s3_2  关系转折 + 升阶→亲密（talk，需好感≥60；可拒绝，冷却后再谈）
 *     qin_s3_3  首次成人事件（talk @bar 深夜，性别分支；可拒绝，冷却后再谈）
 *     qin_s3_4  卷宗对账：叛变旧部定名孟九，复仇线开启（talk @police 白天）
 *   羁绊（stage 4）
 *     qin_s4_1  升阶→羁绊：共守酒吧据点约定（talk，需好感≥80；首次登记周五
 *               巡逻之夜日历，见 bookWeekly）
 *     qin_patrol_1  周期事件：每周五晚巡逻之夜（scheduled，weekday 4）
 *     qin_hunt  复仇长期循环：扫孟九的据点，永远差一步（talk，冷却 3 天，无终局）
 *     qin_s4_2  羁绊成人变体（talk @bar 深夜，可重复，冷却 2 天，priority 2）
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  var story = G.data.story, events = G.data.events;

  function P(id, text, choices) { story.register({ id: id, text: text, choices: choices }); }
  var NIGHT_BAR = [1140, 120];
  var DAY_POLICE = [480, 1020];

  // 周期事件首次登记：算到下一个目标星期几，写一条无 eventId 的日历备忘。
  // guardFlag 防止段落重复渲染时重复登记（text 函数副作用，M5 met 联动同法）。
  function bookWeekly(guardFlag, targetWd, minute, label) {
    if (G.engine.getFlag(guardFlag)) return;
    G.engine.setFlag(guardFlag, true);
    var p = G.state.player;
    var diff = (targetWd - (p.day % 7) + 7) % 7;
    if (!diff) diff = 7;
    G.state.calendar.appointments.push({ day: p.day + diff, minute: minute, label: label, eventId: null, done: false });
  }

  // ==========================================================================
  // 亲密（stage 3）
  // ==========================================================================

  // ---- qin_s3_1 大型事件：北巷救援 -------------------------------------------
  events.register({
    id: 'qin_s3_1', type: 'story', npc: 'qin', when: ['enter'], once: true, priority: 9,
    cond: { loc: 'bar', timeRange: NIGHT_BAR, stage: { qin: 2 }, flag: { 'npc.qin.s2_4': true, 'npc.qin.s3_1': false } },
    passage: 'qin_s3_1_p1'
  });

  P('qin_s3_1_p1',
    '你一进门就发现酒吧不对劲：没有酒令声，人人的眼睛都往门口瞟。[npc:su]苏曼[/npc]快步迎上来，指甲掐进你的胳膊，“老秦傍晚去盯屠夫帮往码头去的车队，说好九点前回来，现在过了两个钟头——跑腿的孩子说，北巷那头有哨子声，还有打斗声。”',
    [
      { label: '抄家伙就走', fx: { time: 15, goto: 'qin_s3_1_p2' } },
      { label: '让苏曼备好热水纱布，再动身', fx: { time: 20, goto: 'qin_s3_1_p2' } }
    ]);

  P('qin_s3_1_p2',
    '北巷堵着一辆熄了火的货车，车灯还亮着，把巷子劈成明暗两半。[npc:qin]老秦[/npc]被逼在一截断墙后面，左腿钉着一支[blood]弩箭[/blood]，手里的钢管拄地撑着身子。四条人影正围着断墙收口子，袖口都缠着暗红布条，其中一个仰着头吹哨——他们在叫人。',
    [
      { label: '冲进灯光里，和他背靠背', fx: { combat: 'thug_squad', goto: 'qin_s3_1_p3' } },
      { label: '摸黑绕到货车后，先放倒吹哨的', cond: { skill: 'melee' }, fx: { stat: { energy: -8 }, combat: 'thug_patrol', goto: 'qin_s3_1_p3' } },
      { label: '人手太少，退回酒吧搬救兵', fx: { time: 50, stat: { energy: -8 }, flag: { 'npc.qin.rescueLate': true }, goto: 'qin_s3_1_p3b' } }
    ]);

  P('qin_s3_1_p3',
    '你架起[npc:qin]老秦[/npc]的胳膊撤出北巷，身后的哨声追了两条街，终于断了。他一路咬着牙没吭声，到了亮处你才看清，[blood]弩箭[/blood]从大腿外侧穿进去，裤腿浸得发黑。“埋伏。”他喘着说，“有人喊了我的旧警衔——是孟九的人，冲我来的。”',
    [{ label: '架着他回酒吧', fx: { time: 40, stat: { energy: -10 }, goto: 'qin_s3_1_p4' } }]);

  P('qin_s3_1_p3b',
    '等你带着苏曼雇的两个看场汉子赶回北巷，巷子已经空了，断墙下的碎砖被血浸黑了一片。[npc:qin]老秦[/npc]靠在墙根，自己把[blood]弩箭[/blood]拔了，用皮带勒着大腿根，脸白得像纸。“谁让你回去的。”他骂人的声音虚得没了火气，“下回……别把背后交给别人。”',
    [{ label: '架着他回酒吧', fx: { time: 40, stat: { energy: -8 }, goto: 'qin_s3_1_p4' } }]);

  P('qin_s3_1_p4',
    function (s) {
      var mid = s.player.skills.bandage
        ? '你按林晚教的法子清创、加压，手没有抖，[npc:qin]老秦[/npc]全程盯着房梁，只在收针那一下闷哼了一声。'
        : '你笨手笨脚地帮苏曼打下手，烈酒浇上伤口的时候，[npc:qin]老秦[/npc]的指节把桌沿抠得咯咯响。';
      return '后屋的桌子被苏曼铺成了临时的病床。' + mid + '烧到后半夜，他半昏半醒，抓着你的手腕不放，翻来覆去只有一句话：“别一个人去码头……”';
    },
    [
      { label: '守到他烧退', cond: { flag: { 'npc.qin.rescueLate': false } }, fx: { flag: { 'npc.qin.s3_1': true }, aff: { qin: 8 }, time: 180, stat: { energy: -12 }, milestone: '从屠夫帮的伏击里救回老秦' } },
      { label: '守到他烧退', cond: { flag: { 'npc.qin.rescueLate': true } }, fx: { flag: { 'npc.qin.s3_1': true }, aff: { qin: 4 }, time: 180, stat: { energy: -12 }, milestone: '老秦从伏击里捡回一条命' } }
    ]);

  // ---- qin_s3_2 关系转折 + 升阶→亲密 ----------------------------------------
  // 可拒绝不落死局：不 once，冷却一天；接受才升阶写 flag。
  events.register({
    id: 'qin_s3_2', type: 'story', npc: 'qin', when: ['talk'], once: false, cooldown: 1440, priority: 6,
    cond: { loc: 'bar', timeRange: NIGHT_BAR, stage: { qin: 2 }, flag: { 'npc.qin.s3_1': true, 'npc.qin.s3_2': false }, aff: { qin: { gte: 60 } } },
    passage: 'qin_s3_2_p1'
  });

  P('qin_s3_2_p1',
    '后屋里药味盖过了酒味。[npc:qin]老秦[/npc]的腿伤收了口，人已经能扶着桌子练站，见你来，他让你帮他换最后一次药。绷带打完结，他忽然按住你收拾东西的手。“北巷那晚，我以为要交代了。”他的拇指在你手背上压了压，轻得不像他，“闭眼前想的不是孟九，不是旧账——是你。这话，我只说一遍。”',
    [
      { label: '反手握住他', fx: { goto: 'qin_s3_2_p2' } },
      { label: '“我们是过命的交情，别的我没想过。”', fx: { goto: 'qin_s3_2_pno' } }
    ]);

  P('qin_s3_2_pno',
    '[npc:qin]老秦[/npc]收回手，点了下头，神色没什么变化，只有下颌线绷了一瞬。“当我没说。”他把绷带卷好丢回你手里，“药钱记我账上。”这道门没有关死——他不是催人的性子。',
    [{ label: '（离开）', fx: {} }]);

  P('qin_s3_2_p2',
    '他的手把你的手整个包进去，茧子磨得你掌心发烫。[npc:qin]老秦[/npc]拉着你站起来，低头吻你，用力，笨，像把这些年没说出口的话一次补齐。松开的时候他呼吸不稳，额头抵着你的：“往后，你的背后归我。”',
    [{ label: '“那你的背后，归我。”', fx: { stage: { qin: 3 }, flag: { 'npc.qin.s3_2': true }, aff: { qin: 6 }, milestone: '与老秦挑明了关系' } }]);

  // ---- qin_s3_3 首次成人事件 ------------------------------------------------
  events.register({
    id: 'qin_s3_3', type: 'story', npc: 'qin', when: ['talk'], once: false, cooldown: 1440, priority: 6,
    cond: { loc: 'bar', timeRange: [1320, 120], stage: { qin: { gte: 3 } }, flag: { 'npc.qin.s3_3': false } },
    passage: 'qin_s3_3_p1'
  });

  P('qin_s3_3_p1',
    '打烊后，[npc:su]苏曼[/npc]上楼前朝你们的方向扬了扬眉，什么都没说。[npc:qin]老秦[/npc]闩上门，把腰上的钥匙串解下来放在桌上——那动作像卸甲。后屋只点一盏油灯，他站在灯影里看你：“留下？”他问得很直，“现在走，我送你回去。往后也一样，你说了算。”',
    [
      { label: '留下', fx: { goto: 'qin_s3_3_p2' } },
      { label: '今晚先回去', fx: { goto: 'qin_s3_3_pout' } }
    ]);

  P('qin_s3_3_pout',
    '他真送你回家，一路无话，把外套披在你肩上，在安全屋门口站到你插好门闩才走。你从窗缝里看他的背影汇进夜色，步子还有一点跛。',
    [{ label: '（睡下）', fx: { time: 30 } }]);

  P('qin_s3_3_p2',
    function (s) {
      var head = '油灯把两个人的影子投在同一面墙上。他脱了上衣，肩背上的旧[blood]伤疤[/blood]一条压着一条，新伤在大腿外侧，还覆着纱布。他解你衣扣的手很慢，像拆一个不许出错的引信，呼吸却越来越沉。';
      if (s.player.gender === 'f') {
        return head + '他把你放倒在那张窄床上，掌心从你的腰侧一路碾上去，糙得像砂纸，却烫。你一发抖，他就停下来等你，再继续。进入你的时候他撑在你上方，手臂绷成一条硬线，动作沉而慢，一下一下都压到底，把你的喘息尽数撞散。你抓着他的肩胛，他喉咙里滚出一声压哑的低吼，伏下来把你的名字咬在齿间，床板的吱呀声和你漏出来的声音，被他用掌心一起捂进胸口。';
      }
      return head + '他把你按坐在床沿，单膝跪下来，握住你的动作没有半分犹豫——这个一辈子讲规矩的男人，把你也划进了他的规矩之内。他的手掌粗粝滚烫，节奏沉稳得不容抗拒，你仰头抵着墙，喘息压不住，他抬眼看你，眼神烫得吓人。后来他把你翻过去压在床上，胸膛贴着你的背，含着你的后颈，身体沉进来的时候，他的呼吸终于乱了，一声低吼咬碎在你肩上。';
    },
    [{ label: '回应他', fx: { goto: 'qin_s3_3_p3' } }]);

  P('qin_s3_3_p3',
    '事后他把你圈在臂弯里，手臂沉得像门闩。这个男人话仍旧少，只用拇指一下一下摩挲你的肩头，烟点了没抽，在烟灰缸里自己烧完。“睡吧。”他把毯子往你这边掖了掖，“我守着。”你在他的心跳声里往下沉——那声音慢，稳，像一座不会塌的钟。',
    [{ label: '（在他怀里睡去）', fx: { stat: { energy: -18, sanity: 6 }, time: 360, aff: { qin: 8 }, flag: { 'npc.qin.s3_3': true }, milestone: '与老秦的第一夜' } }]);

  // ---- qin_s3_4 卷宗对账：孟九 ----------------------------------------------
  events.register({
    id: 'qin_s3_4', type: 'story', npc: 'qin', when: ['talk'], once: true, priority: 5,
    cond: { loc: 'police', timeRange: DAY_POLICE, stage: { qin: 3 }, flag: { 'npc.qin.s3_2': true, 'npc.qin.s3_4': false } },
    passage: 'qin_s3_4_p1'
  });

  P('qin_s3_4_p1',
    '警局档案室收拾出了一张干净桌子。[npc:qin]老秦[/npc]把那份[item]旧案卷宗[/item]解开麻绳，第一次推到你面前。照片上的男人三十出头，笑得很正派。“孟九。我带了他六年，枪法是我一手教的。”他的手指压在照片一角，“现在他替屠夫帮管货运。北巷的伏击是他的手笔——他知道我认路的习惯。”',
    [
      { label: '“要收网的时候，带上我。”', fx: { goto: 'qin_s3_4_p2' } },
      { label: '问他打算怎么收', fx: { goto: 'qin_s3_4_p2q' } }
    ]);

  P('qin_s3_4_p2',
    '“好。”他答得没有一秒迟疑，像这个字早就备好了。他把照片翻过去扣在桌上，“但记三条：不打无准备的仗，不碰他的正面火力，不在我看不见的地方逞英雄。”他顿了顿，又补了第四条，“死在我前头，我跟你没完。”',
    [{ label: '记下', fx: { aff: { qin: 5 }, flag: { 'npc.qin.s3_4': true }, milestone: '老秦翻开了卷宗' } }]);

  P('qin_s3_4_p2q',
    '“一条一条查。”他把卷宗一页页码齐，“他手底下的点，他的货路，他换睡觉地方的规律。急不得——当年我教他反侦查，现在得连本带利收回来。”他合上卷宗看你，“这案子结不了那么快，你有的是机会搭手。”',
    [{ label: '“随时。”', fx: { aff: { qin: 5 }, flag: { 'npc.qin.s3_4': true }, milestone: '老秦翻开了卷宗' } }]);

  // ==========================================================================
  // 羁绊（stage 4）
  // ==========================================================================

  // ---- qin_s4_1 升阶→羁绊：共守避风港 ---------------------------------------
  events.register({
    id: 'qin_s4_1', type: 'story', npc: 'qin', when: ['talk'], once: true, priority: 6,
    cond: { loc: 'bar', timeRange: NIGHT_BAR, stage: { qin: 3 }, flag: { 'npc.qin.s3_4': true, 'npc.qin.s4_1': false }, aff: { qin: { gte: 80 } } },
    passage: 'qin_s4_1_p1'
  });

  P('qin_s4_1_p1',
    '酒吧里多了几样新东西：窗上钉了铁条，天台加了一个瞭望位，吧台底下藏了一根备用的撬棍。[npc:qin]老秦[/npc]带你一样样看过去，像交接防务。“这店，是我欠下的一笔旧账，守了三年。”他在天台的矮墙边站定，城市的黑影在他身后铺开，“往后，我想把它守成你我的地方。每周五晚上，陪我巡一圈这条街——不是差事，是请求。”',
    [
      { label: '“一言为定。”', fx: { goto: 'qin_s4_1_p2' } },
      { label: '伸出手，和他击掌为约', fx: { goto: 'qin_s4_1_p2' } }
    ]);

  P('qin_s4_1_p2',
    function () {
      bookWeekly('npc.qin.patrolBooked', 4, 1200, '和老秦的巡逻之夜');
      return '“一言为定。”他难得地笑了一下，皱纹里全是灯影。楼下苏曼在喊他搬酒，他应了一声，却先把一枚黄铜钥匙塞进你手心——酒吧后门的。“风大雨大，记得有地方回。”';
    },
    [{ label: '收下钥匙', fx: { stage: { qin: 4 }, flag: { 'npc.qin.s4_1': true }, aff: { qin: 5 }, milestone: '与老秦共守避风港' } }]);

  // ---- qin_patrol_1 周期事件：巡逻之夜（每周五晚） ---------------------------
  events.register({
    id: 'qin_patrol_1', type: 'scheduled', npc: 'qin', priority: 4,
    cond: { loc: 'bar', weekday: 4, timeRange: [1170, 1410], stage: { qin: { gte: 4 } } },
    passage: 'qin_patrol_p1'
  });

  P('qin_patrol_p1',
    function () {
      var pool = [
        '巡逻从酒吧后门开始，顺着街沿走到废加油站的路口再折回来。[npc:qin]老秦[/npc]的手电压得很低，光只扫墙根和车底，你们一前一后，步子踩在同一个点上。',
        '今晚有风，卷闸门在整条街上哐当作响。[npc:qin]老秦[/npc]挨家试过临街的门锁，把一扇被风掀开的窗从外面别死，“空屋子，也不能便宜了野狗。”',
        '路过街角那辆烧空的公交车，[npc:qin]老秦[/npc]照例用钢管敲了敲车壳，听三秒，再走。你问过他为什么，他说这叫报数——车里要是住进了新邻居，得先知道。'
      ];
      return pool[Math.floor(Math.random() * pool.length)];
    },
    [
      { label: '巡完这一圈', fx: { time: 90, stat: { energy: -8 }, aff: { qin: 3 }, appointment: { inDays: 7, minute: 1200, label: '和老秦的巡逻之夜' }, goto: 'qin_patrol_p2' } },
      { label: '墙根有动静，过去看看', cond: { chance: 0.5 }, fx: { combat: 'zombie_pair', goto: 'qin_patrol_p2c' } }
    ]);

  P('qin_patrol_p2',
    '回到酒吧门口，[npc:qin]老秦[/npc]把手电别回腰上，照例说一句“辛苦”。这条街今晚又是干净的——有些事没有终点，巡着巡着，就成了两个人的日子。',
    [{ label: '（进屋喝口热的）', fx: {} }]);

  P('qin_patrol_p2c',
    '解决了墙根那两只不安分的东西，[npc:qin]老秦[/npc]用鞋尖翻了翻尸体，确认不是熟面孔才直起腰。“这条街，”他把钢管扛回肩上，“有我们巡一天，它就干净一天。”',
    [{ label: '巡完剩下半圈', fx: { time: 60, stat: { energy: -6 }, aff: { qin: 3 }, appointment: { inDays: 7, minute: 1200, label: '和老秦的巡逻之夜' } } }]);

  // ---- qin_hunt 复仇长期循环（无终局） --------------------------------------
  events.register({
    id: 'qin_hunt', type: 'story', npc: 'qin', when: ['talk'], once: false, cooldown: 4320, priority: 2,
    cond: {
      anyOf: [{ loc: 'bar', timeRange: NIGHT_BAR }, { loc: 'police', timeRange: DAY_POLICE }],
      stage: { qin: { gte: 4 } }
    },
    passage: 'qin_hunt_p1'
  });

  P('qin_hunt_p1',
    '[npc:qin]老秦[/npc]把烟盒背面的城区图递给你，上面又多了一个红圈——孟九手底下的点，有时是个收货的窝棚，有时是个放哨的楼口。图上的红圈画了又划掉，划掉的比留着的多。“扫了它。就咱们俩，老规矩。”',
    [
      { label: '抄家伙跟他走', fx: { time: 60, combat: 'thug_patrol', goto: 'qin_hunt_p2' } },
      { label: '这两天缓缓再去', fx: {} }
    ]);

  P('qin_hunt_p2',
    '窝点清了，人堆里照例没有孟九。[npc:qin]老秦[/npc]翻出半本压皱的货单，就着火光看完，塞进怀里，把窝棚里能拆的油和粮分你一半。“又近了一步。”他说这话的时候，眼睛里的火像刚点着的。',
    [{ label: '收好战利品', fx: { bullets: 8, stat: { energy: -10 }, aff: { qin: 2 }, time: 90 } }]);

  // ---- qin_s4_2 羁绊成人变体（可重复） --------------------------------------
  events.register({
    id: 'qin_s4_2', type: 'story', npc: 'qin', when: ['talk'], once: false, cooldown: 2880, priority: 2,
    cond: { loc: 'bar', timeRange: [1320, 120], stage: { qin: { gte: 4 } }, flag: { 'npc.qin.s3_3': true } },
    passage: 'qin_s4_2_p1'
  });

  P('qin_s4_2_p1',
    '打烊了，[npc:qin]老秦[/npc]闩门的动作在半路停下，回头看你。灯没灭，他也不说话——这个男人到现在也学不会说那种话，只把手朝你伸过来，掌心向上，等着。',
    [
      { label: '把手放上去', fx: { goto: 'qin_s4_2_p2' } },
      { label: '今晚太累了', fx: { goto: 'qin_s4_2_pno' } }
    ]);

  P('qin_s4_2_pno',
    '“嗯。”他一点不勉强，拿外套裹住你往门外送，“回去睡。路上有事就吹哨，我听得见。”',
    [{ label: '（离开）', fx: {} }]);

  P('qin_s4_2_p2',
    function (s) {
      if (s.player.gender === 'f') {
        return '这一次没有第一夜的小心翼翼。他熟知你身上每一处会发抖的地方，手掌一寸寸碾过去，慢条斯理，像巡他那条街。你被他拆得七零八落，骂他慢，他低笑一声，俯身堵住你的嘴，腰上的动作却仍旧不肯快——直到你收紧了缠着他的腿，他才终于失了那份稳，喘息砸在你耳边，又急又烫。';
      }
      return '这一次没有第一夜的试探。他把你抵在门板上，吻从下颌一路啃到喉结，手掌熟门熟路地探下去，力道和节奏都拿捏得像巡他那条街。你抓着他的背要更多，他喉咙里滚出低笑，把你打横按回床上，身体压下来，沉，烫，呼吸在你颈窝里越来越乱，最后一声闷哼咬在你肩上，像盖了个章。';
    },
    [{ label: '（相拥而眠）', fx: { stat: { energy: -18, sanity: 6 }, time: 120, aff: { qin: 4 } } }]);

})();
