/* =============================================================================
 * worldevents.js — 世界事件池（M8）
 * -----------------------------------------------------------------------------
 * 内容：
 *   1. 地点事件池补足：15 地点各 +3 条（幸存者掠影 sv_ / 遭遇·氛围二波 enc_/amb_ /
 *      罕见奇遇 rare_，与 M3 打底的 amb_/enc_/loot_ 合计每地点 4–6 条）
 *   2. 状态触发池：幻觉 halluc_1~5（sanity<20）、醉酒 drunk_1~3（alcohol>60）、
 *      毒瘾发作日 addict_attack_1（addiction>50，scheduled 每日一次，三分支）、
 *      感染濒死线 infect_crit_1（infection>80，高优先级反复催命，医院可救治）
 *   3. 全局周期：尸潮夜链（horde_warn 预警→日历 eventId 强制触发 horde_night_start
 *      → 尸潮遭遇池 horde_enc_1/2 + 室内 horde_safe_1（M17：home 加固门窗后走 horde_safe_door
 *      安心变体，优先级更高）→ 05:00 horde_night_end 收尾）、
 *      雨天（rain_start 上午随机开雨 → rain_harvest/rain_amb 加成与氛围 → 20:00 rain_end）
 *   4. 屠夫帮世界线：butcher_world_1~4（读 qin/mao 线 flag 出文案变体，不写剧情 flag）
 *
 * 世界 flag（本模块自管）：world.hordeAlert（预警中）/ world.hordeNight（尸潮夜进行中）
 *                        / world.rainDay（雨天进行中）
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  var story = G.data.story, events = G.data.events;

  function P(id, text, choices) { story.register({ id: id, text: text, choices: choices }); }
  // random 事件速记：ev(id, cond, cooldown, passageId, priority?, when?)
  function ev(id, cond, cooldown, passageId, priority, when) {
    var e = { id: id, type: 'random', cond: cond, cooldown: cooldown, passage: passageId };
    if (priority != null) e.priority = priority;
    if (when) e.when = when;
    events.register(e);
  }
  var NIGHT = [1200, 300];

  // ==========================================================================
  // 1. 地点事件池补足（每地点：掠影 / 二波遭遇·氛围 / 罕见奇遇）
  // ==========================================================================

  // ---- home ----------------------------------------------------------------
  P('sv_home_1_p', '门缝底下塞进来半张纸条，铅笔字歪歪扭扭：「西边楼里夜里有孩子哭，有余粮的行行好。」没有署名，也不知道塞了几家。', [
    { label: '收好纸条，记在心里', fx: { stat: { sanity: 2 } } },
    { label: '这年头，管不过来', fx: { stat: { sanity: -1 } } }
  ]);
  ev('sv_home_1', { loc: 'home', chance: 0.1 }, 720, 'sv_home_1_p');

  P('amb_home_3_p', '窗台上蹲着一只瘦得脱形的狸花猫，隔着玻璃跟你对视，喉咙里发出试探的咕噜声。', [
    { label: '分它一点鱼罐头', cond: { has: { item: 'cannedfish' } }, fx: { item: { cannedfish: -1 }, stat: { sanity: 5 } } },
    { label: '隔窗看它一会儿', fx: { stat: { sanity: 2 } } }
  ]);
  ev('amb_home_3', { loc: 'home', chance: 0.1 }, 720, 'amb_home_3_p');

  P('rare_home_1_p', '搬柜子的时候，天花板的一块吊顶松了角。你捅开一看——前住户的暗格，油纸包得严严实实：几个罐头，一小盒[item]子弹[/item]，还有半包受潮的烟。', [
    { label: '全部收下', fx: { item: { cannedfood: 2 }, bullets: 6, stat: { sanity: 2 } } }
  ]);
  ev('rare_home_1', { loc: 'home', chance: 0.05 }, 4320, 'rare_home_1_p');

  // ---- residential -----------------------------------------------------------
  P('sv_residential_1_p', '三楼的窗台上坐着个老人，怀里抱着一台老收音机，音量拧到最大——里面只有沙沙声。看见你，他举起收音机晃了晃：“周三！周三就有声音了！”', [
    { label: '朝他比个大拇指', fx: { stat: { sanity: 3 } } },
    { label: '（快步走开）', fx: {} }
  ]);
  ev('sv_residential_1', { loc: 'residential', chance: 0.12 }, 600, 'sv_residential_1_p');

  P('enc_residential_2_p', '夜色里两条黑影贴着墙根窜过来，速度快得不像死人——它们转过头来的时候，半张脸都没有了。', [
    { label: '迎上去解决', fx: { combat: 'runner_pack' } },
    { label: '躲进单元门洞', fx: { stat: { energy: -5, sanity: -2 } } }
  ]);
  ev('enc_residential_2', { loc: 'residential', timeRange: NIGHT, chance: 0.22 }, 300, 'enc_residential_2_p');

  P('rare_residential_1_p', '顶楼有一户的防盗门完好地锁着——你从阳台翻进去，屋里落满灰，却没被翻过：橱柜里的存粮、药箱、床头的瓶装水，都还在原位，像主人只是出了趟远门。', [
    { label: '收走能用的东西', fx: { item: { cannedfood: 2, bottledwater: 2, bandage: 1 }, stat: { sanity: -2 }, time: 30 } },
    { label: '只拿一半，留一半给下个人', fx: { item: { cannedfood: 1, bottledwater: 1 }, stat: { sanity: 3 }, time: 30 } }
  ]);
  ev('rare_residential_1', { loc: 'residential', chance: 0.05 }, 4320, 'rare_residential_1_p');

  // ---- market ----------------------------------------------------------------
  P('sv_market_1_p', '一个老太太在柜台前掏出一沓作废的钞票，一张张抚平了递过去。赵铁盯着看了两秒，收下钱，把一袋米推了过去——按子弹算，那袋米值她那沓纸的一百倍。', [
    { label: '（装作没看见）', fx: { stat: { sanity: 4 } } }
  ]);
  ev('sv_market_1', { loc: 'market', timeRange: [480, 1200], chance: 0.1 }, 720, 'sv_market_1_p');

  P('enc_market_2_p', '卸货口的胶帘无风自动，帘子底下爬出两只贴地的东西，指甲在水泥地上刮出白痕。', [
    { label: '趁它起身前解决', fx: { combat: 'crawler_ambush' } },
    { label: '退回亮处', fx: { stat: { energy: -4 } } }
  ]);
  ev('enc_market_2', { loc: 'market', chance: 0.1 }, 480, 'enc_market_2_p');

  P('rare_market_1_p', '超市后巷翻着一只从货车上颠掉的纸箱，胶带都没拆——整箱的罐头，箱面上是赵铁的黑手印记号。', [
    { label: '给赵铁送回去', cond: { met: 'zhao' }, fx: { aff: { zhao: 6 }, stat: { sanity: 3 }, time: 15 } },
    { label: '悄悄搬回家', fx: { item: { cannedfood: 3 }, stat: { sanity: -3 } } }
  ]);
  ev('rare_market_1', { loc: 'market', chance: 0.05 }, 4320, 'rare_market_1_p');

  // ---- hospital ----------------------------------------------------------------
  P('sv_hospital_1_p', '候诊区排着三四个换药的幸存者，自觉按伤势轻重站位，没人插队——这大概是这座城里仅存的队伍。', [
    { label: '帮着递一轮绷带', cond: { skill: 'bandage' }, fx: { stat: { sanity: 4, energy: -4 }, time: 30 } },
    { label: '在队尾看了一会儿', fx: { stat: { sanity: 2 } } }
  ]);
  ev('sv_hospital_1', { loc: 'hospital', chance: 0.12 }, 600, 'sv_hospital_1_p');

  P('enc_hospital_2_p', '住院部楼道里晾着的床单轻轻摆动，最里侧那两张床底下，各探出一只灰白的手，前一只抓住了你的鞋帮。', [
    { label: '甩开它，就地解决', fx: { combat: 'crawler_ambush' } },
    { label: '踹脱后撤出楼道', fx: { stat: { energy: -5, sanity: -3 }, time: 10 } }
  ]);
  ev('enc_hospital_2', { loc: 'hospital', timeRange: NIGHT, chance: 0.18 }, 360, 'enc_hospital_2_p');

  P('rare_hospital_1_p', '地下配药房的墙面有一段敲上去是空的。你撬开夹墙的板子——里面码着药房主任藏下的私货：[med]抗生素[/med]、镇静剂，还有几卷没拆封的绷带。', [
    { label: '小心取出', fx: { item: { antibiotics: 1, sedative: 1, bandage: 2 }, time: 20 } }
  ]);
  ev('rare_hospital_1', { loc: 'hospital', chance: 0.04 }, 4320, 'rare_hospital_1_p');

  // ---- police ----------------------------------------------------------------
  P('sv_police_1_p', '大厅的殉职警员照片墙前站着个陌生男人，挨着一张张看过去，末了抬手敬了个礼，转身走了，自始至终没看你一眼。', [
    { label: '（在照片墙前停了停）', fx: { stat: { sanity: 2 } } }
  ]);
  ev('sv_police_1', { loc: 'police', chance: 0.1 }, 720, 'sv_police_1_p');

  P('enc_police_2_p', '羁押区的铁栏后传来撞击声——三只穿着囚服的[zed]行尸[/zed]挤在半开的栏门口，被你的脚步声引得躁动起来。', [
    { label: '趁栏门卡着挨个解决', fx: { combat: 'zombie_trio' } },
    { label: '退出羁押区', fx: { stat: { energy: -4, sanity: -2 } } }
  ]);
  ev('enc_police_2', { loc: 'police', timeRange: NIGHT, chance: 0.2 }, 360, 'enc_police_2_p');

  P('rare_police_1_p', '证物室最里面立着一台没被撬开的保险柜，密码盘锈住了。你用了半个钟头把它磨开——几盒封存的[item]子弹[/item]，一把没上过户的猎刀。', [
    { label: '收入囊中', fx: { item: { huntingknife: 1 }, bullets: 12, time: 30, stat: { energy: -6 } } }
  ]);
  ev('rare_police_1', { loc: 'police', chance: 0.05 }, 4320, 'rare_police_1_p');

  // ---- bar（内部无战斗） ------------------------------------------------------
  P('sv_bar_1_p', '一个醉汉抱着空瓶子唱起了老歌，跑调跑得离谱，唱到副歌，半个酒吧的人都跟着吼了起来，谁也不嫌谁难听。', [
    { label: '跟着吼两句', fx: { stat: { sanity: 4, alcohol: 5 } } },
    { label: '笑着听完', fx: { stat: { sanity: 3 } } }
  ]);
  ev('sv_bar_1', { loc: 'bar', timeRange: [1140, 120], chance: 0.12 }, 600, 'sv_bar_1_p');

  P('amb_bar_3_p', '灯泡忽然齐齐暗了下去，满屋子瞬间没了声音——三秒后灯光跳回来，全场自发地欢呼了一声，像躲过了什么。有人嘟囔：加油站那小子的发电机又咳嗽了。', [
    { label: '举杯敬那台发电机', fx: { stat: { sanity: 2 } } }
  ]);
  ev('amb_bar_3', { loc: 'bar', chance: 0.1 }, 720, 'amb_bar_3_p');

  P('rare_bar_1_p', '帮苏曼往地窖搬酒的时候，你在最底层的酒架后摸到一瓶标签磨没了的陈酿，瓶塞的火漆还完好。苏曼掂了掂，塞回你手里：“搬酒钱。这瓶比你搬的那几箱都值钱。”', [
    { label: '收下这瓶好酒', fx: { item: { liquor: 1 }, stat: { sanity: 3, energy: -5 }, time: 30 } }
  ]);
  ev('rare_bar_1', { loc: 'bar', chance: 0.05, met: 'su' }, 4320, 'rare_bar_1_p');

  // ---- campus ----------------------------------------------------------------
  P('sv_campus_1_p', '公告栏上层层叠叠贴满了寻人启事，最新的一张墨迹还新：照片上是个笑着的年轻人，下面写着「哥，我在老地方等你」。', [
    { label: '记下那张脸', fx: { stat: { sanity: -2 } } },
    { label: '把翘边的启事抚平压好', fx: { stat: { sanity: 2 } } }
  ]);
  ev('sv_campus_1', { loc: 'campus', chance: 0.12 }, 600, 'sv_campus_1_p');

  P('enc_campus_2_p', '操场的野草长到半人高，草浪里几条脊背起伏着包抄过来——是一群饿疯了的犬尸。', [
    { label: '背靠看台迎战', fx: { combat: 'dog_pack' } },
    { label: '冲刺甩开它们', fx: { stat: { energy: -8 } } }
  ]);
  ev('enc_campus_2', { loc: 'campus', chance: 0.15 }, 360, 'enc_campus_2_p');

  P('rare_campus_1_p', '图书馆管理员的休息间藏在书库最深处，门牌都被书架挡住了。里面有一台还剩电的手电、几包茶，和一本干燥完好的书——你随手翻开，一读就是半个钟头。', [
    { label: '带走能用的，读完那一章', fx: { item: { battery: 1, herbaltea: 2 }, stat: { sanity: 6 }, time: 40 } }
  ]);
  ev('rare_campus_1', { loc: 'campus', chance: 0.05 }, 4320, 'rare_campus_1_p');

  // ---- metro ----------------------------------------------------------------
  P('sv_metro_1_p', '隧道口的瓷砖墙上刻着成排的正字，一天一道，刻痕从深到浅排出去八九十道。最新的一道边缘还发白——今天的，已经有人来刻过了。', [
    { label: '数一数刻了多少天', fx: { stat: { sanity: -2 } } },
    { label: '在旁边也刻下一道', fx: { stat: { sanity: 1 } } }
  ]);
  ev('sv_metro_1', { loc: 'metro', chance: 0.12 }, 720, 'sv_metro_1_p');

  P('enc_metro_2_p', '站台尽头的检修门虚掩着，门缝里挤出一只肿胀的东西，皮肉被门框刮开也浑然不觉，摇摇晃晃地朝你的光源走来。', [
    { label: '别让它靠近，动手', fx: { combat: 'bloat_solo' } },
    { label: '关掉手电屏息躲开', fx: { stat: { sanity: -4, energy: -4 } } }
  ]);
  ev('enc_metro_2', { loc: 'metro', chance: 0.18 }, 360, 'enc_metro_2_p');

  P('rare_metro_1_p', '轨道下的检修坑里翻出一只军用背囊，帆布都朽了，里面的东西却还结实：成排的[item]子弹[/item]，一只没拆封的[med]军用急救包[/med]。背囊侧袋还塞着一台[item]收音机[/item]，屏面裂了道缝，不知道还响不响。撤离的兵没能带走它。', [
    // M16：军急救包/子弹稳出；收音机小概率还能用（roll 0.3），坏了就当废铁没捡
    { label: '收下这份遗物', fx: { bullets: 15, item: { militaryfirstaid: 1 }, stat: { sanity: -1 }, time: 15, roll: { chance: 0.3, win: { item: { radio: 1 } }, lose: {} } } }
  ]);
  ev('rare_metro_1', { loc: 'metro', chance: 0.04 }, 4320, 'rare_metro_1_p');

  // ---- park ----------------------------------------------------------------
  P('sv_park_1_p', '江对岸的高楼顶上，不知谁放起了一只风筝，红色的，在灰蒙蒙的天上一挫一挫地爬高。你盯着看了很久，直到它稳稳停在风里。', [
    { label: '看到它飞稳为止', fx: { stat: { sanity: 4 }, time: 10 } }
  ]);
  ev('sv_park_1', { loc: 'park', timeRange: [480, 1020], chance: 0.12 }, 720, 'sv_park_1_p');

  P('amb_park_2_p', '芦苇荡深处让人踩出过一条窄道，尽头的野菜丛长得出奇地好——有人打理过，又像是特意留了一半没采。', [
    { label: '采走留着的那一半', fx: { item: { wildveggie: 2 }, time: 20, stat: { energy: -3 } } },
    { label: '照样只采一半，留一半', fx: { item: { wildveggie: 1 }, stat: { sanity: 3 }, time: 20 } }
  ]);
  ev('amb_park_2', { loc: 'park', timeRange: [480, 1020], chance: 0.15 }, 480, 'amb_park_2_p');

  P('rare_park_1_p', '一只橙色的救生箱被江水冲上滩涂，卡在石缝里，封条都还没破——某条撤离船上的东西，漂了两个月，靠了岸。', [
    { label: '撬开救生箱', fx: { item: { militaryfirstaid: 1, rope: 1, cannedfish: 2 }, time: 15 } }
  ]);
  ev('rare_park_1', { loc: 'park', chance: 0.05 }, 4320, 'rare_park_1_p');

  // ---- gas ----------------------------------------------------------------
  P('sv_gas_1_p', '一个背着全部家当的旅人在跟阿豆比划，想搭个能跑的车去南方。阿豆指着满场的破车摇头，末了塞给他一壶水，给他指了条沿江往南的步行路。', [
    { label: '（听完这段指路）', fx: { stat: { sanity: 2 } } }
  ]);
  ev('sv_gas_1', { loc: 'gas', chance: 0.1 }, 720, 'sv_gas_1_p');

  P('enc_gas_2_p', '两条人影正撬着储油罐的阀门往桶里放油，看见你，为首的把撬棍一横：“走你的路。”袖口露出半截暗红布条。', [
    { label: '“这站里的油，轮不到你们放。”', fx: { combat: 'thug_patrol' } },
    // M13：非战斗解法（成功率明示，失败落战斗；结局段共享注册在 dol.js）
    { label: '凑上去以色相许，换一条路（55%）', cond: { stat: { sanity: { gte: 40 } } },
      fx: { roll: { chance: 0.55, win: { goto: 'dol_charm_ok_p' }, lose: { goto: 'dol_talk_fail_patrol_p' } } } },
    { label: '数出8发子弹买路（80%）', cond: { has: { bullets: 8 } },
      fx: { bullets: -8, roll: { chance: 0.8, win: { goto: 'dol_bribe_ok_p' }, lose: { goto: 'dol_bribe_fail_patrol_p' } } } },
    { label: '用灰猫的黑话报个门路（65%）', cond: { aff: { mao: { gte: 40 } } },
      fx: { roll: { chance: 0.65, win: { goto: 'dol_bluff_ok_p' }, lose: { goto: 'dol_talk_fail_patrol_p' } } } },
    { label: '绕开这摊事', fx: { stat: { sanity: -2 } } }
  ]);
  ev('enc_gas_2', { loc: 'gas', chance: 0.12 }, 600, 'enc_gas_2_p');

  P('rare_gas_1_p', '轮胎堆的最底层压着一只上了锁的铁皮箱——撬开一看，是前站长藏下的备件：两件全新的[item]零件[/item]，一罐没开封的汽油。', [
    { label: '搬走备件箱', fx: { item: { sparepart: 2, gasoline: 1 }, time: 20, stat: { energy: -5 } } }
  ]);
  ev('rare_gas_1', { loc: 'gas', chance: 0.05 }, 4320, 'rare_gas_1_p');

  // ---- mall ----------------------------------------------------------------
  P('sv_mall_1_p', '一楼的婚纱橱窗居然没碎。玻璃前站着个女人，一动不动地看着里面落满灰的白纱，听见你的脚步，她头也不回地走进了阴影里。', [
    { label: '（没有跟上去）', fx: { stat: { sanity: -2 } } }
  ]);
  ev('sv_mall_1', { loc: 'mall', chance: 0.1 }, 720, 'sv_mall_1_p');

  P('enc_mall_2_p', '楼上传来齐整的脚步声——两个缠红布条的人一前一后压过来，手电光柱来回扫：“搜仔细点，孟爷说了，踩点的就在这几天来过。”', [
    { label: '趁他们没合围先动手', fx: { combat: 'thug_squad' } },
    // M13：非战斗解法（失败段对应 squad 编组）
    { label: '凑上去以色相许，换一条路（55%）', cond: { stat: { sanity: { gte: 40 } } },
      fx: { roll: { chance: 0.55, win: { goto: 'dol_charm_ok_p' }, lose: { goto: 'dol_talk_fail_squad_p' } } } },
    { label: '数出8发子弹买路（80%）', cond: { has: { bullets: 8 } },
      fx: { bullets: -8, roll: { chance: 0.8, win: { goto: 'dol_bribe_ok_p' }, lose: { goto: 'dol_bribe_fail_squad_p' } } } },
    { label: '用灰猫的黑话报个门路（65%）', cond: { aff: { mao: { gte: 40 } } },
      fx: { roll: { chance: 0.65, win: { goto: 'dol_bluff_ok_p' }, lose: { goto: 'dol_talk_fail_squad_p' } } } },
    { label: '从消防通道脱身', fx: { stat: { energy: -8 }, time: 15 } }
  ]);
  ev('enc_mall_2', { loc: 'mall', chance: 0.15 }, 480, 'enc_mall_2_p');

  P('rare_mall_1_p', '运动用品店的仓储间塌了半边，砸变形的卷帘门后头，一整面货架没被人碰过：登山绳、手电、真空包装的肉干，连挂样的皮夹克和战靴都还在——全是救命的硬货。', [
    { label: '装满背包', fx: { item: { rope: 1, flashlight: 1, driedmeat: 2, leather_jacket: 1, combat_boots: 1 }, time: 25, stat: { energy: -5 } } } // M14：户外柜上架服装
  ]);
  ev('rare_mall_1', { loc: 'mall', chance: 0.05 }, 4320, 'rare_mall_1_p');

  // ---- church（内部无战斗） ---------------------------------------------------
  P('sv_church_1_p', '告解室外排着两三个人。轮到一个袖口缠着暗红布条的汉子，他把布条捋下来揣进兜里才进去，出来的时候眼眶通红，跟谁都没搭话。', [
    { label: '（谁都有要卸的东西）', fx: { stat: { sanity: 2 } } }
  ]);
  ev('sv_church_1', { loc: 'church', chance: 0.1 }, 720, 'sv_church_1_p');

  P('amb_church_3_p', '几个孩子跟着陈神父学唱诗，调子东倒西歪，神父也不纠正，只把风琴踩得更响一点，把跑掉的调都兜回来。', [
    { label: '在最后一排听完', fx: { stat: { sanity: 5 }, time: 20 } }
  ]);
  ev('amb_church_3', { loc: 'church', timeRange: [480, 1020], chance: 0.12 }, 600, 'amb_church_3_p');

  P('rare_church_1_p', '唱诗班的阁楼积着厚灰，角落里一只木箱写着「救济」——里面的东西码得整整齐齐，像随时等着发给谁：罐头、茶叶，一条叠好的毯子。', [
    { label: '取走一份，把箱子照原样合上', fx: { item: { cannedfood: 2, herbaltea: 1 }, stat: { sanity: 2 }, time: 15 } }
  ]);
  ev('rare_church_1', { loc: 'church', chance: 0.05 }, 4320, 'rare_church_1_p');

  // ---- dock ----------------------------------------------------------------
  P('sv_dock_1_p', '一家三口在码头边打听「撤侨船」，男人抱着孩子，女人守着行李。老蔡的灯在他们身后一盏盏亮着，你没听见有谁回答他们。', [
    { label: '指给他们教堂的方向', fx: { stat: { sanity: 2 } } },
    { label: '（转开视线）', fx: { stat: { sanity: -2 } } }
  ]);
  ev('sv_dock_1', { loc: 'dock', chance: 0.1 }, 720, 'sv_dock_1_p');

  P('enc_dock_2_p', '夜里的集装箱巷道像迷宫，你的脚步声引来了回应——不止一处，快得贴着铁皮打滑，从两个方向包过来。', [
    { label: '抢在合围前打出去', fx: { combat: 'runner_pack' } },
    { label: '爬上箱顶走高路', fx: { stat: { energy: -8 }, time: 15 } }
  ]);
  ev('enc_dock_2', { loc: 'dock', timeRange: NIGHT, chance: 0.2 }, 360, 'enc_dock_2_p');

  P('rare_dock_1_p', '一只集装箱的地板下藏着夹层——走私客的老手艺。夹层里的货还在：两瓶好酒模样的[item]烈酒[/item]、几板巧克力，还有一小袋用油纸包好的子弹。', [
    { label: '搬空夹层', fx: { item: { liquor: 1, chocolatebar: 2 }, bullets: 6, time: 20 } }
  ]);
  ev('rare_dock_1', { loc: 'dock', chance: 0.04 }, 4320, 'rare_dock_1_p');

  // ---- checkpoint ----------------------------------------------------------------
  P('sv_checkpoint_1_p', '一个瘸腿的老兵拄着拐来到塌了半边的哨塔前，费力地立正，敬礼，然后从怀里掏出一小瓶酒洒在地上，一句话没说就走了。', [
    { label: '（等他走远才过去）', fx: { stat: { sanity: 1 } } }
  ]);
  ev('sv_checkpoint_1', { loc: 'checkpoint', chance: 0.1 }, 720, 'sv_checkpoint_1_p');

  P('enc_checkpoint_2_p', '铁丝网的破口处卡着半具尸体，几条犬尸正围着撕扯，被你的动静惊得齐齐回头，嘴里还挂着东西。', [
    { label: '趁它们恋食先动手', fx: { combat: 'dog_pack' } },
    { label: '绕开破口另寻路线', fx: { stat: { energy: -5 }, time: 10 } }
  ]);
  ev('enc_checkpoint_2', { loc: 'checkpoint', chance: 0.15 }, 360, 'enc_checkpoint_2_p');

  P('rare_checkpoint_1_p', '哨位的土层被雨水冲出一角铁皮——挖开是一只按条令深埋的应急补给桶：[med]军用急救包[/med]、真空肉干、成排的[item]子弹[/item]，封蜡完好。', [
    { label: '起出补给桶', fx: { item: { militaryfirstaid: 1, driedmeat: 1 }, bullets: 10, time: 30, stat: { energy: -8 } } }
  ]);
  ev('rare_checkpoint_1', { loc: 'checkpoint', chance: 0.04 }, 4320, 'rare_checkpoint_1_p');

  // ---- sewer ----------------------------------------------------------------
  P('sv_sewer_1_p', '手电扫过管壁，一行刻痕拦住你的光：「往东，第三个爬梯，有光」。刻痕旁边标着日期——两个月前的。你顺着箭头看过去，那条支道早就塌死了。', [
    { label: '（希望他当时爬上去了）', fx: { stat: { sanity: -3 } } }
  ]);
  ev('sv_sewer_1', { loc: 'sewer', chance: 0.12 }, 720, 'sv_sewer_1_p');

  P('enc_sewer_2_p', '前方的水闸半开着，闸下的水流里卡着一只肿胀的东西，被水冲得一鼓一鼓——它忽然睁开了眼。', [
    { label: '趁它卡着解决掉', fx: { combat: 'bloat_solo' } },
    { label: '从检修台绕过水闸', fx: { stat: { energy: -6 }, time: 10 } }
  ]);
  ev('enc_sewer_2', { loc: 'sewer', chance: 0.15 }, 360, 'enc_sewer_2_p');

  P('rare_sewer_1_p',
    function (s) {
      var base = '高处一截废管里塞着防水布包——有人的藏匿点，手法专业，但布包上的灰说明主人很久没来了。里面是电池、绳子和一小包子弹。';
      if (s.npcs.mao && s.npcs.mao.met) base += '看手法，不是灰猫的路数。';
      return base;
    }, [
    { label: '收走无主的存货', fx: { item: { battery: 1, rope: 1 }, bullets: 5, time: 10 } }
  ]);
  ev('rare_sewer_1', { loc: 'sewer', chance: 0.05, has: { item: 'flashlight' } }, 4320, 'rare_sewer_1_p');

  // ==========================================================================
  // 2. 状态触发池
  // ==========================================================================

  // ---- 幻觉（sanity < 20），任意地点 ----------------------------------------
  var HALLU = { stat: { sanity: { lt: 20 } } };
  function hallu(id, chance, cd, pid) {
    ev(id, Object.assign({ chance: chance }, HALLU), cd, pid, 3, ['enter', 'action', 'tick']);
  }

  P('halluc_1_p', '敲门声。笃，笃，笃，不急不缓，来自你身后那面根本没有门的墙。你数到第七下，它停了——像是知道你在数。', [
    { label: '背对着墙走开', fx: { stat: { sanity: -3 } } },
    { label: '“没有门。那里没有门。”', fx: { stat: { sanity: 1 } } }
  ]);
  hallu('halluc_1', 0.3, 360, 'halluc_1_p');

  P('halluc_2_p', '眼角的余光里一直有个人影跟着你，保持着不远不近的距离。你猛地回头——空的。可你一转回来，余光里它又在了，还朝你挥了挥手。', [
    { label: '不再回头，加快脚步', fx: { stat: { sanity: -2, energy: -3 } } },
    { label: '停下来，等它自己散掉', fx: { stat: { sanity: -3 }, time: 10 } }
  ]);
  hallu('halluc_2', 0.3, 360, 'halluc_2_p');

  P('halluc_3_p', '有人贴着你的耳朵说话，声音熟得心口发疼，内容却怎么也听不清。你越想听清，那声音越低，最后变成一句气音：还记得我吗。', [
    { label: '捂住耳朵', fx: { stat: { sanity: -2, energy: -2 } } },
    { label: '“……不记得。对不起。”', fx: { stat: { sanity: -4 } } }
  ]);
  hallu('halluc_3', 0.25, 480, 'halluc_3_p');

  P('halluc_4_p', '你在一块碎玻璃里看见自己的倒影——它的动作比你慢了半拍，你抬手，它隔了一瞬才抬，嘴角还挂着一个不属于你的笑。', [
    { label: '砸碎那块玻璃', fx: { stat: { hp: -2, sanity: 2 } } },
    { label: '闭上眼睛走过去', fx: { stat: { sanity: -3 } } }
  ]);
  hallu('halluc_4', 0.25, 480, 'halluc_4_p');

  P('halluc_5_p', '有那么几秒，世界忽然完好如初：街上人来人往，早点摊冒着热气，有人喊了一个名字——你的头忽然一阵刺痛，好像那正是你的名字，从很久以前传来。幻象散去，街道空空如也。', [
    { label: '攥紧那点刺痛的熟悉感', fx: { stat: { sanity: 5 } } }
  ]);
  hallu('halluc_5', 0.12, 720, 'halluc_5_p');

  // ---- 醉酒（alcohol > 60），任意地点 ---------------------------------------
  var DRUNK = { stat: { alcohol: { gt: 60 } } };
  function drunk(id, chance, cd, pid) {
    ev(id, Object.assign({ chance: chance }, DRUNK), cd, pid, 3, ['enter', 'action', 'tick']);
  }

  P('drunk_1_p', '地面朝你倾斜过来——等你反应过来，膝盖和手掌已经先着了地，火辣辣地疼。你就着这个姿势愣了几秒，忘了自己要去哪。', [
    { label: '爬起来拍拍土', fx: { stat: { hp: -4 } } },
    { label: '干脆坐在地上缓缓', fx: { stat: { hp: -2 }, time: 20 } }
  ]);
  drunk('drunk_1', 0.3, 300, 'drunk_1_p');

  P('drunk_2_p', '你眨了一下眼。再睁开时天色不对，你靠在一处完全不记得怎么过来的墙角，嘴里发苦，记忆缺了一大块。摸摸背包——东西还在，算走运。', [
    { label: '努力回想（想不起来）', fx: { time: 90, stat: { sanity: -3 } } }
  ]);
  drunk('drunk_2', 0.2, 480, 'drunk_2_p');

  P('drunk_3_p', '酒劲上头，你忽然觉得自己天下无敌，对着墙上自己的影子比划了半天拳脚，直到一拳擂在墙上才骤然清醒。', [
    { label: '疼得直甩手', fx: { stat: { hp: -3, energy: -6, sanity: 2 } } }
  ]);
  drunk('drunk_3', 0.25, 360, 'drunk_3_p');

  // ---- 毒瘾发作日（addiction > 50，每日一次，三分支） ------------------------
  events.register({
    id: 'addict_attack_1', type: 'scheduled', priority: 7,
    cond: { stat: { addiction: { gt: 50 } }, timeRange: [480, 1380] },
    passage: 'addict_attack_p1'
  });

  P('addict_attack_p1',
    function () {
      var pool = [
        '先是指尖发麻，然后是后槽牙发痒，很快整个人像有蚂蚁顺着血管爬。你认得这个信号——瘾，到点了。',
        '汗一层层往外冒，冷的。你的手抖得系不上扣子，脑子里只剩一个念头在打转，越压越响。',
        '胃里拧成一团，太阳穴突突地跳。路边的一切都变得刺眼，你蹲下来抱住膝盖，等这阵浪头过去——它不过去。'
      ];
      return pool[Math.floor(Math.random() * pool.length)];
    },
    [
      { label: '用镇静剂压下去', cond: { has: { item: 'sedative' } }, fx: { item: { sedative: -1 }, stat: { addiction: 3, sanity: 4 }, goto: 'addict_attack_p2a' } },
      { label: '用止痛药顶一顶', cond: { has: { item: 'painkiller' } }, fx: { item: { painkiller: -1 }, stat: { addiction: 2, sanity: 2 }, goto: 'addict_attack_p2a' } },
      { label: '咬牙硬扛过去', fx: { stat: { addiction: -4, sanity: -6, energy: -12 }, time: 90, goto: 'addict_attack_p2b' } }
    ]);

  P('addict_attack_p2a',
    '药劲漫上来，那阵浪头软了，退了。世界重新变得可以忍受——你心里清楚，这不是解决，是续期。下一个到点的日子，已经在路上了。',
    [{ label: '（缓过来）', fx: {} }]);

  P('addict_attack_p2b',
    '你找了个角落把自己塞进去，任那阵浪头从头顶碾过。出了一身透汗，牙关咬得腮帮子发酸——但它终于退了，退的时候好像比来的时候小了一圈。',
    [{ label: '（撑过去了）', fx: { stat: { sanity: 2 } } }]);

  // ---- 感染濒死线（infection > 80，高优先级催命） ----------------------------
  events.register({
    id: 'infect_crit_1', type: 'random', when: ['enter', 'action', 'tick'], priority: 9, cooldown: 360,
    cond: { stat: { infection: { gt: 80 } } },
    passage: 'infect_crit_p1'
  });

  P('infect_crit_p1',
    function (s) {
      var head = '一阵冷一阵热从骨头缝里往外翻，你颈侧的暗纹已经爬过了下颌线，指甲盖泛出不正常的灰。喉咙深处泛起铁锈味——身体里那场战争，你正在输。';
      if (s.player.location === 'hospital') {
        return head + '好在这里是医院，消毒水的气味让你抓住了最后一根绳子。';
      }
      return head + '再拖下去就真的晚了——市二医院，现在就去，用爬的也要爬到。';
    },
    [
      { label: '让林晚全力救治', cond: { loc: 'hospital', aff: { lin: { gte: 40 } } }, fx: { stat: { infection: -35, hp: 5 }, time: 120, aff: { lin: 2 }, goto: 'infect_crit_p2a' } },
      { label: '付子弹接受急救', cond: { loc: 'hospital', has: { bullets: 10 } }, fx: { bullets: -10, stat: { infection: -35, hp: 5 }, time: 120, goto: 'infect_crit_p2a' } },
      { label: '拆一只军用急救包自救', cond: { has: { item: 'militaryfirstaid' } }, fx: { item: { militaryfirstaid: -1 }, stat: { infection: -20 }, time: 30, goto: 'infect_crit_p2b' } },
      { label: '咬牙硬撑', fx: { stat: { hp: -5, sanity: -5 }, goto: 'infect_crit_p2c' } }
    ]);

  P('infect_crit_p2a',
    '抗病毒剂顺着血管烧过去，疼得你几乎晕厥，可那阵从骨缝里往外翻的冷热潮，终于被压了下去。颈侧的暗纹淡了，退回了衣领底下——这一次，你从线上被拽回来了。',
    [{ label: '（大难不死）', fx: { milestone: '从感染濒死线上被拉回来' } }]);

  P('infect_crit_p2b',
    '你用牙撕开急救包，把抗病毒剂扎进大腿，剩下的绷带和消毒粉照着说明糊上去。潮水退了半步——只有半步。这东西救急不救命，你需要真正的医生。',
    [{ label: '（撑住了，暂时）', fx: {} }]);

  P('infect_crit_p2c',
    '你靠着墙滑坐下去，等那阵潮水自己退。它没退，只是暂时懒得吞你。你数着自己的心跳，一下，一下——比昨天又慢了一点，也沉了一点。',
    [{ label: '（挣扎着起身）', fx: {} }]);

  // ==========================================================================
  // 3. 全局周期：尸潮夜 / 雨天
  // ==========================================================================

  // ---- 尸潮夜：预警（读广播/情报渠道出文案变体，写入日历，次日 20:30 强制开场） ----
  events.register({
    id: 'horde_warn', type: 'random', when: ['tick', 'enter'], priority: 5, cooldown: 8640,
    cond: { timeRange: [1020, 1380], chance: 0.08, flag: { 'world.hordeNight': false, 'world.hordeAlert': false } },
    passage: 'horde_warn_p1'
  });

  P('horde_warn_p1',
    function (s) {
      if (s.npcs.zhou && s.npcs.zhou.met) {
        return '收音机里突然插进一段加播，周响的声音比平时快了一倍：“重复一遍——北面居民区观测到大规模移动，规模很大，方向入城。明晚开始不要出门，锁死门窗，灭掉灯火。这不是演习，朋友们。”';
      }
      if (s.npcs.mao && s.npcs.mao.met) {
        return '墙缝里塞着一张折成三角的纸条，是灰猫渠道的记号。展开只有一行字：「北边起潮，明晚过境。别在街上，别点灯。——七成保真，这条我押十成。」';
      }
      return '酒吧方向传来急促的敲锣声，一路敲一路喊：“北边起大潮了——！明晚别出门！关灯闭户——！”喊声由近及远，整条街的窗火一盏接一盏地熄了。';
    },
    [{ label: '记下这个日子', fx: { flag: { 'world.hordeAlert': true }, appointment: { inDays: 1, minute: 1230, label: '尸潮夜（预警：锁门闭户）', eventId: 'horde_night_start' }, stat: { sanity: -3 } } }]);

  // ---- 尸潮夜：收音机变体（M16 收音机效果②） ---------------------------------
  // 带收音机时，预警提前到当日上午（同样登记次日 20:30 强制开场）——多出的半天用来备战。
  // 上午先触发本条并置 hordeAlert=true，则常规 horde_warn（cond hordeAlert:false）当日不再命中，两条互斥。
  events.register({
    id: 'horde_warn_radio', type: 'random', when: ['tick', 'enter'], priority: 5, cooldown: 8640,
    cond: { timeRange: [300, 1020], chance: 0.08, has: { item: 'radio' }, flag: { 'world.hordeNight': false, 'world.hordeAlert': false } },
    passage: 'horde_warn_radio_p1'
  });

  P('horde_warn_radio_p1',
    '清晨的[item]收音机[/item]忽然切断了常规节目，一段加急通报反复播送：“紧急播报——北面居民区观测到大规模移动，规模极大，方向入城。预计明晚过境。请所有幸存者今日之内备足物资、加固门窗、入夜后熄灯闭户。重复一遍……”一整天的预备时间，比往常从傍晚才听到消息，宽裕得多。',
    [{ label: '趁天亮抓紧备战', fx: { flag: { 'world.hordeAlert': true }, appointment: { inDays: 1, minute: 1230, label: '尸潮夜（收音机预警：锁门闭户）', eventId: 'horde_night_start' }, stat: { sanity: -2 } } }]);

  // ---- 尸潮夜：开场（仅由日历 eventId 强制触发；when:[] 不入常规池） ----------
  events.register({ id: 'horde_night_start', type: 'story', when: [], once: false, priority: 9, passage: 'horde_night_start_p1' });

  P('horde_night_start_p1',
    function (s) {
      if (!G.engine.getFlag('world.hordeNight')) {
        G.engine.setFlag('world.hordeNight', true);
        G.engine.setFlag('world.hordeAlert', false);
        var p = s.player;
        // 次日 05:00 由日历强制收尾（睡眠/挂机跨点也能结算）
        s.calendar.appointments.push({ day: p.day + 1, minute: 300, label: '尸潮退去', eventId: 'horde_night_end', done: false });
      }
      var loc = s.player.location;
      if (loc === 'home' || loc === 'bar' || loc === 'church') {
        return '它先是一种震动，从地面传进脚底；然后是声音——千百个喉咙搅在一起的闷响，像涨潮，一浪压过一浪地漫进街道。你从窗缝往外看了一眼就再不敢看：整条街都在动。[horror]尸潮[/horror]过境，今夜谁也别出门。';
      }
      return '街道尽头的黑暗忽然「活」了——不是几只，是一整面墙的[zed]死人[/zed]推着彼此涌过来，脚步声汇成闷雷。[horror]尸潮[/horror]过境，你被堵在了街面上，今夜每一步都得用命换。';
    },
    [{ label: '（撑过这一夜）', fx: { stat: { sanity: -5 }, milestone: '尸潮夜' } }]);

  // ---- 尸潮夜：室外遭遇池（危险度整体上调的实现载体） ------------------------
  var HORDE_OUT = { anyOf: [{ loc: 'residential' }, { loc: 'hospital' }, { loc: 'police' }, { loc: 'campus' }, { loc: 'metro' }, { loc: 'park' }, { loc: 'gas' }, { loc: 'mall' }, { loc: 'dock' }, { loc: 'checkpoint' }, { loc: 'sewer' }] };

  P('horde_enc_1_p', '潮头的散兵先到了——两条跑得最快的影子从巷口窜进来，见活物就扑，身后的闷雷声还在逼近。', [
    { label: '抢在合流前杀出去', fx: { combat: 'runner_pack' } },
    { label: '躲进高处等它们过去', fx: { stat: { energy: -10, sanity: -4 }, time: 60 } }
  ]);
  ev('horde_enc_1', Object.assign({ chance: 0.5, flag: { 'world.hordeNight': true } }, HORDE_OUT), 120, 'horde_enc_1_p', 6, ['enter', 'action', 'tick']);

  P('horde_enc_2_p', '一声尖啸撕开夜色——潮水般的[zed]尸群[/zed]闻声改道，朝你这个方向压过来，退路正在一条条被淹没。', [
    { label: '拼死冲开一条口子', fx: { combat: 'screecher_horde' } },
    { label: '弃了随身杂物引开它们', fx: { stat: { energy: -12, sanity: -5 }, item: { glassbottle: -1 }, time: 30 } },
    { label: '钻进最近的建筑死守', fx: { stat: { energy: -8, sanity: -6 }, time: 90 } }
  ]);
  ev('horde_enc_2', Object.assign({ chance: 0.35, flag: { 'world.hordeNight': true } }, HORDE_OUT), 180, 'horde_enc_2_p', 6, ['enter', 'action', 'tick']);

  // ---- 尸潮夜：室内听潮 -------------------------------------------------------
  P('horde_safe_1_p', '潮声隔着墙滚过去，一浪接一浪，窗框震得嗡嗡响。屋里没人说话，连呼吸都放轻了——灯芯拧到最小，火光缩成一粒豆。', [
    { label: '守着灯听到潮声远去', fx: { stat: { sanity: -3 }, time: 60 } },
    { label: '用被子蒙住头', fx: { stat: { sanity: -2 }, time: 60 } }
  ]);
  ev('horde_safe_1', { anyOf: [{ loc: 'home' }, { loc: 'bar' }, { loc: 'church' }], chance: 0.5, flag: { 'world.hordeNight': true } }, 120, 'horde_safe_1_p', 5, ['enter', 'action', 'tick']);

  // ---- 尸潮夜：加固门窗后的安心变体（M17，仅 home 且已修「加固门窗」，优先级高于 horde_safe_1） ----
  P('horde_safe_door_p', '潮声隔着这扇钉死的窗棂闷闷地滚过去，缝隙都用废铁和胶带堵严实了，屋里没有一丝风灌进来。你反倒睡了个踏实觉。', [
    { label: '（安稳地等它过去）', fx: { stat: { sanity: 2 }, time: 60 } }
  ]);
  ev('horde_safe_door', { loc: 'home', homeUpg: { door: true }, chance: 0.5, flag: { 'world.hordeNight': true } }, 120, 'horde_safe_door_p', 6, ['enter', 'action', 'tick']);

  // ---- 尸潮夜：收尾（仅由日历 eventId 强制触发） ------------------------------
  events.register({ id: 'horde_night_end', type: 'story', when: [], once: false, priority: 9, passage: 'horde_night_end_p1' });

  P('horde_night_end_p1',
    '天蒙蒙亮，潮声退成了零星的拖行声，最后归于死寂。街面上留下一层被踩烂的东西，空气里的腐味要散上一整天——但它过去了，你还活着。',
    [{ label: '（长出一口气）', fx: { flag: { 'world.hordeNight': false }, stat: { sanity: 4 } } }]);

  // ---- 雨天：上午随机开雨，20:00 由日历收尾 ----------------------------------
  events.register({
    id: 'rain_start', type: 'random', when: ['tick', 'enter'], priority: 4, cooldown: 2880,
    cond: { timeRange: [300, 720], chance: 0.12, flag: { 'world.rainDay': false } },
    passage: 'rain_start_p1'
  });

  P('rain_start_p1',
    '云从江面上压过来，雨点先是一颗一颗砸出土腥味，随即连成了片。整座城的轮廓都被雨幕泡软了，街上的死人游荡得比平时更慢、更聋——雨天，是这座城难得的喘息。',
    [{ label: '（今天是个雨天）', fx: { flag: { 'world.rainDay': true }, appointment: { inDays: 0, minute: 1200, label: '雨停', eventId: 'rain_end' }, stat: { sanity: 2 } } }]);

  events.register({ id: 'rain_end', type: 'story', when: [], once: false, priority: 4, passage: 'rain_end_p1' });

  P('rain_end_p1',
    '雨脚渐渐收了，云层裂开几道缝，露出洗过的夜色和几点星子。屋檐还在滴水，一声一声，把夜敲得很静。',
    [{ label: '（雨停了）', fx: { flag: { 'world.rainDay': false } } }]);

  // 雨天采集加成（公园）
  P('rain_harvest_1_p', '雨水顺着芦苇叶淌成小溪，你支起所有能盛水的家伙，不到半个时辰就接了个满——雨里的野菜也支棱起来，鲜嫩得掐得出水。', [
    { label: '满载而归', fx: { item: { rainwater: 2, wildveggie: 1 }, time: 30, stat: { energy: -3 } } }
  ]);
  ev('rain_harvest_1', { loc: 'park', chance: 0.5, flag: { 'world.rainDay': true } }, 240, 'rain_harvest_1_p', 2);

  // 雨天氛围变体（街面）
  P('rain_amb_1_p', '雨把枪声、哭声和拖行声都泡进了白噪音里。你站在屋檐下看了一会儿雨——这座城安静得几乎像它死掉以前。', [
    { label: '在檐下躲一阵雨', fx: { stat: { sanity: 3 }, time: 20 } },
    { label: '冒雨赶路', fx: { stat: { energy: -3 } } }
  ]);
  ev('rain_amb_1', Object.assign({ chance: 0.2, flag: { 'world.rainDay': true } }, { anyOf: [{ loc: 'residential' }, { loc: 'campus' }, { loc: 'dock' }, { loc: 'gas' }, { loc: 'checkpoint' }] }), 240, 'rain_amb_1_p', 1);

  // ==========================================================================
  // 4. 屠夫帮世界线（读主线 flag 出变体，不推剧情、不写剧情 flag）
  // ==========================================================================

  P('butcher_world_1_p',
    function () {
      var head = '街口停着一辆改装皮卡，几个缠红布条的人挨家砸门「收账」，把翻出来的东西往车斗里扔。';
      if (G.engine.getFlag('npc.qin.s4_1')) {
        head += '你听见其中一个念叨：“孟爷有令，见着跟姓秦的老警察搭伙的，长什么样都记下来。”——他们说的是你。';
      } else if (G.engine.getFlag('npc.qin.scoutDone')) {
        head += '为首的正在训话：“商场外围让人踩了点，都把眼睛放亮些！”';
      }
      return head;
    },
    [
      { label: '教他们做人', fx: { combat: 'thug_patrol' } },
      // M13：非战斗解法（收账队为 patrol 编组）
      { label: '凑上去以色相许，换一条路（55%）', cond: { stat: { sanity: { gte: 40 } } },
        fx: { roll: { chance: 0.55, win: { goto: 'dol_charm_ok_p' }, lose: { goto: 'dol_talk_fail_patrol_p' } } } },
      { label: '数出8发子弹买路（80%）', cond: { has: { bullets: 8 } },
        fx: { bullets: -8, roll: { chance: 0.8, win: { goto: 'dol_bribe_ok_p' }, lose: { goto: 'dol_bribe_fail_patrol_p' } } } },
      { label: '用灰猫的黑话报个门路（65%）', cond: { aff: { mao: { gte: 40 } } },
        fx: { roll: { chance: 0.65, win: { goto: 'dol_bluff_ok_p' }, lose: { goto: 'dol_talk_fail_patrol_p' } } } },
      { label: '压低帽檐绕开', fx: { stat: { sanity: -2 } } }
    ]);
  // M19：屠夫帮倒台（world.butcherFallen）后本组事件停用，换 campaign.js 的 aftermath 变体
  ev('butcher_world_1', { anyOf: [{ loc: 'residential' }, { loc: 'market' }], chance: 0.12, flag: { 'world.butcherFallen': false } }, 1440, 'butcher_world_1_p', 1);

  P('butcher_world_2_p',
    function () {
      var head = '码头方向开来一支小车队，缠红布条的押着几只贴封条的货箱往船上搬。';
      if (G.engine.getFlag('npc.qin.sawCargo')) {
        head += '借着起重机的灯光，你又看清了箱壁上的军用批号——和商场外围那批，同一个来路。';
      } else if (G.engine.getFlag('npc.mao.lostGoods')) {
        head += '监工的骂骂咧咧：“地铁站那晚折了三个弟兄，货毛都没捞着——都给老子精神点！”';
      }
      return head;
    },
    [
      { label: '记下船开走的方向', fx: { stat: { sanity: -1 }, time: 15 } },
      { label: '不宜久留，撤', fx: {} }
    ]);
  ev('butcher_world_2', { loc: 'dock', chance: 0.12, flag: { 'world.butcherFallen': false } }, 1440, 'butcher_world_2_p', 1);

  P('butcher_world_3_p',
    function () {
      var base = '桥墩上新刷了一层浆糊，贴着屠夫帮的悬赏告示。';
      if (G.engine.stageGet('mao') >= 3) {
        return base + '画像上那顶压低的帽檐你再熟悉不过——是灰猫。赏格不低。你左右看看没人，顺手把告示撕了下来，撕得很碎。';
      }
      if (G.engine.stageGet('qin') >= 4) {
        return base + '除了几张老面孔，最边上添了张新的：五官画得含糊，但那身形——像你。看来北巷和收货点的账，他们记在你头上了。';
      }
      return base + '悬赏一个「跑单的女人」，画像糊成一团，倒是赏格写得清清楚楚：五十发子弹，要活的。';
    },
    [
      { label: '撕掉告示', fx: { stat: { sanity: 2 } } },
      { label: '看过就走', fx: { stat: { sanity: -2 } } }
    ]);
  ev('butcher_world_3', { anyOf: [{ loc: 'sewer' }, { loc: 'dock' }, { loc: 'residential' }], chance: 0.1, flag: { 'world.butcherFallen': false } }, 2880, 'butcher_world_3_p', 1);

  P('butcher_world_4_p',
    function () {
      var head = '商场外围的断墙后传来打斗声——是屠夫帮自己人在火并，两拨人打得头破血流，谁也没心思看路。';
      if (G.engine.getFlag('npc.qin.s3_4')) {
        head += '有人被按在地上还不服：“凭什么孟九管货又管账！”看来老秦说的「连本带利」，有人替他先讨上了。';
      }
      return head;
    },
    [
      { label: '趁乱摸走他们撂下的物资', fx: { item: { cannedfood: 1 }, bullets: 3, stat: { sanity: -2 }, time: 10 } },
      { label: '别蹚浑水，绕开', fx: {} }
    ]);
  ev('butcher_world_4', { loc: 'mall', chance: 0.12, flag: { 'world.butcherFallen': false } }, 1440, 'butcher_world_4_p', 1);

})();
