# 《临港余生》开发总指引

丧尸末日文字冒险，手机浏览器游玩，无结局，参考《Degrees of Lewdity》的大地图 + 地点 + NPC 好感 + 事件循环结构。含成人内容（色情与血腥暴力），全部角色为成年人。

## 新窗口开工方法（给下一个 Claude）

1. 读本文件（重点：进度表 + 交接备注），再读你负责模块的任务书 `docs/任务书/M{n}-*.md`，任务书里列了还需要读哪些文档。
2. 不读与本模块无关的剧情文件正文，控制上下文。
3. 完成后：勾选下方进度、在交接备注追加一条、git commit。
4. 除任务书明确允许外，不改其他模块已交付的文件；接口缺口按 docs/Schema.md 首段的扩展规则处理。

## 文档索引

- [docs/世界观.md](docs/世界观.md) — 背景、时间日历规则、15 地点、暗线
- [docs/NPC设定.md](docs/NPC设定.md) — 10 名 NPC 人设、剧情大纲、关系网（剧情唯一事实源）
- [docs/Schema.md](docs/Schema.md) — 技术约定、状态结构、条件/效果 DSL、passage/事件格式、文字标签、战斗、交易
- [docs/文风与内容规范.md](docs/文风与内容规范.md) — 文风硬规则、自洽规则、成人内容尺度、标签用法

## 进度

| 模块 | 内容 | 模型 | 状态 |
|---|---|---|---|
| M0 | 全套设计文档 | fable | ✅ 完成 |
| M1 | 引擎核心（state/time/events/combat/save） | opus | ✅ 完成 |
| M2 | 移动端 UI + 文字标签系统 | sonnet | ✅ 完成 |
| M3 | 地图、道具、敌人、交易数据 | sonnet | ✅ 完成 |
| M4 | NPC 框架 + 好感度系统 | opus | ✅ 完成 |
| M5 | 主要 NPC 剧情·前中期 + 开场 | fable | ✅ 完成 |
| M6 | 主要 NPC 剧情·亲密羁绊（成人内容） | fable | ✅ 完成 |
| M7 | 次要 NPC ×4 全剧情 | fable | ✅ 完成 |
| M8 | 边缘 NPC + 世界事件池 | fable | ✅ 完成 |
| M9 | 整合、平衡、打包、部署 Pages | opus | ⬜ 未开始 |

执行顺序：M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9。
M2 与 M3 可并行，M7 与 M8 可并行（不同文件，无冲突）。
每个模块开一个新窗口，用 `/model` 切到进度表标注的模型再开工。

## 交接备注（每模块完成后追加，最新在上）

### M8（2026-07-16, fable）
产出：`js/data/story/minor.js`（边缘三人 11 事件）+ `js/data/story/worldevents.js`（69 事件）。index.html 两文件均已引入（M0 目录清单全部落齐）。**全游戏事件总数 207，其中 M8 新增 80**。Node 冒烟 935 项 8 连跑全绿（全量引用扫描 268 处 goto、边缘三人全流程、15 地点逐一蹲池 ≥3 条、四类状态事件控制台调数值逐一触发、尸潮夜预警→日历→整夜遭遇→黎明退潮全链、雨天开雨→公园加成→定点雨停、屠夫帮变体按主线 flag 切换）。

**边缘 NPC（minor.js）**：chen `s0_1→confess(每日一次,理智+12)→s0_2`；cai `s0_1(食物换搭话)→cai_talk(疯话池+cai_barter 入口)→s0_2(守船)`；fang `s0_1→s0_2(升1,肉干换8子弹)+fang_trade(可重复)→s1_1(升2,北桥真相)→fang_s2_3(可选成人,可拒绝)`。fang 真相与 qin_s2_4 为同一晚北桥两侧视角（已登记 NPC设定.md）。**教训一则：choice 的 fx 同时写 shop+goto 时引擎只走 shop、goto 会被丢弃**（routeNav 顺序 combat>shop>goto），once 事件里这么写会卡死后续——本模块已修掉一处，M9 整合若见此写法务必排查。

**状态触发池（worldevents.js，任意地点）**：幻觉 halluc_1~5（sanity<20，pri 3，chance .12~.30 / cd 360~720，第 5 条为低概率正向记忆闪回）；醉酒 drunk_1~3（alcohol>60，pri 3，.20~.30 / 300~480）；毒瘾发作日 addict_attack_1（addiction>50，**scheduled 每日一次**，pri 7，三分支：镇静剂/止痛药=续期+瘾微涨，硬扛=瘾-4 理智精力大损）；感染濒死 infect_crit_1（infection>80，pri 9，cd 360 反复催命+每次硬撑 hp-5 形成限时压力；医院内分支：林晚好感≥40 免费救治 / 10 子弹急救，各-35 感染；军用急救包自救 -20）。注意 infect_crit 与 M6 lin_cure_1 同 pri 9，lin.js 注册在先，羁绊后在医院自动走专属剧情，两者不冲突。

