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

  // ---- 可调常量（M9 建立 / M10 调整） -------------------------------------
  var C = {
    fistDmg: [2, 5],
    heavyMult: 1.6,
    heavyEnergy: 10,
    hitNormal: 0.9,
    hitHeavy: 0.70,          // M10：0.62→0.70，让重击期望伤害不再低于普攻
    defendReduce: 0.4,       // 防御时受到伤害 ×0.4（减伤 60%）
    defendEnergyRegen: 4,    // M10：防御回合小幅回精力，支撑「防御→重击」循环
    enemyHit: 0.75,
    infectMin: 10, infectMax: 25,
    fleeBase: 0.5,
    // M10 技能落地
    meleeHitBonus: 0.05,     // skill:melee 近战命中 +0.05
    meleeDmgBonus: 2,        // skill:melee 近战伤害 +2
    bandageMult: 1.5,        // skill:bandage 治疗类 fx ×1.5
    moddingWearEvery: 2,     // skill:modding 每 N 次攻击才损耗 1 点耐久
    // M10 连击奖励（可选爽感）
    comboBonus: 1,           // 每段连击追加伤害
    comboCap: 3,             // 连击追加伤害上限
    // M14 服装：护甲减伤 + 损衣
    armorDenom: 4,           // 每次受击减伤 = floor(全身 armor 合计 / armorDenom)；满配约 -3，远低于防御的 -60%
    clothWearChance: 0.15    // 每次被击中，此概率磨损一件在穿服装（跌破半耐久撕破/归零报废）
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
    // M15：冬季丧尸迟缓（speed -1，下限 1；人类不受影响）——「敌弱我更弱」，非纯堆难度。
    var speed = def.speed || 1;
    if (!def.human && G.engine.isWinter && G.engine.isWinter()) speed = Math.max(1, speed - 1);
    return {
      id: id, name: def.name || id,
      hp: def.hp, maxHp: def.hp,
      dmg: def.dmg || [1, 3],
      speed: speed,
      infect: def.infect || 0,
      loot: def.loot || null,
      descPool: def.descPool || [],
      human: !!def.human,
      alive: true
    };
  }

  // 命中/被咬文案里的名字标签：丧尸包 [zed]，人类（屠夫帮）用原名不套 [zed]
  function foeName(e) { return e.human ? e.name : '[zed]' + e.name + '[/zed]'; }

  function startCombat(encounterId, opts) {
    opts = opts || {};
    var ids = resolveEnemyIds(encounterId);
    var combat = {
      encounterId: encounterId,
      enemies: ids.map(makeEnemy),
      allies: [],                     // M18：我方同伴单位（战斗型同行者，进场满血）
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
    // M18：把当前战斗型同行者作为我方第二单位加入（侦察位不参战，返回 null）
    var ally = G.engine.companionCombatUnit ? G.engine.companionCombatUnit() : null;
    if (ally) { combat.allies.push(ally); combat.log.push('[npc:' + ally.id + ']' + ally.name + '[/npc]与你并肩而立。'); }
    S().combat = combat;
    // M16 埋点（纯数据写入，不改战斗流程）：登记敌人图鉴 + 战斗次数计数 + 脏污累积
    if (G.engine.codexSee) combat.enemies.forEach(function (e) { G.engine.codexSee(e.id); });
    if (G.engine.statTick) G.engine.statTick('fights');
    if (G.TUNE && G.TUNE.grimeCombat) G.engine.statAdd('grime', G.TUNE.grimeCombat);
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

  // ---- 技能查询 -----------------------------------------------------------
  function hasSkill(name) { var p = S().player; return !!(p && p.skills && p.skills[name]); }
  // melee 只对近战武器/徒手生效（枪械 def.ranged 排除）
  function meleeActive(w) {
    if (!hasSkill('melee')) return false;
    if (w.fists) return true;
    return !(w.def && w.def.ranged);
  }

  function wearWeapon() {
    var w = S().player.weapon;
    if (!w) return;
    // skill:modding —— 每两次攻击才损耗 1 点耐久（损耗减半）
    if (hasSkill('modding')) {
      var cs = S().combat;
      cs._wearTick = (cs._wearTick || 0) + 1;
      if (cs._wearTick % C.moddingWearEvery !== 0) return;
    }
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

  // ---- M18 同伴单位 -------------------------------------------------------
  function livingAllies() {
    var a = S().combat.allies || [];
    return a.filter(function (u) { return !u.retreated; });
  }
  // 同伴在玩家行动后自动攻击最靠前的敌人（AI 就打 firstAlive）
  function allyTurn() {
    var combat = S().combat, log = combat.log;
    livingAllies().forEach(function (u) {
      var target = firstAlive();
      if (!target) return;
      if (Math.random() > u.hit) { log.push('[npc:' + u.id + ']' + u.name + '[/npc]的攻击落了空。'); return; }
      var dmg = rand(u.dmg[0], u.dmg[1]);
      target.hp -= dmg;
      var verb = u.role === 'gun' ? '一枪打中' : '一记狠招砸中';
      log.push('[npc:' + u.id + ']' + u.name + '[/npc]' + verb + foeName(target) + '，造成 ' + dmg + ' 点伤害。');
      if (target.hp <= 0) { target.alive = false; log.push(foeName(target) + '倒下不再动弹。'); }
    });
  }
  // 同伴受创：降到 30% 以下自动撤出（不死），本场不再回来，当日同行结束（好感 -2）
  function allyTakeHit(u, dmg) {
    var log = S().combat.log;
    u.hp -= dmg;
    log.push('[npc:' + u.id + ']' + u.name + '[/npc]替你挨了一下，受到 ' + dmg + ' 点伤害。');
    if (u.hp <= u.maxHp * 0.3) {
      u.retreated = true;
      log.push('[npc:' + u.id + ']' + u.name + '[/npc]伤得不轻，咬牙退出了战圈。');
      if (G.engine.companionEnd) G.engine.companionEnd('retreat');   // 清 world.companion + 好感 -2
    }
  }

  function playerAttack(heavy) {
    var combat = S().combat, log = combat.log;
    var target = firstAlive();
    if (!target) return;
    var w = weaponInfo();
    var melee = meleeActive(w);
    var hitChance = (heavy ? C.hitHeavy : C.hitNormal) + (melee ? C.meleeHitBonus : 0);
    hitChance = G.engine.clamp(hitChance, 0, 1);
    if (heavy) G.engine.statAdd('energy', -C.heavyEnergy);

    if (Math.random() > hitChance) {
      combat.combo = 0;                                   // 落空则连击中断
      log.push('你' + (heavy ? '奋力挥出重击但落了空' : '的攻击被躲开了') + '。');
    } else {
      var base = rand(w.dmg[0], w.dmg[1]) + (melee ? C.meleeDmgBonus : 0);
      var combo = combat.combo = (combat.combo || 0) + 1;
      var comboAdd = Math.min((combo - 1) * C.comboBonus, C.comboCap);
      var dmg = Math.round(heavy ? base * C.heavyMult : base) + comboAdd;
      target.hp -= dmg;
      var phrase = w.hitPool ? pick(w.hitPool) : (w.fists ? '拳头砸中' : '击中');
      log.push('你' + phrase + foeName(target) + '，造成 ' + dmg + ' 点伤害' +
        (comboAdd > 0 ? '（连击 +' + comboAdd + '）' : '') + '。');
      if (target.hp <= 0) { target.alive = false; log.push(foeName(target) + '倒下不再动弹。'); }
    }
    if (!w.fists) wearWeapon();
  }

  // skill:bandage —— med 类道具的治疗类 fx（hp 增益 / 感染削减）×bandageMult。
  // 返回可直接交给 applyFx 的 fx（无技能或非治疗类时原样返回 def.fx）。
  function medBoostFx(def) {
    if (!def || !def.fx) return def && def.fx;
    if (def.type !== 'med' || !hasSkill('bandage') || !def.fx.stat) return def.fx;
    var fx = def.fx, clone = {};
    for (var k in fx) clone[k] = fx[k];
    clone.stat = {};
    for (var st in fx.stat) {
      var v = fx.stat[st];
      if ((st === 'hp' && v > 0) || (st === 'infection' && v < 0)) v = Math.round(v * C.bandageMult);
      clone.stat[st] = v;
    }
    return clone;
  }
  G.engine.medBoostFx = medBoostFx;

  function useItemInCombat(itemId) {
    var log = S().combat.log;
    if (!itemId || !G.engine.hasItem(itemId)) { log.push('你没有可用的东西。'); return; }
    var def = G.engine.itemDef(itemId);
    G.engine.applyFx(medBoostFx(def));
    G.engine.removeItem(itemId, 1);
    log.push('你使用了[item]' + ((def && def.name) || itemId) + '[/item]。');
  }

  // 逃跑成功率（tryFlee 与 combatOptionInfo 共用同一公式，防两处漂移）
  function fleeChance() {
    var combat = S().combat;
    var energy = S().player.stats.energy;
    var alive = combat.enemies.filter(function (e) { return e.alive; });
    var maxSpeed = alive.length ? Math.max.apply(null, alive.map(function (e) { return e.speed; })) : 1;
    var chance = C.fleeBase + (energy - 50) / 100 - maxSpeed * 0.1;
    if (G.engine.isOverweight()) chance -= 0.4;                 // 超重难以脱身
    if (G.engine.companionFleeBonus) chance += G.engine.companionFleeBonus();  // M18：侦察位（灰猫）同行 +0.15
    return G.engine.clamp(chance, 0.05, 0.95);
  }

  function tryFlee() {
    var log = S().combat.log;
    var chance = fleeChance();
    G.engine.statAdd('energy', -5);
    if (Math.random() < chance) {
      if (G.engine.statTick) G.engine.statTick('flees');   // M16 埋点：成功逃跑计数
      log.push('你抓住空档拔腿就跑，甩开了它们。'); return true;
    }
    log.push('你想逃，却被拦了下来。');
    return false;
  }

  // ---- 选项实时数据（供 UI 在按钮上显示成功率/后果） -----------------------
  function playerHitInfo(heavy) {
    var w = weaponInfo();
    var h = (heavy ? C.hitHeavy : C.hitNormal) + (meleeActive(w) ? C.meleeHitBonus : 0);
    return G.engine.clamp(h, 0, 1);
  }
  function playerDmgRange(heavy) {
    var w = weaponInfo(), bonus = meleeActive(w) ? C.meleeDmgBonus : 0;
    var lo = w.dmg[0] + bonus, hi = w.dmg[1] + bonus;
    if (heavy) { lo = Math.round(lo * C.heavyMult); hi = Math.round(hi * C.heavyMult); }
    return [lo, hi];
  }
  function combatOptionInfo() {
    if (!inCombat()) return null;
    return {
      attack: { hit: playerHitInfo(false), dmg: playerDmgRange(false) },
      heavy:  { hit: playerHitInfo(true), dmg: playerDmgRange(true), energy: C.heavyEnergy },
      defend: { reduce: 1 - C.defendReduce, energy: C.defendEnergyRegen },
      flee:   { chance: fleeChance() }
    };
  }
  G.engine.combatOptionInfo = combatOptionInfo;

  function enemyTurn() {
    var combat = S().combat, log = combat.log;
    combat.enemies.forEach(function (e) {
      if (!e.alive) return;
      if (Math.random() > C.enemyHit) { log.push(foeName(e) + '扑空。'); return; }
      // M18：有存活同伴时，敌人每次按 50/50 分配目标——打同伴则走同伴受创（无护甲/防御加成）
      var allies = livingAllies();
      if (allies.length && Math.random() < 0.5) {
        allyTakeHit(allies[Math.floor(Math.random() * allies.length)], rand(e.dmg[0], e.dmg[1]));
        return;
      }
      var dmg = rand(e.dmg[0], e.dmg[1]);
      if (combat.defending) dmg = Math.round(dmg * C.defendReduce);
      // M14 护甲：全身 armor 合计换算成固定减伤（下限 1，不抵消防御的价值）
      var armor = G.engine.outfitArmor ? G.engine.outfitArmor() : 0;
      var soak = Math.floor(armor / C.armorDenom);
      if (soak > 0 && dmg > 0) dmg = Math.max(1, dmg - soak);
      G.engine.statAdd('hp', -dmg);
      var desc = e.descPool.length ? pick(e.descPool) : foeName(e) + '咬了上来';
      log.push(desc + '，你受到 ' + dmg + ' 点伤害' + (soak > 0 ? '（护甲挡下 ' + soak + '）' : '') + '。');
      // M14 损衣：受击有概率磨损一件在穿服装
      if (dmg > 0 && G.engine.damageClothing && Math.random() < C.clothWearChance) {
        var wearMsg = G.engine.damageClothing(1);
        if (wearMsg) log.push(wearMsg);
      }
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

  // ---- M13：对人类敌人的战败非死亡（defeat 机制） ---------------------------
  // 仅对「纯人类敌人编组 + 无 onLose/returnPassage 的散遇」生效：
  //   剧情战斗的 goto 续接段落里写有推进 flag，跳过会永久卡线，维持原「战败=死亡」；
  //   丧尸战败仍死亡（被吃了没得商量）。醒来文本由数据层注册（dol.js），缺失时回退死亡。
  function canHumanDefeat(combat) {
    if (combat.onLose || combat.returnPassage) return false;
    if (!combat.enemies.length) return false;
    if (!combat.enemies.every(function (e) { return e.human; })) return false;
    return !!(G.data.story && G.data.story.get && G.data.story.get('dol_defeat_p1'));
  }

  function humanDefeat() {
    var s = S(), p = s.player;
    // 被洗劫：子弹减半 + 每叠可堆叠物资没收一半（武器留在你手边，剧情道具他们看不上）
    var lostBullets = Math.floor(p.bullets / 2);
    p.bullets -= lostBullets;
    var lostItems = [];
    p.inventory.slice().forEach(function (entry) {
      var def = G.engine.itemDef(entry.id);
      if (def && (def.type === 'key' || def.type === 'weapon')) return;
      var take = Math.floor(entry.count / 2);
      if (take > 0) {
        G.engine.removeItem(entry.id, take);
        lostItems.push({ name: (def && def.name) || entry.id, count: take });
      }
    });
    s._defeatLoss = { bullets: lostBullets, items: lostItems };   // 易失，仅供醒来文本
    // M18：人类战败非死亡时，同伴一并被打散（丧尸战败仍走死亡，到不了这里）
    var comp = G.engine.companionState && G.engine.companionState();
    if (comp) {
      var cd = G.data.npcs && G.data.npcs[comp.id];
      s._defeatCompanion = (cd && cd.name) || comp.id;
      G.engine.companionEnd('defeat');
    } else { s._defeatCompanion = null; }
    s.world.flags.thugDefeats = (s.world.flags.thugDefeats || 0) + 1;
    // 重伤昏迷：先把 hp 立回 15 再挨过昏迷时间（3 小时的饥渴消耗压不死 15 点血）
    G.engine.statSet('hp', 15);
    G.engine.statAdd('sanity', -10);
    s.combat = null;
    G.engine.advance(180, { sleeping: true });
    if (s._dead) return;                       // 保险：昏迷结算若致死交给 onDeath
    G.engine.openPassage('dol_defeat_p1');
  }

  function endCombat(result) {
    var combat = S().combat;
    combat.over = true;
    combat.result = result;
    if (result === 'win') {
      grantLoot();
      // M16 埋点：胜利时逐个敌人登记击杀数
      if (G.engine.statTick) combat.enemies.forEach(function (e) { G.engine.statTick('kills', e.id); });
    }

    // 续接路由（回调优先，其次 returnPassage，最后回地点）
    if (result === 'lose') {
      if (combat.onLose) combat.onLose();
      else if (canHumanDefeat(combat)) humanDefeat();
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
      case 'defend':
        combat.combo = 0;
        G.engine.statAdd('energy', C.defendEnergyRegen);       // M10：防御小幅回精力
        combat.log.push('你举起手臂/武器格挡，准备承受下一击，趁隙喘了口气。');
        break;
      case 'item':   combat.combo = 0; useItemInCombat(param); break;
      case 'flee':   combat.combo = 0; fled = tryFlee(); break;
      default: combat.log.push('（无效动作）');
    }

    if (fled) { var flog = combat.log.slice(); endCombat('flee'); return { status: 'flee', log: flog, state: null }; }

    // M18：玩家行动后，同伴自动攻击（可能补刀，逃跑除外）
    allyTurn();

    if (allDead()) { combat.log.push('战斗结束。'); var wlog = combat.log.slice(); endCombat('win'); return { status: 'win', log: wlog, state: null }; }

    // 敌人回合
    enemyTurn();

    if (S().player.stats.hp <= 0) { var llog = combat.log.slice(); endCombat('lose'); return { status: 'lose', log: llog, state: null }; }

    if (G.ui.showCombat) G.ui.showCombat(combat);
    return { status: 'ongoing', log: combat.log.slice(), state: combat };
  }
  G.engine.combatAction = combatAction;

})();
