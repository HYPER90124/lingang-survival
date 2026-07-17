/* =============================================================================
 * campaign.js — M19：屠夫帮收网战役（三幕 + 孟九 + 战后世界变体）
 * -----------------------------------------------------------------------------
 * qin 复仇线从「只循环不收网」升级为三幕战役。入口门槛：qin stage4 + s4_1 +
 * day≥110（开局 day90 起第 20 天，防前期误入）。
 *
 * 结构与 flag 链（均存 npc.qin.* / world.*）：
 *   第一幕·凑情报（三碎片任意顺序，各自独立事件，flag 锁序防重复）
 *     camp_clue_mao   灰猫情报网（mao stage≥2 @sewer，付 10 子弹或 aff≥60 免费）→ campClueMao
 *     camp_clue_zhou  周响广播截听（zhou s2_1 后，campus 周三晚）            → campClueZhou
 *     camp_clue_fang  方哨的北桥记录（fang s1_1 后 @checkpoint）             → campClueFang
 *     三碎片集齐 → campReady（checkClues 文本副作用落旗，同 M5 met 联动写法）
 *   第二幕·端据点 camp_depot（大型事件 @dock 夜间，qin 强制同行〔M18 companion〕）
 *     潜入（melee 技能 / 手电暗号 判定链）或强攻（thug_squad 连战两场）；
 *     显式撤退分支写 campRetreat（M6 败分支模式），事件 cd 4320 = 三日后可再来；
 *     胜利写 campDepot + 缴获（子弹20 + 军急救 + 零件×2），并登记第三幕日历。
 *   第三幕·堵孟九 camp3_ambush（campDepot 后 2–4 日，appointment eventId 强制触发
 *     @checkpoint 夜；when:[] 不入常规池，同 lin_promise_1 写法）
 *     胜利后处置选择：交给老秦了断（mengDead）/ 逼问内情放走（mengSpared），
 *     均写 world.butcherFallen（M20 动态经济读这面旗）。
 *   战后世界：camp_after_1~4 变体事件（cond butcherFallen:true）；
 *     fang/zhao/su 各一条一次性搭话变体；qin_hunt 覆盖注册加 butcherFallen:false
 *     门（引擎 events.register 按 id 替换，qin.js 文件未动），新增 qin_hunt2
 *     「清理残党」循环接棒。
 *
 * 战败（M13-A 非死亡，被俘变体本模块自写）：本文件包装 G.engine.startCombat——
 *   returnPassage 命中战役段落时改挂 onWin/onFlee/onLose 回调；战败走
 *   campaignDefeat()（镜像 combat.js humanDefeat：洗劫/hp15/理智-10/昏迷180分），
 *   醒在码头货舱（camp_defeat_p1），qin 来捞人；world.campLastLoss 记败于哪一幕。
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  var story = G.data.story, events = G.data.events;

  function P(id, text, choices) { story.register({ id: id, text: text, choices: choices }); }

  var LOCS = ['home', 'residential', 'market', 'hospital', 'police', 'bar', 'campus', 'metro',
              'park', 'gas', 'mall', 'church', 'dock', 'checkpoint', 'sewer'];
  // cond DSL 无否定，「不在某地」用其余 14 地点 anyOf 表达（同 dol.js）
  function notAt(loc) {
    return { anyOf: LOCS.filter(function (l) { return l !== loc; }).map(function (l) { return { loc: l }; }) };
  }

  var NIGHT_DOCK = [1170, 180];      // 19:30–03:00

  // ---- 三碎片集齐 → campReady（文本副作用，幂等；集齐当场登记碰头备忘） -----
  function checkClues() {
    var e = G.engine;
    if (e.getFlag('npc.qin.campReady')) return;
    if (!e.getFlag('npc.qin.campClueMao') || !e.getFlag('npc.qin.campClueZhou') || !e.getFlag('npc.qin.campClueFang')) return;
    e.setFlag('npc.qin.campReady', true);
    var p = G.state.player;
    G.state.calendar.appointments.push({ day: p.day + 1, minute: 1200, label: '与老秦碰头——入夜后的码头', eventId: null, done: false });
  }

  // ---- 第三幕日历登记：campDepot 后 2–4 日，检查站夜 21:00 强制触发 ----------
  function bookBoss() {
    var e = G.engine;
    if (e.getFlag('npc.qin.campBossBooked')) return;
    e.setFlag('npc.qin.campBossBooked', true);
    var p = G.state.player;
    var inDays = 2 + Math.floor(Math.random() * 3);
    G.state.calendar.appointments.push({ day: p.day + inDays, minute: 1260, label: '堵孟九——北桥检查站', eventId: 'camp3_ambush', done: false });
  }

  // ---- 战役强制同行（复用 M18 companion；已有他人同行则先无罚解散） ----------
  function forceQin() {
    var w = G.state.world;
    if (w.companion && w.companion.id === 'qin') return;
    if (w.companion && G.engine.companionEnd) G.engine.companionEnd('dismiss');
    w.companion = { id: 'qin', until: (G.state.player.day + 1) * 1440 };
  }

  // ==========================================================================
  // 战败流程（M13-A 非死亡；镜像 combat.js humanDefeat，醒来段本模块自写）
  // ==========================================================================
  function campaignDefeat(which) {
    var s = G.state, p = s.player;
    var lostBullets = Math.floor(p.bullets / 2);
    p.bullets -= lostBullets;
    var lostItems = [];
    p.inventory.slice().forEach(function (entry) {
      var def = G.engine.itemDef(entry.id);
      if (def && (def.type === 'key' || def.type === 'weapon')) return;
      var take = Math.floor(entry.count / 2);
      if (take > 0) {
        G.engine.removeItem(entry.id, take);
        lostItems.push({ name: (def && def.name) || entry.id, count: take });
      }
    });
    s._defeatLoss = { bullets: lostBullets, items: lostItems };
    if (G.engine.companionState && G.engine.companionState()) G.engine.companionEnd('defeat');
    s.world.flags.thugDefeats = (s.world.flags.thugDefeats || 0) + 1;
    G.engine.setFlag('world.campLastLoss', which);
    G.engine.statSet('hp', 15);
    G.engine.statAdd('sanity', -10);
    s.combat = null;
    G.engine.advance(180, { sleeping: true });
    if (s._dead) return;
    G.engine.openPassage('camp_defeat_p1');
  }

  // 包装 startCombat：returnPassage 命中战役战斗时，把「胜/逃/败」三路拆开——
  // 胜=原 goto 段落，逃=撤退段（campRetreat/孟九突围），败=campaignDefeat 被俘。
  // 仅命中下表的 id 生效，其余战斗原样透传（数据层扩展，引擎未动）。
  var CAMP_BATTLES = {
    'camp2_a1_p':  { flee: 'camp2_flee_p', loss: 'depot' },
    'camp2_win_p': { flee: 'camp2_flee_p', loss: 'depot' },
    'camp3_win_p': { flee: 'camp3_flee_p', loss: 'boss' }
  };
  var _origStartCombat = G.engine.startCombat;
  G.engine.startCombat = function (encounterId, opts) {
    opts = opts || {};
    var hook = opts.returnPassage && CAMP_BATTLES[opts.returnPassage];
    if (hook) {
      var winP = opts.returnPassage;
      opts = {
        onWin:  function () { G.engine.openPassage(winP); },
        onFlee: function () { G.engine.openPassage(hook.flee); },
        onLose: function () { campaignDefeat(hook.loss); }
      };
    }
    return _origStartCombat(encounterId, opts);
  };

  // ==========================================================================
  // 第一幕·凑情报（三碎片，任意顺序）
  // ==========================================================================

  // ---- 碎片一：灰猫情报网 ---------------------------------------------------
  events.register({
    id: 'camp_clue_mao', type: 'story', npc: 'mao', when: ['talk'], once: false, cooldown: 1440, priority: 6,
    cond: { loc: 'sewer', dayMin: 110, stage: { qin: { gte: 4 }, mao: { gte: 2 } },
            flag: { 'npc.qin.s4_1': true, 'npc.qin.campClueMao': false } },
    passage: 'camp_clue_mao_p1'
  });

  P('camp_clue_mao_p1',
    '你提起孟九，[npc:mao]灰猫[/npc]拨油灯的手停了半拍。“姓孟的布防图，问的人不少，出得起价的不多。”她从铁皮柜里抽出一卷纸压在掌下，“十发[item]子弹[/item]。收你的是搬运费——这东西压在我手里，本来就是烫的。”',
    [
      { label: '数出十发子弹', cond: { has: { bullets: 10 } },
        fx: { bullets: -10, goto: 'camp_clue_mao_p2' } },
      { label: '“咱们之间，还谈搬运费？”', cond: { aff: { mao: { gte: 60 } } },
        fx: { goto: 'camp_clue_mao_p2' } },
      { label: '先不问这个', fx: {} }
    ]);

  P('camp_clue_mao_p2',
    function () {
      G.engine.setFlag('npc.qin.campClueMao', true);
      checkClues();
      var t = '图纸摊开，是码头收货点的布防：外围一个游哨半炷香绕一圈，库房门口守夜两人，换哨对暗号用手电——三短一长。[npc:mao]灰猫[/npc]指尖点着图上一处涂黑的角，“孟九这个人，我的线人凑不出他的脸，只凑得出他的习惯：疑心重，从不在同一间屋睡第二晚，手底下人只认调度不认人。你们要动他，先动他的货——货一断，他就得自己露头。”';
      if (G.engine.getFlag('npc.qin.campReady')) {
        t += '三块拼在一起，路就通了。把这些带给老秦，入夜后去码头闸口找他碰头。';
      }
      return t;
    },
    [{ label: '把图纸收进怀里', fx: { aff: { mao: 2 }, time: 30 } }]);

  // ---- 碎片二：周响广播截听 -------------------------------------------------
  events.register({
    id: 'camp_clue_zhou', type: 'story', npc: 'zhou', when: ['enter', 'talk'], once: false, cooldown: 1440, priority: 6,
    cond: { loc: 'campus', weekday: 2, timeRange: [1140, 1380], dayMin: 110, stage: { qin: { gte: 4 } },
            flag: { 'npc.zhou.s2_1': true, 'npc.qin.s4_1': true, 'npc.qin.campClueZhou': false } },
    passage: 'camp_clue_zhou_p1'
  });

  P('camp_clue_zhou_p1',
    '广播室里只亮一盏工作灯，[npc:zhou]周响[/npc]把耳机往你手里塞，声音压得很低：“别出声——我扫频扫到一个加密糊弄鬼的频道，屠夫帮的调度台，每周三这个点报下周的押运。”耳机里电流咝咝作响，一个哑嗓子正在念数字。',
    [{ label: '接过耳机听下去', fx: { goto: 'camp_clue_zhou_p2' } }]);

  P('camp_clue_zhou_p2',
    function () {
      G.engine.setFlag('npc.qin.campClueZhou', true);
      checkClues();
      var t = '半个钟头，你们对着杂音抄下一张时刻表：大宗的货走水路进码头，隔几天一批，全在后半夜；报到大宗那一条时，哑嗓子加了一句“九爷亲自对数”。[npc:zhou]周响[/npc]摘下耳机揉着耳朵，“听见没有，别人的货报箱数，他的货报人名。这位孟九不放心任何人——大买卖，他必须自己到场。”';
      if (G.engine.getFlag('npc.qin.campReady')) {
        t += '三块拼在一起，路就通了。把这些带给老秦，入夜后去码头闸口找他碰头。';
      }
      return t;
    },
    [{ label: '把时刻表抄进烟盒背面', fx: { aff: { zhou: 2 }, time: 30 } }]);

  // ---- 碎片三：方哨的北桥记录 -----------------------------------------------
  events.register({
    id: 'camp_clue_fang', type: 'story', npc: 'fang', when: ['talk'], once: false, cooldown: 1440, priority: 6,
    cond: { loc: 'checkpoint', dayMin: 110, stage: { qin: { gte: 4 } },
            flag: { 'npc.fang.s1_1': true, 'npc.qin.s4_1': true, 'npc.qin.campClueFang': false } },
    passage: 'camp_clue_fang_p1'
  });

  P('camp_clue_fang_p1',
    '听你说明来意，[npc:fang]方哨[/npc]往火堆里添了根柴，从背囊底层摸出一个用油布裹了三层的本子。“执勤记录。人都撤了，我还照规矩记——过卡的车、人数、时辰，一笔没落。”他翻到夹着弹壳的那一页递给你，“缠红布条的车队，都在这几页上。”',
    [{ label: '“说吧，我听着。”', fx: { goto: 'camp_clue_fang_p2' } }]);

  P('camp_clue_fang_p2',
    function () {
      G.engine.setFlag('npc.qin.campClueFang', true);
      checkClues();
      var t = '记录很干净：屠夫帮的车队每回过北桥都压着同一个时辰，头车两人探路，货车里外三人，殿后一辆改装皮卡。[npc:fang]方哨[/npc]用炭条在其中几行下划了线，“这几趟，副驾坐着个不下车的人，隔着挡风玻璃抽烟，别人给他点火。探路的车过完卡要回头打两下大灯，他的车才动。”他合上本子看你，“架子这么大的，整个屠夫帮数不出第二个。”';
      if (G.engine.getFlag('npc.qin.campReady')) {
        t += '三块拼在一起，路就通了。把这些带给老秦，入夜后去码头闸口找他碰头。';
      }
      return t;
    },
    [{ label: '把划线的几页记牢', fx: { aff: { fang: 2 }, time: 30 } }]);

  // ==========================================================================
  // 第二幕·端据点（大型事件 @dock 夜，qin 强制同行；cd 4320 = 三日后可再来）
  // ==========================================================================
  events.register({
    id: 'camp_depot', type: 'story', when: ['enter', 'action'], once: false, cooldown: 4320, priority: 9,
    cond: { loc: 'dock', timeRange: NIGHT_DOCK, flag: { 'npc.qin.campReady': true, 'npc.qin.campDepot': false } },
    passage: 'camp2_p1'
  });

  P('camp2_p1',
    function () {
      forceQin();
      var again = G.engine.getFlag('npc.qin.campRetreat')
        ? '上回撤下来之后，据点果然加了岗，这几天风声松了些，游哨又开始偷懒。'
        : '';
      return '闸口的阴影里有人打了个响指——[npc:qin]老秦[/npc]比你先到，钢管用布条缠了防反光，腰上还别了你没见过的短斧。顺着他的下巴看过去：堆场深处那排库房亮着一盏孤灯，铁皮门前晃着烟头的火星，起重机的影子把整片场地割成一条条的黑。' + again +
        '“布防、船期、车路，都对上了，货和账房都在里面。”他把烟盒背面的图塞回怀里，“今晚就是收网的头一刀。怎么切，你说。”';
    },
    [
      { label: '走暗处，摸进去', fx: { goto: 'camp2_sneak1_p' } },
      { label: '抄家伙，从正面打进去', fx: { combat: 'thug_squad', goto: 'camp2_a1_p' } },
      { label: '今晚风声不对，先撤', fx: { goto: 'camp2_off_p' } }
    ]);

  P('camp2_off_p',
    function () {
      var w = G.state.world;
      if (w.companion && w.companion.id === 'qin' && G.engine.companionEnd) G.engine.companionEnd('dismiss');
      return '[npc:qin]老秦[/npc]盯着那盏孤灯看了半晌，没催你。“行。打没准备的仗，才是真败。”他把短斧插回腰后，陪你退出堆场，“货还得走水路，据点跑不了——挑个你手脚利索的晚上，再来。”';
    },
    [{ label: '（改日再来）', fx: { time: 20 } }]);

  // ---- 潜入判定链 -----------------------------------------------------------
  P('camp2_sneak1_p',
    '你们贴着集装箱的锈壁往里挪，游哨的脚步声隔着两排货堆传过来，一圈半炷香，和灰猫的图分毫不差。绕到库房侧面还剩最后一段亮地——要么放倒游哨，要么骗过门口守夜的。',
    [
      { label: '摸上去，无声放倒游哨（75%）', cond: { skill: 'melee' },
        fx: { roll: { chance: 0.75, win: { goto: 'camp2_sneak2_p' }, lose: { goto: 'camp2_alarm_p' } } } },
      { label: '用手电打「三短一长」的换哨暗号（70%）', cond: { has: { item: 'flashlight' } },
        fx: { roll: { chance: 0.7, win: { goto: 'camp2_sneak2_p' }, lose: { goto: 'camp2_alarm_p' } } } },
      { label: '亮地过不去，改强攻', fx: { combat: 'thug_squad', goto: 'camp2_a1_p' } }
    ]);

  P('camp2_sneak2_p',
    '游哨的位置空了，门口守夜的两个人还蹲在火盆边烤手，库房的铁皮门虚掩着一条缝，里面传来算盘珠子的响声。[npc:qin]老秦[/npc]朝你比了个手势：一左一右，同时动手，别让他们碰着墙上挂的锣。',
    [{ label: '同时动手', fx: { combat: 'thug_patrol', goto: 'camp2_win_p' } }]);

  P('camp2_alarm_p',
    '暗处一声哨响炸开——露了行藏。库房的灯一盏接一盏亮起来，人声和铁器声从堆场深处涌过来，[npc:qin]老秦[/npc]把缠布的钢管抖开，退到你背后半步：“别慌，冲出来多少打多少——或者现在就撤，还来得及。”',
    [
      { label: '打多少算多少', fx: { combat: 'thug_squad', goto: 'camp2_a1_p' } },
      { label: '撤，别恋战', fx: { goto: 'camp2_flee_p' } }
    ]);

  // ---- 强攻连战（第一场 → 中场 → 第二场） -----------------------------------
  P('camp2_a1_p',
    '第一拨人撂倒在起重机底下，堆场重新静下来，只剩库房那盏灯还亮着。[npc:qin]老秦[/npc]踩住一个哼哼的家伙翻他腰牌，皱眉，“调度的人不在这拨里，里面还有一手。”他甩掉钢管上的血，看你——是一鼓作气，还是见好就收。',
    [
      { label: '一鼓作气，往里打', fx: { combat: 'thug_squad', goto: 'camp2_win_p' } },
      { label: '见好就收，撤', fx: { goto: 'camp2_flee_p' } }
    ]);

  // ---- 显式撤退（M6 败分支模式；cd 4320 已在事件触发时挂上=三日戒备期） ------
  P('camp2_flee_p',
    '你们退出堆场，身后的哨声追出两条街才断。回望过去，码头方向的灯一盏盏全点亮了，人影在库房前排成一线。[npc:qin]老秦[/npc]喘着气靠在墙上，半天憋出一句：“惊了蛇。这几晚他们睡觉都得睁只眼——等风头过了再来。”',
    [{ label: '先撤回去', fx: { flag: { 'npc.qin.campRetreat': true }, stat: { sanity: -3 }, time: 30 } }]);

  // ---- 端掉据点（潜入/强攻共用收尾） ----------------------------------------
  P('camp2_win_p',
    '库房里再没有站着的人。货架从地面码到房梁：贴封条的整箱罐头、成捆的[item]子弹[/item]、军绿色的急救箱，箱壁上一水的军用批号。账房的小桌翻倒在角落，散了一地货单。[npc:qin]老秦[/npc]用短斧把最大那只箱子撬开，站在那儿看了很久，声音哑下去，“三个月，他们就从这座城身上刮下来这么多。”他把翻出来的[item]押运簿[/item]拍在你手里，“搬。能搬多少搬多少，剩下的烧掉——不能再让它变回孟九的本钱。”',
    [{ label: '清点缴获', fx: { bullets: 20, item: { militaryfirstaid: 1, sparepart: 2 },
        flag: { 'npc.qin.campDepot': true, 'npc.qin.campRetreat': false }, aff: { qin: 6 },
        milestone: '端掉屠夫帮的码头收货点', time: 60, goto: 'camp2_after_p' } }]);

  P('camp2_after_p',
    function () {
      bookBoss();
      return '火光从库房的气窗里透出来的时候，你们已经上了高处的货桥。[npc:qin]老秦[/npc]就着火光翻那本押运簿，翻到最后一页，手指停住。“大宗。走北桥检查站，孟九亲自对数。”他把那页撕下来折进怀里，看火把库房的房梁烧塌，“货断了，账烧了，他只剩这最后一趟——这回，他必须自己露头。日子我记下了，到时候北桥见。”';
    },
    [{ label: '（收网在即）', fx: { time: 30 } }]);

  // ==========================================================================
  // 第三幕·堵孟九（appointment eventId 强制触发 @checkpoint 夜；when:[] 不入常规池）
  // ==========================================================================
  events.register({ id: 'camp3_ambush', type: 'story', when: [], passage: 'camp3_p1' });

  P('camp3_p1',
    function (s) {
      if (s.player.location === 'checkpoint') {
        forceQin();
        return '北桥检查站的探照灯早就死了，桥面只有月光。你和[npc:qin]老秦[/npc]伏在废弃岗亭后面，两头的路障拖回了路中央——方哨记录里的时辰一到，引擎声果然从桥那头压过来：头车两人探路，过了卡，回头打两下大灯。第二辆车稳稳停在灯影外，副驾的车窗摇下一条缝，烟头的火星明了一下。[npc:qin]老秦[/npc]的呼吸慢下来，一字一字：“是他。”';
      }
      return '你在别处听见了北桥方向隐约的引擎声——坏了，是今晚。等你想赶过去，时辰早就错过了。孟九的车队过完卡扬长而去，老秦独自蹲了半夜的岗亭，没等到你，他不动手。';
    },
    [
      { label: '拦住车队', cond: { loc: 'checkpoint' }, fx: { goto: 'camp3_p2' } },
      { label: '不能让老秦白等第二次——递话再堵下一趟', cond: notAt('checkpoint'),
        fx: { appointment: { inDays: 2, minute: 1260, eventId: 'camp3_ambush', label: '堵孟九——北桥检查站' }, stat: { sanity: -2 } } }
    ]);

  P('camp3_p2',
    function () {
      var t = '路障被拖出来的声音让整支车队停死在桥面上。副驾的车门开了，下来的男人比卷宗照片上老了几岁，笑纹还是很正派，只是眼睛不笑。“秦队。”孟九把烟头在车顶按灭，“货是你烧的。我就说，这座城里还能让我亏本的，数来数去只剩你一个。”[npc:qin]老秦[/npc]从岗亭的影子里走出去，钢管拄在桥面上，“你叫我一声队长，就该知道我来干什么。把枪放下，我带你回警局——案卷我留着，一页没少。”孟九笑出声，朝身后摆了摆手，杂兵们的家伙立起来。“警局？临港连活人的规矩都没了，你还揣着一本死人的规矩。”';
      if (G.engine.getFlag('npc.qin.rescueLate')) {
        t += '他的目光越过老秦落在你身上，“北巷那晚去搬救兵的就是你吧？回来得不算太迟——今晚可没处搬去。”';
      } else if (G.engine.getFlag('npc.qin.sawCargo')) {
        t += '你认得车斗里那种贴封条的货箱——和商场外围、和码头库房里的，同一个来路。这批军火过了桥，这座城又要多流多少血。';
      }
      return t;
    },
    [
      { label: '“规矩死没死，打过才知道。”', fx: { combat: 'thug_boss_pack', goto: 'camp3_win_p' } },
      { label: '问他为什么杀老秦的搭档', fx: { goto: 'camp3_p2b' } }
    ]);

  P('camp3_p2b',
    '孟九的笑收了收。“老周？他自己摸上船来的。不收钱，不闭嘴，还要劝我回头。”他摊开手，像在说一件搬货的小事，“队长教过我们：办案要办到底。我只是换了个案由。”[npc:qin]老秦[/npc]手背上的青筋绷起来，钢管在桥面上磕了一声，再没什么好问的了。',
    [{ label: '动手', fx: { combat: 'thug_boss_pack', goto: 'camp3_win_p' } }]);

  P('camp3_flee_p',
    '桥面上乱成一团，孟九早就退回车里，车队顶开半边路障冲了过去，尾灯很快缩成两个红点。[npc:qin]老秦[/npc]追出十几步，停住，把钢管狠狠杵在桥面上。“跑得了这趟，跑不了下趟。他的货就剩这一条道——我再去要日子。”',
    [{ label: '再堵下一趟', fx: { appointment: { inDays: 2, minute: 1260, eventId: 'camp3_ambush', label: '堵孟九——北桥检查站' }, stat: { sanity: -3 }, time: 30 } }]);

  P('camp3_win_p',
    '最后一个杂兵滚下桥坡跑了，没人管他。孟九靠着车轮坐在地上，捂着肋下，血从指缝里渗出来，人还笑得动：“行……队长带出来的，果然都是好手。”[npc:qin]老秦[/npc]一脚踢开他够向枪的手，钢管的一端压在他胸口，转头看你——这一刀怎么收，他把话让给了你。',
    [
      { label: '把他交给老秦，做个了断', fx: { goto: 'camp3_end_kill_p' } },
      { label: '拦一拦——先逼问屠夫帮的底，再放他一条生路', fx: { goto: 'camp3_end_spare_p' } }
    ]);

  P('camp3_end_kill_p',
    '你退开半步。[npc:qin]老秦[/npc]在孟九面前蹲下来，把那份[item]旧案卷宗[/item]从怀里抽出来，一页一页念给他听——案由，人证，日期，老周的名字。念完，他合上卷宗。“判了。”枪声在桥洞底下滚了很久。老秦站起来的时候背对着你，肩膀塌了一寸，像卸下了扛了三个月的东西，“替我记着：这不是报仇，是结案。”[blood]桥面的血[/blood]顺着伸缩缝往江里滴。',
    [{ label: '陪他在桥上站到天亮', fx: { flag: { 'npc.qin.mengDead': true, 'world.butcherFallen': true },
        aff: { qin: 8 }, stat: { sanity: -3 }, time: 120, milestone: '孟九伏法，屠夫帮塌了台' } }]);

  P('camp3_end_spare_p',
    '你按住老秦的钢管。孟九看懂了，竹筒倒豆子倒得飞快：屠夫帮的家底就是这条水路，货源断了，几个头目已经在抢地盘，火并就在这几天；余下的窝点、放哨的楼口，他一个一个报，你一条一条记。[npc:qin]老秦[/npc]从头到尾没说话，最后把钢管收回来，侧身让开一条路。“滚。再让我在临港看见你，案卷上就添你最后一笔。”孟九扶着桥栏起身，走出十几步，回头看了老秦一眼，什么也没说，一瘸一拐地消失在桥那头的黑里。',
    [{ label: '收好那份口供', fx: { flag: { 'npc.qin.mengSpared': true, 'world.butcherFallen': true },
        aff: { qin: -3 }, time: 120, milestone: '孟九远走，屠夫帮散了' } }]);

  // ==========================================================================
  // 战败被俘（campaignDefeat 唯一出口；qin 来捞人）
  // ==========================================================================
  P('camp_defeat_p1',
    function (s) {
      s.player.location = 'dock';
      var loss = s._defeatLoss, parts = [];
      if (loss) {
        if (loss.bullets > 0) parts.push('子弹×' + loss.bullets);
        (loss.items || []).forEach(function (it) { parts.push(it.name + '×' + it.count); });
      }
      var lossStr = parts.length
        ? '身上被翻了个底朝天，少掉的东西数得出来：[item]' + parts.join('、') + '[/item]。'
        : '身上被翻了个底朝天，他们没搜出几样值钱的。';
      var head = '铁锈味。你在晃动的黑暗里醒过来，手脚被塑料绳捆着，身下是码头货舱冰冷的铁底板，[blood]肋骨[/blood]随着每一次呼吸抽着疼，' + lossStr +
        '不知过了多久，舱门被撬棍别开一条缝，火光和冷风一起灌进来——[npc:qin]老秦[/npc]半边脸挂着血，割断绳子把你拖出去，一路没说话，直到上了岸才把你按在缆桩上坐好。';
      if (G.engine.getFlag('world.campLastLoss') === 'boss') {
        return head + '“孟九的货过了桥。”他替你揉着勒出血痕的手腕，下手很轻，话却咬得很紧，“人没了可以再堵，命没了就全完了。记住这口气——下一趟，连本带利。”';
      }
      return head + '“据点惊了，这几晚动不得。”他把自己的外套裹在你身上，蹲下来跟你平视，“输一仗死不了人，输了命才叫输。养好伤，风头一过，我们接着来。”';
    },
    [
      { label: '“下一趟，我还去。”', cond: { flag: { 'world.campLastLoss': 'boss' } },
        fx: { appointment: { inDays: 2, minute: 1260, eventId: 'camp3_ambush', label: '堵孟九——北桥检查站' }, goto: 'camp_defeat_p2' } },
      { label: '撑着缆桩站起来', cond: { flag: { 'world.campLastLoss': 'depot' } }, fx: { goto: 'camp_defeat_p2' } }
    ]);

  P('camp_defeat_p2',
    '[npc:qin]老秦[/npc]架着你的胳膊走出码头，天边已经有点发灰。“是我把你带进这局里的。”他在岔路口停下，替你紧了紧外套的领子，“所以你每一次倒下，我都会去把你捞回来——这条记在我账上，比孟九那笔还靠前。”',
    [{ label: '（先回去养伤）', fx: { aff: { qin: 2 }, time: 30 } }]);

  // ==========================================================================
  // 战后世界变体（cond world.butcherFallen:true；butcher_world_1~4 已在
  // worldevents.js 加 butcherFallen:false 门，两组互斥）
  // ==========================================================================

  // ---- 权力真空：散兵游勇抢地盘 ---------------------------------------------
  P('camp_after_1_p',
    '街口那辆屠夫帮的改装皮卡还停在老地方，红布条被人扯了，车斗里两拨人正为半车物资推搡叫骂——没了孟九管账，这座城的烂账改成谁的拳头硬归谁。',
    [
      { label: '轰走他们，东西留下', fx: { combat: 'thug_patrol' } },
      { label: '狗咬狗，绕开', fx: { stat: { sanity: -1 } } }
    ]);
  events.register({
    id: 'camp_after_1', type: 'random', priority: 2, cooldown: 2880, passage: 'camp_after_1_p',
    cond: { anyOf: [{ loc: 'residential' }, { loc: 'market' }], chance: 0.12, flag: { 'world.butcherFallen': true } }
  });

  // ---- 码头易主 -------------------------------------------------------------
  P('camp_after_2_p',
    '码头的封条被撕得干干净净，烧塌的库房前，几个苦力自发把剩下的货分堆过秤，嗓门大得半个江面都听得见——缠红布条的监工没了，他们头一回给自己扛活。有人认出你，往你这边扬了扬手里的秤杆。',
    [{ label: '扬手回礼', fx: { stat: { sanity: 2 }, time: 10 } }]);
  events.register({
    id: 'camp_after_2', type: 'random', priority: 1, cooldown: 2880, passage: 'camp_after_2_p',
    cond: { loc: 'dock', chance: 0.12, flag: { 'world.butcherFallen': true } }
  });

  // ---- 收账队消失后的商户口风 -----------------------------------------------
  P('camp_after_3_p',
    '摊贩们头一回敢把整箱的货摆到门脸外头晒太阳。你路过时，两个摊主正压着嗓子交换新闻：“收账的半个月没露头了，说是那位孟爷栽在北桥……”“栽在谁手里？”“说是个老警察，还带着个帮手。”话头到这儿停了，两双眼睛在你背后跟了很久。',
    [{ label: '只当没听见', fx: { stat: { sanity: 2 } } }]);
  events.register({
    id: 'camp_after_3', type: 'random', priority: 1, cooldown: 2880, passage: 'camp_after_3_p',
    cond: { anyOf: [{ loc: 'market' }, { loc: 'mall' }], chance: 0.12, flag: { 'world.butcherFallen': true } }
  });

  // ---- 孟九旧部残党偶遇 -----------------------------------------------------
  P('camp_after_4_p',
    function () {
      var head = '拐角处撞上两个熟面孔——胳膊上还留着红布条勒出的印子，孟九的旧部。他们也认出了你，手在家伙上按了一按。';
      if (G.engine.getFlag('npc.qin.mengDead')) {
        return head + '按了一按，又松开了。为一个死人拼命不划算，这笔账他们算得很快，可眼睛里那点火没灭干净。';
      }
      if (G.engine.getFlag('npc.qin.mengSpared')) {
        return head + '其中一个朝你努了努嘴，“九爷走前放了话，北桥的账翻篇，谁也不许再提。”话是这么说，两个人退开的步子一直没敢背对你。';
      }
      return head;
    },
    [
      { label: '拔家伙', fx: { combat: 'thug_patrol' } },
      { label: '让开路，各走各的', fx: { stat: { sanity: -1 } } }
    ]);
  events.register({
    id: 'camp_after_4', type: 'random', priority: 2, cooldown: 4320, passage: 'camp_after_4_p',
    cond: { anyOf: [{ loc: 'residential' }, { loc: 'gas' }, { loc: 'mall' }, { loc: 'dock' }], chance: 0.1, flag: { 'world.butcherFallen': true } }
  });

  // ---- fang / zhao / su 一次性搭话变体 --------------------------------------
  P('camp_talk_fang_p',
    '[npc:fang]方哨[/npc]往你手里塞了条烤得焦香的[item]肉干[/item]。“北桥那晚的动静，我在哨位上听了全场。”他难得地把背挺直了些，“那份执勤记录，三个月来头一回派上正经用场——替我谢谢那位秦队长，就说北桥的哨，还有人站着。”',
    [{ label: '收下肉干', fx: { aff: { fang: 2 }, item: { driedmeat: 1 } } }]);
  events.register({
    id: 'camp_talk_fang', type: 'story', npc: 'fang', when: ['talk'], once: true, priority: 3,
    cond: { met: 'fang', flag: { 'world.butcherFallen': true } }, passage: 'camp_talk_fang_p'
  });

  P('camp_talk_zhao_p',
    '[npc:zhao]赵铁[/npc]正拿改锥拆柜台底下一个小铁匣，见你来，把匣子整个拎给你看——里面是空的。“留了三个月的「过路钱」，每周一格，比给闺女上坟还准时。”他把铁匣扔进废品堆，拍了拍手，“往后这格钱，换成给你留的好货。”',
    [{ label: '“这买卖划算。”', fx: { aff: { zhao: 2 } } }]);
  events.register({
    id: 'camp_talk_zhao', type: 'story', npc: 'zhao', when: ['talk'], once: true, priority: 3,
    cond: { met: 'zhao', flag: { 'world.butcherFallen': true } }, passage: 'camp_talk_zhao_p'
  });

  P('camp_talk_su_p',
    '打烊前的空当，[npc:su]苏曼[/npc]难得给自己也倒了一杯，隔着吧台碰了碰你的杯沿。“老秦守这个店三年，夜里睡觉都朝着门。昨晚我头一回听见他打呼。”她抿了一口，眼圈有点红，笑意是真的，“他那笔账没人还得清，可你替他划掉了最重的一行——这杯记我账上。”',
    [{ label: '和她碰杯', fx: { aff: { su: 2 }, stat: { sanity: 3 } } }]);
  events.register({
    id: 'camp_talk_su', type: 'story', npc: 'su', when: ['talk'], once: true, priority: 3,
    cond: { met: 'su', flag: { 'world.butcherFallen': true } }, passage: 'camp_talk_su_p'
  });

  // ---- qin_hunt 收网后停用（覆盖注册加 butcherFallen:false 门；qin.js 未动） --
  events.register({
    id: 'qin_hunt', type: 'story', npc: 'qin', when: ['talk'], once: false, cooldown: 4320, priority: 2,
    cond: {
      anyOf: [{ loc: 'bar', timeRange: [1140, 120] }, { loc: 'police', timeRange: [480, 1020] }],
      stage: { qin: { gte: 4 } }, flag: { 'world.butcherFallen': false }
    },
    passage: 'qin_hunt_p1'
  });

  // ---- qin_hunt2 清理残党循环（接棒 qin_hunt，不再「扫点」） ------------------
  events.register({
    id: 'qin_hunt2', type: 'story', npc: 'qin', when: ['talk'], once: false, cooldown: 4320, priority: 2,
    cond: {
      anyOf: [{ loc: 'bar', timeRange: [1140, 120] }, { loc: 'police', timeRange: [480, 1020] }],
      stage: { qin: { gte: 4 } }, flag: { 'world.butcherFallen': true }
    },
    passage: 'qin_hunt2_p1'
  });

  P('qin_hunt2_p1',
    function () {
      var mid = G.engine.getFlag('npc.qin.mengSpared')
        ? '红圈全划掉了，只剩几个铅笔点的散点。“孟九放出去了，散在城里的旧部得有人看着——别让哪个又攒起一摊。”'
        : '红圈全划掉了，只剩几个铅笔点的散点。“树倒了，猢狲还得散干净——别让哪个又攒起一摊。”';
      return '[npc:qin]老秦[/npc]把烟盒背面那张城区图递给你。' + mid + '他把钢管扛上肩，“清残党，动静小，走一趟？”';
    },
    [
      { label: '跟他去清一处', fx: { time: 60, combat: 'thug_patrol', goto: 'qin_hunt2_p2' } },
      { label: '这两天缓缓再去', fx: {} }
    ]);

  P('qin_hunt2_p2',
    '散点清了，几个不成气候的角色一哄而散。[npc:qin]老秦[/npc]把窝棚里搜出的几发子弹分你一半，在图上把那个铅笔点抹掉——他没说「又近了一步」，这话用不上了，他只拍了拍图，“这座城的账，往后是一笔一笔往回赚的。”',
    [{ label: '收好战利品', fx: { bullets: 6, stat: { energy: -8 }, aff: { qin: 2 }, time: 90 } }]);

})();
