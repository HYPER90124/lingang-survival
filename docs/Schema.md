# 数据 Schema 与技术约定

所有模块必须遵守本文件。接口有缺口时，扩展方式为「新增字段」，禁止改动已有字段含义；改动需在 PLAN.md 交接备注中说明。

## 技术约定

- 纯 HTML + CSS + 原生 JS（ES2020），无框架、无构建步骤，直接可跑。
- 全局命名空间 `window.G`，各文件向其挂载：`G.engine` `G.ui` `G.data`。
- `index.html` 按顺序引入：css → engine 各文件 → ui 各文件 → data 各文件 → main.js。data 文件全部是纯数据对象注册，可安全并行开发。
- 目录结构：

```
index.html
css/style.css
js/engine/   state.js time.js events.js combat.js save.js main.js
js/ui/       render.js panels.js tags.js
js/data/     items.js locations.js npcs.js trade.js
js/data/story/   qin.js lin.js mao.js secondary.js minor.js worldevents.js
tools/build.js   （合并打包单 HTML 的 Node 脚本，M9 实现）
```

- 存档：localStorage 键 `lgys_save_{槽位}`，3 个槽位 + 自动存档槽；导出/导入为 Base64 JSON 字符串。`G.SAVE_VERSION` 当前 **6**（M14 新增 `player.outfit`；M15 新增 `player.stats.cold`；M16 新增 `world.codex`/`world.stats` + `player.stats.grime`；M17 新增 `world.homeUpg`/`world.gardenDay` + 顶层 `homeStorage`；M18 新增 `world.companion`）；结构变更走 `save.js migrate()` 逐版本升级 + `normalize()` 补字段，老档读入自动补默认初始装、`cold:0`、图鉴/统计空容器、`grime:0`、家园升级空对象与空储物柜、`companion:null`。M16 另加 `migrateLegacyKey()`：M9 之前若用过无后缀单档键 `lgys_save`，首次 listSaves/load 时一次性迁入槽 1（保留旧键做回退）。

## GameState（G.state）

```js
{
  meta: { version: 1, saveTime: 0 },
  player: {
    name: "", gender: "m"|"f",
    day: 90, minute: 480,            // 当天 00:00 起的分钟数
    location: "home",
    stats: { hp:100, hunger:70, thirst:70, energy:80,
             sanity:80, alcohol:0, addiction:0, infection:0,
             cold:0, grime:0 },   // 全部 0–100；cold=寒冷值（M15）；grime=脏污值（M16，搜刮/战斗/下水道累积，洗漱清零）
    bullets: 20,                     // 硬通货
    weapon: null,                    // 装备中武器 {id, durability}
    inventory: [ {id, count} ],      // 武器类单独成条目带 durability
    skills: {},                      // 被动技能标记，如 melee:true, bandage:true, modding:true
    flags: {}                        // 玩家侧剧情标记，布尔或数字
  },
  npcs: {
    qin: { met:false, alive:true, affinity:0, stage:0, storyFlags:{}, vars:{} },
    // lin/mao/su/dou/zhou/zhao/chen/cai/fang 同构
  },
  world: { flags:{}, cooldowns:{},    // cooldowns: {eventId: 到期绝对分钟}
           codex:{ enemies:{id:true} },                       // M16：已见敌人图鉴
           stats:{ kills:{id:n}, scavenges:0, fights:0, flees:0 },   // M16：生存统计
           homeUpg:{ door:false, rain:false, garden:false, storage:false },  // M17：家园四项升级
           gardenDay: null,                                   // M17：小菜园最近收获日（未建为 null）
           companion: null },                                 // M18：当前同行 NPC {id, until}（until=当日24:00 的 absMinute），无则 null
  calendar: {
    appointments: [ {day, minute, label, eventId} ],   // 剧情登记的约定
    milestones:   [ {day, label} ]                     // 重要日子回顾
  },
  scavenge: {},   // {locationId: 已搜刮次数}，用于掉落递减
  homeStorage: [] // M17：家园储物柜 {id,count}，不计入 invWeight/carryCap，容量走 TUNE.homeStorageCap（重量）
}
```

