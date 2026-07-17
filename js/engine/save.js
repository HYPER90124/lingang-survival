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

  G.SAVE_VERSION = 3;   // M14：player.outfit（服装三槽）；M15：player.stats.cold（寒冷值）
  var PREFIX = 'lgys_save_';
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
    return d;
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
