/* =============================================================================
 * minor.js — 边缘 NPC（M8：陈神父/老蔡/方哨）
 * -----------------------------------------------------------------------------
 * 节拍一览（flag 均存 npc.{id}.*）：
 *   chen 陈神父（教堂 06:00–22:00，无成人内容）
 *     chen_s0_1   初遇：教堂避难规矩（enter/talk @church）
 *     chen_confess 告解（talk 可重复，冷却一天；理智 +12 + 随机哲思短句）
 *     chen_s0_2   小剧情：埋葬门前的死者（enter/action @church 清晨，once）
 *   cai 老蔡（码头全天，无成人内容）
 *     cai_s0_1    初遇：用食物换搭话（enter/talk @dock）
 *     cai_talk    疯话换食物（talk 可重复，冷却一天；半真情报池 + 以物易物入口）
 *     cai_s0_2    小剧情：守一条永远不来的船（enter @dock 黄昏，once）
 *   fang 方哨（检查站全天）
 *     fang_s0_1   初遇：差点开枪的误会（enter/talk @checkpoint）
 *     fang_s0_2   换弹药的固定交易 + 升1（talk，好感≥20；肉干换子弹）
 *     fang_trade  肉干换子弹（talk 可重复，冷却一天）
 *     fang_s1_1   撤离那晚的真相 + 升2（talk，好感≥40；北桥另一侧的视角）
 *     fang_s2_3   可选成人段（talk，stage 2 + 好感≥50，可拒绝；NPC设定.md 已登记）
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  var story = G.data.story, events = G.data.events;

  function P(id, text, choices) { story.register({ id: id, text: text, choices: choices }); }
  var CHURCH_HOURS = [360, 1320];

  // ==========================================================================
  // 陈神父（chen）
  // ==========================================================================

  events.register({
    id: 'chen_s0_1', type: 'story', npc: 'chen', when: ['enter', 'talk'], once: true, priority: 7,
    cond: { loc: 'church', timeRange: CHURCH_HOURS, flag: { 'intro.done': true, 'npc.chen.s0_1': false } },
    passage: 'chen_s0_1_p1'
  });

  P('chen_s0_1_p1',
    function (s) {
      s.npcs.chen.met = true;
      return '教堂的门没有锁。彩窗漏下的光里，一位白发老人正在给长椅上熟睡的孩子掖毯子，听见脚步，他竖起一根手指向你示意轻声。“欢迎。”[npc:chen]陈神父[/npc]的嗓音像一口旧钟，“这里的规矩只有三条：兵器留在门房，恩怨留在门外，睡觉的人留给他的梦。”';
    },
    [
      { label: '按规矩把武器留在门房', fx: { aff: { chen: 3 }, goto: 'chen_s0_1_p2' } },
      { label: '“这年头，教堂管用吗？”', fx: { goto: 'chen_s0_1_p2q' } }
    ]);

  P('chen_s0_1_p2',
    '“日落后若无处可去，长椅可以借宿，热水在炉子上。”老人把一盏小烛台挪到你够得着的地方，“我们不问来路，也不留人过三天——躲一躲可以，日子还得回到外面去过。”',
    [{ label: '在长椅上坐一会儿', fx: { stat: { sanity: 3 }, flag: { 'npc.chen.s0_1': true }, milestone: '初遇陈神父' } }]);

  P('chen_s0_1_p2q',
    '“砖石不挡牙齿，十字不退死人。”[npc:chen]陈神父[/npc]并不动气，指了指长椅上睡熟的几个人，“可你看，人在这里睡得着。管不管用，你问他们的眉头。”',
    [{ label: '（无话可答）', fx: { stat: { sanity: 2 }, flag: { 'npc.chen.s0_1': true }, milestone: '初遇陈神父' } }]);

  // ---- 告解（每日一次理智恢复） ---------------------------------------------
  events.register({
    id: 'chen_confess', type: 'story', npc: 'chen', when: ['talk'], once: false, cooldown: 1440, priority: 2,
    cond: { loc: 'church', timeRange: CHURCH_HOURS, flag: { 'npc.chen.s0_1': true } },
    passage: 'chen_confess_p1'
  });

  P('chen_confess_p1',
    '告解室的木格窗后，[npc:chen]陈神父[/npc]的影子安静得像一件旧家具。“说吧，孩子。”他说，“说给神听，说给我听，或者只是说出来——三样都一样管用。”',
    [
      { label: '把这些天压着的事说出来', fx: { goto: 'chen_confess_p2' } },
      { label: '什么也不说，只是坐着', fx: { goto: 'chen_confess_p2b' } },
      { label: '今天先不了', fx: {} }
    ]);

  P('chen_confess_p2',
    function () {
      var pool = [
        '“罪疚是背在背上的尸体，你埋不掉它，但可以放下来，牵着它走。”',
        '“活下来不需要理由。需要理由的是别的事——比如明天再活一天。”',
        '“恨要记账，恩也要记账。只记一本的人，迟早算错。”',
        '“怕黑不丢人。丢人的是吹灭别人的灯。”',
        '“人不是熬过灾难的，是熬过一个个明天的。今天你又熬过了一个。”'
      ];
      return '木格窗后的影子静静听完，很久才开口。' + pool[Math.floor(Math.random() * pool.length)] + '走出告解室时，你胸口那块压了很多天的东西，轻了一些。';
    },
    [{ label: '（离开告解室）', fx: { stat: { sanity: 12 }, aff: { chen: 1 }, time: 30 } }]);

  P('chen_confess_p2b',
    '你在木格窗前坐了很久，一个字也没说。他也没有催，只有两个人的呼吸声和炉火的噼啪声。末了他轻声说：“沉默也是一种祷告。去吧，孩子。”',
    [{ label: '（离开告解室）', fx: { stat: { sanity: 10 }, aff: { chen: 1 }, time: 30 } }]);

  // ---- 埋葬日常 --------------------------------------------------------------
  events.register({
    id: 'chen_s0_2', type: 'story', npc: 'chen', when: ['enter', 'action'], once: true, priority: 6,
    cond: { loc: 'church', timeRange: [360, 600], flag: { 'npc.chen.s0_1': true, 'npc.chen.s0_2': false } },
    passage: 'chen_s0_2_p1'
  });

  P('chen_s0_2_p1',
    '清晨的教堂后院，[npc:chen]陈神父[/npc]正在挖坑，动作慢，但每一锹都不停。担架上躺着一个用麻布裹好的人——夜里倒在教堂门口的，谁也不认识。旁边摊开一本厚厚的[item]安葬名册[/item]，新的一行只写了日期，名字那栏空着。',
    [
      { label: '接过铁锹帮他挖', fx: { stat: { energy: -8 }, time: 60, aff: { chen: 4 }, goto: 'chen_s0_2_p2' } },
      { label: '帮他扶正担架', fx: { time: 30, aff: { chen: 3 }, goto: 'chen_s0_2_p2' } }
    ]);

  P('chen_s0_2_p2',
    '填完最后一捧土，老人在名册的名字栏里写下「无名氏 · 教堂门前」，字迹工整得像在签一份重要文书。“名册上记了一百三十七个。”他合上本子，“有名字的六十一个。剩下的，等有人来认——认不到，就由我记着。”他拍拍你肩上的土，“谢谢你，孩子。今天他走得不孤单。”',
    [{ label: '（在坟前站一会儿）', fx: { stat: { sanity: 3 }, flag: { 'npc.chen.s0_2': true }, milestone: '帮陈神父葬了一位无名者' } }]);

  // ==========================================================================
  // 老蔡（cai）
  // ==========================================================================

  events.register({
    id: 'cai_s0_1', type: 'story', npc: 'cai', when: ['enter', 'talk'], once: true, priority: 7,
    cond: { loc: 'dock', flag: { 'intro.done': true, 'npc.cai.s0_1': false } },
    passage: 'cai_s0_1_p1'
  });

  P('cai_s0_1_p1',
    function (s) {
      s.npcs.cai.met = true;
      return '码头尽头的缆桩上坐着个老头，裹着三层看不出颜色的外套，正对着空荡荡的江面自言自语。看见你，他把手一伸，理直气壮：“过路费。”[npc:cai]老蔡[/npc]咧开缺牙的嘴，“吃的。给吃的，老蔡跟你说话；不给，老蔡跟江说话——江可比你有意思。”';
    },
    [
      { label: '递给他一个罐头', cond: { has: { item: 'cannedfood' } }, fx: { item: { cannedfood: -1 }, aff: { cai: 5 }, goto: 'cai_s0_1_p2' } },
      { label: '递给他一个饭团', cond: { has: { item: 'riceball' } }, fx: { item: { riceball: -1 }, aff: { cai: 5 }, goto: 'cai_s0_1_p2' } },
      { label: '“下次带吃的再来。”', fx: { goto: 'cai_s0_1_p2b' } }
    ]);

  P('cai_s0_1_p2',
    '老头接过吃的，掰一半揣进怀里，剩下的慢慢吃完，才心满意足地开了口：“告诉你个事儿——超市那个铁塔似的，周五进货，下午的货最全。”他冲你挤挤眼，“老蔡疯，老蔡不瞎。码头上过什么船、城里走什么货，老蔡门儿清。”',
    [{ label: '记下这条', fx: { flag: { 'npc.cai.s0_1': true }, milestone: '初遇老蔡' } }]);

  P('cai_s0_1_p2b',
    '“那就下次。”老头一点不恼，转回去继续对着江面嘟囔。你走出十几步还能听见他的声音，像在跟谁汇报：“……今天又来一个，空着手，下回会带吃的，是个懂规矩的。”',
    [{ label: '（离开）', fx: { flag: { 'npc.cai.s0_1': true }, milestone: '初遇老蔡' } }]);

  // ---- 疯话换食物（可重复） + 以物易物入口 ----------------------------------
  events.register({
    id: 'cai_talk', type: 'story', npc: 'cai', when: ['talk'], once: false, cooldown: 1440, priority: 2,
    cond: { loc: 'dock', flag: { 'npc.cai.s0_1': true } },
    passage: 'cai_talk_p1'
  });

  P('cai_talk_p1',
    '[npc:cai]老蔡[/npc]照例把手一伸：“老规矩。吃的换话，破烂换破烂——今天你要哪样？”',
    [
      { label: '给个罐头，听他说话', cond: { has: { item: 'cannedfood' } }, fx: { item: { cannedfood: -1 }, aff: { cai: 2 }, goto: 'cai_talk_p2' } },
      { label: '给块压缩饼干，听他说话', cond: { has: { item: 'drycracker' } }, fx: { item: { drycracker: -1 }, aff: { cai: 2 }, goto: 'cai_talk_p2' } },
      { label: '看看他今天想换什么破烂', fx: { shop: 'cai_barter' } },
      { label: '今天不换', fx: {} }
    ]);

  P('cai_talk_p2',
    function () {
      var pool = [
        '“商场那帮戴红布条的，四个钟头换一班岗，交接那会儿门口就剩一个。老蔡数过，数了七遍，回回一样。”',
        '“夜里别走公园，那边换主人了——腿快的那种。白天没事，白天它们晒不得。”',
        '“地铁底下有铁家伙，军爷们撤的时候丢的。想去捡，多带光——那底下的东西怕光，也就只怕光。”',
        '“教堂的老神父又添新坟了。你去帮他搭把手，老头儿的腰撑不了几年喽。”',
        '“检查站那个小兵蛋子，夜里抱着枪说梦话，喊「班长」。老蔡听着心里酸，第二天给他送了半条鱼。”',
        '“江心夜里有灯。三短，一长，跟老年月的航标一个打法。别人说老蔡眼花——老蔡打了三十年鱼，认得灯。”'
      ];
      var line = pool[Math.floor(Math.random() * pool.length)];
      var tail = '';
      if (G.engine.stageGet && G.engine.stageGet('mao') >= 4) {
        tail = '临了他忽然压低声音，嘿嘿一笑：“那只紫爪子的猫儿又来蹲过，坐老蔡这儿听了半宿闲话——她拿去卖钱的话，老蔡一口价，一个罐头。”';
      }
      return '老头吃完东西，抹抹嘴，凑近半分：' + line + tail;
    },
    [{ label: '记下', fx: {} }]);

  // ---- 守船小剧情 ------------------------------------------------------------
  events.register({
    id: 'cai_s0_2', type: 'story', npc: 'cai', when: ['enter', 'action'], once: true, priority: 6,
    cond: { loc: 'dock', timeRange: [1020, 1260], flag: { 'npc.cai.s0_1': true, 'npc.cai.s0_2': false } },
    passage: 'cai_s0_2_p1'
  });

  P('cai_s0_2_p1',
    '黄昏的码头，[npc:cai]老蔡[/npc]忙得一反常态：他把几盏捡来的灯沿着泊位摆成一条线，逐盏点亮，又踮着脚把缆绳理顺盘好——那是一套熟练的、迎船靠岸的活。可江面上什么都没有。',
    [
      { label: '问他在等什么船', fx: { goto: 'cai_s0_2_p2' } },
      { label: '默默帮他把最后一盏灯摆正', fx: { aff: { cai: 4 }, goto: 'cai_s0_2_p2' } }
    ]);

  P('cai_s0_2_p2',
    '“撤侨船。最后一班。”老头从贴身的口袋里摸出一张塑封的[item]旧照片[/item]——码头，人山人海，一个女人抱着孩子在舷梯上回头笑。“票买上了，仨人的。老婆子带着孙儿先上，老蔡回去牵狗——”他把照片举向空荡的江面，像给谁看，“就一炷香的工夫。回来，船开了。”他一盏盏检查着灯，声音平平的，“船长喊了话的，说还有下一班。老蔡等着。灯亮着，船好认。”',
    [
      { label: '陪他等到天黑', fx: { time: 60, stat: { sanity: -2 }, aff: { cai: 6 }, flag: { 'npc.cai.s0_2': true }, milestone: '老蔡的灯' } },
      { label: '“会来的。灯这么亮，错不了。”', fx: { aff: { cai: 5 }, flag: { 'npc.cai.s0_2': true }, milestone: '老蔡的灯' } }
    ]);

  // ==========================================================================
  // 方哨（fang）
  // ==========================================================================

  events.register({
    id: 'fang_s0_1', type: 'story', npc: 'fang', when: ['enter', 'talk'], once: true, priority: 7,
    cond: { loc: 'checkpoint', flag: { 'intro.done': true, 'npc.fang.s0_1': false } },
    passage: 'fang_s0_1_p1'
  });

  P('fang_s0_1_p1',
    function (s) {
      s.npcs.fang.met = true;
      return '“站住！口令！”一声变了调的吼从沙袋后面炸出来，紧跟着是拉枪栓的脆响。沙袋后探出半张年轻得过分的脸，[npc:fang]方哨[/npc]的枪口抖得画圈，“再、再走一步我开枪了！我真开！”他的手指扣在扳机护圈外面——绷得死紧，却没敢搭上扳机。';
    },
    [
      { label: '举起双手，慢慢报出名字', fx: { aff: { fang: 3 }, goto: 'fang_s0_1_p2' } },
      { label: '原地站定，等他自己冷静', fx: { aff: { fang: 1 }, goto: 'fang_s0_1_p2' } }
    ]);

  P('fang_s0_1_p2',
    '对峙了足足半分钟，他才把枪压下来，整个人顺着沙袋滑坐下去，大口喘气。“活人……”他抹了把脸，笑得比哭还难看，“三天没见着活人了，刚才那动静我以为——算了。”他掸掸军裤上的土站起来，努力挺直腰板，“这里是四号检查站。我叫方哨。有弹药需求可以谈，别的……别的别问。”',
    [{ label: '点头致意', fx: { flag: { 'npc.fang.s0_1': true }, milestone: '初遇方哨' } }]);

  // ---- 换弹药的固定交易 + 升1 -----------------------------------------------
  events.register({
    id: 'fang_s0_2', type: 'story', npc: 'fang', when: ['talk'], once: true, priority: 5,
    cond: { loc: 'checkpoint', stage: { fang: 0 }, flag: { 'npc.fang.s0_1': true, 'npc.fang.s0_2': false }, aff: { fang: { gte: 20 } } },
    passage: 'fang_s0_2_p1'
  });

  P('fang_s0_2_p1',
    '[npc:fang]方哨[/npc]把你领到岗亭后面，掀开一块防雨布——码得整整齐齐的弹药箱，军绿色，封条完好。“撤的时候留下的，账在我这儿。”他挺了挺胸，随即又泄了气似的挠头，“反正……反正也没人来对账了。子弹换东西，明码实价。[item]肉干[/item]最好——罐头吃腻了，做梦都是肉干味。”',
    [
      { label: '用肉干换一把子弹', cond: { has: { item: 'driedmeat' } }, fx: { item: { driedmeat: -1 }, bullets: 8, aff: { fang: 3 }, goto: 'fang_s0_2_p2' } },
      { label: '“记下了，往后常来。”', fx: { goto: 'fang_s0_2_p2' } }
    ]);

  P('fang_s0_2_p2',
    '“往后要弹药，直接来。”[npc:fang]方哨[/npc]把防雨布重新盖好，压上石块，动作一丝不苟得像在执行条令，“这站里别的没有，枪子儿管够——都是有账的东西，我看着，一发也丢不了。”',
    [{ label: '“成交。”', fx: { stage: { fang: 1 }, flag: { 'npc.fang.s0_2': true }, milestone: '方哨的弹药生意' } }]);

  // ---- 肉干换子弹（可重复） --------------------------------------------------
  events.register({
    id: 'fang_trade', type: 'story', npc: 'fang', when: ['talk'], once: false, cooldown: 1440, priority: 2,
    cond: { loc: 'checkpoint', stage: { fang: { gte: 1 } } },
    passage: 'fang_trade_p1'
  });

  P('fang_trade_p1',
    '[npc:fang]方哨[/npc]老远就朝你包上瞟，喉结动了动：“今天……带肉干了吗？”',
    [
      { label: '一条肉干换他八发子弹', cond: { has: { item: 'driedmeat' } }, fx: { item: { driedmeat: -1 }, bullets: 8, aff: { fang: 2 } } },
      { label: '看看他的弹药存货', fx: { shop: 'fang_ammo' } },
      { label: '今天没带', fx: {} }
    ]);

  // ---- 撤离那晚的真相 + 升2 --------------------------------------------------
  events.register({
    id: 'fang_s1_1', type: 'story', npc: 'fang', when: ['talk'], once: true, priority: 5,
    cond: { loc: 'checkpoint', timeRange: [1140, 120], stage: { fang: 1 }, flag: { 'npc.fang.s1_1': false }, aff: { fang: { gte: 40 } } },
    passage: 'fang_s1_1_p1'
  });

  P('fang_s1_1_p1',
    '夜里的检查站冷得快。[npc:fang]方哨[/npc]拢着一小堆火，看见你来，往旁边挪了挪让出位置。火光里他盯着自己的枪看了很久，忽然开口：“他们都管我叫逃兵。名单上我也是逃兵。”他扯了下嘴角，“你想不想听真的？”',
    [{ label: '“说吧，我听着。”', fx: { goto: 'fang_s1_1_p2' } }]);

  P('fang_s1_1_p2',
    '“封城第七天，我们班守北桥桥面。人潮冲卡，上头的命令一级级压下来——上刺刀，一个不放。”他的手在膝盖上攥成拳，指节咯咯响，“班长照办了。我旁边的兵也照办了。我看着刺刀前头那些脸……”他的喉咙滚了几下，“我把枪一扔，翻过护栏，顺着桥墩爬下去的。跑的时候身后全是喊「逃兵」的声音。”火堆噼啪炸了一下，他声音低下去，“枪我后来捡回来了。命令，我到今天也没捡。”',
    [
      { label: '“扔得对。那道命令不配被执行。”', fx: { aff: { fang: 6 }, goto: 'fang_s1_1_p3' } },
      { label: '往火里添根柴，陪他坐着', fx: { aff: { fang: 5 }, goto: 'fang_s1_1_p3' } }
    ]);

  P('fang_s1_1_p3',
    '[npc:fang]方哨[/npc]长长呼出一口白气，像卸掉一副背了三个月的背囊。“这事我谁都没说过。说出来……好像也没塌下来什么。”他把枪抱回怀里，抱姿松了很多，“谢了。往后你过这道卡，不用喊口令。”',
    [{ label: '（在火边多坐一会儿）', fx: { stage: { fang: 2 }, time: 60, flag: { 'npc.fang.s1_1': true }, milestone: '北桥的另一侧' } }]);

  // ---- fang_s2_3 可选成人段 --------------------------------------------------
  events.register({
    id: 'fang_s2_3', type: 'story', npc: 'fang', when: ['talk'], once: false, cooldown: 1440, priority: 5,
    cond: { loc: 'checkpoint', timeRange: [1140, 120], stage: { fang: 2 }, flag: { 'npc.fang.s1_1': true, 'npc.fang.s2_3': false }, aff: { fang: { gte: 50 } } },
    passage: 'fang_s2_3_p1'
  });

  P('fang_s2_3_p1',
    '岗亭里生着小火炉，暖和得让人不想走。[npc:fang]方哨[/npc]替你倒了热水，递杯子的时候手指碰到你的，像被烫到一样缩回去，耳朵瞬间红透。“那个……”他盯着自己的鞋尖，声音越来越小，“今晚风大。你要是……要是不嫌弃这儿，可以留下。行军床是新领的，没人睡过。我、我可以睡外头岗位上——除非你说不用。”',
    [
      { label: '“不用。进来一起暖和。”', fx: { goto: 'fang_s2_3_p2' } },
      { label: '“今晚得赶路，下次吧。”', fx: { goto: 'fang_s2_3_pout' } }
    ]);

  P('fang_s2_3_pout',
    '“哦！行，行。”他站得笔直，如释重负又肉眼可见地失落，一路把你送出路障，还塞给你一小包压缩饼干。“路上……路上小心。”你走出很远回头，他还站在原地，朝你抬手敬了个不太标准的礼。',
    [{ label: '（离开）', fx: { aff: { fang: 1 }, item: { drycracker: 1 } } }]);

  P('fang_s2_3_p2',
    function (s) {
      var head = '岗亭窄得两个人转身都难，火炉把空气烤得发烫。他紧张得连呼吸都在打拍子，脱军外套时袖子卡在手腕上，你伸手帮他，他浑身一颤，像新兵头一次实弹。';
      if (s.player.gender === 'f') {
        return head + '“我没……我是说，我不太会。”他老老实实交代，眼睛却亮得像枪口的准星。你带着他的手放到该放的地方，他学得又认真又笨，力道全程小心翼翼，仿佛你是一枚没退保险的雷。可年轻人的身体诚实又汹涌，到后来他把脸埋在你肩窝，喘息混着一声接一声的道歉和感谢，行军床的铁架吱呀作响，火炉映着他通红的耳根——这大概是这座废墟成了废墟以来，最不像废墟的一晚。';
      }
      return head + '“我没跟人……我是说——”他语无伦次，你干脆用行动替他把话堵回去。他学得快，军人的身体又直又韧，起初生涩得同手同脚，被你带上道之后就变成了不管不顾的猛，行军床的铁架被顶得吱呀作响。完事他还条件反射地想报数，被你笑着按回床上，红着耳朵把脸埋进你颈窝，闷闷地说了句：“……首长英明。”';
    },
    [{ label: '搂着这个小兵', fx: { goto: 'fang_s2_3_p3' } }]);

  P('fang_s2_3_p3',
    '后半夜他睡得很沉——大概是从军以来头一次有人替他守夜。你替他添了次炭，看见枕头底下压着一枚磨亮的[item]军牌[/item]，链子断了又接过。天蒙蒙亮他惊醒，发现你还在，整个人肉眼可见地松下来，小声说：“……还以为是做梦。”',
    [{ label: '（天亮前再睡一会儿）', fx: { stat: { energy: -15, sanity: 6 }, time: 300, aff: { fang: 6 }, flag: { 'npc.fang.s2_3': true }, milestone: '岗亭里的一夜' } }]);

})();