- 状态数值全部钳制在 0–100。绝对时间 = day*1440 + minute，跨日由 time.js 统一处理。
- **阈值效果（M1 实现，M3 配数值）**：hp=0 死亡（读档）；hunger/thirst 低于 20 开始扣 hp；energy<15 行动耗时 +50%；sanity<20 触发幻觉事件池；alcohol>60 文本进入醉酒变体、行动判定惩罚；addiction>50 每日定时发作事件；infection>80 进入濒死线（限时事件，可被林晚剧情救治）；**cold（M15）>50 精力上限随寒冷等量下压、>80 每 10 分钟失温掉血**；**grime（M16）>70 触发 NPC 搭话嫌弃变体、普通礼物 +1 好感失效、高脏污随机事件（野狗循味/招蝇）——只做氛围，无硬数值惩罚**。
- **季节与寒冷（M15）**：季节按游戏日分三档（秋/初冬 day≥140/深冬 day≥170），`G.engine.seasonTierNow()`→0/1/2、`seasonNow()`→字符串、`isWinter()`→bool，缓存于 `world.season`。`cold` 仅冬季室外累积（`TUNE.coldOutPer10[档] - 全身 warmth×TUNE.warmthRelief`，寒潮 `world.coldSnap` 期间加 `coldSnapSurge`），室内/生火/煮水消退。全部常量在 `time.js TUNE`。cond DSL 新增 `season:'winter'|'earlywinter'|'deepwinter'|'autumn'` 门（`winter`=初冬+深冬）。
- **家园升级（M17）**：home 新增 4 个一次性 `type:'repair'` 数据行动（`G.engine.homeRepair`），消耗材料写 `world.homeUpg[door|rain|garden|storage]=true`。door：尸潮夜 home 走安心变体事件 + 在家睡眠精力恢复 ×`1+TUNE.homeSleepDoorBonus`；rain：雨天跨日结算自动产 `TUNE.homeRainYield` 份 `rainwater`（`world._rainedToday` 逐步标记，绕开 `world.rainDay` 20:00 先清空的时序问题）；garden：每 `TUNE.gardenIntervalDays` 天产 `TUNE.gardenYield` 份 `wildveggie`（记最近收获日 `world.gardenDay`）；storage：解锁 `homeStorage` 存取 UI。被动产出统一走 `G.engine.homeAutoStore(id,n)`（有柜且未满进柜，否则进背包）。cond DSL 新增 `homeUpg:{door|rain|garden|storage: bool}` 门。仓储接口：`homeStorageCount/Add/Remove/Weight/Cap/Deposit/Withdraw`。
- **NPC 同行作战（M18）**：`world.companion={id,until}` 记录当前同行者（`until`=当日 24:00 的 absMinute），唯一事实源。战斗型 NPC 在 `npcs.js` 带 `companion` 字段：`{role:'melee'|'gun'|'scout', hp?, dmg?[min,max], hit?, scout?, fleeBonus?, encMod?, joinLine, lines[]}`。三人：qin 近战（hp50/[7,12]/0.82）、dou 持枪（hp38/[6,11]/0.68，弹药自带）、mao 侦察（不参战，逃跑 +0.15、随机遇敌几率 -0.30）。引擎接口全在 state.js（`companionState/Active/Id`）+ npcs.js（`companionInvite(id,payment,itemId)` payment∈'aff'好感-3/'treat'消耗一份 `isTreatItem`；`companionEnd(reason)` reason∈dismiss/home/expire/retreat好感-2/defeat；`companionCombatUnit()` 战斗型返单位否则 null；`companionScoutActive/FleeBonus/EncMod`；`companionOnArrive(loc)`；`companionMidnight()`）。战斗：`combat.allies[]` 我方单位，玩家行动后 `allyTurn()` 打 firstAlive，敌人每回合 50/50 分配目标（打同伴无护甲/防御减免），同伴 hp≤30% maxHp 自动撤出（不死，清 companion + 好感-2）。结束触发：回 home（goLocation 钩 `companionOnArrive`）/ 当日 24:00（dayRollover 钩 `companionMidnight`）/ 主动解散（关系面板按钮）。同行期该 NPC 的 `scheduled` 事件（按 `ev.npc` 匹配）不触发；同行时 `carryCap +10`。cond DSL 新增 `companion:true|false|"npcId"` 门。氛围事件 `companion_chat`（random，chance .15/cd 240，cond `companion:true`）低频播一句同伴对话。

