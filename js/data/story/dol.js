/* =============================================================================
 * dol.js — M13 DoL 模式增强（数据层）
 * -----------------------------------------------------------------------------
 * 内容（各项机制说明见 docs/任务书/M13-DoL模式增强.md）：
 *   A. 战败醒来段落 dol_defeat_p1/p2 —— combat.js 的人类敌人战败路由指向这里；
 *      机制（洗劫/重伤/昏迷 3 小时）在引擎侧结算，这里只管文本，读易失的
 *      s._defeatLoss 列损失清单（存读档后丢失则退化为通用文案，无副作用）。
 *   B. 打工系统 —— 三份工，scheduled 事件每日至多询一次（进场/整点触发）：
 *        dol_job_su  酒吧帮工（su 好感≥20，18–21 点开工，3 小时 → 3 子弹，周六偶发酒客闹事）
 *        dol_job_lin 医院助手（lin 好感≥40，8–14 点开工，4 小时 → 4 子弹+绷带，周三偶发伤员，
 *                    有 bandage 技能时有高收益处置选项）
 *        dol_job_cai 码头搬运（识得老蔡即可，8–15 点开工，4 小时 → 5 子弹，精力大耗，
 *                    周四偶发走私箱、周日偶发浮尸（尸潮前兆）见闻）
 *      收益基线：子弹时薪 1–1.25，低于中期搜刮折算期望（M13 自测报告），打工是兜底不是最优解。
 *   C. 人类遇敌非战斗脱身的共享结局段 —— 色诱/贿赂/虚张声势 三条路的成功与失败段。
 *      入口选项加在 locations.js（enc_police_1_p / enc_checkpoint_1_p）与
 *      worldevents.js（enc_gas_2_p / enc_mall_2_p / butcher_world_1_p），
 *      用 fx.roll（M13 引擎扩展）掷成功率，失败落战斗。全部只对成年人类敌人、全部玩家主动选择。
 *   D. NPC 主动邀约 —— 好感≥60（主线八人另需信任阶段）的 NPC 按作息随机发起约会：
 *        dol_invite_{id}（random，chance .15 / cd 4320，datePending 防重复登记）
 *        → 答应则登日历 appointment（次日定点，eventId 强制触发 dol_date_{id}）
 *        → 到点在场=赴约小剧情（好感+4/理智收益），不在场=爽约（好感-3）。
 *      拒绝邀约不扣好感；两条出口都清 npc.{id}.datePending。
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  var story = G.data.story, events = G.data.events;

  function P(id, text, choices) { story.register({ id: id, text: text, choices: choices }); }
  function EV(ev) { events.register(ev); }
  function obj(k, v) { var o = {}; o[k] = v; return o; }

  var LOCS = ['home', 'residential', 'market', 'hospital', 'police', 'bar', 'campus', 'metro',
              'park', 'gas', 'mall', 'church', 'dock', 'checkpoint', 'sewer'];
  // 「不在某地」条件：cond DSL 无否定，用其余 14 地点的 anyOf 表达
  function notAt(loc) {
    return { anyOf: LOCS.filter(function (l) { return l !== loc; }).map(function (l) { return { loc: l }; }) };
  }

  // ==========================================================================
  // A. 战败醒来（人类敌人战败非死亡，机制见 combat.js humanDefeat）
  // ==========================================================================

  P('dol_defeat_p1', function (s) {
    var loss = s._defeatLoss, parts = [];
    if (loss) {
      if (loss.bullets > 0) parts.push('子弹×' + loss.bullets);
      (loss.items || []).forEach(function (it) { parts.push(it.name + '×' + it.count); });
    }
    var lossStr = parts.length
      ? '口袋全被翻了面，少掉的东西数得出来：[item]' + parts.join('、') + '[/item]。'
      : '口袋全被翻了面，他们没搜出几样值钱的，临走啐了一口。';
    if ((s.world.flags.thugDefeats || 0) <= 1) {
      return '疼把你砸醒。你趴在冰冷的地上，嘴里都是铁锈味，[blood]肋骨[/blood]随着呼吸一抽一抽地扯着疼，' + lossStr +
        '几个钟头就这么没了，他们留了你一条命——大概是懒得为一个搜空的口袋收尸。';
    }
    return '又是这种熟悉的疼法。你在挨过闷棍的钝痛里醒过来，' + lossStr +
      '躺在地上的这几个钟头，风把街上的灰吹进了你的领口。';
  }, [
    { label: '撑着地面爬起来', fx: { goto: 'dol_defeat_p2' } }
  ]);

  P('dol_defeat_p2', function (s) {
    var w = s.player.weapon
      ? '武器还别在你手边——他们只挑换得了子弹的东西，破铜烂铁懒得收。'
      : '你摸遍全身，浑身上下就剩一口没断的气。';
    return '你扶着墙根站起来，每一步都扯着伤处，好在腿还听使唤。' + w +
      '先找个安稳地方把伤养住，这笔账，你记下了。';
  }, [
    { label: '拖着伤离开', fx: {} }
  ]);

  // ==========================================================================
  // B. 打工系统
  // ==========================================================================

  // ---- 酒吧帮工（su） -------------------------------------------------------
  P('dol_job_su_offer_p', function () {
    if (!G.engine.getFlag('jobs.suDone')) {
      return '[npc:su]苏曼[/npc]把一块抹布抛过来，朝吧台后努了努嘴："今晚缺个搭手的，收杯子、搬酒、盯着点场子，干满三个钟头，三发[item]子弹[/item]，后厨的水管够你喝。"';
    }
    return '[npc:su]苏曼[/npc]朝你扬了扬下巴，往吧台后让开半个身位——还是那份工，三发子弹，水管够。';
  }, [
    { label: '留下帮工（3小时·3发子弹）', fx: { time: 180, stat: { energy: -12, thirst: 8 }, bullets: 3, aff: { su: 1 }, flag: { 'jobs.suDone': true }, goto: 'dol_job_su_end_p' } },
    { label: '今晚另有安排', fx: {} }
  ]);

  P('dol_job_su_end_p', function (s) {
    var base = '三个钟头里你收了几十只杯子，替苏曼挡了两回自来熟的醉话，掌心被托盘勒出一道红印。她把三发[item]子弹[/item]拍进你手心，一发不少。';
    if (s.player.day % 7 === 5) {
      return base + '打烊前，靠门那桌起了争执，一个喝高的把凳子掀翻，正冲着邻桌撸袖子。';
    }
    return base;
  }, [
    { label: '把闹事的架出去', cond: { weekday: 5 }, fx: { aff: { su: 2 }, bullets: 1, stat: { energy: -5 }, goto: 'dol_job_su_x_p' } },
    { label: '收工', fx: {} }
  ]);

  P('dol_job_su_x_p', '你从背后架住那醉汉的胳膊往门外送，他骂骂咧咧，到底没敢真抡拳头。[npc:su]苏曼[/npc]看着你把人放到街沿上，多塞给你一发子弹："今晚这杯，算店里请。"', [
    { label: '收工', fx: {} }
  ]);

  EV({ id: 'dol_job_su', type: 'scheduled', priority: 3,
       cond: { loc: 'bar', timeRange: [1080, 1260], aff: { su: { gte: 20 } } },
       passage: 'dol_job_su_offer_p' });

  // ---- 医院助手（lin） ------------------------------------------------------
  P('dol_job_lin_offer_p', function () {
    if (!G.engine.getFlag('jobs.linDone')) {
      return '[npc:lin]林晚[/npc]从一摞没登记的药箱后面抬起头："搭把手，理药、烧水、按住不老实的病人，四个小时，四发子弹，再饶你一卷[item]绷带[/item]。"';
    }
    return '[npc:lin]林晚[/npc]把登记本朝你推过来，笔搁在本子上——老价钱，四发子弹加一卷绷带。';
  }, [
    { label: '留下帮忙（4小时·4发子弹+绷带）', fx: { time: 240, stat: { energy: -15 }, bullets: 4, item: { bandage: 1 }, aff: { lin: 1 }, flag: { 'jobs.linDone': true }, goto: 'dol_job_lin_end_p' } },
    { label: '今天帮不上', fx: {} }
  ]);

  P('dol_job_lin_end_p', function (s) {
    var base = '四个小时下来，你把三层药柜理出了次序，指缝里全是药粉和消毒液的味道。林晚验过活，把四发[item]子弹[/item]和一卷绷带放在台面上。';
    if (s.player.day % 7 === 2) {
      return base + '你正要走，急诊的门被撞开，两个幸存者抬进来一个腿上淌血的，[blood]血[/blood]在地砖上拖出一条线。';
    }
    return base;
  }, [
    { label: '照林晚教的手法上手处理（包扎术）', cond: { weekday: 2, skill: 'bandage' }, fx: { aff: { lin: 3 }, stat: { sanity: 2 }, item: { bandage: 1 }, time: 20, goto: 'dol_job_lin_x_p' } },
    { label: '上去搭把手按住伤员', cond: { weekday: 2 }, fx: { aff: { lin: 2 }, stat: { sanity: -2 }, time: 20, goto: 'dol_job_lin_x_p' } },
    { label: '收工', fx: {} }
  ]);

  P('dol_job_lin_x_p', '血止住的时候，伤员的骂声弱下去，变成一串含混的道谢。[npc:lin]林晚[/npc]收拾着器械抬头看了你一眼："手没抖，不错。"', [
    { label: '收工', fx: {} }
  ]);

  EV({ id: 'dol_job_lin', type: 'scheduled', priority: 3,
       cond: { loc: 'hospital', timeRange: [480, 840], aff: { lin: { gte: 40 } } },
       passage: 'dol_job_lin_offer_p' });

  // ---- 码头搬运（cai 牵线，无好感门槛） --------------------------------------
  P('dol_job_cai_offer_p', function () {
    if (!G.engine.getFlag('jobs.caiDone')) {
      return '[npc:cai]老蔡[/npc]朝泊位那头扬扬下巴——一条驳船正在卸货，船主叉着腰嫌人手慢。"力气活，四个钟头五发子弹，"老蔡搓着手，"他们只收我介绍的人。"';
    }
    return '驳船又靠岸了，[npc:cai]老蔡[/npc]拿眼睛问你：还是那个价，四个钟头五发子弹，纯力气活。';
  }, [
    { label: '上工搬货（4小时·5发子弹·重体力）', fx: { time: 240, stat: { energy: -28, hunger: -6 }, bullets: 5, aff: { cai: 1 }, flag: { 'jobs.caiDone': true }, goto: 'dol_job_cai_end_p' } },
    { label: '这份力气钱不挣了', fx: {} }
  ]);

  P('dol_job_cai_end_p', function (s) {
    var base = '整整四个钟头，你在跳板上来回，麻袋和木箱把肩膀压出两道沟，收工时胳膊几乎抬不起来。船主点出五发[item]子弹[/item]，一颗颗按进你掌心。';
    var wd = s.player.day % 7;
    if (wd === 3) return base + '最后一批箱子贴着封条，压手得反常，船主盯着你把它码进舱底，眼神不许人多看。';
    if (wd === 6) return base + '歇气的空当你望了一眼江面——上游漂下来的浮尸比往常密，一具连着一具，顺流往下游去。';
    return base;
  }, [
    { label: '记下封条上的记号', cond: { weekday: 3 }, fx: { stat: { sanity: -1 } } },
    { label: '数一数漂过去的浮尸', cond: { weekday: 6 }, fx: { stat: { sanity: -3 } } },
    { label: '收工', fx: {} }
  ]);

  EV({ id: 'dol_job_cai', type: 'scheduled', priority: 3,
       cond: { loc: 'dock', timeRange: [480, 900], met: 'cai' },
       passage: 'dol_job_cai_offer_p' });

  // ==========================================================================
  // C. 非战斗脱身的共享结局段（入口选项在 locations.js / worldevents.js 的人类遇敌 passage）
  // ==========================================================================

  P('dol_charm_ok_p', function (s) {
    var open = s.player.gender === 'f'
      ? '你松开半颗领扣凑近一步，指尖在为首那人的小臂上一划，声音放软："几位大哥犯不上为难我一个女人——改天我亲自登门请回来，好不好？"'
      : '你凑近一步，笑得放浪，指节在为首那人胸口轻轻一敲："哥几个绷这么紧做什么，兄弟识相得很，改天备份厚礼登门赔罪。"';
    return open + '他上下打量你，喉结动了动，身后有人吹了声口哨，围拢的架势松出一道缝。';
  }, [
    { label: '贴着那道缝滑出去', fx: { time: 10, stat: { sanity: -2 } } }
  ]);

  P('dol_bribe_ok_p', '为首的把八发子弹倒进掌心数了两遍，拿牙咬了咬其中一发，朝旁边偏了偏头。包围圈让出一个人宽的口子，没人再看你。', [
    { label: '不紧不慢地走出去', fx: { time: 5 } }
  ]);

  P('dol_bluff_ok_p', '你把灰猫教的那套黑话原样撂出去——走的哪条线、押的谁的货、报的哪个堂口。为首的和同伴对了个眼色，语气缓下来："道上的朋友，早说。"他们收了家伙，退开两步。', [
    { label: '点点头，从容离开', fx: { time: 5, stat: { sanity: 2 } } }
  ]);

  P('dol_talk_fail_patrol_p', '为首的脸沉下来，往地上啐了一口："跟爷们儿耍花腔？"旁边那个立刻抄家伙贴上来，两人一左一右，退路合死了。', [
    { label: '抄家伙迎战', fx: { combat: 'thug_patrol' } }
  ]);

  P('dol_talk_fail_squad_p', '领头的大块头笑出一声，把家伙往肩上一扛："嘴皮子留着求饶的时候用吧。"他和同伙一前一后堵死了路。', [
    { label: '抄家伙迎战', fx: { combat: 'thug_squad' } }
  ]);

  P('dol_bribe_fail_patrol_p', '子弹被照单收走，让路的话却没人兑现。"孟爷说了，肥羊得挤到最后一滴。"他们掂着刚到手的子弹围了上来。', [
    { label: '抄家伙迎战', fx: { combat: 'thug_patrol' } }
  ]);

  P('dol_bribe_fail_squad_p', '大块头把八发子弹揣进兜里，脸上的笑没动："买路钱收下了，人再留下点别的。"包围圈反而收紧了。', [
    { label: '抄家伙迎战', fx: { combat: 'thug_squad' } }
  ]);

  // ==========================================================================
  // D. NPC 主动邀约（好感≥60；主线八人另需信任阶段，chen/cai 无阶段线不设）
  // ==========================================================================

  var DATES = [
    {
      id: 'qin', meetLoc: 'bar', minute: 1200, stageMin: 2,
      inviteCond: { loc: 'bar', timeRange: [1140, 1439] },
      apLabel: '晚8点 和老秦在酒吧喝一杯',
      inviteText: '[npc:qin]老秦[/npc]擦着枪，头也不抬："明晚八点，过来。上夜前想跟你喝一杯，就一杯。"',
      acceptLabel: '"明晚八点，我到。"', declineLabel: '"改天，这两天腾不开身。"',
      sceneText: '老秦把两只搪瓷缸倒满，跟你碰了一下，酒液晃出一圈纹。他话照旧不多，几杯下去，才说起当刑警头一年蹲守冻掉半边耳朵尖的事，说到一半自己先笑了——你头一回见他笑得这么松。',
      sceneLabel: '陪他把这一杯喝完', sceneFx: { aff: { qin: 4 }, stat: { sanity: 5, alcohol: 8 }, time: 90, flag: { 'npc.qin.datePending': false } },
      missText: '你想起老秦的酒还在酒吧凉着——约的是今晚八点，你没去。',
      missFx: { aff: { qin: -3 }, flag: { 'npc.qin.datePending': false } }
    },
    {
      id: 'lin', meetLoc: 'hospital', minute: 1260, stageMin: 2,
      inviteCond: { loc: 'hospital', timeRange: [540, 1320] },
      apLabel: '晚9点 医院天台喝茶',
      inviteText: '[npc:lin]林晚[/npc]在洗手池边褪下手套，像交代医嘱一样交代你："明晚九点，天台。我存着半罐真的茶叶，一个人喝浪费。"',
      acceptLabel: '"明晚九点，天台见。"', declineLabel: '"最近抽不开身，改天。"',
      sceneText: '天台的风把消毒水味吹散了，林晚裹着白大褂靠在水箱边，搪瓷缸里的[item]热茶[/item]冒着细细的白汽。她陪你数楼下还亮着烛火的窗口，数到第七个的时候说，今天医院没死人，这茶就当庆功。',
      sceneLabel: '陪她把这缸茶喝到底', sceneFx: { aff: { lin: 4 }, stat: { sanity: 6, thirst: 10 }, time: 60, flag: { 'npc.lin.datePending': false } },
      missText: '你想起林晚在天台上等的那缸茶——早过了九点，茶该凉透了。',
      missFx: { aff: { lin: -3 }, flag: { 'npc.lin.datePending': false } }
    },
    {
      id: 'mao', meetLoc: 'dock', minute: 1320, stageMin: 2,
      inviteCond: { loc: 'sewer', timeRange: [480, 1439] },
      apLabel: '晚10点 码头老泊位',
      inviteText: '[npc:mao]灰猫[/npc]用指节敲了敲管壁："明晚十点，码头老泊位。带你看样东西——不卖钱的那种，我很少做亏本生意。"',
      acceptLabel: '"不卖钱的东西才贵，我去。"', declineLabel: '"我对亏本生意没兴趣。"',
      sceneText: '灰猫把你带到最外侧的缆桩上坐下，朝江对岸抬了抬下巴。雾里有一星灯火忽明忽暗，像有人在守着它添油。"对岸还有活人，"她说，"这条情报免费——因为没人买，也没人信。"江风把她的发梢吹到你肩上，她没有躲。',
      sceneLabel: '陪她看到那盏灯熄掉', sceneFx: { aff: { mao: 4 }, stat: { sanity: 6 }, time: 60, flag: { 'npc.mao.datePending': false } },
      missText: '你想起灰猫约在码头老泊位的十点——她等不等得起，你没去看。',
      missFx: { aff: { mao: -3 }, flag: { 'npc.mao.datePending': false } }
    },
    {
      id: 'su', meetLoc: 'bar', minute: 1260, stageMin: 2,
      inviteCond: { loc: 'bar', timeRange: [720, 1439] },
      apLabel: '晚9点 酒吧喝一瓶不卖的',
      inviteText: '[npc:su]苏曼[/npc]擦着一只杯子，隔着吧台看你："明晚九点来，赶在人多前——我开一瓶架子上不卖的，就两杯的量。"',
      acceptLabel: '"不卖的才想尝，明晚见。"', declineLabel: '"这两天走不开，留着别开。"',
      sceneText: '九点的酒吧只有零星几个熟客，苏曼把一瓶落灰的[item]陈酿[/item]起开，两只杯子推到你面前的吧台上。她给自己也倒了小半杯，跟你碰杯的时候压低声音："这瓶酒等一个喝得懂的人，等了很久。"酒液滑过喉咙，是烧过之后回甘的暖。',
      sceneLabel: '陪她把这两杯喝完', sceneFx: { aff: { su: 4 }, stat: { sanity: 5, alcohol: 10 }, time: 90, flag: { 'npc.su.datePending': false } },
      missText: '你想起苏曼说过要开那瓶不卖的酒——过了九点，瓶塞大概没起。',
      missFx: { aff: { su: -3 }, flag: { 'npc.su.datePending': false } }
    },
    {
      id: 'dou', meetLoc: 'gas', minute: 1260, stageMin: 2,
      inviteCond: { loc: 'gas', timeRange: [480, 1320] },
      apLabel: '晚9点 加油站棚顶看星星',
      inviteText: '[npc:dou]阿豆[/npc]从车底滑出来，眼睛亮得反常："明晚九点，棚顶。我拆了副望远镜片重新磨过——现在没有光污染，星星多得吓人，比什么药都带劲。"',
      acceptLabel: '"九点，棚顶见。"', declineLabel: '"下回吧，最近不敢爬高。"',
      sceneText: '棚顶的铁皮还存着白天的余温，阿豆把磨好的镜片架在一截钢管上，调了三次角度才让开位置。镜片里的星河密得不像真的，他趴在旁边一颗颗报星座的名字，报错了也不在乎，手比修车的时候还稳。',
      sceneLabel: '陪他看完这片星河', sceneFx: { aff: { dou: 4 }, stat: { sanity: 6 }, time: 60, flag: { 'npc.dou.datePending': false } },
      missText: '你想起阿豆架在棚顶的那副镜片——九点早过了，星星不等人。',
      missFx: { aff: { dou: -3 }, flag: { 'npc.dou.datePending': false } }
    },
    {
      id: 'zhou', meetLoc: 'campus', minute: 960, stageMin: 2,
      inviteCond: { loc: 'campus', timeRange: [480, 1080] },
      apLabel: '下午4点 广播站听样东西',
      inviteText: '[npc:zhou]周响[/npc]把耳机挂回脖子上："明天下午四点来广播站，给你听点东西——没播出去的那部分，只放给你一个人。"',
      acceptLabel: '"四点，我准时到。"', declineLabel: '"改天吧，明天有安排。"',
      sceneText: '周响让你戴上耳机，按下一台老录音机的播放键。里面是她攒下的声音：雨点砸在天线上的闷响、菜市场旧录音里的吆喝、一段孩子追着狗跑的笑。"电台放的是给全城的，"她把音量旋钮拧大一格，"这盘是给我自己的，今天分你一半。"',
      sceneLabel: '把这盘带子听到底', sceneFx: { aff: { zhou: 4 }, stat: { sanity: 6 }, time: 60, flag: { 'npc.zhou.datePending': false } },
      missText: '你想起周响留在广播站的那盘带子——约的下午四点，你没去听。',
      missFx: { aff: { zhou: -3 }, flag: { 'npc.zhou.datePending': false } }
    },
    {
      id: 'zhao', meetLoc: 'market', minute: 1140, stageMin: 2,
      inviteCond: { loc: 'market', timeRange: [480, 1200] },
      apLabel: '晚7点 超市后屋喝口热的',
      inviteText: '[npc:zhao]赵铁[/npc]拨完最后一排算盘珠，难得没谈生意："明晚七点，打烊前来后屋。盘完账煮一锅热的，你要不嫌弃，添双筷子。"',
      acceptLabel: '"热乎的可不敢嫌弃，七点到。"', declineLabel: '"心领了，这两天赶路。"',
      sceneText: '后屋的小煤炉上坐着一口锅，米汤滚出细密的泡。赵铁给你盛了满满一碗，自己端着半碗，就着算盘声慢慢喝。他说起爆发前进货被骗的旧事，骂到一半自己乐了："那时候亏的是钱，现在想想，亏得起钱的日子才叫日子。"',
      sceneLabel: '陪他喝完这锅热汤', sceneFx: { aff: { zhao: 4 }, stat: { sanity: 4, hunger: 12 }, time: 60, flag: { 'npc.zhao.datePending': false } },
      missText: '你想起赵铁后屋那锅热汤——约的七点，火早该熄了。',
      missFx: { aff: { zhao: -3 }, flag: { 'npc.zhao.datePending': false } }
    },
    {
      id: 'chen', meetLoc: 'church', minute: 1200, stageMin: 0,
      inviteCond: { loc: 'church', timeRange: [360, 1320] },
      apLabel: '晚8点 教堂炉边坐坐',
      inviteText: '[npc:chen]陈神父[/npc]拢了拢烛台上的火："明晚八点，晚祷之后炉子还热着，来坐坐。不必祷告，坐着就好。"',
      acceptLabel: '"好，明晚八点。"', declineLabel: '"心领了，神父。"',
      sceneText: '炉火把长椅的影子拉得很长，陈神父给你留了靠火的位置，慢慢说起白天的事：谁家的孩子退了烧，谁又在名册上添了名字。他不劝你信什么，只是在你开口时安静地听，炉膛里的柴偶尔哔剥响一声。',
      sceneLabel: '在炉边坐到火弱下去', sceneFx: { aff: { chen: 4 }, stat: { sanity: 8 }, time: 60, flag: { 'npc.chen.datePending': false } },
      missText: '你想起陈神父炉边留的那个位置——晚祷早散了，你没去。',
      missFx: { aff: { chen: -3 }, flag: { 'npc.chen.datePending': false } }
    },
    {
      id: 'cai', meetLoc: 'dock', minute: 1140, stageMin: 0,
      inviteCond: { loc: 'dock', timeRange: [480, 1320] },
      apLabel: '晚7点 陪老蔡守船',
      inviteText: '[npc:cai]老蔡[/npc]扯住你的袖子，眼睛难得清亮："明儿傍晚七点，潮水好，陪老蔡守会儿船。船快来了，得有人作证。"',
      acceptLabel: '"行，七点我来作证。"', declineLabel: '"明天不行，下回一定。"',
      sceneText: '落日把江面烧成一条金红的带子，老蔡在缆桩上坐得笔直，像真在等一班船靠岸。他分你半条烤得焦黑的鱼，指给你看航道、浮标、船该停的泊位，说得一板一眼——这一刻他不像疯子，像个老到不能再老的水手。',
      sceneLabel: '陪他守到天黑透', sceneFx: { aff: { cai: 4 }, stat: { sanity: 5, hunger: 6 }, time: 60, flag: { 'npc.cai.datePending': false } },
      missText: '你想起老蔡说潮水好的那个傍晚——他等的船没来，等的人也没来。',
      missFx: { aff: { cai: -3 }, flag: { 'npc.cai.datePending': false } }
    },
    {
      id: 'fang', meetLoc: 'checkpoint', minute: 1260, stageMin: 2,
      inviteCond: { loc: 'checkpoint', timeRange: [600, 1439] },
      apLabel: '晚9点 陪方哨守一班夜哨',
      inviteText: '[npc:fang]方哨[/npc]抱着枪，视线在你和路障之间来回："明晚九点……要是没事，来陪我守一班。有人搭话，枪、枪就不抖。"',
      acceptLabel: '"九点，我来跟你搭班。"', declineLabel: '"明晚不行，你自己当心。"',
      sceneText: '哨位上只有风声和你们两个人的呼吸。方哨把瞄具卸下来给你，教你借着星光认远处的轮廓：那是水塔，那是桥墩，那截黑的是翻掉的军车。说到第三样的时候，他的话头顺了，肩膀也松了——这一班岗，他的枪口一直稳稳朝着地面。',
      sceneLabel: '陪他把这班岗站完', sceneFx: { aff: { fang: 4 }, stat: { sanity: 4 }, time: 90, flag: { 'npc.fang.datePending': false } },
      missText: '你想起方哨约的那班夜哨——九点过了，哨位上还是他一个人。',
      missFx: { aff: { fang: -3 }, flag: { 'npc.fang.datePending': false } }
    }
  ];

  DATES.forEach(function (d) {
    var pend = 'npc.' + d.id + '.datePending';

    // 邀约段
    P('dol_invite_' + d.id + '_p', d.inviteText, [
      { label: d.acceptLabel, fx: {
          aff: obj(d.id, 1), flag: obj(pend, true),
          appointment: { inDays: 1, minute: d.minute, label: d.apLabel, eventId: 'dol_date_' + d.id }
        } },
      { label: d.declineLabel, fx: {} }
    ]);

    // 赴约/爽约段（appointment 到期强制触发，text 按在场与否分支）
    P('dol_date_' + d.id + '_p', function (s) {
      return s.player.location === d.meetLoc ? d.sceneText : d.missText;
    }, [
      { label: d.sceneLabel, cond: { loc: d.meetLoc }, fx: d.sceneFx },
      { label: '（你爽约了）', cond: notAt(d.meetLoc), fx: d.missFx }
    ]);

    // 邀约事件：好感≥60（+各自的作息/地点条件），datePending 期间不重复邀
    var cond = { aff: obj(d.id, { gte: 60 }), chance: 0.15, flag: obj(pend, false) };
    for (var k in d.inviteCond) cond[k] = d.inviteCond[k];
    if (d.stageMin > 0) {
      cond.stage = cond.stage || {};
      cond.stage[d.id] = cond.stage[d.id] || { gte: d.stageMin };
    }
    EV({ id: 'dol_invite_' + d.id, type: 'random', priority: 2, cooldown: 4320,
         cond: cond, passage: 'dol_invite_' + d.id + '_p' });

    // 约会事件：不进常规池，只被日历 eventId 强制触发
    EV({ id: 'dol_date_' + d.id, type: 'story', when: [], passage: 'dol_date_' + d.id + '_p' });
  });

})();
