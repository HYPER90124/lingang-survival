/* =============================================================================
 * secondary.js — 次要 NPC 全剧情（M7：苏曼/阿豆/周响/赵铁，警惕→羁绊）
 * -----------------------------------------------------------------------------
 * 节拍一览（flag 均存 npc.{id}.*，升阶事件 cond 锁 aff 阈值 20/40/60/80）：
 *
 *   su 苏曼（酒吧 10:00–02:00）
 *     su_s0_1  初遇立规矩（enter/talk @bar）
 *     su_s0_2  委托：三样货一张单（酒水×2/发电机零件/干净瓶子×2；接受写 fetch）
 *     su_s0_3  交货 + 升1（talk，需三样齐 + 好感≥20）
 *     su_s1_1  亡夫与守店执念 + 升2（talk，好感≥40）
 *     su_s2_1  信任解锁：寄存（负重上限 +10）与打听（su_gossip 可重复）
 *     su_s2_2  深夜独酌·转折 + 升3（talk 深夜，好感≥60）
 *     su_s3_1  成人一段（talk 深夜，性别分支，可拒绝）
 *     su_s4_1  屋顶日出 + 升4（talk 凌晨，好感≥80；守到天亮）
 *     su_gossip  打听（可重复，冷却一天，priority 2）
 *
 *   dou 阿豆（加油站全天；与 addiction 系统联动）
 *     dou_s0_1  修车求药初遇（enter/talk @gas；提及与林晚的旧怨）
 *     dou_s0_2  供药或劝戒分支 + 升1（talk，好感≥20；gaveDrug/urgedQuit 两路都续）
 *     dou_s1_1  教改装武器 + 升2（talk，发 skill:modding，好感≥40）
 *     dou_s2_1  戒断大事件 + 升3（enter/action @gas，好感≥60；帮扛=clean/放任=relapse）
 *     dou_s3_1  成人一段（talk 夜，性别分支，可拒绝）
 *     dou_s4_1  改装专属武器相赠 + 升4（talk，好感≥80，发 dou_custombat）
 *     dou_tune  武器保养（可重复，冷却一天，3 子弹修满耐久；gaveDrug 线附带毒品接触）
 *
 *   zhou 周响（大学 08:00–18:00 + 周三晚广播）
 *     zhou_s0_1  循着广播初遇（enter/talk @campus）
 *     zhou_s0_2  委托：天线零件与广播电池（接受写 fetch）
 *     zhou_s0_3  检查站废墟取零件（enter/action @checkpoint，发 zhou_antenna+zhou_battery）
 *     zhou_s0_4  交付 + 升1（talk，需两样零件 + 好感≥20）
 *     zhou_s1_1  留言征集 + 升2（talk，好感≥40；玩家留言写 msgPending）
 *     zhou_s2_1  「方舟」传言 + 升3（talk，好感≥60；只传递不证实）
 *     zhou_s3_1  成人一段（talk，性别分支，可拒绝）
 *     zhou_s4_1  只有彼此听的深夜节目 + 升4（周三晚 @campus，好感≥80）
 *     zhou_radio_1  周三晚广播（scheduled，weekday 2；读出上周留言，可再留言）
 *
 *   zhao 赵铁（超市 08:00–20:00，周五进货）
 *     zhao_s0_1  交易入门初遇（enter/talk @market）
 *     zhao_s0_2  委托：周五押送进货（接受写 escortJob + 日历备忘）
 *     zhao_s0_3  周五护送 + 升1（周五 @market，好感≥20；错过下周五仍可）
 *     zhao_s1_1  保护费事件·立场选择 + 升2（好感≥40；stoodUp/paidOff/stayedOut）
 *     zhao_s2_1  高级货架开张叙事（stage2；机制上 tiers 按好感≥40 已自动解锁）
 *     zhao_s2_2  他提起一句「闺女」·转折 + 升3（talk，好感≥60）
 *     zhao_s3_1  成人一段（talk，性别分支，可拒绝）
 *     zhao_s4_1  货运账本与女儿 + 升4（talk，好感≥80）
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  var story = G.data.story, events = G.data.events;

  function P(id, text, choices) { story.register({ id: id, text: text, choices: choices }); }

  function bookWeekly(guardFlag, targetWd, minute, label) {
    if (G.engine.getFlag(guardFlag)) return;
    G.engine.setFlag(guardFlag, true);
    var p = G.state.player;
    var diff = (targetWd - (p.day % 7) + 7) % 7;
    if (!diff) diff = 7;
    G.state.calendar.appointments.push({ day: p.day + diff, minute: minute, label: label, eventId: null, done: false });
  }

  // 阿豆的专属武器（本模块新增注册，非卖品：无 price 字段即无法出售）
  G.data.items.dou_custombat = {
    name: '阿豆的三号作品', type: 'weapon',
    desc: '球棍芯、摩托减震簧、缠满防滑胶带的握把，尾端刻着歪歪扭扭的「叁」。阿豆的手艺，全城仅此一件。',
    dmg: [9, 16], durMax: 60, weight: 3,
    hitPool: ['抡起改装棒砸中', '减震簧一弹，改装棒抽在', '反手一记改装棒磕在', '顺势一棒轰在']
  };

  var BAR_HOURS = [600, 120];      // 苏曼在店 10:00–02:00
  var BAR_LATE = [1320, 120];      // 打烊前后
  var ZHOU_DAY = [480, 1080];      // 周响白天在大学
  var ZHAO_HOURS = [480, 1200];    // 赵铁开店 08:00–20:00

  // ==========================================================================
  // 苏曼（su）
  // ==========================================================================

  // ---- su_s0_1 初遇立规矩 ---------------------------------------------------
  events.register({
    id: 'su_s0_1', type: 'story', npc: 'su', when: ['enter', 'talk'], once: true, priority: 7,
    cond: { loc: 'bar', timeRange: BAR_HOURS, stage: { su: 0 }, flag: { 'intro.done': true, 'npc.su.s0_1': false } },
    passage: 'su_s0_1_p1'
  });

  P('su_s0_1_p1',
    function (s) {
      s.npcs.su.met = true;
      return '吧台后的女人先看见你，抬手把一盏油灯往你这边挪了半寸——照清客人的脸，是她的习惯。“新面孔。”[npc:su]苏曼[/npc]笑起来眼角有细纹，笑意却只到颧骨为止，“避风港三条规矩：枪械寄在门口铁柜，赊账不过三天，别打我姑娘们的主意——伙计里没有姑娘，这条是说给姑娘们听的。”';
    },
    [
      { label: '按规矩来，把武器寄了', fx: { aff: { su: 3 }, goto: 'su_s0_1_p2' } },
      { label: '“规矩是死的，通融通融？”', fx: { aff: { su: -1 }, goto: 'su_s0_1_p2b' } }
    ]);

  P('su_s0_1_p2',
    '“懂事。”她给你倒了半杯掺水的酒，推过来，“头一杯，柜上请。”她撑着吧台打量你，像掂量一件货的成色，“这店里消息比酒多，人比消息杂。坐得住，就常来。”',
    [{ label: '接过酒', fx: { flag: { 'npc.su.s0_1': true }, milestone: '初遇苏曼' } }]);

  P('su_s0_1_p2b',
    '“通融？”[npc:su]苏曼[/npc]的笑纹没动，声音降了半度，“上一个说这话的，现在还欠着我半扇门板钱。”她朝门口的铁柜抬了抬下巴，“寄，或者走。这店塌不塌，从来不看客人脸色。”你照办了，她的笑意这才回到眼睛里。',
    [{ label: '（找位子坐下）', fx: { flag: { 'npc.su.s0_1': true }, milestone: '初遇苏曼' } }]);

  // ---- su_s0_2 委托：三样货一张单 -------------------------------------------
  events.register({
    id: 'su_s0_2', type: 'story', npc: 'su', when: ['talk'], once: false, cooldown: 1440, priority: 5,
    cond: { loc: 'bar', timeRange: BAR_HOURS, stage: { su: 0 }, flag: { 'npc.su.s0_1': true, 'npc.su.s0_2': false } },
    passage: 'su_s0_2_p1'
  });

  P('su_s0_2_p1',
    '[npc:su]苏曼[/npc]把一张烟盒纸拍在你面前，上面是娟秀的三行字。“店里三样东西见了底：[item]烈酒[/item]两瓶，发电机的[item]零件[/item]一件，干净的[item]玻璃瓶[/item]两个。”她用指甲点着单子，“跑腿的钱我不亏人——三样凑齐，二十发子弹，外加你在这店里永远有座。”',
    [
      { label: '接下这张单子', fx: { flag: { 'npc.su.s0_2': true, 'npc.su.fetch': true }, aff: { su: 2 }, goto: 'su_s0_2_p2' } },
      { label: '问她发电机坏了会怎样', fx: { goto: 'su_s0_2_p1q' } },
      { label: '最近腾不出手', fx: {} }
    ]);

  P('su_s0_2_p1q',
    '“灯灭了，人心就散了。”她朝屋顶的灯泡抬了抬眼，“这条街上肯亮到后半夜的窗，只剩我这一扇。灯亮着，大家就还信有个地方能坐下喝口热的——这买卖，我亏本也做。”',
    [
      { label: '接下这张单子', fx: { flag: { 'npc.su.s0_2': true, 'npc.su.fetch': true }, aff: { su: 3 }, goto: 'su_s0_2_p2' } },
      { label: '最近腾不出手', fx: {} }
    ]);

  P('su_s0_2_p2',
    '“酒，赵铁那儿有，贵；胆子大也可以去别处翻。零件，加油站的阿豆手里过——那孩子好说话，也不好说话，你见了就懂。”[npc:su]苏曼[/npc]把单子折好塞进你口袋，“瓶子哪儿都有，挑没崩口的。不急，凑齐再来。”',
    [{ label: '收好单子', fx: {} }]);

  // ---- su_s0_3 交货 + 升1 ---------------------------------------------------
  events.register({
    id: 'su_s0_3', type: 'story', npc: 'su', when: ['talk'], once: true, priority: 6,
    cond: {
      loc: 'bar', timeRange: BAR_HOURS, stage: { su: 0 }, aff: { su: { gte: 20 } },
      flag: { 'npc.su.fetch': true, 'npc.su.s0_3': false },
      has: { item: ['liquor', 'sparepart', 'glassbottle'] }
    },
    passage: 'su_s0_3_p1'
  });

  P('su_s0_3_p1',
    '你把三样货一件件摆上吧台。[npc:su]苏曼[/npc]验货验得极细：酒对着灯看过成色，零件用指腹摸过螺纹，瓶子逐个弹了弹听声。末了她从围裙里数出二十发子弹，又额外搁了一碟热的下酒菜。“单子上没有的，是谢的。”',
    [{ label: '收下报酬', fx: { item: { liquor: -1, sparepart: -1, glassbottle: -1 }, bullets: 20, aff: { su: 7 }, goto: 'su_s0_3_p2' } }]);

  P('su_s0_3_p2',
    '“从今晚起，靠墙那张小桌归你。”她扬下巴示意角落——桌上多了一盏单独的小油灯，“自己人的位子。这店里能有这待遇的，一只手数得过来，老秦算一个。”她把你的空杯满上，“现在，是两个了。”',
    [{ label: '在自己的位子上坐下', fx: { stage: { su: 1 }, flag: { 'npc.su.s0_3': true }, milestone: '苏曼给你留了位子' } }]);

  // ---- su_s1_1 亡夫与守店执念 + 升2 -----------------------------------------
  events.register({
    id: 'su_s1_1', type: 'story', npc: 'su', when: ['talk'], once: true, priority: 5,
    cond: { loc: 'bar', timeRange: BAR_HOURS, stage: { su: 1 }, flag: { 'npc.su.s1_1': false }, aff: { su: { gte: 40 } } },
    passage: 'su_s1_1_p1'
  });

  P('su_s1_1_p1',
    '客人稀的午后，[npc:su]苏曼[/npc]在擦一只旧怀表，擦得很慢，表早就不走了。“我男人的。”她发觉你在看，也不遮掩，“这店是他盘下来的，说乱世里人总得有个喝酒的地方。城破那个月他出去进货，货回来了，人没有。”她把怀表贴身收好，语气像在报一笔旧账，“店还开着，就当他还在进货的路上。”',
    [
      { label: '“他会到的，只是路远。”', fx: { aff: { su: 6 }, goto: 'su_s1_1_p2' } },
      { label: '给她的杯子也满上', fx: { aff: { su: 6 }, goto: 'su_s1_1_p2' } }
    ]);

  P('su_s1_1_p2',
    '她愣了一下，随即笑了，这次的笑意漫过了眼角。“会说话。”她碰了碰你的杯沿，“老秦守我这店，是还我男人的旧情分；你守着我这店——”她顿了顿，把后半句拐了个弯，“是店的福气。往后柜上有事，我使唤你，你别嫌。”',
    [{ label: '“随时使唤。”', fx: { stage: { su: 2 }, flag: { 'npc.su.s1_1': true }, milestone: '苏曼说起亡夫' } }]);

  // ---- su_s2_1 信任解锁：寄存与打听 -----------------------------------------
  events.register({
    id: 'su_s2_1', type: 'story', npc: 'su', when: ['talk'], once: true, priority: 6,
    cond: { loc: 'bar', timeRange: BAR_HOURS, stage: { su: 2 }, flag: { 'npc.su.s2_1': false } },
    passage: 'su_s2_1_p1'
  });

  P('su_s2_1_p1',
    '[npc:su]苏曼[/npc]领你下到店后的地窖，油灯照出一排码得整整齐齐的货架，最里侧一格清空了。“这格归你。”她把一枚小铜锁拍进你手心，“出门讨生活的人，不该什么家当都背在身上。放我这儿的东西，丢一件，我赔十件。”',
    [{ label: '收下铜锁', fx: { flag: { 'npc.su.s2_1': true, 'carryBonus': 10 }, aff: { su: 4 }, goto: 'su_s2_1_p2' } }]);

  P('su_s2_1_p2',
    '回到吧台，她又给你添了一样东西——不占地方的那种。“这店里一晚上过八十张嘴，酒下去，话就上来。”她用擦杯布掩着嘴角，“往后想打听什么，来问我。城里的事，我这儿灵通得很，比灰猫便宜——但记住，我只说听来的，不管真假。”',
    [{ label: '记下这条门路', fx: { milestone: '苏曼的地窖与耳目' } }]);

  // ---- su_gossip 打听（可重复） ---------------------------------------------
  events.register({
    id: 'su_gossip', type: 'story', npc: 'su', when: ['talk'], once: false, cooldown: 1440, priority: 2,
    cond: { loc: 'bar', timeRange: BAR_HOURS, stage: { su: { gte: 2 } }, flag: { 'npc.su.s2_1': true } },
    passage: 'su_gossip_p1'
  });

  P('su_gossip_p1',
    '[npc:su]苏曼[/npc]擦着杯子凑过来：“想听点什么？昨儿晚上店里话可不少。”',
    [
      { label: '听听新鲜的', fx: { aff: { su: 1 }, goto: 'su_gossip_p2' } },
      { label: '今天不打听', fx: {} }
    ]);

  P('su_gossip_p2',
    function () {
      var pool = [
        '“跑码头的说，老蔡又在念叨他那条船。疯话归疯话——上礼拜真有人看见江心亮过灯。”',
        '“商场那帮人最近收账收得凶，几条街的散户都被摸过门。你要有值钱家当，别摆在明面上。”',
        '“教堂的神父前儿来讨了两瓶开水，说门口又添了新坟。那位老人家，一个人埋了多少人了。”',
        '“大学那丫头的广播，礼拜三晚上还在播。有客人靠这个对表——她一天不播，人心就慌一天。”',
        '“检查站那个当过兵的孩子，夜里说梦话整条街都听得见。别看他端着枪，胆子比谁都小。”',
        '“医院的林大夫，昨儿托人来问有没有整箱的盐水。她那儿病人怕是又多了，你要顺路，捎点东西过去。”'
      ];
      return '她把声音压进擦杯布后面：' + pool[Math.floor(Math.random() * pool.length)] + '说完她直起身，笑容照旧滴水不漏，“听来的，别记我账上。”';
    },
    [{ label: '记下', fx: {} }]);

  // ---- su_s2_2 深夜独酌·转折 + 升3 ------------------------------------------
  events.register({
    id: 'su_s2_2', type: 'story', npc: 'su', when: ['talk'], once: true, priority: 5,
    cond: { loc: 'bar', timeRange: BAR_LATE, stage: { su: 2 }, flag: { 'npc.su.s2_1': true, 'npc.su.s2_2': false }, aff: { su: { gte: 60 } } },
    passage: 'su_s2_2_p1'
  });

  P('su_s2_2_p1',
    '打烊后的店里只剩你们两个。[npc:su]苏曼[/npc]难得给自己倒了杯不掺水的，喝法却不像她——一口见底。“今天是他生日。”她转着空杯，“往年这天我关店。今年不知怎么，不想一个人守着这四面墙了。”她抬眼看你，油灯把她眼里的东西照得很软，“陪我喝一杯。就一杯。”',
    [{ label: '陪她喝这一杯', fx: { stat: { alcohol: 10 }, goto: 'su_s2_2_p2' } }]);

  P('su_s2_2_p2',
    '一杯变成了三杯。她说起亡夫的糗事，说到一半自己先笑，笑着笑着停了，看着你：“怪事。这些话憋了三年，跟谁都张不开口——跟你，倒是顺的。”她伸手，指尖替你拂掉肩上并不存在的灰，手停在那里没收回去，“你这人，让人想不设防。这不是好话，也不是坏话。”',
    [
      { label: '把她的手握住', fx: { stage: { su: 3 }, aff: { su: 5 }, flag: { 'npc.su.s2_2': true }, time: 90, milestone: '苏曼的生日酒' } },
      { label: '“那就别设防。”', fx: { stage: { su: 3 }, aff: { su: 5 }, flag: { 'npc.su.s2_2': true }, time: 90, milestone: '苏曼的生日酒' } }
    ]);

  // ---- su_s3_1 成人一段 -----------------------------------------------------
  events.register({
    id: 'su_s3_1', type: 'story', npc: 'su', when: ['talk'], once: false, cooldown: 1440, priority: 6,
    cond: { loc: 'bar', timeRange: BAR_LATE, stage: { su: { gte: 3 } }, flag: { 'npc.su.s3_1': false } },
    passage: 'su_s3_1_p1'
  });

  P('su_s3_1_p1',
    '这晚打烊，[npc:su]苏曼[/npc]没急着收拾，先摘了耳坠——两只小小的银的，搁在吧台上叮的一声。“楼上有间房，从来不租人。”她拎着油灯往楼梯走，走到一半回头，灯影里她的眉眼比白日里柔了十岁，“今晚例外。例外，只有你——上不上来，你自己定。”',
    [
      { label: '跟她上楼', fx: { goto: 'su_s3_1_p2' } },
      { label: '“今晚我守店，你去睡。”', fx: { goto: 'su_s3_1_pout' } }
    ]);

  P('su_s3_1_pout',
    '她在楼梯上站了两秒，笑出声：“守店？行啊。”她把油灯留在栏杆上给你，转身上楼，声音从黑暗里飘下来，“不识抬举的小东西——门给你留条缝。”不恼，是真的不恼，这份从容也是她的本事。',
    [{ label: '（守着灯到后半夜）', fx: { time: 120 } }]);

  P('su_s3_1_p2',
    function (s) {
      var head = '楼上的房间比想象的素净：一张大床，一面旧梳妆镜，窗帘拉得严实。她把油灯拧小，回身解你的扣子，指法不急不缓，像开一瓶存了很多年的酒。“别紧张。”她贴着你的耳朵笑，“这屋里的事，天亮就锁在这屋里。”';
      if (s.player.gender === 'f') {
        return head + '她把你安置在床沿，吻从额角一路落下来，落得又慢又稳。她的手熟稔又体贴，每一寸都先用掌心焐热了才碰，你在她怀里软下去，她就搂紧一分。“姑娘家的身子，要这样疼。”她引着你的手教你回应她，呼吸渐渐也乱了章法，末了两个人缠在一处，她的笑声哑在你颈窝里，像掺了蜜的酒。';
      }
      return head + '她把你按进松软的被褥里，俯下身来，长发扫过你的胸口。她不许你急，一急就用指尖点你的心口：“慢些。好东西都经不起急。”她跨坐上来引你进入，腰身摆得从容，眼睛一直含着笑看你，直到那份从容一寸寸碎掉，她伏在你胸前喘，指甲掐着你的肩，声音又软又哑，“……好了，这下，是真的不设防了。”';
    },
    [{ label: '搂住她', fx: { goto: 'su_s3_1_p3' } }]);

  P('su_s3_1_p3',
    '事后她枕着你的手臂，替你把额发拨开，动作轻得不像那个吧台后滴水不漏的老板娘。“三年了，头一回让人上这层楼。”她望着帐顶，语气平平的，落在你耳朵里却重，“别声张。楼下那些人精，明早看我一眼就什么都知道了——知道就知道吧。”',
    [{ label: '（在她身边睡去）', fx: { stat: { energy: -18, sanity: 6 }, time: 360, aff: { su: 6 }, flag: { 'npc.su.s3_1': true }, milestone: '苏曼楼上的房间' } }]);

  // ---- su_s4_1 屋顶日出 + 升4 -----------------------------------------------
  events.register({
    id: 'su_s4_1', type: 'story', npc: 'su', when: ['talk'], once: true, priority: 6,
    cond: { loc: 'bar', timeRange: BAR_LATE, stage: { su: 3 }, flag: { 'npc.su.s2_2': true, 'npc.su.s4_1': false }, aff: { su: { gte: 80 } } },
    passage: 'su_s4_1_p1'
  });

  P('su_s4_1_p1',
    '打烊后，[npc:su]苏曼[/npc]没上楼，反而从柜台底下摸出一条毯子和一瓶留了很久的好酒。“跟我来。”她推开通往天台的小门——瞭望位旁边不知何时摆了两把藤椅。“陪我坐到天亮。”她把毯子分你一半，“我男人从前总说，这屋顶看日出是全临港最好的位置。三年了，我一直没敢上来验证。”',
    [{ label: '陪她等', fx: { time: 240, stat: { energy: -8 }, goto: 'su_s4_1_p2' } }]);

  P('su_s4_1_p2',
    '天边先是灰，再是青，然后一线金红从江面上撕开来，把满城的断壁残垣都镀了一层暖色。[npc:su]苏曼[/npc]看了很久，忽然开口：“他没骗人，是全城最好的位置。”她握住你搭在扶手上的手，收得很紧，“旧账清了。往后这屋顶的日出，我打算换个人一起看——看很多年。”',
    [{ label: '“看很多年。”', fx: { stage: { su: 4 }, aff: { su: 5 }, flag: { 'npc.su.s4_1': true }, milestone: '和苏曼的屋顶日出' } }]);

  // ==========================================================================
  // 阿豆（dou）
  // ==========================================================================

  // ---- dou_s0_1 修车求药初遇 ------------------------------------------------
  events.register({
    id: 'dou_s0_1', type: 'story', npc: 'dou', when: ['enter', 'talk'], once: true, priority: 7,
    cond: { loc: 'gas', stage: { dou: 0 }, flag: { 'intro.done': true, 'npc.dou.s0_1': false } },
    passage: 'dou_s0_1_p1'
  });

  P('dou_s0_1_p1',
    function (s) {
      s.npcs.dou.met = true;
      return '加油站的修理棚里传出叮叮当当的敲击声，一个年轻人从一辆开膛破肚的皮卡底下滑出来，满手机油，眼窝深陷。“老板，会修车不？不会也行——”[npc:dou]阿豆[/npc]的语速快得像连发，搓着手站起来，“身上有[med]止痛药[/med]没有？镇静剂也成。医院那位再也不肯给我开了，说我，嗐，说我那是滥用。你说这叫什么话。”';
    },
    [
      { label: '“先说说你要药做什么。”', fx: { goto: 'dou_s0_1_p2' } },
      { label: '打量他的修理棚', fx: { goto: 'dou_s0_1_p2b' } }
    ]);

  P('dou_s0_1_p2',
    '“做什么？续命啊老板。”他咧嘴笑，笑容抖得厉害，“手一停就抖，抖了就干不了活，干不了活这站里三台发电机就得停。”他扳着黑乎乎的手指头数，“酒吧的灯，医院的冰柜，都吃我这儿的电。你说，我这药，磕得亏不亏心？”这套话他显然说过很多遍，说得太顺了。',
    [{ label: '（先记下这个人）', fx: { aff: { dou: 2 }, flag: { 'npc.dou.s0_1': true }, milestone: '初遇阿豆' } }]);

  P('dou_s0_1_p2b',
    '棚里的家伙什出乎意料地齐整：工具按大小排开，改装到一半的武器挂了半面墙，一台发电机拆得只剩骨架，零件却码得整整齐齐。手最抖的人，摆最齐的工具。[npc:dou]阿豆[/npc]顺着你的目光看过去，有点得意：“手艺还行吧？药钱，全靠它挣的。”',
    [{ label: '（先记下这个人）', fx: { aff: { dou: 2 }, flag: { 'npc.dou.s0_1': true }, milestone: '初遇阿豆' } }]);

  // ---- dou_s0_2 供药或劝戒分支 + 升1 ----------------------------------------
  events.register({
    id: 'dou_s0_2', type: 'story', npc: 'dou', when: ['talk'], once: false, cooldown: 1440, priority: 5,
    cond: { loc: 'gas', stage: { dou: 0 }, flag: { 'npc.dou.s0_1': true, 'npc.dou.s0_2': false }, aff: { dou: { gte: 20 } } },
    passage: 'dou_s0_2_p1'
  });

  P('dou_s0_2_p1',
    '这天[npc:dou]阿豆[/npc]的状态很差，扳手掉了三回，捡第三回的时候他蹲在地上没起来，抱着膝盖抖。“老板。”他仰起脸，眼里的血丝密得吓人，“帮帮忙。有药给药——没药，陪我蹲会儿也行。”',
    [
      { label: '把镇静剂给他', cond: { has: { item: 'sedative' } }, fx: { item: { sedative: -1 }, flag: { 'npc.dou.gaveDrug': true }, goto: 'dou_s0_2_p2a' } },
      { label: '把止痛药给他', cond: { has: { item: 'painkiller' } }, fx: { item: { painkiller: -1 }, flag: { 'npc.dou.gaveDrug': true }, goto: 'dou_s0_2_p2a' } },
      { label: '蹲下来陪他，劝他把药戒了', fx: { flag: { 'npc.dou.urgedQuit': true }, goto: 'dou_s0_2_p2b' } }
    ]);

  P('dou_s0_2_p2a',
    '他接药的手抖得几乎捏不住，掰了半片压进舌根，靠着车轮闭眼等药劲。缓过来之后他整个人活了，话更密了：“够意思！老板你是这个——”他竖大拇指，翻身钻回车底，又探出头来，“对了，谢礼。我那儿有点存货，成色好的，你要不要来一口？不上头，就是……松快。”',
    [
      { label: '尝一口他的「松快」', fx: { stat: { addiction: 8, sanity: 4 }, goto: 'dou_s0_2_p3' } },
      { label: '“我不碰这个。”', fx: { aff: { dou: 1 }, goto: 'dou_s0_2_p3' } }
    ]);

  P('dou_s0_2_p2b',
    '“戒？”他像听见什么老笑话，笑到一半没了声。你陪他蹲在皮卡的影子里，看他抖，听他数发电机的毛病数了一轮又一轮。发作劲头过去，他瘫坐着喘，半晌说：“……林大夫也这么劝。我把她轰出去了，回头想想，挺不是人的。”他抹了把脸，“你这人跟她不一样——她开处方，你陪蹲。行，这份情记下了。”',
    [{ label: '拍拍他的肩', fx: { aff: { dou: 3 }, goto: 'dou_s0_2_p3' } }]);

  P('dou_s0_2_p3',
    '[npc:dou]阿豆[/npc]从工具箱最底层摸出一把改装过的[item]扳手[/item]比划：“老板，交个朋友。往后你的家伙什，磕了碰了卷了刃，拿来我给你拾掇——手艺费好商量，朋友价。”',
    [{ label: '“成交。”', fx: { stage: { dou: 1 }, aff: { dou: 4 }, flag: { 'npc.dou.s0_2': true }, milestone: '阿豆的朋友价' } }]);

  // ---- dou_s1_1 教改装武器 + 升2 --------------------------------------------
  events.register({
    id: 'dou_s1_1', type: 'story', npc: 'dou', when: ['talk'], once: true, priority: 5,
    cond: { loc: 'gas', stage: { dou: 1 }, flag: { 'npc.dou.s1_1': false }, aff: { dou: { gte: 40 } } },
    passage: 'dou_s1_1_p1'
  });

  P('dou_s1_1_p1',
    '“老板，你那家伙使着顺手吗？”[npc:dou]阿豆[/npc]把你的武器要过去，掂了掂，一脸嫌弃，“重心散的，握把打滑，亏你抡得下去。”他把你按在工作台前，“看好了，今天教你真本事：配重怎么调，握把怎么缠，卷了刃怎么开——学会了，一根破管子也能盘出花来。”',
    [{ label: '跟着学', fx: { time: 120, stat: { energy: -10 }, goto: 'dou_s1_1_p2' } }]);

  P('dou_s1_1_p2',
    '两个钟头下来，你缠坏了三圈胶带，锉平了一道毛边，总算换来他一句“凑合”。[npc:dou]阿豆[/npc]把工具挨个摆回原位，嘴上不停：“记住喽，家伙是手的延长。手抖的人才懂怎么让家伙稳——这话别传出去，砸我招牌。”',
    [{ label: '记下门道', fx: { skill: 'modding', stage: { dou: 2 }, aff: { dou: 5 }, flag: { 'npc.dou.s1_1': true }, milestone: '阿豆教你改装武器' } }]);

  // ---- dou_tune 武器保养（可重复） ------------------------------------------
  events.register({
    id: 'dou_tune', type: 'story', npc: 'dou', when: ['talk'], once: false, cooldown: 1440, priority: 2,
    cond: { loc: 'gas', stage: { dou: { gte: 2 } }, flag: { 'npc.dou.s1_1': true } },
    passage: 'dou_tune_p1'
  });

  P('dou_tune_p1',
    function (s) {
      var w = s.player.weapon;
      if (!w) return '[npc:dou]阿豆[/npc]朝你摊手：“老板，空着手来找我保养什么，保养心情啊？回头带上家伙。”';
      var def = G.engine.itemDef(w.id) || {};
      if (w.durability >= (def.durMax || 1)) return '[npc:dou]阿豆[/npc]把你的[item]' + (def.name || '武器') + '[/item]翻来覆去看了一遍，撇嘴：“好得很，不用修。省下的手工费，请我喝瓶汽水也行啊。”';
      return '[npc:dou]阿豆[/npc]接过你的[item]' + (def.name || '武器') + '[/item]眯眼一扫：“瞧瞧，都造成什么样了。”他把家伙往台钳上一夹，“三发子弹，给你拾掇利索——朋友价，含胶带。”';
    },
    [
      { label: '付钱保养', cond: { has: { bullets: 3 } }, fx: { bullets: -3, time: 45, goto: 'dou_tune_p2' } },
      { label: '来一口他的存货', cond: { flag: { 'npc.dou.gaveDrug': true, 'npc.dou.clean': false } }, fx: { stat: { addiction: 6, sanity: 3 }, aff: { dou: 1 }, goto: 'dou_tune_p3' } },
      { label: '改天再说', fx: {} }
    ]);

  P('dou_tune_p2',
    function (s) {
      var w = s.player.weapon;
      if (w) {
        var def = G.engine.itemDef(w.id);
        if (def && def.durMax) w.durability = def.durMax;
      }
      return '锉刀、砂纸、胶带，[npc:dou]阿豆[/npc]的手在工作台上快得出残影，嘴里还哼着不成调的歌。不到一顿饭工夫，你的家伙焕然一新，重心稳了，握把也不再硌手。“接好——”他抛回来，“下回别造这么狠，心疼。”';
    },
    [{ label: '接住武器', fx: { aff: { dou: 1 } } }]);

  P('dou_tune_p3',
    '他左右看看，从零件盒的夹层里摸出他的存货分你一点。药劲漫上来，棚顶的铁皮纹路都变得有趣，你们俩靠着皮卡有一搭没一搭地聊废话，聊到日头挪了一个棚宽。松快是真松快——瘾，也是真的又深了一点。',
    [{ label: '（起身离开）', fx: { time: 90 } }]);

  // ---- dou_s2_1 戒断大事件 + 升3 --------------------------------------------
  events.register({
    id: 'dou_s2_1', type: 'story', npc: 'dou', when: ['enter', 'action', 'talk'], once: true, priority: 8,
    cond: { loc: 'gas', stage: { dou: 2 }, flag: { 'npc.dou.s2_1': false }, aff: { dou: { gte: 60 } } },
    passage: 'dou_s2_1_p1'
  });

  P('dou_s2_1_p1',
    '修理棚里静得反常——没有敲击声，没有哼歌。你掀开帘子，[npc:dou]阿豆[/npc]蜷在皮卡后座上，抱着一只空药盒，抖得整辆车都在轻轻晃。“老板……”他的牙关在打架，“存货，磕完了。城里能翻的地方，我都翻遍了。”他忽然抓住你的手腕，力气大得吓人，“你说句话——我是接着找药，还是……就着这回，把它断了？”',
    [
      { label: '“断了它。我陪你。”', fx: { goto: 'dou_s2_1_p2a' } },
      { label: '“你自己的命，自己定。”', fx: { flag: { 'npc.dou.relapse': true }, goto: 'dou_s2_1_p2b' } }
    ]);

  P('dou_s2_1_p2a',
    '那是你见过最长的三天。他吐，抖，满地打滚，把你骂了个狗血淋头又哭着道歉；你按住他不让他去撬药柜，煮糖水，一遍遍拧热毛巾。第三天夜里他终于沉沉睡过去，睡了十四个钟头，醒来的第一句话是：“……发电机，该换机油了。”手，稳的。',
    [{ label: '“欢迎回来。”', fx: { time: 480, stat: { energy: -25, sanity: -5 }, aff: { dou: 10 }, stage: { dou: 3 }, flag: { 'npc.dou.s2_1': true, 'npc.dou.clean': true }, milestone: '陪阿豆断了药' } }]);

  P('dou_s2_1_p2b',
    '他盯着你看了很久，忽然笑了，笑得比哭难看：“……也对。命是我自己的。”几天后你再来，他又活蹦乱跳地钻在车底下哼歌——代价是灰猫的渠道里多了一个新客户。他没提那天的事，只是给你修东西的时候，手比从前更用力，像在证明什么。',
    [{ label: '（不去戳破）', fx: { aff: { dou: 4 }, stage: { dou: 3 }, flag: { 'npc.dou.s2_1': true }, milestone: '阿豆的选择' } }]);

  // ---- dou_s3_1 成人一段 ----------------------------------------------------
  events.register({
    id: 'dou_s3_1', type: 'story', npc: 'dou', when: ['talk'], once: false, cooldown: 1440, priority: 6,
    cond: { loc: 'gas', timeRange: [1200, 120], stage: { dou: { gte: 3 } }, flag: { 'npc.dou.s3_1': false } },
    passage: 'dou_s3_1_p1'
  });

  P('dou_s3_1_p1',
    function () {
      var head = G.engine.getFlag('npc.dou.clean')
        ? '入夜的加油站，发电机的嗡鸣像巨兽的鼾声。[npc:dou]阿豆[/npc]破天荒把手洗了三遍，肥皂沫搓到小臂，还是有几道机油印子洗不掉。'
        : '入夜的加油站，发电机的嗡鸣像巨兽的鼾声。[npc:dou]阿豆[/npc]今晚状态难得的好，眼睛亮亮的，把手洗了三遍，肥皂沫搓到小臂。';
      return head + '“老板。”他在你面前站定，喉结动了动，语速头一回慢下来，“棚里收拾出来一块地方，铺了新毯子。你……留下来不？不留也成，我就是，问问。”他的耳朵红得能滴血。';
    },
    [
      { label: '留下来', fx: { goto: 'dou_s3_1_p2' } },
      { label: '揉揉他的头发：“今晚不行。”', fx: { goto: 'dou_s3_1_pout' } }
    ]);

  P('dou_s3_1_pout',
    '“哦，哦，成。”他点头点得像装了弹簧，转身钻回车底，过了两秒又探出头，“那个——问问也不犯法吧？下回，下回我再问。”车底传来他自己跟自己嘀咕的声音，你没听清，八成是在骂自己没出息。',
    [{ label: '（笑着离开）', fx: { aff: { dou: 1 } } }]);

  P('dou_s3_1_p2',
    function (s) {
      var head = '棚子深处真的收拾出了一方天地：新毯子，一盏罩了红布的工作灯，还摆了两瓶舍不得喝的汽水。他紧张得同手同脚，凑过来亲你，一下亲在下巴上，自己先懊恼地骂了一声。';
      if (s.player.gender === 'f') {
        return head + '可一旦上了手，那双修了十年机器的手就找回了准头——粗粝，滚烫，却轻得不可思议，像在对待全城最后一件精密仪器。他一路吻下去，边吻边碎碎念你哪里好看，念得你发笑又发软。进入你的时候他整个人绷得发抖，埋在你颈窝里闷声说“老板，我可太喜欢你了”，动作又急又真，把这句话撞得七零八落。';
      }
      return head + '可一旦上了手，那双修机器的手就找回了准头——他把你按在毯子上，从喉结一路啃到腰腹，边啃边不忘絮叨“这儿的线条真漂亮，跟赛车的溜背似的”。他握住你们两个人的时候，掌心的茧磨得人头皮发麻，节奏由生涩到默契，最后他额头抵着你的，喘得一塌糊涂，还硬要贫一句：“老板……这活儿，比修发电机得劲多了。”';
    },
    [{ label: '搂住这个傻小子', fx: { goto: 'dou_s3_1_p3' } }]);

  P('dou_s3_1_p3',
    '事后他把你圈在毯子里，献宝似的从枕头底下摸出一只铁皮盒：里面是攒了不知多久的零件——每一件都擦得锃亮，按大小排好。“给你留的。哪天你的家伙散架了，这盒里的东西能救命。”他说得郑重其事，像在交付全部身家。发电机在外头嗡嗡地响，为半座城守着灯。',
    [{ label: '（在机油味里睡去）', fx: { stat: { energy: -18, sanity: 6 }, time: 360, aff: { dou: 6 }, flag: { 'npc.dou.s3_1': true }, milestone: '修理棚里的一夜' } }]);

  // ---- dou_s4_1 专属武器相赠 + 升4 ------------------------------------------
  events.register({
    id: 'dou_s4_1', type: 'story', npc: 'dou', when: ['talk'], once: true, priority: 6,
    cond: { loc: 'gas', stage: { dou: 3 }, flag: { 'npc.dou.s2_1': true, 'npc.dou.s4_1': false }, aff: { dou: { gte: 80 } } },
    passage: 'dou_s4_1_p1'
  });

  P('dou_s4_1_p1',
    '[npc:dou]阿豆[/npc]神神秘秘把你拽进棚子，让你闭眼。再睁开，一件家伙横在你面前：球棍做芯，缠着摩托减震簧，握把的胶带缠出细密的菱纹，尾端刻着一个歪歪扭扭的「叁」。“一号炸了，二号送了人——”他挠头，“三号，琢磨了俩月。全城就这一件，给你的。”',
    [{ label: '“为什么是我？”', fx: { goto: 'dou_s4_1_p2' } }]);

  P('dou_s4_1_p2',
    function () {
      var mid = G.engine.getFlag('npc.dou.clean')
        ? '“我这条命，一半是发电机给的，一半是你陪出来的。”他难得没贫嘴，手指摩挲着那道刻痕，“断药那三天，我满脑子就一个念头：死不得，死了谁给你修家伙。”'
        : '“你陪我蹲过，没嫌过我。”他难得没贫嘴，手指摩挲着那道刻痕，“我这人烂归烂，分得清谁拿我当人。”';
      return mid + '他把武器塞进你手里，退后半步叉着腰，用力憋出一副满不在乎的样子：“拿好喽。往后它替我跟着你——我出不了这站，它出得了。”';
    },
    [{ label: '郑重接过', fx: { item: { dou_custombat: 1 }, stage: { dou: 4 }, aff: { dou: 5 }, flag: { 'npc.dou.s4_1': true }, milestone: '阿豆的三号作品' } }]);

  // ==========================================================================
  // 周响（zhou）
  // ==========================================================================

  // ---- zhou_s0_1 循着广播初遇 -----------------------------------------------
  events.register({
    id: 'zhou_s0_1', type: 'story', npc: 'zhou', when: ['enter', 'talk'], once: true, priority: 7,
    cond: { loc: 'campus', timeRange: ZHOU_DAY, stage: { zhou: 0 }, flag: { 'intro.done': true, 'npc.zhou.s0_1': false } },
    passage: 'zhou_s0_1_p1'
  });

  P('zhou_s0_1_p1',
    function (s) {
      s.npcs.zhou.met = true;
      return '大学广播站的窗户里探出半个身子，一个女人正踮着脚够屋檐上的天线，够不着，转头就看见了你。“哎！正好！”她的声音又亮又稳，像调准了频的电台，“同学——不对，幸存者朋友！搭把手呗，扶一下梯子。放心，我这人特别轻。”她叫[npc:zhou]周响[/npc]，你听过这个名字——每周三晚上，全城的收音机里都是她。';
    },
    [
      { label: '扶住梯子', fx: { aff: { zhou: 3 }, goto: 'zhou_s0_1_p2' } },
      { label: '“下来说话，摔了没人给你播新闻。”', fx: { aff: { zhou: 2 }, goto: 'zhou_s0_1_p2' } }
    ]);

  P('zhou_s0_1_p2',
    '天线扶正了，她拍拍手上的灰，郑重其事伸出手来：“临港之声，周响，每周三晚八点，风雨无阻——目前听众数量不详，赞助商数量为零。”她自己先笑了，笑完又一本正经，“别小看广播。城塌了可以修，人心里那根天线塌了，就真找不着台了。”',
    [{ label: '和她握手', fx: { flag: { 'npc.zhou.s0_1': true }, milestone: '初遇周响' } }]);

  // ---- zhou_s0_2 委托：天线零件与电池 ---------------------------------------
  events.register({
    id: 'zhou_s0_2', type: 'story', npc: 'zhou', when: ['talk'], once: false, cooldown: 1440, priority: 5,
    cond: { loc: 'campus', timeRange: ZHOU_DAY, stage: { zhou: 0 }, flag: { 'npc.zhou.s0_1': true, 'npc.zhou.s0_2': false } },
    passage: 'zhou_s0_2_p1'
  });

  P('zhou_s0_2_p1',
    '“朋友，实不相瞒，临港之声快停播了。”[npc:zhou]周响[/npc]把你领进广播站，指着桌上五花大绑的设备，“发射机的[item]天线零件[/item]锈穿了，备用[item]电池[/item]也快见底。军营检查站那片废墟里有塌掉的通讯车，两样都能拆到——我去过一次，走到半路就被野狗撵回来了。”她抱拳，“帮帮临港之声。报酬是十发子弹，和本台永远的鸣谢。”',
    [
      { label: '接下委托', fx: { flag: { 'npc.zhou.s0_2': true, 'npc.zhou.fetch': true }, aff: { zhou: 2 }, appointment: { inDays: 2, minute: 1020, label: '替周响去检查站废墟找零件' }, goto: 'zhou_s0_2_p2' } },
      { label: '“停播就停播，能死人吗？”', fx: { goto: 'zhou_s0_2_p1q' } },
      { label: '先不接', fx: {} }
    ]);

  P('zhou_s0_2_p1q',
    '“能。”她答得斩钉截铁，“上个月有个大爷摸到学校来，说他在居民区地下室躲了半年，靠一台收音机数日子——哪天没了广播，他就打算不数了。”她看着你，播音腔卸了个干净，“我播的不是新闻，是「还有人活着，还有人管你死活」。这话，能死人，也能救人。”',
    [
      { label: '接下委托', fx: { flag: { 'npc.zhou.s0_2': true, 'npc.zhou.fetch': true }, aff: { zhou: 3 }, appointment: { inDays: 2, minute: 1020, label: '替周响去检查站废墟找零件' }, goto: 'zhou_s0_2_p2' } },
      { label: '还是先不接', fx: {} }
    ]);

  P('zhou_s0_2_p2',
    '“通讯车翻在检查站的岗亭西边，绿皮的，缺个轮子，好认。”她在你手心画了个歪歪扭扭的示意图，“天线拆节头那一段就够，电池要方头的军用款。野狗白天懒，赶早去。”她把你送到楼梯口，还不忘补一句，“活着回来！本台不播讣告！”',
    [{ label: '记下', fx: {} }]);

  // ---- zhou_s0_3 检查站废墟取零件 -------------------------------------------
  events.register({
    id: 'zhou_s0_3', type: 'story', npc: 'zhou', when: ['enter', 'action'], once: true, priority: 7,
    cond: { loc: 'checkpoint', flag: { 'npc.zhou.fetch': true, 'npc.zhou.s0_3': false } },
    passage: 'zhou_s0_3_p1'
  });

  P('zhou_s0_3_p1',
    '绿皮通讯车果然翻在岗亭西边，车顶的天线折成三截，半埋在沙袋堆里。你刚撬开车门，车底下滚出一串低低的呜咽——几条野狗从废墟的阴影里站起来，脊背上的毛一根根竖着。',
    [
      { label: '抄家伙，把狗群打散', fx: { combat: 'dog_pack', goto: 'zhou_s0_3_p2' } },
      { label: '扔出一块吃的引开它们', cond: { has: { item: 'driedmeat' } }, fx: { item: { driedmeat: -1 }, time: 15, goto: 'zhou_s0_3_p2' } }
    ]);

  P('zhou_s0_3_p2',
    '车厢里一股霉味，仪表盘拆得七零八落——比你早来的人只对枪械感兴趣，通讯器材倒剩得齐全。你卸下没锈穿的[item]天线零件[/item]，又从座椅底下摸出两块方头的军用[item]电池[/item]，掂着沉手，是好东西。',
    [{ label: '收好零件回大学', fx: { item: { zhou_antenna: 1, zhou_battery: 1 }, flag: { 'npc.zhou.s0_3': true }, time: 20, goto: 'zhou_s0_3_p3' } }]);

  P('zhou_s0_3_p3',
    '离开前你回头看了一眼检查站——岗楼塌了半边，铁丝网卷成一团团的刺球，唯一还立着的旗杆上什么都没有。这里曾经是全城最后的秩序，现在只剩一辆翻倒的车，给一个播音员供零件。',
    [{ label: '（返回）', fx: {} }]);

  // ---- zhou_s0_4 交付 + 升1 -------------------------------------------------
  events.register({
    id: 'zhou_s0_4', type: 'story', npc: 'zhou', when: ['talk'], once: true, priority: 6,
    cond: {
      loc: 'campus', timeRange: ZHOU_DAY, stage: { zhou: 0 }, aff: { zhou: { gte: 20 } },
      flag: { 'npc.zhou.s0_3': true, 'npc.zhou.s0_4': false }, has: { item: ['zhou_antenna', 'zhou_battery'] }
    },
    passage: 'zhou_s0_4_p1'
  });

  P('zhou_s0_4_p1',
    '[npc:zhou]周响[/npc]接过零件的时候眼睛在发光。她当场撸袖子开工，焊锡的味道弥漫开来，半小时后她按下开关——设备的指示灯一颗接一颗亮起来，稳稳的绿。“信号满格！”她转过身，郑重其事地把十发子弹排在你面前，然后深深鞠了一躬，“临港之声全体工作人员——就是我——谢谢你。”',
    [{ label: '收下报酬', fx: { item: { zhou_antenna: -1, zhou_battery: -1 }, bullets: 10, aff: { zhou: 7 }, goto: 'zhou_s0_4_p2' } }]);

  P('zhou_s0_4_p2',
    '“对了！”她翻出一个小本子，笔尖悬着，“恩人得留名。周三晚上八点，收音机拧到老频率——本台要向全城鸣谢你。”她眨眨眼，“放心，只播名字不播住址，安全意识我有。”',
    [{ label: '报上名字', fx: { stage: { zhou: 1 }, flag: { 'npc.zhou.s0_4': true }, milestone: '临港之声重新满格' } }]);

  // ---- zhou_s1_1 留言征集 + 升2 ---------------------------------------------
  events.register({
    id: 'zhou_s1_1', type: 'story', npc: 'zhou', when: ['talk'], once: true, priority: 5,
    cond: { loc: 'campus', timeRange: ZHOU_DAY, stage: { zhou: 1 }, flag: { 'npc.zhou.s1_1': false }, aff: { zhou: { gte: 40 } } },
    passage: 'zhou_s1_1_p1'
  });

  P('zhou_s1_1_p1',
    '广播站的桌上多了一只铁皮盒，投信口是她自己锯的，边上贴着手写标签：幸存者留言箱。“新栏目！”[npc:zhou]周响[/npc]得意地敲敲盒盖，“谁想给谁捎句话——找人的、报平安的、骂街的都收，下周三我原样念出去。电波跑得比人快，说不定谁的家人就在哪台收音机前面呢。”她把一张纸条和铅笔头推给你，“第一条，给你留。”',
    [
      { label: '写一条留言投进去', fx: { flag: { 'npc.zhou.msgPending': true }, aff: { zhou: 3 }, goto: 'zhou_s1_1_p2' } },
      { label: '“我没什么可说的。”', fx: { aff: { zhou: 2 }, goto: 'zhou_s1_1_p2b' } }
    ]);

  P('zhou_s1_1_p2',
    '你想了很久，写了短短一行，折好投进铁皮盒。[npc:zhou]周响[/npc]很守规矩地没有偷看，只是拍拍盒子：“下周三，晚八点，它就飞出去了。”她看着你的眼神亮亮的，“想听自己的话从电波里回来是什么感觉吗？我第一次听见的时候，哭得稀里哗啦。”',
    [{ label: '“到时候我来听。”', fx: { stage: { zhou: 2 }, flag: { 'npc.zhou.s1_1': true }, milestone: '幸存者留言箱' } }]);

  P('zhou_s1_1_p2b',
    '“现在没有，以后会有的。”她一点不勉强，把纸条和铅笔头收进你够得着的抽屉，“箱子就在这儿，二十四小时营业。哪天心里存了话——写下来，交给电波。”',
    [{ label: '记住这只箱子', fx: { stage: { zhou: 2 }, flag: { 'npc.zhou.s1_1': true }, milestone: '幸存者留言箱' } }]);

  // ---- zhou_radio_1 周三晚广播（scheduled） ---------------------------------
  events.register({
    id: 'zhou_radio_1', type: 'scheduled', npc: 'zhou', priority: 4,
    cond: { loc: 'campus', weekday: 2, timeRange: [1140, 1380], flag: { 'npc.zhou.s0_1': true } },
    passage: 'zhou_radio_p1'
  });

  P('zhou_radio_p1',
    function (s) {
      var head = '晚上八点整，[npc:zhou]周响[/npc]清清嗓子，红色的「播出中」灯亮起。“这里是临港之声，我是周响。活着的朋友们，晚上好——”';
      if (G.engine.getFlag('npc.zhou.msgPending')) {
        s.npcs.zhou.storyFlags.msgPending = false;
        s.npcs.zhou.storyFlags.msgRead = true;
        return head + '节目过半，她从铁皮盒里取出一张纸条，展开，是你那张。她读得很慢，一字一句，让每个字都在电波里站稳。你的话穿过发射塔，落进全城不知多少台收音机里——那一刻，你留在纸上的那句话，忽然比说出口时重了很多。';
      }
      var pool = [
        '今晚的节目是安全播报：她挨个念过几条街的路况，哪里塌了，哪里出过尸群，声音稳得像什么都吓不倒她。念完她关掉麦克风，整个人在椅子里塌下去，揉了很久的太阳穴。',
        '今晚她念了一段书——旧图书馆捡来的散文，念到「春天」那个词的时候停了两秒。“下面这段，送给还在数日子的那位大爷。”她说，“接着数。数到春天。”',
        '今晚有听众点播。她说本台没有唱片，清了清嗓子自己唱了一段，跑调跑得理直气壮，唱完自己先笑场：“好了，音乐环节到此结束，本台绝不退票。”'
      ];
      return head + pool[Math.floor(Math.random() * pool.length)];
    },
    [
      { label: '陪她播完这一期', fx: { time: 90, stat: { sanity: 5 }, aff: { zhou: 2 } } },
      { label: '往留言箱里投一条新留言', cond: { flag: { 'npc.zhou.s1_1': true, 'npc.zhou.msgPending': false } }, fx: { flag: { 'npc.zhou.msgPending': true }, time: 90, stat: { sanity: 5 }, aff: { zhou: 2 } } }
    ]);

  // ---- zhou_s2_1 「方舟」传言 + 升3 -----------------------------------------
  events.register({
    id: 'zhou_s2_1', type: 'story', npc: 'zhou', when: ['talk'], once: true, priority: 5,
    cond: { loc: 'campus', timeRange: ZHOU_DAY, stage: { zhou: 2 }, flag: { 'npc.zhou.s2_1': false }, aff: { zhou: { gte: 60 } } },
    passage: 'zhou_s2_1_p1'
  });

  P('zhou_s2_1_p1',
    '这天[npc:zhou]周响[/npc]没开玩笑。她把一页监听记录推给你，上面抄着三组短波片段，字迹一次比一次潦草。“三个月，收到三次。”她压低声音，“自称「方舟」，说城外有军方安全区，可三次报的坐标，没一次是同一个地方。”',
    [
      { label: '“你信吗？”', fx: { goto: 'zhou_s2_1_p2' } },
      { label: '“检查站那个逃兵说，方舟是军里编的安抚广播。”', fx: { goto: 'zhou_s2_1_p2b' } }
    ]);

  P('zhou_s2_1_p2',
    '“我不知道。”她盯着那页纸，“信号是真的，坐标对不上也是真的。可能是幸存者恶作剧，可能是老录音带在自动循环，也可能——真有那么个地方，只是它在挪。”她抬起头，“我把它播出去了，一字没改，真假标注「待证实」。有人骂我传谣，有人靠它撑着没跳楼。你说，我该播吗？”',
    [
      { label: '“播。希望也是物资。”', fx: { aff: { zhou: 5 }, goto: 'zhou_s2_1_p3' } },
      { label: '“播，但把「待证实」念响一点。”', fx: { aff: { zhou: 5 }, goto: 'zhou_s2_1_p3' } }
    ]);

  P('zhou_s2_1_p2b',
    '“方哨？”她挑眉，“他跟我抬过杠。他说军里根本没这个编制，我说那你解释解释信号哪来的——他解释不了，我也解释不了，我们俩谁都说服不了谁。”她耸肩，“所以我照播，真假标注「待证实」。他那套说法，我也播过，公平吧？”',
    [
      { label: '“公平。都播，让人自己想。”', fx: { aff: { zhou: 5 }, goto: 'zhou_s2_1_p3' } }
    ]);

  P('zhou_s2_1_p3',
    '她把监听记录锁回抽屉，长长吐了口气，像放下一件扛了三个月的行李。“这事全城我只跟两个人细说过，你是其二。”她朝你晃晃拳头，“替我保密——在它「待证实」完之前，它只能是希望，不能变成别的东西。”',
    [{ label: '“保密。”', fx: { stage: { zhou: 3 }, flag: { 'npc.zhou.s2_1': true }, milestone: '「方舟」的三次信号' } }]);

  // ---- zhou_s3_1 成人一段 ---------------------------------------------------
  events.register({
    id: 'zhou_s3_1', type: 'story', npc: 'zhou', when: ['talk'], once: false, cooldown: 1440, priority: 6,
    cond: { loc: 'campus', stage: { zhou: { gte: 3 } }, flag: { 'npc.zhou.s3_1': false } },
    passage: 'zhou_s3_1_p1'
  });

  P('zhou_s3_1_p1',
    '广播站里间有个小小的休息室，堆着唱片和旧海报。[npc:zhou]周响[/npc]把遮光帘拉严，忽然不看你，手指绕着耳机线：“那个……本台今天想试播一档新节目。”她深吸一口气，抬起眼睛，播音腔和心跳声在她嗓子里打架，“节目名称：《不播出的那种》。收听人数，上限一人。现在——现在开始接受点播。”',
    [
      { label: '“点播。”', fx: { goto: 'zhou_s3_1_p2' } },
      { label: '“今天先听常规节目吧。”', fx: { goto: 'zhou_s3_1_pout' } }
    ]);

  P('zhou_s3_1_pout',
    '“……收到，听众朋友。”她面不改色地切回播音腔，只有耳朵尖红着，“该节目将择期播出，敬请期待。本次试播到此结束——”她背过身去整理本来就很整齐的唱片，肩膀僵了很久。',
    [{ label: '（离开）', fx: { aff: { zhou: 1 } } }]);

  P('zhou_s3_1_p2',
    function (s) {
      var head = '她关掉里间的灯，只留设备上一排幽幽的绿指示灯。黑暗让她胆子大了很多，凑过来的吻却还是抖的。“信号，接通了。”她贴着你的唇小声说，然后笑场，然后被你堵回去。';
      if (s.player.gender === 'f') {
        return head + '她的手比想象中笃定，指尖带着常年调旋钮磨出的薄茧，从你的锁骨一路调下去，像在找一个只有她知道的频率。找到的时候你整个人短路了一下，她就凑在你耳边，用那把全城都熟悉的声音，极低极低地实况播报你此刻的样子——那声音平时隔着电波安抚全城，此刻只钻进你一个人的耳朵，把你从里到外播得酥麻。你到达的时候咬着她的肩膀，她抱着你轻轻地晃，像哄一段余音。';
      }
      return head + '她把你按在铺着旧海报的长沙发上，跨坐上来，指示灯的绿光勾出她的轮廓。她凑在你耳边，用那把全城都熟悉的嗓音极低地说话——平时隔着电波安抚全城的声音，此刻只属于你一个人，一句一句，把你的呼吸搅得乱七八糟。她引你进入时自己先漏了一声气音，恼羞成怒地咬你的耳朵不许笑，节奏却越来越真，最后她伏在你胸口，用气声宣布：“……本次节目，圆满播出。”';
    },
    [{ label: '把她搂进怀里', fx: { goto: 'zhou_s3_1_p3' } }]);

  P('zhou_s3_1_p3',
    '事后你们挤在窄沙发上，头顶是设备低低的电流声。“知道吗，播音员最怕的是空白，三秒没声音就是播出事故。”她把耳朵贴在你的心口，声音懒懒的，“可现在我一点都不怕了——这个频道有心跳垫底，永远不会空播。”',
    [{ label: '（听着电流声睡去）', fx: { stat: { energy: -18, sanity: 6 }, time: 240, aff: { zhou: 6 }, flag: { 'npc.zhou.s3_1': true }, milestone: '不播出的那种节目' } }]);

  // ---- zhou_s4_1 只有彼此听的深夜节目 + 升4 ---------------------------------
  events.register({
    id: 'zhou_s4_1', type: 'story', npc: 'zhou', when: ['talk', 'enter'], once: true, priority: 6,
    cond: { loc: 'campus', weekday: 2, timeRange: [1140, 1380], stage: { zhou: 3 }, flag: { 'npc.zhou.s2_1': true, 'npc.zhou.s4_1': false }, aff: { zhou: { gte: 80 } } },
    passage: 'zhou_s4_1_p1'
  });

  P('zhou_s4_1_p1',
    '这个周三，正式节目播完，[npc:zhou]周响[/npc]没有关设备，而是拔掉了发射线，把一副耳机分你一只。“加播节目，信号不出这间屋。”她按下录音键，红灯亮起，“《深夜双人台》第一期，主持人周响，嘉宾——”她把话筒转向你，眼睛在暗处亮晶晶的，“请嘉宾自我介绍。”',
    [{ label: '对着话筒开口', fx: { goto: 'zhou_s4_1_p2' } }]);

  P('zhou_s4_1_p2',
    '你们对着话筒聊了半宿：聊塌掉的街，聊没吃完的罐头，聊爆发前各自浪费掉的那些好日子。她笑到打鸣，也有一段长长的没说话——录音带都收着。末了她按停键，把磁带小心翼翼收进盒子，写上日期。“这一期，全城限量一份，听众两名。”她把磁带贴在胸口，“以后每周加播。哪天我不在了，你还能……”她没说完，改口，“——没有哪天。下周同一时间，不见不散。”',
    [{ label: '“不见不散。”', fx: { stage: { zhou: 4 }, aff: { zhou: 5 }, flag: { 'npc.zhou.s4_1': true }, time: 180, milestone: '只有两个人的深夜节目' } }]);

  // ==========================================================================
  // 赵铁（zhao）
  // ==========================================================================

  // ---- zhao_s0_1 交易入门初遇 -----------------------------------------------
  events.register({
    id: 'zhao_s0_1', type: 'story', npc: 'zhao', when: ['enter', 'talk'], once: true, priority: 7,
    cond: { loc: 'market', timeRange: ZHAO_HOURS, stage: { zhao: 0 }, flag: { 'intro.done': true, 'npc.zhao.s0_1': false } },
    passage: 'zhao_s0_1_p1'
  });

  P('zhao_s0_1_p1',
    function (s) {
      s.npcs.zhao.met = true;
      return '惠民超市的卷帘门只开一半，门里一条柜台拦腰横着，柜台后的汉子敞着怀，一把短管猎枪就搁在手边。“买东西弯腰进来，找麻烦转身出去。”[npc:zhao]赵铁[/npc]的嗓门像卡车过桥，“本店规矩：[item]子弹[/item]结账，概不赊欠，童叟无欺——问价不要钱，随便看。”';
    },
    [
      { label: '弯腰进去看看货', fx: { aff: { zhao: 2 }, goto: 'zhao_s0_1_p2' } },
      { label: '“子弹当钱花，是谁定的规矩？”', fx: { goto: 'zhao_s0_1_p1q' } }
    ]);

  P('zhao_s0_1_p1q',
    '“世道定的。”他拍拍柜台上的猎枪，“粮票会过期，金子砸不死人，[item]子弹[/item]又硬又匀又保命——比银行靠谱。”他咧嘴一笑，露出一颗豁牙，“我赵铁在这条街摆了三年柜台，没短过人一发。信不过我，可以信规矩。”',
    [{ label: '进去看看货', fx: { aff: { zhao: 2 }, goto: 'zhao_s0_1_p2' } }]);

  P('zhao_s0_1_p2',
    '货架收拾得意外地体面：吃的喝的一排，用的修的一排，最里面的货架蒙着帆布，看不清内容。[npc:zhao]赵铁[/npc]跟在你半步之后，报价快而准，一口价，不还价。“每逢周五进新货。”他补了一句，“老主顾——买卖做熟了的那种——有老主顾的价钱。”',
    [
      { label: '挑点东西', fx: { flag: { 'npc.zhao.s0_1': true }, milestone: '初遇赵铁', shop: 'zhao_main' } },
      { label: '今天只看不买', fx: { flag: { 'npc.zhao.s0_1': true }, milestone: '初遇赵铁' } }
    ]);

  // ---- zhao_s0_2 委托：周五押送 ---------------------------------------------
  events.register({
    id: 'zhao_s0_2', type: 'story', npc: 'zhao', when: ['talk'], once: false, cooldown: 1440, priority: 5,
    cond: { loc: 'market', timeRange: ZHAO_HOURS, stage: { zhao: 0 }, flag: { 'npc.zhao.s0_1': true, 'npc.zhao.s0_2': false } },
    passage: 'zhao_s0_2_p1'
  });

  P('zhao_s0_2_p1',
    '“哎，站住。”[npc:zhao]赵铁[/npc]从柜台后面招手，压着他那副破锣嗓，“看你身手是吃这碗饭的。周五我去码头提货，老路线，往常雇的两个镖走了一个。”他伸出一只巴掌，“跟一趟，十五发[item]子弹[/item]，管一顿热的。丑话在前——路上什么都可能碰上，怕就别应。”',
    [
      { label: '“周五见。”', fx: { goto: 'zhao_s0_2_p2' } },
      { label: '“再加五发，我就当押的是我的货。”', fx: { goto: 'zhao_s0_2_p1q' } },
      { label: '不接这活', fx: {} }
    ]);

  P('zhao_s0_2_p1q',
    '他眯着眼上下打量你，忽然乐了：“会讲价，是块干买卖的料。”他伸出两根手指，“加三发，十八。再多，你去跟屠夫帮讲去。”这大概是他的顶价了——一个守信的人抠门起来，也是明码标价的。',
    [
      { label: '“成交，周五见。”', fx: { goto: 'zhao_s0_2_p2' } },
      { label: '不接这活', fx: {} }
    ]);

  P('zhao_s0_2_p2',
    function () {
      bookWeekly('npc.zhao.escortBooked', 4, 480, '给赵铁押送进货（周五早上到超市集合）');
      return '“周五早上八点，店门口集合，别迟到——货等人，人不等人。”[npc:zhao]赵铁[/npc]在一张包装纸背面按了个黑手印当字据，一撕两半，一半塞给你，“凭这个领工钱。我赵铁的字据，比银行本票硬。”';
    },
    [{ label: '收好半张字据', fx: { flag: { 'npc.zhao.s0_2': true, 'npc.zhao.escortJob': true }, aff: { zhao: 2 } } }]);

  // ---- zhao_s0_3 周五护送 + 升1（错过可等下个周五） --------------------------
  events.register({
    id: 'zhao_s0_3', type: 'story', npc: 'zhao', when: ['enter', 'action', 'talk'], once: true, priority: 8,
    cond: { loc: 'market', weekday: 4, timeRange: [420, 1080], stage: { zhao: 0 }, flag: { 'npc.zhao.escortJob': true, 'npc.zhao.s0_3': false }, aff: { zhao: { gte: 20 } } },
    passage: 'zhao_s0_3_p1'
  });

  P('zhao_s0_3_p1',
    '进货的家当是一辆焊了铁板的三轮车，[npc:zhao]赵铁[/npc]蹬车，你压后。去程还算太平，码头装完货往回走，过居民区南口的时候，路中央斜拉着一根挂了铁皮罐的绳子——新设的，路障后头蹲着人影。“留下一半货，人过。”破锣似的一嗓子，好几条人影从断墙后站起来。',
    [
      { label: '抄家伙，护住车', fx: { combat: 'thug_patrol', goto: 'zhao_s0_3_p2' } },
      { label: '朝天虚张声势，掩护赵铁蹬车硬闯', fx: { stat: { energy: -12, hp: -6 }, time: 15, goto: 'zhao_s0_3_p2' } }
    ]);

  P('zhao_s0_3_p2',
    '车轮碾过最后一段碎砖路，超市的卷帘门在身后哗啦落下，[npc:zhao]赵铁[/npc]才抹了把脸上的汗，一屁股坐在货堆上。“劫道的年年有，今年格外勤。”他从怀里摸出你那半张字据对上，数出工钱，又额外多拍了两发，“这两发是我的规矩外——你压住了阵脚，货一件没少。”',
    [{ label: '收下工钱', fx: { bullets: 17, aff: { zhao: 7 }, time: 240, stat: { energy: -10 }, goto: 'zhao_s0_3_p3' } }]);

  P('zhao_s0_3_p3',
    '“从今儿起，你在我这儿是老主顾。”[npc:zhao]赵铁[/npc]拍着柜台宣布，像颁一块匾，“老主顾的规矩：先挑，后付，急难的时候——”他难得顿了顿，“价钱好说。”',
    [{ label: '“合作愉快。”', fx: { stage: { zhao: 1 }, flag: { 'npc.zhao.s0_3': true }, milestone: '给赵铁押了一趟货' } }]);

  // ---- zhao_s1_1 保护费事件·立场选择 + 升2 ----------------------------------
  events.register({
    id: 'zhao_s1_1', type: 'story', npc: 'zhao', when: ['enter', 'action', 'talk'], once: true, priority: 8,
    cond: { loc: 'market', timeRange: ZHAO_HOURS, stage: { zhao: 1 }, flag: { 'npc.zhao.s1_1': false }, aff: { zhao: { gte: 40 } } },
    passage: 'zhao_s1_1_p1'
  });

  P('zhao_s1_1_p1',
    '你到超市的时候气氛正僵：两个袖缠暗红布条的汉子堵在柜台前，其中一个用刀背敲着台面。“商场罩着这条街，每月十盒罐头，或者等值[item]子弹[/item]——赵老板，这是第三次上门了。”[npc:zhao]赵铁[/npc]的手搭在猎枪上没抬，看见你进来，眼神在你脸上停了一瞬。',
    [
      { label: '走到赵铁身边站定，把手搭上武器', fx: { flag: { 'npc.zhao.stoodUp': true }, goto: 'zhao_s1_1_p2a' } },
      { label: '劝赵铁：“破财免灾，先交这一回。”', fx: { flag: { 'npc.zhao.paidOff': true }, goto: 'zhao_s1_1_p2b' } },
      { label: '假装挑货，不掺和', fx: { flag: { 'npc.zhao.stayedOut': true }, aff: { zhao: -1 }, goto: 'zhao_s1_1_p2c' } }
    ]);

  P('zhao_s1_1_p2a',
    '柜台里外，一下子是两杆家伙、四只不打算让步的眼睛。领头的来回看了看，把刀口别回腰后，撂下一句“下月再来”，带着人退出了卷帘门。[npc:zhao]赵铁[/npc]盯着门口看了半天，重重呼出一口气：“他们还会来。可今天这步没退——值。”他转头看你，“记你一功。屠夫帮的账，早晚有人跟他们总算，我等得起。”',
    [{ label: '“到那天叫上我。”', fx: { stage: { zhao: 2 }, aff: { zhao: 7 }, flag: { 'npc.zhao.s1_1': true }, milestone: '和赵铁并肩顶回保护费' } }]);

  P('zhao_s1_1_p2b',
    '[npc:zhao]赵铁[/npc]的腮帮子咬了又松，最后从柜台底下拖出一箱罐头，一言不发推过去。人走了，他把猎枪重重搁回原处：“你劝得对，火并划不来——这条街今天没死人，是赚的。”他给自己灌了口凉水，“可这钱交了头一回就有第二回。总有一天，得有人把这笔账掀了。”',
    [{ label: '“会有那天的。”', fx: { stage: { zhao: 2 }, aff: { zhao: 4 }, flag: { 'npc.zhao.s1_1': true }, milestone: '保护费的账先记下了' } }]);

  P('zhao_s1_1_p2c',
    '你在货架间磨蹭到那两人扬长而去——柜台上少了一箱罐头。[npc:zhao]赵铁[/npc]收拾东西的动静比平时重，没提刚才的事，只在你结账时淡淡说了句：“看清楚了？这就是买卖人的日子。”他没怪你，可那声叹气在你出门之后很久还挂在店里。',
    [{ label: '（离开）', fx: { stage: { zhao: 2 }, aff: { zhao: 1 }, flag: { 'npc.zhao.s1_1': true }, milestone: '屠夫帮的保护费' } }]);

  // ---- zhao_s2_1 高级货架开张（机制：tiers 好感≥40 已自动解锁） --------------
  events.register({
    id: 'zhao_s2_1', type: 'story', npc: 'zhao', when: ['talk'], once: true, priority: 6,
    cond: { loc: 'market', timeRange: ZHAO_HOURS, stage: { zhao: 2 }, flag: { 'npc.zhao.s2_1': false } },
    passage: 'zhao_s2_1_p1'
  });

  P('zhao_s2_1_p1',
    '[npc:zhao]赵铁[/npc]把你叫到店最里面，一把掀开那排蒙着的帆布——砍刀、撬棍、成箱的[med]军用急救包[/med]、汽油和电池，码得像阅兵。“硬货，不上明面的柜台。”他叉着腰，“生人来问，我说没有；你来——”他把帆布往货架顶上一撂，“自己挑。价钱照牌，货保真。”',
    [
      { label: '开开眼界', fx: { flag: { 'npc.zhao.s2_1': true }, aff: { zhao: 3 }, milestone: '赵铁的里间货架', shop: 'zhao_main' } },
      { label: '“记下了，回头来挑。”', fx: { flag: { 'npc.zhao.s2_1': true }, aff: { zhao: 3 }, milestone: '赵铁的里间货架' } }
    ]);

  // ---- zhao_s2_2 一句「闺女」·转折 + 升3 ------------------------------------
  events.register({
    id: 'zhao_s2_2', type: 'story', npc: 'zhao', when: ['talk'], once: true, priority: 5,
    cond: { loc: 'market', timeRange: ZHAO_HOURS, stage: { zhao: 2 }, flag: { 'npc.zhao.s2_1': true, 'npc.zhao.s2_2': false }, aff: { zhao: { gte: 60 } } },
    passage: 'zhao_s2_2_p1'
  });

  P('zhao_s2_2_p1',
    '打烊前你帮他一起盘点。数到食品那排货架，[npc:zhao]赵铁[/npc]的手在一排米糊罐头上停了停——那种东西病人和老人才吃，压根卖不动，他却每次进货都补满。“卖不动也进。”他像是解释给你，又像解释给自己，“万一呢。万一哪天有人急用，跑遍全城就我这儿有——那这货就没白压。”',
    [
      { label: '“这不像买卖，像存的一个念想。”', fx: { goto: 'zhao_s2_2_p2' } },
      { label: '默默帮他把那排罐头摆整齐', fx: { goto: 'zhao_s2_2_p2' } }
    ]);

  P('zhao_s2_2_p2',
    '他半天没接话，末了从嗓子眼里滚出一句：“我闺女，从前就爱吃这个牌子。”只这一句，再多一个字都没有。他把账本合上，嗓门恢复了卡车过桥的分贝：“行了行了，打烊！”可他转身时，你看见他抬手在那排罐头上又按了按——像给什么东西掖被角。',
    [{ label: '（装作没看见）', fx: { stage: { zhao: 3 }, aff: { zhao: 5 }, flag: { 'npc.zhao.s2_2': true }, milestone: '那排卖不动的罐头' } }]);

  // ---- zhao_s3_1 成人一段 ---------------------------------------------------
  events.register({
    id: 'zhao_s3_1', type: 'story', npc: 'zhao', when: ['talk'], once: false, cooldown: 1440, priority: 6,
    cond: { loc: 'market', timeRange: [1020, 1200], stage: { zhao: { gte: 3 } }, flag: { 'npc.zhao.s3_1': false } },
    passage: 'zhao_s3_1_p1'
  });

  P('zhao_s3_1_p1',
    '打烊前的最后一小时，店里只剩你们两个。[npc:zhao]赵铁[/npc]锁卷帘门的动作停了两回，第三回他把钥匙攥在手里，转过身，这个讲了半辈子价的男人难得笨嘴拙舌：“阁楼上……收拾出来了。被褥是新换的。”他的耳根比砖头还红，“我这人不会说那些弯弯绕。这桩——我不还价，你要觉得亏，现在就走，工钱货款一码归一码。”',
    [
      { label: '“这桩，成交。”', fx: { goto: 'zhao_s3_1_p2' } },
      { label: '“再让我想想行情。”', fx: { goto: 'zhao_s3_1_pout' } }
    ]);

  P('zhao_s3_1_pout',
    '“……成。”他把钥匙揣回兜里，别扭地清了清嗓子，拉开卷帘门送你，“想多久都成，本店——”他卡了一下壳，“本店这桩货，只给你留着。”说完他自己先臊得把门拉上了。',
    [{ label: '（忍着笑离开）', fx: { aff: { zhao: 1 } } }]);

  P('zhao_s3_1_p2',
    function (s) {
      var head = '阁楼收拾得一板一眼：被褥叠成豆腐块，一盏马灯擦得锃亮，连墙缝都新糊过。他站在这方寸之地里手足无措，还是你先拉了他一把。';
      if (s.player.gender === 'f') {
        return head + '这个扛了半辈子货的男人，手掌宽得能托住你整个后背，力气却收着，收到指尖发颤。他吻得笨，落点全靠碰运气，你笑了一声，他更慌，索性把你整个抱起来放平在被褥上，像安置一件顶值钱的货。进入你之后他的节奏沉得像压秤砣，每一下都实打实，喘息压在喉咙里滚成闷雷，末了他把脸埋在你的发里，说了句谁也听不清的话——大概是句最不像生意人的话。';
      }
      return head + '这个扛了半辈子货的男人，力气大得能把你整个按进被褥里，却收着劲，收到手背青筋直跳。他不会那些花样，只有一把子实诚的力气和一身汗，你引一分他学一分，学得又快又狠。到后来阁楼的地板都在响，他把你抵在被褥里，喘息像破风箱，最后一声闷吼咬在牙关里，砸得又沉又实——跟他这个人一样，一是一，二是二。';
    },
    [{ label: '缓过劲来', fx: { goto: 'zhao_s3_1_p3' } }]);

  P('zhao_s3_1_p3',
    '事后他平躺着，胸口起伏像风匣，忽然伸手把你捞过去搁在他臂弯里，动作生硬得像搬货，力道却轻。“往后柜台里的东西……”他张了张嘴，到底还是把那句破规矩的话咽了回去，换成，“往后你的货，我永远给你留最好的。”——从赵铁嘴里，这已经是顶了天的情话。',
    [{ label: '（在马灯下睡去）', fx: { stat: { energy: -18, sanity: 6 }, time: 360, aff: { zhao: 6 }, flag: { 'npc.zhao.s3_1': true }, milestone: '超市阁楼的马灯' } }]);

  // ---- zhao_s4_1 货运账本与女儿 + 升4 ---------------------------------------
  events.register({
    id: 'zhao_s4_1', type: 'story', npc: 'zhao', when: ['talk'], once: true, priority: 6,
    cond: { loc: 'market', timeRange: ZHAO_HOURS, stage: { zhao: 3 }, flag: { 'npc.zhao.s2_2': true, 'npc.zhao.s4_1': false }, aff: { zhao: { gte: 80 } } },
    passage: 'zhao_s4_1_p1'
  });

  P('zhao_s4_1_p1',
    '这天[npc:zhao]赵铁[/npc]破例在营业时间落了卷帘门。他从柜台最底层的暗格里取出一本包着牛皮纸的[item]货运账本[/item]，翻到最后一页，推给你。那页没有货名没有价钱，只有一个名字——赵小满——和一行字：欠她一顿饱饭。',
    [{ label: '听他说', fx: { goto: 'zhao_s4_1_p2' } }]);

  P('zhao_s4_1_p2',
    '“封城头一个月，粮价一天翻三倍。我囤着货舍不得动，想着再涨涨，换套过冬的家当。”他的声音平得吓人，“闺女才二十四，跟我犟，说她年轻扛得住，省下的先紧着邻居老人。一场风寒，就……就是一场风寒的事。”他的拇指在那行字上压平了又压平，“打那以后我就懂了——货囤着不是钱，是命。谁家急用，我这儿必须有。这店开一天，就是给她还一天账。”',
    [
      { label: '“她会记这笔账的——记你还清的那部分。”', fx: { goto: 'zhao_s4_1_p3' } },
      { label: '握住他压着账本的手', fx: { goto: 'zhao_s4_1_p3' } }
    ]);

  P('zhao_s4_1_p3',
    '[npc:zhao]赵铁[/npc]的眼眶红了很久，到底没让眼泪下来。他把账本重新包好收进暗格，锁上，然后从柜台底下拎出一小坛酒和两只碗。“这事，全城只有你知道。”他给你满上，破锣嗓子放得很低，“往后这店里的账，一半记我名下，一半——”他碰了碰你的碗，“记你的。”',
    [{ label: '干了这碗', fx: { stat: { alcohol: 10 }, stage: { zhao: 4 }, aff: { zhao: 5 }, flag: { 'npc.zhao.s4_1': true }, milestone: '赵小满的账' } }]);

})();