**全局周期链**：
- 尸潮夜：horde_warn（晚间 tick，chance .08 / cd 8640，pri 5；文案按已识 NPC 走周响广播/灰猫纸条/敲锣三变体）→ 写 `world.hordeAlert` + **日历 appointment(eventId) 次日 20:30 强制触发 horde_night_start**（when:[] 不入常规池；开场写 `world.hordeNight` 并自动登记次日 05:00 horde_night_end 强制收尾）→ 夜间室外 11 地点 horde_enc_1(.5/120)/horde_enc_2(.35/180) pri 6 高频遭遇=「全图危险度上调」的实现载体，室内 home/bar/church 走 horde_safe_1 听潮 → 黎明清旗。链路全程数据层实现，无引擎改动。
- 雨天：rain_start（上午 tick，.12 / cd 2880，pri 4）写 `world.rainDay` + 当日 20:00 rain_end（eventId 强制）；加成=rain_harvest_1（park，.5/240，pri 2，雨水+2 野菜+1）+ rain_amb_1（5 地点氛围，.2/240，pri 1）。
- 屠夫帮世界线 butcher_world_1~4（pri 1，.10~.12 / cd 1440~2880）：收账队/码头运货/悬赏告示/内讧火并，text 函数读 `npc.qin.s4_1 / scoutDone / sawCargo`、`npc.mao.lostGoods`、qin/mao stage 出变体，**不写任何剧情 flag**。

**各地点 M8 新增 chance/cooldown 配置表（M9 平衡用；M3 打底数值见 locations.js 尾部）**：
| 地点 | 掠影 sv | 二波遭遇/氛围 | 罕见奇遇 rare（均 cd 4320） |
|---|---|---|---|
| home | .10/720 | 喂猫 .10/720 | .05 罐头×2+子弹6 |
| residential | .12/600 | 夜奔袭 .22/300 | .05 罐头2+水2+绷带（有留一半良心分支） |
| market | .10/720(昼) | 爬行者 .10/480 | .05 整箱货：昧下 or 还赵铁 aff+6 |
| hospital | .12/600 | 夜床底 .18/360 | .04 夹墙药（抗生素+镇静剂+绷带2） |
| police | .10/720 | 夜羁押区 .20/360 | .05 保险柜（子弹12+猎刀） |
| bar | .12/600(晚) | 停电 .10/720 | .05 陈酿（需识苏曼） |
| campus | .12/600 | 犬群 .15/360 | .05 电池+茶2+读书理智+6 |
| metro | .12/720 | 浮肿者 .18/360 | .04 军囊（子弹15+军急救包） |
| park | .12/720(昼) | 野菜道 .15/480(昼) | .05 救生箱 |
| gas | .10/720 | 偷油贼 .12/600 | .05 零件2+汽油 |
| mall | .10/720 | 巡逻队 .15/480 | .05 户外柜（绳+手电+肉干2） |
| church | .10/720 | 唱诗 .12/600(昼) | .05 救济箱 |
| dock | .10/720 | 夜合围 .20/360 | .04 走私夹层（酒+巧克力2+子弹6） |
| checkpoint | .10/720 | 犬群恋食 .15/360 | .04 补给桶（军急救+肉干+子弹10） |
| sewer | .12/720 | 水闸浮肿 .15/360 | .05 无主藏点（需手电） |

**已知限制 / 留给 M9**：
- 尸潮夜的「危险度上调」只作用于事件层（高频遭遇池），不改 locations.js 的 danger 字段与搜刮表；雨天加成同理只在 park 事件层。若 M9 想要系统级修正，需要引擎读 world.hordeNight/rainDay。
- horde_night_start/end、rain_end 依赖 appointment 的 eventId 强制触发（tick/enter 才结算）：玩家整夜睡觉时会在睡眠 advance 的整点 tick 里正常结算，无遗漏；但若 M9 改动 dueAppointments 逻辑，这三处链路要回归。
- infect_crit 的「免费救治」分支只查 `aff.lin≥40`，未查林晚作息（急诊设定）；lin 02:00–06:00 睡眠时段照样能救，视为合理特例。
- rare_ 事件单次收益较肥（军囊/保险柜/补给桶），cd 4320 + chance ≤.05 控频；M9 若嫌通胀可统一砍 chance 一半。

### M7（2026-07-16, fable）
产出：`js/data/story/secondary.js`（苏曼 9 事件 / 阿豆 7 / 周响 9 / 赵铁 8，各线警惕→羁绊全阶段 + 亲密成人一段·性别双分支·可拒绝）。index.html 已取消 secondary.js 注释（minor/worldevents 仍留给 M8）。Node 冒烟 765 项 5 连跑全绿（全量引用扫描 238 处 goto、四线全流程驱动到羁绊、供药/劝戒×帮扛/放任四象限、保护费三立场、成人段落双性别渲染、机制逐项实测）。

**四人 flag 清单（均存 `npc.{id}.*`，升阶事件 cond 锁 aff 20/40/60/80）**：
- su：`s0_1 → s0_2+fetch → s0_3(升1,需酒×1/零件×1/瓶×1 在包) → s1_1(升2) → s2_1(寄存+打听) → s2_2(升3) → s3_1(成人,可拒) → s4_1(升4 日出)`。寄存机制=`player.flags.carryBonus:10`（M1 carryCap 已读该位），打听=`su_gossip`。
- dou：`s0_1 → s0_2(升1;gaveDrug 或 urgedQuit) → s1_1(升2,发 skill:modding) → s2_1(升3;clean 或 relapse) → s3_1(成人,可拒) → s4_1(升4,发 dou_custombat)`。**dou_custombat 武器在本文件头注册进 G.data.items**（9-16 伤害/耐久 60/非卖品），属数据层新增扩展。
- zhou：`s0_1 → s0_2+fetch → s0_3(@checkpoint,发 zhou_antenna+zhou_battery) → s0_4(升1,收回两件) → s1_1(升2,首条留言可写 msgPending) → s2_1(升3,方舟三信号) → s3_1(成人,可拒) → s4_1(升4,周三晚)`。留言循环旗 `msgPending`（待播）/`msgRead`（至少播出过一次）。
- zhao：`s0_1 → s0_2+escortJob(登记周五日历) → s0_3(升1,仅周五触发,错过顺延) → s1_1(升2;stoodUp/paidOff/stayedOut) → s2_1(里间货架叙事) → s2_2(升3,赵小满伏笔) → s3_1(成人,可拒) → s4_1(升4,账本)`。高级货架机制沿用 M3 tiers（好感≥40 自动解锁），s2_1 只做叙事开张，无新 flag 门。

