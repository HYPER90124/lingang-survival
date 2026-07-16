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
| M9 | 整合、平衡、打包、部署 Pages | opus | ✅ 完成（v1.0） |
| M10 | 战斗体验重做（选项成功率/后果显示、遇敌数量文本、主角强化） | opus | ✅ 完成 |
| M11 | 地图地理重排 + 江水/雨水/煮水系统 | sonnet | ✅ 完成 |
| M12 | 全库文本逻辑自查（首次/重复口径等） | fable | ✅ 完成 |
| M13 | DoL 模式增强（战败非死亡/打工/魅力诱惑做爱脱身/NPC邀约） | fable | ✅ 完成 |
| M14 | 服装与外观系统（三槽三属性/耐久/存档迁移） | opus | ⬜ 已拍板，待开工 |
| M15 | 入冬季节压力（温度/寒冷值/水源联动） | opus | ⬜ 已拍板，待开工 |
| M16 | QoL 杂项（收音机/图鉴统计/多存档槽/清洁度） | opus | ⬜ 已拍板，待开工 |
| M17 | 家园升级（门窗/雨水收集/菜园/储物柜） | sonnet | ⬜ 已拍板，待开工 |
| M18 | NPC 同行作战 | opus | ⬜ 已拍板，待开工 |
| M19 | 屠夫帮收网战役（三幕+孟九+战后世界变体） | fable | ⬜ 已拍板，待开工 |
| M20 | 动态经济（物价波动/缺货/套利） | sonnet | ⬜ 已拍板，待开工 |
| M21 | 主角前情揭示链（worn_idcard 收口） | fable | ⬜ 已拍板，待开工 |
| M22 | 怀孕系统 | fable | ⬜ 已拍板，待开工 |

执行顺序：M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8 → M9。
M2 与 M3 可并行，M7 与 M8 可并行（不同文件，无冲突）。
**v1.1 顺序：M10 → M11 → M12 → M13 → M14 → M15**。M10 与 M11 都改 locations.js，**不要并行**；M12 必须在 M10/M11 之后（要复核它们的新文本）；M15 依赖 M14 的 warmth 属性。
**v1.2 顺序：M16 → M17 → M18 → M19 → M20 → M21 → M22**。硬依赖：M18 依赖 M10/M13（战斗改造+战败非死亡）、M19 依赖 M18（companion 复用）、M20 依赖 M19（butcherFallen 旗）、M22 依赖 M14（迁移先例）+ M17（homeStorage）并排全批最后。M21 与 M20 文件不冲突可并行。v1.2 收尾后加跑一轮 M12 式文本自查 + M9 式整合平衡（建议单开 M23 收尾模块，opus）。
每个模块开一个新窗口，用 `/model` 切到进度表标注的模型再开工。

## 交接备注（每模块完成后追加，最新在上）

### M13（2026-07-17, fable）
DoL 模式增强 A/B/C/D 四项全部实装。改动：`js/data/story/dol.js`（**新文件**，37 段落 + 23 事件）、`combat.js`（战败分流）、`state.js`（fx.roll 扩展）、`locations.js`/`worldevents.js`（5 处人类遇敌加脱身选项）、`index.html` + **`tools/build.js`**（新文件引入）、`docs/Schema.md`（fx.roll 登记）、`docs/NPC设定.md`（M13 通用互动登记节）。`dist/game.html` 重打（531.7KB，22 个脚本）。存档结构未动（新增 flag 全走既有 player.flags/storyFlags/world.flags）。

**引擎扩展（均纯新增，已登记 Schema）**：
- `fx.roll:{chance, win:{...fx}, lose:{...fx}}`（state.js applyFx）——掷骰递归执行分支，分支导航优先于外层同名导航。C 项的成功率判定靠它，M18/M19 的战术选项可复用。
- combat.js `endCombat('lose')` 分流：**纯人类编组 + 无 onLose/returnPassage** → `humanDefeat()`（子弹减半、每叠非武器/非 key 物资没收 floor(count/2)、hp 立 15、理智-10、昏迷 `advance(180,{sleeping})`、原地醒来开 `dol_defeat_p1`）；损失清单存易失 `s._defeatLoss` 供文本。**剧情人类战斗（带 returnPassage）维持战败=死亡**——goto 续接段写有推进 flag，跳过会永久卡线（qin_s3_1 等），这是有意取舍不是漏做；丧尸/混编亦维持死亡。战败计数 `world.thugDefeats`（首败/复败文案分支用，M19 可读）。醒来段缺失时自动回退死亡（引擎不依赖数据文件存在）。

