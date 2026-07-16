/* =============================================================================
 * npcs.js — NPC 框架与好感度系统（M4）
 * -----------------------------------------------------------------------------
 * 产出（本文件是「系统层」，剧情模块 M5–M8 只需注册纯数据事件即可）：
 *
 *   G.data.npcs                     —— 10 名 NPC 静态数据（名字/专色/分层简介/作息/
 *                                       送礼喜好/日常搭话文本池）。tags.js 读 .color，
 *                                       render.js/panels.js 读 .name（沿用 M2 契约）。
 *
 *   作息与在场判定：
 *   G.engine.npcsAt(locId)          —— 当前时刻在该地点在场的 NPC id 数组（render.js 用它
 *                                       渲染「在场」区块与「找 XX 搭话」入口）。
 *   G.engine.npcAt(locId)           —— 同上别名（对应任务书命名）。
 *
 *   好感度系统：
 *   G.engine.stageName(id)          —— 当前阶段名（警惕/熟识/信任/亲密/羁绊）。
 *   G.engine.affNeededForNext(id)   —— 升到下一阶段所需的好感阈值（羁绊时返回 null）。
 *   G.engine.talkHint(id)           —— 搭话入口的提示态文案（「他似乎有话想说」/「好感不足…」）。
 *   G.engine.talkTo(id)             —— 搭话主入口：优先触发可用 story 事件，否则落回日常搭话。
 *   G.engine.giftItem(id, itemId)   —— 送礼（每日一次），返回 {ok, delta?, msg}。
 *   G.engine.npcGiftLikes(id)       —— {likes:[...], dislikes:[...]}（面板揭示用）。
 *
 *   好感面板：G.ui.panels.open('npc')（本文件在 G.ui 下新增并登记，见文件末尾）。
 *
 * ---- 给 M5–M8 的 story 事件注册范例（搭话入口驱动，本模块调度）--------------
 * NPC 阶段剧情用 story 事件承载，交给本文件的 talkTo 调度。约定新增两个字段：
 *   npc:  'qin'          —— 归属哪个 NPC（talkTo 按此过滤，避免同地点串台）。
 *   when: ['talk']       —— 只在「找该 NPC 搭话」时触发，不参与 enter/action/tick 自动池。
 * 用 stage + storyFlags 锁序、once 防重复。示例：
 *
 *   G.data.events.register({
 *     id: 'qin_s1_1', type: 'story', npc: 'qin', when: ['talk'], once: true, priority: 5,
 *     cond: { stage:{ qin:0 }, flag:{ 'npc.qin.s1_1':false } },   // 警惕阶段、尚未触发
 *     passage: 'qin_s1_1_p1'
 *   });
 *   G.data.story.register({
 *     id: 'qin_s1_1_p1',
 *     text: (s)=>`[npc:qin]老秦[/npc]眯眼打量你……`,
 *     choices: [{ label:'表明来意', fx:{ flag:{ 'npc.qin.s1_1':true }, aff:{ qin:+3 } } }]
 *     // 阶段推进由某个节拍的 fx.stage:{qin:1} 完成（引擎校验只允许 +1），
 *     // 好感到阈值不会自动升阶——保证阶段剧情必看。
 *   });
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  G.engine = G.engine || {};
  G.data = G.data || {};

  // 五阶段（与 docs/NPC设定.md 一致）：stage 存 0–4
  var STAGE_NAMES = ['警惕', '熟识', '信任', '亲密', '羁绊'];
  // 升到该阶段所需的最低好感（stage n 需要好感 >= STAGE_AFF[n]）
  var STAGE_AFF = [0, 20, 40, 60, 80];
  G.STAGE_NAMES = STAGE_NAMES;
  G.STAGE_AFF = STAGE_AFF;

  function S() { return G.state; }

  // ==========================================================================
  // NPC 静态注册表
  // ==========================================================================
  // schedule 每项：{ loc, range?[start,end 分钟，支持跨午夜], weekday?, stageMin? }
  //   range 省略 = 全天在场；weekday 指定 = 仅该星期几（day%7，0=周一）；
  //   stageMin 指定 = 好感阶段达到该值后才在此出现（灰猫据点解锁用）。
  // briefs：按阶段揭露的简介，好感面板取 min(stage, 末项)。
  // likes/dislikes：送礼喜好（对照人设），送礼 +5 / -5，其余道具 +1。
  var NPC = {
    qin: {
      name: '秦烈（老秦）', color: '#4a7fb5', sex: 'm',
      briefs: [
        '前刑警队长，酒吧保安。话少，眼神像在审你。',
        '前刑警队长。白天泡在警局废楼翻旧档案，晚上在酒吧当保安。',
        '前刑警队长。对屠夫帮有私仇——旧部下叛变，杀了他的搭档。',
        '秦烈。封城那年他做过一件至今放不下的事。',
        '秦烈。与你约定共守这座据点的人。'
      ],
      schedule: [
        { loc: 'police', range: [480, 1020] },   // 08:00–17:00
        { loc: 'bar', range: [1140, 120] }        // 19:00–次日02:00
      ],
      likes: ['liquor', 'driedmeat'], dislikes: ['spoiledcan'],
      chat: [
        [
          '[npc:qin]老秦[/npc]上下打量你一眼，没说话，只把手按在腰间。',
          '“少打听，多干活。”[npc:qin]老秦[/npc]把目光移开。',
          '“这年头，信错人是要送命的。”他淡淡地说。'
        ],
        [
          '[npc:qin]老秦[/npc]递给你半支烟：“歇会儿。”',
          '“出门带家伙，别逞能。”他难得多叮嘱一句。',
          '“规矩是给活人定的。”[npc:qin]老秦[/npc]擦着他的枪。'
        ],
        [
          '“有些事，扛着扛着就习惯了。”[npc:qin]老秦[/npc]望向窗外。',
          '“你比我当年那些兵靠谱。”他罕见地夸了一句。',
          '[npc:qin]老秦[/npc]和你碰了下酒杯，什么也没说。'
        ],
        [
          '“留在这儿别乱跑，我看着你。”[npc:qin]老秦[/npc]声音低了些。',
          '他把最后一块干粮塞给你：“你先吃。”',
          '[npc:qin]老秦[/npc]的手在你肩上停了一会儿才收回。'
        ],
        [
          '“只要我还站着，这地方就塌不了。”[npc:qin]老秦[/npc]看着你。',
          '“往后……有我在。”他说得很轻，却很实。',
          '[npc:qin]老秦[/npc]把备用钥匙放进你手心，替你攥紧。'
        ]
      ]
    },
    lin: {
      name: '林晚', color: '#69b0a2', sex: 'f',
      briefs: [
        '外科医生，独守市二医院。收子弹才肯治病。',
        '外科医生。守着一间还能用的手术室，长期失眠。',
        '外科医生。靠镇静剂撑着，濒临崩溃而不自知。',
        '林晚。丈夫在爆发日死在她自己的手术台上。',
        '林晚。把你当成能让她喘口气的唯一理由。'
      ],
      schedule: [
        { loc: 'hospital', range: [360, 120] }    // 06:00–次日02:00（02:00–06:00 睡眠不可打扰）
      ],
      likes: ['sedative', 'vitaminpills'], dislikes: ['liquor'],
      chat: [
        [
          '[npc:lin]林晚[/npc]头也不抬：“没子弹就别占着诊室。”',
          '“伤口自己压住，别乱动。”她语气公事公办。',
          '[npc:lin]林晚[/npc]揉了揉发红的眼睛，转身去洗手。'
        ],
        [
          '“这药三天一次，别贪多。”[npc:lin]林晚[/npc]难得解释了一句。',
          '她看了看你的手：“上次的伤，愈合得不错。”',
          '[npc:lin]林晚[/npc]给自己倒了杯早就凉掉的咖啡。'
        ],
        [
          '“我已经很久没睡过整觉了。”[npc:lin]林晚[/npc]苦笑。',
          '“别把命当筹码乱花。”她盯着你的眼睛。',
          '[npc:lin]林晚[/npc]把听诊器搭上你胸口，动作放轻了。'
        ],
        [
          '“你来的时候，我总算能喘口气。”[npc:lin]林晚[/npc]轻声说。',
          '她替你理了理衣领：“别让我担心。”',
          '[npc:lin]林晚[/npc]靠在你肩上，闭了一会儿眼。'
        ],
        [
          '“有你在，这间手术室才像有人的地方。”[npc:lin]林晚[/npc]说。',
          '“答应我，别死在我够不到的地方。”她握住你的手。',
          '[npc:lin]林晚[/npc]难得睡了个好觉，醒来第一件事是找你。'
        ]
      ]
    },
    mao: {
      name: '灰猫', color: '#a06cc4', sex: 'f',
      briefs: [
        '情报贩子，行踪不定。句句真话掺一句假话。',
        '情报贩子。主要在下水道和码头出没，只信交易。',
        '情报贩子。信任之后能在下水道据点找到她。',
        '灰猫。据说在给「某个买家」收集病毒相关的文件。',
        '沈疏——爆发前是记者。你是她唯一不设防的例外。'
      ],
      schedule: [
        { loc: 'sewer', stageMin: 2 }             // 信任阶段后可在下水道据点找到；此前事件驱动
      ],
      likes: ['chocolatebar', 'liquor'], dislikes: ['spoiledcan'],
      chat: [
        [
          '[npc:mao]灰猫[/npc]勾起嘴角：“情报可不便宜，宝贝。”',
          '“我说的话你只能信一半——猜哪一半，是你的本事。”',
          '[npc:mao]灰猫[/npc]转着一枚子弹壳，眼睛却在打量你。'
        ],
        [
          '“老主顾了，给你打个折。”[npc:mao]灰猫[/npc]眨眨眼。',
          '“别问我从哪知道的，问就是不告诉你。”她笑。',
          '[npc:mao]灰猫[/npc]贴过来压低声音：“有笔好买卖。”'
        ],
        [
          '“下水道的路，我教你走。”[npc:mao]灰猫[/npc]收起了笑。',
          '“信我一次，不亏。”她少见地认真。',
          '[npc:mao]灰猫[/npc]把一张手绘地图塞进你口袋。'
        ],
        [
          '“你这种人，我见一个少一个。”[npc:mao]灰猫[/npc]难得没兜圈子。',
          '“别走太快，等等我。”她拽住你的袖子又松开。',
          '[npc:mao]灰猫[/npc]难得没要报酬，只要你陪她坐一会儿。'
        ],
        [
          '“我叫沈疏。”[npc:mao]灰猫[/npc]第一次对人说了真名。',
          '“你是我唯一不设防的例外。”她轻声说。',
          '[npc:mao]灰猫[/npc]把最新一条情报免费递给你。'
        ]
      ]
    },
    su: {
      name: '苏曼', color: '#c46a8a', sex: 'f',
      briefs: [
        '酒吧老板娘，避风港据点主事人。进门先寄存武器。',
        '酒吧老板娘。风情又精明，定下了店里的禁械规矩。',
        '酒吧老板娘。这间店是亡夫留下的，她守着不肯走。',
        '苏曼。信任之后可以在她这儿寄存物资、打听消息。',
        '苏曼。只带你上过一次酒吧屋顶看日出。'
      ],
      schedule: [
        { loc: 'bar', range: [600, 120] }         // 10:00–次日02:00
      ],
      likes: ['liquor', 'chocolatebar'], dislikes: ['rainwater'],
      chat: [
        [
          '[npc:su]苏曼[/npc]擦着杯子：“进门先把家伙寄存，这是规矩。”',
          '“喝酒可以，闹事出门。”她笑得客气而疏离。',
          '[npc:su]苏曼[/npc]用眼角余光记下了你的每个动作。'
        ],
        [
          '“常客了，这杯算我的。”[npc:su]苏曼[/npc]推来一杯。',
          '“帮我跑趟货？酬劳好商量。”她挑眉。',
          '[npc:su]苏曼[/npc]随手替你添满了酒。'
        ],
        [
          '“这店是我男人留下的。”[npc:su]苏曼[/npc]目光柔了柔。',
          '“有东西寄我这儿，丢不了。”她拍拍柜台。',
          '[npc:su]苏曼[/npc]陪你聊到打烊也没赶你走。'
        ],
        [
          '“今晚别走那么早。”[npc:su]苏曼[/npc]的指尖擦过你手背。',
          '“我这人，看上眼的不多。”她意味深长地笑。',
          '[npc:su]苏曼[/npc]把最里间的位置留给了你。'
        ],
        [
          '“屋顶的日出，我只带你看过。”[npc:su]苏曼[/npc]说。',
          '“这店，有你一半。”她把钥匙拍进你手里。',
          '[npc:su]苏曼[/npc]靠在你怀里数着酒瓶，笑出了声。'
        ]
      ]
    },
    dou: {
      name: '阿豆', color: '#c4a24a', sex: 'm',
      briefs: [
        '机械师，驻加油站。手抖得厉害，一开口先要药。',
        '机械师。技术是真好，就是被药物拖着走。',
        '机械师。想戒又不敢，能教你改装武器。',
        '阿豆。戒断那几天，是他离鬼门关最近的一次。',
        '阿豆。给你改了一件独一份的专属武器。'
      ],
      schedule: [
        { loc: 'gas' }                            // 全天加油站
      ],
      likes: ['sparepart', 'toolkit'], dislikes: ['wildveggie'],
      chat: [
        [
          '[npc:dou]阿豆[/npc]手抖着拧螺丝：“修东西……可以，先给点药。”',
          '“别盯着我看，我没事。”他缩了缩肩。',
          '[npc:dou]阿豆[/npc]额头冒汗，眼神躲闪。'
        ],
        [
          '“这机器的毛病，我一听就知道。”[npc:dou]阿豆[/npc]来了精神。',
          '“你人不错……没催我戒。”他小声说。',
          '[npc:dou]阿豆[/npc]献宝似的给你看他的工具箱。'
        ],
        [
          '“改装的活儿，我教你。”[npc:dou]阿豆[/npc]眼睛亮了。',
          '“我想戒……又不敢。”他低下头。',
          '[npc:dou]阿豆[/npc]把最顺手的一把扳手借给你用。'
        ],
        [
          '“你在的时候，我好像没那么想那东西。”[npc:dou]阿豆[/npc]说。',
          '“别嫌我脏。”他不好意思地擦手。',
          '[npc:dou]阿豆[/npc]留了半块巧克力，非塞给你不可。'
        ],
        [
          '“我给你改了把家伙，独一份。”[npc:dou]阿豆[/npc]咧嘴笑。',
          '“戒断那几天，多亏有你。”他红了眼眶。',
          '[npc:dou]阿豆[/npc]把加油站的钥匙复制了一把给你。'
        ]
      ]
    },
    zhou: {
      name: '周响', color: '#5a9bd4', sex: 'f',
      briefs: [
        '电台主播，驻大学广播站。每周三晚雷打不动地广播。',
        '电台主播。信号很弱，她坚持对着麦克风喊。',
        '电台主播。替幸存者收集留言，次周广播里念出来。',
        '周响。「方舟」的传言从她这里传出，她自己也不确定真假。',
        '周响。愿意为你做一期只有你们俩听的深夜节目。'
      ],
      schedule: [
        { loc: 'campus', range: [480, 1080] },              // 白天大学 08:00–18:00
        { loc: 'campus', range: [1140, 1380], weekday: 2 }  // 周三晚 19:00–23:00 广播
      ],
      likes: ['battery', 'chocolatebar'], dislikes: ['liquor'],
      chat: [
        [
          '[npc:zhou]周响[/npc]对着麦克风：“……稍等，先确认你不是来砸设备的。”',
          '“信号很弱，但总得有人喊。”她扶了扶耳机。',
          '[npc:zhou]周响[/npc]警惕地把天线往身后挪了挪。'
        ],
        [
          '“帮我找节电池？广播不能断。”[npc:zhou]周响[/npc]恳求。',
          '“有人在听，我就知道。”她笑着说。',
          '[npc:zhou]周响[/npc]把耳机分你一只：“听，是海风。”'
        ],
        [
          '“想留句话吗？下周我替你念。”[npc:zhou]周响[/npc]递来纸笔。',
          '“方舟的传言……我也不确定。”她压低声音。',
          '[npc:zhou]周响[/npc]把你的名字记进了留言簿。'
        ],
        [
          '“今晚这期，是念给你的。”[npc:zhou]周响[/npc]脸微红。',
          '“别关电台，也别离我太远。”她说。',
          '[npc:zhou]周响[/npc]靠着你听完了整首歌。'
        ],
        [
          '“做期只有我俩听的节目，好不好？”[npc:zhou]周响[/npc]眼里有光。',
          '“你是我最长情的一位听众。”她轻声说。',
          '[npc:zhou]周响[/npc]关掉话筒，只对你一个人说话。'
        ]
      ]
    },
    zhao: {
      name: '赵铁', color: '#b57b4a', sex: 'm',
      briefs: [
        '武装商人，驻惠民超市。只认子弹，赊账免谈。',
        '武装商人。守信，讲信用的人他记得住。',
        '武装商人。信任之后对你开放高级货架。',
        '赵铁。屠夫帮来收过保护费，那次是你替他挡的。',
        '赵铁。囤这么多货，是给死去的女儿留的执念。'
      ],
      schedule: [
        { loc: 'market', range: [480, 1200] }     // 08:00–20:00
      ],
      likes: ['driedmeat', 'liquor'], dislikes: ['rainwater'],
      chat: [
        [
          '[npc:zhao]赵铁[/npc]拍拍柜台：“这儿只认子弹，赊账免谈。”',
          '“看好了再买，概不退换。”他抱着胳膊。',
          '[npc:zhao]赵铁[/npc]用秤砣一样的目光称量着你。'
        ],
        [
          '“老主顾，给你留了点好货。”[npc:zhao]赵铁[/npc]压低声音。',
          '“讲信用的人，我记得住。”他点头。',
          '[npc:zhao]赵铁[/npc]多塞给你一发子弹当添头。'
        ],
        [
          '“高级货架，对你开。”[npc:zhao]赵铁[/npc]挪开了挡板。',
          '“上回屠夫帮来收保护费，多谢你。”他闷声说。',
          '[npc:zhao]赵铁[/npc]破例请你喝了口他私藏的酒。'
        ],
        [
          '“缺什么直接说，钱的事往后放。”[npc:zhao]赵铁[/npc]难得松口。',
          '“你把这儿当自己家。”他别扭地说。',
          '[npc:zhao]赵铁[/npc]给你留了张躺椅歇脚。'
        ],
        [
          '“我囤这些……是给我闺女的。”[npc:zhao]赵铁[/npc]声音发哑。',
          '“认识你，是这世道少有的好事。”他说。',
          '[npc:zhao]赵铁[/npc]把账本推给你看，再无保留。'
        ]
      ]
    },
    chen: {
      name: '陈神父', color: '#8a8a7c', sex: 'm',
      briefs: [
        '圣心教堂的神父。进门先把武器留在门口。',
        '神父。倾听告解，也能让人的心安定下来。',
        '神父。埋过很多人，记得他们每一个名字。',
        '陈神父。你常来，这位老人也有了念想。',
        '陈神父。无论你做过什么，他都为你赦免。'
      ],
      schedule: [
        { loc: 'church', range: [360, 1320] }     // 06:00–22:00
      ],
      likes: ['herbaltea', 'vitaminpills'], dislikes: ['liquor'],
      chat: [
        [
          '[npc:chen]陈神父[/npc]颔首：“进来歇脚吧，这里不问来历。”',
          '“把武器留在门口，主的屋檐下无需刀兵。”他温和地说。',
          '[npc:chen]陈神父[/npc]为你划了个十字。'
        ],
        [
          '“心里有事，说出来会轻些。”[npc:chen]陈神父[/npc]倾听着。',
          '“活着本身，就是一种祈祷。”他说。',
          '[npc:chen]陈神父[/npc]递给你一杯温水。'
        ],
        [
          '“我埋过很多人，也记得他们每一个。”[npc:chen]陈神父[/npc]低声说。',
          '“别让恨占满你的心。”他注视着你。',
          '[npc:chen]陈神父[/npc]又为逝者点了一支蜡烛。'
        ],
        [
          '“你常来，我这把老骨头也有了念想。”[npc:chen]陈神父[/npc]笑。',
          '“累了就回来，门一直开着。”他说。',
          '[npc:chen]陈神父[/npc]把最好的位置留给你祷告。'
        ],
        [
          '“你让我信，善还没走远。”[npc:chen]陈神父[/npc]眼中含泪。',
          '“无论你做过什么，这里都赦免你。”他说。',
          '[npc:chen]陈神父[/npc]将一枚旧十字架挂到你颈上。'
        ]
      ]
    },
    cai: {
      name: '老蔡', color: '#6a8a8a', sex: 'm',
      briefs: [
        '码头流浪汉，看似疯癫。用食物换他一句话。',
        '流浪汉。疯话里偶尔藏着准得吓人的情报。',
        '流浪汉。有些话他只说给他觉得「眼睛干净」的人听。',
        '老蔡。守着一条永远不会来的船。',
        '老蔡。把守了半辈子的秘密，讲给了你。'
      ],
      schedule: [
        { loc: 'dock' }                           // 全天码头
      ],
      likes: ['cannedfood', 'riceball'], dislikes: ['scrapmetal'],
      chat: [
        [
          '[npc:cai]老蔡[/npc]咧开缺牙的嘴：“给口吃的，我给你说个准的。”',
          '“船……船要来了，你信不信？”他喃喃。',
          '[npc:cai]老蔡[/npc]突然盯着你身后，又忽然笑了。'
        ],
        [
          '“拿东西换东西，公道。”[npc:cai]老蔡[/npc]摊开破布包。',
          '“昨天有群人往北去了，你别去。”他压低声音。',
          '[npc:cai]老蔡[/npc]把捡来的小玩意儿一件件摆给你看。'
        ],
        [
          '“你这人，眼睛干净。”[npc:cai]老蔡[/npc]点点头。',
          '“有些话，我只说给听得懂的人。”他神秘地笑。',
          '[npc:cai]老蔡[/npc]分了半个馒头给你。'
        ],
        [
          '“坐会儿，陪老头子看海。”[npc:cai]老蔡[/npc]拍拍身边的石墩。',
          '“你来，我这一天就不算白过。”他说。',
          '[npc:cai]老蔡[/npc]把珍藏的旧照片给你看了一眼。'
        ],
        [
          '“船不会来了，我早知道。”[npc:cai]老蔡[/npc]忽然清醒地说。',
          '“可你来了，也一样。”他浑浊的眼睛笑成一条缝。',
          '[npc:cai]老蔡[/npc]把守了半辈子的秘密，讲给你听。'
        ]
      ]
    },
    fang: {
      name: '方哨', color: '#5c8a6a', sex: 'm',
      briefs: [
        '检查站废墟的逃兵，枪不离手。差点朝你开枪。',
        '逃兵。紧张兮兮，能跟你换弹药。',
        '逃兵。撤离那晚他逃跑了，怕你说出去。',
        '方哨。有你在，他睡得踏实一点。',
        '方哨。把随身的军牌解下来交给了你。'
      ],
      schedule: [
        { loc: 'checkpoint' }                     // 全天检查站
      ],
      likes: ['driedmeat', 'painkiller'], dislikes: ['liquor'],
      chat: [
        [
          '[npc:fang]方哨[/npc]枪口一抬又放下：“别过来！……你、你想干嘛？”',
          '“站住，报身份！”他声音发颤。',
          '[npc:fang]方哨[/npc]死死攥着枪，指节发白。'
        ],
        [
          '“换弹药吗？我这儿……还有点。”[npc:fang]方哨[/npc]警惕地问。',
          '“你不像坏人。”他稍稍放下了枪。',
          '[npc:fang]方哨[/npc]紧张地清点着他的子弹。'
        ],
        [
          '“那天晚上……我跑了。”[npc:fang]方哨[/npc]低下头。',
          '“你别告诉别人，行吗？”他哀求。',
          '[npc:fang]方哨[/npc]难得肯把枪收进枪套。'
        ],
        [
          '“有你在，我睡得踏实点。”[npc:fang]方哨[/npc]小声说。',
          '“别嫌我没用。”他攥紧了拳头。',
          '[npc:fang]方哨[/npc]把哨位旁最安全的角落让给你。'
        ],
        [
          '“再有事，我不跑了，我替你挡。”[npc:fang]方哨[/npc]红着脸说。',
          '“你是第一个没把我当逃兵的人。”他哽咽。',
          '[npc:fang]方哨[/npc]把随身的军牌解下来交给你。'
        ]
      ]
    }
  };

  // 挂载静态数据（真实数据覆盖 _demo.js 的占位；若 _demo.js 仍在则以此为准）
  G.data.npcs = G.data.npcs || {};
  Object.keys(NPC).forEach(function (id) { G.data.npcs[id] = NPC[id]; });

  function def(id) { return NPC[id] || null; }
  function nstate(id) { return S() && S().npcs ? S().npcs[id] : null; }

  // ==========================================================================
  // 作息与在场判定
  // ==========================================================================
  function presentNow(id, locId) {
    var d = def(id), n = nstate(id);
    if (!d || !n || !n.alive) return false;   // 死亡/离场：全部入口关闭
    var p = S().player, sch = d.schedule || [];
    for (var i = 0; i < sch.length; i++) {
      var slot = sch[i];
      if (slot.loc !== locId) continue;
      if (slot.weekday != null && (p.day % 7) !== slot.weekday) continue;
      if (slot.stageMin != null && n.stage < slot.stageMin) continue;
      if (slot.range && !G.engine.inTimeRange(p.minute, slot.range)) continue;
      return true;
    }
    return false;
  }
  function npcsAt(locId) {
    var ids = G.NPC_IDS || Object.keys(NPC);
    return ids.filter(function (id) { return NPC[id] && presentNow(id, locId); });
  }
  G.engine.npcsAt = npcsAt;
  G.engine.npcAt = npcsAt;   // 任务书命名别名
  G.engine.npcPresent = presentNow;

  // ==========================================================================
  // 好感 / 阶段查询
  // ==========================================================================
  function stageName(id) {
    var st = G.engine.stageGet(id);
    return STAGE_NAMES[st] || STAGE_NAMES[0];
  }
  function affNeededForNext(id) {
    var st = G.engine.stageGet(id);
    return st >= STAGE_AFF.length - 1 ? null : STAGE_AFF[st + 1];
  }
  // 好感已达下一阶段阈值、但阶段尚未推进（升阶须由剧情 fx.stage 完成）
  function affinityReadyToAdvance(id) {
    var need = affNeededForNext(id);
    return need != null && G.engine.affGet(id) >= need;
  }
  G.engine.stageName = stageName;
  G.engine.affNeededForNext = affNeededForNext;
  G.engine.affinityReadyToAdvance = affinityReadyToAdvance;

  function pronoun(id) { var d = def(id); return d && d.sex === 'f' ? '她' : '他'; }

  // 搭话入口提示态（好感面板 / 未来的搭话按钮用）
  function talkHint(id) {
    var n = nstate(id); if (!n) return '';
    if (!n.alive) return '——';
    var st = n.stage, ta = pronoun(id);
    var story = findTalkStory(id);
    if (story) return ta + '似乎有话想说。';
    if (st >= STAGE_AFF.length - 1) return '你们之间已无需多言。';
    var need = STAGE_AFF[st + 1], aff = G.engine.affGet(id);
    if (aff >= need) return '好感已足，只差一个契机。';
    return '距离「' + STAGE_NAMES[st + 1] + '」还差好感 ' + (need - aff) + '。';
  }
  G.engine.talkHint = talkHint;

  // ==========================================================================
  // 剧情入口调度：搭话时优先可触发的 story 事件（when 含 'talk'、按 npc 归属过滤）
  // ==========================================================================
  function betterEvent(a, b) {
    var pa = a.priority || 0, pb = b.priority || 0;
    if (pa !== pb) return pa > pb;
    return (a._order || 0) < (b._order || 0);
  }
  function storyEligible(ev) {
    var s = S();
    s.world._once = s.world._once || {};
    s.world.cooldowns = s.world.cooldowns || {};
    if (ev.once && s.world._once[ev.id]) return false;
    var cd = s.world.cooldowns[ev.id];
    if (cd && G.engine.absMinute() < cd) return false;
    if (!G.engine.checkCond(ev.cond)) return false;
    return true;
  }
  function findTalkStory(id) {
    if (!G.data.events || !G.data.events.all) return null;
    var all = G.data.events.all(), best = null;
    for (var i = 0; i < all.length; i++) {
      var ev = all[i];
      if (ev.type !== 'story' || ev.npc !== id) continue;
      var w = ev.when || [];
      if (w.indexOf('talk') < 0) continue;
      if (!storyEligible(ev)) continue;
      if (!best || betterEvent(ev, best)) best = ev;
    }
    return best;
  }
  function fireTalkStory(ev) {
    var s = S(), now = G.engine.absMinute();
    s.world._once = s.world._once || {};
    if (ev.once) s.world._once[ev.id] = true;
    if (ev.cooldown) s.world.cooldowns[ev.id] = now + ev.cooldown;
    if (ev.passage) G.engine.openPassage(ev.passage);
    return ev;
  }

  // ==========================================================================
  // 日常搭话（每 NPC 每日一次 +1~2 好感，短文本按阶段分层）
  // ==========================================================================
  // 一个复用的动态段落：正文取自 state._talkLine（易失，不入档也无妨）
  if (G.data.story && G.data.story.register) {
    G.data.story.register({
      id: 'npc_daily_talk',
      text: function (s) { return (s && s._talkLine) || '……'; },
      choices: [{ label: '（离开）', fx: {} }]
    });
  }

  function pickLine(pool, n, key) {
    if (!pool || !pool.length) return '……';
    if (pool.length === 1) return pool[0];
    var last = n.vars[key], i = Math.floor(Math.random() * pool.length);
    if (pool[i] === last) i = (i + 1) % pool.length;
    n.vars[key] = pool[i];
    return pool[i];
  }
  function showTalkLine(line) {
    S()._talkLine = line;
    if (G.engine.openPassage) G.engine.openPassage('npc_daily_talk');
  }
  function toast(msg) { if (G.ui && G.ui.toast) G.ui.toast(msg); }

  function dailyChat(id) {
    var d = def(id), n = nstate(id), p = S().player;
    var tier = Math.min(n.stage, d.chat.length - 1);
    var line = pickLine(d.chat[tier], n, 'chatIdx');
    if (n.vars.lastChatDay === p.day) {
      // 今天已互动过：仍给一句话，但不再加好感
      showTalkLine(line);
      return { ok: true, gain: 0 };
    }
    n.vars.lastChatDay = p.day;
    var gain = 1 + (Math.random() < 0.5 ? 0 : 1);   // +1~2
    G.engine.affAdd(id, gain);
    showTalkLine(line);
    toast('对' + d.name + '的好感 +' + gain);
    return { ok: true, gain: gain };
  }

  // 搭话主入口
  function talkTo(id) {
    var d = def(id), n = nstate(id);
    if (!d || !n) { console.warn('[npcs] 未知 NPC:', id); return null; }
    if (!n.alive) { toast(d.name + '已经不在了。'); return null; }
    n.met = true;                                   // 搭话即认识
    var ev = findTalkStory(id);
    if (ev) return fireTalkStory(ev);
    return dailyChat(id);
  }
  G.engine.talkTo = talkTo;

  // ==========================================================================
  // 送礼（每 NPC 每日一次，喜好 +5 / 厌恶 -5 / 其余 +1）
  // ==========================================================================
  function npcGiftLikes(id) {
    var d = def(id) || {};
    return { likes: (d.likes || []).slice(), dislikes: (d.dislikes || []).slice() };
  }
  G.engine.npcGiftLikes = npcGiftLikes;

  function giftItem(id, itemId) {
    var d = def(id), n = nstate(id), p = S().player;
    if (!d || !n) return { ok: false, msg: '找不到这个人。' };
    if (!n.alive) return { ok: false, msg: d.name + '已经不在了。' };
    if (n.vars.lastGiftDay === p.day) return { ok: false, msg: '今天已经送过一次了。' };
    if (!G.engine.hasItem(itemId)) return { ok: false, msg: '你没有这件东西。' };

    var idef = G.engine.itemDef(itemId) || {};
    var iname = idef.name || itemId, delta, reaction;
    if (d.likes.indexOf(itemId) >= 0) { delta = 5; reaction = 'like'; }
    else if (d.dislikes.indexOf(itemId) >= 0) { delta = -5; reaction = 'dislike'; }
    else { delta = 1; reaction = 'plain'; }

    G.engine.removeItem(itemId, 1);
    G.engine.affAdd(id, delta);
    n.vars.lastGiftDay = p.day;
    n.met = true;

    var tag = '[npc:' + id + ']' + d.name + '[/npc]';
    var itag = '[item]' + iname + '[/item]';
    var sign = (delta > 0 ? '+' : '') + delta;
    var msg;
    if (reaction === 'like') msg = tag + '接过' + itag + '，眼神软了一瞬：“……有心了。”（好感 ' + sign + '）';
    else if (reaction === 'dislike') msg = '你递上' + itag + '，' + tag + '皱眉推开：“这东西我用不上。”（好感 ' + sign + '）';
    else msg = tag + '接过' + itag + '，点了点头：“谢了。”（好感 ' + sign + '）';

    return { ok: true, delta: delta, reaction: reaction, msg: msg };
  }
  G.engine.giftItem = giftItem;

  // ==========================================================================
  // 好感面板（在 G.ui 下新增并登记；入口见 render.js 底部导航「关系」）
  // ==========================================================================
  function affBar(aff) {
    var pct = G.engine.clamp(aff, 0, 100);          // 负好感显示为空条
    var wrap = G.ui._h('div', { style: { height: '6px', background: 'rgba(255,255,255,.08)', borderRadius: '3px', overflow: 'hidden', margin: '4px 0' } });
    wrap.appendChild(G.ui._h('div', { style: { height: '100%', width: pct + '%', background: aff < 0 ? '#8e2f22' : '#c4a24a' } }));
    return wrap;
  }

  function chooseGift(id, onDone) {
    var h = G.ui._h;
    var inv = S().player.inventory.filter(function (e) {
      var idef = G.engine.itemDef(e.id);
      return idef && idef.type !== 'weapon' && idef.type !== 'key';
    });
    var ov = G.ui.openOverlay({
      title: '送给' + def(id).name,
      build: function (body) {
        if (!inv.length) { body.appendChild(h('div', { class: 'inv-empty', text: '没有可以送的东西。' })); return; }
        var likes = def(id).likes || [], dislikes = def(id).dislikes || [];
        inv.forEach(function (e) {
          var idef = G.engine.itemDef(e.id) || {};
          var row = h('div', { class: 'shop-item' });
          var hint = likes.indexOf(e.id) >= 0 ? ' ♥' : (dislikes.indexOf(e.id) >= 0 ? ' ✗' : '');
          row.appendChild(h('span', { text: (idef.name || e.id) + '×' + e.count + hint }));
          row.appendChild(h('button', {
            class: 'btn', text: '送出', onclick: function () {
              var res = giftItem(id, e.id);
              toast(res.msg ? G.ui.tags.strip(res.msg) : (res.ok ? '已送出' : '送礼失败'));
              ov.close();
              if (onDone) onDone();
            }
          }));
          body.appendChild(row);
        });
      }
    });
  }

  function openNpcPanel() {
    var h = G.ui._h;
    // 关掉可能已开的其它浮层，避免堆叠（本面板走 openOverlay，不经 panels.js 的 activeOverlay）
    var ex = (typeof document !== 'undefined') ? document.querySelectorAll('.overlay') : [];
    for (var i = 0; i < ex.length; i++) if (ex[i].parentNode) ex[i].parentNode.removeChild(ex[i]);

    G.ui.openOverlay({
      title: '关系',
      build: function (body) {
        var here = S().player.location;
        var met = (G.NPC_IDS || Object.keys(NPC)).filter(function (id) {
          var n = nstate(id); return NPC[id] && n && n.met;
        });
        if (!met.length) {
          body.appendChild(h('div', { class: 'inv-empty', text: '你还没有认识任何人。' }));
          return;
        }
        met.forEach(function (id) {
          var d = def(id), n = nstate(id);
          var card = h('div', { class: 'slot-card' });
          var head = h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' } });
          var nameEl = h('span', { text: d.name, style: { color: G.ui.tags.npcColor(id), fontWeight: '600' } });
          var stageEl = h('span', { text: (n.alive ? G.engine.stageName(id) : '已离场') + (n.alive && G.engine.affinityReadyToAdvance(id) ? ' ▲' : ''), style: { fontSize: '12px', color: 'var(--fg-dim)' } });
          head.appendChild(nameEl); head.appendChild(stageEl);
          card.appendChild(head);
          card.appendChild(h('div', { class: 'slot-summary', text: '好感 ' + G.engine.affGet(id) + '　' + G.engine.stageName(id), style: { marginTop: '2px' } }));
          card.appendChild(affBar(G.engine.affGet(id)));
          // 分层简介
          var brief = d.briefs[Math.min(n.stage, d.briefs.length - 1)];
          card.appendChild(h('div', { class: 'slot-summary', text: brief, style: { opacity: '.85' } }));
          // 提示态
          if (n.alive) card.appendChild(h('div', { class: 'slot-summary', text: G.engine.talkHint(id), style: { color: G.engine.affinityReadyToAdvance(id) ? 'var(--accent)' : 'var(--fg-dim)' } }));
          // 送礼喜好（熟识起揭示）
          if (n.stage >= 1) {
            var likeNames = (d.likes || []).map(function (iid) { var x = G.engine.itemDef(iid); return x ? x.name : iid; }).join('、');
            card.appendChild(h('div', { class: 'slot-summary', text: '似乎喜欢：' + likeNames, style: { fontSize: '12px', opacity: '.7' } }));
          }
          // 行动：仅当 NPC 当前在场时可搭话/送礼
          if (n.alive && G.engine.npcPresent(id, here)) {
            var acts = h('div', { class: 'slot-actions' });
            acts.appendChild(h('button', {
              class: 'btn primary', text: '搭话', onclick: function () {
                var ex2 = document.querySelectorAll('.overlay');
                for (var k = 0; k < ex2.length; k++) if (ex2[k].parentNode) ex2[k].parentNode.removeChild(ex2[k]);
                G.engine.talkTo(id);
              }
            }));
            var gifted = n.vars.lastGiftDay === S().player.day;
            acts.appendChild(h('button', {
              class: 'btn', text: gifted ? '今日已送礼' : '送礼',
              onclick: gifted ? null : function () { chooseGift(id, openNpcPanel); }
            }));
            card.appendChild(acts);
          }
          body.appendChild(card);
        });
      }
    });
  }
  G.ui = G.ui || {};
  G.ui.showRelations = openNpcPanel;
  // 挂到 panels 命名空间，让 render.js 的底部导航 open('npc') 能路由到本面板
  if (G.ui.panels && G.ui.panels.open) {
    var _origOpen = G.ui.panels.open;
    G.ui.panels.open = function (name) {
      if (name === 'npc') return openNpcPanel();
      return _origOpen(name);
    };
    G.ui.panels.openNpc = openNpcPanel;
  }

})();
