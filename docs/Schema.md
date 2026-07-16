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

- 存档：localStorage 键 `lgys_save_{槽位}`，3 个槽位 + 自动存档槽；导出/导入为 Base64 JSON 字符串。

## GameState（G.state）

```js
{
  meta: { version: 1, saveTime: 0 },
  player: {
    name: "", gender: "m"|"f",
    day: 90, minute: 480,            // 当天 00:00 起的分钟数
    location: "home",
    stats: { hp:100, hunger:70, thirst:70, energy:80,
             sanity:80, alcohol:0, addiction:0, infection:0 },   // 全部 0–100
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
  world: { flags:{}, cooldowns:{} },  // cooldowns: {eventId: 到期绝对分钟}
  calendar: {
    appointments: [ {day, minute, label, eventId} ],   // 剧情登记的约定
    milestones:   [ {day, label} ]                     // 重要日子回顾
  },
  scavenge: {}    // {locationId: 已搜刮次数}，用于掉落递减
}
```

- 状态数值全部钳制在 0–100。绝对时间 = day*1440 + minute，跨日由 time.js 统一处理。
- **阈值效果（M1 实现，M3 配数值）**：hp=0 死亡（读档）；hunger/thirst 低于 20 开始扣 hp；energy<15 行动耗时 +50%；sanity<20 触发幻觉事件池；alcohol>60 文本进入醉酒变体、行动判定惩罚；addiction>50 每日定时发作事件；infection>80 进入濒死线（限时事件，可被林晚剧情救治）。

## 条件 DSL（cond）

事件、选项、段落通用。对象内多条件为 AND，`anyOf` 数组内为 OR。

```js
{ loc:"bar", timeRange:[1200,1560],        // 分钟，支持跨午夜
  weekday:2, dayMin:95, chance:0.3,
  stat:{ sanity:{lt:20}, alcohol:{gte:60} },
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
// type: weapon | med | food | drink | material | key | misc
// weapon 额外: dmg:[min,max], durMax, hitPool:[...命中短语]
G.data.trade = { zhao_main: { buy:[...id], sellRate:0.5,
                 restock:"weekday==4", tiers:{ 0:[...], 40:[...] } } };  // 好感解锁货架
```

背包无格数上限，有总重上限 30（可被技能/道具扩容），超重无法快跑逃跑。

## 睡眠与恢复

安全屋睡觉按小时恢复精力/少量 hp，结算饥渴消耗，跨日触发 scheduled 事件与毒瘾/感染日结算。非安全屋过夜有专属风险事件池。
