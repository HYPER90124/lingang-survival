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
| M5 | 主要 NPC 剧情·前中期 + 开场 | fable | ⬜ 未开始 |
| M6 | 主要 NPC 剧情·亲密羁绊（成人内容） | fable | ⬜ 未开始 |
| M7 | 次要 NPC ×4 全剧情 | fable | ⬜ 未开始 |
| M8 | 边缘 NPC + 世界事件池 | fable | ⬜ 未开始 |
| M9 | 整合、平衡、打包、部署 Pages | opus | ⬜ 未开始 |

执行顺序：M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9。
M2 与 M3 可并行，M7 与 M8 可并行（不同文件，无冲突）。
每个模块开一个新窗口，用 `/model` 切到进度表标注的模型再开工。

## 交接备注（每模块完成后追加，最新在上）

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