**新增 scheduled / 可重复事件 id（M9 平衡要看）**：
- `zhou_radio_1`（scheduled，周三 19:00–23:00 @campus，priority 4；有 msgPending 时读出留言并清位，选项可再投递；理智 +5/期）。
- 可重复 story（priority 2，冷却 1440）：`su_gossip`（免费闲话池 6 条）、`dou_tune`（3 子弹修满装备耐久——**目前全游戏唯一武器维修口**，枪械也适用（耐久=弹匣的取舍见 M3 备注），M9 平衡注意定价；gaveDrug 且未 clean 时附带毒品接触选项 addiction+6）。

**与既有系统的联动点**：
- addiction：dou_s0_2 尝一口 +8、dou_tune 来一口 +6，均玩家自选；劝戒/帮扛路线会关掉接触口（clean 后选项消失）。阈值>50 的发作事件仍是 M1/M9 的事。
- 关系网照登记引用：阿豆提林晚「再不肯开药」（s0_1/s0_2），周响与方哨的方舟矛盾双口径保留（zhou_s2_1_p2b），苏曼线提老秦守店旧情（su_s1_1）。su_gossip/苏曼台词提及老蔡、陈神父、方哨——均为氛围级引用，不锁 M8 剧情。
- 同 NPC 成人事件与升 4 事件同 priority 6：拒绝成人后其进入冷却，当日再搭话即可触发升 4，不死锁（引擎同优先级按注册序取先）。

**已知限制 / 留给后续**：
- skill:modding 与 melee/bandage 一样，引擎战斗结算暂不读（M9 落数值；建议 modding 提武器耐久损耗减半或保养费减免）。
- zhou_radio_1 要求玩家人在 campus 才触发；「全城收音机收听」只存在于文案层，M8 世界事件若做收音机道具可扩展异地收听。
- 玩家留言正文不存档（只有 msgPending 布尔位），广播读出时的文案是通用的「你那张纸条」，不复述内容。
- zhao_s0_3 的周五日历备忘只登记一次（bookWeekly guard），错过后无新备忘但事件周五恒可触发。

### M6（2026-07-16, fable）
产出：在 M5 的三个文件**尾部各追加一个独立 IIFE**（qin.js +8 事件 / lin.js +8 / mao.js +6），无新文件，index.html 未动。三线亲密+羁绊全部落地：每线大型事件（胜/败双分支）、亲密首夜（性别双分支、可拒绝）、羁绊升阶、周期事件、羁绊成人变体（可重复），qin 复仇循环、lin 感染救治、mao 真名揭露（发放 mao_presscard）。Node 冒烟 563 项 5 连跑全绿（M6 事件/段落/goto/战斗编组/道具/flag 路径全量引用扫描 166 处 goto、三线全流程驱动到羁绊、大型事件胜/败分支、战斗胜与逃跑续接、成人段落双性别渲染差异、拒绝不落 flag 且冷却后可重试、周期事件按星期触发+同日去重+日历自动续登、感染救治两轮、越级升阶被拒）。

**三线终态 flag 清单（M7/M8 引用、M9 平衡要看，均存 `npc.{id}.*`）**：
- qin：`s3_1(伏击救援, 败分支旗 rescueLate) → s3_2(转折, 升3) → s3_3(首夜, 可选) → s3_4(卷宗对账) → s4_1(共守约定, 升4, 首次登记巡逻日历)`。终态 `stage:4, s4_1:true`；`s3_3` 可能为 false（首夜可拒绝、事件 stage 用 gte:3 保持开放）。叛变旧部定名**孟九**（已登记 NPC设定.md），复仇线只循环不收网。
- lin：`s3_1+labquest → s3_2+gotDocs(+partialDocs 败分支旗) → s3_3(转折, 升3) → s3_4(首夜, 可选) → s4_1(钥匙+义诊, 升4)`。终态 `stage:4, s4_1:true`；`curedOnce` 为救治里程碑去重旗。实验楼暗线只给到「检测日期早于封城、有人先来搜过」两块碎片。
- mao：`s3_1+escort → s3_2(被困夜, 升3, 败分支旗 lostGoods; 夜内可选首夜 s3_3) → s3_4(合伙人) → s4_1(真名沈疏, 升4, 发 mao_presscard, 首次登记情报网日历)`。终态 `stage:4, s4_1:true`。她的「买家」线经设局后中断/主动断货，暗线保持不揭晓。

**周期/循环事件 id（M9 平衡必看）**：
- scheduled：`qin_patrol_1`（周五 19:30–23:30 @bar，巡逻之夜）、`lin_clinic_1`（周日 09:00–17:00 @hospital，义诊日）、`mao_week_1`（周六 08:00–22:00 @sewer，免费高级情报）。均 priority 4（低于剧情节拍 5-9，高于 random）。
- 可重复 story：`lin_cure_1`（感染≥60 @hospital，priority 9，冷却 1 天，-50 感染——M9 若嫌白嫖可加代价）、`qin_hunt`（复仇扫点，冷却 3 天，+8 子弹）、`qin_s4_2 / lin_s4_2 / mao_s4_2`（羁绊成人变体，冷却 2 天，priority 2 与 mao_intel 同层）。

