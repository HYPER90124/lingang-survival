/* =============================================================================
 * panels.js — 日历 / 背包 / 身体 / 地图 / 系统 面板 + 商店浮层
 * -----------------------------------------------------------------------------
 * 挂载到 G.ui：
 *   G.ui.panels.open(name)   —— name ∈ 'calendar'|'inventory'|'body'|'map'|'system'
 *                                （render.js 的顶栏/状态条/底部导航按此调用）
 *   G.ui.panels.openShop(id) —— 由 G.ui.showShop 转发调用，见 render.js
 *
 * 依赖 render.js 提供的共享内部工具：G.ui._h（DOM 构造）、G.ui._clear、
 * G.ui.openOverlay（浮层外壳）、G.ui.toast。
 *
 * 背包装备/使用与商店买卖/以物易物，均直接调用 M3（js/data/items.js、trade.js）
 * 补齐的 G.engine.equipWeapon/unequipWeapon/useItem/shopBuyableItems/shopBuy/
 * shopSell/tradeOffersToday/barter；「丢弃道具」两边都没提供，这里直接调最底层
 * 的 G.engine.removeItem。地图面板的地点间连通关系用 G.engine.locationNeighbors
 * （M3 提供，含好感/剧情解锁的下水道捷径）。
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  G.ui = G.ui || {};
  G.data = G.data || {};

  var h = G.ui._h, clearNode = G.ui._clear;
  function S() { return G.state; }

  var activeOverlay = null;
  function openTop(opts) {
    if (activeOverlay) { activeOverlay.close(); activeOverlay = null; }
    var userOnClose = opts.onClose;
    var merged = {};
    for (var k in opts) merged[k] = opts[k];
    merged.onClose = function () { activeOverlay = null; if (userOnClose) userOnClose(); };
    activeOverlay = G.ui.openOverlay(merged);
    return activeOverlay;
  }
  function closePanels() { if (activeOverlay) { activeOverlay.close(); activeOverlay = null; } }

  // =========================================================================
  // 日历面板
  // =========================================================================
  // 与 time.js 相同的日历锚点（引擎未导出「日期→绝对天数」的反向换算，这里按
  // 文档固定值复刻；若 M9 调整锚点须同步改这里）：第 0 天 = 2025-07-14。
  var CAL_ANCHOR = Date.UTC(2025, 6, 14);
  function dayOfDate(year, month, date) {
    return Math.round((Date.UTC(year, month - 1, date) - CAL_ANCHOR) / 86400000);
  }
  function daysInMonth(year, month) { return new Date(Date.UTC(year, month, 0)).getUTCDate(); }

  function dayMarks(offset) {
    var marks = [];
    var cal = S().calendar;
    if (cal.appointments.some(function (a) { return a.day === offset; })) marks.push('appt');
    if (cal.milestones.some(function (m) { return m.day === offset; })) marks.push('milestone');
    var wd = G.engine.dateOf(offset).weekday;
    var hasCycle = G.data.events && G.data.events.all().some(function (ev) {
      return ev.type === 'scheduled' && ev.cond && ev.cond.weekday === wd;
    });
    if (hasCycle) marks.push('cycle');
    return marks;
  }
  function dayItems(offset) {
    var out = [];
    S().calendar.appointments.filter(function (a) { return a.day === offset; }).forEach(function (a) {
      out.push('📌 ' + (a.label || a.eventId || '约定') + (a.done ? '（已完成）' : ''));
    });
    S().calendar.milestones.filter(function (m) { return m.day === offset; }).forEach(function (m) {
      out.push('★ ' + m.label);
    });
    var wd = G.engine.dateOf(offset).weekday;
    (G.data.events ? G.data.events.all() : []).filter(function (ev) {
      return ev.type === 'scheduled' && ev.cond && ev.cond.weekday === wd;
    }).forEach(function (ev) { out.push('🔁 周期事件：' + ev.id); });
    return out;
  }

  function openCalendar() {
    var today = G.engine.dateOf(S().player.day);
    var viewYear = today.year, viewMonth = today.month, selectedDay = S().player.day;
    var ov = openTop({
      title: '日历',
      build: function (body) {
        var head = h('div', { class: 'cal-head' });
        head.appendChild(h('button', {
          text: '‹', onclick: function () {
            viewMonth--; if (viewMonth < 1) { viewMonth = 12; viewYear--; } ov.refresh();
          }
        }));
        head.appendChild(h('div', { text: viewYear + '年' + viewMonth + '月' }));
        head.appendChild(h('button', {
          text: '›', onclick: function () {
            viewMonth++; if (viewMonth > 12) { viewMonth = 1; viewYear++; } ov.refresh();
          }
        }));
        body.appendChild(head);

        var grid = h('div', { class: 'cal-grid' });
        ['一', '二', '三', '四', '五', '六', '日'].forEach(function (w) { grid.appendChild(h('div', { class: 'cal-wd', text: w })); });
        var firstOffset = dayOfDate(viewYear, viewMonth, 1);
        var firstWd = G.engine.dateOf(firstOffset).weekday;
        for (var i = 0; i < firstWd; i++) grid.appendChild(h('div', { class: 'cal-cell pad' }));
        var dim = daysInMonth(viewYear, viewMonth);
        for (var d = 1; d <= dim; d++) {
          var offset = dayOfDate(viewYear, viewMonth, d);
          var cell = h('div', { class: 'cal-cell' + (offset === S().player.day ? ' today' : '') });
          cell.appendChild(document.createTextNode(String(d)));
          var marks = dayMarks(offset);
          if (marks.length) {
            var dots = h('div', { class: 'dots' });
            marks.forEach(function (m) { dots.appendChild(h('i', { class: 'cal-dot-' + m })); });
            cell.appendChild(dots);
          }
          (function (off) { cell.addEventListener('click', function () { selectedDay = off; renderDetail(); }); })(offset);
          grid.appendChild(cell);
        }
        body.appendChild(grid);

        var legend = h('div', { class: 'cal-legend' });
        legend.appendChild(h('span', { html: '<i class="cal-dot-appt"></i>约定' }));
        legend.appendChild(h('span', { html: '<i class="cal-dot-cycle"></i>周期事件' }));
        legend.appendChild(h('span', { html: '<i class="cal-dot-milestone"></i>重要日子' }));
        body.appendChild(legend);

        var detail = h('div', { class: 'cal-day-detail' });
        body.appendChild(detail);
        function renderDetail() {
          clearNode(detail);
          var dt = G.engine.dateOf(selectedDay);
          detail.appendChild(h('div', { text: dt.md + ' ' + dt.weekdayName + (selectedDay === S().player.day ? '（今天）' : '') }));
          var items = dayItems(selectedDay);
          if (!items.length) { detail.appendChild(h('div', { style: { color: 'var(--fg-dim)', marginTop: '6px' }, text: '无登记条目' })); return; }
          items.forEach(function (it) { detail.appendChild(h('div', { style: { marginTop: '4px' }, text: it })); });
        }
        renderDetail();
      }
    });
  }

  // =========================================================================
  // 背包面板
  // =========================================================================
  var INV_CATS = [
    { key: 'all', label: '全部' }, { key: 'weapon', label: '武器' }, { key: 'med', label: '药品' },
    { key: 'food', label: '食物' }, { key: 'drink', label: '饮水' }, { key: 'material', label: '材料' },
    { key: 'key', label: '关键' }, { key: 'misc', label: '杂物' }
  ];

  // 装备/卸下/使用由 M3 的 js/data/items.js 提供（G.engine.equipWeapon/unequipWeapon/useItem）；
  // 丢弃道具 M1/M3 均未提供对应函数，直接调最底层的 removeItem。
  function equipWeapon(id) { G.engine.equipWeapon(id); G.ui.refresh(); }
  function unequipWeapon() { G.engine.unequipWeapon(); G.ui.refresh(); }
  function useItem(id) {
    var res = G.engine.useItem(id);
    if (res && res.msg) G.ui.toast(G.ui.tags.strip(res.msg));
    G.ui.refresh();
  }
  function dropItem(id) { G.engine.removeItem(id, 1); G.ui.refresh(); }

  function openItemDetail(entry) {
    var def = G.engine.itemDef(entry.id) || { name: entry.id, desc: '', type: 'misc' };
    G.ui.openOverlay({
      title: def.name || entry.id, center: true,
      build: function (body2, close2) {
        var wrap = h('div', { class: 'item-detail-body' });
        wrap.appendChild(h('div', { class: 'item-detail-desc', text: def.desc || '' }));
        var meta = [];
        if (def.type) meta.push('类型：' + def.type);
        if (def.weight != null) meta.push('重量：' + def.weight);
        if (def.price != null) meta.push('参考价：' + def.price);
        if (entry.durability != null) meta.push('耐久：' + entry.durability + (def.durMax ? ('/' + def.durMax) : ''));
        wrap.appendChild(h('div', { class: 'item-detail-meta', text: meta.join(' · ') }));

        var actions = h('div', { class: 'item-actions' });
        if (def.type === 'weapon') {
          if (entry.equipped) {
            actions.appendChild(h('button', { class: 'btn', text: '卸下', onclick: function () { unequipWeapon(); close2(); if (activeOverlay) activeOverlay.refresh(); } }));
          } else {
            actions.appendChild(h('button', { class: 'btn primary', text: '装备', onclick: function () { equipWeapon(entry.id); close2(); if (activeOverlay) activeOverlay.refresh(); } }));
          }
        } else if (def.fx) {
          actions.appendChild(h('button', { class: 'btn primary', text: '使用', onclick: function () { useItem(entry.id); close2(); if (activeOverlay) activeOverlay.refresh(); } }));
        }
        if (!entry.equipped) {
          actions.appendChild(h('button', { class: 'btn danger', text: '丢弃', onclick: function () { dropItem(entry.id); close2(); if (activeOverlay) activeOverlay.refresh(); } }));
        }
        wrap.appendChild(actions);
        body2.appendChild(wrap);
      }
    });
  }

  function openInventory() {
    var activeCat = 'all';
    openTop({
      title: '背包',
      build: function (body) {
        var tabs = h('div', { class: 'inv-tabs' });
        INV_CATS.forEach(function (c) {
          tabs.appendChild(h('button', {
            class: 'inv-tab' + (c.key === activeCat ? ' active' : ''), text: c.label,
            onclick: function () { activeCat = c.key; activeOverlay.refresh(); }
          }));
        });
        body.appendChild(tabs);

        var weight = G.engine.invWeight(), cap = G.engine.carryCap();
        body.appendChild(h('div', {
          class: 'inv-weight' + (weight > cap ? ' over' : ''),
          text: '负重 ' + weight.toFixed(1) + ' / ' + cap + (weight > cap ? '（超重，无法快速撤离）' : '')
        }));

        var list = h('div', { class: 'inv-list' });
        var shown = 0;
        if (S().player.weapon && (activeCat === 'all' || activeCat === 'weapon')) {
          var w = S().player.weapon, wdef = G.engine.itemDef(w.id) || {};
          var row = h('div', {
            class: 'inv-item',
            onclick: function () { openItemDetail({ id: w.id, count: 1, durability: w.durability, equipped: true }); }
          });
          row.appendChild(h('span', { class: 'name equipped', text: wdef.name || w.id }));
          row.appendChild(h('span', { class: 'count', text: '耐久' + w.durability }));
          list.appendChild(row); shown++;
        }
        (S().player.inventory || []).forEach(function (entry) {
          var def = G.engine.itemDef(entry.id) || {};
          var type = def.type || 'misc';
          if (activeCat !== 'all' && type !== activeCat) return;
          shown++;
          var row = h('div', { class: 'inv-item', onclick: function () { openItemDetail(entry); } });
          row.appendChild(h('span', { class: 'name', text: def.name || entry.id }));
          row.appendChild(h('span', { class: 'count', text: type === 'weapon' ? '耐久' + entry.durability : '×' + entry.count }));
          list.appendChild(row);
        });
        if (!shown) list.appendChild(h('div', { class: 'inv-empty', text: '空空如也' }));
        body.appendChild(list);
      }
    });
  }

  // =========================================================================
  // 身体面板
  // =========================================================================
  var BODY_STATS = [
    { key: 'hp', label: '生命', abnormal: function (v) { return v < 30; }, note: function (v) { return v < 30 ? '生命垂危' : ''; } },
    { key: 'hunger', label: '饥饿', abnormal: function (v) { return v < G.TUNE.T_STARVE; }, note: function (v) { return v < G.TUNE.T_STARVE ? '饥饿难耐，持续掉血' : ''; } },
    { key: 'thirst', label: '口渴', abnormal: function (v) { return v < G.TUNE.T_STARVE; }, note: function (v) { return v < G.TUNE.T_STARVE ? '干渴难忍，持续掉血' : ''; } },
    { key: 'energy', label: '精力', abnormal: function (v) { return v < G.TUNE.T_ENERGY; }, note: function (v) { return v < G.TUNE.T_ENERGY ? '精疲力竭，行动耗时 +50%' : ''; } },
    { key: 'sanity', label: '理智', abnormal: function (v) { return v < G.TUNE.T_SANITY; }, note: function (v) { return v < G.TUNE.T_SANITY ? '理智濒临崩溃，可能出现幻觉' : ''; } },
    { key: 'alcohol', label: '酒精', abnormal: function (v) { return v > G.TUNE.T_DRUNK; }, note: function (v) { return v > G.TUNE.T_DRUNK ? '酩酊大醉，判定受罚' : ''; } },
    { key: 'addiction', label: '成瘾', abnormal: function (v) { return v > G.TUNE.T_ADDICT; }, note: function (v) { return v > G.TUNE.T_ADDICT ? '瘾发难耐，每日发作' : ''; } },
    { key: 'infection', label: '感染', abnormal: function (v) { return v > G.TUNE.T_INFECT; }, note: function (v) { return v > G.TUNE.T_INFECT ? '感染濒危，命悬一线' : ''; } }
  ];
  function openBody() {
    openTop({
      title: '身体状态',
      build: function (body) {
        var grid = h('div', { class: 'body-grid' });
        BODY_STATS.forEach(function (st) {
          var v = G.engine.statGet(st.key);
          var abn = st.abnormal(v);
          var wrap = h('div', { class: 'body-stat' + (abn ? ' abnormal' : '') });
          var lab = h('div', { class: 'label' });
          lab.appendChild(h('span', { text: st.label }));
          lab.appendChild(h('span', { class: 'val', text: Math.round(v) }));
          wrap.appendChild(lab);
          var track = h('div', { class: 'track' });
          track.appendChild(h('div', { class: 'fill', style: { width: G.engine.clamp(v, 0, 100) + '%', background: abn ? 'var(--danger)' : 'var(--accent)' } }));
          wrap.appendChild(track);
          var note = st.note(v);
          if (note) wrap.appendChild(h('div', { class: 'note', text: note }));
          grid.appendChild(wrap);
        });
        body.appendChild(grid);
      }
    });
  }

  // =========================================================================
  // 地图面板
  // =========================================================================
  var SVG_NS = 'http://www.w3.org/2000/svg';
  function svgEl(tag, attrs) {
    var el = document.createElementNS(SVG_NS, tag);
    for (var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }
  // M11：按 G.data.locations[id].mapPos（0–100 逻辑坐标）真实摆放，替代原环形自动布局；
  // 缺 mapPos 的地点（理论上不存在，防御性兜底）落在画布中心。
  function openMap() {
    openTop({
      title: '地图',
      build: function (body) {
        var locs = G.data.locations || {};
        var ids = Object.keys(locs);
        if (!ids.length) { body.appendChild(h('div', { class: 'inv-empty', text: '地图数据未加载（等待 M3）' })); return; }
        var cur = S().player.location;
        var neighbors = G.engine.locationNeighbors ? G.engine.locationNeighbors(cur) : {};
        var shortcutUnlocked = !!(G.engine.getFlag && G.engine.getFlag('world.sewerShortcut'));

        var size = 300, pad = 32, span = size - 2 * pad;
        var pos = {};
        ids.forEach(function (id) {
          var mp = locs[id].mapPos || { x: 50, y: 50 };
          pos[id] = { x: pad + (mp.x / 100) * span, y: pad + (mp.y / 100) * span };
        });

        var svg = svgEl('svg', { viewBox: '0 0 ' + size + ' ' + size, class: 'map-svg' });
        function midLabel(a, b, minutes) {
          var t = svgEl('text', { class: 'map-edge-label', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
          t.textContent = minutes + '分';
          return t;
        }
        // 相邻地点连线（实线，标注移动分钟数）
        var drawn = {};
        ids.forEach(function (id) {
          Object.keys((locs[id].adjacent) || {}).forEach(function (nb) {
            if (!pos[nb]) return;
            var key = [id, nb].sort().join('-');
            if (drawn[key]) return; drawn[key] = true;
            svg.appendChild(svgEl('line', { class: 'map-edge', x1: pos[id].x, y1: pos[id].y, x2: pos[nb].x, y2: pos[nb].y }));
            svg.appendChild(midLabel(pos[id], pos[nb], locs[id].adjacent[nb]));
          });
        });
        // 下水道捷径（虚线，仅 world.sewerShortcut 解锁后画出）
        if (shortcutUnlocked) {
          ids.forEach(function (id) {
            Object.keys((locs[id].shortcuts) || {}).forEach(function (nb) {
              if (!pos[nb]) return;
              svg.appendChild(svgEl('line', { class: 'map-edge shortcut', x1: pos[id].x, y1: pos[id].y, x2: pos[nb].x, y2: pos[nb].y }));
              svg.appendChild(midLabel(pos[id], pos[nb], locs[id].shortcuts[nb]));
            });
          });
        }
        // 地点节点：危险度着色（0 绿→3 红）、营业时间外灰显、当前/可达描边
        ids.forEach(function (id) {
          var loc = locs[id];
          var open = G.engine.isLocationOpen ? G.engine.isLocationOpen(id) : true;
          var cls = 'map-node danger-' + (loc.danger || 0)
            + (id === cur ? ' current' : (neighbors[id] != null ? ' adj' : ''))
            + (!open ? ' closed' : '');
          var g = svgEl('g', { class: cls });
          g.appendChild(svgEl('circle', { cx: pos[id].x, cy: pos[id].y, r: id === cur ? 9 : 6 }));
          var t = svgEl('text', { x: pos[id].x, y: pos[id].y + (pos[id].y > size / 2 ? 15 : -10) });
          t.textContent = loc.name || id;
          g.appendChild(t);
          g.addEventListener('click', function () {
            if (id === cur) return;
            if (neighbors[id] == null) { G.ui.toast('不相邻，需先移动到中间地点'); return; }
            var res = G.engine.travelTo(id);
            if (!res.ok && !res.died) { G.ui.toast(res.msg); return; }
            closePanels();
          });
          svg.appendChild(g);
        });

        var wrap = h('div', { class: 'map-wrap' });
        wrap.appendChild(svg);
        body.appendChild(wrap);
        body.appendChild(h('div', { class: 'map-legend', text: '青色描边 = 可直接前往　灰显 = 现在没开门　虚线 = 下水道捷径' }));
        body.appendChild(h('div', { class: 'map-legend', text: '危险度：绿→黄→橙→红（0→3）' }));
      }
    });
  }

  // =========================================================================
  // 系统面板
  // =========================================================================
  function openSystem() {
    openTop({
      title: '系统',
      build: function (body) {
        var slots = G.engine.listSaves();
        var list = h('div', { class: 'slot-list' });
        [1, 2, 3].forEach(function (slot) {
          var info = slots[slot];
          var card = h('div', { class: 'slot-card' });
          card.appendChild(h('div', { class: 'slot-title', text: '存档 ' + slot }));
          if (info && info.exists) {
            var s = info.summary;
            card.appendChild(h('div', { class: 'slot-summary', text: (s.name || '') + ' · 第' + s.day + '天 ' + s.date + ' ' + s.time }));
          } else {
            card.appendChild(h('div', { class: 'slot-summary', text: '空槽位' }));
          }
          var actions = h('div', { class: 'slot-actions' });
          actions.appendChild(h('button', {
            class: 'btn', text: '存档', onclick: function () {
              G.engine.save(slot); G.ui.toast('已存至槽位 ' + slot); activeOverlay.refresh();
            }
          }));
          if (info && info.exists) {
            actions.appendChild(h('button', { class: 'btn primary', text: '读档', onclick: function () { closePanels(); G.engine.load(slot); } }));
            actions.appendChild(h('button', { class: 'btn danger', text: '删除', onclick: function () { G.engine.deleteSave(slot); activeOverlay.refresh(); } }));
          }
          card.appendChild(actions);
          list.appendChild(card);
        });
        var autoInfo = slots['auto'];
        var autoCard = h('div', { class: 'slot-card' });
        autoCard.appendChild(h('div', { class: 'slot-title', text: '自动存档' }));
        autoCard.appendChild(h('div', {
          class: 'slot-summary',
          text: (autoInfo && autoInfo.exists) ? ((autoInfo.summary.name || '') + ' · 第' + autoInfo.summary.day + '天') : '暂无'
        }));
        if (autoInfo && autoInfo.exists) {
          var aa = h('div', { class: 'slot-actions' });
          aa.appendChild(h('button', { class: 'btn primary', text: '读档', onclick: function () { closePanels(); G.engine.load('auto'); } }));
          autoCard.appendChild(aa);
        }
        list.appendChild(autoCard);
        body.appendChild(list);

        body.appendChild(h('div', { class: 'section-title', text: '存档码（导出）' }));
        var exportBox = h('textarea', { class: 'export-box', readonly: 'readonly' });
        exportBox.value = G.engine.exportCode();
        body.appendChild(exportBox);
        var expRow = h('div', { class: 'item-actions', style: { marginTop: '8px' } });
        expRow.appendChild(h('button', {
          class: 'btn', text: '复制', onclick: function () {
            exportBox.focus(); exportBox.select();
            try { document.execCommand('copy'); G.ui.toast('已复制到剪贴板'); }
            catch (e) { G.ui.toast('复制失败，请手动选择文本'); }
          }
        }));
        body.appendChild(expRow);

        body.appendChild(h('div', { class: 'section-title', text: '导入存档码' }));
        var importBox = h('textarea', { class: 'export-box', placeholder: '粘贴存档码' });
        body.appendChild(importBox);
        body.appendChild(h('button', {
          class: 'btn primary', text: '导入', style: { marginTop: '8px' }, onclick: function () {
            if (G.engine.importCode(importBox.value)) { G.ui.toast('导入成功'); closePanels(); }
            else G.ui.toast('存档码无效');
          }
        }));

        body.appendChild(h('div', { class: 'about-text', text: '《临港余生》—— 丧尸末日文字冒险。纯前端实现，存档保存在本机浏览器中。' }));

        // 仅当 _demo.js 已加载（G.data.story 里注册了演示段落）时显示，
        // 供 M2 验收标签渲染 / 战斗界面；M3 数据接入后 _demo.js 移除，本区块自动消失。
        if (G.data.story && G.data.story.get('demo_tags')) {
          body.appendChild(h('div', { class: 'section-title', text: '演示（M2 验收用，正式数据接入后自动消失）' }));
          var demoRow = h('div', { class: 'item-actions' });
          demoRow.appendChild(h('button', { class: 'btn', text: '标签演示', onclick: function () { closePanels(); G.engine.openPassage('demo_tags'); } }));
          demoRow.appendChild(h('button', { class: 'btn', text: '战斗演示', onclick: function () { closePanels(); G.engine.startCombat('demo_pair'); } }));
          body.appendChild(demoRow);
        }
      }
    });
  }

  // =========================================================================
  // 商店（买卖/以物易物逻辑均由 M3 的 js/data/trade.js 提供）
  // =========================================================================
  function shopTitle(shopId, def) {
    var npcDef = (G.data.npcs && G.data.npcs[def.npc]) || {};
    return (npcDef.name || def.npc || shopId) + (def.type === 'barter' ? '·以物易物' : '·交易');
  }
  function openShop(shopId) {
    openTop({
      title: (G.data.trade && G.data.trade[shopId] && shopTitle(shopId, G.data.trade[shopId])) || '交易',
      build: function (body) {
        var def = G.data.trade && G.data.trade[shopId];
        if (!def) { body.appendChild(h('div', { class: 'inv-empty', text: '商店数据缺失：' + shopId })); return; }
        function refreshShop() { if (activeOverlay) activeOverlay.refresh(); G.ui.refresh(); }

        body.appendChild(h('div', { class: 'shop-bullets', text: '子弹：' + S().player.bullets }));

        if (def.type === 'barter') {
          body.appendChild(h('div', { class: 'section-title', text: '今日以物易物' }));
          var offerList = h('div', { class: 'shop-list' });
          var offers = G.engine.tradeOffersToday ? G.engine.tradeOffersToday(shopId) : [];
          offers.forEach(function (o) {
            var giveDef = G.engine.itemDef(o.offer.give.id) || {};
            var wantDef = G.engine.itemDef(o.offer.want.id) || {};
            var row = h('div', { class: 'shop-item' });
            row.appendChild(h('span', { text: (wantDef.name || o.offer.want.id) + '×' + o.offer.want.count + ' 换 ' + (giveDef.name || o.offer.give.id) + '×' + o.offer.give.count }));
            row.appendChild(h('button', {
              class: 'btn', text: '交换', onclick: function () {
                var res = G.engine.barter(shopId, o.index);
                if (res && res.msg) G.ui.toast(G.ui.tags.strip(res.msg));
                refreshShop();
              }
            }));
            offerList.appendChild(row);
          });
          if (!offers.length) offerList.appendChild(h('div', { class: 'inv-empty', text: '今天没有可交换的东西' }));
          body.appendChild(offerList);
          return;
        }

        body.appendChild(h('div', { class: 'section-title', text: '购买' }));
        var buyIds = G.engine.shopBuyableItems ? G.engine.shopBuyableItems(shopId) : [];
        var buyList = h('div', { class: 'shop-list' });
        buyIds.forEach(function (id) {
          var idef = G.engine.itemDef(id); if (!idef) return;
          var row = h('div', { class: 'shop-item' });
          row.appendChild(h('span', { text: idef.name || id }));
          row.appendChild(h('span', { class: 'price', text: (idef.price || 0) + ' 弹' }));
          row.appendChild(h('button', {
            class: 'btn', text: '购买', onclick: function () {
              var res = G.engine.shopBuy(shopId, id, 1);
              if (res && res.msg) G.ui.toast(G.ui.tags.strip(res.msg));
              refreshShop();
            }
          }));
          buyList.appendChild(row);
        });
        if (!buyIds.length) buyList.appendChild(h('div', { class: 'inv-empty', text: '暂无可购' }));
        body.appendChild(buyList);

        body.appendChild(h('div', { class: 'section-title', text: '出售' }));
        var sellList = h('div', { class: 'shop-list' });
        var sellable = (S().player.inventory || []).filter(function (e) {
          var d = G.engine.itemDef(e.id); return d && d.price != null;
        });
        sellable.forEach(function (entry) {
          var idef = G.engine.itemDef(entry.id);
          var value = Math.round((idef.price || 0) * (def.sellRate == null ? 0.5 : def.sellRate));
          var row = h('div', { class: 'shop-item' });
          row.appendChild(h('span', { text: (idef.name || entry.id) + ' ×' + entry.count }));
          row.appendChild(h('span', { class: 'price', text: value + ' 弹' }));
          row.appendChild(h('button', {
            class: 'btn', text: '出售', onclick: function () {
              var res = G.engine.shopSell(shopId, entry.id, 1);
              if (res && res.msg) G.ui.toast(G.ui.tags.strip(res.msg));
              refreshShop();
            }
          }));
          sellList.appendChild(row);
        });
        if (!sellable.length) sellList.appendChild(h('div', { class: 'inv-empty', text: '没有可出售的物品' }));
        body.appendChild(sellList);
      }
    });
  }

  // =========================================================================
  G.ui.panels = {
    open: function (name) {
      if (name === 'calendar') openCalendar();
      else if (name === 'inventory') openInventory();
      else if (name === 'body') openBody();
      else if (name === 'map') openMap();
      else if (name === 'system') openSystem();
      else console.warn('[panels] 未知面板:', name);
    },
    openShop: openShop
  };

})();
