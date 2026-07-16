/* =============================================================================
 * enemies.js — 敌人与编组数据（M3）
 * -----------------------------------------------------------------------------
 * 注册 G.data.enemies（结构见 docs/Schema.md「战斗」节）与 G.data.encounters
 * （编组，供 G.engine.startCombat(encounterId) 使用）。纯数据，combat.js 消费。
 *
 * [zed] 标签：人类敌人（屠夫帮）标记 human:true，combat.js 的 foeName() 会据此
 * 对人类不套 [zed]（M10 修复了旧的「命中文案统一套 [zed]」问题）。descPool 对
 * 人类敌人本就不套 [zed]，两侧一致。
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  G.data = G.data || {};
  G.data.enemies = G.data.enemies || {};
  G.data.encounters = G.data.encounters || {};

  var enemies = {
    zombie_shambler: {
      name: '跛行者', hp: 30, dmg: [5, 12], speed: 2, infect: 0.15,
      loot: { drops: [{ id: 'clothstrip', count: 1, chance: 0.3 }] },
      descPool: [
        '[zed]跛行者[/zed]拖着腐烂的腿扑过来死死咬住你的手臂',
        '[zed]跛行者[/zed]张着黑紫的嘴一口咬在你肩上',
        '[zed]跛行者[/zed]伸手死死抓住你的衣领往前拽咬',
        '[zed]跛行者[/zed]踉跄扑倒时一口咬中你的小腿'
      ]
    },
    zombie_runner: {
      name: '奔跑者', hp: 25, dmg: [6, 14], speed: 5, infect: 0.2,
      loot: { drops: [{ id: 'clothstrip', count: 1, chance: 0.2 }] },
      descPool: [
        '[zed]奔跑者[/zed]猛地扑近一口咬在你肩头',
        '[zed]奔跑者[/zed]欺身贴近一拳砸在你脸上',
        '[zed]奔跑者[/zed]扑倒你时张嘴咬住你手臂',
        '[zed]奔跑者[/zed]疾冲而来一头撞在你胸口'
      ]
    },
    zombie_bloat: {
      name: '肿胀者', hp: 55, dmg: [8, 16], speed: 1, infect: 0.35,
      loot: { drops: [{ id: 'scrapmetal', count: 1, chance: 0.25 }] },
      descPool: [
        '[zed]肿胀者[/zed]一巴掌浮肿的手掌拍在你身上',
        '[zed]肿胀者[/zed]扑近时裂开的伤口喷了你一身脓水',
        '[zed]肿胀者[/zed]死死抱住你啃咬你的肩膀',
        '[zed]肿胀者[/zed]甩动浮肿的手臂砸中你后背'
      ]
    },
    zombie_dog: {
      name: '犬尸', hp: 18, dmg: [4, 10], speed: 6, infect: 0.25,
      loot: { drops: [{ id: 'clothstrip', count: 1, chance: 0.15 }] },
      descPool: [
        '[zed]犬尸[/zed]窜上来一口咬住你的脚踝',
        '[zed]犬尸[/zed]低吼着扑倒你撕咬你的手臂',
        '[zed]犬尸[/zed]绕到侧面猛地咬中你的小腿',
        '[zed]犬尸[/zed]跳起来一口咬在你手背上'
      ]
    },
    zombie_crawler: {
      name: '爬行者', hp: 20, dmg: [3, 9], speed: 1, infect: 0.2,
      loot: { drops: [{ id: 'clothstrip', count: 1, chance: 0.25 }] },
      descPool: [
        '[zed]爬行者[/zed]从地上猛地探身咬住你的脚',
        '[zed]爬行者[/zed]拖着残缺的身子抓住你的裤脚啃咬',
        '[zed]爬行者[/zed]贴着地面扑近一口咬中你的小腿',
        '[zed]爬行者[/zed]用仅剩的手臂死死抓住你撕咬'
      ]
    },
    zombie_screecher: {
      name: '尖啸者', hp: 22, dmg: [5, 11], speed: 3, infect: 0.18,
      loot: { drops: [{ id: 'bandage', count: 1, chance: 0.15 }] },
      descPool: [
        '[zed]尖啸者[/zed]尖叫着扑近一口咬住你的耳侧',
        '[zed]尖啸者[/zed]张嘴发出刺耳尖叫同时抓伤你的手臂',
        '[zed]尖啸者[/zed]扑倒你时一口咬在你肩上',
        '[zed]尖啸者[/zed]贴脸尖叫的瞬间一口咬中你的脸颊'
      ]
    },
    thug_grunt: {
      name: '屠夫帮杂兵', human: true, hp: 35, dmg: [7, 15], speed: 3, infect: 0,
      loot: {
        bullets: { chance: 0.6, min: 2, max: 6 },
        drops: [{ id: 'clothstrip', count: 1, chance: 0.3 }]
      },
      descPool: [
        '屠夫帮杂兵抡起铁棍砸在你背上',
        '屠夫帮杂兵一拳砸在你肋骨上',
        '屠夫帮杂兵挥刀划破你的手臂',
        '屠夫帮杂兵飞起一脚踹在你腹部'
      ]
    },
    thug_brute: {
      name: '屠夫帮打手', human: true, hp: 60, dmg: [10, 20], speed: 2, infect: 0,
      loot: {
        bullets: { chance: 0.7, min: 4, max: 10 },
        drops: [
          { id: 'militaryfirstaid', count: 1, chance: 0.15 },
          { id: 'spikebat', count: 1, chance: 0.1 }
        ]
      },
      descPool: [
        '屠夫帮打手抡起大锤砸在你肩上',
        '屠夫帮打手一记重拳砸在你脸上',
        '屠夫帮打手揪住你的衣领狠狠一肘砸下',
        '屠夫帮打手抡棍横扫砸在你腰上'
      ]
    }
  };
  Object.keys(enemies).forEach(function (id) { G.data.enemies[id] = enemies[id]; });

  // ---- 编组（难度梯度对应地点危险度：低→高） -------------------------------
  var encounters = {
    zombie_pair:      ['zombie_shambler', 'zombie_shambler'],
    dog_pack:          ['zombie_dog', 'zombie_dog', 'zombie_dog'],
    zombie_trio:       ['zombie_shambler', 'zombie_shambler', 'zombie_runner'],
    runner_pack:       ['zombie_runner', 'zombie_runner'],
    crawler_ambush:    ['zombie_crawler', 'zombie_crawler'],
    bloat_solo:        ['zombie_bloat'],
    screecher_horde:   ['zombie_screecher', 'zombie_shambler', 'zombie_shambler'],
    thug_patrol:       ['thug_grunt', 'thug_grunt'],
    thug_squad:        ['thug_grunt', 'thug_brute'],
    metro_horde:       ['zombie_runner', 'zombie_crawler', 'zombie_shambler']
  };
  Object.keys(encounters).forEach(function (id) { G.data.encounters[id] = encounters[id]; });

})();