**新验证的写法模式（M7/M8 可直接抄）**：
- **周期事件进日历**：解锁节拍的收尾段落用 text 函数副作用调本文件的 `bookWeekly(guardFlag, 周几, 分钟, label)` 算出下一个目标星期几写首条无 eventId 备忘；此后每次周期事件的收尾 choice fx 写 `appointment:{inDays:7,...}` 续登（事件当天必为同一星期几，静态 +7 恒正确）。玩家错过一周则备忘断档，但 scheduled 事件本身照常触发，备忘会在下次参加后恢复。
- **成人事件一律可拒绝**：邀约段给退出选项 + 事件不 once、冷却 1440、「做完才写 flag」；线程推进门槛全部挂在**转折节拍**（s3_2/s3_3）而非性事件上，拒绝成人内容不锁主线。首夜事件的 stage 锁用 `{gte:3}`，防止先升羁绊把成人线锁死。
- **大型事件败分支**：不依赖战斗输赢（战败=全局死亡、逃跑与战胜共用 goto），用显式选择路线实现（搬救兵迟到 rescueLate / 弃货 lostGoods / 见好就收 partialDocs），败分支照常落 s 序号 flag 不掉线，仅好感/文案分化，后续段落用 getFlag 分支文案。
- **同段落按前置旗分叉收尾**：同 label 两个 choice 各带 `cond:{flag:{x:true/false}}`（false 匹配未设置），可按路线给不同好感/里程碑（qin_s3_1_p4、lin_cure_p2）。

**已知限制 / 留给后续**：
- 灰猫首夜（mao_s3_3）嵌在被困夜 once 事件内，当夜拒绝则该段错过不再回放；羁绊变体 mao_s4_2 的 gate 挂 s3_2，成人线不锁死，仅首夜文本错过。
- `mao_intel` 与 `mao_s4_2` 同 priority 2，同时可用时按注册序 intel 先弹一次（冷却后变体次日可达）——是接受的节奏，不是 bug。
- `lin_s4_1_p1` 的「戒指」、qin 线「孟九」的人物档案均只存在于文本层，M8 世界事件如需引用照 NPC设定.md 登记的信息即可。
- mao_week_1 情报池为 6 条静态硬货（含孟九押货、江心船影两条 M8 可接的钩子），M8 世界事件池上线后可替换为动态。

### M5（2026-07-16, fable）
产出：`js/data/story/intro.js`（开场 5 段）、`qin.js`（12 事件）、`lin.js`（11 事件 + 约定回访事件）、`mao.js`（10 事件 + 情报 hub）。index.html 已引入四个文件（**新增 intro.js，Schema 目录清单未列，属新增扩展**）。Node 环境 104 项冒烟 5 连跑全绿（开场→三线初遇推到信任满、goto/passage 引用完整性 116 处、升阶好感门槛、once/冷却防重复、拒绝委托不落死局、战斗续接、日历约定强制触发、存读档、灰猫越轨拒绝路线、性别双分支渲染），另有 jsdom 全页面 9 项（index.html 顺序加载→开局创建→开场→酒吧初遇渲染着色）。

**开场**：`intro_wake`（story/enter/once/priority 20，cond `intro.done:false`）在首次进 home 时触发，发放 worn_idcard + 铁管/罐头/瓶装水/绷带，结尾写 `flag intro.done` —— **三线初遇事件都以 `intro.done:true` 为前置**，M6-M8 的新初遇事件也建议照此锁。M2 的角色创建界面未动，开场段落组接在 newGameStart 之后。

**三线 flag 清单（M6 要接，均存 `npc.{id}.*`）**：
- qin：`s0_1 → s0_2+fetch → s0_3 → s0_4 → s0_5(升1) → s1_1 → s1_2 → s1_3(升2) → s2_1+scout → s2_2+scoutDone(+sawCargo 可选) → s2_3 → s2_4`。M6 从 `s2_4:true, stage:2` 接（大纲：屠夫帮伏击老秦→亲密）。`sawCargo` 是侦查支线可选旗（看到屠夫帮倒卖军用物资），M6+ 可引用可无视。技能 `skill:melee` 已发。
- lin：`s0_1 → s0_2+fetch → s0_3 → s0_4 → s0_5(升1) → s1_1 → s1_2 → s1_3(升2) → s2_1(+gaveSedative 或 coldTurkey 二选一) → s2_2 → s2_3`。M6 从 `s2_3:true, stage:2` 接（大纲：大学实验楼病毒资料委托→亲密）。戒断路线旗 `gaveSedative`/`coldTurkey` 供后续文案分支。技能 `skill:bandage` 已发。
- mao：`s0_1(+bought/sawThrough 分支旗) → s0_2(仅 bought，+ateLoss) → s0_3 → s0_4(升1，+intelShop) → s1_1 → s1_2 → s1_3(升2) → s2_1(写 world.sewerShortcut) → s2_2 → s2_3(越轨)`。M6 从 `s2_3:true, stage:2` 接（大纲：地铁隧道被困一夜→亲密）。**世界旗 `world.sewerShortcut` 由 mao_s2_1 落**（M3/M4 交接约定已兑现）。

**升阶门槛写法（M6-M8 沿用）**：升阶事件 cond 同时锁「上一段 flag + `aff:{id:{gte:阈值}}` + `stage:{id:n}`」，fx 写 `stage:{id:n+1}`；好感靠剧情节拍 + 日常搭话/送礼补足，三线剧情节拍好感合计约到阈值的 70-80%，留 20-30% 给日常互动，节奏实测 2-4 个游戏日一阶。

