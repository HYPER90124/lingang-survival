/* =============================================================================
 * grime.js — M16 清洁度（脏污）系统的文本适配（数据层）
 * -----------------------------------------------------------------------------
 * 机制（grime 累积/消退/阈值）在引擎侧（state.js/time.js/save.js）与数据侧
 * （locations.js 洗漱行动、combat.js 战斗累积、npcs.js 搭话/送礼钩子）实现；
 * 本文件只承载文本：
 *
 *   1. G.data.grimeLines —— 10 名 NPC 的「嫌弃变体」台词。grime > T_GRIME 时，
 *      npcs.js 的 dailyChat 会把对应 NPC 的这句话前置到日常搭话正文之前。
 *   2. 高脏污随机事件（grime > T_GRIME 触发）：野狗循味跟踪、招蝇引臭各一，
 *      纯氛围/轻后果，priority 低、cooldown 长（M1 老坑：随机事件必带 chance/cooldown）。
 * ========================================================================== */
(function () {
  'use strict';
  window.G = window.G || {};
  G.data = G.data || {};
  var story = G.data.story, events = G.data.events;
  function P(id, text, choices) { story.register({ id: id, text: text, choices: choices }); }

  // ---- 1. 10 名 NPC 嫌弃变体（grime>70 时前置到日常搭话） --------------------
  G.data.grimeLines = {
    qin:  '[npc:qin]老秦[/npc]闻见味儿，不动声色往旁边挪了半步，皱眉：“多久没洗了？这一身臊味，招丧尸也招人嫌。”',
    lin:  '[npc:lin]林晚[/npc]下意识抬手掩了下口鼻，医生的毛病犯了：“你这卫生状况，破点皮就得感染。找水擦擦。”',
    mao:  '[npc:mao]灰猫[/npc]捏着鼻子退开半米：“哟，老远就闻着你了。干我这行，气味也是破绽——你这一身，藏哪儿都露馅。”',
    su:   '[npc:su]苏曼[/npc]端酒的手停在半空，别过脸：“亲爱的，你这味儿能把我客人熏跑。后头有水，去冲冲再来。”',
    dou:  '[npc:dou]阿豆[/npc]夸张地扇了扇鼻子：“老板，你这是在垃圾堆里打过滚？离我工具台远点，别把味儿蹭上去。”',
    zhou: '[npc:zhou]周响[/npc]笑着往后仰：“本台温馨提示——这位听众离麦克风远一点，你这气味隔着电波都能播出去。”',
    zhao: '[npc:zhao]赵铁[/npc]从柜台后皱眉扇手：“先把自己收拾干净了再进店，别熏着我的货。”',
    chen: '[npc:chen]陈神父[/npc]默默递来一块干净布巾，语气温和却不容推拒：“洁净亦是一种敬畏，孩子。去洗一洗吧。”',
    cai:  '[npc:cai]老蔡[/npc]吸吸鼻子，咧嘴一乐：“臭啦臭啦——江里的鱼都要顺着味儿浮上来喽！”',
    fang: '[npc:fang]方哨[/npc]端枪的手没动，只是眉头一紧：“这么大味儿，夜里放哨都得离你三米。整理下个人卫生，兵。”'
  };

  // ---- 2. 高脏污随机事件 -----------------------------------------------------
  // 室外 11 地点（排除 home/bar/church 三处室内安全区）
  var OUTDOOR = { anyOf: [
    { loc: 'residential' }, { loc: 'market' }, { loc: 'hospital' }, { loc: 'police' },
    { loc: 'campus' }, { loc: 'metro' }, { loc: 'park' }, { loc: 'gas' },
    { loc: 'mall' }, { loc: 'dock' }, { loc: 'checkpoint' }, { loc: 'sewer' }
  ] };

  // 野狗循味跟踪：一条活狗（或犬尸）循着体臭缀上来
  P('grime_dog_1_p',
    '一条瘦骨嶙峋的野狗不知从哪儿钻出来，鼻子抽动着，死死缀在你身后十来步——它循的不是别的，正是你身上那股经久不散的臊臭。它跟得越来越近，喉咙里滚出低吼。',
    [
      { label: '捡石子把它轰走', fx: { stat: { energy: -3, sanity: -2 }, time: 10 } },
      { label: '它扑上来了——迎战', fx: { combat: 'zombie_dog' } }
    ]);
  events.register({
    id: 'grime_dog_1', type: 'random', priority: 2, cooldown: 2880,
    cond: Object.assign({ stat: { grime: { gt: 70 } }, chance: 0.16 }, OUTDOOR),
    passage: 'grime_dog_1_p'
  });

  // 招蝇引臭：走到哪儿一团蚊蝇跟到哪儿，路人绕着走
  P('grime_flies_1_p',
    '一团蚊蝇嗡嗡地绕着你打转，怎么挥都赶不散——你这身味儿成了它们的盛宴。街角几个幸存者远远瞟了一眼，默契地绕开你走，那眼神让人不太好受。',
    [{ label: '（灰头土脸地走开）', fx: { stat: { sanity: -3 }, time: 10 } }]);
  events.register({
    id: 'grime_flies_1', type: 'random', priority: 1, cooldown: 2880,
    cond: Object.assign({ stat: { grime: { gt: 70 } }, chance: 0.14 }, OUTDOOR),
    passage: 'grime_flies_1_p'
  });

})();
