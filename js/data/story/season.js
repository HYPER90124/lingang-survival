/* =============================================================================
 * season.js — M15 入冬季节事件（数据层）
 * -----------------------------------------------------------------------------
 * 机制（季节档/寒冷值/水源联动/丧尸减速/商店涨价）在引擎侧（time.js 季节与寒冷、
 * combat.js 减速、state.js season cond）与数据侧（locations.js 破冰/接雪/生火、
 * trade.js 涨价上新、items.js 柴火）实现；本文件只做「季节文本层」：
 *
 *   1. 寒潮预警链（仿 M8 尸潮夜 appointment 写法）：coldsnap_warn 预警 → 次日定点
 *      coldsnap_start 强制开场（写 world.coldSnap，室外寒冷 +TUNE.coldSnapSurge）→
 *      次日 coldsnap_end 收尾清旗。只在冬季（season winter）出现。
 *   2. 雪天氛围池 snow_amb_1~7（冬季·室外，纯氛围/少量数值）。
 *   3. 冻毙的流浪者 frozen_wanderer_1~3（冬季·室外，拾取遗物衣物的道德小分支：
 *      取暖 vs 留全尸，各给不同数值取向）。为控体量做成「共享池」跨室外地点触发，
 *      而非逐地点各写 2–3 条——与 M8 世界事件同样的共享池取舍（见 PLAN.md M15 备注）。
 *
 * 世界 flag（本模块自管）：world.coldSnapAlert（预警中）/ world.coldSnap（寒潮进行中）
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  var story = G.data.story, events = G.data.events;

  function P(id, text, choices) { story.register({ id: id, text: text, choices: choices }); }
  function ev(id, cond, cooldown, passageId, priority, when) {
    var e = { id: id, type: 'random', cond: cond, cooldown: cooldown, passage: passageId };
    if (priority != null) e.priority = priority;
    if (when) e.when = when;
    events.register(e);
  }
  var NIGHT = [1200, 300];
  // 室外地点（室内安全区 home/bar/church 除外），供雪天/流浪者共享池 anyOf
  var OUTDOOR = { anyOf: [
    { loc: 'residential' }, { loc: 'market' }, { loc: 'hospital' }, { loc: 'police' },
    { loc: 'campus' }, { loc: 'metro' }, { loc: 'park' }, { loc: 'gas' },
    { loc: 'mall' }, { loc: 'dock' }, { loc: 'checkpoint' }, { loc: 'sewer' }
  ] };
  function outdoor(extra) {
    var c = { anyOf: OUTDOOR.anyOf };
    for (var k in extra) c[k] = extra[k];
    return c;
  }

  // ==========================================================================
  // 1. 寒潮预警链
  // ==========================================================================
  events.register({
    id: 'coldsnap_warn', type: 'random', when: ['tick', 'enter'], priority: 5, cooldown: 8640,
    cond: { season: 'winter', timeRange: [1020, 1380], chance: 0.09,
            flag: { 'world.coldSnap': false, 'world.coldSnapAlert': false } },
    passage: 'coldsnap_warn_p1'
  });

  P('coldsnap_warn_p1',
    function (s) {
      if (s.npcs.zhou && s.npcs.zhou.met) {
        return '收音机里插进一段加播，周响的声音压得很沉：“再报一次寒潮预警——今夜起北方强冷空气过境，最低温度骤降，务必备足柴火、糊严门窗，非必要不要出门。冻死人的天气，不是吓唬你们。”';
      }
      if (s.npcs.cai && s.npcs.cai.met) {
        return '老蔡蹲在码头边闻了闻风，忽然扭头冲你喊：“要变天了！这风带着刀子味——今晚起寒潮，屋里囤柴，江面明后天就得封冰。”说完又缩回他那堆破棉絮里。';
      }
      return '街角几个人围着一台半导体收音机，脸色都不好看：预报说今夜起寒潮过境，气温断崖式往下掉。人群很快散了，各自回去抱柴、堵窗——这年头，冻比饿来得更快。';
    },
    [{ label: '囤柴、糊窗，准备熬这一场', fx: {
        flag: { 'world.coldSnapAlert': true },
        appointment: { inDays: 1, minute: 300, label: '寒潮过境（囤柴/保暖）', eventId: 'coldsnap_start' },
        stat: { sanity: -2 } } }]);

  // 开场（仅由日历 eventId 强制触发；when:[] 不入常规池）
  events.register({ id: 'coldsnap_start', type: 'story', when: [], once: false, priority: 8, passage: 'coldsnap_start_p1' });

  P('coldsnap_start_p1',
    function (s) {
      if (!G.engine.getFlag('world.coldSnap')) {
        G.engine.setFlag('world.coldSnap', true);
        G.engine.setFlag('world.coldSnapAlert', false);
        var p = s.player;
        // 次日 20:00 由日历强制收尾（睡眠/挂机跨点也能结算）
        s.calendar.appointments.push({ day: p.day + 1, minute: 1200, label: '寒潮消退', eventId: 'coldsnap_end', done: false });
      }
      var loc = s.player.location;
      if (loc === 'home' || loc === 'bar' || loc === 'church') {
        return '寒潮在夜里落了地。风声陡然拔高，撞得门窗嗡嗡作响，屋里的温度肉眼可见地往下坠——你把能盖的都堆到身上，凑近那点火，听着外头天地被冻得咔咔作响。今夜，外头是要人命的。';
      }
      return '寒潮说来就来。风向一转，气温像被人抽掉了底，呼吸间鼻腔都在刺痛，睫毛上很快结了霜。你能听见远处水管冻裂的闷响——这种天在外头待久了，人会像根冰棍一样悄无声息地停下。';
    },
    [{ label: '（熬过这场寒潮）', fx: { stat: { sanity: -3 }, milestone: '寒潮夜' } }]);

  // 收尾（仅由日历 eventId 强制触发）
  events.register({ id: 'coldsnap_end', type: 'story', when: [], once: false, priority: 8, passage: 'coldsnap_end_p1' });

  P('coldsnap_end_p1',
    '风终于软了下来。太阳出来时，屋檐下挂起一排冰棱，滴水的声音久违地响起。最冷的那一截过去了——冻裂的水管、缩在墙角没能熬过去的人，都留给白天去清点。你搓了搓僵硬的手指，活了过来。',
    [{ label: '（缓过来了）', fx: { flag: { 'world.coldSnap': false }, stat: { sanity: 3 } } }]);

  // ==========================================================================
  // 2. 雪天氛围池（冬季·室外）
  // ==========================================================================
  P('snow_amb_1_p', '雪不知什么时候下了起来，一片片压着灰败的街道，把弹壳、血迹和拖行的爪痕都盖成了同一种白。有那么一瞬间，这座城安静得像是从没死过。', [
    { label: '站在雪里看了一会儿', fx: { stat: { sanity: 3 }, time: 10 } },
    { label: '缩紧脖子赶路', fx: { stat: { cold: 3 } } }
  ]);
  ev('snow_amb_1', outdoor({ season: 'winter', chance: 0.15 }), 360, 'snow_amb_1_p', 1);

  P('snow_amb_2_p', '雪地上一串脚印通向远方，深一脚浅一脚，走得很慢——走的人显然拖着伤，或是拖着放不下的东西。脚印尽头是什么，你没有跟过去。', [
    { label: '（愿他走到了想去的地方）', fx: { stat: { sanity: 1 } } }
  ]);
  ev('snow_amb_2', outdoor({ season: 'winter', chance: 0.12 }), 480, 'snow_amb_2_p', 1);

  P('snow_amb_3_p', '一只麻雀冻僵在窗台的雪堆里，羽毛还蓬着，像只是睡着了。这样的冬天，连活得最不起眼的东西也熬不住。', [
    { label: '把它埋进雪里', fx: { stat: { sanity: 2 }, time: 10 } },
    { label: '移开视线走开', fx: { stat: { sanity: -1 } } }
  ]);
  ev('snow_amb_3', outdoor({ season: 'winter', chance: 0.12 }), 480, 'snow_amb_3_p', 1);

  P('snow_amb_4_p', '呵出的白气刚离开嘴唇就散了。你搓着手，忽然想起从前这种天该是围炉、烫酒、窝在被子里刷手机的日子——那些暖和的念头此刻反倒让人更冷。', [
    { label: '甩掉这点念想', fx: { stat: { sanity: -2 } } },
    { label: '算了，还活着就好', fx: { stat: { sanity: 2 } } }
  ]);
  ev('snow_amb_4', outdoor({ season: 'winter', chance: 0.1 }), 600, 'snow_amb_4_p', 1);

  P('snow_amb_5_p', '积雪压塌了一处棚顶，闷响过后，整条街的死人都朝这边偏了偏头，又缓缓垂下——它们在雪里迟钝得像慢放的影子，你却半天暖不过来。冬天是敌弱，我更弱。', [
    { label: '趁它们发懵绕开', fx: { stat: { energy: -3 }, time: 10 } }
  ]);
  ev('snow_amb_5', outdoor({ season: 'winter', chance: 0.1 }), 600, 'snow_amb_5_p', 1);

  P('snow_amb_6_p', '深冬的夜里，天冷得连星子都显得锋利。远处某扇窗透出一点橘黄的火光，像这片死寂里唯一还跳动的东西。你盯着那点光，脚步不由得快了些。', [
    { label: '朝着有火光的方向走', fx: { stat: { sanity: 2, cold: 2 } } }
  ]);
  ev('snow_amb_6', outdoor({ season: 'deepwinter', timeRange: NIGHT, chance: 0.14 }), 420, 'snow_amb_6_p', 1);

  P('snow_amb_7_p', '风卷着雪粒抽在脸上，生疼。你把围在脸上的布又拉高一截，睫毛上的霜化了又结。这种风里，保暖的衣裳不是讲究，是命。', [
    { label: '（低头顶着风走）', fx: { stat: { cold: 4, energy: -2 } } }
  ]);
  ev('snow_amb_7', outdoor({ season: 'deepwinter', chance: 0.12 }), 480, 'snow_amb_7_p', 1);

  // ==========================================================================
  // 3. 冻毙的流浪者（冬季·室外，拾取衣物的道德小分支）
  // ==========================================================================
  // 三条变体各给一件保暖衣物：取 → 保暖但理智略损；留 → 理智略增。共享池跨室外地点。
  P('frozen_wanderer_1_p',
    '墙根下靠坐着一个人，一动不动。你以为是睡着的，走近才看清——早冻硬了，怀里还护着半块没啃完的饼。他身上那件厚[item]连帽卫衣[/item]倒是完好，对活人来说，是能续命的东西。', [
    { label: '脱下他的卫衣带走', fx: { item: { hoodie: 1 }, stat: { sanity: -4 }, time: 15 } },
    { label: '给他拢一把雪盖上，走了', fx: { stat: { sanity: 3 }, time: 10 } }
  ]);
  ev('frozen_wanderer_1', outdoor({ season: 'winter', chance: 0.1 }), 2880, 'frozen_wanderer_1_p', 2);

  P('frozen_wanderer_2_p',
    '雪堆里露出一截裤脚。你扒开积雪，是个蜷成一团的流浪汉，冻得像块石头，脚上一双厚实的[item]工装靴[/item]，鞋底几乎没磨损——他大概刚流落到这条街，就没能再走出去。', [
    { label: '换走他的靴子', fx: { item: { work_boots: 1 }, stat: { sanity: -3 }, time: 15 } },
    { label: '留他一具全尸', fx: { stat: { sanity: 2 } } }
  ]);
  ev('frozen_wanderer_2', outdoor({ season: 'winter', chance: 0.1 }), 2880, 'frozen_wanderer_2_p', 2);

  P('frozen_wanderer_3_p',
    function (s) {
      var base = '一具冻僵的尸体半埋在雪里，身上裹着件蓬松的[item]羽绒服[/item]，是这种天气里最要命也最救命的东西。它已经帮不了主人了。';
      if (s.player.stats.cold > (G.TUNE ? G.TUNE.T_COLD_CAP : 50)) {
        base += '你自己也冷得开始发抖，牙关咯咯打颤——这件衣服，你比他更需要。';
      }
      return base;
    }, [
    { label: '剥下羽绒服穿上／收好', fx: { item: { down_jacket: 1 }, stat: { sanity: -5 }, time: 20 } },
    { label: '狠不下心，替他合上眼', fx: { stat: { sanity: 4 }, time: 10 } }
  ]);
  ev('frozen_wanderer_3', outdoor({ season: 'deepwinter', chance: 0.08 }), 4320, 'frozen_wanderer_3_p', 2);

})();