**新验证的写法模式（M6-M8 可直接抄）**：
- 委托类节拍：不 once + `cooldown:1440` + 「接受才写 flag」→ 拒绝后次日可再谈，不落死局；接受的 fx 里写 `appointment:{inDays,minute,label}` 登日历（无 eventId 就只是日历备忘，到期自动 done）。
- 约定回访：`lin_promise_1` 用 **`when:[]`**（空数组）注册 → 不进任何常规触发池，只能被 appointment 的 `eventId` 强制触发；passage 正文用 text 函数按 `s.player.location` 分支（在场=赴约文案，不在场=想起提醒）。
- 剧情内战斗：choice 写 `fx:{combat:'编组id', goto:'战后段落'}`；**注意 goto 段落在「战胜」和「逃跑」后都会进**（引擎 returnPassage 机制），战后文案要写成两者都通（本模块的 qin_s1_3_p3 等都按此处理）。战败走全局死亡，无需处理。
- 无作息 NPC（灰猫信任前）：全部节拍用 `when:['enter','action']` + `anyOf:[{loc:'sewer'},{loc:'dock'}]` 随机遭遇承载，间隔靠 `chance:0.6~0.7`；信任后 talk 入口自然接管。
- 可重复玩法事件（mao_intel 情报购买）：story 型 + `cooldown:1440` + **priority 2**（低于剧情节拍的 5-8，高于 random 的 0）→ 剧情优先截胡、每天最多弹一次、不永久压住日常搭话。
- **初遇 met 联动**：fx DSL 没有 met 字段，初遇段落的 p1 用 text 函数副作用 `s.npcs.{id}.met=true`（幂等；真实 UI 渲染正文必执行。纯引擎驱动且不渲染正文的场景不会置位——目前无此场景）。

**对大纲的微调（已同步 NPC设定.md）**：qin 警惕段的旧案卷宗登记为「叛变旧部一案的案卷」（连接警惕/熟识两段，内容不当场揭示）；mao 信任段补登记越轨事件 `mao_s2_3`（不收子弹收「利息」，她主导亦可被拒绝，点到即止，完整成人内容仍留 M6 亲密段）。

**已知限制 / 留给后续**：
- `skill:melee`/`skill:bandage` 已按大纲发放，但 M1 引擎的战斗/道具结算目前不读这两个技能位（只有 packmule 有效果），战斗被动与包扎增益的数值落地留给 M9 平衡（建议：melee 提近战 dmg 或命中，bandage 提绷带类 fx）。
- mao_intel 的情报正文是 6 条静态池随机（内容对应 M3 真实数据：周五进货/换岗间隔/地铁军械等），M8 世界事件池上线后可替换为动态情报。
- 灰猫 s2_3 越轨的「下次加价」、qin 复仇线、lin 实验楼委托均为 M6 钩子，正文已埋口但未注册任何 M6 事件 id。
- 开场发放的铁管让 M3 商店的低端武器略贬值，若 M9 平衡嫌开局太富可改成菜刀或删去。

### M4（2026-07-16, opus）
产出：`js/data/npcs.js`（10 名 NPC 静态数据 + NPC 系统层）。已在 index.html 取消注释引入 npcs.js、并按 M2 约定删除 `_demo.js` 的 `<script>` 引入（`_demo.js` 文件本身保留）；在 `render.js` 底部导航新增一个「关系」入口（`{name:'npc'}`，指向好感面板）。Node 环境 47 项 + jsdom 全页面 18 项冒烟全绿（作息在场逐一核对、日常搭话分层与每日一次好感、送礼喜好/厌恶/普通三档且每日一次、好感达标不自动升阶+越级被拒、story 锁序不跳不重复、死亡入口关闭、好感 0→100 走线、存读档、关系面板 DOM 联动与送礼）。

**好感度模型**：五阶段存 `npcs[id].stage`（0=警惕/1=熟识/2=信任/3=亲密/4=羁绊），阈值 `G.STAGE_AFF=[0,20,40,60,80]`。好感到阈值**不自动升阶**——升阶必须由剧情节拍的 `fx.stage:{id:n}` 完成（引擎只允许 +1，保证阶段剧情必看）；好感已达阈值但阶段未升时，`G.engine.affinityReadyToAdvance(id)` 为真，搭话入口显示提示态（`G.engine.talkHint(id)`）。

**新增 G.engine 接口**（均纯新增）：`npcsAt(locId)`/`npcAt(locId)`（在场 NPC 数组，render.js 已在用）、`npcPresent(id,locId)`、`stageName(id)`、`affNeededForNext(id)`、`affinityReadyToAdvance(id)`、`talkHint(id)`、`talkTo(id)`（搭话主入口）、`giftItem(id,itemId)`、`npcGiftLikes(id)`。新增 UI：`G.ui.showRelations()` 与 `G.ui.panels.open('npc')`（npcs.js 接管了 `G.ui.panels.open`，未知名字仍委派回原实现）。

**作息表（已逐一对照 NPC设定.md，分钟制、跨午夜按 time.js 规则）**：qin 警局 08–17 / 酒吧 19–次日02；lin 医院 06–次日02（02–06 睡眠不可打扰）；su 酒吧 10–次日02；dou 加油站全天；zhou 大学 08–18 + 周三（day%7==2）19–23 广播；zhao 超市 08–20；chen 教堂 06–22；cai 码头全天；fang 检查站全天；**mao 特殊**：无固定作息，仅 `stageMin:2`（信任后）在下水道据点在场，此前靠 M5 随机遭遇事件出场。陈神父/老蔡/方哨 NPC设定未给专色，沿用 `_demo.js` 既有取色（#8a8a7c/#6a8a8a/#5c8a6a）。

