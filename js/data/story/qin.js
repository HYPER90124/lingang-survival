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
    '[npc:qin]老秦[/npc]难得先开口。他把烟头在鞋底摁灭，从怀里摸出半张手绘的楼层图：“看你这几天进出，手脚还算干净。警局二楼档案室塌了半边，里头压着一份[item]旧案卷宗[/item]，九十七号柜。我这身板钻不进缺口。”他的指节在图上敲了敲，“你去，报酬十发子弹。”',
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