- **屠夫帮收网战役（M19，`js/data/story/campaign.js`）**：qin 复仇线三幕收网。入口门槛 qin stage4+`npc.qin.s4_1`+day≥110。flag 链（均 `npc.qin.*`）：`campClueMao/campClueZhou/campClueFang`（三情报碎片）→ `campReady`（集齐，文本副作用落旗）→ `campDepot`（端掉码头据点，`campRetreat` 为显式撤退旗）→ 日历 `camp3_ambush` 强制触发决战 → 处置旗 `mengDead`|`mengSpared` + **`world.butcherFallen`**（世界线总旗，M20 动态经济读它；butcher_world_1~4 加 `butcherFallen:false` 门停用，camp_after_1~4 变体接棒，`qin_hunt` 被 campaign.js 覆盖注册加同门、`qin_hunt2` 清残党循环接棒）。新敌人 `thug_boss`（孟九，hp80/dmg[10,18]/human）+ 编组 `thug_boss_pack`。**战役战斗回调**：campaign.js 包装 `G.engine.startCombat`——`opts.returnPassage` 命中战役段落 id 时改挂 onWin/onFlee/onLose（胜=原 goto、逃=撤退段、败=campaignDefeat 被俘非死亡：镜像 humanDefeat + 醒在码头货舱 + `world.campLastLoss` 记败于哪一幕），其余战斗透传，引擎未动。战役两幕均强制 qin 同行（直接写 `world.companion`，复用 M18 机制）。

## 条件 DSL（cond）

事件、选项、段落通用。对象内多条件为 AND，`anyOf` 数组内为 OR。

```js
{ loc:"bar", timeRange:[1200,1560],        // 分钟，支持跨午夜
  weekday:2, dayMin:95, chance:0.3,
  season:"winter",                          // M15 季节门（winter=初冬+深冬 / earlywinter / deepwinter / autumn）
  homeUpg:{ door:true },                    // M17 家园升级门，{door|rain|garden|storage: bool}，多项 AND
  companion:true,                           // M18 同行门：true=有同伴 / false=无 / "qin"=指定同伴
  stat:{ sanity:{lt:20}, alcohol:{gte:60}, cold:{gt:0} },
  aff:{ qin:{gte:40} }, stage:{ qin:{gte:2} },
  flag:{ "qin_s1_1":true, "world.butcher_raid":false },   // 无前缀查 player.flags，npc 标记写 "npc.qin.xxx"
  has:{ item:"flashlight", bullets:10 },
  gender:"f", anyOf:[ {...}, {...} ] }
```

## 效果 DSL（fx）

```js
{ stat:{hp:-10, sanity:+5}, bullets:-5,
  item:{ bandage:+1, rustpipe:-1 },
  aff:{ qin:+5 }, stage:{ qin:2 },          // stage 只允许 +1 式推进，由引擎校验
  flag:{ "qin_s1_1":true }, skill:"bandage",
  time:30,                                   // 消耗分钟
  appointment:{ inDays:2, minute:1200, label:"和老秦巡逻", eventId:"qin_patrol_1" },
  milestone:"初遇灰猫",
  goto:"qin_s1_2a", combat:"zombie_pair", shop:"zhao_main",
  roll:{ chance:0.55, win:{...fx}, lose:{...fx} } }   // M13 扩展：概率分支，掷骰后递归执行
                                                      // 对应分支，分支里的导航指令优先于外层
```

## 剧情段落（passage）

所有剧情、事件正文的统一单元，注册进 `G.data.story`：

```js
G.data.story.register({
  id: "qin_s1_2",
  text: (s)=>`酒吧里烟味呛人，[npc:qin]老秦[/npc]把一杯浑浊的酒推过来，杯底沉着渣滓。`,
  // text 可为字符串或接收 state 的函数，函数用于性别/状态分支文案
  choices: [
    { label:"接过酒一口喝干", cond:{...}, fx:{ stat:{alcohol:+15}, aff:{qin:+3}, goto:"qin_s1_2a" } },
    { label:"推回去", fx:{ goto:"qin_s1_2b" } }
  ]
});
```