**给 M5–M8 的 story 事件注册范例（重要——阶段剧情入口走本模块调度）**：NPC 阶段剧情用 `type:'story'` 事件承载，新增两个约定字段——`npc:'qin'`（归属，talkTo 按此过滤，避免同地点串台）与 `when:['talk']`（只在搭话时触发，不进 enter/action/tick 自动池，避免进地点即弹）。用 `stage`+`storyFlags`（`flag:{'npc.qin.s1_1':false}`）锁序、`once:true` 防重复。搭话时 talkTo 取「归属本 NPC、when 含 talk、cond 通过、未 once/未冷却」中优先级最高者触发；无可用 story 才落回日常搭话。范例见 `js/data/npcs.js` 顶部注释块（`qin_s1_1`/`qin_s1_2` 两幕锁序写法）。阶段推进请在某个节拍的 choice `fx` 里写 `stage:{qin:1}`（只能逐级 +1）。**灰猫信任阶段剧情负责 `setFlag('world.sewerShortcut',true)`**（M3 交接已注明捷径解锁 flag）。

**送礼喜好清单（likes 各 2 / dislikes 各 1，均为 items.js 真实 id；+5/-5/普通+1）**：
qin 喜 liquor·driedmeat / 厌 spoiledcan；lin 喜 sedative·vitaminpills / 厌 liquor；mao 喜 chocolatebar·liquor / 厌 spoiledcan；su 喜 liquor·chocolatebar / 厌 rainwater；dou 喜 sparepart·toolkit / 厌 wildveggie；zhou 喜 battery·chocolatebar / 厌 liquor；zhao 喜 driedmeat·liquor / 厌 rainwater；chen 喜 herbaltea·vitaminpills / 厌 liquor；cai 喜 cannedfood·riceball / 厌 scrapmetal；fang 喜 driedmeat·painkiller / 厌 liquor。

**已知限制 / 留给后续模块**：
- 日常搭话每 NPC 每阶段 3 条短文本、送礼反馈为通用三档模板，均为占位性系统文本，M5–M8 若嫌单薄可在各自剧情文件里注册更丰富的 story 覆盖（搭话会优先走 story）。
- `npc_daily_talk` 是一个复用的动态段落，正文取自易失的 `state._talkLine`（不入档）；玩家若在搭话段落中途存档再读回，正文会退化为「……」，无副作用。
- 关系面板走 `G.ui.openOverlay`（未接入 panels.js 的 `activeOverlay` 跟踪），打开时会先移除页面上已有的 `.overlay` 避免堆叠；这是刻意为之，M9 若统一浮层管理可把本面板并入 panels.js。
- 送礼入口目前只在关系面板里、且仅对「当前在场」的已认识 NPC 显示；地点「在场」chip 点击走搭话（talkTo），未单独给送礼按钮。

### M2（2026-07-16, sonnet）
产出：`css/style.css`（深色主题/竖屏布局/9 种标签样式与 horror·flash 动效）、`js/ui/render.js`（应用外壳、地点/passage/战斗/开局/死亡渲染，实现全部 7 个 G.ui 接口）、`js/ui/panels.js`（日历/背包/身体/地图/系统面板 + 商店浮层）、`js/ui/tags.js`（标签解析）、`js/ui/_demo.js`（验收假数据）。已用 jsdom 跑通冒烟测试（开局创建→地点→5 个面板开关→passage 全 9 种标签且动效降级正确→战斗胜/负/结束导航→M3 数据行动搜刮与移动→商店买卖→背包装备→存/读档→导出/导入→死亡界面），连续 8 次运行无 flaky。

**与 M3 并行开发的对接**：开工时 M3 已经把真实 `js/data/{items,enemies,locations,trade}.js` 落到仓库并取消了 index.html 的注释（M2/M3 同窗口并行，交接备注写入有先后但改动是同时发生的）。本模块最初按自己设想的 `G.data.locations` 形状（`desc`/`adj`/`actions[].fx`）写了一版 UI 和配套 `_demo.js`，发现与 M3 实际交付的形状（见 M3 交接备注：`descDay/descNight`+`adjacent`+`actions[].type:'scavenge'`+`scavengeTable`）不一致后，**已重写 render.js/panels.js 全部对接 M3 真实接口**：地点描述用 `G.engine.locationDesc(locId)`，移动用 `G.engine.locationNeighbors(locId)` + `G.engine.travelTo(destId)`，搜刮类行动用 `G.engine.scavenge(locId, actionId)`，背包装备/使用用 `G.engine.equipWeapon/unequipWeapon/useItem`，商店买卖/以物易物用 `G.engine.shopBuyableItems/shopBuy/shopSell/tradeOffersToday/barter`。`_demo.js` 同步精简为只占位 `G.data.npcs` + 两条标签演示 passage，标签演示的战斗/商店选项直接复用 M3 真实 id（`zombie_pair`/`zhao_main`）。

**新增并登记的 G.ui 接口**（除 Schema/M1 已列的 7 个必需接口外）：
- `G.ui.openOverlay(opts)` —— 通用浮层外壳（`{title, center?, build(bodyEl,closeFn), onClose?}`），面板/商店/道具详情/道具选择器都基于它，返回 `{root,body,close,refresh()}`。
- `G.ui.toast(msg)` —— 顶部短暂提示；战斗终局（引擎已同步切走战斗界面，那一回合文本进不了战斗日志）、购买/使用/搜刮结果等用它补显示。用 `G.ui.tags.strip()` 去标签后显示纯文本。
- `G.ui._h(tag,attrs,kids)` / `G.ui._clear(el)` —— render.js 与 panels.js 共用的极简 DOM 构造/清空工具，内部约定，非稳定对外接口。
- `G.ui.panels.open(name)`（name ∈ map/inventory/body/calendar/system）、`G.ui.panels.openShop(id)` —— `G.ui.showShop` 的真正实现。
- `G.ui.tags.parse/npcColor/strip/escapeHtml` —— 见 tags.js 头部注释。