**A 事件/段落**：`dol_defeat_p1/p2`（首败/复败双口径、有无武器双分支、损失清单动态拼接）。已知边角：昏迷 3 小时的整点 tick 会照常结算事件/约定（可能烧掉 once 事件或错过约会），判定为合理代价未修。

**B 打工（scheduled 每日至多一询，priority 3，进场/整点触发）**：`dol_job_su`（bar 18–21 点，su 好感≥20：180 分钟 → 3 子弹+好感1+口渴+8，精力-12；周六收工偶发酒客闹事 +1 子弹+好感2）；`dol_job_lin`（hospital 8–14 点，lin≥40：240 分钟 → 4 子弹+绷带1+好感1，精力-15；周三偶发伤员，普通处置好感2/理智-2，**bandage 技能**另出高收益选项 好感3+理智2+绷带1）；`dol_job_cai`（dock 8–15 点，met cai 即可无好感门槛：240 分钟 → 5 子弹+好感1，精力-28 饥饿-6 重体力；周四走私箱/周日浮尸见闻纯氛围）。首次/重复口径用 `jobs.suDone/linDone/caiDone` flag 分支。**平衡自测**（Node 蒙特卡洛 2 万次，道具按 price×0.5 折子弹）：打工时薪 0.017–0.025 子弹/分钟，市场类搜刮 fresh 0.086–0.117、搜空挂底 floor 0.042–0.059——**打工不到挂底搜刮的一半，红线未破**，定位=零风险兜底收入（无遇敌、无负重、免跑商）。

**C 非战斗脱身**（5 处人类遇敌 passage 各加 3 选项，成功率明示在文案，失败落战斗）：色诱（理智≥40，55%）/ 贿赂（子弹≥8，80%，**失败子弹照扣**）/ 虚张声势（灰猫好感≥40 解锁黑话，65%）。共享结局段 7 个：`dol_charm_ok_p`（性别双分支）/`dol_bribe_ok_p`/`dol_bluff_ok_p` + 失败段按编组 `dol_talk_fail_patrol/squad_p`、`dol_bribe_fail_patrol/squad_p`（失败段唯一选项=迎战开打）。入口：locations.js `enc_police_1_p`（patrol）/`enc_checkpoint_1_p`（squad）、worldevents.js `enc_gas_2_p`（patrol）/`enc_mall_2_p`（squad）/`butcher_world_1_p`（patrol）。剧情线人类战斗（qin/mao/zhao）**未加**脱身选项（剧情节拍不该绕）。注：M3 的原「撤退」选项本就免费，脱身三选项是风格向侧路不是强度提升，黑话成功还+2 理智是唯一小甜头。

**D NPC 邀约**（好感≥60，随机 chance .15 / cd 4320 / priority 2）：十人全做。`dol_invite_{id}` 按各自作息地点+时段触发（mao 在 sewer 需信任在场），接受 → `npc.{id}.datePending`=true + 日历 appointment（**次日定点**，eventId 强制触发 `dol_date_{id}`，全部约在午夜前避免「明晚」口径错位）；到点**在场=赴约**（好感+4 + 理智4~8 + 各自风味收益，时长 60–90 分）、**不在场=爽约**（好感-3），两条出口都清 datePending，拒绝邀约不扣好感。**主线八人（qin/lin/mao/su/dou/zhou/zhao/fang）另需 stage≥2**——好感可以裸堆到 60 而不升阶，信任门保证约会文本引用的都是已知信息；chen/cai 无阶段线不设门。约会地点/时刻：qin 酒吧20:00、lin 医院天台21:00、mao 码头22:00、su 酒吧21:00、dou 加油站棚顶21:00、zhou 广播站16:00、zhao 超市后屋19:00、chen 教堂20:00、cai 码头19:00、fang 检查站21:00。「不在某地」用其余 14 地点 anyOf 表达（cond DSL 无否定）。已知边角：同日可与多人订约，后到期者自动按爽约结算（玩家自选的排期代价）；约定到点若在赶路途中的整点 tick 结算则按当时所在地判定。

