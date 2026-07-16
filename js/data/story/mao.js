/* =============================================================================
 * mao.js — 灰猫剧情·前半（M5：警惕→熟识→信任）
 * -----------------------------------------------------------------------------
 * 灰猫在信任（stage 2）之前没有作息表（npcs.js 仅登记 stageMin:2 的下水道
 * 据点），所以警惕/熟识两阶段的节拍全部用 enter/action 随机遭遇承载
 * （anyOf: sewer/dock），信任起才有 talk 入口。
 *
 * 节拍一览（flag 均存 npc.mao.*）：
 *   警惕（stage 0）
 *     mao_s0_1  初遇：卖半真半假的商场情报（买下/识破/不理都推进）
 *     mao_s0_2  情报兑现：商场夹层有货也有埋伏（仅买家触发，吃亏路线）
 *     mao_s0_3  二遇：补一条白送的真情报（按初遇选择分支）
 *     mao_s0_4  升阶→熟识：谈成长期买卖（需好感≥20，解锁情报购买 intelShop）
 *   熟识（stage 1）
 *     mao_intel 情报购买玩法（可重复，冷却一天；5 子弹一条，掺闲聊选项）
 *     mao_s1_1  她被屠夫帮追杀，主角掩护（演戏或动手两路）
 *     mao_s1_2  江边喝酒，互探来历（她的话半真半假）
 *     mao_s1_3  升阶→信任：带你去她的下水道据点（需好感≥40，fx.stage）
 *   信任（stage 2，据点 talk 入口）
 *     mao_s2_1  教你走地下捷径 → setFlag world.sewerShortcut（M3 交接约定）
 *     mao_s2_2  透露她在替「某个买家」收病毒文件（不揭晓买家）
 *     mao_s2_3  越轨：不收子弹收「利息」（信任阶段成人事件，已在 NPC设定.md
 *               补登记；她主导并中止，全程自愿，正戏留给 M6）
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  var story = G.data.story, events = G.data.events;

  function P(id, text, choices) { story.register({ id: id, text: text, choices: choices }); }
  var MAO_TURF = [{ loc: 'sewer' }, { loc: 'dock' }];   // 她出没的两处

  // ==========================================================================
  // 警惕（stage 0）
  // ==========================================================================

  // ---- mao_s0_1 初遇 --------------------------------------------------------
  events.register({
    id: 'mao_s0_1', type: 'story', npc: 'mao', when: ['enter', 'action'], once: true, priority: 8,
    cond: { anyOf: MAO_TURF, stage: { mao: 0 }, flag: { 'intro.done': true, 'npc.mao.s0_1': false } },
    passage: 'mao_s0_1_p1'
  });

  P('mao_s0_1_p1',
    function (s) {
      s.npcs.mao.met = true;
      return '打火机咔的一声在阴影里亮起，你握武器的手抬到一半。那是个女人，蹲在你够不着的高处，帽檐压得很低，指间转着一枚弹壳。“放松，我不咬人。”她的笑声先落下来，“我做消息买卖，你可以叫我[npc:mao]灰猫[/npc]。见面礼：中环商场三楼有个没搬空的仓库——细节，五发子弹。”';
    },
    [
      { label: '付五发子弹，买下情报', cond: { has: { bullets: 5 } }, fx: { bullets: -5, flag: { 'npc.mao.bought': true }, aff: { mao: 2 }, goto: 'mao_s0_1_p2buy' } },
      { label: '“商场是屠夫帮的地盘，轮得到你卖？”', fx: { goto: 'mao_s0_1_p2call' } },
      { label: '不感兴趣，转身要走', fx: { goto: 'mao_s0_1_p2no' } }
    ]);

  P('mao_s0_1_p2buy',
    '“痛快。”她接过子弹，凑近了半分，声音压得只有你们俩听得见：“三楼东侧的旧货梯井，顺着检修爬梯下到夹层，货架上的东西没人动过。”她从高处跳下来，落地几乎没有声音，“丑话说在前头——我的消息，保真七成。”她冲你眨眨眼，退进黑暗里没了影。',
    [{ label: '记下情报', fx: { flag: { 'npc.mao.s0_1': true }, milestone: '初遇灰猫' } }]);

  P('mao_s0_1_p2call',
    '她转弹壳的手指停了。“哟。”她把帽檐往上推了半寸，露出一双发亮的眼睛，“这城里十个人有九个先摸子弹，你先动了脑子。”她利落地跳下来，“罚我请客：商场的货是真的，可楼里窝着的东西也是真的——这半条，免费。”',
    [
      { label: '“那另外半条呢？”', fx: { goto: 'mao_s0_1_p2call2' } },
      { label: '记下这份人情', fx: { flag: { 'npc.mao.s0_1': true, 'npc.mao.sawThrough': true }, aff: { mao: 4 }, milestone: '初遇灰猫' } }
    ]);

  P('mao_s0_1_p2call2',
    '“另外半条，要收钱啦。”[npc:mao]灰猫[/npc]笑得理直气壮，倒退着走进阴影，“记住这张脸——下水道和码头都能碰见我，带够子弹再来。”',
    [{ label: '（目送她消失）', fx: { flag: { 'npc.mao.s0_1': true, 'npc.mao.sawThrough': true }, aff: { mao: 4 }, milestone: '初遇灰猫' } }]);

  P('mao_s0_1_p2no',
    '“哎——机会只敲一次门。”她也不恼，把弹壳抛起来又接住，“不过没关系，你会回头的，这城里人人都缺消息。”你走出十几步回头再看，高处已经空了，像刚才只是一场幻觉。',
    [{ label: '（离开）', fx: { flag: { 'npc.mao.s0_1': true }, milestone: '初遇灰猫' } }]);

  // ---- mao_s0_2 情报兑现（仅买家） ------------------------------------------
  events.register({
    id: 'mao_s0_2', type: 'story', npc: 'mao', when: ['enter', 'action'], once: true, priority: 7,
    cond: { loc: 'mall', flag: { 'npc.mao.bought': true, 'npc.mao.s0_2': false } },
    passage: 'mao_s0_2_p1'
  });

  P('mao_s0_2_p1',
    '货梯井果然在三楼东侧，检修爬梯锈得厉害但还结实。你摸下夹层，借着通风口漏下的光看过去——货架上真码着成箱的东西，灰猫的消息是真的。可你脚边的地面上拖痕纵横，新鲜得发亮，这半条，她可没提。',
    [
      { label: '抄家伙，把窝在里面的东西清掉', fx: { combat: 'crawler_ambush', goto: 'mao_s0_2_p2' } },
      { label: '不冒这个险，退出去', fx: { flag: { 'npc.mao.s0_2': true }, goto: 'mao_s0_2_p2b' } }
    ]);

  P('mao_s0_2_p2',
    '夹层重新静下来，你撬开最近的两只货箱——罐头、[item]烈酒[/item]，还有半箱压缩饼干，全是能救命的硬货。灰猫那句话在你耳边打转：保真七成。货是真的，埋伏也是真的，这买卖，你算是见识了。',
    [{ label: '装满背包离开', fx: { item: { cannedfood: 2, liquor: 1, drycracker: 2 }, flag: { 'npc.mao.s0_2': true, 'npc.mao.ateLoss': true }, milestone: '灰猫的七成真话' } }]);

  P('mao_s0_2_p2b',
    '你退回爬梯上，井底的黑暗安静得可疑。到手的便宜和埋着的钩子，灰猫把两样拴在一起卖给你——这一课，值五发子弹。',
    [{ label: '（离开）', fx: {} }]);

  // ---- mao_s0_3 二遇 --------------------------------------------------------
  events.register({
    id: 'mao_s0_3', type: 'story', npc: 'mao', when: ['enter', 'action'], once: true, priority: 6,
    cond: { anyOf: MAO_TURF, stage: { mao: 0 }, flag: { 'npc.mao.s0_1': true, 'npc.mao.s0_3': false }, chance: 0.6 },
    passage: 'mao_s0_3_p1'
  });

  P('mao_s0_3_p1',
    function () {
      if (G.engine.getFlag('npc.mao.bought')) {
        return '“货还热乎吗？”[npc:mao]灰猫[/npc]不知从哪儿冒出来，走在你侧后半步的位置，“别瞪我，保真七成，我可提前说了。剩下三成——”她摊开手，“得加钱。不过看在你没折在里面的份上，利息我认。”';
      }
      if (G.engine.getFlag('npc.mao.sawThrough')) {
        return '“又见面了，动脑子的。”[npc:mao]灰猫[/npc]从管道的阴影里荡出来，看上去心情不错，“上回你赢了我半条消息。我这人最讲信用——欠的账，今天还。”';
      }
      return '“回头客。”[npc:mao]灰猫[/npc]倚在锈住的阀门上，像是等了你很久，“我就说你会回头。第一单打折，还附赠售后——这待遇，过了这村可没这店。”';
    },
    [{ label: '听听她这次要说什么', fx: { goto: 'mao_s0_3_p2' } }]);

  P('mao_s0_3_p2',
    '“白送一条，验验货。”她竖起一根手指，“惠民超市的赵铁，每逢周五进货，当天下午货最全、价最松。还有——”她的声音沉了半度，“最近入夜别往公园和商场那头去，有些东西换了猎场。”说完她拍拍你的肩，“交个朋友，往后消息优先卖你。”',
    [
      { label: '收下这份人情', fx: { aff: { mao: 5 }, flag: { 'npc.mao.s0_3': true } } },
      { label: '问她消息都从哪儿来', fx: { goto: 'mao_s0_3_p2q' } }
    ]);

  P('mao_s0_3_p2q',
    '“地下的耳朵，水里的眼睛。”[npc:mao]灰猫[/npc]眨眨眼，答了等于没答，“干我们这行的，货源就是命根子，问货源等于抢劫，懂？”她倒退两步没入黑暗，声音还飘在原地，“下次带上子弹——朋友归朋友，账归账。”',
    [{ label: '（离开）', fx: { aff: { mao: 4 }, flag: { 'npc.mao.s0_3': true } } }]);

  // ---- mao_s0_4 升阶→熟识 ---------------------------------------------------
  events.register({
    id: 'mao_s0_4', type: 'story', npc: 'mao', when: ['enter', 'action'], once: true, priority: 6,
    cond: { anyOf: MAO_TURF, stage: { mao: 0 }, flag: { 'npc.mao.s0_3': true, 'npc.mao.s0_4': false }, aff: { mao: { gte: 20 } } },
    passage: 'mao_s0_4_p1'
  });

  P('mao_s0_4_p1',
    '“站住，往左半步。”[npc:mao]灰猫[/npc]的声音从头顶落下来。你依言挪开——脚边的排水格栅塌了一角，底下是两米深的黑洞。她跳下来，把你上下打量一遍：“这阵子你在城里跑得挺勤，跟谁交好、替谁跑腿，我这儿都有账。瞧，我一直看着你呢。”',
    [
      { label: '“盯梢别人，是你的爱好？”', fx: { goto: 'mao_s0_4_p2a' } },
      { label: '“那你看出什么了？”', fx: { goto: 'mao_s0_4_p2b' } }
    ]);

  P('mao_s0_4_p2a',
    '“是本钱。”[npc:mao]灰猫[/npc]答得理直气壮，“看得多，才卖得准。不过你不一样——看你，不是为了做生意。”她自己愣了半拍，随即用笑盖过去，“行了，别多想。谈正事：往后我的消息，你拿优先价，头一个挑。”',
    [{ label: '“怎么个买法？”', fx: { goto: 'mao_s0_4_p3' } }]);

  P('mao_s0_4_p2b',
    '“看出你这人……成色不错。”[npc:mao]灰猫[/npc]难得认真地看了你两秒，又立刻把语气抛回轻佻，“别得意，这是生意人的眼光。谈正事：往后我的消息，你拿优先价，头一个挑。”',
    [{ label: '“怎么个买法？”', fx: { goto: 'mao_s0_4_p3' } }]);

  P('mao_s0_4_p3',
    '“老规矩，一口价，五发子弹一条，童叟无欺——七成保真。”她朝你伸出手，“想找我，就在下水道口或者码头晃一圈，我自然会出现。成交？”你握上去，她的手心干燥有力，指腹全是茧。',
    [{ label: '“成交。”', fx: { stage: { mao: 1 }, aff: { mao: 3 }, flag: { 'npc.mao.s0_4': true, 'npc.mao.intelShop': true }, milestone: '和灰猫谈成长期买卖' } }]);

  // ==========================================================================
  // 熟识（stage 1）
  // ==========================================================================

  // ---- mao_intel 情报购买（可重复；priority 低于剧情节拍，被剧情优先截胡） ----
  events.register({
    id: 'mao_intel', type: 'story', npc: 'mao', when: ['enter', 'action', 'talk'], once: false, cooldown: 1440, priority: 2,
    cond: { anyOf: MAO_TURF, flag: { 'npc.mao.intelShop': true } },
    passage: 'mao_intel_p1'
  });

  P('mao_intel_p1',
    '“老主顾。”[npc:mao]灰猫[/npc]照例不知从哪个影子里钻出来，冲你晃了晃手指，“今天开张吗？一口价，五发子弹一条消息，七成保真。”',
    [
      { label: '买一条', cond: { has: { bullets: 5 } }, fx: { bullets: -5, aff: { mao: 1 }, goto: 'mao_intel_p2' } },
      { label: '不买，闲聊两句', fx: { aff: { mao: 1 }, goto: 'mao_intel_p3' } },
      { label: '今天不了', fx: {} }
    ]);

  P('mao_intel_p2',
    function () {
      var pool = [
        '“惠民超市周五补货，当天下午去，货全价松，赵铁心情也好。”',
        '“商场高层的货没搬空，可屠夫帮巡得勤，四个钟头一换岗，交接那阵最松。”',
        '“地铁站深处有军队撤走时丢下的东西。没光源别下去——下去了，也别出声。”',
        '“公园白天算安全，入夜就换主人了，最近有一群跑得飞快的东西在那边转。”',
        '“医院的药柜被人翻过八遍了，可地下配药房的夹墙里说不定还有存货——这条我自己没验过，打个对折信。”',
        '“检查站那个兵蛋子手里囤着弹药，拿肉干跟他换，比拿子弹跟赵铁买划算。”'
      ];
      var line = pool[Math.floor(Math.random() * pool.length)];
      return '她凑到你耳边，声音轻得像气流：' + line + '说完她退开一步，摊手：“验不验随你，童叟无欺。”';
    },
    [{ label: '记下', fx: {} }]);

  P('mao_intel_p3',
    '她跟你有一搭没一搭地聊城里的闲话——谁跟谁闹翻了，哪片又过了尸群。说的大半是真的，掺的那句假话你没挑出来。也可能今天她一句假话都没掺，这反倒更让你不习惯。',
    [{ label: '（离开）', fx: {} }]);

  // ---- mao_s1_1 被屠夫帮追杀 ------------------------------------------------
  events.register({
    id: 'mao_s1_1', type: 'story', npc: 'mao', when: ['enter', 'action'], once: true, priority: 8,
    cond: { anyOf: MAO_TURF, stage: { mao: 1 }, flag: { 'npc.mao.s1_1': false } },
    passage: 'mao_s1_1_p1'
  });

  P('mao_s1_1_p1',
    '急促的脚步声由远及近，[npc:mao]灰猫[/npc]从拐角冲出来，一把攥住你的衣襟把你拽进阴影，整个人贴上来，气息全乱了：“借你三分钟——配合点，别说话。”话音刚落，两条持刀的人影追了进来，袖口都缠着暗红的布条，屠夫帮的记号。',
    [
      { label: '顺势搂住她，装成一对翻仓库的亡命鸳鸯', fx: { goto: 'mao_s1_1_p2act' } },
      { label: '把她挡到身后，抄起武器', fx: { combat: 'thug_patrol', goto: 'mao_s1_1_p2fight' } }
    ]);

  P('mao_s1_1_p2act',
    '“喂，见着一个跑单的女人没有？”持刀的凑过来，刀尖挑着你们俩打量。你报了个现编的货主名号，抱怨这年头搂着相好的说话都要被查。[npc:mao]灰猫[/npc]把脸埋在你颈窝里发抖——手却把一柄匕首稳稳抵在你腰侧，防他们，也防你。那两人骂骂咧咧搜了一圈，走了。',
    [{ label: '等脚步声走远，再松手', fx: { aff: { mao: 8 }, stat: { sanity: -2 }, goto: 'mao_s1_1_p3' } }]);

  P('mao_s1_1_p2fight',
    '巷子里只剩你的喘息。[npc:mao]灰猫[/npc]从掩体后面转出来，看看地上，又看看你，咂了下嘴：“本来能不见血的……”她顿了顿，到底把后半句咽了回去，换成很轻的两个字，“谢了。”',
    [{ label: '问她到底惹上了什么', fx: { aff: { mao: 7 }, goto: 'mao_s1_1_p3' } }]);

  P('mao_s1_1_p3',
    '“拿了点不该拿的东西。”[npc:mao]灰猫[/npc]整了整帽檐，语气又轻飘起来，“具体的别问——问了，你就得跟我一起跑路。”她从兜里摸出半板[item]巧克力[/item]拍进你手心，“预付款。往后这种事，说不定还有。”她冲你敬了个不伦不类的礼，翻进排水口消失了。',
    [{ label: '收下预付款', fx: { item: { chocolatebar: 1 }, flag: { 'npc.mao.s1_1': true }, milestone: '替灰猫挡了一次追杀' } }]);

  // ---- mao_s1_2 江边喝酒 ----------------------------------------------------
  events.register({
    id: 'mao_s1_2', type: 'story', npc: 'mao', when: ['enter', 'action'], once: true, priority: 6,
    cond: { anyOf: MAO_TURF, stage: { mao: 1 }, flag: { 'npc.mao.s1_1': true, 'npc.mao.s1_2': false }, chance: 0.7 },
    passage: 'mao_s1_2_p1'
  });

  P('mao_s1_2_p1',
    '这次[npc:mao]灰猫[/npc]没谈买卖。她坐在探出江面的废弃管道上，脚边摆着两瓶[item]啤酒[/item]，见你来了拍拍身边的位置：“坐会儿，今天的风不臭。”她用牙起开瓶盖递给你，“问你个事——爆发那天，你在哪儿？”',
    [{ label: '老实说，你记不清了', fx: { goto: 'mao_s1_2_p2' } }]);

  P('mao_s1_2_p2',
    '你说了安全屋、头上的伤和拼不起来的记忆。她听得很专注，指尖在瓶身上轻轻地敲。“有意思。”她眯起眼，“这城里大半活人的底细我都查得到，唯独你，一片空白。”她仰头灌了口酒，“放心，我不查朋友——朋友价，查不起。”',
    [
      { label: '“那你呢？爆发那天你在哪儿？”', fx: { goto: 'mao_s1_2_p2q' } },
      { label: '和她碰一下瓶子', fx: { aff: { mao: 3 }, stat: { alcohol: 5 }, flag: { 'npc.mao.s1_2': true }, time: 30 } }
    ]);

  P('mao_s1_2_p2q',
    '“我啊——”[npc:mao]灰猫[/npc]的答案来得毫不迟疑，“在城南给人当伴娘，婚宴吃到一半就散了场。”她讲得活灵活现，连新娘子跑丢一只鞋都有鼻子有眼。你不知道这话几成是真的，按她自己的规矩，起码掺了一句假的。',
    [{ label: '陪她把酒喝完', fx: { aff: { mao: 4 }, stat: { alcohol: 8 }, flag: { 'npc.mao.s1_2': true }, time: 60 } }]);

  // ---- mao_s1_3 升阶→信任：据点 ---------------------------------------------
  events.register({
    id: 'mao_s1_3', type: 'story', npc: 'mao', when: ['enter', 'action'], once: true, priority: 6,
    cond: { anyOf: MAO_TURF, stage: { mao: 1 }, flag: { 'npc.mao.s1_2': true, 'npc.mao.s1_3': false }, aff: { mao: { gte: 40 } } },
    passage: 'mao_s1_3_p1'
  });

  P('mao_s1_3_p1',
    '“跟我来，带你看样东西。”[npc:mao]灰猫[/npc]这回没绕弯子，领着你在下水道里七拐八绕，黑暗中她的脚步又轻又准。尽头是一间干燥的高位泵房：吊床、汽灯、半面墙用夹子挂满的纸片和照片，还有一台拆了一半的电台。“我的窝。”她说，“知道这地方的人，一只手数得过来。”',
    [
      { label: '“为什么带我来？”', fx: { goto: 'mao_s1_3_p2' } },
      { label: '走近那面贴满纸片的墙', fx: { goto: 'mao_s1_3_p2b' } }
    ]);

  P('mao_s1_3_p2',
    '“做生意讲抵押。”[npc:mao]灰猫[/npc]往吊床上一躺，晃着腿，“你替我挨过刀，我押个老窝给你，两清。”她说得轻巧，眼睛却一直盯着你的反应，“……行了，别用那种眼神看我。以后想找我，直接来这儿——你比消息贩子的规矩，重要一点儿。”',
    [{ label: '记住来路', fx: { stage: { mao: 2 }, aff: { mao: 4 }, flag: { 'npc.mao.s1_3': true }, milestone: '灰猫带你去了她的据点' } }]);

  P('mao_s1_3_p2b',
    '墙上的纸片密得吓人：手抄的物资清单、各处岗哨的换班表、用红线串起来的人名。你的名字也钉在上面，边上只写了两个字——例外。她顺着你的目光看过去，难得地没解释，一把把你拨开：“看够了？以后想找我，直接来这儿。”',
    [{ label: '记住来路', fx: { stage: { mao: 2 }, aff: { mao: 4 }, flag: { 'npc.mao.s1_3': true }, milestone: '灰猫带你去了她的据点' } }]);

  // ==========================================================================
  // 信任（stage 2）—— 她常驻下水道据点，talk 入口开放
  // ==========================================================================

  // ---- mao_s2_1 地下捷径 ----------------------------------------------------
  events.register({
    id: 'mao_s2_1', type: 'story', npc: 'mao', when: ['talk'], once: true, priority: 6,
    cond: { loc: 'sewer', stage: { mao: 2 }, flag: { 'npc.mao.s2_1': false } },
    passage: 'mao_s2_1_p1'
  });

  P('mao_s2_1_p1',
    '[npc:mao]灰猫[/npc]把一张手绘图纸在木箱上摊开，油纸包着，边角磨得起了毛。“临港的地下是通的——这条走[place]地铁站[/place]，这条上[place]检查站[/place]，这条能钻到超市后巷。”她的指尖在图上跳，“哪里要低头、哪里水深过腰、哪里住了邻居，都标着。背下来，图不外借。”',
    [{ label: '一条条记牢', fx: { time: 60, goto: 'mao_s2_1_p2' } }]);

  P('mao_s2_1_p2',
    '“这套路子我攒了两年，救过我的命不止一次。”[npc:mao]灰猫[/npc]把图纸卷好收回怀里，屈指弹了下你的额头，“现在它也归你用了。别谢我——记住走地下的规矩，只有一条：安静。”',
    [{ label: '收下这份大礼', fx: { flag: { 'world.sewerShortcut': true, 'npc.mao.s2_1': true }, aff: { mao: 4 }, milestone: '灰猫教你走地下捷径' } }]);

  // ---- mao_s2_2 病毒文件的买家 ----------------------------------------------
  events.register({
    id: 'mao_s2_2', type: 'story', npc: 'mao', when: ['talk'], once: true, priority: 5,
    cond: { loc: 'sewer', stage: { mao: 2 }, flag: { 'npc.mao.s2_1': true, 'npc.mao.s2_2': false } },
    passage: 'mao_s2_2_p1'
  });

  P('mao_s2_2_p1',
    '你来的时候，[npc:mao]灰猫[/npc]正在整理一只防水箱。见是你，她犹豫了一下，没有合上盖子。箱子里是一沓文件袋，其中几只的封口盖着[place]临港大学[/place]的章，标签上是看不懂的编号，开头都是同样的两个字母。',
    [{ label: '问这是什么', fx: { goto: 'mao_s2_2_p2' } }]);

  P('mao_s2_2_p2',
    '“一桩大买卖。”她在“大”字上咬了重音，“有人高价收大学实验楼里跟那场病沾边的纸——论文、台账、审批单，什么都要。”她把箱子扣好，压进吊床底下，“买家是谁，别问，我也只见过中间人。钱给得干净，货收得急。”',
    [
      { label: '“收这种东西的人，图什么？”', fx: { goto: 'mao_s2_2_p2q' } },
      { label: '劝她小心，这趟水太深', fx: { aff: { mao: 5 }, flag: { 'npc.mao.s2_2': true }, milestone: '灰猫的大买卖' } }
    ]);

  P('mao_s2_2_p2q',
    '“图什么？”[npc:mao]灰猫[/npc]耸肩，“想知道病是哪来的，或者，想知道怎么让它再来一遍。干我们这行的不猜这个——猜了，睡不着。”她把汽灯拧暗了些，“这单做完，我能歇半年。到时候……”她停住，摆摆手，“没什么，到时候再说。”',
    [{ label: '（不再追问）', fx: { aff: { mao: 3 }, flag: { 'npc.mao.s2_2': true }, milestone: '灰猫的大买卖' } }]);

  // ---- mao_s2_3 越轨（信任阶段成人事件，NPC设定.md 已补登记） ----------------
  events.register({
    id: 'mao_s2_3', type: 'story', npc: 'mao', when: ['talk'], once: true, priority: 6,
    cond: { loc: 'sewer', stage: { mao: 2 }, flag: { 'npc.mao.s2_2': true, 'npc.mao.s2_3': false }, aff: { mao: { gte: 50 } } },
    passage: 'mao_s2_3_p1'
  });

  P('mao_s2_3_p1',
    '“今天这条消息，不收子弹。”[npc:mao]灰猫[/npc]忽然凑得很近，汽灯把她的影子整个投在你身上，她的呼吸里有一点酒气和薄荷味。“收利息。”她的手指勾住你的衣领，慢慢收紧，眼睛在半明半暗里亮得惊人，“利息是什么，你自己猜——猜错了，我可要翻倍。”',
    [
      { label: '低头吻住她', fx: { goto: 'mao_s2_3_p2' } },
      { label: '按住她的手腕：“你到底想干什么？”', fx: { goto: 'mao_s2_3_p1b' } }
    ]);

  P('mao_s2_3_p1b',
    '“试试你。”她也不挣，任你攥着腕子，嘴角翘起来，“干我们这行的，得弄清一个人心里装的是生意，还是别的。”她又凑近半寸，声音贴着你的耳廓，“现在——你可以推开我，也可以不推。”',
    [
      { label: '吻住她', fx: { goto: 'mao_s2_3_p2' } },
      { label: '退开半步：“账就是账，别掺别的。”', fx: { aff: { mao: 2 }, flag: { 'npc.mao.s2_3': true }, goto: 'mao_s2_3_pout' } }
    ]);

  P('mao_s2_3_pout',
    '“无趣。”[npc:mao]灰猫[/npc]松开手，脸上瞧不出恼意，反而多了点别的什么，“不过——守得住的人，货也押得住。”她退回吊床边，冲你摆摆手，“走吧走吧，下次记得带子弹。这次的消息，记你账上。”',
    [{ label: '（离开）', fx: {} }]);

  P('mao_s2_3_p2',
    function (s) {
      var head = '她的唇上有酒的辛辣。吻从试探变成撕咬，她攥着你的衣领把你抵在冰凉的管壁上，动作熟练得像预谋了很久。';
      if (s.player.gender === 'f') {
        return head + '她的膝盖挤进你的腿间，手掌顺着你的腰线滑下去，隔着布料揉弄，力道又准又坏，你的喘息全撞碎在她嘴里。“声音压着点。”她咬着你的耳垂笑，“地下传声，隔三条管道都听得见。”她的手指探进你的裤腰，指腹碾过已经濡湿的地方，不紧不慢地画着圈，直到你腿根发软，全靠她的身体把你钉在管壁上才没滑下去。';
      }
      return head + '她的手掌顺着你的小腹一路探下去，隔着布料握住那处硬起来的形状，指腹缓慢地碾磨。“声音压着点。”她咬着你的耳垂笑，“地下传声，隔三条管道都听得见。”她解开你的裤腰，五指灵活地圈住你，节奏快慢全由她拿捏，你的喘息被她尽数吞进吻里，腰背抵着管壁绷成一张弓。';
    },
    [{ label: '伸手回应她', fx: { goto: 'mao_s2_3_p3' } }]);

  P('mao_s2_3_p3',
    function (s) {
      var body;
      if (s.player.gender === 'f') {
        body = '你们在汽灯昏黄的光圈里纠缠，她的手指把你送上去了两次，自己的衣扣却只松了两颗。等你腿软心跳地缓过神，她已经退开一步整理袖口，脸颊潮红，眼神却清醒得气人。';
      } else {
        body = '她的手没有停过，节奏坏心眼地变着花样，直到你交代在她的掌心里，喘得像跑完十条街。她慢条斯理地用你的衣角擦了手，自己的衣扣从头到尾只松了两颗，脸颊潮红，眼神却清醒得气人。';
      }
      return body + '“利息收讫。”[npc:mao]灰猫[/npc]的声音还有点哑，调子却已经拉回了生意场，“正戏留着——下次，加价。”她拎起汽灯往吊床走，走两步又回头，“这一条，不记账。”';
    },
    [{ label: '（平复呼吸，离开）', fx: { aff: { mao: 8 }, flag: { 'npc.mao.s2_3': true }, milestone: '与灰猫的一次越轨' } }]);

})();