**G.data.npcs 占位契约（M4 前）**：tags.js 的 NPC 专色与地点「在场」NPC 列表都读 `G.data.npcs[id] = {name, color, brief}`；未提供时 tags.js 会按 id 哈希兜底取色（不会报错，只是颜色不精确）。地点 NPC 在场判定优先用 `G.engine.npcsAt(locId)`（M4 作息表函数，尚不存在），其次退化读 `G.data.locations[id].npcs` 静态数组（M3 未提供该字段，目前恒为空）——**M4 落地前，地点界面的「在场」区块不会显示任何 NPC，这是预期行为，不是 bug**。NPC 对话入口同理：优先 `G.engine.talkTo(id)`（M4/M5 提供），否则退化读 `npcDef.talkPassage`（仅 `_demo.js` 占位数据设了这个字段，供本模块自测用）。

**已知限制 / 留给后续模块**：
- 地图面板节点是环形算法自动布局（按 `G.data.locations` 的 key 顺序摆一圈），不反映真实地理关系，仅供点击可用性验证；如需更直观的地图，需要数据层加坐标字段。
- 商店购买/出售目前每次固定数量 1，无数量选择器。
- `G.engine.equipWeapon(id)` 装备的是背包里第一个同 id 条目（M3 交接备注已注明此限制）；背包面板里若同一武器有多把，点击任意一把装备的都是数组里第一把，不一定是被点的那把。
- 「丢弃道具」两边都没提供专门接口，UI 直接调 `G.engine.removeItem`，无二次确认弹窗。
- 日历面板需要把「年月日」换算回游戏内绝对天数，引擎未导出反向换算函数，`panels.js` 里按文档复刻了同一个锚点常量（`Date.UTC(2025,6,14)`）；M9 如调整锚点务必同步这里。
- `js/ui/_demo.js` 现在只占位 NPC 数据 + 两条标签/战斗/商店演示 passage（`demo_tags`/`demo_talk`），系统面板底部有「标签演示/战斗演示」按钮触发；**M4 交付 `npcs.js` 并在 index.html 取消注释后，请删掉 `_demo.js` 的 `<script>` 引入**（不用删文件本身，供以后回归自测）。

### M3（2026-07-16, sonnet）
产出：`js/data/items.js`（60 道具）、`js/data/enemies.js`（8 敌人 + 10 编组）、`js/data/locations.js`（15 地点 + 移动/搜刮逻辑 + 36 条通用氛围/收获/遇敌 random 事件）、`js/data/trade.js`（3 商店：zhao_main/fang_ammo/cai_barter）。已在 index.html 取消注释引入，Node 环境跑通全部验收（15 地点走通、各地点搜刮出货、metro/sewer 无手电被拒、商店买卖与好感分层货架解锁、以物易物、三场战斗胜/逃/伤）。

**发现 M2 已在并行推进**：index.html 已有 render.js/panels.js/tags.js/_demo.js 的真实引入（非本次改动）。`js/ui/_demo.js` 头部注释明确要求"真实数据接入后必须移除其 `<script>` 引入"，本次已按该约定移除（未改 _demo.js 文件本身，M2 需要回归自测可临时手动加回该行）。**注意**：_demo.js 里的地点/商店数据形状（`desc` 单字符串、`adj` 数组、`actions[].fx` 内联、`tiers` 无 npc 字段）与本模块交付的真实形状不同，M2 的渲染代码若已按 demo 形状写，需要改接下面登记的真实形状。

**Schema 未定义、本模块新设计的数据形状**（供 M2/M9 对接）：
- `G.data.locations[id] = { name, descDay, descNight, actions:[{id,label,type,time,energy,requiresItem?}], scavengeTable:[{tier,weight,items:[{id,chance|min&max}]}], adjacent:{locId:minutes}, shortcuts?:{locId:minutes}（仅 sewer 登记）, hours:[start,end]|null, danger:0-3, requiresItem? }`。
- `G.data.trade[id] = { npc, location, sellRate, restock:"weekday==N", tiers:{affinity阈值:[itemId...]} }`；`cai_barter` 例外用 `{type:'barter', offers:[{give:{id,count}, want:{id,count}}]}`。

**新增 G.engine 接口**（M1 未提供，本模块补的"配套小逻辑"，均为纯新增不改旧接口）：
- `useItem(id)` / `equipWeapon(id)` / `unequipWeapon()` —— items.js。武器装备按背包里第一个同 id 条目取用（多把同型武器耐久独立，不按最优耐久挑选，够用但非最优）。
- `locationNeighbors(locId)` / `isLocationOpen(locId)` / `travelTo(destId)` / `scavenge(locId, actionId)` —— locations.js。`travelTo` 内部已乘 `timeCostMod()`；`scavenge` 内部已调用 `checkEvents('action')`，UI 不用重复调。
- `shopBuyableItems/shopBuy/shopSell/isRestockDay/tradeOffersToday/barter` —— trade.js。

**已知设计取舍/引擎限制（留给 M9）**：
- 枪械（手枪/左轮/猎枪）沿用武器耐久机制表示弹匣余量：`durMax`=弹匣容量，每次攻击耐久 -1，打光即脱手；**没有"用子弹补耐久"的换弹机制**，`G.state.player.bullets` 目前只是交易硬通货，不参与战斗内消耗。M9 如需要真换弹手感，需加一个消费 bullets 恢复 weapon.durability 的接口。
- `combat.js` 的 `playerAttack` 命中文案会把目标名硬包一层 `[zed]` 标签（不分丧尸/人类），本模块的敌方 descPool 对人类敌人（屠夫帮杂兵/打手）已避免自套 `[zed]`，但引擎侧对玩家命中敌人的文案仍会误标，非数据层可修。
- 下水道捷径：`shortcuts` 只登记在 `sewer` 一端（`world.sewerShortcut` flag 解锁后双向生效，`locationNeighbors` 会反向扫描补全对端），M4 的灰猫线信任阶段剧情负责 `setFlag('world.sewerShortcut', true)`。