**测试（scratchpad 未入库：m13_test.js 413 项全绿 / m13_integrity.js / m13_balance.js）**：全库 454 passage 双性别 text 0 抛错、230 事件 0 断链（含 fx.roll 递归扫描）；A 四分流（人类散遇→洗劫醒来含物品清点/剧情道具豁免/装备保留/时间+180，丧尸→死、带 returnPassage→死、混编→死）；C 条件门+成败全链路到开打；B 三工触发门/工钱/去重/周六周三周四周日分支/包扎术选项；D 触发门/日历登记/赴约收益/爽约扣好感/datePending 防重/阶段门/十人逐一冒烟；新 flag 存读档往返。**坑一则：`tools/build.js` 的 SCRIPTS 是硬编码清单，不读 index.html**（M9 备注说「顺序照 index.html」是指人工对齐）——新增数据文件必须两处都加，本次 dol.js 第一次打包就漏了，靠字面量 grep dist 才发现。

### M12（2026-07-17, fable）
全库文本逻辑自查完成。只改文案与 cond/分支（含 2 处静态 passage 改 text 函数分支、1 处事件加 met cond、1 处文本函数门槛由 stage 改 flag），零数值/事件结构/flag 命名改动，存档兼容。`dist/game.html` 已重打（500.0KB）。**新验证网**：首访机器人（scratchpad `m12_firstvisit_bot.js`，未入库）——新档 dump 开场 5 段 + 15 地点昼/夜描述 + 10 NPC 初遇全段落 + 全部修改点渲染回归，**0 报错**，文本人工通读一遍。

**修改清单（回归用，共 26 处）**：
- **时间线口径（最大发现）**：M5–M7 剧情正文系统性写「三年」，但爆发至开局仅 90 天（intro 明说第九十天）。逐处裁决：*实锤修掉* lin.js「三年了→三个月了」（医院只剩她一人）、「迟到三年→三个月的病程记录」（爆发日）；minor.js 方哨「背了三年→三个月的背囊」（秘密=封城第七天）、「三年来→从军以来头一次守夜」、「废墟三年来→成了废墟以来」；secondary.js 赵铁「封城头一个冬天→头一个月」+「闺女那年→才二十四」（**开局在 10 月，第一冬还没来**，NPC设定.md 的赵小满登记同步修正）；worldevents.js rare_park_1「漂了三年→两个月」、sv_sewer_1「三年前→两个月前的日期」+「当年→当时」、sv_metro_1 正字「几百个→八九十道」（一天一道，90 天）。*判定合理并补登记 NPC设定.md*：苏曼线三处「三年」+老秦「守了三年」=**亡夫殁于爆发前三年**（新登记的事实源）；灰猫两处「两年」=记者时期前史；赵铁「摆了三年柜台」=店铺爆发前就开。
- **首次/重复口径（用户实锤项）**：locations.js home descDay「你这几天攒下的物资」→「从这屋里翻出来的物资」（失忆开场首日矛盾）；bar descDay 删「老秦缩在角落打盹」（他白天在警局，作息矛盾；注意黄昏 17:00–20:00 也走 descDay 而老秦 19:00 到岗，故改成不做任何在场断言的空店描写）；qin.js qin_s0_2「看你这几天进出」→「看你进出的做派」（可与初遇「生面孔」同夜连发）；qin_hunt_p2「这句话你听过很多遍了」→「他说这话的时候，眼睛里的火像刚点着的」（首次触发即错，全库“又近了一步”仅此一处）；amb_bar_1（苏曼默契递水）加 `met:'su'`；npcs.js 赵铁阶段2搭话「多谢你」→「上回屠夫帮上门那事，总算翻篇了」+ brief[3]「那次是你替他挡的」→「那天你就在店里」（stoodUp/paidOff/stayedOut 三分支通用）。
- **敌人数量**：worldevents.js horde_enc_1「七八条影子」→「两条跑得最快的影子」（runner_pack=2）；enc_dock_2「三个→两个方向」（同）；locations.js enc_sewer_1「东西（单数暗示）→两团东西」（crawler_ambush=2）；enc_market_1「打烊后的货架间」→「货架深处一阵哐啷」（market 只在营业时段可进）。
- **未发生事件引述**：worldevents.js rare_sewer_1_p 改 text 函数，「不是灰猫的路数」只在 met 灰猫后拼接；butcher_world_4「连本带利」引述门槛 `stage qin>=3` → `flag npc.qin.s3_4`（台词出处在 s3_4，原门槛有提前引述窗口）。
- **道具名**：lin.js「消毒水→消毒液」（fx 给的是 disinfectant）；mao.js「半板巧克力→一根巧克力棒」（fx 给 chocolatebar）；worldevents.js rain_end「黄昏天光→夜色星子」（雨停固定 20:00，10 月已天黑）。

