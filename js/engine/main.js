/* =============================================================================
 * main.js — 启动流程 / 全局错误兜底 / G.ui 占位接口（必须最后加载）
 * -----------------------------------------------------------------------------
 * G.ui 接口清单（M1 为占位空实现，M2 实现真正渲染）：
 *   G.ui.showLocation()          —— 渲染当前地点主界面（行动列表/状态条）
 *   G.ui.showPassage(id)         —— 渲染一个剧情段落（正文 + 选项）
 *   G.ui.refresh()               —— 刷新状态栏/日历等常驻面板
 *   G.ui.showCombat(combatState) —— 渲染战斗界面
 *   —— 以下为 M1 追加的接口（见 PLAN 交接备注），M2 一并实现：
 *   G.ui.showShop(shopId)        —— 打开交易界面
 *   G.ui.showDeath(cause)        —— 死亡后的读档界面
 *   G.ui.showIntro()             —— 开场/角色创建（决定 name+gender 后调 G.engine.newGameStart）
 *
 * 引擎侧启动接口：
 *   G.engine.newGameStart(opts)  —— 用 opts:{name,gender} 开新局并进入安全屋
 *   G.engine.boot()              —— 启动：有自动档则载入，否则进开场/默认新局
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  G.engine = G.engine || {};

  // ---- G.ui 占位（仅在缺失时补，M2 的真实实现会被保留） ------------------
  G.ui = G.ui || {};
  function stub(name, fn) {
    if (!G.ui[name]) { fn.__stub = true; G.ui[name] = fn; }
  }
  stub('showLocation', function () { console.log('[ui:stub] showLocation @', G.state && G.state.player.location); });
  stub('showPassage', function (id) { console.log('[ui:stub] showPassage:', id); });
  stub('refresh', function () { /* no-op */ });
  stub('showCombat', function (c) { console.log('[ui:stub] showCombat vs', c.enemies.map(function (e) { return e.name; }).join('、')); });
  stub('showShop', function (id) { console.log('[ui:stub] showShop:', id); });
  stub('showDeath', function (cause) { console.log('[ui:stub] showDeath:', cause); });
  stub('showIntro', function () { console.log('[ui:stub] showIntro（无 UI，退回默认开局）'); });

  // ---- 启动流程 -----------------------------------------------------------
  function newGameStart(opts) {
    G.state = G.engine.newGame(opts || {});
    if (G.ui.refresh) G.ui.refresh();
    G.engine.goLocation(G.state.player.location);
    return G.state;
  }
  G.engine.newGameStart = newGameStart;

  function boot() {
    try {
      if (G.engine.hasSave('auto')) { G.engine.load('auto'); return; }
      // 无自动档：若有真实开场界面则走角色创建，否则以默认值直接开局
      if (G.ui.showIntro && !G.ui.showIntro.__stub) { G.ui.showIntro(); return; }
      newGameStart();
    } catch (e) {
      console.error('[main] 启动失败:', e);
    }
  }
  G.engine.boot = boot;

  // ---- 全局错误兜底 -------------------------------------------------------
  if (typeof window !== 'undefined' && window.addEventListener) {
    window.addEventListener('error', function (ev) {
      console.error('[main] 未捕获错误:', ev.error || ev.message);
    });
    window.addEventListener('unhandledrejection', function (ev) {
      console.error('[main] 未处理的 Promise 拒绝:', ev.reason);
    });
  }

  // ---- 自动启动（浏览器环境） ---------------------------------------------
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', boot);
    } else {
      boot();
    }
  }

})();
