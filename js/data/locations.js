/* =============================================================================
 * locations.js — 地点数据 + 移动/搜刮配套小逻辑 + 通用氛围事件（M3；M11 加地图坐标+水源）
 * -----------------------------------------------------------------------------
 * G.data.locations[id] = {
 *   name, descDay, descNight,           // 描述分时段两版，由 locationDesc() 按时段挑选
 *   actions: [ {id,label,type,time,energy,requiresItem?,water?,cond?} ],  // 搜刮/采集/取水行动
 *   scavengeTable: [ {tier,weight, items:[{id,chance,count|min&max}]} ],  // 三层稀有度
 *   adjacent: { locId: minutes },       // 相邻地点与移动耗时
 *   shortcuts: { locId: minutes },      // 仅 sewer 登记，随 world.sewerShortcut 解锁双向生效
 *   hours: [start,end] | null,          // 开放时段（分钟，跨午夜写法见 Schema），null=全天
 *   danger: 0-3,                        // 危险度，决定本文件随机事件的量级（非引擎读取字段）
 *   requiresItem: 'flashlight',         // 搜刮该地点需持有的道具（metro/sewer）
 *   mapPos: {x,y}                       // M11 新增：0–100 逻辑坐标，供地图面板按真实地理摆放，引擎不读
 * }
 *
 * action.type 三种：
 *   'scavenge' —— 走 G.engine.scavenge，按地点 scavengeTable 加权掉落
 *   'water'    —— 走 G.engine.gatherWater（M11 新增），action.water:'river'|'rain' 区分取水/接雨水，
 *                  requiresItem:'glassbottle'（消耗 1 个换生水 1 份），rain 型另需 world.rainDay
 *   'boil'     —— 走 G.engine.boilWater（M11 新增），requiresItem:'lighter'（不消耗），
 *                  把包里 1 份生水（优先 riverwater，无则 rainwater）转成 boiledwater；
 *                  M15：兼「取暖」，煮水时顺带消退寒冷 TUNE.boilWarmRelief
 *   'warm'     —— 走 G.engine.makeFire（M15 新增），requiresItem:'firewood'（消耗 1），
 *                  室外「生火取暖」大幅消退寒冷 TUNE.fireWarmRelief；cond:{stat:{cold:{gt:0}}} 仅有寒冷时显示
 *
 * 配套小逻辑（M1 未提供，数据层补齐，挂到 G.engine）：
 *   G.engine.locationNeighbors(locId)   —— 含 sewer 捷径解锁后的双向可达表 {locId:minutes}
 *   G.engine.isLocationOpen(locId)      —— 按 player.minute 判断当前是否在开放时段
 *   G.engine.travelTo(destId)           —— 校验可达/开放→扣时间(×timeCostMod)→goLocation
 *   G.engine.scavenge(locId, actionId)  —— 三层加权随机掉落，随 scavenge 次数递减，扣时间/精力，
 *                                          结算后调 checkEvents('action')；返回 {ok,found,msg}
 *   G.engine.gatherWater(locId,actionId)—— M11：取水/接雨水，见上，返回 {ok,msg}
 *   G.engine.boilWater(locId,actionId)  —— M11：煮水，见上，返回 {ok,msg}
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  G.data = G.data || {};

  G.data.locations = {

    home: {
      name: '安全屋',
      descDay: '客厅地板铺着旧毯子，窗帘拉得只留一条缝，桌上摆着从这屋里翻出来的物资。',
      descNight: '你把门栓插死，屋外的声响隔着一层砖墙，烛火晃得墙上影子跟着抖。',
      actions: [
        { id: 'boil_water', label: '烧水煮沸', type: 'boil', time: 20, energy: 3, requiresItem: 'lighter' }
      ],   // 安全区：睡觉/储物箱/存档由 M2 UI 直接调用引擎接口，不算搜刮行动
      scavengeTable: [],
      adjacent: { residential: 20, market: 20, bar: 30 },
      hours: null, danger: 0, mapPos: { x: 15, y: 40 }
    },

    residential: {
      name: '居民区',
      descDay: '居民楼的窗户大多碎了，阳台上晾着的衣服风干发硬，楼道里堆着没搬完的家当。',
      descNight: '路灯全灭，只有几户高层还亮着蜡烛，楼道深处不时传来拖拽的声响。',
      actions: [{ id: 'scavenge', label: '挨家挨户搜刮', type: 'scavenge', time: 30, energy: 8 }],
      scavengeTable: [
        { tier: 'common', weight: 60, items: [
          { id: 'clothstrip', chance: 0.5 }, { id: 'cannedfood', chance: 0.35 },
          { id: 'bandage', chance: 0.3 }, { id: 'riceball', chance: 0.3 }
        ] },
        { tier: 'uncommon', weight: 30, items: [
          { id: 'kitchenknife', chance: 0.25 }, { id: 'tape', chance: 0.2 },
          { id: 'chocolatebar', chance: 0.2 }, { id: 'painkiller', chance: 0.15 }
        ] },
        { tier: 'rare', weight: 10, items: [
          { id: 'militaryfirstaid', chance: 0.08 }, { id: 'pistol', chance: 0.03 }
        ] }
      ],
      adjacent: { home: 20, market: 20, hospital: 25, police: 30, church: 20 },
      hours: null, danger: 2, mapPos: { x: 30, y: 15 }
    },

    market: {
      name: '惠民超市',
      descDay: '货架大半被搬空，赵铁的人守在收银台后，子弹上膛的声音很清楚。',
      descNight: '卷帘门落了锁，只有后门透出一点灯光，那是赵铁清点货品的时间。',
      actions: [{ id: 'scavenge', label: '翻找剩余存货', type: 'scavenge', time: 20, energy: 5 }],
      scavengeTable: [
        { tier: 'common', weight: 60, items: [
          { id: 'cannedfood', chance: 0.4 }, { id: 'bottledwater', chance: 0.4 }, { id: 'drycracker', chance: 0.3 }
        ] },
        { tier: 'uncommon', weight: 30, items: [
          { id: 'instantnoodle', chance: 0.25 }, { id: 'herbaltea', chance: 0.2 }, { id: 'battery', chance: 0.15 }
        ] },
        { tier: 'rare', weight: 10, items: [ { id: 'antibiotics', chance: 0.1 } ] }
      ],
      adjacent: { home: 20, residential: 20, bar: 20, dock: 30 },
      hours: [480, 1200], danger: 1, mapPos: { x: 20, y: 60 }
    },

    hospital: {
      name: '市二医院',
      descDay: '走廊灯管坏了一半，消毒水味压不住底下的腐味，林晚的诊室亮着一盏灯。',
      descNight: '急诊大厅空荡荡的，只有二楼手术室那扇门缝里漏出光。',
      actions: [{ id: 'scavenge', label: '翻找药品柜', type: 'scavenge', time: 30, energy: 6 }],
      scavengeTable: [
        { tier: 'common', weight: 60, items: [
          { id: 'bandage', chance: 0.5 }, { id: 'antihistamine', chance: 0.3 }, { id: 'vitaminpills', chance: 0.3 }
        ] },
        { tier: 'uncommon', weight: 30, items: [
          { id: 'antibiotics', chance: 0.3 }, { id: 'disinfectant', chance: 0.25 }, { id: 'splint', chance: 0.2 }
        ] },
        { tier: 'rare', weight: 10, items: [
          { id: 'militaryfirstaid', chance: 0.15 }, { id: 'sedative', chance: 0.1 }
        ] }
      ],
      adjacent: { residential: 25, campus: 25, police: 30 },
      hours: null, danger: 2, mapPos: { x: 55, y: 10 }
    },

    police: {
      name: '警局废楼',
      descDay: '档案室的柜子东倒西歪，纸张撒了一地，楼上传来隐约的脚步声。',
      descNight: '楼道彻底黑透，只有老秦值守时留的一盏应急灯还亮着。',
      actions: [{ id: 'scavenge', label: '搜刮武器军械', type: 'scavenge', time: 35, energy: 10 }],
      scavengeTable: [
        { tier: 'common', weight: 60, items: [
          { id: 'clothstrip', chance: 0.3 }, { id: 'tape', chance: 0.25 }, { id: 'scrapmetal', chance: 0.3 }
        ] },
        { tier: 'uncommon', weight: 30, items: [
          { id: 'baseballbat', chance: 0.2 }, { id: 'crowbar', chance: 0.2 }, { id: 'huntingknife', chance: 0.15 }
        ] },
        { tier: 'rare', weight: 10, items: [
          { id: 'pistol', chance: 0.12 }, { id: 'revolver', chance: 0.06 }, { id: 'machete', chance: 0.08 }
        ] }
      ],
      adjacent: { residential: 30, bar: 25, hospital: 30, mall: 35 },
      hours: null, danger: 3, mapPos: { x: 45, y: 30 }
    },

    bar: {
      name: '酒吧·避风港',
      descDay: '白天的酒吧没什么人，苏曼在吧台后面擦杯子，半数椅子还倒扣在桌面上，油灯只点了靠里的几盏。',
      descNight: '灯光昏黄，酒气混着烟味，老秦在门口守着，没人敢在这里动手。',
      actions: [
        { id: 'boil_water', label: '烧水煮沸', type: 'boil', time: 20, energy: 3, requiresItem: 'lighter' }
      ],   // 中立据点禁械，无搜刮
      scavengeTable: [],
      adjacent: { home: 30, market: 20, police: 25, campus: 30, church: 20 },
      hours: [600, 120], danger: 0, mapPos: { x: 40, y: 50 }
    },

    campus: {
      name: '临港大学',
      descDay: '教学楼玻璃碎了大半，图书馆的书散落一地，广播站方向隐约传来电流声。',
      descNight: '校园里黑得伸手不见五指，只有广播站那扇窗还亮着一点光。',
      actions: [{ id: 'scavenge', label: '翻找教学楼', type: 'scavenge', time: 30, energy: 7 }],
      scavengeTable: [
        { tier: 'common', weight: 60, items: [
          { id: 'clothstrip', chance: 0.3 }, { id: 'chocolatebar', chance: 0.3 }, { id: 'wire', chance: 0.25 }
        ] },
        { tier: 'uncommon', weight: 30, items: [
          { id: 'battery', chance: 0.25 }, { id: 'herbaltonic', chance: 0.2 }, { id: 'painkiller', chance: 0.15 }
        ] },
        { tier: 'rare', weight: 10, items: [ { id: 'antibiotics', chance: 0.1 }, { id: 'sedative', chance: 0.08 } ] }
      ],
      adjacent: { bar: 30, hospital: 25, park: 25, checkpoint: 35 },
      hours: null, danger: 2, mapPos: { x: 80, y: 15 }
    },

    metro: {
      name: '地铁站',
      descDay: '站厅漆黑一片，闸机歪倒在地，没有光根本看不清脚下。',
      descNight: '隧道口的黑比白天更浓，不知道多深处传来一声闷响。',
      actions: [{ id: 'scavenge', label: '摸黑搜刮', type: 'scavenge', time: 35, energy: 10, requiresItem: 'flashlight' }],
      scavengeTable: [
        { tier: 'common', weight: 60, items: [
          { id: 'scrapmetal', chance: 0.3 }, { id: 'wire', chance: 0.25 }, { id: 'clothstrip', chance: 0.25 }
        ] },
        { tier: 'uncommon', weight: 30, items: [
          { id: 'battery', chance: 0.3 }, { id: 'tape', chance: 0.2 }, { id: 'sparepart', chance: 0.25 }
        ] },
        { tier: 'rare', weight: 10, items: [
          { id: 'militaryfirstaid', chance: 0.12 }, { id: 'pistol', chance: 0.08 }, { id: 'revolver', chance: 0.05 }
        ] }
      ],
      adjacent: { mall: 35 },
      requiresItem: 'flashlight',
      hours: null, danger: 3, mapPos: { x: 65, y: 65 }
    },

    park: {
      name: '滨江公园',
      descDay: '江风吹得芦苇沙沙响，岸边野菜长得倒是茂盛，几个幸存者远远地在钓鱼。',
      descNight: '江边黑得没有一点光，水声盖住了脚步声，不知道什么时候会窜出东西。',
      actions: [
        { id: 'forage', label: '采集野菜', type: 'scavenge', time: 20, energy: 5 },
        { id: 'river_water', label: '去江边取水', type: 'water', water: 'river', time: 15, energy: 3, requiresItem: 'glassbottle' }
      ],
      scavengeTable: [
        { tier: 'common', weight: 60, items: [ { id: 'wildveggie', chance: 0.6 } ] },
        { tier: 'uncommon', weight: 30, items: [ { id: 'herbaltonic', chance: 0.25 }, { id: 'chocolatebar', chance: 0.15 } ] },
        { tier: 'rare', weight: 10, items: [ { id: 'huntingknife', chance: 0.1 } ] }
      ],
      adjacent: { campus: 25, gas: 25, mall: 30 },
      hours: null, danger: 1, mapPos: { x: 85, y: 35 }   // 昼低危、夜高危，见本文件末尾夜间遇敌事件
    },

    gas: {
      name: '加油站',
      descDay: '加油站棚顶塌了一角，阿豆蹲在车斗底下鼓捣一台引擎。',
      descNight: '招牌灯早灭了，阿豆屋里的煤油灯还亮着，能听见电动工具间歇的响声。',
      actions: [
        { id: 'siphon', label: '抽取汽油', type: 'scavenge', time: 20, energy: 5 },
        { id: 'scavenge', label: '翻找修车间', type: 'scavenge', time: 25, energy: 6 },
        { id: 'boil_water', label: '烧水煮沸', type: 'boil', time: 20, energy: 3, requiresItem: 'lighter' }
      ],
      scavengeTable: [
        { tier: 'common', weight: 60, items: [
          { id: 'gasoline', chance: 0.5 }, { id: 'sparepart', chance: 0.35 }, { id: 'scrapmetal', chance: 0.3 }
        ] },
        { tier: 'uncommon', weight: 30, items: [
          { id: 'toolkit', chance: 0.2 }, { id: 'wire', chance: 0.25 }, { id: 'tape', chance: 0.2 }
        ] },
        { tier: 'rare', weight: 10, items: [ { id: 'sledgehammer', chance: 0.08 }, { id: 'militaryfirstaid', chance: 0.1 } ] }
      ],
      adjacent: { park: 25, dock: 25, checkpoint: 30 },
      hours: null, danger: 2, mapPos: { x: 75, y: 75 }
    },

    mall: {
      name: '中环商场',
      descDay: '中庭天窗碎了，阳光斜斜照进来，能看到几层楼货架还没被搬空。',
      descNight: '商场里黑得像口井，偶尔有金属碰撞的声音从楼上传来。',
      actions: [{ id: 'scavenge', label: '深入商场搜刮', type: 'scavenge', time: 35, energy: 10 }],
      scavengeTable: [
        { tier: 'common', weight: 60, items: [
          { id: 'clothstrip', chance: 0.3 }, { id: 'chocolatebar', chance: 0.3 }, { id: 'cannedfish', chance: 0.25 },
          { id: 'worn_tshirt', chance: 0.18 }, { id: 'short_skirt', chance: 0.12 }, { id: 'worn_flats', chance: 0.15 } // M14：服装区货架
        ] },
        { tier: 'uncommon', weight: 30, items: [
          { id: 'machete', chance: 0.2 }, { id: 'spikebat', chance: 0.15 }, { id: 'liquor', chance: 0.2 },
          { id: 'hoodie', chance: 0.15 }, { id: 'cargo_pants', chance: 0.12 }, { id: 'rubber_boots', chance: 0.12 }
        ] },
        { tier: 'rare', weight: 10, items: [
          { id: 'shotgun', chance: 0.06 }, { id: 'revolver', chance: 0.06 }, { id: 'militaryfirstaid', chance: 0.12 },
          { id: 'leather_jacket', chance: 0.08 }, { id: 'down_jacket', chance: 0.08 }
        ] }
      ],
      adjacent: { police: 35, park: 30, checkpoint: 35, metro: 35 },
      hours: null, danger: 3, mapPos: { x: 65, y: 45 }
    },

    church: {
      name: '圣心教堂',
      descDay: '教堂彩窗还剩几块完整的，阳光照在空荡的座椅上，陈神父在门口清扫落叶。',
      descNight: '烛台还燃着几支蜡烛，陈神父在祭坛前低声念着什么。',
      actions: [
        { id: 'boil_water', label: '烧水煮沸', type: 'boil', time: 20, energy: 3, requiresItem: 'lighter' }
      ],   // 安全区，无搜刮；理智恢复与陈神父互动留给 M8
      scavengeTable: [],
      adjacent: { residential: 20, bar: 20 },
      hours: [360, 1320], danger: 0, mapPos: { x: 10, y: 20 }
    },

    dock: {
      name: '码头仓库',
      descDay: '集装箱码得东倒西歪，老蔡蹲在码头边上，盯着江面发呆。',
      descNight: '江雾很浓，仓库那边偶尔有手电光晃过，不知道是不是自己人。',
      actions: [
        { id: 'scavenge', label: '翻找集装箱', type: 'scavenge', time: 30, energy: 7 },
        { id: 'river_water', label: '去江边取水', type: 'water', water: 'river', time: 15, energy: 3, requiresItem: 'glassbottle' }
      ],
      scavengeTable: [
        { tier: 'common', weight: 60, items: [
          { id: 'rope', chance: 0.3 }, { id: 'glassbottle', chance: 0.3 }, { id: 'scrapmetal', chance: 0.3 }
        ] },
        { tier: 'uncommon', weight: 30, items: [
          { id: 'gasoline', chance: 0.25 }, { id: 'liquor', chance: 0.2 }, { id: 'cannedfish', chance: 0.2 }
        ] },
        { tier: 'rare', weight: 10, items: [ { id: 'revolver', chance: 0.06 }, { id: 'toolkit', chance: 0.1 } ] }
      ],
      adjacent: { market: 30, gas: 25, sewer: 30 },
      hours: null, danger: 2, mapPos: { x: 30, y: 80 }
    },

    checkpoint: {
      name: '军营检查站废墟',
      descDay: '路障后面倒着一辆锈透的军车，方哨举着枪从掩体后探出头。',
      descNight: '探照灯早就不亮了，只剩方哨手里一支手电胡乱扫着。',
      actions: [{ id: 'scavenge', label: '搜刮军用物资', type: 'scavenge', time: 35, energy: 9 }],
      scavengeTable: [
        { tier: 'common', weight: 60, items: [
          { id: 'scrapmetal', chance: 0.3 }, { id: 'clothstrip', chance: 0.3 }, { id: 'tape', chance: 0.25 }
        ] },
        { tier: 'uncommon', weight: 30, items: [
          { id: 'militaryfirstaid', chance: 0.2 }, { id: 'antibiotics', chance: 0.2 }, { id: 'spikebat', chance: 0.15 }
        ] },
        { tier: 'rare', weight: 10, items: [
          { id: 'shotgun', chance: 0.08 }, { id: 'revolver', chance: 0.08 }, { id: 'sledgehammer', chance: 0.06 }
        ] }
      ],
      adjacent: { campus: 35, gas: 30, mall: 35 },
      hours: null, danger: 3, mapPos: { x: 90, y: 55 }
    },

    sewer: {
      name: '下水道',
      descDay: '下水道里终年不见光，水流声混着说不清的回响。',
      descNight: '黑暗中分不出昼夜，水流声里偶尔混进脚步声。',
      actions: [{ id: 'scavenge', label: '摸索搜刮', type: 'scavenge', time: 30, energy: 8, requiresItem: 'flashlight' }],
      scavengeTable: [
        { tier: 'common', weight: 60, items: [
          { id: 'clothstrip', chance: 0.3 }, { id: 'glassbottle', chance: 0.25 }, { id: 'wire', chance: 0.2 }
        ] },
        { tier: 'uncommon', weight: 30, items: [
          { id: 'battery', chance: 0.25 }, { id: 'rope', chance: 0.2 }, { id: 'sparepart', chance: 0.2 }
        ] },
        { tier: 'rare', weight: 10, items: [ { id: 'huntingknife', chance: 0.1 }, { id: 'machete', chance: 0.06 } ] }
      ],
      adjacent: { dock: 30 },
      shortcuts: { metro: 15, checkpoint: 20, market: 25 },   // world.sewerShortcut 解锁后双向生效
      requiresItem: 'flashlight',
      hours: null, danger: 3, mapPos: { x: 50, y: 85 }
    }
  };

  // 雨天「接雨水」：任意室外地点新增该行动（home/bar/church 是室内安全区，不给）；
  // 需 world.rainDay 才可见（render.js 按 action.cond 过滤），需 glassbottle（消耗 1 换生水 1）。
  var RAIN_EXEMPT = { home: true, bar: true, church: true };
  Object.keys(G.data.locations).forEach(function (id) {
    if (RAIN_EXEMPT[id]) return;
    G.data.locations[id].actions.push({
      id: 'rain_water', label: '接雨水', type: 'water', water: 'rain',
      time: 20, energy: 3, requiresItem: 'glassbottle',
      cond: { flag: { 'world.rainDay': true } }
    });
  });

  // M15「生火取暖」：室内安全区外的地点新增该行动，消耗 1 柴火大幅消退寒冷，
  // 仅当身上确有寒冷值（cold>0）时显示（cond 走既有 stat DSL），避免非冬季冗余。
  Object.keys(G.data.locations).forEach(function (id) {
    if (RAIN_EXEMPT[id]) return;
    G.data.locations[id].actions.push({
      id: 'make_fire', label: '生火取暖', type: 'warm',
      time: 20, energy: 2, requiresItem: 'firewood',
      cond: { stat: { cold: { gt: 0 } } }
    });
  });

  // ---- 配套小逻辑 -----------------------------------------------------------
  // M15：入冬后给地点描述追加一句季节变体（从简：按季节档 + 室内外 + 昼夜取固定句，
  // 不随机以免每次重渲染闪烁）。秋季返回空串（不改动原描述）。
  var INDOOR_LOC = { home: true, bar: true, church: true };
  function seasonSuffix(locId) {
    var tier = G.engine.seasonTierNow ? G.engine.seasonTierNow() : 0;
    if (tier === 0) return '';
    var night = G.engine.isNight();
    if (INDOOR_LOC[locId]) {
      return tier >= 2
        ? '　屋里那点火光挡不住深冬的寒气，呵气成霜，你把领口又裹紧了些。'
        : '　入了冬，屋里也存不住多少暖意，指尖凉得发僵。';
    }
    if (tier >= 2) {
      return night
        ? '　深冬的夜里滴水成冰，风像刀子，在外头多留一刻都是煎熬。'
        : '　天地一片惨白，积雪没过脚踝，呼出的白气转眼散在刺骨的风里。';
    }
    return night
      ? '　初冬的夜风灌进衣领，冻得人骨头发紧。'
      : '　初冬的寒意漫上来，路边的水洼结了层薄冰。';
  }
  function locationDesc(locId) {
    var loc = G.data.locations[locId];
    if (!loc) return '';
    return (G.engine.isNight() ? loc.descNight : loc.descDay) + seasonSuffix(locId);
  }
  G.engine.locationDesc = locationDesc;

  // 含 sewer 捷径的双向可达表：捷径只登记在 sewer 一端，未解锁时不生效，
  // 解锁后对端地点也能自动查到回程（反向扫描），无需重复登记数据。
  function locationNeighbors(locId) {
    var loc = G.data.locations[locId];
    if (!loc) return {};
    var out = {};
    Object.keys(loc.adjacent || {}).forEach(function (k) { out[k] = loc.adjacent[k]; });
    if (G.engine.getFlag('world.sewerShortcut')) {
      Object.keys(loc.shortcuts || {}).forEach(function (k) { out[k] = loc.shortcuts[k]; });
      Object.keys(G.data.locations).forEach(function (otherId) {
        var other = G.data.locations[otherId];
        if (other && other.shortcuts && other.shortcuts[locId] != null && out[otherId] == null) {
          out[otherId] = other.shortcuts[locId];
        }
      });
    }
    return out;
  }
  G.engine.locationNeighbors = locationNeighbors;

  function isLocationOpen(locId) {
    var loc = G.data.locations[locId];
    if (!loc || !loc.hours) return true;
    return G.engine.inTimeRange(G.state.player.minute, loc.hours);
  }
  G.engine.isLocationOpen = isLocationOpen;

  // 移动：校验可达与开放时段，扣时间（随精力惩罚倍率），再切换地点触发 enter 事件
  function travelTo(destId) {
    var cur = G.state.player.location;
    var neighbors = locationNeighbors(cur);
    if (!(destId in neighbors)) return { ok: false, msg: '那里现在到不了。' };
    var destLoc = G.data.locations[destId];
    if (!isLocationOpen(destId)) return { ok: false, msg: '『' + (destLoc ? destLoc.name : destId) + '』现在没开。' };
    var minutes = Math.round(neighbors[destId] * G.engine.timeCostMod());
    G.engine.applyFx({ time: minutes });
    if (G.state.player.stats.hp <= 0) return { ok: false, msg: '你倒下了。', died: true };
    G.engine.goLocation(destId);
    return { ok: true, minutes: minutes };
  }
  G.engine.travelTo = travelTo;

  function pickWeighted(tiers) {
    var total = 0;
    for (var i = 0; i < tiers.length; i++) total += tiers[i].weight;
    var r = Math.random() * total;
    for (var j = 0; j < tiers.length; j++) {
      r -= tiers[j].weight;
      if (r <= 0) return tiers[j];
    }
    return tiers[tiers.length - 1];
  }

  // 搜刮：按行动 id 取地点表，requiresItem 不满足直接拒绝；命中率随该地点已搜刮次数递减（保底 25%）
  function scavenge(locId, actionId) {
    var loc = G.data.locations[locId];
    if (!loc) return { ok: false, msg: '未知地点。' };
    var action = null;
    for (var i = 0; i < (loc.actions || []).length; i++) if (loc.actions[i].id === actionId) { action = loc.actions[i]; break; }
    if (!action) return { ok: false, msg: '这里没有这个行动。' };
    if (action.requiresItem && !G.engine.hasItem(action.requiresItem)) {
      var need = G.engine.itemDef(action.requiresItem);
      return { ok: false, msg: '没有[item]' + (need ? need.name : action.requiresItem) + '[/item]，什么都看不清。' };
    }

    // 命中率随该地点已搜刮次数递减，但保底不低于 scavengeFloor（M9 平衡：
    // 过低的保底会让被搜空的地点永久失去价值，导致中后期食水必死循环）。
    var count = G.state.scavenge[locId] || 0;
    var floor = (G.TUNE && G.TUNE.scavengeFloor != null) ? G.TUNE.scavengeFloor : 0.25;
    var decay = Math.max(floor, 1 - count * 0.12);
    var found = [];
    if (loc.scavengeTable && loc.scavengeTable.length) {
      var tier = pickWeighted(loc.scavengeTable);
      (tier.items || []).forEach(function (it) {
        var chance = (it.chance == null ? 0.5 : it.chance) * decay;
        if (Math.random() < chance) {
          var n = it.max != null ? (it.min + Math.floor(Math.random() * (it.max - it.min + 1))) : (it.count || 1);
          G.engine.addItem(it.id, n);
          found.push({ id: it.id, count: n });
        }
      });
    }
    G.state.scavenge[locId] = count + 1;

    G.engine.applyFx({ stat: { energy: -(action.energy || 0) }, time: action.time || 0 });
    if (G.state.player.stats.hp > 0) G.engine.checkEvents('action');

    var msg;
    if (found.length) {
      msg = found.map(function (f) {
        var def = G.engine.itemDef(f.id);
        return '搜到 [item]' + (def ? def.name : f.id) + (f.count > 1 ? ('×' + f.count) : '') + '[/item]';
      }).join('，') + '。';
    } else {
      msg = '翻了一圈，什么都没找到。';
    }
    return { ok: true, found: found, msg: msg };
  }
  G.engine.scavenge = scavenge;

  function findAction(locId, actionId) {
    var loc = G.data.locations[locId];
    if (!loc) return null;
    for (var i = 0; i < (loc.actions || []).length; i++) if (loc.actions[i].id === actionId) return loc.actions[i];
    return null;
  }

  // 取水（M11）：'去江边取水'（水源常驻）/'接雨水'（仅雨天，render.js 按 cond 过滤显示）。
  // 消耗 1 个 glassbottle 换生水 1 份，不走 scavengeTable（结果确定，非概率掉落）。
  function gatherWater(locId, actionId) {
    var action = findAction(locId, actionId);
    if (!action) return { ok: false, msg: '这里没有这个行动。' };
    if (action.requiresItem && !G.engine.hasItem(action.requiresItem)) {
      var need = G.engine.itemDef(action.requiresItem);
      return { ok: false, msg: '没有[item]' + (need ? need.name : action.requiresItem) + '[/item]，没法盛水。' };
    }
    if (action.water === 'rain' && !G.engine.getFlag('world.rainDay')) {
      return { ok: false, msg: '今天没下雨，接不到雨水。' };
    }
    // M15 水源冬季联动：深冬江边取水要破冰（耗时翻倍）；冬季「接雨水」实为接雪化水，
    // 产出减半（半数概率空手而归），且不消耗玻璃瓶（瓶子留着，不算白费一趟）。
    var tier = G.engine.seasonTierNow ? G.engine.seasonTierNow() : 0;
    var isRain = action.water === 'rain';
    var time = action.time || 0;
    var prefix = '';
    if (!isRain && tier >= 2) { time *= 2; prefix = '江面结了冰，你先砸开一个窟窿才够着水——'; }
    if (isRain && tier >= 1) {
      prefix = '天上飘的是雪不是雨，你刮拢积雪慢慢化水——';
      if (Math.random() < 0.5) {
        G.engine.applyFx({ stat: { energy: -(action.energy || 0) }, time: time });
        if (G.state.player.stats.hp > 0) G.engine.checkEvents('action');
        return { ok: true, msg: prefix + '积雪太薄，这一趟没化出多少，瓶子还空着。' };
      }
    }
    G.engine.removeItem(action.requiresItem, 1);
    var itemId = isRain ? 'rainwater' : 'riverwater';
    G.engine.addItem(itemId, 1);
    G.engine.applyFx({ stat: { energy: -(action.energy || 0) }, time: time });
    if (G.state.player.stats.hp > 0) G.engine.checkEvents('action');
    var def = G.engine.itemDef(itemId);
    return { ok: true, msg: prefix + '打了一瓶[item]' + (def ? def.name : itemId) + '[/item]，生水没烧开不能直接喝。' };
  }
  G.engine.gatherWater = gatherWater;

  // 煮水（M11）：需 requiresItem（打火机）在包但不消耗；把包里 1 份生水转成 boiledwater，
  // 两种生水都有时优先煮江水（riverwater），无江水才煮雨水（rainwater），实现从简不弹选择。
  function boilWater(locId, actionId) {
    var action = findAction(locId, actionId);
    if (!action) return { ok: false, msg: '这里没有这个行动。' };
    if (action.requiresItem && !G.engine.hasItem(action.requiresItem)) {
      var need = G.engine.itemDef(action.requiresItem);
      return { ok: false, msg: '没有[item]' + (need ? need.name : action.requiresItem) + '[/item]，生不起火。' };
    }
    var raw = G.engine.hasItem('riverwater') ? 'riverwater' : (G.engine.hasItem('rainwater') ? 'rainwater' : null);
    if (!raw) return { ok: false, msg: '包里没有生水可以煮。' };
    G.engine.removeItem(raw, 1);
    G.engine.addItem('boiledwater', 1);
    // M15：煮水行动兼「取暖」——炉火顺带消退寒冷。
    var warmed = false;
    if (G.TUNE && G.engine.statGet('cold') > 0) { G.engine.statAdd('cold', -G.TUNE.boilWarmRelief); warmed = true; }
    G.engine.applyFx({ stat: { energy: -(action.energy || 0) }, time: action.time || 0 });
    if (G.state.player.stats.hp > 0) G.engine.checkEvents('action');
    var rawDef = G.engine.itemDef(raw);
    return { ok: true, msg: '把[item]' + (rawDef ? rawDef.name : raw) + '[/item]烧开，得到[item]净水[/item]。' +
      (warmed ? '就着炉火烤了烤手，暖和了些。' : '') };
  }
  G.engine.boilWater = boilWater;

  // 生火取暖（M15）：室外消耗 1 柴火大幅消退寒冷（requiresItem 由 UI 置灰前置校验，这里再兜底）。
  function makeFire(locId, actionId) {
    var action = findAction(locId, actionId);
    if (!action) return { ok: false, msg: '这里没有这个行动。' };
    if (!G.engine.hasItem('firewood')) return { ok: false, msg: '没有[item]柴火[/item]，生不起火。' };
    G.engine.removeItem('firewood', 1);
    var relief = (G.TUNE && G.TUNE.fireWarmRelief) || 40;
    G.engine.statAdd('cold', -relief);
    G.engine.applyFx({ stat: { energy: -(action.energy || 0) }, time: action.time || 0 });
    if (G.state.player.stats.hp > 0) G.engine.checkEvents('action');
    return { ok: true, msg: '你拢起[item]柴火[/item]生了堆火，凑近烤了烤，寒气退了大半。' };
  }
  G.engine.makeFire = makeFire;

  // ---- 通用氛围/收获/遇敌 random 事件（每地点 2–3 条，无剧情，给 M8 事件池打底） ----
  function passage(id, text, choices) {
    G.data.story.register({ id: id, text: text, choices: choices });
  }
  function event(id, locId, extra, passageId) {
    var cond = { loc: locId };
    for (var k in extra.cond) cond[k] = extra.cond[k];
    G.data.events.register({
      id: id, type: 'random', cond: cond,
      cooldown: extra.cooldown, once: extra.once || false,
      passage: passageId
    });
  }

  // home
  passage('amb_home_1_p', '夜深时，你听见楼下门被人晃了一下，随后归于安静，你的心跳漏了半拍。', [
    { label: '起身查看动静', fx: { stat: { sanity: -2 } } },
    { label: '不去管，继续睡', fx: { stat: { sanity: 1 } } }
  ]);
  event('amb_home_1', 'home', { cond: { timeRange: [1200, 300], chance: 0.15 }, cooldown: 480 }, 'amb_home_1_p');

  passage('amb_home_2_p', '整理物资时，你在抽屉深处翻出一张字迹模糊的纸条，读了两行就看不清后面写的什么。', [
    { label: '收起来', fx: { stat: { sanity: 2 } } }
  ]);
  event('amb_home_2', 'home', { cond: { chance: 0.15 }, cooldown: 600 }, 'amb_home_2_p');

  // residential
  passage('amb_residential_1_p', '楼道堆着没搬完的家具，你踩到一堆碎玻璃，鞋底传来刺痛。', [
    { label: '忍痛继续', fx: { stat: { hp: -3 } } }
  ]);
  event('amb_residential_1', 'residential', { cond: { chance: 0.12 }, cooldown: 240 }, 'amb_residential_1_p');

  passage('enc_residential_1_p', '一扇虚掩的房门后传出拖拽的声响，黑暗里似乎不止一个东西在动。', [
    { label: '上前解决', fx: { combat: 'zombie_pair' } },
    { label: '悄悄绕开', fx: { stat: { sanity: -1 } } }
  ]);
  event('enc_residential_1', 'residential', { cond: { chance: 0.22 }, cooldown: 300 }, 'enc_residential_1_p');

  // market
  passage('amb_market_1_p', '货架间的缝隙里，你踢到一枚滚落的硬币，弯腰捡起来才发现早就不能当钱用了。', [
    { label: '随手揣兜里', fx: {} }
  ]);
  event('amb_market_1', 'market', { cond: { chance: 0.1 }, cooldown: 300 }, 'amb_market_1_p');

  passage('enc_market_1_p', '货架深处一阵哐啷，两只跛行者撞倒了空罐头堆，踉跄着朝你转过身。', [
    { label: '动手解决', fx: { combat: 'zombie_pair' } },
    { label: '退到门口', fx: { stat: { energy: -3 } } }
  ]);
  event('enc_market_1', 'market', { cond: { chance: 0.12 }, cooldown: 360 }, 'enc_market_1_p');

  // hospital
  passage('amb_hospital_1_p', '空病房里，一台呼吸机还连着电，屏幕早已黑掉，只剩滴答的电池提示音。', [
    { label: '关掉它', fx: { stat: { sanity: 2 } } }
  ]);
  event('amb_hospital_1', 'hospital', { cond: { chance: 0.12 }, cooldown: 300 }, 'amb_hospital_1_p');

  passage('enc_hospital_1_p', '太平间的门没关严，裹着白布的几具东西先后从停尸台上坐了起来——三具，朝着门口的你。', [
    { label: '立刻应战', fx: { combat: 'zombie_trio' } },
    { label: '转身就跑', fx: { stat: { energy: -5, sanity: -3 } } }
  ]);
  event('enc_hospital_1', 'hospital', { cond: { chance: 0.2 }, cooldown: 300 }, 'enc_hospital_1_p');

  // police
  passage('amb_police_1_p', '档案室的柜子被翻得乱七八糟，墙上还贴着一张泛黄的通缉令。', [
    { label: '看一眼', fx: { stat: { sanity: -2 } } }
  ]);
  event('amb_police_1', 'police', { cond: { chance: 0.12 }, cooldown: 300 }, 'amb_police_1_p');

  passage('enc_police_1_p', '拐角处两个屠夫帮的人正在分赃，看见你立刻抄起家伙。', [
    { label: '先发制人', fx: { combat: 'thug_patrol' } },
    // M13：人类遇敌的非战斗解法（成功率明示，失败落战斗；结局段共享注册在 dol.js）
    { label: '凑上去以色相许，换一条路（55%）', cond: { stat: { sanity: { gte: 40 } } },
      fx: { roll: { chance: 0.55, win: { goto: 'dol_charm_ok_p' }, lose: { goto: 'dol_talk_fail_patrol_p' } } } },
    { label: '数出8发子弹买路（80%）', cond: { has: { bullets: 8 } },
      fx: { bullets: -8, roll: { chance: 0.8, win: { goto: 'dol_bribe_ok_p' }, lose: { goto: 'dol_bribe_fail_patrol_p' } } } },
    { label: '用灰猫的黑话报个门路（65%）', cond: { aff: { mao: { gte: 40 } } },
      fx: { roll: { chance: 0.65, win: { goto: 'dol_bluff_ok_p' }, lose: { goto: 'dol_talk_fail_patrol_p' } } } },
    { label: '退回楼梯间', fx: { stat: { energy: -5 } } }
  ]);
  event('enc_police_1', 'police', { cond: { chance: 0.2 }, cooldown: 360 }, 'enc_police_1_p');

  passage('loot_police_1_p', '武器架倒在地上，压着一个没被搬空的军械箱。', [
    { label: '撬开军械箱', fx: { item: { scrapmetal: 1 }, bullets: 5 } }
  ]);
  event('loot_police_1', 'police', { cond: { chance: 0.1 }, cooldown: 720 }, 'loot_police_1_p');

  // bar
  passage('amb_bar_1_p', '苏曼把一杯水推到你面前，没多说什么，转身去擦别的桌子。', [
    { label: '喝掉', fx: { stat: { thirst: 10 } } }
  ]);
  event('amb_bar_1', 'bar', { cond: { chance: 0.15, met: 'su' }, cooldown: 480 }, 'amb_bar_1_p');

  passage('amb_bar_2_p', '角落里有人小声议论屠夫帮又抢了一批货，声音压得很低。', [
    { label: '听一耳朵', fx: { stat: { sanity: 1 } } }
  ]);
  event('amb_bar_2', 'bar', { cond: { chance: 0.12 }, cooldown: 480 }, 'amb_bar_2_p');

  // campus
  passage('amb_campus_1_p', '图书馆里书页散了一地，一本还摊开着，风一吹哗哗地翻。', [
    { label: '翻看几页', fx: { stat: { sanity: 2 } } }
  ]);
  event('amb_campus_1', 'campus', { cond: { chance: 0.12 }, cooldown: 300 }, 'amb_campus_1_p');

  passage('enc_campus_1_p', '实验楼楼梯间传来一阵尖锐的叫声，紧跟着是脚步逼近的声音。', [
    { label: '迎上去', fx: { combat: 'runner_pack' } },
    { label: '反身撤退', fx: { stat: { energy: -5 } } }
  ]);
  event('enc_campus_1', 'campus', { cond: { chance: 0.18 }, cooldown: 300 }, 'enc_campus_1_p');

  // metro
  passage('amb_metro_1_p', '闸机一片漆黑，风从隧道深处灌出来，带着铁锈和潮气的味道。', [
    { label: '压下心里的慌', fx: { stat: { sanity: -3 } } }
  ]);
  event('amb_metro_1', 'metro', { cond: { chance: 0.15 }, cooldown: 300 }, 'amb_metro_1_p');

  passage('enc_metro_1_p', '黑暗里传来拖行的脚步声，越来越近，分不清有几个。', [
    { label: '握紧武器迎战', fx: { combat: 'metro_horde' } },
    { label: '贴墙摸黑撤退', fx: { stat: { energy: -6, sanity: -3 } } }
  ]);
  event('enc_metro_1', 'metro', { cond: { chance: 0.25 }, cooldown: 300 }, 'enc_metro_1_p');

  passage('loot_metro_1_p', '手电照到墙角一只翻倒的工具箱，锁已经锈断。', [
    { label: '翻找工具箱', fx: { item: { sparepart: 1, battery: 1 } } }
  ]);
  event('loot_metro_1', 'metro', { cond: { chance: 0.15, has: { item: 'flashlight' } }, cooldown: 480 }, 'loot_metro_1_p');

  // park
  passage('amb_park_1_p', '江风把芦苇吹得东倒西歪，几只水鸟从水面掠过。', [
    { label: '坐下歇一会', fx: { stat: { sanity: 3, energy: -2 } } }
  ]);
  event('amb_park_1', 'park', { cond: { chance: 0.15 }, cooldown: 300 }, 'amb_park_1_p');

  passage('enc_park_1_p', '夜里的芦苇丛突然响动，一群犬尸前后窜了出来，三条压低了身子朝你逼近。', [
    { label: '挥器迎战', fx: { combat: 'dog_pack' } },
    { label: '沿岸狂奔', fx: { stat: { energy: -6 } } }
  ]);
  event('enc_park_1', 'park', { cond: { timeRange: [1200, 300], chance: 0.3 }, cooldown: 240 }, 'enc_park_1_p');

  // gas
  passage('amb_gas_1_p', '废弃的车斗底下漏了一滩油，踩上去滑了一下。', [
    { label: '小心绕过', fx: {} }
  ]);
  event('amb_gas_1', 'gas', { cond: { chance: 0.1 }, cooldown: 300 }, 'amb_gas_1_p');

  passage('enc_gas_1_p', '油桶堆后突然滚出一只浮肿的东西，顺着油渍朝你爬来。', [
    { label: '正面解决', fx: { combat: 'bloat_solo' } },
    { label: '绕道逼退', fx: { stat: { sanity: -2, energy: -4 } } }
  ]);
  event('enc_gas_1', 'gas', { cond: { chance: 0.18 }, cooldown: 360 }, 'enc_gas_1_p');

  // mall
  passage('amb_mall_1_p', '中庭的喷泉早就干了，池底躺着几枚硬币和一只破碎的手表。', [
    { label: '捡起手表', fx: { item: { scrapmetal: 1 } } }
  ]);
  event('amb_mall_1', 'mall', { cond: { chance: 0.1 }, cooldown: 300 }, 'amb_mall_1_p');

  passage('enc_mall_1_p', '货架深处传来一阵尖锐叫声，紧接着是一群东西涌动的声音。', [
    { label: '硬拼一场', fx: { combat: 'screecher_horde' } },
    { label: '撤向扶梯', fx: { stat: { energy: -6 } } }
  ]);
  event('enc_mall_1', 'mall', { cond: { chance: 0.22 }, cooldown: 300 }, 'enc_mall_1_p');

  passage('loot_mall_1_p', '二楼一间没被砸开的柜台还锁着，玻璃后面摆着几件没拿走的货。', [
    { label: '砸开柜台', fx: { item: { militaryfirstaid: 1 }, stat: { sanity: -1 } } }
  ]);
  event('loot_mall_1', 'mall', { cond: { chance: 0.08 }, cooldown: 720 }, 'loot_mall_1_p');

  // church
  passage('amb_church_1_p', '彩窗透进的光斜斜落在座椅上，尘埃在光柱里浮动。', [
    { label: '静坐一会', fx: { stat: { sanity: 4 } } }
  ]);
  event('amb_church_1', 'church', { cond: { chance: 0.15 }, cooldown: 300 }, 'amb_church_1_p');

  passage('amb_church_2_p', '陈神父在后院翻土，身边整齐排着几个新坟。', [
    { label: '帮忙搭把手', fx: { stat: { energy: -3, sanity: 2 } } }
  ]);
  event('amb_church_2', 'church', { cond: { chance: 0.1 }, cooldown: 480 }, 'amb_church_2_p');

  // dock
  passage('amb_dock_1_p', '集装箱缝隙里堆着几只空酒瓶，老蔡的脚印绕着码头边缘一圈圈踩出来。', [
    { label: '看一眼江面', fx: { stat: { sanity: 2 } } }
  ]);
  event('amb_dock_1', 'dock', { cond: { chance: 0.12 }, cooldown: 300 }, 'amb_dock_1_p');

  passage('enc_dock_1_p', '集装箱后传来金属刮擦的声音，两只爬行者贴着地面窜了出来。', [
    { label: '一脚踩住解决', fx: { combat: 'crawler_ambush' } },
    { label: '跳上集装箱躲开', fx: { stat: { energy: -5 } } }
  ]);
  event('enc_dock_1', 'dock', { cond: { chance: 0.18 }, cooldown: 300 }, 'enc_dock_1_p');

  passage('loot_dock_1_p', '一只沉在浅水里的木箱露出一角，箱子上还贴着走私标记。', [
    { label: '捞上来看看', fx: { item: { gasoline: 1 } } }
  ]);
  event('loot_dock_1', 'dock', { cond: { chance: 0.1 }, cooldown: 600 }, 'loot_dock_1_p');

  // checkpoint
  passage('amb_checkpoint_1_p', '路障后停着一辆锈透的军车，轮胎早就瘪了。', [
    { label: '查看驾驶室', fx: { stat: { sanity: -1 } } }
  ]);
  event('amb_checkpoint_1', 'checkpoint', { cond: { chance: 0.12 }, cooldown: 300 }, 'amb_checkpoint_1_p');

  passage('enc_checkpoint_1_p', '掩体后两名屠夫帮的人正在清点抢来的军用物资。', [
    { label: '抢先动手', fx: { combat: 'thug_squad' } },
    // M13：非战斗解法（同 enc_police_1_p，失败段对应 squad 编组）
    { label: '凑上去以色相许，换一条路（55%）', cond: { stat: { sanity: { gte: 40 } } },
      fx: { roll: { chance: 0.55, win: { goto: 'dol_charm_ok_p' }, lose: { goto: 'dol_talk_fail_squad_p' } } } },
    { label: '数出8发子弹买路（80%）', cond: { has: { bullets: 8 } },
      fx: { bullets: -8, roll: { chance: 0.8, win: { goto: 'dol_bribe_ok_p' }, lose: { goto: 'dol_bribe_fail_squad_p' } } } },
    { label: '用灰猫的黑话报个门路（65%）', cond: { aff: { mao: { gte: 40 } } },
      fx: { roll: { chance: 0.65, win: { goto: 'dol_bluff_ok_p' }, lose: { goto: 'dol_talk_fail_squad_p' } } } },
    { label: '退到路障后', fx: { stat: { energy: -6 } } }
  ]);
  event('enc_checkpoint_1', 'checkpoint', { cond: { chance: 0.2 }, cooldown: 360 }, 'enc_checkpoint_1_p');

  passage('loot_checkpoint_1_p', '一只没被搬走的军用箱倒在哨塔脚下，锁扣已经锈坏。', [
    { label: '撬开箱子', fx: { item: { militaryfirstaid: 1 }, bullets: 8 } }
  ]);
  event('loot_checkpoint_1', 'checkpoint', { cond: { chance: 0.1 }, cooldown: 720 }, 'loot_checkpoint_1_p');

  // sewer
  passage('amb_sewer_1_p', '水流声在管道里回荡，分不清声音是从哪个方向传来的。', [
    { label: '屏息听一会', fx: { stat: { sanity: -2 } } }
  ]);
  event('amb_sewer_1', 'sewer', { cond: { chance: 0.15 }, cooldown: 300 }, 'amb_sewer_1_p');

  passage('enc_sewer_1_p', '水面漂来的两团东西先后动了起来，贴着水皮朝你扑来。', [
    { label: '就地迎战', fx: { combat: 'crawler_ambush' } },
    { label: '蹚水后退', fx: { stat: { energy: -6 } } }
  ]);
  event('enc_sewer_1', 'sewer', { cond: { chance: 0.22 }, cooldown: 300 }, 'enc_sewer_1_p');

  passage('loot_sewer_1_p', '手电照到管壁凹处塞着一只防水袋。', [
    { label: '取出防水袋', fx: { item: { battery: 1, rope: 1 } } }
  ]);
  event('loot_sewer_1', 'sewer', { cond: { chance: 0.12, has: { item: 'flashlight' } }, cooldown: 480 }, 'loot_sewer_1_p');

})();
