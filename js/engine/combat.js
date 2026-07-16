/* =============================================================================
 * combat.js — 轻量回合制战斗
 * -----------------------------------------------------------------------------
 * 挂载到 G.engine：
 *
 *   G.engine.startCombat(encounterId, opts)  —— 开战。encounterId 可为 G.data.encounters 的编组
 *                                               id，或单个敌人 id，或敌人 id 数组。
 *     opts: { returnPassage, onWin, onLose, onFlee }  胜利/失败/逃跑后的续接
 *   G.engine.combatAction(action, param)     —— 玩家一个回合动作，随后敌人回合。
 *     action ∈ 'attack'|'heavy'|'defend'|'item'|'flee'；param 为 item 动作的道具 id
 *     返回 { status:'ongoing'|'win'|'lose'|'flee', log:[本回合文本], state }
 *   G.engine.inCombat()                      —— 是否战斗中
 *   G.engine.combatState()                   —— 当前战斗状态对象（G.state.combat）
 *
 * 敌人数据（G.data.enemies）与编组（G.data.encounters）由 M3 提供。战斗文本从 descPool 抽取拼接。
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  G.engine = G.engine || {};
  G.data = G.data || {};
  G.data.enemies = G.data.enemies || {};
  G.data.encounters = G.data.encounters || {};

  // ---- 可调常量（M9） -----------------------------------------------------
  var C = {
    fistDmg: [2, 5],
    heavyMult: 1.6,
    heavyEnergy: 10,
    hitNormal: 0.9,
    hitHeavy: 0.62,
    defendReduce: 0.4,       // 防御时受到伤害 ×0.4（减伤 60%）
    enemyHit: 0.75,
    infectMin: 10, infectMax: 25,
    fleeBase: 0.5
  };
  G.COMBAT_TUNE = C;

  function S() { return G.state; }
  function rand(a, b) { return a + Math.floor(Math.random() * (b - a + 1)); }
  function pick(arr) { return arr && arr.length ? arr[Math.floor(Math.random() * arr.length)] : ''; }

  function inCombat() { return !!(S() && S().combat && !S().combat.over); }
  function combatState() { return S() ? S().combat : null; }
  G.engine.inCombat = inCombat;
  G.engine.combatState = combatState;

  // ---- 开战 ---------------------------------------------------------------
  function resolveEnemyIds(encounterId) {
    if (Array.isArray(encounterId)) return encounterId;
    if (G.data.encounters[encounterId]) return G.data.encounters[encounterId].slice();
    return [encounterId];              // 当作单个敌人 id
  }

  function makeEnemy(id) {
    var def = G.data.enemies[id];
    if (!def) { console.warn('[combat] 未知敌人:', id); def = { name: id, hp: 10, dmg: [1, 3], speed: 1, infect: 0 }; }
    return {
      id: id, name: def.name || id,
      hp: def.hp, maxHp: def.hp,
      dmg: def.dmg || [1, 3],
      speed: def.speed || 1,
      infect: def.infect || 0,
      loot: def.loot || null,
      descPool: def.descPool || [],
      alive: true
    };
  }

  function startCombat(encounterId, opts) {
    opts = opts || {};
    var ids = resolveEnemyIds(encounterId);
    var combat = {
      encounterId: encounterId,
      enemies: ids.map(makeEnemy),
      defending: false,
      turn: 0,
      log: [],
      over: false,
      result: null,
      returnPassage: opts.returnPassage || null,
      onWin: opts.onWin || null,
      onLose: opts.onLose || null,
      onFlee: opts.onFlee || null
    };
    S().combat = combat;
    if (G.ui.showCombat) G.ui.showCombat(combat);
    return combat;
  }
  G.engine.startCombat = startCombat;

  // ---- 玩家武器 -----------------------------------------------------------
  function weaponInfo() {
    var w = S().player.weapon;
    if (!w) return { dmg: C.fistDmg, hitPool: null, fists: true };
    var def = G.engine.itemDef(w.id);
    if (!def) return { dmg: C.fistDmg, hitPool: null, fists: true };
    return { dmg: def.dmg || C.fistDmg, hitPool: def.hitPool || null, fists: false, def: def, ref: w };
  }

  function wearWeapon() {
    var w = S().player.weapon;
    if (!w) return;
    w.durability -= 1;
    if (w.durability <= 0) {
      var def = G.engine.itemDef(w.id);
      S().combat.log.push('[blood]' + ((def && def.name) || '武器') + '[/blood]彻底损坏，脱手了。');
      S().player.weapon = null;
    }
  }

  // ---- 一回合 -------------------------------------------------------------
  function firstAlive() {
    var es = S().combat.enemies;
    for (var i = 0; i < es.length; i++) if (es[i].alive) return es[i];
    return null;
  }
  function allDead() { return S().combat.enemies.every(function (e) { return !e.alive; }); }

  function playerAttack(heavy) {
    var combat = S().combat, log = combat.log;
    var target = firstAlive();
    if (!target) return;
    var w = weaponInfo();
    var hitChance = heavy ? C.hitHeavy : C.hitNormal;
    if (heavy) G.engine.statAdd('energy', -C.heavyEnergy);

    if (Math.random() > hitChance) {
      log.push('你' + (heavy ? '奋力挥出重击但落了空' : '的攻击被躲开了') + '。');
    } else {
      var base = rand(w.dmg[0], w.dmg[1]);
      var dmg = Math.round(heavy ? base * C.heavyMult : base);
      target.hp -= dmg;
      var phrase = w.hitPool ? pick(w.hitPool) : (w.fists ? '拳头砸中' : '击中');
      log.push('你' + phrase + '[zed]' + target.name + '[/zed]，造成 ' + dmg + ' 点伤害。');
      if (target.hp <= 0) { target.alive = false; log.push('[zed]' + target.name + '[/zed]倒下不再动弹。'); }
    }
    if (!w.fists) wearWeapon();
  }

  function useItemInCombat(itemId) {
    var log = S().combat.log;
    if (!itemId || !G.engine.hasItem(itemId)) { log.push('你没有可用的东西。'); return; }
    var def = G.engine.itemDef(itemId);
    G.engine.applyFx(def && def.fx);
    G.engine.removeItem(itemId, 1);
    log.push('你使用了[item]' + ((def && def.name) || itemId) + '[/item]。');
  }

  function tryFlee() {
    var combat = S().combat, log = combat.log;
    var energy = S().player.stats.energy;
    var maxSpeed = Math.max.apply(null, combat.enemies.filter(function (e) { return e.alive; }).map(function (e) { return e.speed; }));
    var chance = C.fleeBase + (energy - 50) / 100 - maxSpeed * 0.1;
    if (G.engine.isOverweight()) chance -= 0.4;                 // 超重难以脱身
    chance = G.engine.clamp(chance, 0.05, 0.95);
    G.engine.statAdd('energy', -5);
    if (Math.random() < chance) { log.push('你抓住空档拔腿就跑，甩开了它们。'); return true; }
    log.push('你想逃，却被拦了下来。');
    return false;
  }

  function enemyTurn() {
    var combat = S().combat, log = combat.log;
    combat.enemies.forEach(function (e) {
      if (!e.alive) return;
      if (Math.random() > C.enemyHit) { log.push('[zed]' + e.name + '[/zed]扑空。'); return; }
      var dmg = rand(e.dmg[0], e.dmg[1]);
      if (combat.defending) dmg = Math.round(dmg * C.defendReduce);
      G.engine.statAdd('hp', -dmg);
      var desc = e.descPool.length ? pick(e.descPool) : '[zed]' + e.name + '[/zed]咬了上来';
      log.push(desc + '，你受到 ' + dmg + ' 点伤害。');
      // 感染判定
      if (e.infect && Math.random() < e.infect) {
        var inf = rand(C.infectMin, C.infectMax);
        G.engine.statAdd('infection', inf);
        log.push('[blood]伤口[/blood]被咬破，[med]感染[/med]加重了。');
      }
    });
  }

  // ---- 结算与续接 ---------------------------------------------------------
  function grantLoot() {
    var combat = S().combat, log = combat.log, p = S().player;
    combat.enemies.forEach(function (e) {
      var loot = e.loot; if (!loot) return;
      if (loot.bullets) {
        var lb = loot.bullets;
        var chance = lb.chance == null ? 1 : lb.chance;
        if (Math.random() < chance) {
          var n = (lb.min != null) ? rand(lb.min, lb.max) : (typeof lb === 'number' ? lb : lb.count || 0);
          if (n > 0) { p.bullets += n; log.push('搜到 [item]' + n + ' 发子弹[/item]。'); }
        }
      }
      var drops = loot.drops || loot.items;
      if (Array.isArray(drops)) drops.forEach(function (d) {
        if (Math.random() < (d.chance == null ? 1 : d.chance)) {
          var cnt = d.count || 1;
          G.engine.addItem(d.id, cnt);
          var def = G.engine.itemDef(d.id);
          log.push('搜到 [item]' + ((def && def.name) || d.id) + (cnt > 1 ? '×' + cnt : '') + '[/item]。');
        }
      });
    });
  }

  function endCombat(result) {
    var combat = S().combat;
    combat.over = true;
    combat.result = result;
    if (result === 'win') grantLoot();

    // 续接路由（回调优先，其次 returnPassage，最后回地点）
    if (result === 'lose') {
      if (combat.onLose) combat.onLose();
      else if (G.engine.onDeath) G.engine.onDeath('combat');
      return;
    }
    var cb = result === 'win' ? combat.onWin : combat.onFlee;
    var next = combat.returnPassage;
    // 清空战斗态后再续接
    S().combat = null;
    if (typeof cb === 'function') cb(result);
    else if (next && G.engine.openPassage) G.engine.openPassage(next);
    else if (G.ui.showLocation) G.ui.showLocation();
  }

  function combatAction(action, param) {
    if (!inCombat()) return { status: 'none', log: [], state: null };
    var combat = S().combat;
    combat.turn++;
    combat.log = [];                 // 每回合清空，只保留本回合文本
    var fled = false;

    // 防御仅在选择防御的回合生效
    combat.defending = (action === 'defend');

    switch (action) {
      case 'attack': playerAttack(false); break;
      case 'heavy':  playerAttack(true); break;
      case 'defend': combat.log.push('你举起手臂/武器格挡，准备承受下一击。'); break;
      case 'item':   useItemInCombat(param); break;
      case 'flee':   fled = tryFlee(); break;
      default: combat.log.push('（无效动作）');
    }

    if (fled) { var flog = combat.log.slice(); endCombat('flee'); return { status: 'flee', log: flog, state: null }; }

    if (allDead()) { combat.log.push('战斗结束。'); var wlog = combat.log.slice(); endCombat('win'); return { status: 'win', log: wlog, state: null }; }

    // 敌人回合
    enemyTurn();

    if (S().player.stats.hp <= 0) { var llog = combat.log.slice(); endCombat('lose'); return { status: 'lose', log: llog, state: null }; }

    if (G.ui.showCombat) G.ui.showCombat(combat);
    return { status: 'ongoing', log: combat.log.slice(), state: combat };
  }
  G.engine.combatAction = combatAction;

})();
