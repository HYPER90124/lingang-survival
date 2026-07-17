/* =============================================================================
 * clothing.js — M14 服装系统的文本适配（数据层）
 * -----------------------------------------------------------------------------
 * 机制（服装三槽/属性/耐久/护甲/迁移）在引擎侧（state.js/combat.js/save.js）与
 * 数据侧（items.js/trade.js/locations.js）实现；本文件只做「决定性场景」的文本分支：
 *
 *   decency 反应事件（5 名 NPC 各一句）——当全身着装体面合计过低（cond.decency<=2，
 *   相当于只剩垫底基础装再被撕破、或穿了短裙这类不合时宜的搭配）时，在各 NPC 的
 *   作息地点低频弹一句氛围台词。纯氛围、不锁剧情、不设硬门槛（任务书约束），
 *   priority 1、chance 低、冷却长，met 门保证只对已识 NPC 触发。
 *
 * 成人场景的「宽衣」描写分支：引擎已提供 G.engine.isDressed()（上装+下装两槽都在），
 * 供成人段落的 text 函数按需分叉；M6/M7 既有亲密段落维持原样（改写风险与工作量红线），
 * 新增成人内容可直接读该接口。见 PLAN.md M14 交接备注。
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  var story = G.data.story, events = G.data.events;
  function P(id, text, choices) { story.register({ id: id, text: text, choices: choices }); }

  // decency 反应：{ id, npc, loc, line }。低体面时该 NPC 在其作息地点给一句反应。
  var REACTS = [
    { id: 'su',   npc: 'su',   loc: 'bar',
      line: '[npc:su]苏曼[/npc]递酒的手顿了顿，目光在你身上扫了一圈："这身……啧，末日了也不是这么穿的。后面纸箱里有几件旧衣裳，自己挑挑。"' },
    { id: 'zhao', npc: 'zhao', loc: 'market',
      line: '[npc:zhao]赵铁[/npc]从柜台后抬眼看你，眉头拧了一下："姑娘家小伙子，衣裳穿成这样，路上招人。我这儿也卖几件遮体的，便宜。"' },
    { id: 'chen', npc: 'chen', loc: 'church',
      line: '[npc:chen]陈神父[/npc]默默从长凳上取来一条毛毯，披到你肩上，什么也没多说，只念了半句听不清的祷词。' },
    { id: 'fang', npc: 'fang', loc: 'checkpoint',
      line: '[npc:fang]方哨[/npc]端着枪的手没动，只是皱眉打量你："这么点布片挡不住抓咬，也挡不住夜里的冷。找件正经衣服穿上。"' },
    { id: 'lin',  npc: 'lin',  loc: 'hospital',
      line: '[npc:lin]林晚[/npc]抬头看你一眼，从柜子里翻出一件干净的旧外套搁在台面上："先披上。冻病了我这儿药也不够治你。"' }
  ];

  REACTS.forEach(function (r) {
    var pid = 'decency_react_' + r.id + '_p';
    P(pid, r.line, [{ label: '（点头）', fx: {} }]);
    events.register({
      id: 'decency_react_' + r.id, type: 'random', priority: 1, cooldown: 2880,
      cond: { loc: r.loc, met: r.npc, decency: { lte: 2 }, chance: 0.35 },
      passage: pid
    });
  });

})();
