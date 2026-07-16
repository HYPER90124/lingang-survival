/* =============================================================================
 * state.js — 游戏状态与 DSL 求值器
 * -----------------------------------------------------------------------------
 * 挂载到 G.state（数据）与 G.engine（下列函数）：
 *
 *   G.engine.newGame(opts)            —— 创建新开局 GameState（opts: {name, gender}）
 *   G.engine.absMinute(state?)        —— 绝对分钟 = day*1440 + minute
 *   G.engine.clamp(v, lo, hi)         —— 数值钳制
 *   G.engine.statGet(name)            —— 读身体状态
 *   G.engine.statAdd(name, delta)     —— 加身体状态并钳制 0–100，返回新值
 *   G.engine.statSet(name, val)       —— 设身体状态（钳制 0–100）
 *   G.engine.getFlag(path)            —— 读标记（路径规则见下）
 *   G.engine.setFlag(path, val)       —— 写标记
 *   G.engine.affGet(id) / affAdd(id,d)—— NPC 好感（钳制 -100..100）
 *   G.engine.stageGet(id)             —— NPC 阶段
 *   G.engine.advanceStage(id, target) —— 阶段推进，仅允许 +1，越级/回退被拒
 *   G.engine.hasItem(id) / countItem(id) / addItem(id,n) / removeItem(id,n)
 *   G.engine.invWeight()              —— 背包总重
 *   G.engine.checkCond(cond)          —— 条件 DSL 求值 → bool
 *   G.engine.applyFx(fx)              —— 效果 DSL 执行 → 返回导航指令 {goto?,combat?,shop?}
 *
 * 标记路径规则（getFlag/setFlag/cond.flag/fx.flag 通用）：
 *   "world.xxx"   → G.state.world.flags.xxx
 *   "npc.qin.xxx" → G.state.npcs.qin.storyFlags.xxx
 *   其他 "xxx"    → G.state.player.flags.xxx
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  G.engine = G.engine || {};

  // 全部 NPC id（剧情事实源见 docs/NPC设定.md）；数据层可复用此表
  var NPC_IDS = ['qin', 'lin', 'mao', 'su', 'dou', 'zhou', 'zhao', 'chen', 'cai', 'fang'];
  G.NPC_IDS = NPC_IDS;

  function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
  G.engine.clamp = clamp;

  // ---- 新开局 -------------------------------------------------------------
  function newGame(opts) {
    opts = opts || {};
    var npcs = {};
    NPC_IDS.forEach(function (id) {
      npcs[id] = { met: false, alive: true, affinity: 0, stage: 0, storyFlags: {}, vars: {} };
    });
    return {
      meta: { version: G.SAVE_VERSION || 1, saveTime: 0 },
      player: {
        name: opts.name || '',
        gender: opts.gender === 'f' ? 'f' : 'm',
        // 时间锚点：第 90 天 = 10月12日周日，开局早晨醒来
        day: 90, minute: 480,
        location: 'home',
        stats: { hp: 100, hunger: 70, thirst: 70, energy: 80,
                 sanity: 80, alcohol: 0, addiction: 0, infection: 0 },
        bullets: 20,
        weapon: null,                 // {id, durability}
        inventory: [],                // [{id, count}]；武器条目额外带 durability
        skills: {},
        flags: {}
      },
      npcs: npcs,
      world: { flags: {}, cooldowns: {}, _firedDay: {} }, // _firedDay: scheduled 每日去重
      calendar: { appointments: [], milestones: [] },
      scavenge: {}
    };
  }
  G.engine.newGame = newGame;

  function S() { return G.state; }

  // ---- 时间 ---------------------------------------------------------------
  function absMinute(state) {
    var s = (state || S()).player;
    return s.day * 1440 + s.minute;
  }
  G.engine.absMinute = absMinute;

  // ---- 身体状态（0–100） --------------------------------------------------
  function statGet(name) { return S().player.stats[name]; }
  function statSet(name, val) {
    return (S().player.stats[name] = clamp(val, 0, 100));
  }
  function statAdd(name, delta) {
    var st = S().player.stats;
    if (typeof st[name] !== 'number') st[name] = 0;
    return (st[name] = clamp(st[name] + delta, 0, 100));
  }
  G.engine.statGet = statGet;
  G.engine.statSet = statSet;
  G.engine.statAdd = statAdd;

  // ---- 标记路径解析 -------------------------------------------------------
  // 返回 {obj, key}，getFlag/setFlag 共用
  function resolveFlag(path) {
    var s = S();
    if (path.indexOf('world.') === 0) {
      return { obj: s.world.flags, key: path.slice(6) };
    }
    if (path.indexOf('npc.') === 0) {
      var rest = path.slice(4);              // "qin.xxx"
      var dot = rest.indexOf('.');
      var id = dot < 0 ? rest : rest.slice(0, dot);
      var key = dot < 0 ? '' : rest.slice(dot + 1);
      var npc = s.npcs[id];
      if (!npc) { console.warn('[state] 未知 NPC 标记路径:', path); return null; }
      return { obj: npc.storyFlags, key: key };
    }
    return { obj: s.player.flags, key: path };
  }
  function getFlag(path) {
    var r = resolveFlag(path);
    return r ? r.obj[r.key] : undefined;
  }
  function setFlag(path, val) {
    var r = resolveFlag(path);
    if (r) r.obj[r.key] = val;
    return val;
  }
  G.engine.getFlag = getFlag;
  G.engine.setFlag = setFlag;

  // ---- NPC 好感 / 阶段 ----------------------------------------------------
  function npc(id) {
    var n = S().npcs[id];
    if (!n) console.warn('[state] 未知 NPC:', id);
    return n;
  }
  function affGet(id) { var n = npc(id); return n ? n.affinity : 0; }
  function affAdd(id, delta) {
    var n = npc(id); if (!n) return 0;
    return (n.affinity = clamp(n.affinity + delta, -100, 100));
  }
  function stageGet(id) { var n = npc(id); return n ? n.stage : 0; }
  // 阶段只允许 +1 式推进，由引擎校验（Schema fx.stage 约定）
  function advanceStage(id, target) {
    var n = npc(id); if (!n) return false;
    if (target === n.stage + 1) { n.stage = target; return true; }
    if (target <= n.stage) { return false; }           // 回退或重复：静默拒绝
    console.warn('[state] 阶段越级被拒:', id, n.stage, '→', target);
    return false;
  }
  G.engine.affGet = affGet;
  G.engine.affAdd = affAdd;
  G.engine.stageGet = stageGet;
  G.engine.advanceStage = advanceStage;

  // ---- 背包 ---------------------------------------------------------------
  function itemDef(id) { return (G.data && G.data.items && G.data.items[id]) || null; }
  function invEntry(id) {
    var inv = S().player.inventory;
    for (var i = 0; i < inv.length; i++) if (inv[i].id === id) return inv[i];
    return null;
  }
  function countItem(id) { var e = invEntry(id); return e ? e.count : 0; }
  function hasItem(id) { return countItem(id) > 0; }
  function addItem(id, n) {
    n = (n == null) ? 1 : n;
    if (n <= 0) return removeItem(id, -n);
    var def = itemDef(id);
    var inv = S().player.inventory;
    // 武器每把独立成条目并带耐久（可堆叠数量仅对非武器有效）
    if (def && def.type === 'weapon') {
      for (var k = 0; k < n; k++) {
        inv.push({ id: id, count: 1, durability: def.durMax || 1 });
      }
      return;
    }
    var e = invEntry(id);
    if (e) e.count += n; else inv.push({ id: id, count: n });
  }
  function removeItem(id, n) {
    n = (n == null) ? 1 : n;
    if (n <= 0) return;
    var inv = S().player.inventory;
    var e = invEntry(id);
    if (!e) return;
    e.count -= n;
    if (e.count <= 0) {
      var idx = inv.indexOf(e);
      if (idx >= 0) inv.splice(idx, 1);
    }
  }
  function invWeight() {
    var inv = S().player.inventory, total = 0;
    for (var i = 0; i < inv.length; i++) {
      var def = itemDef(inv[i].id);
      total += (def ? (def.weight || 0) : 0) * inv[i].count;
    }
    return total;
  }
  // 背包总重上限 30（Schema），可被技能/道具扩容；超重无法快跑逃跑/快速移动
  var CARRY_BASE = 30;
  function carryCap() {
    var p = S().player, cap = CARRY_BASE;
    if (p.skills.packmule) cap += 10;      // 预留：负重技能（数据层定义）
    if (p.flags.carryBonus) cap += p.flags.carryBonus;
    return cap;
  }
  function isOverweight() { return invWeight() > carryCap(); }
  G.engine.itemDef = itemDef;
  G.engine.countItem = countItem;
  G.engine.hasItem = hasItem;
  G.engine.addItem = addItem;
  G.engine.removeItem = removeItem;
  G.engine.invWeight = invWeight;
  G.engine.carryCap = carryCap;
  G.engine.isOverweight = isOverweight;

  // ---- 条件 DSL ------------------------------------------------------------
  // 对象内多条件为 AND；anyOf 数组内为 OR。
  function cmp(actual, spec) {
    // spec 可为裸值（相等判定）或 {lt,lte,gt,gte,eq,ne} 比较对象
    if (spec == null) return true;
    if (typeof spec !== 'object') return actual === spec;
    var ok = true;
    if ('eq'  in spec) ok = ok && actual === spec.eq;
    if ('ne'  in spec) ok = ok && actual !== spec.ne;
    if ('lt'  in spec) ok = ok && actual <  spec.lt;
    if ('lte' in spec) ok = ok && actual <= spec.lte;
    if ('gt'  in spec) ok = ok && actual >  spec.gt;
    if ('gte' in spec) ok = ok && actual >= spec.gte;
    return ok;
  }

  // 分钟落在 [start,end) 内，支持跨午夜（start>end）
  function inTimeRange(minute, range) {
    var a = range[0], b = range[1];
    if (a <= b) return minute >= a && minute < b;
    return minute >= a || minute < b;               // 跨午夜
  }
  G.engine.inTimeRange = inTimeRange;

  function checkCond(cond) {
    if (!cond) return true;
    var s = S(), p = s.player;

    if ('anyOf' in cond) {
      var any = false;
      for (var i = 0; i < cond.anyOf.length; i++) {
        if (checkCond(cond.anyOf[i])) { any = true; break; }
      }
      if (!any) return false;
    }

    if ('loc' in cond && p.location !== cond.loc) return false;
    if ('gender' in cond && p.gender !== cond.gender) return false;
    if ('timeRange' in cond && !inTimeRange(p.minute, cond.timeRange)) return false;
    if ('weekday' in cond && (p.day % 7) !== cond.weekday) return false;
    if ('dayMin' in cond && p.day < cond.dayMin) return false;
    if ('dayMax' in cond && p.day > cond.dayMax) return false;   // 扩展字段

    if ('stat' in cond) {
      for (var st in cond.stat) if (!cmp(p.stats[st], cond.stat[st])) return false;
    }
    if ('aff' in cond) {
      for (var a in cond.aff) if (!cmp(affGet(a), cond.aff[a])) return false;
    }
    if ('stage' in cond) {
      for (var sg in cond.stage) if (!cmp(stageGet(sg), cond.stage[sg])) return false;
    }
    if ('flag' in cond) {
      for (var fk in cond.flag) {
        var want = cond.flag[fk], cur = getFlag(fk);
        // 布尔 false 需匹配「未设置(undefined)」与「显式 false」
        if (want === false) { if (cur) return false; }
        else if (typeof want === 'object') { if (!cmp(cur, want)) return false; }
        else if (cur !== want) return false;
      }
    }
    if ('has' in cond) {
      var h = cond.has;
      if ('bullets' in h && p.bullets < h.bullets) return false;
      if ('item' in h) {
        var items = Array.isArray(h.item) ? h.item : [h.item];
        for (var ii = 0; ii < items.length; ii++) if (!hasItem(items[ii])) return false;
      }
    }
    if ('skill' in cond && !p.skills[cond.skill]) return false;   // 扩展字段
    if ('met' in cond) {                                          // 扩展字段：是否已相遇
      var mn = s.npcs[cond.met]; if (!mn || !mn.met) return false;
    }

    // chance 放最后：只有其余条件全过才掷骰，避免浪费判定
    if ('chance' in cond && Math.random() >= cond.chance) return false;

    return true;
  }
  G.engine.checkCond = checkCond;

  // ---- 效果 DSL ------------------------------------------------------------
  // 返回导航指令 {goto?, combat?, shop?}；副作用（数值/物品/时间等）就地执行。
  // 执行顺序：数值/物品/标记 → 日历 → 时间推进 → 收集导航。
  function applyFx(fx) {
    var nav = {};
    if (!fx) return nav;
    var p = S().player;

    if (fx.stat) for (var st in fx.stat) statAdd(st, fx.stat[st]);
    if ('bullets' in fx) p.bullets = Math.max(0, p.bullets + fx.bullets);
    if (fx.item) for (var it in fx.item) {
      var d = fx.item[it]; if (d >= 0) addItem(it, d); else removeItem(it, -d);
    }
    if (fx.aff) for (var a in fx.aff) affAdd(a, fx.aff[a]);
    if (fx.stage) for (var sg in fx.stage) advanceStage(sg, fx.stage[sg]);
    if (fx.flag) for (var fk in fx.flag) setFlag(fk, fx.flag[fk]);
    if (fx.skill) {
      var sk = Array.isArray(fx.skill) ? fx.skill : [fx.skill];
      for (var k = 0; k < sk.length; k++) p.skills[sk[k]] = true;
    }

    if (fx.appointment) {
      var ap = fx.appointment;
      S().calendar.appointments.push({
        day: p.day + (ap.inDays || 0),
        minute: ap.minute != null ? ap.minute : p.minute,
        label: ap.label || '', eventId: ap.eventId || null, done: false
      });
    }
    if (fx.milestone) {
      S().calendar.milestones.push({ day: p.day, label: fx.milestone });
    }

    // 时间推进最后于副作用之后进行（可能触发跨整点/阈值事件）
    if (fx.time) G.engine.advance(fx.time);

    if (fx.goto)   nav.goto = fx.goto;
    if (fx.combat) nav.combat = fx.combat;
    if (fx.shop)   nav.shop = fx.shop;
    return nav;
  }
  G.engine.applyFx = applyFx;

})();
