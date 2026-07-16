/* =============================================================================
 * render.js — 应用外壳 / 顶栏 / 状态条 / 主区域（地点·passage·战斗）/ 开局 / 死亡
 * -----------------------------------------------------------------------------
 * 实现 M1 main.js 要求的全部 G.ui 接口：
 *   G.ui.showLocation() / showPassage(id) / refresh() / showCombat(combat)
 *   G.ui.showShop(shopId) —— 薄转发，真正实现在 panels.js（G.ui.panels.openShop）
 *   G.ui.showDeath(cause) / showIntro()
 *
 * 本文件新增并登记的 G.ui 接口（panels.js / _demo.js 可用）：
 *   G.ui.openOverlay(opts)     —— 通用浮层外壳，opts:{title, center?, build(bodyEl,closeFn), onClose?}
 *                                  返回 {root,body,close,refresh()}；面板/商店/道具详情都基于它。
 *   G.ui.toast(msg)            —— 顶部短暂提示（战斗终局文本、错误提示等）。
 *   G.ui._h(tag, attrs, kids)  —— 极简 DOM 构造器（attrs 支持 class/text/html/style(对象)/on*）。
 *   G.ui._clear(el)            —— 清空节点子元素。
 *   G.ui.panels                —— 命名空间，由 panels.js 填充 open(name)/openShop(id)。
 *
 * G.data.locations 结构（M3 交付，M2 先行约定，Schema 未定义部分见此）：
 *   { id:{ name, desc(string|fn(state)), adj:[locId...], npcs:[npcId...]（可选，静态候场名单）,
 *          actions:[ {label, cond?, fx?} ]（复用 Schema 条件/效果 DSL） } }
 *   NPC 到场判定：若 G.engine.npcsAt(locId) 存在（M4 作息表函数）优先使用，否则退化为 def.npcs 静态名单。
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  G.ui = G.ui || {};
  G.data = G.data || {};

  // ---- 极简 DOM 构造器 ------------------------------------------------------
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    attrs = attrs || {};
    for (var k in attrs) {
      var v = attrs[k];
      if (v == null) continue;
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') { for (var sk in v) el.style[sk] = v[sk]; }
      else if (k.indexOf('on') === 0 && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    }
    if (kids != null) {
      (Array.isArray(kids) ? kids : [kids]).forEach(function (c) {
        if (c == null) return;
        el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
      });
    }
    return el;
  }
  function clearNode(el) { while (el && el.firstChild) el.removeChild(el.firstChild); }
  G.ui._h = h;
  G.ui._clear = clearNode;

  function S() { return G.state; }

  // ---- 浮层外壳（面板/商店/道具详情共用） -----------------------------------
  function openOverlay(opts) {
    opts = opts || {};
    var back = h('div', { class: 'overlay' + (opts.center ? ' center' : '') });
    var panel = h('div', { class: 'overlay-panel' });
    var header = h('div', { class: 'panel-header' });
    header.appendChild(h('h2', { text: opts.title || '' }));
    var closeFn = function () { if (back.parentNode) back.parentNode.removeChild(back); if (opts.onClose) opts.onClose(); };
    header.appendChild(h('button', { class: 'panel-close', text: '✕', onclick: closeFn }));
    panel.appendChild(header);
    var body = h('div', { class: 'panel-body' });
    panel.appendChild(body);
    back.appendChild(panel);
    back.addEventListener('click', function (e) { if (e.target === back) closeFn(); });
    document.body.appendChild(back);
    var api = {
      root: back, body: body, close: closeFn,
      refresh: function () { clearNode(body); if (opts.build) opts.build(body, closeFn); }
    };
    if (opts.build) opts.build(body, closeFn);
    return api;
  }
  G.ui.openOverlay = openOverlay;

  // ---- 短暂提示 ---------------------------------------------------------------
  var toastTimer = null;
  function toast(msg) {
    var old = document.querySelector('.toast');
    if (old && old.parentNode) old.parentNode.removeChild(old);
    var t = h('div', { class: 'toast', text: msg });
    document.body.appendChild(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 2600);
  }
  G.ui.toast = toast;

  // ---- 应用外壳（顶栏/状态条/主区域/底部导航），构建一次后复用节点 -----------
  var shellBuilt = false, topbarEl, statusEl, mainEl, bottomnavEl;

  // 每次「切换主屏幕内容」自增，供 doAction 判断行动途中是否已被 tick 事件抢先导航
  var navSeq = 0;

  function timeIcon() {
    var t = G.engine.timeOfDay();
    return { '清晨': '🌅', '白天': '☀️', '黄昏': '🌇', '夜晚': '🌙' }[t] || '🕐';
  }
  function locName(id) {
    var def = G.data.locations && G.data.locations[id];
    return (def && def.name) || id || '';
  }

  var NAV_ITEMS = [
    { name: 'map', icon: '🗺️', label: '地图' },
    { name: 'inventory', icon: '🎒', label: '背包' },
    { name: 'body', icon: '❤', label: '身体' },
    { name: 'calendar', icon: '📅', label: '日历' },
    { name: 'system', icon: '⚙', label: '系统' }
  ];

  function buildShell() {
    if (shellBuilt) return;
    topbarEl = h('div', { class: 'topbar' });
    statusEl = h('div', { class: 'statusbar', onclick: function () { openPanelSafe('body'); } });
    mainEl = h('div', { class: 'main', id: 'main' });
    bottomnavEl = h('div', { class: 'bottomnav' });
    NAV_ITEMS.forEach(function (it) {
      var btn = h('button', { class: 'navbtn', onclick: function () { openPanelSafe(it.name); } });
      btn.appendChild(h('span', { class: 'navicon', text: it.icon }));
      btn.appendChild(h('span', { class: 'navlabel', text: it.label }));
      bottomnavEl.appendChild(btn);
    });
    shellBuilt = true;
  }
  function openPanelSafe(name) {
    if (G.ui.panels && G.ui.panels.open) G.ui.panels.open(name);
  }

  function showGameShell() {
    buildShell();
    var app = document.getElementById('app');
    clearNode(app);
    app.appendChild(topbarEl);
    app.appendChild(statusEl);
    app.appendChild(mainEl);
    app.appendChild(bottomnavEl);
  }
  function showFullScreen(el) {
    var app = document.getElementById('app');
    clearNode(app);
    app.appendChild(el);
  }
  G.ui._mainEl = function () { return mainEl; }; // 供 panels.js 判断当前是否在游戏内视图

  // ---- 顶栏 / 状态条内容渲染（refresh 驱动） ---------------------------------
  function renderTopbarContent() {
    clearNode(topbarEl);
    if (!S()) return;
    var left = h('button', { class: 'topbar-btn topbar-left', onclick: function () { openPanelSafe('calendar'); } });
    left.appendChild(h('span', { class: 'topbar-icon', text: timeIcon() }));
    left.appendChild(h('span', { class: 'topbar-date', text: G.engine.dateStr() }));
    left.appendChild(h('span', { class: 'topbar-time', text: G.engine.timeStr() }));
    var right = h('div', { class: 'topbar-right' });
    right.appendChild(h('span', { class: 'topbar-bullets', text: '● ' + S().player.bullets }));
    right.appendChild(h('span', { class: 'topbar-loc', text: locName(S().player.location) }));
    topbarEl.appendChild(left);
    topbarEl.appendChild(right);
  }

  var STATUS_ITEMS = [
    { key: 'hp', label: '生命' },
    { key: 'hunger', label: '饥饿' },
    { key: 'thirst', label: '口渴' },
    { key: 'energy', label: '精力' }
  ];
  function renderStatusbarContent() {
    clearNode(statusEl);
    if (!S()) return;
    STATUS_ITEMS.forEach(function (it) {
      var val = G.engine.statGet(it.key);
      var low = it.key === 'energy' ? val < G.TUNE.T_ENERGY : (it.key === 'hp' ? val < 30 : val < G.TUNE.T_STARVE);
      var wrap = h('div', { class: 'statusbar-item' });
      var lab = h('div', { class: 'statusbar-label' });
      lab.appendChild(h('span', { text: it.label }));
      lab.appendChild(h('span', { text: Math.round(val) }));
      var track = h('div', { class: 'statusbar-track' });
      track.appendChild(h('div', { class: 'statusbar-fill ' + it.key + (low ? ' low' : ''), style: { width: G.engine.clamp(val, 0, 100) + '%' } }));
      wrap.appendChild(lab); wrap.appendChild(track);
      statusEl.appendChild(wrap);
    });
  }

  function refresh() {
    buildShell();
    renderTopbarContent();
    renderStatusbarContent();
  }
  G.ui.refresh = refresh;

  // ---- 地点主界面 -------------------------------------------------------------
  function npcsAtLocation(locId) {
    if (G.engine.npcsAt) return G.engine.npcsAt(locId);
    var def = G.data.locations && G.data.locations[locId];
    if (!def || !def.npcs) return [];
    return def.npcs.filter(function (id) {
      var n = S().npcs[id];
      return n && n.alive;
    });
  }

  function talkTo(id, ndef) {
    if (ndef && ndef.talkPassage) { G.engine.openPassage(ndef.talkPassage); return; }
    if (G.engine.talkTo) { G.engine.talkTo(id); return; }
    toast((ndef && ndef.name || id) + '：暂无更多对话（M4/M5 补充）');
  }

  function cloneFxWithTimeScaled(fx) {
    if (!fx || !fx.time) return fx;
    var copy = {};
    for (var k in fx) copy[k] = fx[k];
    copy.time = Math.round(fx.time * G.engine.timeCostMod());
    return copy;
  }

  // M3 的地点数据（js/data/locations.js）里 home/bar/church 的 actions 是空数组——
  // 睡觉、以及去挂在某地点的交易 NPC 处交易，由 M3 头部注释明确交给 M2 UI 直接调引擎接口。
  // 这里的「补充行动」用的是 M2 自定义的简单 {label, cond?, fx?} / {label, sleep} 形状，
  // 与下面 M3 数据行动 {id,label,type,time,energy,requiresItem}（走 G.engine.scavenge）是两套东西。
  var LOCATION_EXTRA_ACTIONS = {
    home: [{ label: '睡到天亮（恢复精力与生命）', sleep: 8 }]
  };
  function tradeActionsFor(locId) {
    var trade = G.data.trade || {};
    var out = [];
    Object.keys(trade).forEach(function (shopId) {
      var t = trade[shopId];
      if (t.location !== locId) return;
      var npcDef = (G.data.npcs && G.data.npcs[t.npc]) || {};
      out.push({ label: '找' + (npcDef.name || t.npc || '摊主') + '交易', fx: { shop: shopId } });
    });
    return out;
  }

  // action.fx.time 推进过程中可能跨整点触发 tick 事件并直接切到别的 passage
  // （见 G.engine.advance）；navSeq 用于判断这种「行动途中已经换过画面」的情况，
  // 避免行动结束后的兜底 showLocation() 覆盖掉那个画面。
  function doAction(action) {
    if (action.cond && !G.engine.checkCond(action.cond)) return;
    var seq0 = navSeq;
    if (action.sleep) {
      G.engine.sleep(action.sleep);
      if (S() && S()._dead) return;
      if (navSeq === seq0) G.ui.showLocation();
      return;
    }
    var nav = G.engine.applyFx(cloneFxWithTimeScaled(action.fx));
    if (S() && S()._dead) return; // 行动期间可能触发死亡（如饥渴掉血），交给 onDeath 的 showDeath 接管
    if (nav.combat) { G.engine.startCombat(nav.combat, { returnPassage: nav.goto }); return; }
    if (nav.shop) { G.ui.showShop(nav.shop); return; }
    if (nav.goto) { G.engine.openPassage(nav.goto); return; }
    if (navSeq !== seq0) return;
    var ev = G.engine.checkEvents('action');
    if (!ev) G.ui.showLocation();
  }

  // M3 数据行动（目前仅 type:'scavenge'，交给 G.engine.scavenge 处理掉落/耗时/事件结算）
  function runDataAction(locId, action) {
    if (action.type !== 'scavenge') { console.warn('[ui] 未知地点行动类型:', action.type); return; }
    var seq0 = navSeq;
    var res = G.engine.scavenge(locId, action.id);
    if (S() && S()._dead) return;
    if (res && res.msg) toast(G.ui.tags.strip(res.msg));
    if (navSeq === seq0) G.ui.showLocation();
  }

  function travel(destId) {
    var res = G.engine.travelTo(destId);
    if (!res.ok && !res.died) toast(res.msg); // died 时 advance() 内部已经切到死亡界面，这里不再提示
  }

  function renderLocationView() {
    var el = mainEl;
    clearNode(el);
    var locId = S().player.location;
    var def = G.data.locations && G.data.locations[locId];
    if (!def) {
      el.appendChild(h('div', { class: 'passage-text', text: '（地点数据缺失：' + locId + '，等待 M3 数据接入）' }));
      return;
    }
    var desc = h('div', { class: 'location-desc' });
    var descText = G.engine.locationDesc ? G.engine.locationDesc(locId) : (def.name || '');
    desc.innerHTML = G.ui.tags.parse(descText);
    el.appendChild(desc);

    var npcIds = npcsAtLocation(locId);
    if (npcIds.length) {
      el.appendChild(h('div', { class: 'section-title', text: '在场' }));
      var npcWrap = h('div', { class: 'location-npcs' });
      npcIds.forEach(function (id) {
        var ndef = (G.data.npcs && G.data.npcs[id]) || {};
        var chip = h('div', { class: 'npc-chip', onclick: function () { talkTo(id, ndef); } });
        chip.appendChild(h('span', { class: 'dot', style: { background: G.ui.tags.npcColor(id) } }));
        chip.appendChild(h('span', { text: ndef.name || id }));
        npcWrap.appendChild(chip);
      });
      el.appendChild(npcWrap);
    }

    var dataActions = def.actions || [];
    var extraActions = (LOCATION_EXTRA_ACTIONS[locId] || []).concat(tradeActionsFor(locId))
      .filter(function (a) { return !a.cond || G.engine.checkCond(a.cond); });
    if (dataActions.length || extraActions.length) {
      el.appendChild(h('div', { class: 'section-title', text: '行动' }));
      var alist = h('div', { class: 'action-list' });
      dataActions.forEach(function (a) {
        var btn = h('button', { class: 'btn', onclick: function () { runDataAction(locId, a); } });
        btn.innerHTML = G.ui.tags.parse(a.label || '');
        alist.appendChild(btn);
      });
      extraActions.forEach(function (a) {
        var btn = h('button', { class: 'btn', onclick: function () { doAction(a); } });
        btn.innerHTML = G.ui.tags.parse(a.label || '');
        alist.appendChild(btn);
      });
      el.appendChild(alist);
    }

    var neighbors = G.engine.locationNeighbors ? G.engine.locationNeighbors(locId) : {};
    var destIds = Object.keys(neighbors);
    if (destIds.length) {
      el.appendChild(h('div', { class: 'section-title', text: '移动' }));
      var mlist = h('div', { class: 'move-list' });
      destIds.forEach(function (id) {
        var mdef = (G.data.locations && G.data.locations[id]) || {};
        var closed = mdef.hours && G.engine.isLocationOpen && !G.engine.isLocationOpen(id);
        var label = (mdef.name || id) + '（约 ' + neighbors[id] + ' 分钟）' + (closed ? ' · 当前未开放' : '');
        mlist.appendChild(h('button', { class: 'btn', text: label, onclick: function () { travel(id); } }));
      });
      el.appendChild(mlist);
    }
  }

  function showLocation() {
    navSeq++;
    showGameShell();
    renderLocationView();
    refresh();
    if (G.engine.autoSave) G.engine.autoSave(); // 回到地点主界面时机较稳定，顺手保自动档
  }
  G.ui.showLocation = showLocation;

  // ---- passage 渲染 -------------------------------------------------------
  function showPassage(id) {
    navSeq++;
    showGameShell();
    var el = mainEl;
    clearNode(el);
    var text = G.engine.passageText(id);
    var textDiv = h('div', { class: 'passage-text' });
    textDiv.innerHTML = G.ui.tags.parse(text);
    el.appendChild(textDiv);

    var choices = G.engine.passageChoices(id);
    var list = h('div', { class: 'choice-list' });
    if (choices.length) {
      choices.forEach(function (c) {
        var btn = h('button', { class: 'btn', onclick: function () { G.engine.selectChoice(c); } });
        btn.innerHTML = G.ui.tags.parse(c.label || '');
        list.appendChild(btn);
      });
    } else {
      list.appendChild(h('button', { class: 'btn primary', text: '继续', onclick: function () { G.ui.showLocation(); } }));
    }
    el.appendChild(list);
    refresh();
  }
  G.ui.showPassage = showPassage;

  // ---- 战斗界面 -------------------------------------------------------------
  // combatHistory：本地会话内的回合日志累积（G.state.combat.log 每回合会被引擎清空，只保留当回合文本）
  var combatHistory = [];
  function pushCombatRound(combat) {
    if (combat.turn === 0) { combatHistory = []; return; }
    var last = combatHistory[combatHistory.length - 1];
    if (combat.log && combat.log.length && (!last || last.turn !== combat.turn)) {
      combatHistory.push({ turn: combat.turn, lines: combat.log.slice() });
    }
  }

  function renderCombatView(combat) {
    var el = mainEl;
    clearNode(el);
    var screen = h('div', { class: 'combat-screen' });

    var erow = h('div', { class: 'enemy-row' });
    combat.enemies.forEach(function (e) {
      var card = h('div', { class: 'enemy-card' + (e.alive ? '' : ' dead') });
      card.appendChild(h('div', { class: 'ename', text: e.name }));
      var track = h('div', { class: 'hp-track' });
      var pct = Math.max(0, e.hp) / (e.maxHp || 1) * 100;
      track.appendChild(h('div', { class: 'hp-fill', style: { width: pct + '%' } }));
      card.appendChild(track);
      card.appendChild(h('div', { style: { fontSize: '11px', color: 'var(--fg-dim)', marginTop: '2px' }, text: Math.max(0, e.hp) + '/' + e.maxHp }));
      erow.appendChild(card);
    });
    screen.appendChild(erow);

    var w = S().player.weapon;
    var wdef = w && G.engine.itemDef(w.id);
    var wtext = w ? ((wdef && wdef.name) || w.id) + '（耐久 ' + w.durability + '）' : '赤手空拳';
    screen.appendChild(h('div', { class: 'combat-weapon', text: '武器：' + wtext }));

    var log = h('div', { class: 'combat-log' });
    combatHistory.forEach(function (round) {
      log.appendChild(h('div', { class: 'line turn-sep', text: '—— 第 ' + round.turn + ' 回合 ——' }));
      round.lines.forEach(function (line) {
        var d = h('div', { class: 'line' });
        d.innerHTML = G.ui.tags.parse(line);
        log.appendChild(d);
      });
    });
    screen.appendChild(log);

    var actions = h('div', { class: 'combat-actions' });
    function actBtn(label, action) {
      return h('button', { class: 'btn', text: label, onclick: function () { runCombatAction(action); } });
    }
    actions.appendChild(actBtn('攻击', 'attack'));
    actions.appendChild(actBtn('重击', 'heavy'));
    actions.appendChild(actBtn('防御', 'defend'));
    actions.appendChild(h('button', { class: 'btn', text: '用道具', onclick: openCombatItemPicker }));
    actions.appendChild(actBtn('逃跑', 'flee'));
    screen.appendChild(actions);

    el.appendChild(screen);
    log.scrollTop = log.scrollHeight;
  }

  function runCombatAction(action, param) {
    var res = G.engine.combatAction(action, param);
    // win/lose/flee：引擎已在 combatAction 内部完成导航（切走了战斗界面），
    // 该终局回合的文本不会再经 showCombat 呈现，这里用 toast 补一条摘要。
    if (res.status !== 'ongoing' && res.status !== 'none' && res.log && res.log.length) {
      toast(res.log.map(function (l) { return G.ui.tags.strip(l); }).join(' '));
    }
  }

  function openCombatItemPicker() {
    openOverlay({
      title: '使用道具',
      build: function (body, close) {
        var inv = (S().player.inventory || []).filter(function (e) {
          var def = G.engine.itemDef(e.id);
          return def && def.type !== 'weapon';
        });
        if (!inv.length) { body.appendChild(h('div', { class: 'inv-empty', text: '没有可用道具' })); return; }
        var list = h('div', { class: 'inv-list' });
        inv.forEach(function (entry) {
          var def = G.engine.itemDef(entry.id) || {};
          var row = h('div', { class: 'inv-item', onclick: function () { close(); runCombatAction('item', entry.id); } });
          row.appendChild(h('span', { class: 'name', text: def.name || entry.id }));
          row.appendChild(h('span', { class: 'count', text: '×' + entry.count }));
          list.appendChild(row);
        });
        body.appendChild(list);
      }
    });
  }

  function showCombat(combat) {
    navSeq++;
    showGameShell();
    pushCombatRound(combat);
    renderCombatView(combat);
    refresh();
  }
  G.ui.showCombat = showCombat;

  // ---- 商店（薄转发，实现见 panels.js） --------------------------------------
  function showShop(shopId) {
    if (G.ui.panels && G.ui.panels.openShop) G.ui.panels.openShop(shopId);
    else console.warn('[ui] showShop: panels.js 未加载');
  }
  G.ui.showShop = showShop;

  // ---- 死亡界面 -------------------------------------------------------------
  var DEATH_CAUSE_TEXT = { exhaustion: '力竭而亡', combat: '死于非命', event: '意外身亡' };
  function showDeath(cause) {
    var el = h('div', { class: 'death-screen' });
    el.appendChild(h('div', { class: 'death-title', text: '死亡' }));
    el.appendChild(h('div', { class: 'death-cause', text: DEATH_CAUSE_TEXT[cause] || ('不幸身亡' + (cause ? '（' + cause + '）' : '')) }));
    var saves = G.engine.listSaves();
    var list = h('div', { class: 'slot-list', style: { width: '100%', maxWidth: '320px' } });
    [1, 2, 3, 'auto'].forEach(function (slot) {
      var info = saves[slot];
      if (!info || !info.exists) return;
      var s = info.summary || {};
      var card = h('div', { class: 'slot-card' });
      card.appendChild(h('div', { class: 'slot-title', text: slot === 'auto' ? '自动存档' : '存档 ' + slot }));
      card.appendChild(h('div', { class: 'slot-summary', text: (s.name || '') + ' · 第' + s.day + '天 ' + (s.date || '') + ' ' + (s.time || '') }));
      card.appendChild(h('button', { class: 'btn primary', text: '读取', onclick: function () { G.engine.load(slot); } }));
      list.appendChild(card);
    });
    if (!list.childNodes.length) list.appendChild(h('div', { class: 'inv-empty', text: '没有可用存档' }));
    el.appendChild(list);
    showFullScreen(el);
  }
  G.ui.showDeath = showDeath;

  // ---- 开局流程（性别 + 姓名） ------------------------------------------------
  function showIntro() {
    var gender = 'm';
    var el = h('div', { class: 'intro-screen' });
    el.appendChild(h('div', { class: 'intro-title', text: '临港余生' }));
    el.appendChild(h('div', { class: 'intro-sub', text: '丧尸末日中，你醒在第 90 天的清晨' }));

    var genderWrap = h('div', { class: 'gender-select' });
    var mBtn = h('button', { class: 'gender-btn active', text: '男' });
    var fBtn = h('button', { class: 'gender-btn', text: '女' });
    mBtn.addEventListener('click', function () { gender = 'm'; mBtn.className = 'gender-btn active'; fBtn.className = 'gender-btn'; });
    fBtn.addEventListener('click', function () { gender = 'f'; fBtn.className = 'gender-btn active'; mBtn.className = 'gender-btn'; });
    genderWrap.appendChild(mBtn); genderWrap.appendChild(fBtn);
    el.appendChild(genderWrap);

    var nameInput = h('input', { class: 'name-input', type: 'text', maxlength: '12', placeholder: '为自己起个名字' });
    el.appendChild(nameInput);

    el.appendChild(h('button', {
      class: 'btn primary', text: '开始', style: { textAlign: 'center', minHeight: '48px' },
      onclick: function () {
        var name = (nameInput.value || '').trim() || '无名氏';
        G.engine.newGameStart({ name: name, gender: gender });
      }
    }));

    showFullScreen(el);
  }
  G.ui.showIntro = showIntro;

})();
