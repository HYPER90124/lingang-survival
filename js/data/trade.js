/* =============================================================================
 * trade.js — 交易数据 + 买卖/以物易物配套小逻辑（M3；M20 动态经济）
 * -----------------------------------------------------------------------------
 * G.data.trade[id] = {
 *   npc, location, sellRate, restock,       // restock 仅描述性，如 "weekday==4"
 *   tiers: { affinityThreshold: [itemId...] },  // 好感分层货架，累加解锁
 *   arbitrage: { cheap:[itemId...], expensive:[itemId...] }  // M20：本行便宜/外行贵品类
 * }  —— zhao_main / fang_ammo 用此结构
 * G.data.trade.cai_barter = { npc, location, type:'barter', offers:[{give:{id,count}, want:{id,count}}] }
 *
 * 配套小逻辑（M1 未提供，数据层补齐，挂到 G.engine）：
 *   G.engine.shopBuyableItems(shopId)     —— 按 NPC 好感累加已解锁、且当前有货的货架 id 列表
 *   G.engine.shopShelfItems(shopId)       —— 同上但不剔除缺货项（供 UI 显示「缺货」用）
 *   G.engine.shopShortageItems(shopId)    —— 当前缺货的 id 列表
 *   G.engine.shopUnitPrice(shopId,itemId) —— 当前实际单价（含冬季涨价 + M20 波动/套利乘数）
 *   G.engine.priceMod(itemId, shopId)     —— M20：价格乘数层，钳制 [0.6,1.8]
 *   G.engine.shopBuy(shopId, itemId, qty) —— 用子弹购买，返回 {ok,msg}
 *   G.engine.shopSell(shopId, itemId, qty)—— 按 sellRate 卖出换子弹，返回 {ok,msg}
 *   G.engine.isRestockDay(shopId)         —— 今天是否为该店的进货日（仅供 UI 提示用）
 *   G.engine.tradeOffersToday(shopId)     —— barter 型：按天数轮换今天可用的 2 条报价
 *   G.engine.barter(shopId, offerIndex)   —— 执行一次以物易物
 *   G.engine.marketSettle()               —— M20：跨日结算物价波动/缺货，挂在 time.js dayRollover
 *
 * M20 波动源（均读现有 world 旗，跨日结算一次性算好存 world.market，当日恒定防刷）：
 *   世界 flag（读取，本模块不写）：world.hordeNight（尸潮次日食/水/绷带×1.5，持续2天）、
 *     world._rainedToday（M17 既有的「昨天下过雨」标记，水类×0.7）、world.butcherFallen
 *     （M19，倒台后 fang_ammo 子弹类×0.8；未收网时读 cooldowns.butcher_world_1 反推
 *     「昨天是否收账」，命中则 zhao_main 全线×1.2）。
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  G.data = G.data || {};

  G.data.trade = {
    zhao_main: {
      npc: 'zhao', location: 'market', sellRate: 0.5, restock: 'weekday==4',
      tiers: {
        0: ['bottledwater', 'cannedfood', 'drycracker', 'instantnoodle', 'herbaltea',
            'bandage', 'clothstrip', 'rope', 'tape', 'rustpipe', 'kitchenknife',
            'sewingkit', 'hoodie', 'worn_jeans', 'work_boots'],          // M14：日用服装 + 针线包
        40: ['machete', 'crowbar', 'baseballbat', 'militaryfirstaid', 'antibiotics',
             'gasoline', 'battery', 'flashlight',
             'down_jacket', 'thermal_pants', 'cargo_pants', 'raincoat'], // M14：入冬保暖装
        70: ['pistol', 'revolver', 'shotgun', 'sledgehammer', 'fireaxe', 'spikebat',
             'leather_jacket']
      },
      winterStock: ['firewood'],  // M15：冬季上新（柴火；保暖衣物本就在 tier40，入冬另涨价）
      // M20：杂货铺本行日用/医疗便宜，外行的军货（枪械）贵——和 fang_ammo 互为镜像
      arbitrage: { cheap: ['militaryfirstaid', 'gasoline'], expensive: ['pistol', 'revolver'] }
    },
    fang_ammo: {
      npc: 'fang', location: 'checkpoint', sellRate: 0.4, restock: null,
      tiers: {
        0: ['pistol', 'revolver', 'militaryfirstaid', 'scrapmetal', 'gasoline',
            'tactical_vest', 'tactical_pants', 'combat_boots']           // M14：军用护甲装
      },
      // M20：军货（枪械）本行便宜，外行的日用/医疗贵
      arbitrage: { cheap: ['pistol', 'revolver'], expensive: ['militaryfirstaid', 'gasoline'] }
    },
    cai_barter: {
      npc: 'cai', location: 'dock', type: 'barter',
      offers: [
        { give: { id: 'liquor', count: 1 }, want: { id: 'gasoline', count: 1 } },
        { give: { id: 'chocolatebar', count: 1 }, want: { id: 'cannedfish', count: 1 } },
        { give: { id: 'huntingknife', count: 1 }, want: { id: 'toolkit', count: 1 } },
        { give: { id: 'militaryfirstaid', count: 1 }, want: { id: 'sparepart', count: 3 } },
        { give: { id: 'antibiotics', count: 1 }, want: { id: 'battery', count: 2 } },
        { give: { id: 'sedative', count: 1 }, want: { id: 'liquor', count: 2 } }
      ]
    }
  };

  // M15：当前实际售价（冬季保暖衣物 warmth>=3 涨价；其余物品原价）。
  function itemPriceNow(id) {
    var def = G.engine.itemDef(id);
    if (!def || def.price == null) return def ? def.price : null;
    var price = def.price;
    if (def.type === 'clothing' && (def.warmth || 0) >= 3 &&
        G.engine.isWinter && G.engine.isWinter()) {
      price = Math.ceil(price * ((G.TUNE && G.TUNE.winterWarmMarkup) || 1.5));
    }
    return price;
  }
  G.engine.itemPriceNow = itemPriceNow;

  // ---- 好感分层货架 ---------------------------------------------------------
  function buyableItems(shopId) {
    var shop = G.data.trade[shopId];
    if (!shop || !shop.tiers) return [];
    var aff = shop.npc ? G.engine.affGet(shop.npc) : 0;
    var out = [];
    Object.keys(shop.tiers).map(Number).sort(function (a, b) { return a - b; }).forEach(function (threshold) {
      if (aff >= threshold) out = out.concat(shop.tiers[threshold]);
    });
    // M15 冬季上新：winterStock 仅在初冬/深冬追加（去重，避免与货架重复）
    if (shop.winterStock && G.engine.isWinter && G.engine.isWinter()) {
      shop.winterStock.forEach(function (id) { if (out.indexOf(id) < 0) out.push(id); });
    }
    return out;
  }
  G.engine.shopBuyableItems = buyableItems;

  function shopBuy(shopId, itemId, qty) {
    qty = qty || 1;
    var shop = G.data.trade[shopId];
    if (!shop || shop.type === 'barter') return { ok: false, msg: '这里不支持这样买卖。' };
    if (buyableItems(shopId).indexOf(itemId) < 0) return { ok: false, msg: '这里没有卖这个。' };
    var def = G.engine.itemDef(itemId);
    if (!def) return { ok: false, msg: '未知道具。' };
    var cost = (itemPriceNow(itemId) || 0) * qty;   // M15：冬季保暖衣物按涨价后价结算
    if (G.state.player.bullets < cost) return { ok: false, msg: '子弹不够。' };
    G.state.player.bullets -= cost;
    G.engine.addItem(itemId, qty);
    return { ok: true, msg: '买下[item]' + def.name + (qty > 1 ? ('×' + qty) : '') + '[/item]，花了 ' + cost + ' 发子弹。' };
  }
  G.engine.shopBuy = shopBuy;

  function shopSell(shopId, itemId, qty) {
    qty = qty || 1;
    var shop = G.data.trade[shopId];
    if (!shop || shop.type === 'barter') return { ok: false, msg: '这里不支持这样买卖。' };
    var def = G.engine.itemDef(itemId);
    if (!def || def.price == null) return { ok: false, msg: '这东西没法卖。' };
    if (G.engine.countItem(itemId) < qty) return { ok: false, msg: '你没有这么多。' };
    var gain = Math.round(def.price * (shop.sellRate == null ? 0.5 : shop.sellRate) * qty);
    G.engine.removeItem(itemId, qty);
    G.state.player.bullets += gain;
    return { ok: true, msg: '卖出[item]' + def.name + (qty > 1 ? ('×' + qty) : '') + '[/item]，得了 ' + gain + ' 发子弹。' };
  }
  G.engine.shopSell = shopSell;

  function isRestockDay(shopId) {
    var shop = G.data.trade[shopId];
    if (!shop || !shop.restock) return false;
    var m = /weekday==(\d)/.exec(shop.restock);
    if (!m) return false;
    return (G.state.player.day % 7) === Number(m[1]);
  }
  G.engine.isRestockDay = isRestockDay;

  // ---- 以物易物（老蔡）：按天数轮换今天可用的报价 --------------------------
  function tradeOffersToday(shopId) {
    var shop = G.data.trade[shopId];
    if (!shop || !shop.offers || !shop.offers.length) return [];
    var n = shop.offers.length;
    var day = G.state.player.day;
    var i1 = day % n, i2 = (day + Math.floor(n / 2)) % n;
    var idxs = i1 === i2 ? [i1] : [i1, i2];
    return idxs.map(function (i) { return { index: i, offer: shop.offers[i] }; });
  }
  G.engine.tradeOffersToday = tradeOffersToday;

  function barter(shopId, offerIndex) {
    var shop = G.data.trade[shopId];
    if (!shop || !shop.offers || !shop.offers[offerIndex]) return { ok: false, msg: '没有这条交易。' };
    var offer = shop.offers[offerIndex];
    if (G.engine.countItem(offer.want.id) < offer.want.count) {
      var wantDef = G.engine.itemDef(offer.want.id);
      return { ok: false, msg: '你没有足够的[item]' + (wantDef ? wantDef.name : offer.want.id) + '[/item]。' };
    }
    G.engine.removeItem(offer.want.id, offer.want.count);
    G.engine.addItem(offer.give.id, offer.give.count);
    var giveDef = G.engine.itemDef(offer.give.id);
    return { ok: true, msg: '拿东西换到了[item]' + (giveDef ? giveDef.name : offer.give.id) + '[/item]。' };
  }
  G.engine.barter = barter;

  // ---- M20：跨日结算物价波动 -------------------------------------------------
  // 每次跨日结算算好，存入 world.market，当日恒定（防止反复开合商店刷新）。
  // 必须在 time.js dayRollover 把 world._rainedToday 清零之前调用，才能读到「昨天下过雨」。
  function marketSettle() {
    var s = G.state, w = s && s.world;
    if (!w) return;
    if (!w.market) w.market = { day: -1, hordeSurgeDays: 0, rainDiscount: false, butcherTax: false, shortage: {} };
    var m = w.market;
    if (m.day === s.player.day) return;   // 同日只结算一次

    // 尸潮夜次日：食/水/绷带×1.5，持续 2 天。跨日结算这一刻 hordeNight 若仍为 true，
    // 说明昨晚的尸潮夜刚在今晨（05:00）收尾，刷新为 2 天倒计时；否则逐日递减。
    if (G.engine.getFlag('world.hordeNight')) m.hordeSurgeDays = 2;
    else if (m.hordeSurgeDays > 0) m.hordeSurgeDays -= 1;

    // 雨天：水类×0.7。world.rainDay 当晚 20:00 前必收尾，跨日时读不到；
    // 用 M17 已有的「昨天下过雨」标记 _rainedToday（time.js 随后才清零）。
    m.rainDiscount = !!w._rainedToday;

    // 未收网时收账队事件当日：zhao_main 全线×1.2（保护费转嫁）。
    // 读 cooldowns.butcher_world_1 反推其触发日是否为昨天（该事件 cooldown 固定 1440 分钟=1天），
    // 若 (当前分钟 - 1440) 整除 1440 = 昨天零点，且 昨天零点位于今天（day），则昨天发生了收账。
    m.butcherTax = false;
    if (!G.engine.getFlag('world.butcherFallen')) {
      var cd = w.cooldowns && w.cooldowns.butcher_world_1;
      if (cd != null && Math.floor((cd - 1440) / 1440) === s.player.day - 1 &&
          Math.floor((s.player.day * 1440 + s.player.minute) / 1440) >= s.player.day) {
        m.butcherTax = true;
      }
    }

    // 随机缺货：每个有固定进货日的店，进货当天 15% 概率某档随机 1–2 种缺货至下次进货。
    if (!m.shortage) m.shortage = {};
    Object.keys(G.data.trade).forEach(function (shopId) {
      var shop = G.data.trade[shopId];
      if (!shop || shop.type === 'barter' || !isRestockDay(shopId)) return;
      var picks = [];
      if (Math.random() < 0.15) {
        var tierKeys = Object.keys(shop.tiers);
        var pool = shop.tiers[tierKeys[Math.floor(Math.random() * tierKeys.length)]].slice();
        var n = Math.min(pool.length, 1 + Math.floor(Math.random() * 2));
        for (var i = 0; i < n; i++) picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
      }
      m.shortage[shopId] = picks;
    });

    m.day = s.player.day;
  }
  G.engine.marketSettle = marketSettle;

  // ---- M20：价格乘数层 -------------------------------------------------------
  // 综合当日结算的波动 + 持续性效果（子弹松动）+ 差价套利品类，钳制 [0.6, 1.8]。
  // 剧情礼物/非卖品（price:null）与 cai_barter 以物易物不经过此层。
  function priceMod(itemId, shopId) {
    var shop = G.data.trade[shopId];
    var def = G.engine.itemDef(itemId);
    if (!shop || !def || shop.type === 'barter') return 1;
    var w = G.state.world || {};
    var m = w.market || {};
    var mod = 1;

    if (m.hordeSurgeDays > 0 && (def.type === 'food' || def.type === 'drink' || itemId === 'bandage')) {
      mod *= 1.5;
    }
    if (m.rainDiscount && def.type === 'drink') {
      mod *= 0.7;
    }
    if (shopId === 'fang_ammo' && def.type === 'weapon' && def.ranged &&
        G.engine.getFlag('world.butcherFallen')) {
      mod *= 0.8;
    }
    if (shopId === 'zhao_main' && m.butcherTax) {
      mod *= 1.2;
    }
    if (shop.arbitrage) {
      if (shop.arbitrage.cheap && shop.arbitrage.cheap.indexOf(itemId) >= 0) mod *= 0.85;
      if (shop.arbitrage.expensive && shop.arbitrage.expensive.indexOf(itemId) >= 0) mod *= 1.15;
    }

    if (mod < 0.6) mod = 0.6;
    if (mod > 1.8) mod = 1.8;
    return mod;
  }
  G.engine.priceMod = priceMod;

  // 当前实际单价 = 冬季涨价后的基价 × M20 波动/套利乘数（四舍五入到整数子弹）。
  function shopUnitPrice(shopId, itemId) {
    var base = itemPriceNow(itemId);
    if (base == null) return null;
    return Math.round(base * priceMod(itemId, shopId));
  }
  G.engine.shopUnitPrice = shopUnitPrice;

  function shortageItems(shopId) {
    var w = G.state.world;
    return (w && w.market && w.market.shortage && w.market.shortage[shopId]) || [];
  }
  G.engine.shopShortageItems = shortageItems;

  // ---- 好感分层货架 ---------------------------------------------------------
  // shopShelfItems：解锁的全部货架（含当前缺货项，供 UI 显示「缺货」用）。
  function shelfItems(shopId) {
    var shop = G.data.trade[shopId];
    if (!shop || !shop.tiers) return [];
    var aff = shop.npc ? G.engine.affGet(shop.npc) : 0;
    var out = [];
    Object.keys(shop.tiers).map(Number).sort(function (a, b) { return a - b; }).forEach(function (threshold) {
      if (aff >= threshold) out = out.concat(shop.tiers[threshold]);
    });
    // M15 冬季上新：winterStock 仅在初冬/深冬追加（去重，避免与货架重复）
    if (shop.winterStock && G.engine.isWinter && G.engine.isWinter()) {
      shop.winterStock.forEach(function (id) { if (out.indexOf(id) < 0) out.push(id); });
    }
    return out;
  }
  G.engine.shopShelfItems = shelfItems;

  // shopBuyableItems：真正可购买的（剔除当前缺货项）。
  function buyableItems(shopId) {
    var out = shelfItems(shopId);
    var short = shortageItems(shopId);
    if (short.length) out = out.filter(function (id) { return short.indexOf(id) < 0; });
    return out;
  }
  G.engine.shopBuyableItems = buyableItems;

  function shopBuy(shopId, itemId, qty) {
    qty = qty || 1;
    var shop = G.data.trade[shopId];
    if (!shop || shop.type === 'barter') return { ok: false, msg: '这里不支持这样买卖。' };
    if (buyableItems(shopId).indexOf(itemId) < 0) {
      if (shelfItems(shopId).indexOf(itemId) >= 0) return { ok: false, msg: '这东西正缺货，等下次进货再来看看。' };
      return { ok: false, msg: '这里没有卖这个。' };
    }
    var def = G.engine.itemDef(itemId);
    if (!def) return { ok: false, msg: '未知道具。' };
    var unit = shopUnitPrice(shopId, itemId) || 0;   // M15 冬季涨价 + M20 波动/套利后的实价
    var cost = unit * qty;
    if (G.state.player.bullets < cost) return { ok: false, msg: '子弹不够。' };
    G.state.player.bullets -= cost;
    G.engine.addItem(itemId, qty);
    return { ok: true, msg: '买下[item]' + def.name + (qty > 1 ? ('×' + qty) : '') + '[/item]，花了 ' + cost + ' 发子弹。' };
  }
  G.engine.shopBuy = shopBuy;

  function shopSell(shopId, itemId, qty) {
    qty = qty || 1;
    var shop = G.data.trade[shopId];
    if (!shop || shop.type === 'barter') return { ok: false, msg: '这里不支持这样买卖。' };
    var def = G.engine.itemDef(itemId);
    if (!def || def.price == null) return { ok: false, msg: '这东西没法卖。' };
    if (G.engine.countItem(itemId) < qty) return { ok: false, msg: '你没有这么多。' };
    var unit = shopUnitPrice(shopId, itemId);
    if (unit == null) unit = def.price;
    var gain = Math.round(unit * (shop.sellRate == null ? 0.5 : shop.sellRate) * qty);
    G.engine.removeItem(itemId, qty);
    G.state.player.bullets += gain;
    return { ok: true, msg: '卖出[item]' + def.name + (qty > 1 ? ('×' + qty) : '') + '[/item]，得了 ' + gain + ' 发子弹。' };
  }
  G.engine.shopSell = shopSell;

})();
