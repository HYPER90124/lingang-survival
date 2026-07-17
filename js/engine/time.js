/* =============================================================================
 * time.js — 时间推进、日历换算、阈值检测、睡眠结算
 * -----------------------------------------------------------------------------
 * 挂载到 G.engine：
 *
 *   G.engine.advance(minutes, opts?)  —— 逐 10 分钟步进推进时间，处理跨日/跨整点/自然消耗/阈值
 *                                        opts.sleeping=true 时精力不衰减（供 sleep 使用）
 *                                        返回 {crossedDays, crossedHours, died}
 *   G.engine.sleep(hours)             —— 睡眠：恢复精力/少量 hp，随后正常结算，返回 advance 结果
 *   G.engine.timeOfDay(state?)        —— 时段：'清晨'|'白天'|'黄昏'|'夜晚'
 *   G.engine.dateOf(day)              —— 日期换算 → {year,month,date,weekday,weekdayName,md}
 *   G.engine.dateStr(state?)          —— 便捷显示串，如 "10月12日 周日"
 *   G.engine.timeStr(state?)          —— "HH:MM"
 *   G.engine.timeCostMod()           —— 行动耗时倍率（精力<15 时 1.5，供 M2/M3 计算行动时长）
 *   G.engine.isDrunk() / isHallucinating() / isCritical() —— 阈值状态查询（供文本分支）
 *
 * 数值常量集中在文件开头 TUNE，M9 调平衡只改这里。
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  G.engine = G.engine || {};

  var STEP = 10;   // 最小时间刻度（分钟）

  // ---- 可调平衡常量（M9） --------------------------------------------------
  var TUNE = {
    hungerPer10:   0.35,   // 每 10 分钟饥饿值下降（越低越饿）
    thirstPer10:   0.40,   // 每 10 分钟口渴值下降（水源仅 2 处，较饥饿略放宽）
    energyPer10:   0.30,   // 清醒时每 10 分钟精力下降
    starveHpPer10: 0.60,   // 饥或渴低于阈值时每 10 分钟额外掉 hp
    sleepEnergyPerHour: 12, // 睡眠每小时恢复精力
    sleepHpPerHour:     1.5,// 睡眠每小时恢复 hp
    infectionDaily:     3,  // 已感染时每日进展（0 则不动）
    addictionDaily:     4,  // 成瘾时每日上升
    scavengeRegenPerDay: 3, // 每日各地点搜刮计数回落（模拟物资缓慢补给，避免永久枯竭）
    scavengeFloor:      0.5, // 搜刮命中率保底下限（被搜空的地点仍有一半基础产出）
    // 阈值线（见 docs/Schema.md「阈值效果」）
    T_STARVE: 20,   // 饥/渴 < 此值开始掉血
    T_ENERGY: 15,   // 精力 < 此值行动耗时 +50%
    T_SANITY: 20,   // 理智 < 此值触发幻觉事件池
    T_DRUNK:  60,   // 酒精 > 此值进入醉酒变体
    T_ADDICT: 50,   // 成瘾 > 此值每日发作
    T_INFECT: 80,   // 感染 > 此值进入濒死线
    lowEnergyTimeMult: 1.5,

    // ---- M15 入冬季节压力 ----------------------------------------------------
    // 季节按游戏日分三档（不做连续温度模拟）：秋(默认) → 初冬 → 深冬。
    // 开局第 90 天=10月12日；day140≈12月1日入初冬，day170≈12月31日入深冬。
    seasonDayEarly: 140,   // 初冬起始日
    seasonDayDeep:  170,   // 深冬起始日
    // 室外每 10 分钟寒冷累积基准，按季节档 [秋,初冬,深冬]；秋季 0=无寒冷压力。
    coldOutPer10:   [0, 1.1, 1.9],
    warmthRelief:   0.10,  // 每点全身有效保暖抵消的寒冷累积（outfitWarmth 读值）
    coldIndoorPer10: 2.0,  // 室内/避风每 10 分钟寒冷消退
    coldSnapSurge:  0.8,   // 寒潮期间（world.coldSnap）室外寒冷额外加成
    boilWarmRelief: 12,    // 煮水行动兼取暖：一次的寒冷消退
    fireWarmRelief: 40,    // 生火取暖（消耗柴火）一次的寒冷消退
    winterWarmMarkup: 1.5, // 冬季保暖衣物商店涨价倍率（warmth>=3 的服装）
    // 寒冷阈值（照感染/毒瘾的既有阈值模式）
    T_COLD_CAP: 50,        // cold > 此值精力上限随寒冷值等量下降
    T_COLD_HP:  80,        // cold > 此值每 10 分钟掉血（失温）
    coldHpPer10: 0.5
  };
  G.TUNE = TUNE;

  // 室内避风据点（不累积寒冷、并快速消退）；其余地点视为室外。
  var INDOOR = { home: true, bar: true, church: true };

  function S() { return G.state; }

  // ---- 日历换算 -----------------------------------------------------------
  // 锚点：第 0 天 = 7月14日 周一。借用真实历法（含月长/闰年），基准年 2025（该年 7/14 恰为周一）。
  // 星期严格按 N%7（0=周一）计算，与基准年无关，保证 Schema 锚点精确。
  var ANCHOR = Date.UTC(2025, 6, 14);          // 2025-07-14（月份 0-based）
  var WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
  var DAY_MS = 86400000;

  function dateOf(day) {
    var d = new Date(ANCHOR + day * DAY_MS);
    var wd = ((day % 7) + 7) % 7;
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      date: d.getUTCDate(),
      weekday: wd,                 // 0=周一 … 6=周日
      weekdayName: WEEKDAYS[wd],
      md: (d.getUTCMonth() + 1) + '月' + d.getUTCDate() + '日'
    };
  }
  G.engine.dateOf = dateOf;

  function dateStr(state) {
    var d = dateOf((state || S()).player.day);
    return d.md + ' ' + d.weekdayName;
  }
  function timeStr(state) {
    var m = (state || S()).player.minute;
    var h = Math.floor(m / 60), mm = m % 60;
    return (h < 10 ? '0' : '') + h + ':' + (mm < 10 ? '0' : '') + mm;
  }
  G.engine.dateStr = dateStr;
  G.engine.timeStr = timeStr;

  // ---- 时段 ---------------------------------------------------------------
  // 清晨 05–08 / 白天 08–17 / 黄昏 17–20 / 夜晚 20–05
  function timeOfDay(state) {
    var m = (state || S()).player.minute;
    if (m >= 300 && m < 480)  return '清晨';
    if (m >= 480 && m < 1020) return '白天';
    if (m >= 1020 && m < 1200) return '黄昏';
    return '夜晚';
  }
  G.engine.timeOfDay = timeOfDay;
  G.engine.isNight = function (state) { return timeOfDay(state) === '夜晚'; };

  // ---- 季节（M15） --------------------------------------------------------
  // 档位：0 秋 / 1 初冬 / 2 深冬，按游戏日阈值切换（world.season 缓存于日结算，
  // 但所有消费方一律走这里按当前日计算，兼容缺 world.season 的老档）。
  var SEASON_NAMES = ['autumn', 'earlywinter', 'deepwinter'];
  function seasonTier(day) {
    if (day >= TUNE.seasonDayDeep) return 2;
    if (day >= TUNE.seasonDayEarly) return 1;
    return 0;
  }
  function seasonTierNow(state) { return seasonTier((state || S()).player.day); }
  function seasonNow(state) { return SEASON_NAMES[seasonTierNow(state)]; }
  function isWinter(state) { return seasonTierNow(state) >= 1; }
  G.engine.seasonTier = seasonTier;
  G.engine.seasonTierNow = seasonTierNow;
  G.engine.seasonNow = seasonNow;
  G.engine.isWinter = isWinter;

  // ---- 阈值状态查询 -------------------------------------------------------
  function timeCostMod() {
    return S().player.stats.energy < TUNE.T_ENERGY ? TUNE.lowEnergyTimeMult : 1;
  }
  function isDrunk()         { return S().player.stats.alcohol > TUNE.T_DRUNK; }
  function isHallucinating() { return S().player.stats.sanity < TUNE.T_SANITY; }
  function isCritical()      { return S().player.stats.infection > TUNE.T_INFECT; }
  G.engine.timeCostMod = timeCostMod;
  G.engine.isDrunk = isDrunk;
  G.engine.isHallucinating = isHallucinating;
  G.engine.isCritical = isCritical;

  // ---- 寒冷累积/消退（M15；每 10 分钟步进调用一次） ----------------------
  // 室内：寒冷快速消退；室外：按季节档基准 - 全身保暖累积寒冷，寒潮加成，
  // 保暖充足（gain<=0）时缓慢回落。秋季无寒冷压力，仅让残留寒冷慢慢散去。
  function coldStep(p) {
    var cold = p.stats.cold || 0;
    if (INDOOR[p.location]) {
      if (cold > 0) G.engine.statAdd('cold', -TUNE.coldIndoorPer10);
      return;
    }
    var base = TUNE.coldOutPer10[seasonTier(p.day)] || 0;
    if (base <= 0) {                                   // 非冬季室外：无压力，残留缓退
      if (cold > 0) G.engine.statAdd('cold', -TUNE.coldIndoorPer10 * 0.5);
      return;
    }
    var w = S().world;
    if (w && w.flags && w.flags.coldSnap) base += TUNE.coldSnapSurge;
    var warmth = G.engine.outfitWarmth ? G.engine.outfitWarmth() : 0;
    var gain = base - warmth * TUNE.warmthRelief;
    if (gain > 0) G.engine.statAdd('cold', gain);
    else if (cold > 0) G.engine.statAdd('cold', -TUNE.coldIndoorPer10 * 0.5);
  }

  // ---- 跨日结算：毒瘾/感染日结算 + 每日事件调度 --------------------------
  function dayRollover() {
    var st = S().player.stats;
    if (S().world) S().world.season = SEASON_NAMES[seasonTier(S().player.day)];
    if (st.infection > 0) G.engine.statAdd('infection', TUNE.infectionDaily);
    if (st.addiction > TUNE.T_ADDICT) G.engine.statAdd('addiction', TUNE.addictionDaily);
    // 地点物资缓慢补给：搜刮计数每日回落（decay = max(.25, 1-count*.12)），
    // 避免同一地点被搜空后永久停在 25% 掉率，保证中后期食水「略紧但可维持」。
    var sc = S().scavenge || {};
    for (var loc in sc) {
      sc[loc] = Math.max(0, sc[loc] - TUNE.scavengeRegenPerDay);
      if (sc[loc] === 0) delete sc[loc];
    }
    // scheduled 事件按 weekday 调度 + 毒瘾发作等由事件层在 'tick' 时机统一命中；
    // 这里仅清理「每日已触发」标记，供 events.js 的 scheduled 去重。
    S().world._firedDay = {};
  }

  // ---- 时间推进 -----------------------------------------------------------
  function advance(minutes, opts) {
    opts = opts || {};
    var p = S().player;
    var steps = Math.max(0, Math.round(minutes / STEP));
    var crossedDays = 0, crossedHours = 0, died = false;

    for (var i = 0; i < steps; i++) {
      var prevMin = p.minute;
      p.minute += STEP;
      if (p.minute >= 1440) {
        p.minute -= 1440;
        p.day += 1;
        crossedDays++;
        dayRollover();
      }
      // 跨整点判定（新分钟为 60 的整数倍，或跨日回到 0）
      if (p.minute % 60 === 0) crossedHours++;

      // 自然消耗
      G.engine.statAdd('hunger', -TUNE.hungerPer10);
      G.engine.statAdd('thirst', -TUNE.thirstPer10);
      if (!opts.sleeping) G.engine.statAdd('energy', -TUNE.energyPer10);

      // M15 寒冷累积/消退（睡眠也照常，室内会消退，露宿则继续挨冻）
      coldStep(p);

      // 饥/渴过低掉血
      if (p.stats.hunger < TUNE.T_STARVE || p.stats.thirst < TUNE.T_STARVE) {
        G.engine.statAdd('hp', -TUNE.starveHpPer10);
      }

      // M15 寒冷阈值：>50 精力上限随寒冷等量压低；>80 失温掉血
      if (p.stats.cold > TUNE.T_COLD_CAP) {
        var cap = 100 - (p.stats.cold - TUNE.T_COLD_CAP);   // 50→100 … 100→50
        if (p.stats.energy > cap) G.engine.statSet('energy', cap);
      }
      if (p.stats.cold > TUNE.T_COLD_HP) G.engine.statAdd('hp', -TUNE.coldHpPer10);

      // 死亡检测（hp=0）
      if (p.stats.hp <= 0) {
        died = true;
        if (G.engine.onDeath) G.engine.onDeath('exhaustion');
        break;
      }

      // 跨整点触发事件（第四种触发时机之一）
      if (p.minute % 60 === 0 && G.engine.checkEvents) {
        G.engine.checkEvents('tick');
        if (p.stats.hp <= 0) { died = true; if (G.engine.onDeath) G.engine.onDeath('event'); break; }
      }
    }
    return { crossedDays: crossedDays, crossedHours: crossedHours, died: died };
  }
  G.engine.advance = advance;

  // ---- 睡眠 ---------------------------------------------------------------
  // 安全屋睡觉按小时恢复精力/少量 hp；跨日的毒瘾/感染结算由 advance→dayRollover 处理。
  function sleep(hours) {
    var res = advance(hours * 60, { sleeping: true });
    G.engine.statAdd('energy', TUNE.sleepEnergyPerHour * hours);
    G.engine.statAdd('hp', TUNE.sleepHpPerHour * hours);
    if (G.engine.checkEvents) G.engine.checkEvents('sleep');
    return res;
  }
  G.engine.sleep = sleep;

})();
