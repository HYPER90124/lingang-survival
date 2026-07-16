/* =============================================================================
 * intro.js — 开场剧情（M5）
 * -----------------------------------------------------------------------------
 * 安全屋醒来的开场 passage 组：交代背景（第 90 天、头伤、失忆）、发放开局
 * 物资（铁管/罐头/瓶装水/绷带 + 前情伏笔道具 worn_idcard）、引导去酒吧
 * （自然引出老秦初遇，见 qin.js 的 qin_s0_1）。
 *
 * 触发：type:'story' + when:['enter']，首次进入 home 时由 goLocation 的
 * enter 检查触发（newGameStart 开局即进 home）。once 防重复，结尾写
 * flag intro.done —— 三条 NPC 线的初遇事件都以此为前置。
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  var story = G.data.story, events = G.data.events;

  function P(id, text, choices) { story.register({ id: id, text: text, choices: choices }); }

  events.register({
    id: 'intro_wake', type: 'story', when: ['enter'], once: true, priority: 20,
    cond: { loc: 'home', flag: { 'intro.done': false } },
    passage: 'intro_p1'
  });

  P('intro_p1',
    '后脑的钝痛把你从黑暗里拽醒。天花板上的水渍你不认得，窗帘缝里漏进一线灰白的晨光，落在积灰的地板上。你躺在一张不属于你的床上，屋里很静，静得能听见自己的心跳。',
    [{ label: '撑起身，检查自己', fx: { goto: 'intro_p2' } }]);

  P('intro_p2',
    '你的头上缠着绷带，结打得歪歪扭扭，指尖一碰伤口就钻心地疼。你翻遍全身的口袋，只摸出一张塑封发黄的[item]旧身份证[/item]，照片和名字都被水渍洇开，你辨不出那是不是自己。你努力去想自己怎么到的这里，能想起的东西碎得拼不起来。',
    [{ label: '收起证件，搜一遍这间屋子', fx: { item: { worn_idcard: 1 }, goto: 'intro_p3' } }]);

  P('intro_p3',
    '屋子的主人走得匆忙，或者早就没能回来。你在床底摸出一截[item]铁管[/item]，橱柜里剩着一只罐头、一瓶水和半卷绷带，桌上的台历停在七月，有人用红笔把 7 月 14 日圈了一遍又一遍，圈到纸面起了毛。',
    [{ label: '收下这些东西，走到窗边', fx: { item: { rustpipe: 1, cannedfood: 1, bottledwater: 1, bandage: 1 }, goto: 'intro_p4' } }]);

  P('intro_p4',
    '窗外的临港市泡在晨雾里。街上翻倒的汽车锈成红褐色，一具[zed]尸体[/zed]在路口慢慢地挪，走三步，停一步，像在演一出没有观众的哑剧。窗边的墙上钉着一张手绘街区图，超市、居民区的位置都画了叉，只有一处被炭笔描粗——「[place]避风港[/place]」，旁边一行小字：活人聚的地方，酒吧，别带枪进门。',
    [{ label: '记下「避风港」的位置', fx: { flag: { 'intro.done': true }, milestone: '在陌生的安全屋醒来', goto: 'intro_p5' } }]);

  P('intro_p5',
    function (s) {
      var name = (s && s.player && s.player.name) || '无名氏';
      return '记忆像退潮后的滩涂，你捡得回来的只有自己的名字——' + name +
        '。灾变到今天是第九十天，你不知道这九十天自己是怎么过来的，但接下来怎么活，得由你自己决定：找吃的，找水，找能说话的活人。那间叫[place]避风港[/place]的酒吧不远，天黑以后最热闹。';
    },
    [{ label: '出发', fx: {} }]);

})();
