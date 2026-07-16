/* =============================================================================
 * lin.js — 林晚剧情·前半（M5：警惕→熟识→信任）
 * -----------------------------------------------------------------------------
 * 节拍一览（flag 均存 npc.lin.*）：
 *   警惕（stage 0）
 *     lin_s0_1  求医初遇，收子弹才治病（enter/talk @hospital）
 *     lin_s0_2  委托：取回社区诊所的药品箱（talk；接受写 fetch）
 *     lin_s0_3  居民区地下室取药品箱（enter/action @residential，发 lin_medbox）
 *     lin_s0_4  交还药品箱，改观（talk，需持有 lin_medbox；报酬抗生素+绷带）
 *     lin_s0_5  升阶→熟识：她记下你的名字（talk，需好感≥20，fx.stage）
 *   熟识（stage 1）
 *     lin_s1_1  教包扎（talk，发 skill:bandage）
 *     lin_s1_2  小葬礼（enter/action @hospital 黄昏）
 *     lin_s1_3  手术搭手 + 升阶→信任（enter/action/talk，需好感≥40，fx.stage）
 *   信任（stage 2）
 *     lin_s2_1  镇静剂戒断发作，主角照料（enter/action @hospital；给药或陪护分支）
 *     lin_s2_2  吐露丈夫死于她手术台（talk，深夜）
 *     lin_s2_3  依赖倾向铺垫 + 日历约定（talk；M6 接 stage 3 与成人内容）
 *   附：lin_promise_1 —— s2_3 约定到期的日历事件（when:[]，只由 appointment 强制触发）
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  var story = G.data.story, events = G.data.events;

  function P(id, text, choices) { story.register({ id: id, text: text, choices: choices }); }
  var LIN_HOURS = [360, 120];    // 林晚可打扰时段 06:00–次日02:00

  // ==========================================================================
  // 警惕（stage 0）
  // ==========================================================================

  // ---- lin_s0_1 求医初遇 ----------------------------------------------------
  events.register({
    id: 'lin_s0_1', type: 'story', npc: 'lin', when: ['enter', 'talk'], once: true, priority: 8,
    cond: { loc: 'hospital', timeRange: LIN_HOURS, stage: { lin: 0 }, flag: { 'intro.done': true, 'npc.lin.s0_1': false } },
    passage: 'lin_s0_1_p1'
  });

  P('lin_s0_1_p1',
    function (s) {
      s.npcs.lin.met = true;
      return '市二医院的走廊灯只亮着一半，消毒水味压不住底下的腐味。诊室里，[npc:lin]林晚[/npc]背对着你在洗手，白大褂外面套着毛衣，听见脚步声她头也不回：“外伤坐右边，急症直接说，付不起[item]子弹[/item]的现在就可以出去。”';
    },
    [
      { label: '付五发子弹，请她看看头上的伤', cond: { has: { bullets: 5 } }, fx: { bullets: -5, goto: 'lin_s0_1_p2' } },
      { label: '说自己只是路过，想认认路', fx: { goto: 'lin_s0_1_p2b' } }
    ]);

  P('lin_s0_1_p2',
    '[npc:lin]林晚[/npc]拆开你头上的绷带，手指很稳，动作快得近乎冷淡。“结打得外行，清创倒做得不坏，你运气好。”她重新上药、加压、打结，一套下来不到五分钟，末了抬起你的下巴看了看瞳孔，“有头晕呕吐就再来，别硬扛——死在外面，浪费我这五发子弹的手艺。”',
    [{ label: '道谢离开', fx: { stat: { hp: 15 }, aff: { lin: 3 }, flag: { 'npc.lin.s0_1': true }, milestone: '初遇林晚' } }]);

  P('lin_s0_1_p2b',
    '“这里不是据点，是医院。”[npc:lin]林晚[/npc]擦干手转过身，你这才看清她眼下的乌青，浓得像淤血。“不看病就别占地方。出门左转是走廊，走廊尽头是大门。”她说完便低头去理器械盘，你在她的世界里已经不存在了。',
    [{ label: '退出诊室', fx: { flag: { 'npc.lin.s0_1': true }, milestone: '初遇林晚' } }]);

  // ---- lin_s0_2 委托：药品箱 ------------------------------------------------
  events.register({
    id: 'lin_s0_2', type: 'story', npc: 'lin', when: ['talk'], once: false, cooldown: 1440, priority: 5,
    cond: { stage: { lin: 0 }, flag: { 'npc.lin.s0_1': true, 'npc.lin.s0_2': false } },
    passage: 'lin_s0_2_p1'
  });

  P('lin_s0_2_p1',
    '[npc:lin]林晚[/npc]叫住你，这是她头一回主动开口。“社区诊所的地下室锁着一只[item]药品箱[/item]，撤离那年药房主任搬过去的，贴着封条。”她的目光落在你身上，像在评估一件器械的成色，“我的病人离不得人，你腿脚快。取回来，报酬是抗生素和绷带，外加往后小伤不收你子弹。”',
    [
      { label: '接下这趟跑腿', fx: { flag: { 'npc.lin.s0_2': true, 'npc.lin.fetch': true }, aff: { lin: 2 }, appointment: { inDays: 2, minute: 1020, label: '替林晚取回药品箱' }, goto: 'lin_s0_2_p2' } },
      { label: '问清楚地下室里有什么', fx: { goto: 'lin_s0_2_p1q' } },
      { label: '现在没空', fx: {} }
    ]);

  P('lin_s0_2_p1q',
    '“不知道。”[npc:lin]林晚[/npc]回答得干脆，“三个月没人下去过，可能什么都没有，也可能有东西住下了。”她顿了顿，补上一句，“怕就别去，我另找人——只是这城里肯跑腿的，死得比病人还快。”',
    [
      { label: '接下这趟跑腿', fx: { flag: { 'npc.lin.s0_2': true, 'npc.lin.fetch': true }, aff: { lin: 2 }, appointment: { inDays: 2, minute: 1020, label: '替林晚取回药品箱' }, goto: 'lin_s0_2_p2' } },
      { label: '还是算了', fx: {} }
    ]);

  P('lin_s0_2_p2',
    '“诊所在居民区南口，卷帘门后面有楼梯下地下室。”[npc:lin]林晚[/npc]在处方笺背面画了个简图，“箱子是军绿色，锁我有钥匙。你只管搬回来，别在里面翻——封条破了，药就作废一半。”',
    [{ label: '收好简图', fx: {} }]);

  // ---- lin_s0_3 地下室取药品箱 ----------------------------------------------
  events.register({
    id: 'lin_s0_3', type: 'story', npc: 'lin', when: ['enter', 'action'], once: true, priority: 7,
    cond: { loc: 'residential', flag: { 'npc.lin.fetch': true, 'npc.lin.s0_3': false } },
    passage: 'lin_s0_3_p1'
  });

  P('lin_s0_3_p1',
    '社区诊所的卷帘门锈死了大半，你从底下的缝里钻进去。候诊椅蒙着灰，输液架东倒西歪，通往地下室的楼梯口张着黑洞洞的嘴，一股潮湿的霉味从底下漫上来，里面掺着一点说不清的甜腥。',
    [
      { label: '贴着墙，慢慢摸下去', fx: { stat: { sanity: -3 }, time: 15, goto: 'lin_s0_3_p2' } },
      { label: '先朝楼梯口扔块石头探动静', fx: { time: 10, goto: 'lin_s0_3_p2b' } }
    ]);

  P('lin_s0_3_p2',
    '地下室比想象的大，两排药架翻倒在地，碎玻璃在微光里闪。最里侧的铁架后面传来指甲刮水泥的声音——有个东西被架子压住了半边身子，正朝你的方向扭。军绿色的[item]药品箱[/item]就在它够不到的墙角。',
    [
      { label: '绕开它，把箱子拖出来', fx: { stat: { sanity: -2 }, time: 15, item: { lin_medbox: 1 }, flag: { 'npc.lin.s0_3': true }, goto: 'lin_s0_3_p3' } },
      { label: '先给它个痛快', fx: { combat: 'zombie_shambler', goto: 'lin_s0_3_p2c' } }
    ]);

  P('lin_s0_3_p2b',
    '石头滚下楼梯，声音在底下荡了几圈，黑暗里响起指甲刮水泥的动静，又慢慢停了。听动静只有一个，还被什么绊着。你捏紧武器下了楼梯，军绿色的[item]药品箱[/item]躺在墙角，封条完好。',
    [
      { label: '绕开那动静，把箱子拖出来', fx: { stat: { sanity: -2 }, time: 15, item: { lin_medbox: 1 }, flag: { 'npc.lin.s0_3': true }, goto: 'lin_s0_3_p3' } },
      { label: '先解决了它再搬', fx: { combat: 'zombie_shambler', goto: 'lin_s0_3_p2c' } }
    ]);

  P('lin_s0_3_p2c',
    '地下室重新静下来。你把翻倒的铁架挪开，墙角的[item]药品箱[/item]分量不轻，封条完好，锁也没被动过。',
    [{ label: '扛起箱子出去', fx: { item: { lin_medbox: 1 }, flag: { 'npc.lin.s0_3': true }, goto: 'lin_s0_3_p3' } }]);

  P('lin_s0_3_p3',
    '你把箱子扛上肩，里面的玻璃瓶随着脚步轻轻磕碰，像一串闷在铁皮里的风铃。回到街面时天光晃得你眯起眼，你加快脚步往医院走——这一箱，能救的命不止一条。',
    [{ label: '送回医院', fx: {} }]);

  // ---- lin_s0_4 交还药品箱 --------------------------------------------------
  events.register({
    id: 'lin_s0_4', type: 'story', npc: 'lin', when: ['talk'], once: true, priority: 5,
    cond: { stage: { lin: 0 }, flag: { 'npc.lin.s0_3': true, 'npc.lin.s0_4': false }, has: { item: 'lin_medbox' } },
    passage: 'lin_s0_4_p1'
  });

  P('lin_s0_4_p1',
    '[npc:lin]林晚[/npc]开锁的动作很轻，箱盖掀开的一瞬，她整个人静了半秒。安瓿、西林瓶、成排的[med]镇静剂[/med]码得整整齐齐，她伸手数了一遍，又数了第二遍，指尖在其中一格上停了停才收回来。“都在。”她说，嗓音比平时低，“辛苦你了。”',
    [
      { label: '收下报酬，问那一格是什么药', fx: { item: { lin_medbox: -1, antibiotics: 1, bandage: 2 }, aff: { lin: 8 }, goto: 'lin_s0_4_p2q' } },
      { label: '收下报酬，什么都不问', fx: { item: { lin_medbox: -1, antibiotics: 1, bandage: 2 }, aff: { lin: 9 }, goto: 'lin_s0_4_p2' } }
    ]);

  P('lin_s0_4_p2q',
    '“麻醉和镇静类，手术离不开的东西。”[npc:lin]林晚[/npc]把那一格单独取出来锁进诊台抽屉，钥匙贴身收好，动作快得不容追问。“[med]抗生素[/med]和绷带拿好，答应你的——往后小伤，不收你子弹。”',
    [{ label: '道谢', fx: { flag: { 'npc.lin.s0_4': true } } }]);

  P('lin_s0_4_p2',
    '[npc:lin]林晚[/npc]把[med]抗生素[/med]和绷带放进你手里，第一次正眼看你超过三秒。“会跑腿，不多嘴。”她像在下诊断，“这城里这样的人快绝种了。往后小伤来找我，不收你子弹。”',
    [{ label: '道谢', fx: { flag: { 'npc.lin.s0_4': true } } }]);

  // ---- lin_s0_5 升阶→熟识 ---------------------------------------------------
  events.register({
    id: 'lin_s0_5', type: 'story', npc: 'lin', when: ['talk'], once: true, priority: 6,
    cond: { stage: { lin: 0 }, flag: { 'npc.lin.s0_4': true, 'npc.lin.s0_5': false }, aff: { lin: { gte: 20 } } },
    passage: 'lin_s0_5_p1'
  });

  P('lin_s0_5_p1',
    '“坐下，我看看你的头。”[npc:lin]林晚[/npc]拆开旧敷料，这次的动作明显放轻了。“愈合得不错，不会留太大的疤。”她替你换着药，忽然问，“你叫什么？病历上总不能一直写「付得起子弹的」。”',
    [{ label: '报上名字', fx: { goto: 'lin_s0_5_p2' } }]);

  P('lin_s0_5_p2',
    function (s) {
      var name = (s && s.player && s.player.name) || '无名氏';
      return '“' + name + '。”[npc:lin]林晚[/npc]在一张皱巴巴的病历卡上写下你的名字，字迹清瘦。“记住复诊时间，别让我去外面收尸。”她把病历卡插进诊台的铁盒——你注意到盒里没剩几张卡片，活着的病人，是这间医院最稀缺的东西。';
    },
    [{ label: '（离开）', fx: { stage: { lin: 1 }, aff: { lin: 3 }, flag: { 'npc.lin.s0_5': true }, milestone: '林晚记下了你的名字' } }]);

  // ==========================================================================
  // 熟识（stage 1）
  // ==========================================================================

  // ---- lin_s1_1 教包扎 ------------------------------------------------------
  events.register({
    id: 'lin_s1_1', type: 'story', npc: 'lin', when: ['talk'], once: true, priority: 5,
    cond: { stage: { lin: 1 }, flag: { 'npc.lin.s1_1': false } },
    passage: 'lin_s1_1_p1'
  });

  P('lin_s1_1_p1',
    '[npc:lin]林晚[/npc]把一卷绷带和半瓶[med]碘伏[/med]拍在诊台上：“你总往外跑，靠我不如靠自己，今天教你包扎——学会了，能多活几次。”她挽起袖子在自己小臂上演示，“先清创，再加压，打结避开伤口正上方。看清了？”',
    [{ label: '跟着她练', fx: { time: 60, stat: { energy: -5 }, goto: 'lin_s1_1_p2' } }]);

  P('lin_s1_1_p2',
    '你在自己胳膊上缠坏了三卷纱布，第四次总算换来她一个点头。“合格，勉强。”[npc:lin]林晚[/npc]把演示用的绷带收好，嘴角有一点极淡的弧度，“记住，包扎救不了大出血，那种时候把人弄来我这儿——跑快点。”',
    [{ label: '记下要领', fx: { skill: 'bandage', aff: { lin: 5 }, flag: { 'npc.lin.s1_1': true }, milestone: '林晚教你包扎' } }]);

  // ---- lin_s1_2 小葬礼 ------------------------------------------------------
  events.register({
    id: 'lin_s1_2', type: 'story', npc: 'lin', when: ['enter', 'action'], once: true, priority: 6,
    cond: { loc: 'hospital', timeRange: [1020, 1260], stage: { lin: 1 }, flag: { 'npc.lin.s1_1': true, 'npc.lin.s1_2': false } },
    passage: 'lin_s1_2_p1'
  });

  P('lin_s1_2_p1',
    '你绕到住院部后面的小花园，看见[npc:lin]林晚[/npc]蹲在一小块翻松的土前。她面前躺着一个用床单裹好的人形，旁边立着半块砖，砖面上用记号笔写着名字和日期。她把床单的边角掖了掖，动作轻得像在给病人盖被子。',
    [
      { label: '走过去，默默帮她扶住床单', fx: { aff: { lin: 6 }, goto: 'lin_s1_2_p2' } },
      { label: '退开几步，等她做完', fx: { aff: { lin: 3 }, goto: 'lin_s1_2_p2b' } }
    ]);

  P('lin_s1_2_p2',
    '[npc:lin]林晚[/npc]的手顿了一下，没有赶你。你们一起把人放进土里，她填土填得不快，每一层都压实。“床位不够，药也不够，总有救不回来的。”她拍掉手上的土，指了指花园角落——那里立着六块砖，这是第七块。“名字我都记着，等哪天有人回来找。”',
    [{ label: '陪她站一会儿', fx: { flag: { 'npc.lin.s1_2': true }, time: 30, milestone: '林晚的小葬礼' } }]);

  P('lin_s1_2_p2b',
    '她填完最后一捧土才发现你，两人隔着花坛对视了几秒，她没解释，你也没问。回诊室的路上她只说了一句：“别跟病人提那个地方，他们得相信自己能活着走出去。”',
    [{ label: '点头答应', fx: { flag: { 'npc.lin.s1_2': true }, time: 30, milestone: '林晚的小葬礼' } }]);

  // ---- lin_s1_3 手术搭手 + 升阶→信任 ----------------------------------------
  // 拒绝不落死局：不 once，冷却两天后另一个伤员会再被抬进来。
  events.register({
    id: 'lin_s1_3', type: 'story', npc: 'lin', when: ['enter', 'action', 'talk'], once: false, cooldown: 2880, priority: 7,
    cond: { loc: 'hospital', timeRange: LIN_HOURS, stage: { lin: 1 }, flag: { 'npc.lin.s1_2': true, 'npc.lin.s1_3': false }, aff: { lin: { gte: 40 } } },
    passage: 'lin_s1_3_p1'
  });

  P('lin_s1_3_p1',
    '你人还没进诊室，先听见里面的动静——两个幸存者抬着一个腹部插着钢筋的男人冲进来，[blood]血[/blood]把担架布浸成了黑红色。[npc:lin]林晚[/npc]一边下口令一边把器械盘踢到手边，抬眼看见你，没有半句寒暄：“洗手，三十秒，来搭把手，他等不了。”',
    [
      { label: '冲去洗手', fx: { goto: 'lin_s1_3_p2' } },
      { label: '你帮不上忙，退出去', fx: { aff: { lin: -2 } } }
    ]);

  P('lin_s1_3_p2',
    '接下来的一个半小时，你在“压住”“纱布”“别松”的口令里连轴转，血腥气糊满鼻腔。[npc:lin]林晚[/npc]的手稳得可怕，钳子、缝线、止血钳在她指间像活物。钢筋拔出来的那一刻，男人的惨叫掀翻了整间诊室，她的睫毛都没颤一下。',
    [{ label: '咬牙撑到最后', fx: { time: 90, stat: { energy: -12, sanity: -3 }, goto: 'lin_s1_3_p3' } }]);

  P('lin_s1_3_p3',
    '人保住了。[npc:lin]林晚[/npc]摘下手套，靠着墙慢慢滑坐到地上——这是你第一次见她露出疲态。“今天你救了一条命。”她仰头看你，眼下的乌青被汗浸得发亮，“记住这个感觉，它比子弹值钱。”',
    [{ label: '把她从地上拉起来', fx: { stage: { lin: 2 }, aff: { lin: 6 }, flag: { 'npc.lin.s1_3': true }, milestone: '和林晚一起救回一条命' } }]);

  // ==========================================================================
  // 信任（stage 2）
  // ==========================================================================

  // ---- lin_s2_1 戒断发作 ----------------------------------------------------
  events.register({
    id: 'lin_s2_1', type: 'story', npc: 'lin', when: ['enter', 'action'], once: true, priority: 8,
    cond: { loc: 'hospital', timeRange: LIN_HOURS, stage: { lin: 2 }, flag: { 'npc.lin.s2_1': false } },
    passage: 'lin_s2_1_p1'
  });

  P('lin_s2_1_p1',
    '诊室空着，器械盘翻在地上，纱布撒了一片。你循着里间压抑的喘息推开门——[npc:lin]林晚[/npc]蜷在行军床上，冷汗把头发粘在脸侧，两只手抖得攥不住毯子，床底下滚着七八个空药瓶。“出去。”她从牙缝里挤出两个字，“今天不接诊。”',
    [
      { label: '留下来，把门反锁上', fx: { goto: 'lin_s2_1_p2' } },
      { label: '问她需要什么药', fx: { goto: 'lin_s2_1_p2' } }
    ]);

  P('lin_s2_1_p2',
    '你捡起一个空瓶，标签上印着[med]镇静剂[/med]。“三年了。”她盯着天花板，喉咙里滚出一声干笑，“从这医院只剩我一个人那天起。别用那种眼神看我，我知道剂量——我是医生。”话音没落，一阵痉挛让她整个人弓了起来。',
    [
      { label: '把身上的镇静剂给她', cond: { has: { item: 'sedative' } }, fx: { item: { sedative: -1 }, goto: 'lin_s2_1_p3a' } },
      { label: '拧热毛巾按住她的手：“我陪你扛。”', fx: { goto: 'lin_s2_1_p3b' } }
    ]);

  P('lin_s2_1_p3a',
    '[npc:lin]林晚[/npc]盯着你手里的药看了很久，久到你以为她会打掉它。最后她接过去，用抖的手掰了半片吞下——只有半片，剩下的锁进抽屉，钥匙丢给你。“替我收着。一天半片，我多要也不准给，做得到你再留下。”药劲上来，她的呼吸慢慢匀了，“难看吧，”她扯了扯嘴角，“医生成了药罐子。”',
    [{ label: '“你只是病了。病了就治。”', fx: { aff: { lin: 10 }, time: 120, flag: { 'npc.lin.s2_1': true, 'npc.lin.gaveSedative': true }, milestone: '陪林晚撑过戒断', goto: 'lin_s2_1_p4' } }]);

  P('lin_s2_1_p3b',
    '那是很长的一夜。你把发烫的毛巾换了一轮又一轮，在她痉挛的时候按住她的手腕，听她在半昏迷里断断续续地说胡话——大多不成句，只有一个名字反复出现，你没听清，也没问。天蒙蒙亮时她的烧退了，攥着你的袖口睡着了，眉头还锁着。',
    [{ label: '守到她醒', fx: { aff: { lin: 12 }, time: 420, stat: { energy: -20, sanity: -3 }, flag: { 'npc.lin.s2_1': true, 'npc.lin.coldTurkey': true }, milestone: '陪林晚撑过戒断', goto: 'lin_s2_1_p4' } }]);

  P('lin_s2_1_p4',
    '[npc:lin]林晚[/npc]缓过来的第一件事是别开脸，避开你的目光。“这件事，”她的声音哑得厉害，“忘掉。”她撑着坐起来想自己倒水，手还在抖，你把水递过去，她接了——这一次，没有推开。',
    [{ label: '（离开，让她休息）', fx: {} }]);

  // ---- lin_s2_2 丈夫之死 ----------------------------------------------------
  events.register({
    id: 'lin_s2_2', type: 'story', npc: 'lin', when: ['talk'], once: true, priority: 5,
    cond: { loc: 'hospital', timeRange: [1200, 120], stage: { lin: 2 }, flag: { 'npc.lin.s2_1': true, 'npc.lin.s2_2': false } },
    passage: 'lin_s2_2_p1'
  });

  P('lin_s2_2_p1',
    '深夜的值班室，[npc:lin]林晚[/npc]给你倒了杯热水，自己捧着另一杯，很久没喝。“爆发那天，医院塞满了人。”她忽然开口，像在念一份迟到三年的病程记录，“第十一台手术推进来的时候，我看见腕带上的名字——是我丈夫。”',
    [{ label: '听她说下去', fx: { goto: 'lin_s2_2_p2' } }]);

  P('lin_s2_2_p2',
    '“大出血。那种创面我处理过一百次，可我的手在抖。”她的目光落在自己摊开的手掌上，“主刀是我，宣布时间的也是我。四十分钟，心跳没有回来，手术记录我写完了，签的我自己的名字。”杯里的水凉透了，她终于喝了一口，“从那天起我没离开过这栋楼。走了……就真的什么都不剩了。”',
    [
      { label: '握住她冰凉的手', fx: { aff: { lin: 6 }, goto: 'lin_s2_2_p3' } },
      { label: '“不是你的错，是那一天的错。”', fx: { aff: { lin: 5 }, goto: 'lin_s2_2_p3' } }
    ]);

  P('lin_s2_2_p3',
    '[npc:lin]林晚[/npc]没有哭，只是把额头轻轻抵在你的肩上，停了几秒，像一台超负荷的机器终于允许自己断一次电。她直起身时又是那个冷静的医生了：“今天的话，出了这间屋子我不承认。”她顿了顿，“……谢谢你听完。”',
    [{ label: '（离开）', fx: { flag: { 'npc.lin.s2_2': true }, milestone: '林晚说出爆发日的事' } }]);

  // ---- lin_s2_3 依赖铺垫 + 约定 ---------------------------------------------
  events.register({
    id: 'lin_s2_3', type: 'story', npc: 'lin', when: ['talk'], once: true, priority: 5,
    cond: { stage: { lin: 2 }, flag: { 'npc.lin.s2_2': true, 'npc.lin.s2_3': false } },
    passage: 'lin_s2_3_p1'
  });

  P('lin_s2_3_p1',
    '你要走的时候，[npc:lin]林晚[/npc]叫住你，往你包里塞了一只温热的[item]饭团[/item]。“最近别走夜路。”她说得像医嘱，手却抓着你的袖口没松。过了两秒她自己察觉了，指尖一根根松开，别过脸去，“……明天，你还来吗？”',
    [
      { label: '“来。说好了。”', fx: { aff: { lin: 5 }, item: { riceball: 1 }, flag: { 'npc.lin.s2_3': true }, appointment: { inDays: 1, minute: 1200, label: '答应了林晚去看她', eventId: 'lin_promise_1' }, milestone: '与林晚的约定' } },
      { label: '“看情况，我尽量。”', fx: { aff: { lin: 2 }, item: { riceball: 1 }, flag: { 'npc.lin.s2_3': true } } }
    ]);

  // ---- lin_promise_1 约定到期（只由日历 appointment 强制触发；when:[] 使其
  //      不进任何常规触发池） -------------------------------------------------
  events.register({
    id: 'lin_promise_1', type: 'story', npc: 'lin', when: [], once: true, priority: 4,
    passage: 'lin_promise_1_p'
  });

  P('lin_promise_1_p',
    function (s) {
      if (s.player.location === 'hospital') {
        return '你如约推开诊室的门。[npc:lin]林晚[/npc]抬头的一瞬，眼里悬着的什么东西落了地。“嗯。”她低下头继续写病历，掩住了嘴角，“坐吧，水在老地方。”';
      }
      return '天色暗下来，你想起答应过[npc:lin]林晚[/npc]今天去看她。医院的灯这个时辰应该还亮着，她大概又在一边写病历，一边听着门口的动静。';
    },
    [
      { label: '陪她坐一会儿', cond: { loc: 'hospital' }, fx: { aff: { lin: 4 }, time: 60 } },
      { label: '（记在心里）', fx: {} }
    ]);

})();

/* =============================================================================
 * lin.js·后半（M6：亲密→羁绊）
 * -----------------------------------------------------------------------------
 * 节拍一览（衔接 M5：stage 2 + npc.lin.s2_3:true 起步）：
 *   亲密（stage 3）
 *     lin_s3_1  委托：大学实验楼取病毒资料（talk；拒绝可改日再谈，接受写 labquest）
 *     lin_s3_2  大型事件：生化实验楼探索（enter/action @campus；败分支=只拿半份
 *               partialDocs，不掉线；碰暗线只给碎片）
 *     lin_s3_3  交付资料 + 关系转折 + 升阶→亲密（talk，需好感≥60）
 *     lin_s3_4  首次成人事件（talk @hospital 夜，性别分支；可拒绝，冷却后再谈）
 *   羁绊（stage 4）
 *     lin_s4_1  升阶→羁绊：医院钥匙 + 义诊日约定（talk，需好感≥80；首次登记
 *               周日义诊日历，见 bookWeekly）
 *     lin_clinic_1  周期事件：每周日上午义诊日（scheduled，weekday 6）
 *     lin_cure_1  感染救治专属剧情（感染≥60 @hospital，可重复，冷却一天，priority 9）
 *     lin_s4_2  羁绊成人变体（talk @hospital 夜，可重复，冷却 2 天，priority 2）
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  var story = G.data.story, events = G.data.events;

  function P(id, text, choices) { story.register({ id: id, text: text, choices: choices }); }
  var LIN_NIGHT = [1200, 120];   // 值班室夜谈时段 20:00–次日02:00

  function bookWeekly(guardFlag, targetWd, minute, label) {
    if (G.engine.getFlag(guardFlag)) return;
    G.engine.setFlag(guardFlag, true);
    var p = G.state.player;
    var diff = (targetWd - (p.day % 7) + 7) % 7;
    if (!diff) diff = 7;
    G.state.calendar.appointments.push({ day: p.day + diff, minute: minute, label: label, eventId: null, done: false });
  }

  // ==========================================================================
  // 亲密（stage 3）
  // ==========================================================================

  // ---- lin_s3_1 委托：实验楼病毒资料 ----------------------------------------
  events.register({
    id: 'lin_s3_1', type: 'story', npc: 'lin', when: ['talk'], once: false, cooldown: 1440, priority: 5,
    cond: { loc: 'hospital', stage: { lin: 2 }, flag: { 'npc.lin.s2_3': true, 'npc.lin.s3_1': false } },
    passage: 'lin_s3_1_p1'
  });

  P('lin_s3_1_p1',
    '诊台上摊着几页写满字的纸，[npc:lin]林晚[/npc]的字迹罕见地乱。“你看这个——”她把两张检验单并排推过来，“感染者的血象，和任何一本教科书都对不上。我治不了这个病，可我连它是什么都不知道，这更糟。”她抬起头，眼睛里烧着一点你没见过的东西，“[place]临港大学[/place]的生化实验楼，三楼是档案区。论文、检测台账、审批单，能拿多少拿多少。”',
    [
      { label: '接下委托', fx: { flag: { 'npc.lin.s3_1': true, 'npc.lin.labquest': true }, aff: { lin: 2 }, appointment: { inDays: 3, minute: 1020, label: '替林晚去实验楼找资料' }, goto: 'lin_s3_1_p2' } },
      { label: '“你要这些做什么？”', fx: { goto: 'lin_s3_1_p1q' } },
      { label: '那栋楼太邪，先不接', fx: {} }
    ]);

  P('lin_s3_1_p1q',
    '“弄懂它。”她的指尖点着检验单上一处发疯似的数值，“弄懂了，哪怕治不好，我也知道病人还剩多少时间、哪种死法可以绕开。医生输给病不丢人，输给无知丢人。”她看着你，“那栋楼不干净，我知道。你不去，我不怪你——你去，就给我活着回来。”',
    [
      { label: '接下委托', fx: { flag: { 'npc.lin.s3_1': true, 'npc.lin.labquest': true }, aff: { lin: 2 }, appointment: { inDays: 3, minute: 1020, label: '替林晚去实验楼找资料' }, goto: 'lin_s3_1_p2' } },
      { label: '还是太险了', fx: {} }
    ]);

  P('lin_s3_1_p2',
    '“实验楼从爆发起就贴着军用封条，正门走不通，找侧面的消防门。”她往你包里塞了两卷绷带和一小瓶[med]消毒水[/med]，动作快得不容拒绝，“白天去，带手电。记住——纸没了可以再想办法，人没了不行。”',
    [{ label: '收拾动身', fx: { item: { bandage: 2, disinfectant: 1 } } }]);

  // ---- lin_s3_2 大型事件：生化实验楼 ----------------------------------------
  events.register({
    id: 'lin_s3_2', type: 'story', npc: 'lin', when: ['enter', 'action'], once: true, priority: 7,
    cond: { loc: 'campus', flag: { 'npc.lin.labquest': true, 'npc.lin.s3_2': false } },
    passage: 'lin_s3_2_p1'
  });

  P('lin_s3_2_p1',
    '生化实验楼蹲在校区最深处，爬山虎吃掉了半面墙。正门交叉贴着的军用封条褪成粉白，侧面的消防门却虚掩着——门框上的撬痕有新有旧，最新的一道，茬口还亮着。你不是第一个来的，也不是第二个。',
    [{ label: '从消防门进去', fx: { time: 15, stat: { sanity: -3 }, goto: 'lin_s3_2_p2' } }]);

  P('lin_s3_2_p2',
    '手电的光柱里漂着灰。三楼档案区，一排文件柜大多敞着口，有的整层抽屉被人抱走，有的干脆烧过，墙角还留着烧剩的灰堆——来过的人不止一拨，拿走的东西各有偏好。你翻检剩下的：半本检测台账，编号开头是相同的两个字母；一叠盖着“未予备案”红章的申请复印件。走廊尽头还有一间负压实验室，军规的电子锁锁死了，门缝里渗出一股化学品的甜味，还有——很轻的，拖行声。',
    [
      { label: '就拿这些，见好就收', fx: { time: 30, flag: { 'npc.lin.s3_2': true, 'npc.lin.gotDocs': true, 'npc.lin.partialDocs': true }, goto: 'lin_s3_2_p4' } },
      { label: '把塌了半边的检验室侧间也翻一遍', fx: { stat: { sanity: -3 }, combat: 'runner_pack', goto: 'lin_s3_2_p3' } }
    ]);

  P('lin_s3_2_p3',
    '侧间重新安静下来。你把掀翻的柜子别开，底下压着一只没上锁的铁皮档案盒——成册的实验记录，纸页脆黄但完整。你抱着它退出实验楼，快步穿过长草的操场，直到日光落在纸页上，你才发现自己一直屏着呼吸。',
    [{ label: '带着资料回医院', fx: { flag: { 'npc.lin.s3_2': true, 'npc.lin.gotDocs': true }, time: 20, goto: 'lin_s3_2_p4' } }]);

  P('lin_s3_2_p4',
    '走出校门，你回头看了一眼。爬山虎后面，三楼的窗黑洞洞的。那扇军规的门后面锁着的东西，和这半城的死人有没有关系，纸上没有答案——答案不在，线头在。',
    [{ label: '（返回）', fx: {} }]);

  // ---- lin_s3_3 交付 + 关系转折 + 升阶→亲密 ---------------------------------
  events.register({
    id: 'lin_s3_3', type: 'story', npc: 'lin', when: ['talk'], once: true, priority: 6,
    cond: { loc: 'hospital', stage: { lin: 2 }, flag: { 'npc.lin.s3_2': true, 'npc.lin.s3_3': false }, aff: { lin: { gte: 60 } } },
    passage: 'lin_s3_3_p1'
  });

  P('lin_s3_3_p1',
    function () {
      var head = '[npc:lin]林晚[/npc]把你带回的纸页在诊台上铺开，读得极快，笔尖在几行编号下面划线。';
      head += G.engine.getFlag('npc.lin.partialDocs')
        ? '“缺得厉害。”她说，却没有失望的意思，“够我啃一阵了。”'
        : '“比我想的多。”她的声音有一点不易察觉的抖，“这些记录，够我啃半年。”';
      return head + '翻到台账中段，她的笔尖突然停住——同一批编号，检测日期比封城早了半个月。她盯着那行字看了几秒，把整页翻过去扣在桌面上，像扣住什么烫手的东西。“这些，先放我这儿。”';
    },
    [
      { label: '“日期不对，你看到了。”', fx: { goto: 'lin_s3_3_p1b' } },
      { label: '不点破，等她开口', fx: { goto: 'lin_s3_3_p1b' } }
    ]);

  P('lin_s3_3_p1b',
    '“我看到了。”她没有抬头，“看到不等于看懂，看懂了也未必敢信。这一页，等我把别的啃完再回头碰。”她把台账仔细收进上锁的抽屉——和那格[med]镇静剂[/med]放在一起。这个抽屉里锁着的，都是她暂时打不过的东西。',
    [{ label: '（点头）', fx: { goto: 'lin_s3_3_p2' } }]);

  P('lin_s3_3_p2',
    '她给你倒水，手抖了一下，水在杯沿洒出来。“去之前我算过，这趟的风险值得。”她背对着你，声音很平，“资料到手，我该高兴。可你进门之前那十分钟，我满脑子只有一件事——你要是没回来，这点纸算什么。”她转过身，眼下的乌青比平时深，“我丈夫走后，我把自己焊死在这栋楼里，以为再没有什么能拆动我。你拆动了。”',
    [
      { label: '走过去抱住她', fx: { goto: 'lin_s3_3_p3' } },
      { label: '“我回来了。这就是答案。”', fx: { goto: 'lin_s3_3_p3' } }
    ]);

  P('lin_s3_3_p3',
    '她没有躲。过了几秒，她的手从白大褂口袋里抽出来，轻轻攥住你的衣角——像上次在诊室门口一样，只是这次她没有松开，也不打算松开了。“今晚我不值班。”她抬起头，努力用医嘱的语气说，“留下来，陪我吃顿饭。就从这样开始，可以吗？”',
    [{ label: '“可以。”', fx: { stage: { lin: 3 }, flag: { 'npc.lin.s3_3': true }, aff: { lin: 6 }, time: 90, milestone: '林晚放你进了她的世界' } }]);

  // ---- lin_s3_4 首次成人事件 ------------------------------------------------
  events.register({
    id: 'lin_s3_4', type: 'story', npc: 'lin', when: ['talk'], once: false, cooldown: 1440, priority: 6,
    cond: { loc: 'hospital', timeRange: LIN_NIGHT, stage: { lin: { gte: 3 } }, flag: { 'npc.lin.s3_4': false } },
    passage: 'lin_s3_4_p1'
  });

  P('lin_s3_4_p1',
    function () {
      var head = '值班室里只点着一盏台灯。[npc:lin]林晚[/npc]拆掉发绳，头发散下来，白大褂搭在椅背上，她整个人忽然只是一个疲惫的、好看的女人。';
      if (G.engine.getFlag('npc.lin.gaveSedative')) {
        head += '抽屉里的[med]镇静剂[/med]照旧锁着，钥匙在你身上——她已经很多天没找你要过了。';
      } else if (G.engine.getFlag('npc.lin.coldTurkey')) {
        head += '她的手很稳。那场硬扛过去的戒断，把她还给了她自己。';
      }
      return head + '“今晚别走。”她说得很轻，手指抓着你的袖口——和从前一样，只是这次，她没有要松手的意思。';
    },
    [
      { label: '留下', fx: { goto: 'lin_s3_4_p2' } },
      { label: '“今晚不行，明天来看你。”', fx: { goto: 'lin_s3_4_pout' } }
    ]);

  P('lin_s3_4_pout',
    '她的手指立刻松开，收回口袋，语气如常：“嗯，路上小心。”只有转身时太快的那半步，泄露了一点别的。你走到走廊尽头回头看，值班室的灯还亮着，她的影子投在磨砂玻璃上，很久没有动。',
    [{ label: '（离开）', fx: {} }]);

  P('lin_s3_4_p2',
    function (s) {
      var head = '台灯拉到最低，值班室的行军床窄得只容两个人叠在一起。她吻你的方式带着一种孤注一掷的认真，手指埋进你的头发，扣着你的后脑不放，像怕你在一个吻的间隙里蒸发。';
      if (s.player.gender === 'f') {
        return head + '她的手顺着你的脊椎一节节按下去——是医生的手，准，稳，烫。可落到你身上时，那点专业的冷静烧得一干二净，她把脸埋在你颈窝，声音又低又哑：“说话，随便说什么，让我听见你。”她的指尖探进你身体的时候，你的喘息卡在喉咙里，她就吻你的喉咙，一遍一遍，把你拆开又拼拢，直到你在她掌心里发着抖到达。她抱着你不放，像抱一件失而复得的东西。';
      }
      return head + '她跨坐上来，台灯给她的轮廓描了一圈毛边。她握着你的手贴上她的心口——心跳快得吓人，和她脸上的镇静完全是两回事。她引着你进入她的时候，眉心蹙起又缓缓松开，俯身抵着你的额头，呼吸全乱了，还固执地睁着眼：“看着我。”她动得不快，却一下比一下沉，你扣住她的腰，她终于闭上眼，把一声破碎的喘息咬在你的肩膀上，身体一阵一阵地颤。';
    },
    [{ label: '搂紧她', fx: { goto: 'lin_s3_4_p3' } }]);

  P('lin_s3_4_p3',
    '事后她枕在你的心口，一根手指搭在你的颈动脉上——数你的脉搏，数着数着，呼吸终于匀了。后半夜你醒过一次，她在黑暗里睁着眼看你，被发现了也不躲：“继续睡。”她把毯子往你身上掖，“我就是确认一下，你在。”',
    [{ label: '（把她搂进怀里睡去）', fx: { stat: { energy: -18, sanity: 5 }, time: 360, aff: { lin: 8 }, flag: { 'npc.lin.s3_4': true }, milestone: '与林晚的一夜' } }]);

  // ==========================================================================
  // 羁绊（stage 4）
  // ==========================================================================

  // ---- lin_s4_1 升阶→羁绊：钥匙与义诊约定 -----------------------------------
  events.register({
    id: 'lin_s4_1', type: 'story', npc: 'lin', when: ['talk'], once: true, priority: 6,
    cond: { loc: 'hospital', stage: { lin: 3 }, flag: { 'npc.lin.s3_3': true, 'npc.lin.s4_1': false }, aff: { lin: { gte: 80 } } },
    passage: 'lin_s4_1_p1'
  });

  P('lin_s4_1_p1',
    '[npc:lin]林晚[/npc]把一小串钥匙放进你手心：诊室，后门，药房外间。“这栋楼的钥匙，一共只有两串。”另一串，她当着你的面从贴身口袋里取出来，和一枚男式的旧[item]戒指[/item]一起，放进抽屉最深处，落了锁。这一次，钥匙没有再拿出来。“人得往前活。”她说这话时看着你，不是看着抽屉。',
    [{ label: '收好钥匙', fx: { goto: 'lin_s4_1_p2' } }]);

  P('lin_s4_1_p2',
    function () {
      bookWeekly('npc.lin.clinicBooked', 6, 540, '医院义诊日');
      return '“还有件事。”她翻开排班表——那上面其实只有她一个人的名字，“每周日上午，我想开义诊，附近的幸存者都能来，不收子弹。这场面我一个人撑不住。”她把笔递给你，指了指自己名字旁边的空栏，“你在，我心里稳。”';
    },
    [{ label: '写下自己的名字', fx: { stage: { lin: 4 }, flag: { 'npc.lin.s4_1': true }, aff: { lin: 5 }, milestone: '林晚把医院的钥匙给了你' } }]);

  // ---- lin_clinic_1 周期事件：义诊日（每周日上午） ---------------------------
  events.register({
    id: 'lin_clinic_1', type: 'scheduled', npc: 'lin', priority: 4,
    cond: { loc: 'hospital', weekday: 6, timeRange: [540, 1020], stage: { lin: { gte: 4 } } },
    passage: 'lin_clinic_p1'
  });

  P('lin_clinic_p1',
    function () {
      var pool = [
        '天没大亮，医院门口已经排起了队：抱孩子的女人，咳嗽的老头，一个用门板抬来的伤号。[npc:lin]林晚[/npc]立在门口分诊，语速快得像点名；你负责维持队形、递器械、按住不肯配合的伤口。',
        '今天的义诊来了个熟面孔——上次那个腹部插钢筋的男人，拄着自制的拐，给[npc:lin]林晚[/npc]鞠了个躬，又给你鞠了一个。他身后跟着一家人，篮子里装着几个还热的红薯，说什么都要留下。',
        '队伍里起了争执，两个汉子为插队吵得要动手。你还没走过去，[npc:lin]林晚[/npc]头也不抬地开口：“打架的出去，伤好了再打。我这儿缝一针收一发子弹——今天免费，明天恢复原价。”队伍哄笑，架吵不起来了。'
      ];
      return pool[Math.floor(Math.random() * pool.length)];
    },
    [{ label: '一直帮到收摊', fx: { time: 240, stat: { energy: -15, sanity: 5 }, aff: { lin: 3 }, appointment: { inDays: 7, minute: 540, label: '医院义诊日' }, goto: 'lin_clinic_p2' } }]);

  P('lin_clinic_p2',
    '最后一个病人走的时候，日头已经偏西。[npc:lin]林晚[/npc]靠在挂号台上揉手腕，白大褂前襟蹭着血点和碘伏渍，人却比平时任何时候都亮。“下周日，”她偏头看你，“还来？”',
    [{ label: '“每周都来。”', fx: { aff: { lin: 1 } } }]);

  // ---- lin_cure_1 感染救治专属剧情（可重复） --------------------------------
  events.register({
    id: 'lin_cure_1', type: 'story', npc: 'lin', when: ['enter', 'action', 'talk'], once: false, cooldown: 1440, priority: 9,
    cond: { loc: 'hospital', stage: { lin: { gte: 4 } }, stat: { infection: { gte: 60 } } },
    passage: 'lin_cure_p1'
  });

  P('lin_cure_p1',
    '你人还没站稳，[npc:lin]林晚[/npc]的目光已经钉在你脖颈侧面——皮肤底下，暗色的纹路正顺着血管往上爬。她脸上的血色褪了个干净，下一秒，她已经拽着你往手术室走，力气大得不像她。“多久了？咬伤还是划伤？为什么现在才来！”三个问题，没有一个等你回答。',
    [{ label: '任她摆布', fx: { goto: 'lin_cure_p2' } }]);

  P('lin_cure_p2',
    '军用抗病毒剂，冰盐水，她自己配的、气味刺鼻的洗剂——整套流程她做得又快又狠。输液针扎进去，烧灼感顺着血管一路爬，疼得你指节发白。“忍着。剂量是我照实验楼那半本台账重配的，比军标的狠，也比它有用。”不知过了多久，那种从骨缝里往外渗的热，终于退了。',
    [
      { label: '缓过气来', cond: { flag: { 'npc.lin.curedOnce': false } }, fx: { stat: { infection: -50, hp: 5, energy: -10 }, time: 240, aff: { lin: 3 }, flag: { 'npc.lin.curedOnce': true }, milestone: '林晚把你从感染线上拉回来', goto: 'lin_cure_p3' } },
      { label: '缓过气来', cond: { flag: { 'npc.lin.curedOnce': true } }, fx: { stat: { infection: -50, hp: 5, energy: -10 }, time: 240, aff: { lin: 2 }, goto: 'lin_cure_p3' } }
    ]);

  P('lin_cure_p3',
    '她坐在床边，盯着你的瞳孔看了很久，确认里面没有那种浑浊，才允许自己靠进椅背，长长吐出一口气。“听着。”她的声音平得刻意，“我允许你受伤，允许你生病，允许你把我的绷带用成消耗品——”她俯下身，额头抵着你的，“唯独不允许你，变成我救不了的东西。”',
    [{ label: '“记住了。”', fx: {} }]);

  // ---- lin_s4_2 羁绊成人变体（可重复） --------------------------------------
  events.register({
    id: 'lin_s4_2', type: 'story', npc: 'lin', when: ['talk'], once: false, cooldown: 2880, priority: 2,
    cond: { loc: 'hospital', timeRange: LIN_NIGHT, stage: { lin: { gte: 4 } }, flag: { 'npc.lin.s3_4': true } },
    passage: 'lin_s4_2_p1'
  });

  P('lin_s4_2_p1',
    '值班室的台灯又亮到深夜。你进门时，[npc:lin]林晚[/npc]正对着排班表出神，听见动静回头看你，目光在你脸上停了几秒，然后起身，很自然地反锁了门。“今晚没有病人。”她摘下发绳走过来，“医嘱：你需要休息。我也是。”',
    [
      { label: '遵医嘱', fx: { goto: 'lin_s4_2_p2' } },
      { label: '“今晚真得回去。”', fx: { goto: 'lin_s4_2_pno' } }
    ]);

  P('lin_s4_2_pno',
    '“嗯。”她把你送到走廊口，替你理了理衣领，动作像检查绷带一样认真，“那就把觉补回来——这也是医嘱。”',
    [{ label: '（离开）', fx: {} }]);

  P('lin_s4_2_p2',
    function (s) {
      if (s.player.gender === 'f') {
        return '这一次她不再需要你的声音来确认什么。她把你按在行军床上，吻得慢条斯理，医生的手一寸寸把你拆开，准确，专注，带着一点报复般的耐心——上次你弄乱她呼吸的账，她今晚全数讨回去。你在她手里到达的时候，她撑在你上方看着你，眼睛亮得像换了一个人。“这个表情，”她低声说，“归我。”';
      }
      return '这一次她不再需要黑暗壮胆。她把你推倒在行军床上，跨坐上来，台灯也不关，解衬衫扣子的手指又稳又慢——存心的。她引着你进入，节奏由她定，你想快，她就俯身咬住你的下唇不许。到最后她伏在你胸口喘，心跳撞着心跳，好半天，哑着嗓子开口：“体检结论：心肺功能良好。”顿了顿，“下周复查。”';
    },
    [{ label: '（拥着她睡去）', fx: { stat: { energy: -18, sanity: 6 }, time: 120, aff: { lin: 4 } } }]);

})();
