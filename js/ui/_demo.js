/* =============================================================================
 * _demo.js — M2 界面验收用假数据（NPC 占位 + 标签演示 passage）
 * -----------------------------------------------------------------------------
 * M3（js/data/items.js / enemies.js / locations.js / trade.js）已交付真实地点/
 * 道具/敌人/交易数据，本文件不再提供这些，避免 id 冲突——标签演示 passage 直接
 * 复用 M3 的真实 id（zombie_pair 编组、zhao_main 商店、bandage 道具等）。
 * 仍占位的只有 G.data.npcs（M4 交付前 tags.js 的 NPC 专色 / 地点 NPC 在场列表都
 * 需要它），用「已存在则不覆盖」保护，M4 数据接入后自动失效。
 *
 * 本文件仅供 M2 界面验收使用，不是游戏内容。M4 npcs.js 接入并在 index.html 取消
 * 注释后，请从 index.html 删除本文件的 <script> 引入。
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  G.data = G.data || {};

  console.info('[demo] _demo.js 已加载——仅供 M2 界面验收使用，M4 的 npcs.js 接入后请从 index.html 移除本文件引用。');

  function fillIn(target, entries) {
    Object.keys(entries).forEach(function (id) {
      if (!target[id]) target[id] = entries[id];
    });
  }

  // ---- NPC（M4 前占位：名字/专色，供 tags.js 与地点 NPC 列表使用） -------------
  G.data.npcs = G.data.npcs || {};
  fillIn(G.data.npcs, {
    qin: { name: '秦烈（老秦）', color: '#4a7fb5', brief: '前刑警队长，酒吧保安。', talkPassage: 'demo_talk' },
    lin: { name: '林晚', color: '#69b0a2', brief: '外科医生，独守市二医院。' },
    mao: { name: '灰猫', color: '#a06cc4', brief: '情报贩子，行踪不定。' },
    su: { name: '苏曼', color: '#c46a8a', brief: '酒吧老板娘，避风港据点主事人。', talkPassage: 'demo_talk' },
    dou: { name: '阿豆', color: '#c4a24a', brief: '机械师，驻加油站。' },
    zhou: { name: '周响', color: '#5a9bd4', brief: '电台主播，驻大学广播站。' },
    zhao: { name: '赵铁', color: '#b57b4a', brief: '武装商人，驻惠民超市。' },
    chen: { name: '陈神父', color: '#8a8a7c', brief: '圣心教堂，倾听告解。' },
    cai: { name: '老蔡', color: '#6a8a8a', brief: '码头流浪汉，偶尔说准话。' },
    fang: { name: '方哨', color: '#5c8a6a', brief: '检查站逃兵，紧张兮兮。' }
  });

  // ---- 演示 passage：覆盖 Schema 全部 9 种文字标签 --------------------------
  // 战斗/商店走的是 M3 真实数据（zombie_pair 编组 / zhao_main 商店 / bandage 道具）。
  if (G.data.story) {
    G.data.story.register({
      id: 'demo_talk',
      text: '“注意安全，别在外面待太久。”对方拍了拍你的肩，没再多说什么。',
      choices: [{ label: '嗯，我知道', fx: {} }]
    });

    G.data.story.register({
      id: 'demo_tags',
      text: '深夜，[npc:qin]老秦[/npc]忽然按住你的肩膀，压低声音：“[place]酒吧[/place]后巷有动静。”' +
        '他把一支[item]手电筒[/item]塞进你手里，又摸出一卷[med]绷带[/med]别在你腰间。' +
        '巷子深处，[zed]跛行者[/zed]的呻吟由远及近，[blood]血腥味[/blood]混着潮气涌了上来。' +
        '你忽然想起白天在码头那场[lust]暧昧不清[/lust]的梦——不，现在不是想这个的时候。' +
        '[horror]黑暗里那双眼睛死死盯着你[/horror]，下一秒，[flash]身后传来玻璃碎裂的声音[/flash]！' +
        '（本段为 M2 标签演示：horror 与 flash 同段出现时，后者会按规则自动降级为纯色，不再闪烁。）',
      choices: [
        { label: '举起手电筒冲上去', fx: { combat: 'zombie_pair' } },
        { label: '先去看看老秦的货', fx: { shop: 'zhao_main' } },
        { label: '假装没看见，转身回去', fx: { stat: { sanity: -5 } } }
      ]
    });
  }

})();