**给 M5–M8 的预留剧情道具 id 清单**（`items.js` 内 `type:'key'`，均无 fx/不上架，用时直接 `fx.item:{id:1}` 发放）：
`qin_dossier`（旧案卷宗/police）、`lin_medbox`（药品箱/hospital）、`zhou_antenna`+`zhou_battery`（天线零件+广播电池/campus）、`su_ledger`（酒吧账本/bar）、`dou_blueprint`（改装图纸/gas）、`zhao_ledger`（货运账本/market）、`fang_dogtag`（军牌/checkpoint）、`mao_presscard`（记者证/sewer·dock）、`chen_burialrecord`（安葬名册/church）、`cai_oldphoto`（旧照片/dock）、`worn_idcard`（主角前情伏笔，无绑定 NPC）。

**给 M5–M8 的可用敌人编组清单**（`G.data.encounters`，难度梯度低→高）：`zombie_pair`/`dog_pack`（弱）、`zombie_trio`/`runner_pack`/`crawler_ambush`/`bloat_solo`（中）、`screecher_horde`/`thug_patrol`/`thug_squad`/`metro_horde`（强）。剧情事件的 `fx.combat` 直接填这些 id 即可，或传敌人 id 数组自定义编组。

### M1（2026-07-16, opus）
产出：`index.html` 骨架 + `js/engine/` 六文件（state/time/events/combat/save/main）。已用 Node 环境跑通 47 项验收（含日历锚点、条件/效果 DSL、事件触发、约定到期、阈值掉血、睡眠、战斗胜负掉落、存读档、导出导入、死亡）。日历双锚点均正确：第0天=7月14日周一、第90天=10月12日周日、跨年正确（基准年 2025）。

**与 Schema 的差异 / 新增字段（均为「新增」，未改动已有字段含义）：**
- 条件 DSL 新增可选字段：`dayMax`、`skill`（要求某被动技能）、`met`（要求某 NPC 已相遇）。stat/aff/stage 的比较对象在 `lt/lte/gt/gte` 之外还支持 `eq/ne` 及裸值等值。
- 事件新增可选字段 `when:[...]`（覆盖默认触发时机）。默认时机：random→[enter,action]、scheduled→[tick,enter]、story→[enter,action,tick]。**注意：无 cond、无 cooldown/once 的事件会在每个符合 when 的时机反复触发**——数据层的随机/周期事件务必带 chance 或 cooldown/once。
- GameState 新增内部字段（引擎自管，数据层勿手改）：`world._firedDay`（scheduled 每日去重）、`world._once`（once 事件已触发标记）、`state._currentPassage`、`state.combat`（易失，不入档）、`state._dead`。
- 好感度 `affinity` 钳制范围取 **-100..100**（Schema 只规定身体状态 0–100，好感未规定，留出负好感空间）。
- G.ui 接口在 Schema 四个（showPassage/refresh/showCombat/showLocation）之外，M1 追加了三个占位，**M2 需一并实现**：`showShop(shopId)`、`showDeath(cause)`、`showIntro()`（角色创建，完成后调 `G.engine.newGameStart({name,gender})`）。
- 平衡常量集中在 `time.js` 的 `TUNE` 与 `combat.js` 的 `COMBAT_TUNE`（挂到 `G.TUNE`/`G.COMBAT_TUNE`），M3/M9 只改这两处。

**给 M2 的注意事项：**
- UI 文件在 `index.html` 已按顺序留了注释引入位，取消注释即可（顺序勿动，main.js 必须最后）。main.js 用 `stub()` 只在 G.ui 方法缺失时补占位，M2 的真实实现会自动覆盖，无需删占位。
- 交互主脊：UI 渲染段落时用 `G.engine.passageText(id)` 取正文、`G.engine.passageChoices(id)` 取已按 cond 过滤的可选项（每项带 `_i` 原索引），点击选项调 `G.engine.selectChoice(choice)`。地点内移动/行动后各自调 `G.engine.goLocation(id)` / `G.engine.checkEvents('action')`。
- 行动耗时请乘 `G.engine.timeCostMod()`（精力<15 时为 1.5）。文本分支可用 `G.engine.isDrunk()/isHallucinating()/isCritical()/timeOfDay()`。
- 富文本标签解析（tags.js）是 M2 职责；引擎产出的文本已内联 `[npc:..]`、`[zed]`、`[item]` 等标签，交给 tags.js 渲染。动效标签每段最多 1 个的降级逻辑也在 tags.js 实现。
- 战斗驱动：`G.engine.combatAction(action, param)` 返回 `{status, log, state}`，UI 每回合读 `log`（本回合文本数组）刷新。

### M0（2026-07-16, fable）
- 全套文档建立。用户已确认的关键决策：性别可选、大型规模（15 地点 / 10 NPC）、成人内容无开关直接呈现、NPC 全员可攻略、轻量回合制战斗、子弹为硬通货、GitHub Pages 部署（保留单文件打包做退路）、日历系统含约定与周期事件。
- 游戏名《临港余生》为暂定名，上线前可跟用户再确认。
- 时间锚点：第 0 天 = 7月14日周一，开局第 90 天 = 10月12日周日，M1 务必按此实现并验收。