**排查过但判定合理的豁免清单（防止重复排查）**：① 地点描述/氛围事件直呼在场 NPC 名（赵铁/林晚/阿豆/老蔡/陈神父/方哨等）——UI 在场芯片本就对未识 NPC 显示全名，全游戏约定，不算剧透；② lin_clinic 义诊池「上次那个腹部插钢筋的男人」——出处 lin_s1_3 手术是升 2 必经；③ lin s3 多处「像上次攥住衣角/袖口」——出处 lin_s2_3（必经）；④ 三处羁绊成人变体「第一夜/上次」引述均已锁首夜 flag（qin_s4_2 锁 s3_3、lin_s4_2 锁 s3_4、mao 同理）；⑤ npcs.js 阶段 1「老主顾/常客」——升 1 前必有 4+ 次互动，灰猫的「老主顾」是她的生意话术人设；⑥ 老蔡「今天又来一个」（任务书已豁免，疯癫人设）与 cai_talk「老规矩」（规矩在 s0_1 立过）；⑦ 大型事件「四条/四五条人影」vs 编组 2 人（qin_s3_1、mao_s3_2、zhao_s0_3）——同伴在场分担+突围不清场语境，战后文本无歼灭全部的表述，与 M10 判定一致；⑧ horde_enc_2 尸潮「冲开一条口子」打 screecher_horde=3——突围语境；⑨ butcher_world_2 lostGoods 分支「折了三个弟兄」——被引来的隧道尸群所杀，读得通；⑩ 苏曼/阿豆台词提「灰猫」、周响提「方哨」、灰猫情报提「孟九/赵铁」——城中人物氛围级引用（M7 su_gossip 豁免延续）；⑪ market descNight「赵铁清点货品」——人在后屋不见客，不与作息冲突；⑫ 状态池/雨天/尸潮链其余时段全部与 timeRange 锁吻合（enc_park_1 夜锁、amb_home_1 夜锁、rain_start 上午锁均已核）；⑬ 性别双分支 14 处全部双分支齐全、无串味、无漏写；⑭ [item]扳手/戒指/碘伏[/med] 等叙事道具标签（无对应道具 id、也不发放）——纯着色不发货，不算口径错；⑮ horde_warn「收音机里」——玩家无收音机道具也可解释为据点/街面广播，M16 收音机落地后可回头把该文案挂在道具上。

### M11（2026-07-17, sonnet）
地图地理重排 + 水源系统完成。改动文件：`locations.js`（mapPos + 水源行动 + gatherWater/boilWater 引擎函数）、`items.js`（riverwater/boiledwater 新增，rainwater 口径调整）、`render.js`（数据行动 cond 过滤 + requiresItem 置灰提示 + 按类型分发 scavenge/gatherWater/boilWater）、`panels.js`（地图面板重写）、`style.css`（地图配色/虚线/灰显）。`dist/game.html` 已 `node tools/build.js` 重打（499.8KB）。存档结构未动（新道具/行动均走已有 inventory/scavenge 结构）。

**1. 地图重排**：15 地点全部按任务书给定坐标表加了 `mapPos:{x,y}`（纯新增字段，`adjacent` 数值一字未动）。`panels.js openMap()` 改为按 mapPos 摆放（画布 300×300，pad 32），连线标注移动分钟数（相邻实线；下水道捷径虚线，仅 `world.sewerShortcut` 解锁后画出，用当前 `locationNeighbors` 之外的全量 `shortcuts` 字段扫描，不局限于当前地点）。节点按 `danger` 0–3 上色（绿→黄绿→橙→红），营业时间外（`isLocationOpen` 为假）降透明度灰显，当前地点/可达地点用描边区分（不再用旧的实心色块，避免和危险度配色冲突）。地图容器沿用 M2 的 `.map-wrap{overflow:hidden}+width:100%`，不会横向滚动。