无 choices 或选择后无 goto 时返回地点主界面。

## 事件（event）

```js
G.data.events.register({
  id: "res_horde_1",
  type: "random" | "story" | "scheduled",
  cond: {...},              // random 型必须含 chance；scheduled 型用 weekday+timeRange
  priority: 5,              // 同时命中取高，story > scheduled > random
  once: false, cooldown: 2880,   // 分钟
  passage: "res_horde_1_p1"
});
```

触发时机：进入地点、地点内行动结算、时间跨过整点、睡眠结算。story 型事件是 NPC 阶段剧情的入口，`cond` 中必须用 stage + storyFlags 锁序。

## 文字标签（tags.js 解析，唯一允许的富文本方式）

正文内联标记 `[类型:参数]文本[/类型]`，参数可省：

| 标签 | 用途 | 表现 |
|---|---|---|
| `[npc:id]名字[/npc]` | NPC 名 | 该 NPC 专色 |
| `[item]名词[/item]` | 道具/物资名词 | 金 #d4a941 |
| `[place]名词[/place]` | 地点名词 | 青 #56a8b0 |
| `[blood]名词[/blood]` | 血腥、伤口类名词 | 红 #c0392b |
| `[med]名词[/med]` | 药物、毒品类名词 | 紫 #9b59b6 |
| `[zed]名词[/zed]` | 丧尸类名词 | 暗红 #8e2f22 |
| `[lust]名词[/lust]` | 性相关名词 | 粉 #d46a9c |
| `[horror]名词[/horror]` | 恐怖高潮点 | 红 + 颤抖动效 |
| `[flash]名词[/flash]` | 致命警示 | 闪烁动效 |

硬性规则：标签只包名词或名词短语；`horror`/`flash` 全游戏仅这两个动效标签，**每个 passage 最多出现 1 次动效标签**，tags.js 解析时超出的动效标签自动降级为纯色，从引擎层杜绝滥用。

## 战斗（combat.js）

```js
G.data.enemies = { zombie_shambler: { name:"跛行者", hp:30, dmg:[5,12], speed:2,
                   infect:0.15, loot:{...}, descPool:[...] }, ... };
```

- 玩家行动：攻击（武器伤害，耐久 -1）/ 重击（1.6 倍，耗精力 10，命中率降）/ 防御（减伤 60%）/ 用道具 / 逃跑（speed 与 energy 判定）。
- 徒手伤害 [2,5]。被咬类攻击按 infect 概率增加感染度 10–25。战斗文本从 descPool 随机抽取拼接。
- 敌人编组：`G.data.encounters = { zombie_pair:[敌id,敌id], ... }`。

## 道具与交易

```js
G.data.items = { bandage: { name:"绷带", type:"med", desc:"...",
                 fx:{stat:{hp:+15}}, price:4, weight:1 }, ... };
// type: weapon | med | food | drink | material | key | misc | clothing
// weapon 额外: dmg:[min,max], durMax, hitPool:[...命中短语]
// clothing 额外（M14）: slot:'top'|'bottom'|'shoes', warmth, armor, decency, durMax
//   —— 穿在 player.outfit[slot]={id,dur}；耐久跌破半值即「撕破」属性减半、归零报废（state.clothingEff）。
//   引擎接口：equip/unequip/repairClothing、outfitWarmth/outfitArmor/outfitDecency、isDressed、damageClothing。
//   cond DSL 扩展 decency:{比较对象}（读全身体面合计）。
G.data.trade = { zhao_main: { buy:[...id], sellRate:0.5,
                 restock:"weekday==4", tiers:{ 0:[...], 40:[...] } } };  // 好感解锁货架
```

背包无格数上限，有总重上限 30（可被技能/道具扩容），超重无法快跑逃跑。

## 睡眠与恢复

安全屋睡觉按小时恢复精力/少量 hp，结算饥渴消耗，跨日触发 scheduled 事件与毒瘾/感染日结算。非安全屋过夜有专属风险事件池。
