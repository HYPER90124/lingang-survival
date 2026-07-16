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