**2. 水源系统**：`items.js` 新增 `riverwater`（江水，thirst+15/infection+8/price0）、`boiledwater`（净水，thirst+25/无感染/price2）；`rainwater` 感染 3→8，desc 改口注明「没烧开，直接喝要闹肚子」。`locations.js` 新增两个数据行动 type：
- `type:'water'`（`G.engine.gatherWater`）：`action.water:'river'|'rain'` 区分。park/dock 各加「去江边取水」（15 分钟，恒可用）；除 home/bar/church 外全部 12 个地点（含 metro/sewer——任务书原文只排除 home/bar/church，未单独排除地下地点，照字面执行）用一个循环批量挂「接雨水」（20 分钟，`cond:{flag:{'world.rainDay':true}}` 门控，UI 侧只在下雨时显示）。两者均需 `requiresItem:'glassbottle'` 且消耗 1 个换生水 1 份。
- `type:'boil'`（`G.engine.boilWater`）：home/gas/bar/church 各加「烧水煮沸」（20 分钟/精力-3），需 `requiresItem:'lighter'`（只判定不消耗），把包里 1 份生水转 boiledwater，两种都有时优先煮 riverwater（`实现从简`，未做弹窗选择）。
- **顺手清理 M3 遗留 bug**：park 原有的 `collect_water`（标签「接雨水」但走 scavenge 类型，实际从与 forage 共用的 scavengeTable 随机开，会开出野菜/猎刀等无关物——本来就是错的）已删除，改成上面的规范水源行动；park 的 scavengeTable 里原本混进的 `rainwater` 掉落一并移除（避免和新水源行动重复产出、绕过 glassbottle 成本）。M8 的 `rain_harvest_1`（park 雨天采收事件）产出走的是直接 `fx.item`（不经 scavengeTable），文案未提「能直接喝」，无需改文案，数值随 `rainwater` 定义自动继承新感染值。

**3. UI 联动**（Schema 未列 render.js 在本模块必读文件内，但水源行动的可见性/置灰门控必须在这层做，判定为「接口缺口的合理扩展」）：`render.js` 的地点「行动」区块新增两处能力——① `def.actions` 现在按 `a.cond` 过滤（此前只有 M2 的 extraActions 支持 cond，M3 数据行动没有，「接雨水」必须靠这个才能只在下雨天出现）；② `requiresItem` 缺失时按钮加 `.disabled`（复用 M2 早就定义好但一直没人用的 `.btn.disabled` CSS）并在文案后追加「（需要XX）」提示，而不是等点击后才用 toast 报错——这个改动是通用的，metro/sewer 的手电筒门控也顺带获得了同样的置灰体验（原来是可点击但报错，现在点击前就能看出缺什么）。`runDataAction` 按 `action.type` 查表分发到 `scavenge`/`gatherWater`/`boilWater`，三者返回值形状一致（`{ok,msg}`），无需改调用侧其余逻辑。

**平衡自测（Node vm 沙箱，用真实引擎+全部数据文件跑蒙特卡洛，未入库）**：
- 市场（market）反复搜刮，只统计饮水类道具换算的口渴值：**fresh（未搜空，count 强制清零）基准 0.41 口渴/分钟**（仅瓶装水 0.37）；**floor 基准（`scavengeFloor=0.5` 搜空后长期挂底）0.21 口渴/分钟**。
- park→gas 江水链循环（取水 15 分 + 走 25 分 + 煮水 20 分 + 走回 25 分 = 85 分钟/轮，这是全图最短的取水-煮水地理组合）：**0.29 口渴/分钟**。
- 结论：新水源速率介于「市场搜空后」（0.21）与「市场新鲜」（0.41）之间——**没有超过新鲜市场的期望效率，红线未破**；且严格慢于市场搜空前的常规效率，只在市场被打空的中后期才显出优势，符合任务书「兜底选项而非最优解」的定位。若直接生喝江水/雨水不煮沸，15 分钟即得 thirst+15 但 infection+8（1.0 口渴/分钟，看似最快），这是任务书本来就要的风险对价（生水伤感染），不算破线。glassbottle 消耗（price 1）在此基础上还会再摊薄一点效率，未单独计入上面的谏率但方向一致（更不利于水链）。
- 未跑 M9 式 30 天满流程生存验证（本模块只新增可选资源分支，不改饥渴阈值/日结算，判断为低风险，交给下一次全库整合测试覆盖）。

