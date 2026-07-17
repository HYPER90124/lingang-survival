/* =============================================================================
 * items.js — 道具注册表（M3）
 * -----------------------------------------------------------------------------
 * 注册 G.data.items（结构见 docs/Schema.md「道具与交易」）。
 * 另挂载三个配套小逻辑到 G.engine（M1 未提供，数据层补齐）：
 *
 *   G.engine.useItem(id)         —— 非战斗中使用 med/food/drink：应用 fx 并消耗 1 个，
 *                                    返回 {ok, msg}；weapon/key 类返回 ok:false。
 *   G.engine.equipWeapon(id)     —— 从背包取该 id 的第一把武器装备，原装备武器（若有）放回背包。
 *   G.engine.unequipWeapon()     —— 卸下当前武器放回背包。
 *
 * 枪械设计说明：本层沿用引擎已有的「武器耐久」机制表示弹匣余量——durMax 即弹匣容量，
 * 每次攻击耐久 -1（combat.js 既有逻辑），耗尽即脱手，尚无「补充子弹恢复耐久」的机制，
 * 留给 M9 视平衡需要用 G.state.player.bullets 兑换 durability 补齐。
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  G.data = G.data || {};

  G.data.items = {

    // ---- weapon ×12（近战 9 + 枪械 3） -------------------------------------
    rustpipe: {
      name: '铁管', type: 'weapon', desc: '一截生锈的水管，管壁还留着焊接的毛边。',
      dmg: [4, 9], durMax: 40, price: 15, weight: 3,
      hitPool: ['抡圆生锈的铁管砸中', '侧身用铁管抽在', '反手用铁管捅在', '抬手一记铁管砸向']
    },
    crowbar: {
      name: '撬棍', type: 'weapon', desc: '一头带弯钩的铁撬棍，原是用来撬门的。',
      dmg: [5, 10], durMax: 45, price: 20, weight: 3,
      hitPool: ['抡起撬棍砸中', '用撬棍尖端捅进', '侧挥撬棍抽在', '反手一记撬棍砸向']
    },
    baseballbat: {
      name: '棒球棍', type: 'weapon', desc: '木质棒球棍，握把处缠了圈胶带防滑。',
      dmg: [5, 11], durMax: 35, price: 18, weight: 2,
      hitPool: ['抡棒球棍扫中', '一记棒球棍砸在', '侧身用球棍抽向', '顺势用球棍砸中']
    },
    machete: {
      name: '砍刀', type: 'weapon', desc: '厚背砍刀，刀刃有细小豁口，仍够锋利。',
      dmg: [7, 14], durMax: 30, price: 30, weight: 2,
      hitPool: ['挥砍刀劈中', '反手一刀划开', '顺势一刀砍进', '侧身一刀削向']
    },
    fireaxe: {
      name: '消防斧', type: 'weapon', desc: '消防栓柜里翻出的双头斧，斧头沉，抡起来费力。',
      dmg: [10, 18], durMax: 25, price: 45, weight: 4,
      hitPool: ['抡消防斧劈中', '双手挥斧砸进', '侧身一斧劈向', '顺势一斧剁进']
    },
    kitchenknife: {
      name: '菜刀', type: 'weapon', desc: '厨房抽屉里的菜刀，刀身单薄，胜在轻快。',
      dmg: [4, 8], durMax: 20, price: 10, weight: 1,
      hitPool: ['挥菜刀划开', '反手一刀捅进', '顺势一刀削中', '侧身一刀砍向']
    },
    spikebat: {
      name: '钉棒', type: 'weapon', desc: '木棒上钉满长钉，末端还沾着没擦干净的暗色。',
      dmg: [8, 15], durMax: 30, price: 35, weight: 3,
      hitPool: ['抡钉棒砸中', '钉棒尖刺扎进', '侧挥钉棒抽在', '反手一记钉棒砸向']
    },
    sledgehammer: {
      name: '大锤', type: 'weapon', desc: '工地遗落的大锤，抡一下就得喘半口气。',
      dmg: [12, 20], durMax: 20, price: 50, weight: 5,
      hitPool: ['抡大锤砸中', '双手抡锤砸进', '侧身一锤砸向', '顺势一锤轰在']
    },
    huntingknife: {
      name: '猎刀', type: 'weapon', desc: '一把窄刃猎刀，出手快，伤口窄而深。',
      dmg: [3, 7], durMax: 25, price: 12, weight: 1,
      hitPool: ['反手一刀捅进', '挥猎刀划开', '侧身一刀削中', '顺势一刀扎向']
    },
    pistol: {
      name: '手枪', type: 'weapon', ranged: true, desc: '一把制式手枪，弹匣还剩不少。',
      dmg: [10, 18], durMax: 12, price: 80, weight: 2,
      hitPool: ['举枪射穿', '近距离一枪打中', '侧身一枪命中', '连开一枪击中']
    },
    revolver: {
      name: '左轮', type: 'weapon', ranged: true, desc: '老式左轮，后坐力大，六发弹巢。',
      dmg: [14, 22], durMax: 6, price: 100, weight: 2,
      hitPool: ['举左轮轰在', '近距离一枪打穿', '侧身一枪击中', '扣动扳机命中']
    },
    shotgun: {
      name: '猎枪', type: 'weapon', ranged: true, desc: '双管猎枪，近距离威力惊人，装弹不多。',
      dmg: [18, 30], durMax: 5, price: 150, weight: 4,
      hitPool: ['近距离一枪轰烂', '扣扳机轰在', '侧身一枪扫中', '抵近一枪炸开']
    },

    // ---- med ×10 ------------------------------------------------------------
    bandage: {
      name: '绷带', type: 'med', desc: '干净的医用绷带，够包扎一处伤口。',
      fx: { stat: { hp: 15 } }, price: 4, weight: 1
    },
    antibiotics: {
      name: '抗生素', type: 'med', desc: '一板抗生素，压着字迹模糊的说明书。',
      fx: { stat: { infection: -20 } }, price: 12, weight: 1
    },
    painkiller: {
      name: '止痛药', type: 'med', desc: '止痛片，吞下去疼痛很快就钝下去。',
      fx: { stat: { hp: 5, sanity: 5, addiction: 8 } }, price: 8, weight: 1
    },
    sedative: {
      name: '镇静剂', type: 'med', desc: '一支镇静剂，药效很快压住乱糟糟的念头。',
      fx: { stat: { sanity: 15, addiction: 12 } }, price: 10, weight: 1
    },
    militaryfirstaid: {
      name: '军用急救包', type: 'med', desc: '制式急救包，止血粉、缝合针一应俱全。',
      fx: { stat: { hp: 40, infection: -10 } }, price: 40, weight: 3
    },
    disinfectant: {
      name: '消毒液', type: 'med', desc: '棕色消毒液，倒在伤口上会很疼。',
      fx: { stat: { infection: -15 } }, price: 8, weight: 1
    },
    splint: {
      name: '夹板', type: 'med', desc: '两片木板加绷带，固定用的简易夹板。',
      fx: { stat: { hp: 10 } }, price: 6, weight: 2
    },
    herbaltonic: {
      name: '草药汤', type: 'med', desc: '一碗熬煮过的草药汤，味道苦涩。',
      fx: { stat: { hp: 8, sanity: 3 } }, price: 3, weight: 1
    },
    vitaminpills: {
      name: '维生素片', type: 'med', desc: '一瓶维生素片，末日里难得的营养补充。',
      fx: { stat: { hunger: 5, thirst: 5, sanity: 2 } }, price: 5, weight: 1
    },
    antihistamine: {
      name: '抗过敏药', type: 'med', desc: '抗过敏药片，顺带能让人昏昏欲睡地安静下来。',
      fx: { stat: { sanity: 8 } }, price: 6, weight: 1
    },

    // ---- food ×9 --------------------------------------------------------
    cannedfood: {
      name: '罐头', type: 'food', desc: '一只没有标签的罐头，摇一摇里面是固体。',
      fx: { stat: { hunger: 30 } }, price: 6, weight: 2
    },
    drycracker: {
      name: '压缩饼干', type: 'food', desc: '军用压缩饼干，干硬，得就着水咽。',
      fx: { stat: { hunger: 20 } }, price: 3, weight: 1
    },
    driedmeat: {
      name: '肉干', type: 'food', desc: '风干的肉条，嚼起来费牙但顶饿。',
      fx: { stat: { hunger: 25 } }, price: 8, weight: 1
    },
    instantnoodle: {
      name: '方便面', type: 'food', desc: '一袋方便面，干嚼也能对付一顿。',
      fx: { stat: { hunger: 22 } }, price: 5, weight: 1
    },
    cannedfish: {
      name: '鱼罐头', type: 'food', desc: '油浸鱼罐头，开盖一股咸腥味。',
      fx: { stat: { hunger: 28 } }, price: 7, weight: 2
    },
    wildveggie: {
      name: '野菜', type: 'food', desc: '公园里采来的野菜，洗干净能凑合吃。',
      fx: { stat: { hunger: 10 } }, price: 1, weight: 1
    },
    riceball: {
      name: '饭团', type: 'food', desc: '一个饭团，捏得不算紧，放久了容易馊。',
      fx: { stat: { hunger: 18 } }, price: 4, weight: 1
    },
    chocolatebar: {
      name: '巧克力棒', type: 'food', desc: '一条巧克力，包装皱得不成样子，还没化。',
      fx: { stat: { hunger: 15, sanity: 3 } }, price: 6, weight: 1
    },
    spoiledcan: {
      name: '过期罐头', type: 'food', desc: '罐身鼓起一块，标签早就看不清日期。',
      fx: { stat: { hunger: 15, infection: 5 } }, price: 1, weight: 2
    },

    // ---- drink ×5 -------------------------------------------------------
    bottledwater: {
      name: '瓶装水', type: 'drink', desc: '一瓶还封着口的矿泉水。',
      fx: { stat: { thirst: 30 } }, price: 5, weight: 1
    },
    rainwater: {
      name: '雨水', type: 'drink', desc: '接的一壶雨水，没烧开，直接喝要闹肚子。',
      fx: { stat: { thirst: 20, infection: 8 } }, price: 0, weight: 1
    },
    riverwater: {
      name: '江水', type: 'drink', desc: '从江边打的一瓶生水，浑浊带腥气，没烧开不能喝。',
      fx: { stat: { thirst: 15, infection: 8 } }, price: 0, weight: 1
    },
    boiledwater: {
      name: '净水', type: 'drink', desc: '烧开过的水，放凉了才装瓶，喝着放心。',
      fx: { stat: { thirst: 25 } }, price: 2, weight: 1
    },
    liquor: {
      name: '烈酒', type: 'drink', desc: '没贴标的烈酒，入口烧得从喉咙一路到胃。',
      fx: { stat: { alcohol: 25, sanity: 5 } }, price: 10, weight: 1
    },
    herbaltea: {
      name: '凉茶', type: 'drink', desc: '一瓶凉茶，苦味压过甜味。',
      fx: { stat: { thirst: 15, sanity: 3 } }, price: 3, weight: 1
    },
    beerbottle: {
      name: '啤酒', type: 'drink', desc: '一瓶常温啤酒，开瓶时几乎不起沫。',
      fx: { stat: { alcohol: 10, thirst: 10 } }, price: 4, weight: 1
    },

    // ---- material ×12 ----------------------------------------------------
    sparepart: { name: '零件', type: 'material', desc: '一把拆下来的机械零件，用途未知。', price: 10, weight: 2 },
    clothstrip: { name: '布条', type: 'material', desc: '撕下来的干净布条，能应急止血。', price: 2, weight: 1 },
    gasoline: { name: '汽油', type: 'material', desc: '一小桶汽油，晃一晃还剩大半。', price: 15, weight: 3 },
    battery: { name: '电池', type: 'material', desc: '几节电池，型号不一，能凑合用。', price: 8, weight: 1 },
    flashlight: { name: '手电', type: 'material', desc: '一支手电筒，进地铁站这类暗处必备。', price: 25, weight: 1 },
    tape: { name: '胶带', type: 'material', desc: '一卷宽胶带，缠东西固定东西都用得上。', price: 2, weight: 1 },
    rope: { name: '绳子', type: 'material', desc: '一段结实的尼龙绳。', price: 5, weight: 2 },
    scrapmetal: { name: '废铁', type: 'material', desc: '几块边角废铁，回炉或改装都能用。', price: 4, weight: 3 },
    wire: { name: '电线', type: 'material', desc: '一卷电线，绝缘皮有些老化。', price: 3, weight: 1 },
    lighter: { name: '打火机', type: 'material', desc: '一只打火机，打着火的概率对半开。', price: 6, weight: 1 },
    glassbottle: { name: '玻璃瓶', type: 'material', desc: '一只空玻璃瓶，能装水也能砸碎当武器凑数。', price: 1, weight: 1 },
    toolkit: { name: '工具箱', type: 'material', desc: '一只小工具箱，扳手螺丝刀配得七零八落。', price: 20, weight: 3 },
    sewingkit: { name: '针线包', type: 'material', desc: '一只针线包，配着几卷线和补丁布，能把撕破的衣物缝补如初。', price: 8, weight: 1 }, // M14：修补服装耐久
    firewood: { name: '柴火', type: 'material', desc: '一捆劈好的干柴，够生一小堆火。入冬后在外头烤火驱寒，是长时间外勤的命根子。', price: 3, weight: 3 }, // M15：室外「生火取暖」消耗，大幅消退寒冷
    radio: { name: '收音机', type: 'material', desc: '一台掉漆的便携收音机，旋钮松垮，勉强能收到临港之声的频段。带着它，广播里的坏消息也能早半天听见。', price: 30, weight: 3 }, // M16：带在身上即生效——周三晚远程收听周响广播、尸潮当日上午提前预警（读 hasItem('radio')）

    // ---- clothing ×18（三槽：上装 top / 下装 bottom / 鞋 shoes） ------------
    // 字段：slot / warmth(保暖,M15) / armor(减伤) / decency(体面) / durMax(耐久)。
    // 耐久战斗被击落损，跌破半耐久则「撕破」属性减半，归零则报废（见 state.clothingEff）。
    // worn_ 系列为开局垫底基础装（见 state.newGame 按性别发放）。
    worn_tshirt:   { name: '旧T恤',   type: 'clothing', slot: 'top',    warmth: 1, armor: 0, decency: 2, durMax: 20, price: 4,  weight: 1, desc: '一件洗得发白的旧T恤，领口松垮，勉强蔽体。' },
    worn_blouse:   { name: '旧衬衫',   type: 'clothing', slot: 'top',    warmth: 1, armor: 0, decency: 3, durMax: 20, price: 4,  weight: 1, desc: '一件皱巴巴的女式衬衫，扣子掉了一颗，还算齐整。' },
    hoodie:        { name: '连帽卫衣', type: 'clothing', slot: 'top',    warmth: 3, armor: 1, decency: 3, durMax: 30, price: 12, weight: 2, desc: '一件厚实的连帽卫衣，帽子还能挡挡风雨。' },
    leather_jacket:{ name: '皮夹克',   type: 'clothing', slot: 'top',    warmth: 3, armor: 4, decency: 4, durMax: 40, price: 40, weight: 3, desc: '一件磨旧的皮夹克，皮子够厚，扛得住抓咬。' },
    down_jacket:   { name: '羽绒服',   type: 'clothing', slot: 'top',    warmth: 6, armor: 2, decency: 4, durMax: 35, price: 45, weight: 3, desc: '一件蓬松的羽绒服，穿上像抱着一团暖气。' },
    tactical_vest: { name: '战术背心', type: 'clothing', slot: 'top',    warmth: 1, armor: 6, decency: 3, durMax: 50, price: 60, weight: 4, desc: '一件带插板的战术背心，护住前胸后背要害。' },
    raincoat:      { name: '雨衣',     type: 'clothing', slot: 'top',    warmth: 2, armor: 1, decency: 3, durMax: 25, price: 10, weight: 1, desc: '一件半透明的连体雨衣，下雨天不至于淋透。' },
    worn_jeans:    { name: '旧牛仔裤', type: 'clothing', slot: 'bottom', warmth: 2, armor: 1, decency: 3, durMax: 25, price: 5,  weight: 1, desc: '一条膝盖磨薄的旧牛仔裤，还算耐穿。' },
    cargo_pants:   { name: '工装裤',   type: 'clothing', slot: 'bottom', warmth: 3, armor: 2, decency: 3, durMax: 35, price: 15, weight: 2, desc: '一条多口袋工装裤，布料厚，兜里能塞不少东西。' },
    thermal_pants: { name: '保暖裤',   type: 'clothing', slot: 'bottom', warmth: 5, armor: 1, decency: 3, durMax: 30, price: 20, weight: 1, desc: '一条抓绒保暖裤，贴身穿最挡寒。' },
    tactical_pants:{ name: '战术裤',   type: 'clothing', slot: 'bottom', warmth: 2, armor: 4, decency: 3, durMax: 45, price: 35, weight: 2, desc: '一条加了护膝的战术长裤，耐磨抗划。' },
    short_skirt:   { name: '短裙',     type: 'clothing', slot: 'bottom', warmth: 0, armor: 0, decency: 1, durMax: 15, price: 6,  weight: 1, desc: '一条短裙，好看，但在末日街头实在不合时宜。' },
    worn_sneakers: { name: '旧运动鞋', type: 'clothing', slot: 'shoes',  warmth: 1, armor: 0, decency: 2, durMax: 20, price: 4,  weight: 1, desc: '一双开胶的旧运动鞋，鞋底还没磨穿。' },
    worn_flats:    { name: '旧平底鞋', type: 'clothing', slot: 'shoes',  warmth: 1, armor: 0, decency: 2, durMax: 18, price: 4,  weight: 1, desc: '一双旧平底鞋，走久了硌脚，聊胜于赤足。' },
    work_boots:    { name: '工装靴',   type: 'clothing', slot: 'shoes',  warmth: 2, armor: 2, decency: 3, durMax: 40, price: 18, weight: 2, desc: '一双钢头工装靴，踩碎玻璃也不怕。' },
    combat_boots:  { name: '战靴',     type: 'clothing', slot: 'shoes',  warmth: 3, armor: 3, decency: 3, durMax: 50, price: 30, weight: 2, desc: '一双军用战靴，高帮护踝，跑起来也稳。' },
    rubber_boots:  { name: '雨靴',     type: 'clothing', slot: 'shoes',  warmth: 2, armor: 1, decency: 2, durMax: 30, price: 8,  weight: 2, desc: '一双及膝雨靴，蹚水过泥都不进水。' },

    // ---- key/misc ×12（剧情预留，供 M5–M8 使用；无 fx，不入商店货架） -----
    qin_dossier: { name: '旧案卷宗', type: 'key', desc: '一份泛黄的案卷，封皮上盖着警局的旧公章。', price: null, weight: 1 }, // 预留：qin 警惕阶段剧情道具
    lin_medbox: { name: '药品箱', type: 'key', desc: '一只上锁的药品箱，贴着医院药房的封条。', price: null, weight: 2 }, // 预留：lin 警惕阶段剧情道具
    zhou_antenna: { name: '天线零件', type: 'key', desc: '一截定向天线的接头零件。', price: null, weight: 1 }, // 预留：zhou 熟识阶段剧情道具
    zhou_battery: { name: '广播电池', type: 'key', desc: '广播站专用的大容量电池组。', price: null, weight: 2 }, // 预留：zhou 熟识阶段剧情道具
    su_ledger: { name: '酒吧账本', type: 'key', desc: '一本记满进货流水的旧账本。', price: null, weight: 1 }, // 预留：su 剧情道具
    dou_blueprint: { name: '改装图纸', type: 'key', desc: '手绘的武器改装图纸，边角画满批注。', price: null, weight: 1 }, // 预留：dou 剧情道具
    zhao_ledger: { name: '货运账本', type: 'key', desc: '赵铁的私人账本，最后几页反复写着同一个名字。', price: null, weight: 1 }, // 预留：zhao 羁绊阶段剧情道具
    fang_dogtag: { name: '军牌', type: 'key', desc: '一枚磨得发亮的军人身份牌。', price: null, weight: 1 }, // 预留：fang 剧情道具
    mao_presscard: { name: '记者证', type: 'key', desc: '一张过期的记者证，照片上的人比现在年轻。', price: null, weight: 1 }, // 预留：mao 羁绊阶段剧情道具
    chen_burialrecord: { name: '安葬名册', type: 'key', desc: '教堂后院的安葬名册，写满了不认识的名字。', price: null, weight: 1 }, // 预留：chen 剧情道具
    cai_oldphoto: { name: '旧照片', type: 'key', desc: '一张边角卷起的合影，背面写着一个日期。', price: null, weight: 1 }, // 预留：cai 剧情道具
    worn_idcard: { name: '旧身份证', type: 'misc', desc: '主角身上带着的身份证，塑封已经发黄开裂。', price: null, weight: 1 } // 预留：主角前情伏笔道具
  };

  // ---- 配套小逻辑：使用 / 装备（M1 未提供，数据层补齐） -------------------
  function useItem(id) {
    var def = G.engine.itemDef(id);
    if (!def) return { ok: false, msg: '没有这样东西。' };
    if (!G.engine.hasItem(id)) return { ok: false, msg: '你身上没有[item]' + def.name + '[/item]。' };
    if (def.type === 'weapon' || def.type === 'key' || def.type === 'misc') {
      return { ok: false, msg: '[item]' + def.name + '[/item]没法直接使用。' };
    }
    // skill:bandage 治疗类增益（引擎 medBoostFx 无技能时原样返回 def.fx）
    var fx = (G.engine.medBoostFx ? G.engine.medBoostFx(def) : def.fx) || {};
    G.engine.applyFx(fx);
    G.engine.removeItem(id, 1);
    return { ok: true, msg: '你用掉了[item]' + def.name + '[/item]。' };
  }
  G.engine.useItem = useItem;

  function equipWeapon(id) {
    var def = G.engine.itemDef(id);
    if (!def || def.type !== 'weapon') return false;
    var inv = G.state.player.inventory, idx = -1;
    for (var i = 0; i < inv.length; i++) if (inv[i].id === id) { idx = i; break; }
    if (idx < 0) return false;
    var entry = inv[idx];
    var cur = G.state.player.weapon;
    inv.splice(idx, 1);
    if (cur) inv.push({ id: cur.id, count: 1, durability: cur.durability });
    G.state.player.weapon = { id: id, durability: entry.durability };
    return true;
  }
  G.engine.equipWeapon = equipWeapon;

  function unequipWeapon() {
    var w = G.state.player.weapon;
    if (!w) return false;
    G.state.player.weapon = null;
    G.state.player.inventory.push({ id: w.id, count: 1, durability: w.durability });
    return true;
  }
  G.engine.unequipWeapon = unequipWeapon;

  // ---- 服装装备/卸下/修补（M14；outfit 结构与效果计算见 state.js） ----------
  // 从背包取该 id 的第一件服装穿上，占用其 slot，原槽位服装（若有）放回背包。
  function equipClothing(id) {
    var def = G.engine.itemDef(id);
    if (!def || def.type !== 'clothing') return false;
    var p = G.state.player;
    p.outfit = p.outfit || { top: null, bottom: null, shoes: null };
    var inv = p.inventory, idx = -1;
    for (var i = 0; i < inv.length; i++) if (inv[i].id === id) { idx = i; break; }
    if (idx < 0) return false;
    var entry = inv[idx];
    var slot = def.slot;
    var cur = p.outfit[slot];
    inv.splice(idx, 1);
    if (cur) inv.push({ id: cur.id, count: 1, durability: cur.dur });
    p.outfit[slot] = { id: id, dur: entry.durability != null ? entry.durability : (def.durMax || 1) };
    return true;
  }
  G.engine.equipClothing = equipClothing;

  function unequipClothing(slot) {
    var p = G.state.player;
    if (!p.outfit || !p.outfit[slot]) return false;
    var c = p.outfit[slot];
    p.outfit[slot] = null;
    p.inventory.push({ id: c.id, count: 1, durability: c.dur });
    return true;
  }
  G.engine.unequipClothing = unequipClothing;

  // 用一只针线包把某槽位服装耐久补满（消耗 1 针线包）。返回 {ok,msg}。
  function repairClothing(slot) {
    var p = G.state.player;
    if (!p.outfit || !p.outfit[slot]) return { ok: false, msg: '这个部位没穿衣服。' };
    if (!G.engine.hasItem('sewingkit')) return { ok: false, msg: '你没有[item]针线包[/item]。' };
    var c = p.outfit[slot], def = G.engine.itemDef(c.id) || {};
    if (c.dur >= (def.durMax || 1)) return { ok: false, msg: '[item]' + (def.name || c.id) + '[/item]还是完好的，用不着补。' };
    c.dur = def.durMax || 1;
    G.engine.removeItem('sewingkit', 1);
    return { ok: true, msg: '你把[item]' + (def.name || c.id) + '[/item]缝补如新。' };
  }
  G.engine.repairClothing = repairClothing;

})();
