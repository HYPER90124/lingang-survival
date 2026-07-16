/* =============================================================================
 * events.js — 事件注册表 / passage 注册表 / 触发调度 / 剧情推进
 * -----------------------------------------------------------------------------
 * 挂载到 G.data（注册表）与 G.engine（调度/剧情）：
 *
 *   G.data.events.register(ev)        —— 注册事件（结构见 docs/Schema.md）
 *   G.data.events.get(id) / all()
 *   G.data.story.register(passage)    —— 注册剧情段落
 *   G.data.story.get(id)
 *
 *   G.engine.checkEvents(trigger)     —— 触发检查，trigger ∈ 'enter'|'action'|'tick'|'sleep'
 *                                        命中最高优先级事件并触发，返回该事件或 null
 *   G.engine.openPassage(id)          —— 展示 passage（记录当前段落，调 G.ui.showPassage）
 *   G.engine.passageText(id)          —— 解析 passage 正文为字符串（供 UI/测试）
 *   G.engine.passageChoices(id)       —— 返回按 cond 过滤后的可选项（附原索引 _i）
 *   G.engine.selectChoice(choice)     —— 结算一个选项：cond 校验→applyFx→导航路由
 *   G.engine.selectChoiceAt(id, i)    —— 便捷版：按段落 id + 原索引结算（供控制台验收）
 *   G.engine.goLocation(locId)        —— 切换地点并跑 'enter' 事件（无事件则回地点界面）
 *
 * 事件触发时机（Schema）：进入地点(enter) / 地点内行动结算(action) / 时间跨过整点(tick) / 睡眠结算(sleep)
 * 事件可选 when:[...] 覆盖默认时机；默认：random→[enter,action]，scheduled→[tick,enter]，story→[enter,action,tick]
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  G.engine = G.engine || {};
  G.data = G.data || {};

  // ---- 注册表 -------------------------------------------------------------
  var eventList = [];
  var eventMap = {};
  G.data.events = {
    register: function (ev) {
      if (!ev || !ev.id) { console.warn('[events] 事件缺少 id'); return; }
      if (eventMap[ev.id]) console.warn('[events] 事件 id 重复覆盖:', ev.id);
      ev._order = eventList.length;
      eventMap[ev.id] = ev;
      // 覆盖时替换原对象
      var existing = eventList.findIndex(function (e) { return e.id === ev.id; });
      if (existing >= 0) eventList[existing] = ev; else eventList.push(ev);
    },
    get: function (id) { return eventMap[id] || null; },
    all: function () { return eventList; }
  };

  var storyMap = {};
  G.data.story = {
    register: function (p) {
      if (!p || !p.id) { console.warn('[story] 段落缺少 id'); return; }
      if (storyMap[p.id]) console.warn('[story] 段落 id 重复覆盖:', p.id);
      storyMap[p.id] = p;
    },
    get: function (id) { return storyMap[id] || null; }
  };

  function S() { return G.state; }
  var DEFAULT_WHEN = {
    random:    ['enter', 'action'],
    scheduled: ['tick', 'enter'],
    story:     ['enter', 'action', 'tick']
  };
  function whenOf(ev) { return ev.when || DEFAULT_WHEN[ev.type] || ['enter', 'action', 'tick']; }
  var TYPE_RANK = { story: 3, scheduled: 2, random: 1 };

  // ---- 触发资格判定 -------------------------------------------------------
  function eligible(ev, trigger) {
    var s = S();
    s.world._once = s.world._once || {};
    s.world.cooldowns = s.world.cooldowns || {};
    s.world._firedDay = s.world._firedDay || {};

    if (whenOf(ev).indexOf(trigger) < 0) return false;
    if (ev.once && s.world._once[ev.id]) return false;
    var cd = s.world.cooldowns[ev.id];
    if (cd && G.engine.absMinute() < cd) return false;
    // scheduled 每日只触发一次
    if (ev.type === 'scheduled' && s.world._firedDay[ev.id] === s.player.day) return false;
    if (!G.engine.checkCond(ev.cond)) return false;
    return true;
  }

  function fireEvent(ev) {
    var s = S(), now = G.engine.absMinute();
    s.world._once = s.world._once || {};
    if (ev.once) s.world._once[ev.id] = true;
    if (ev.cooldown) s.world.cooldowns[ev.id] = now + ev.cooldown;
    if (ev.type === 'scheduled') s.world._firedDay[ev.id] = s.player.day;
    if (ev.passage) openPassage(ev.passage);
    return ev;
  }

  // ---- 日历约定到期 -------------------------------------------------------
  // 到期的 appointment：标记 done，若登记了 eventId 则强制触发其 passage。
  function dueAppointments() {
    var s = S(), now = G.engine.absMinute(), fired = null;
    var aps = s.calendar.appointments;
    for (var i = 0; i < aps.length; i++) {
      var ap = aps[i];
      if (ap.done) continue;
      if (ap.day * 1440 + ap.minute <= now) {
        ap.done = true;
        if (ap.eventId) {
          var ev = eventMap[ap.eventId];
          if (ev && ev.passage) { fireEvent(ev); fired = ev; break; }
          else console.warn('[events] 约定 eventId 未注册:', ap.eventId);
        }
      }
    }
    return fired;
  }

  // ---- 触发检查 -----------------------------------------------------------
  function checkEvents(trigger) {
    // 战斗中不触发环境事件
    if (G.engine.inCombat && G.engine.inCombat()) return null;

    // tick/enter 时先结算到期约定（约定优先于随机池）
    if (trigger === 'tick' || trigger === 'enter') {
      var ap = dueAppointments();
      if (ap) return ap;
    }

    var best = null;
    var list = eventList;
    for (var i = 0; i < list.length; i++) {
      var ev = list[i];
      if (!eligible(ev, trigger)) continue;
      if (!best || better(ev, best)) best = ev;
    }
    if (best) return fireEvent(best);
    return null;
  }
  function better(a, b) {
    var pa = a.priority || 0, pb = b.priority || 0;
    if (pa !== pb) return pa > pb;
    var ra = TYPE_RANK[a.type] || 0, rb = TYPE_RANK[b.type] || 0;
    if (ra !== rb) return ra > rb;
    return a._order < b._order;                    // 先注册者优先
  }
  G.engine.checkEvents = checkEvents;

  // ---- passage 展示与解析 -------------------------------------------------
  function openPassage(id) {
    var p = storyMap[id];
    if (!p) { console.warn('[story] 未知段落:', id); return; }
    S()._currentPassage = id;
    if (G.ui.showPassage) G.ui.showPassage(id);
  }
  G.engine.openPassage = openPassage;

  function passageText(id) {
    var p = storyMap[id];
    if (!p) return '';
    return typeof p.text === 'function' ? p.text(S()) : (p.text || '');
  }
  G.engine.passageText = passageText;

  // 返回可选项（按 cond 过滤），每项附 _i = 在原 choices 中的索引
  function passageChoices(id) {
    var p = storyMap[id];
    if (!p || !p.choices) return [];
    var out = [];
    for (var i = 0; i < p.choices.length; i++) {
      var c = p.choices[i];
      if (c.cond && !G.engine.checkCond(c.cond)) continue;
      var copy = Object.create(c); copy._i = i;
      out.push(copy);
    }
    return out;
  }
  G.engine.passageChoices = passageChoices;

  // ---- 选项结算（交互主脊） -----------------------------------------------
  function routeNav(nav) {
    if (nav.combat) {
      if (G.engine.startCombat) G.engine.startCombat(nav.combat, { returnPassage: nav.goto });
      return nav;
    }
    if (nav.shop) {
      if (G.ui.showShop) G.ui.showShop(nav.shop);
      return nav;
    }
    if (nav.goto) { openPassage(nav.goto); return nav; }
    // 无导航 → 回地点主界面（Schema：无 choices 或选择后无 goto 时返回地点主界面）
    if (G.ui.showLocation) G.ui.showLocation();
    return nav;
  }

  function selectChoice(choice) {
    if (!choice) return null;
    if (choice.cond && !G.engine.checkCond(choice.cond)) return null; // 条件不满足，不可选
    var nav = G.engine.applyFx(choice.fx);
    return routeNav(nav);
  }
  G.engine.selectChoice = selectChoice;

  function selectChoiceAt(passageId, index) {
    var p = storyMap[passageId];
    if (!p || !p.choices || !p.choices[index]) { console.warn('[story] 无此选项', passageId, index); return null; }
    return selectChoice(p.choices[index]);
  }
  G.engine.selectChoiceAt = selectChoiceAt;

  // ---- 进入地点 -----------------------------------------------------------
  function goLocation(locId) {
    S().player.location = locId;
    var ev = checkEvents('enter');
    if (!ev && G.ui.showLocation) G.ui.showLocation();
    return ev;
  }
  G.engine.goLocation = goLocation;

})();