**已知限制 / 留给 M12**：新增道具 id：`riverwater`/`boiledwater`（+ `rainwater` 数值变化）；新增行动 id：`river_water`（park/dock）、`rain_water`（12 个地点，除 home/bar/church）、`boil_water`（home/gas/bar/church）——M12 文本自查时注意「接雨水」按钮文案在非雨天不可见是预期行为，不是缺文本。地图面板的分钟标签是新加的纯数字文本，未做碰撞避让，个别密集处（police/bar/hospital 三角）标签可能视觉重叠，非阻断性问题，M16 QoL 若做地图优化可顺手改。

### M10（2026-07-17, opus）
战斗体验重做完成。改动文件：`combat.js`（核心）、`items.js`（bandage 联动 + 枪械 ranged 标记）、`enemies.js`（human 标记 + 头注更新）、`render.js`（战斗按钮实时数据 + choice 遇敌构成后缀）、`css/style.css`（按钮字号 + `.enc-tag`）、`locations.js`/`worldevents.js`（文本数量修正）。`dist/game.html` 已 `node tools/build.js` 重打（491.3KB）。存档结构未动。

**1. 选项透明化**：新增 `G.engine.combatOptionInfo()`（纯新增）返回 attack/heavy/defend/flee 实时数据；逃跑公式抽成共用 `fleeChance()`（tryFlee 与 info 同源，不漂移）。render.js 战斗按钮渲染成 `攻击（90%·4-9伤）`/`重击（70%·6-14伤·-10精力）`/`防御（-60%伤·+4精力）`/`逃跑（30%）`。敌方全员构成+余血本就由 enemy-row 卡片逐个显示（含重复项，即构成）。

**2. 遇敌数量一致**：系统级保险——render.js 渲染 choice 时若 `fx.combat` 存在，用 `encounterComposition()` 解析编组自动后缀 `（跛行者×2）`，以后写错文本也不误导。**修掉的文本错例（改文本不改编组）**：locations.js `enc_market_1_p`（一只→两只跛行者）、`enc_hospital_1_p`（一具→三具）、`enc_park_1_p`（一只犬尸→三条）、`enc_dock_1_p`（一只→两只爬行者）；worldevents.js `enc_residential_2_p`（一条→两条黑影/runner_pack）、`enc_market_2_p`（一只→两只/crawler_ambush）、`enc_hospital_2_p`（一只手→两床各一手/crawler_ambush）、`enc_mall_2_p`（四五个→两个/thug_squad）。全库其余 `fx.combat`（剧情线）均为模糊表述（「里面的东西」「一队巡逻」「几条野狗」）或已与编组数量吻合（qin_s1_3_p2「三具尸体+竖三根手指」=zombie_trio），合格未改。

**3. 主角强化 + 技能落地**（全部在 `COMBAT_TUNE`）：
- `hitHeavy` 0.62→**0.70**（重击期望不再低于普攻）；防御回合 `defendEnergyRegen`=**+4 精力**（支撑防御→重击循环）；连击奖励 `comboBonus`=1/`comboCap`=3（连续命中每段 +1 伤，封顶 +3，落空/换动作清零）。
- `skill:melee`（老秦线）：近战命中 +0.05、伤害 +2（`meleeHitBonus`/`meleeDmgBonus`）；**只对近战武器/徒手生效**——枪械新增 `ranged:true` 排除。
- `skill:bandage`（林晚线）：新增 `G.engine.medBoostFx(def)`，med 类道具的 hp 增益 / 感染削减 ×1.5（`bandageMult`）；combat.js `useItemInCombat` 与 items.js `useItem` 两条使用路径都走它。
- `skill:modding`（阿豆线）：`wearWeapon` 每 2 次攻击才 -1 耐久（`moddingWearEvery`，损耗减半；计数存战斗态 `_wearTick`，不入档）。

**4. 顺手修**：敌人加 `human:true`（thug_grunt/thug_brute），combat.js 新增 `foeName(e)`——人类不套 `[zed]`，命中/被咬/倒地文案统一走它。旧的「命中文案硬套 [zed]」已消除。

