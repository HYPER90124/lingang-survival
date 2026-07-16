/* =============================================================================
 * trade.js — 交易数据 + 买卖/以物易物配套小逻辑（M3）
 * -----------------------------------------------------------------------------
 * G.data.trade[id] = {
 *   npc, location, sellRate, restock,       // restock 仅描述性，如 "weekday==4"
 *   tiers: { affinityThreshold: [itemId...] }   // 好感分层货架，累加解锁
 * }  —— zhao_main / fang_ammo 用此结构
 * G.data.trade.cai_barter = { npc, location, type:'barter', offers:[{give:{id,count}, want:{id,count}}] }
 *
 * 配套小逻辑（M1 未提供，数据层补齐，挂到 G.engine）：
 *   G.engine.shopBuyableItems(shopId)     —— 按 NPC 好感累加已解锁的货架 id 列表
 *   G.engine.shopBuy(shopId, itemId, qty) —— 用子弹购买，返回 {ok,msg}
 *   G.engine.shopSell(shopId, itemId, qty)—— 按 sellRate 卖出换子弹，返回 {ok,msg}
 *   G.engine.isRestockDay(shopId)         —— 今天是否为该店的进货日（仅供 UI 提示用）
 *   G.engine.tradeOffersToday(shopId)     —— barter 型：按天数轮换今天可用的 2 条报价
 *   G.engine.barter(shopId, offerIndex)   —— 执行一次以物易物
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
            'bandage', 'clothstrip', 'rope', 'tape', 'rustpipe', 'kitchenknife'],
        40: ['machete', 'crowbar', 'baseballbat', 'militaryfirstaid', 'antibiotics',
             'gasoline', 'battery', 'flashlight'],
        70: ['pistol', 'revolver', 'shotgun', 'sledgehammer', 'fireaxe', 'spikebat']
      }
    },
    fang_ammo: {
      npc: 'fang', location: 'checkpoint', sellRate: 0.4, restock: null,
      tiers: {
        0: ['pistol', 'revolver', 'militaryfirstaid', 'scrapmetal', 'gasoline']
      }
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

  // ---- 好感分层货架 ---------------------------------------------------------
  function buyableItems(shopId) {
    var shop = G.data.trade[shopId];
    if (!shop || !shop.tiers) return [];
    var aff = shop.npc ? G.engine.affGet(shop.npc) : 0;
    var out = [];
    Object.keys(shop.tiers).map(Number).sort(function (a, b) { return a - b; }).forEach(function (threshold) {
      if (aff >= threshold) out = out.concat(shop.tiers[threshold]);
    });
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
    var cost = (def.price || 0) * qty;
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

})();
