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
| M2 | 移动端 UI + 文字标签系统 | sonnet | ⬜ 未开始 |
| M3 | 地图、道具、敌人、交易数据 | sonnet | ⬜ 未开始 |
| M4 | NPC 框架 + 好感度系统 | opus | ⬜ 未开始 |
| M5 | 主要 NPC 剧情·前中期 + 开场 | fable | ⬜ 未开始 |
| M6 | 主要 NPC 剧情·亲密羁绊（成人内容） | fable | ⬜ 未开始 |
| M7 | 次要 NPC ×4 全剧情 | fable | ⬜ 未开始 |
| M8 | 边缘 NPC + 世界事件池 | fable | ⬜ 未开始 |
| M9 | 整合、平衡、打包、部署 Pages | opus | ⬜ 未开始 |

执行顺序：M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9。
M2 与 M3 可并行，M7 与 M8 可并行（不同文件，无冲突）。
每个模块开一个新窗口，用 `/model` 切到进度表标注的模型再开工。

## 交接备注（每模块完成后追加，最新在上）

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
