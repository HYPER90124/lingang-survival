/* =============================================================================
 * build.js — 打包脚本（M9）
 * -----------------------------------------------------------------------------
 * 把 css/style.css 与全部 js（引擎 → UI → 数据 → main）内联进单个 HTML 文件，
 * 产出 dist/game.html，可用 file:// 直接双击打开游玩（GitHub Pages 被下架时的退路）。
 *
 * 用法：node tools/build.js
 *
 * 说明：
 *   - 脚本顺序严格照 index.html（main.js 必须最后）；_demo.js 本就未引入，自动剔除。
 *   - 不做压缩/混淆，保持可读、可审计；单文件体积可接受（手机浏览器无压力）。
 *   - 每段 <script> 独立包裹，任一文件报错不影响其他文件解析。
 * ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT, 'dist');
const OUT_FILE = path.join(OUT_DIR, 'game.html');

// 与 index.html 完全一致的加载顺序（main.js 最后；不含 _demo.js）
const CSS = 'css/style.css';
const SCRIPTS = [
  'js/engine/state.js', 'js/engine/time.js', 'js/engine/events.js',
  'js/engine/combat.js', 'js/engine/save.js',
  'js/ui/render.js', 'js/ui/panels.js', 'js/ui/tags.js',
  'js/data/items.js', 'js/data/enemies.js', 'js/data/locations.js', 'js/data/trade.js',
  'js/data/npcs.js',
  'js/data/story/intro.js', 'js/data/story/qin.js', 'js/data/story/lin.js', 'js/data/story/mao.js',
  'js/data/story/secondary.js', 'js/data/story/minor.js', 'js/data/story/worldevents.js',
  'js/data/story/dol.js',
  'js/engine/main.js'
];

function read(rel) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) throw new Error('缺少文件: ' + rel);
  return fs.readFileSync(p, 'utf8');
}

// 防止内联 JS 中出现的 "</script>" 提前闭合脚本块
function safeScript(code) { return code.replace(/<\/script>/gi, '<\\/script>'); }

function build() {
  const css = read(CSS);
  let totalJs = 0;
  const scriptTags = SCRIPTS.map(function (rel) {
    const code = read(rel);
    totalJs += Buffer.byteLength(code, 'utf8');
    return '<!-- ' + rel + ' -->\n<script>\n' + safeScript(code) + '\n</script>';
  }).join('\n');

  const html =
'<!doctype html>\n' +
'<html lang="zh-CN">\n' +
'<head>\n' +
'  <meta charset="utf-8">\n' +
'  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover">\n' +
'  <meta name="theme-color" content="#12100f">\n' +
'  <title>临港余生</title>\n' +
'  <style>\n' + css + '\n  </style>\n' +
'</head>\n' +
'<body>\n' +
'  <div id="app"></div>\n' +
scriptTags + '\n' +
'</body>\n' +
'</html>\n';

  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(OUT_FILE, html, 'utf8');

  const kb = (Buffer.byteLength(html, 'utf8') / 1024).toFixed(1);
  console.log('✓ 打包完成: dist/game.html');
  console.log('  内联脚本 ' + SCRIPTS.length + ' 个 (' + (totalJs / 1024).toFixed(1) + ' KB) + CSS ' + (Buffer.byteLength(css, 'utf8') / 1024).toFixed(1) + ' KB');
  console.log('  单文件总大小 ' + kb + ' KB');
}

build();