**测试（vm 沙箱载全引擎+数据，无 UI；scratchpad 未入库）**：combatOptionInfo 形状/数值、三技能（melee 加成且不作用于枪、bandage ×1.5、modding 6 击损 3 耐久）、human 无 [zed]、render 按钮串与构成串——**全 PASS，控制台 0 报错**。平衡：**胜任 30 天生存 5/5**（复刻 M9 验收，smartCombat 会防御/嗑药/逃）；战斗强度增量 pipe/zombie_pair 纯攻策略 0.66→**0.81**（明显变强不碾压）；强敌仍是真威胁（无准备 metro_horde 胜率 0、铁管 thug_squad 纯攻 0.03，需防御/道具/逃）。jsdom 未安装，改用逻辑复刻验证 render 输出正确。

### v1.2 拍板（2026-07-17, fable）—— 仍只是计划，未动游戏代码

候选池第二批用户拍板：**除 J（内容开关）外全选**。编入 M16–M22 七个模块（任务书已写全，进度表已加行，依赖关系见执行顺序节）：M16=G收音机+H图鉴统计+I多存档+K清洁度（四合一 QoL）、M17=L家园升级、M18=M同行作战、M19=N收网战役（新文件 campaign.js + 新敌人 thug_boss）、M20=Q动态经济、M21=O前情揭示链、M22=P怀孕系统。注意贯穿点：M16/M17/M20/M22 都动存档结构，各自 SAVE_VERSION 递增按顺序串成迁移链，跨模块务必回归「满进度老档导入」；v1.2 全批收尾建议单开 M23（M12 式文本自查 + M9 式整合平衡 + 重新打包部署）。J 项未选，记录在候选池文件里，日后要上 itch.io 可重提。

用户对 M13 候选清单 A–F **全选**：A–D 留在 M13；E→M14（服装）、F→M15（入冬）任务书已写，进度表已加行，顺序 M13→M14→M15（M15 依赖 M14 的 warmth）。第二批候选功能已提交用户待拍板，见 docs/任务书/候选池-第二批.md。

用户 v1.0 实测反馈六条 → 拆成 M10–M13 四个模块，任务书已写好（docs/任务书/M10~M13）。反馈原文对应：①战斗选项要显示成功率和后果→M10；②遇敌前文本数量对不上（已实锤 `enc_market_1_p` 说一只实际两只、`enc_hospital_1_p` 说一具实际三只）+主角战斗强化→M10；③地图看不懂→M11（M2 交接早就注明环形布局是占位，方案=locations.js 加 mapPos 坐标）；④加江水/雨水水源、生水加感染煮沸才安全→M11；⑤首访却说「这几次」的口径 bug→M12（字面 grep 无命中，是同义表述，任务书里给了排查法）；⑥参考 DoL 完善→M13 候选清单已列（战败非死亡/打工/魅力脱身/NPC邀约推荐，服装/季节标记为大工程），**等用户逐项拍板**。M10 顺手修 M3 遗留的人类敌人误标 `[zed]` 问题并落地三个技能位（M9 遗留）。各任务书内已注明模块间依赖与 locations.js 冲突规避。

**整合测试（Node 全绿）**。四个自动化测试脚本（scratchpad，未入库；harness 用 `vm` 在浏览器语义沙箱里按 index.html 顺序加载全部引擎+数据文件，UI 三件套 render/panels/tags 走 jsdom 单独验）：
- **引用完整性**（test_integrity）：417 个已注册 passage（全部唯一）+ 207 事件，全量扫描 goto/combat/shop/item/appointment.eventId 引用 **0 断链**；所有 passage 的 `text()` 函数在新档状态下执行 **0 抛错**；**M8 警告的「choice.fx 同写 shop+goto 会丢 goto」全库 0 处命中**（routeNav 顺序 combat>shop>goto 的坑没人踩）。
- **旗标一致性**（test_flags）：cond 里读到的 105 个 flag **全部**有 fx.flag 写入源（world.* 经 setFlag 文本副作用写入除外），**0 处悬空读**——6 个剧情文件跨线 flag 命名无拼写漂移。
- **求生驱动**（test_drive）：机器人两性别各多种子驱动，全程搜刮/战斗胜败逃/吃喝/睡眠/存读档/导出导入/搭话/事件触发，**控制台 0 报错**。粗心机器人（乱走、夜里撞尸潮、群战不逃）会早死＝符合「无躺赢」；胜任机器人（test_balance）**30 天生存 5/5**。
- **单文件验证**（test_built，jsdom 载入 dist/game.html）：开局→建档→移动→5 面板+关系面板→存读档→导出导入 **0 报错**。存档体积：满进度档（10 NPC 全羁绊、70 条日历、40 类道具）导出仅 **16.7KB**，远低于 200KB 目标。

