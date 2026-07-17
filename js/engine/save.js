/* =============================================================================
 * save.js — 存档 / 读档 / 导出导入 / 版本迁移 / 死亡处理
 * -----------------------------------------------------------------------------
 * 挂载到 G.engine（并设 G.SAVE_VERSION）：
 *
 *   G.engine.save(slot)        —— 存档到槽位（slot: 1|2|3|'auto'）
 *   G.engine.load(slot)        —— 读档并载入 G.state，刷新界面
 *   G.engine.autoSave()        —— 存到自动档槽
 *   G.engine.hasSave(slot)     —— 槽位是否有档
 *   G.engine.listSaves()       —— { slot: {exists, meta, summary} }，供读档界面
 *   G.engine.deleteSave(slot)
 *   G.engine.exportCode()      —— 当前存档导出为 Base64 存档码（Unicode 安全）
 *   G.engine.importCode(str)   —— 从存档码导入并载入
 *   G.engine.onDeath(cause)    —— 死亡处理：标记并弹读档界面（G.ui.showDeath）
 *
 * 存档键：lgys_save_{槽位}。存档不含易失的 combat 态。
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  G.engine = G.engine || {};

  G.SAVE_VERSION = 7;   // M14：player.outfit；M15：player.stats.cold；M16：world.codex/world.stats + player.stats.grime；M17：world.homeUpg/gardenDay + homeStorage；M18：world.companion；M20：world.market
  var PREFIX = 'lgys_save_';
  var LEGACY_KEY = 'lgys_save';   // M16：M9 之前可能存在的无槽位后缀单档键（一次性迁入槽 1）
  var SLOTS = [1, 2, 3, 'auto'];

  function key(slot) { return PREFIX + slot; }
  function LS() {
    try { return window.localStorage; } catch (e) { return null; }
  }

  // ---- Unicode 安全 Base64 -----------------------------------------------
  function b64encode(str) {
    return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g,
      function (_, h) { return String.fromCharCode(parseInt(h, 16)); }));
  }
  function b64decode(b64) {
    return decodeURIComponent(Array.prototype.map.call(atob(b64),
      function (c) { return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2); }).join(''));
  }

  // ---- 序列化 -------------------------------------------------------------
  function snapshot() {
    var data = JSON.parse(JSON.stringify(G.state));
    delete data.combat;              // 战斗态易失且含函数回调，不入档
    data.meta = data.meta || {};
    data.meta.version = G.SAVE_VERSION;
    data.meta.saveTime = Date.now();
    return data;
  }

  // ---- 版本迁移 -----------------------------------------------------------
  // 结构补全 + 逐版本升级；新增迁移在此按 version 递增追加。
  function migrate(data) {
    if (!data.meta) data.meta = { version: 0 };
    var v = data.meta.version || 0;
    while (v < G.SAVE_VERSION) {
      switch (v) {
        case 1: migrateV1toV2(data); break;   // 无 outfit → 发默认初始装
        case 2: migrateV2toV3(data); break;   // 无 cold → 补 0（老档进冬季正常生效）
        case 3: migrateV3toV4(data); break;   // 无 codex/stats/grime → 补空容器
        case 4: migrateV4toV5(data); break;   // 无 homeUpg/gardenDay/homeStorage → 补默认
        case 5: migrateV5toV6(data); break;   // 无 companion → 补 null（老档没有同行者）
      }
      v++;
    }
    data.meta.version = G.SAVE_VERSION;
    normalize(data);
    return data;
  }
  // v1→v2：老档没有服装系统，按性别补一套垫底初始装（等同新开局发放）。
  function migrateV1toV2(d) {
    var p = d.player; if (!p) return;
    if (!p.outfit) p.outfit = defaultOutfit(p.gender);
  }
  // v2→v3：老档无寒冷字段，补 0（进入冬季后由 time.js 正常累积）。
  function migrateV2toV3(d) {
    var p = d.player; if (!p || !p.stats) return;
    if (p.stats.cold == null) p.stats.cold = 0;
  }
  // v3→v4：老档无图鉴/统计/脏污字段，补空容器（M16 四合一：codex/stats/grime）。
  function migrateV3toV4(d) {
    d.world = d.world || {};
    if (!d.world.codex) d.world.codex = { enemies: {} };
    if (!d.world.stats) d.world.stats = { kills: {}, scavenges: 0, fights: 0, flees: 0 };
    if (d.player && d.player.stats && d.player.stats.grime == null) d.player.stats.grime = 0;
  }
  // v4→v5：老档无家园升级/仓储字段，补默认（未修任何升级，柜子空的）。
  function migrateV4toV5(d) {
    d.world = d.world || {};
    if (!d.world.homeUpg) d.world.homeUpg = { door: false, rain: false, garden: false, storage: false };
    if (d.world.gardenDay === undefined) d.world.gardenDay = null;
    if (!d.homeStorage) d.homeStorage = [];
  }
  // v5→v6：老档无同行字段，补 null（同行是易失场景外的持久态，但老档必然无人同行）。
  function migrateV5toV6(d) {
    d.world = d.world || {};
    if (d.world.companion === undefined) d.world.companion = null;
  }
  function defaultOutfit(gender) {
    if (G.engine.initialOutfit) return G.engine.initialOutfit(gender);
    // 引擎未加载时的兜底（durMax 由 items.js 决定，这里给保守值 20）
    return gender === 'f'
      ? { top: { id: 'worn_blouse', dur: 20 }, bottom: { id: 'worn_jeans', dur: 25 }, shoes: { id: 'worn_flats', dur: 18 } }
      : { top: { id: 'worn_tshirt', dur: 20 }, bottom: { id: 'worn_jeans', dur: 25 }, shoes: { id: 'worn_sneakers', dur: 20 } };
  }
  // 补全可能缺失的容器字段（兼容旧档/手工档）
  function normalize(d) {
    d.world = d.world || {};
    d.world.flags = d.world.flags || {};
    d.world.cooldowns = d.world.cooldowns || {};
    d.world._firedDay = d.world._firedDay || {};
    d.world._once = d.world._once || {};
    d.calendar = d.calendar || {};
    d.calendar.appointments = d.calendar.appointments || [];
    d.calendar.milestones = d.calendar.milestones || [];
    d.scavenge = d.scavenge || {};
    d.npcs = d.npcs || {};
    if (d.player && !d.player.outfit) d.player.outfit = defaultOutfit(d.player.gender);
    if (d.player && d.player.stats && d.player.stats.cold == null) d.player.stats.cold = 0;
    // M16：图鉴/统计/脏污容器兜底（手工档/极端空档）
    if (!d.world.codex) d.world.codex = { enemies: {} };
    if (!d.world.codex.enemies) d.world.codex.enemies = {};
    if (!d.world.stats) d.world.stats = { kills: {}, scavenges: 0, fights: 0, flees: 0 };
    if (!d.world.stats.kills) d.world.stats.kills = {};
    if (d.player && d.player.stats && d.player.stats.grime == null) d.player.stats.grime = 0;
    // M17：家园升级/仓储容器兜底
    if (!d.world.homeUpg) d.world.homeUpg = { door: false, rain: false, garden: false, storage: false };
    if (d.world.gardenDay === undefined) d.world.gardenDay = null;
    if (!d.homeStorage) d.homeStorage = [];
    // M18：同行容器兜底（手工档/极端空档）；undefined→null（无同行）
    if (d.world.companion === undefined) d.world.companion = null;
    // M20：物价波动容器兜底（老档/极端空档）；undefined→day:-1（读入首日按无波动处理）
    if (d.world.market === undefined) d.world.market = { day: -1, hordeSurgeDays: 0, rainDiscount: false, butcherTax: false, shortage: {} };
    return d;
  }

  // ---- 旧键迁移（M16：M9 之前若用过无后缀单档键 lgys_save，一次性迁入槽 1） ----
  // 幂等：仅当槽 1 为空且旧键存在时执行；保留旧键做回退（不删除），确认新档可读后自然废弃。
  var legacyMigrated = false;
  function migrateLegacyKey() {
    if (legacyMigrated) return;
    legacyMigrated = true;
    var ls = LS(); if (!ls) return;
    try {
      var raw = ls.getItem(LEGACY_KEY);
      if (!raw) return;
      if (ls.getItem(key(1))) return;          // 槽 1 已有档，不覆盖
      JSON.parse(raw);                          // 校验是合法 JSON 再迁
      ls.setItem(key(1), raw);                  // 迁入槽 1（旧键保留做回退）
      console.info('[save] 旧存档已迁入槽位 1（原键保留）');
    } catch (e) { console.warn('[save] 旧存档迁移跳过:', e); }
  }

  // ---- 存 / 读 ------------------------------------------------------------
  function save(slot) {
    var ls = LS(); if (!ls) { console.warn('[save] localStorage 不可用'); return false; }
    try {
      ls.setItem(key(slot), JSON.stringify(snapshot()));
      return true;
    } catch (e) { console.error('[save] 存档失败:', e); return false; }
  }
  function autoSave() { return save('auto'); }

  function load(slot) {
    migrateLegacyKey();
    var ls = LS(); if (!ls) return false;
    var raw = ls.getItem(key(slot));
    if (!raw) { console.warn('[save] 空槽位:', slot); return false; }
    try {
      var data = migrate(JSON.parse(raw));
      G.state = data;
      G.state.combat = null;
      if (G.ui.refresh) G.ui.refresh();
      if (G.ui.showLocation) G.ui.showLocation();
      return true;
    } catch (e) { console.error('[save] 读档失败:', e); return false; }
  }

  function hasSave(slot) { var ls = LS(); return !!(ls && ls.getItem(key(slot))); }
  function deleteSave(slot) { var ls = LS(); if (ls) ls.removeItem(key(slot)); }

  function summarize(data) {
    var p = data.player || {};
    var d = G.engine.dateOf ? G.engine.dateOf(p.day || 0) : { md: '', weekdayName: '' };
    var m = p.minute || 0, h = Math.floor(m / 60), mm = m % 60;
    return {
      name: p.name || '（无名）',
      gender: p.gender,
      day: p.day,
      date: d.md + ' ' + d.weekdayName,
      time: (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm,
      location: p.location,
      saveTime: (data.meta && data.meta.saveTime) || 0
    };
  }

  function listSaves() {
    migrateLegacyKey();
    var ls = LS(), out = {};
    SLOTS.forEach(function (slot) {
      var raw = ls && ls.getItem(key(slot));
      if (!raw) { out[slot] = { exists: false }; return; }
      try {
        var data = JSON.parse(raw);
        out[slot] = { exists: true, meta: data.meta, summary: summarize(data) };
      } catch (e) { out[slot] = { exists: false, corrupt: true }; }
    });
    return out;
  }

  // ---- 导出 / 导入 --------------------------------------------------------
  function exportCode() { return b64encode(JSON.stringify(snapshot())); }
  function importCode(str) {
    try {
      var data = migrate(JSON.parse(b64decode(String(str).trim())));
      G.state = data;
      G.state.combat = null;
      if (G.ui.refresh) G.ui.refresh();
      if (G.ui.showLocation) G.ui.showLocation();
      return true;
    } catch (e) { console.error('[save] 存档码无效:', e); return false; }
  }

  // ---- 死亡处理 -----------------------------------------------------------
  function onDeath(cause) {
    if (!G.state) return;
    G.state._dead = cause || true;
    // 不覆盖任何存档，保留玩家读档机会
    if (G.ui.showDeath) G.ui.showDeath(cause);
    else console.warn('[save] 玩家死亡（', cause, '），等待读档。');
  }

  G.engine.save = save;
  G.engine.autoSave = autoSave;
  G.engine.load = load;
  G.engine.hasSave = hasSave;
  G.engine.deleteSave = deleteSave;
  G.engine.listSaves = listSaves;
  G.engine.exportCode = exportCode;
  G.engine.importCode = importCode;
  G.engine.onDeath = onDeath;
  G.engine._migrate = migrate;   // 供测试

})();
