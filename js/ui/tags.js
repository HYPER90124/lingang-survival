/* =============================================================================
 * tags.js — 文字标签解析（Schema「文字标签」节，唯一允许的富文本方式）
 * -----------------------------------------------------------------------------
 * 挂载到 G.ui：
 *
 *   G.ui.tags.parse(text)      —— 将 passage/事件正文中的 [类型:参数]文本[/类型]
 *                                  解析为带 class/内联色的 HTML 字符串（已转义原文）。
 *                                  每次调用独立计数：horror/flash 两个动效标签合计
 *                                  全 passage 最多生效 1 次，超出的降级为纯色 span
 *                                  （仍保留标签自身的红色，只是去掉动效 class）。
 *   G.ui.tags.npcColor(id)     —— 取 NPC 专色：优先读 G.data.npcs[id].color，
 *                                  未注册（M4 前 / 未知 id）时按 id 哈希兜底取色，
 *                                  保证标签在数据未就绪时仍可视。
 *   G.ui.tags.escapeHtml(s)    —— HTML 转义，供其他 UI 文件拼接动态文本时复用。
 *
 * 用法：render.js/panels.js 渲染 passage 正文时用 innerHTML = G.ui.tags.parse(text)，
 * 其余所有来自玩家/数据的动态文本一律用 textContent 或 escapeHtml，禁止裸拼 innerHTML。
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  G.ui = G.ui || {};

  // 标签 → CSS class（颜色见 style.css :root 变量，与 Schema 标签表一一对应）
  var TAG_DEFS = {
    item:   { cls: 'tag-item' },
    place:  { cls: 'tag-place' },
    blood:  { cls: 'tag-blood' },
    med:    { cls: 'tag-med' },
    zed:    { cls: 'tag-zed' },
    lust:   { cls: 'tag-lust' },
    horror: { cls: 'tag-horror', anim: 'tag-anim-horror' },
    flash:  { cls: 'tag-flash', anim: 'tag-anim-flash' }
  };
  // 全游戏仅这两个动效标签，合计每 passage 最多出现 1 次动效
  var MOTION_TYPES = { horror: true, flash: true };

  var TAG_RE = /\[(npc|item|place|blood|med|zed|lust|horror|flash)(?::([^\]]*))?\]([\s\S]*?)\[\/\1\]/g;

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  G.ui.tags = G.ui.tags || {};
  G.ui.tags.escapeHtml = escapeHtml;

  // 去掉标签方括号，仅留纯文本（toast 等无法渲染 HTML 的场合用）
  function strip(text) {
    return String(text == null ? '' : text).replace(/\[\/?[a-z]+(?::[^\]]*)?\]/g, '');
  }
  G.ui.tags.strip = strip;

  // 兜底调色板：M4 交付 G.data.npcs[id].color 前（或遇到未知 id）按哈希取一个稳定颜色
  var FALLBACK_PALETTE = ['#4a7fb5', '#69b0a2', '#a06cc4', '#c46a8a', '#c4a24a',
    '#5a9bd4', '#b57b4a', '#7a8a5c', '#9a6a6a', '#6a8ac4'];
  function npcColor(id) {
    var def = G.data && G.data.npcs && G.data.npcs[id];
    if (def && def.color) return def.color;
    var h = 0, s = String(id || '');
    for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return FALLBACK_PALETTE[h % FALLBACK_PALETTE.length];
  }
  G.ui.tags.npcColor = npcColor;

  function renderTag(type, param, content, claimMotion) {
    if (type === 'npc') {
      return '<span class="tag-npc" style="color:' + npcColor(param) + '">' + content + '</span>';
    }
    var def = TAG_DEFS[type];
    if (MOTION_TYPES[type]) {
      var granted = claimMotion();
      return '<span class="tag-' + type + (granted ? ' ' + def.anim : '') + '">' + content + '</span>';
    }
    return '<span class="' + def.cls + '">' + content + '</span>';
  }

  function parse(text) {
    text = text == null ? '' : String(text);
    var motionUsed = false;
    function claimMotion() {
      if (motionUsed) return false;
      motionUsed = true;
      return true;
    }

    var out = '', lastIndex = 0, m;
    TAG_RE.lastIndex = 0;
    while ((m = TAG_RE.exec(text))) {
      out += escapeHtml(text.slice(lastIndex, m.index));
      out += renderTag(m[1], m[2], escapeHtml(m[3]), claimMotion);
      lastIndex = TAG_RE.lastIndex;
    }
    out += escapeHtml(text.slice(lastIndex));
    return out;
  }
  G.ui.tags.parse = parse;

})();