**数值平衡（只改集中常量，改动全部在 `time.js TUNE` + `locations.js` 搜刮保底一行）**：
- **根因**：`state.scavenge[locId]` 只增不减，地点被搜空后 decay 永久停在 0.25，中后期每次搜刮的「时间消耗」＞「产出」→ 食水必死循环（stationary 探针：修复前最优单点 market 也 0/4 撑不过 30 天）。
- **三处修复**：① 新增 `TUNE.scavengeFloor=0.5`（locations.js 读取，搜刮命中率保底 0.25→0.5，被搜空地点仍保留一半产出）；② 新增 `TUNE.scavengeRegenPerDay=3`（跨日 dayRollover 里各地点搜刮计数回落，模拟补给）；③ `TUNE.thirstPer10` 0.45→0.40（水源仅 park/market 两处，较饥饿单独放宽）。
- **效果**：market 单点 30 天 4/4 撑满、胜任玩家 5/5；park（纯水）/residential（纯食）单点仍会饿/渴死＝正确（必须轮换取食水，「奔波」保留）。前期紧张（开局仅铁管+1 食+1 水，stats 70）、中期靠轮换+商店+NPC 赠礼+稀有大宗有余力推剧情。
- **未动的常量**：战斗 `COMBAT_TUNE` 全保留（胜任机器人战斗胜/逃正常，早期徒手群战致死＝末日生存预期）；毒瘾/感染日结算、阈值线全保留。M8 交接提的「rare_ 收益偏肥」未砍——floor 修复后经济不再通缩，肥一点无碍。

**打包**：`tools/build.js`（`node tools/build.js`）内联 CSS + 21 个 js（顺序照 index.html，自动剔除 _demo.js），产出 `dist/game.html`（约 485KB，未压缩保持可读可审计）。`</script>` 已转义防提前闭合。file:// 直开可玩（localStorage 在真实浏览器可用；jsdom 默认不给 localStorage，故测试里那两条 warn 是环境限制非 bug）。

**部署**：加了根目录 `.nojekyll`（Pages 跳过 Jekyll，原样服务 js/ 目录）。⚠️ **远程仓库创建 + Pages 启用需用户拍板**（公开发布含成人内容、仓库名/公私由用户定）——见对话，未擅自推送。gh 已认证（HYPER90124，repo scope），用户确认后一条命令即可上线。

**后续扩展建议（v1.1+）**：
- **加 NPC/地点/道具/敌人**：纯数据层，照现有 Schema 直接加文件或往现有文件追加 IIFE，index.html 加一行 `<script>` 引入即可，引擎零改动。新 NPC 记得进 `state.js` 的 `NPC_IDS`（好感/作息/关系面板自动接管）。
- **技能落地**：`skill:melee/bandage/modding` 已发放但战斗/道具结算暂不读（仅 packmule 有效）。建议在 combat.js/items.js 读取：melee 提近战命中或伤害、bandage 提绷带类 fx、modding 提武器耐久损耗减半。
- **系统级尸潮夜/雨天修正**：目前尸潮夜「危险度上调」「雨天加成」只在事件层（高频遭遇池 / park 事件），未改 locations.js 的 danger 字段与搜刮表。若要系统级，让引擎读 `world.hordeNight/rainDay` 调 danger/掉率。
- **真换弹手感**：枪械用武器耐久表示弹匣，无「子弹补耐久」机制（bullets 目前只是硬通货）。要真换弹需加一个消费 bullets 恢复 weapon.durability 的接口。
- **存档迁移**：改锚点/结构走 `save.js` 的 `migrate()` 版本迁移（`G.SAVE_VERSION` 递增 + normalize 补字段），别裸改字段含义。

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
