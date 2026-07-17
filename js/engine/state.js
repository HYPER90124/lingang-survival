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
    var gender = opts.gender === 'f' ? 'f' : 'm';
    return {
      meta: { version: G.SAVE_VERSION || 1, saveTime: 0 },
      player: {
        name: opts.name || '',
        gender: gender,
        // 时间锚点：第 90 天 = 10月12日周日，开局早晨醒来
        day: 90, minute: 480,
        location: 'home',
        stats: { hp: 100, hunger: 70, thirst: 70, energy: 80,
                 sanity: 80, alcohol: 0, addiction: 0, infection: 0,
                 cold: 0,     // M15：寒冷值（0–100），开局 10 月尚在秋季不累积
                 grime: 0 },  // M16：脏污值（0–100），搜刮/战斗/下水道累积，洗漱清零
        bullets: 20,
        weapon: null,                 // {id, durability}
        outfit: initialOutfit(gender),// M14：三槽服装 {top,bottom,shoes}，每槽 {id,dur}|null
        inventory: [],                // [{id, count}]；武器/服装条目额外带 durability
        skills: {},
        flags: {}
      },
      npcs: npcs,
      world: {
        flags: {}, cooldowns: {}, _firedDay: {}, season: 'autumn', // _firedDay: scheduled 每日去重；season: M15 季节缓存
        codex: { enemies: {} },                                     // M16：已见敌人图鉴 {enemyId: true}
        stats: { kills: {}, scavenges: 0, fights: 0, flees: 0 },    // M16：生存统计
        homeUpg: { door: false, rain: false, garden: false, storage: false }, // M17：家园四项升级
        gardenDay: null,                                             // M17：小菜园最近收获日（未建为 null）
        companion: null                                              // M18：当前同行 NPC {id, until}（absMinute 截止），无则 null
      },
      calendar: { appointments: [], milestones: [] },
      scavenge: {},
      homeStorage: []   // M17：家园储物柜，{id,count}，不计负重（需先修「打造储物柜」解锁 UI）
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

  // ---- M16 图鉴 / 生存统计埋点（纯数据写入，供 combat/scavenge 调用，不改战斗流程） ----
  function worldCodex() {
    var w = S().world;
    if (!w.codex) w.codex = { enemies: {} };
    if (!w.codex.enemies) w.codex.enemies = {};
    return w.codex;
  }
  function worldStats() {
    var w = S().world;
    if (!w.stats) w.stats = { kills: {}, scavenges: 0, fights: 0, flees: 0 };
    if (!w.stats.kills) w.stats.kills = {};
    return w.stats;
  }
  // 登记已见敌人（startCombat 埋点）
  function codexSee(id) { if (id) worldCodex().enemies[id] = true; }
  // 生存统计计数：kind ∈ 'kills'(需 id)|'scavenges'|'fights'|'flees'
  function statTick(kind, id) {
    var st = worldStats();
    if (kind === 'kills') { if (id) st.kills[id] = (st.kills[id] || 0) + 1; return; }
    if (typeof st[kind] !== 'number') st[kind] = 0;
    st[kind] += 1;
  }
  G.engine.codexSee = codexSee;
  G.engine.statTick = statTick;
  G.engine.worldStats = worldStats;
  G.engine.worldCodex = worldCodex;

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
    // 武器/服装每件独立成条目并带耐久（可堆叠数量仅对无耐久物资有效）
    if (def && (def.type === 'weapon' || def.type === 'clothing')) {
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
    if (companionActive()) cap += 10;      // M18：同行者帮拿，负重上限 +10
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

  // ---- 家园仓储（M17） ------------------------------------------------------
  // homeStorage 结构与 player.inventory 同构（{id,count}）；只收纳无独立耐久的物资
  // （武器/服装类拒收，避免装备语义复杂化），寄存物不计入 invWeight/carryCap。
  // 容量上限走 TUNE.homeStorageCap（重量），由「打造储物柜」升级解锁 UI 后才可用。
  function homeStorageList() { return S().homeStorage || (S().homeStorage = []); }
  function homeStorageEntry(id) {
    var st = homeStorageList();
    for (var i = 0; i < st.length; i++) if (st[i].id === id) return st[i];
    return null;
  }
  function homeStorageCount(id) { var e = homeStorageEntry(id); return e ? e.count : 0; }
  function homeStorageAdd(id, n) {
    n = (n == null) ? 1 : n;
    if (n <= 0) return;
    var e = homeStorageEntry(id);
    if (e) e.count += n; else homeStorageList().push({ id: id, count: n });
  }
  function homeStorageRemove(id, n) {
    n = (n == null) ? 1 : n;
    if (n <= 0) return;
    var st = homeStorageList();
    var e = homeStorageEntry(id);
    if (!e) return;
    e.count -= n;
    if (e.count <= 0) { var idx = st.indexOf(e); if (idx >= 0) st.splice(idx, 1); }
  }
  function homeStorageWeight() {
    var st = homeStorageList(), total = 0;
    for (var i = 0; i < st.length; i++) {
      var def = itemDef(st[i].id);
      total += (def ? (def.weight || 0) : 0) * st[i].count;
    }
    return total;
  }
  function homeStorageCap() { return (G.TUNE && G.TUNE.homeStorageCap != null) ? G.TUNE.homeStorageCap : 60; }
  // 存入：背包→柜（武器/服装拒收；超容拒绝，返回 msg 供 UI toast）
  function homeStorageDeposit(id, n) {
    n = (n == null) ? 1 : n;
    var def = itemDef(id);
    if (def && (def.type === 'weapon' || def.type === 'clothing')) return { ok: false, msg: '武器和服装存不进储物柜。' };
    if (countItem(id) < n) return { ok: false, msg: '背包里没有这么多。' };
    var addWeight = (def ? (def.weight || 0) : 0) * n;
    if (homeStorageWeight() + addWeight > homeStorageCap()) return { ok: false, msg: '储物柜装不下了。' };
    removeItem(id, n);
    homeStorageAdd(id, n);
    return { ok: true };
  }
  // 取出：柜→背包（不受负重上限阻拦，超重后照 isOverweight 既有规则处理）
  function homeStorageWithdraw(id, n) {
    n = (n == null) ? 1 : n;
    if (homeStorageCount(id) < n) return { ok: false, msg: '储物柜里没有这么多。' };
    homeStorageRemove(id, n);
    addItem(id, n);
    return { ok: true };
  }
  // 被动产出（雨水收集器/小菜园）优先入柜，未建储物柜或已满则直接进背包（超重照常规规则处理）
  function homeAutoStore(id, n) {
    var w = S().world;
    if (w && w.homeUpg && w.homeUpg.storage) {
      var def = itemDef(id);
      var addWeight = (def ? (def.weight || 0) : 0) * n;
      if (homeStorageWeight() + addWeight <= homeStorageCap()) { homeStorageAdd(id, n); return 'storage'; }
    }
    addItem(id, n);
    return 'bag';
  }
  G.engine.homeStorageCount = homeStorageCount;
  G.engine.homeStorageAdd = homeStorageAdd;
  G.engine.homeStorageRemove = homeStorageRemove;
  G.engine.homeStorageWeight = homeStorageWeight;
  G.engine.homeStorageCap = homeStorageCap;
  G.engine.homeStorageDeposit = homeStorageDeposit;
  G.engine.homeStorageWithdraw = homeStorageWithdraw;
  G.engine.homeAutoStore = homeAutoStore;

  // ---- 同行（M18） --------------------------------------------------------
  // world.companion = {id, until}（until 为 absMinute 截止时刻，当日 24:00）。
  // 这里只放「状态模型」读取；邀请/解散/战斗单位构建等逻辑在 npcs.js / combat.js，
  // 便于 M19 战役按 id 复用（world.companion 是唯一事实源）。
  function companionState() { var w = S() && S().world; return (w && w.companion) || null; }
  function companionActive() { return !!companionState(); }
  function companionId() { var c = companionState(); return c ? c.id : null; }
  G.engine.companionState = companionState;
  G.engine.companionActive = companionActive;
  G.engine.companionId = companionId;

  // ---- 服装（M14） --------------------------------------------------------
  // 开局按性别发一套垫底基础装（worn 系列）。老档迁移走 save.js DEFAULT_OUTFIT。
  var CLOTH_SLOTS = ['top', 'bottom', 'shoes'];
  G.CLOTH_SLOTS = CLOTH_SLOTS;
  function initialOutfit(gender) {
    var def = itemDef; // 取 durMax
    function piece(id) { var d = def(id); return { id: id, dur: (d && d.durMax) || 1 }; }
    return gender === 'f'
      ? { top: piece('worn_blouse'), bottom: piece('worn_jeans'), shoes: piece('worn_flats') }
      : { top: piece('worn_tshirt'), bottom: piece('worn_jeans'), shoes: piece('worn_sneakers') };
  }
  G.engine.initialOutfit = initialOutfit;

  // 单件服装的「有效属性」：耐久跌破半值即撕破，warmth/armor/decency 减半向下取整。
  function clothingEff(entry) {
    var out = { warmth: 0, armor: 0, decency: 0 };
    if (!entry) return out;
    var def = itemDef(entry.id);
    if (!def) return out;
    var torn = entry.dur != null && entry.dur < (def.durMax || 1) * 0.5;
    var f = torn ? 0.5 : 1;
    out.warmth = Math.floor((def.warmth || 0) * f);
    out.armor = Math.floor((def.armor || 0) * f);
    out.decency = Math.floor((def.decency || 0) * f);
    out.torn = torn;
    return out;
  }
  G.engine.clothingEff = clothingEff;

  // 全身三槽属性合计（M15 读 warmth；combat 读 armor；文本读 decency）
  function outfitSum(attr) {
    var o = S().player.outfit; if (!o) return 0;
    var total = 0;
    for (var i = 0; i < CLOTH_SLOTS.length; i++) total += clothingEff(o[CLOTH_SLOTS[i]])[attr];
    return total;
  }
  function outfitWarmth() { return outfitSum('warmth'); }
  function outfitArmor() { return outfitSum('armor'); }
  function outfitDecency() { return outfitSum('decency'); }
  // 是否「基本着装」：上装与下装两槽都有衣物（成人场景宽衣描写等按此分支）
  function isDressed() {
    var o = S().player.outfit;
    return !!(o && o.top && o.bottom);
  }
  G.engine.outfitWarmth = outfitWarmth;
  G.engine.outfitArmor = outfitArmor;
  G.engine.outfitDecency = outfitDecency;
  G.engine.isDressed = isDressed;

  // 战斗被击时的损衣：随机一件在穿服装耐久 -amount，跨过撕破/报废阈值时返回提示文本。
  // 报废（dur<=0）则从 outfit 移除该槽。无在穿服装返回 null。
  function damageClothing(amount) {
    var o = S().player.outfit; if (!o) return null;
    amount = amount || 1;
    var worn = CLOTH_SLOTS.filter(function (s) { return o[s]; });
    if (!worn.length) return null;
    var slot = worn[Math.floor(Math.random() * worn.length)];
    var c = o[slot], def = itemDef(c.id) || {};
    var wasTorn = c.dur < (def.durMax || 1) * 0.5;
    c.dur -= amount;
    if (c.dur <= 0) {
      o[slot] = null;
      return '[blood]' + (def.name || '衣物') + '[/blood]被彻底扯烂，再也没法穿了。';
    }
    if (!wasTorn && c.dur < (def.durMax || 1) * 0.5) {
      return (def.name || '衣物') + '被撕开一道大口子，护不住身了。';
    }
    return null;
  }
  G.engine.damageClothing = damageClothing;

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
    if ('season' in cond) {                                      // M15：季节门（winter=初冬+深冬）
      var tier = G.engine.seasonTierNow ? G.engine.seasonTierNow() : 0;
      var want = cond.season;
      var ok = want === 'winter' ? tier >= 1
             : want === 'deepwinter' ? tier === 2
             : want === 'earlywinter' ? tier === 1
             : tier === 0;                                       // 'autumn'
      if (!ok) return false;
    }

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
    if ('decency' in cond && !cmp(outfitDecency(), cond.decency)) return false;  // M14：着装体面合计
    if ('homeUpg' in cond) {                                        // M17：家园升级门 {door|rain|garden|storage: bool}
      var hu = s.world.homeUpg || {};
      for (var hk in cond.homeUpg) {
        if (!!cond.homeUpg[hk] !== !!hu[hk]) return false;
      }
    }
    if ('companion' in cond) {                                      // M18：是否有同行者（true/false，或指定 id）
      var comp = s.world && s.world.companion;
      if (cond.companion === true && !comp) return false;
      if (cond.companion === false && comp) return false;
      if (typeof cond.companion === 'string' && (!comp || comp.id !== cond.companion)) return false;
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

    // M13 扩展：概率分支 roll:{chance, win:{...fx}, lose:{...fx}}
    // 掷骰后递归执行对应分支，分支里的导航指令向外传递（覆盖外层同名导航）。
    // 供「非战斗脱身」类选项使用：成功率写死在 chance、标注在选项文案里。
    if (fx.roll) {
      var branch = Math.random() < (fx.roll.chance || 0) ? fx.roll.win : fx.roll.lose;
      var sub = applyFx(branch);
      if (sub.goto)   nav.goto = sub.goto;
      if (sub.combat) nav.combat = sub.combat;
      if (sub.shop)   nav.shop = sub.shop;
    }

    if (fx.goto && !nav.goto)     nav.goto = fx.goto;
    if (fx.combat && !nav.combat) nav.combat = fx.combat;
    if (fx.shop && !nav.shop)     nav.shop = fx.shop;
    return nav;
  }
  G.engine.applyFx = applyFx;

})();
