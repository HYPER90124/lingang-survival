# M16 任务书 — QoL 杂项：收音机/图鉴统计/多存档/清洁度（模型：opus）

## 开工前必读
PLAN.md（M9/M11 交接备注 + v1.1/v1.2 拍板备注）、docs/Schema.md、js/engine/save.js（migrate 机制）、js/engine/state.js（player/world 结构）。

## 目标
四个独立小功能一次落地（候选池第二批 G/H/I/K）。互相无依赖，按下列顺序做，每做完一项自测一项。

## 工作项

### 1. 收音机道具（G）
- items.js 新增 `radio`（material，weight 3，不上架搜刮表，来源二选一都做：阿豆处用零件×2+电池×1 修一台〔dou 线新增可重复事件〕、metro 军囊 rare 小概率出）。
- 效果（数据层实现，读 `hasItem('radio')`）：①周三晚周响广播时段，玩家不在 campus 也触发一条「收听」事件（+理智 3，有留言待播时照 zhou_radio_1 口径处理，与在场版互斥）；②尸潮预警 horde_warn 增加收音机变体：预警提前到当日上午（appointment 仍登记次日 20:30，多出的半天是玩家备战时间）。
- 每次收听消耗 battery 的 1/4 概率（别做电量条，过度工程）。

### 2. 敌人图鉴 + 生存统计（H）
- state 新增 `world.codex:{enemies:{id:true}}` 与 `world.stats:{kills:{id:n}, scavenges:n, fights:n, flees:n}`（migrate 补空对象）。埋点：startCombat 登记 codex、endCombat win 登记 kills、scavenge/tryFlee 各自计数；天数直接用现有 day。
- enemies.js 每个敌人补一行 `hint` 字段（弱点/习性一句话）。
- 系统面板加「档案」子页：统计数字 + 已见敌人列表（名称/hint/击杀数），未见敌人显示「？？？」。

### 3. 多存档槽（I）
- save.js 改 3 槽位：localStorage key 加槽位后缀，旧 key 的存档迁移进槽 1（一次性迁移逻辑，保留旧 key 做回退直到确认读取成功）。
- 系统面板存/读档改为槽位选择（显示各槽的游戏内日期+天数+角色名），导出/导入保持现状（作用于当前槽）。
- **本项是全模块最大风险点**：迁移前后各跑满进度档导入 + M9 求生机器人。

### 4. 清洁度（K）
- player.stats 新增 `grime`（脏污 0–100，migrate 补 0）。累积：搜刮 +3、战斗 +5、经过/搜刮 sewer +10（常量进 TUNE）。
- 消退：home/bar 新增「洗漱」行动（耗时 15 分钟；消耗 1 份任意水类道具则清零，无水只擦到 40）。
- 效果（轻量，只做氛围不做硬惩罚）：grime>70 时 NPC 日常搭话前置一句嫌弃变体（每 NPC 1 条，10 条）、送礼好感 +1 档失效；worldevents 加 1–2 条高脏污小事件（如野狗循味跟踪）。

## 约束
- 存档结构变化统一走一次 SAVE_VERSION 递增，四项的字段一起 normalize，别递增四次。
- 全部新事件带 chance/cooldown（M1 老坑）；埋点不得改动 combat.js 现有战斗流程逻辑（只加计数行）。

## 完成后
勾选 PLAN.md M16，交接备注写明：SAVE_VERSION 变更、新字段清单、收音机事件 id、grime 常量值。
