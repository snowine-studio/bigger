// 《再大一点》Demo 剧本数据
// 引擎只认这里的数据，改剧情只动这个文件。

export type Speaker = 'client' | 'director' | 'system' | 'me'

export interface ChatMsg {
  from: Speaker
  text: string
  /** true = 核心需求警报，黄色爆炸贴 */
  hot?: boolean
}

export interface CanvasState {
  logoSize: number
  slogan: boolean
  productInLogo: boolean
  aiVersion: boolean
  proVersion: boolean
}

export const initialCanvas: CanvasState = {
  logoSize: 30,
  slogan: false,
  productInLogo: false,
  aiVersion: false,
  proVersion: false,
}

export interface Option {
  id: string
  label: string
  sub?: string
  reactions: ChatMsg[]
  canvas?: Partial<CanvasState>
  flags?: Record<string, boolean>
  /** true = 选完后留在本回合，从剩余选项里再选一次 */
  funnel?: boolean
  /** true = 触发打包 zip 动画（R3C） */
  zip?: boolean
  /** 生存结局 id */
  ending?: string
  /** 毕业死法 id（菜鸟设计师的一万种死法） */
  death?: string
  /** 事件类型：normal=日常选择 | surprise=无选择强制 | abyss=延迟触发 */
  eventType?: 'normal' | 'surprise' | 'abyss'
  /** 深渊标记：选完后延迟到指定轮次触发 */
  abyssTag?: string
}
export interface Round {
  id: string
  label: string
  intro: ChatMsg[]
  canvas?: Partial<CanvasState>
  options: Option[]
}

const SAVE_OPTION: Option = {
  id: 'S',
  label: '💾 先保存一下（Ctrl+S）',
  sub: '花不了几秒钟',
  funnel: true,
  flags: { saved: true },
  reactions: [{ from: 'me', text: '（你按下了 Ctrl+S。进度已保存。）' }],
}

export const rounds: Record<string, Round> = {
  // ───────────────────────── 第 1 轮：再大一点 ─────────────────────────
  r1: {
    id: 'r1',
    label: '需求 1 / 3',
    intro: [
      { from: 'system', text: '【新派单】客户 · 李总｜宏达国际商贸（集团）有限公司' },
      { from: 'client', text: '辛苦辛苦，在忙吗？' },
      { from: 'client', text: '海报初稿看了，整体不错，很有感觉。' },
      { from: 'client', text: '但是吧……不够国际化。' },
      { from: 'client', text: '我们明年可是要去纳斯达克敲钟的。' },
      { from: 'client', text: 'Logo，再大一点。', hot: true },
    ],
    canvas: { logoSize: 30 },
    options: [
      {
        id: 'A',
        label: '照做：继续放大',
        sub: '客户满意是第一生产力',
        canvas: { logoSize: 62 },
        reactions: [
          { from: 'me', text: '（你把 Logo 从 30% 拉到了 62%。）' },
          { from: 'client', text: '哎呀——对！就是这个感觉！国际化！' },
          { from: 'client', text: '改完这单给你加鸡腿 🍗' },
          { from: 'director', text: '（私聊）大群里我就不说什么了。' },
          { from: 'director', text: '（私聊）Logo 把产品挡住了。算了，年费到账就好。' },
        ],
      },
      {
        id: 'B',
        label: '坚持专业：解释比例问题',
        sub: '跟他讲讲什么叫视觉层级',
        funnel: true,
        reactions: [
          { from: 'me', text: '李总，Logo 已经占画面 30% 了，再大会挤压产品主体，视觉层级会——' },
          { from: 'client', text: '哎呀，我不懂这些专业的。' },
          { from: 'client', text: '你就告诉我，能不能，再，大，一，点？辛苦啦！' },
          { from: 'director', text: '（私聊）别跟他讲道理。他签的是年费合同。' },
        ],
      },
      {
        id: 'C',
        label: '偷做两个版本：客户版 + 专业版',
        sub: '一个交差，一个留给自己',
        canvas: { logoSize: 62 },
        flags: { twoVersions: true },
        abyssTag: 'twoVersions', // 深渊标记：延迟到 r3 触发后果
        label: '偷做两个版本：客户版 + 专业版',
        sub: '一个交差，一个留给自己',
        canvas: { logoSize: 62 },
        flags: { twoVersions: true },
        reactions: [
          { from: 'me', text: '（你提交了放大版，同时在文件夹深处留下了 v_专业版.psd。）' },
          { from: 'client', text: '这版可以！国际化！就它了！' },
          { from: 'system', text: '你悄悄保留了另一个版本。没有人知道。' },
        ],
      },
      {
        id: 'D',
        label: '跟李总深入探讨设计理论',
        sub: '（不建议）',
        death: 'reason',
        reactions: [
          { from: 'me', text: '李总，设计是一门关于信息层级的科学，我们先从格式塔原理说起——' },
          { from: 'client', text: '……' },
          { from: 'client', text: '麻烦把你们总监电话给我一下，谢谢。' },
        ],
      },
    ],
  },

  // ───────────────────── 第 2 轮 A 线：儿子与老板 ─────────────────────
  r2A: {
    id: 'r2A',
    label: '需求 2 / 3',
    intro: [
      { from: 'system', text: '【新派单 · 加急】客户 · 李总' },
      { from: 'system', text: '【IT 部通知】今日 15:00 机房检修，可能断电，请随时保存文件。' },
      { from: 'client', text: '在吗辛苦啦！' },
      { from: 'client', text: '我儿子看了海报，他说不行。' },
      { from: 'client', text: '他今年七岁，审美很前卫。' },
      { from: 'client', text: '我们老板也发话了：Logo 还不够大。', hot: true },
      { from: 'client', text: '再加句 slogan：「行业领导者」，要金色的，会闪的，对标苹果。' },
    ],
    canvas: { logoSize: 62 },
    options: [
      SAVE_OPTION,
      {
        id: 'A1',
        label: '照做：再放大 + 金色闪烁 slogan',
        sub: '大就大到底',
        canvas: { logoSize: 82, slogan: true },
        reactions: [
          { from: 'me', text: '（Logo 占满画面，产品彻底消失，slogan 金光闪闪。）' },
          { from: 'client', text: '完美！老板和我儿子都特别满意！' },
          { from: 'director', text: '（私聊）大群里我点了赞。' },
          { from: 'director', text: '（私聊）产品在哪？哦，在 Logo 底下。行吧。' },
        ],
      },
      {
        id: 'A2',
        label: '找总监求助',
        sub: '这活儿不能只有我一个人扛',
        funnel: true,
        reactions: [
          { from: 'director', text: '（私聊）我也想帮你。' },
          { from: 'director', text: '（私聊）但他老板是年费合同的签字人。' },
          { from: 'director', text: '（私聊）我电脑里有 57 个「最终版」。你猜我怎么攒的？' },
          { from: 'director', text: '（私聊）照做吧。活着重要。' },
        ],
      },
      {
        id: 'A3',
        label: '在 Logo 里偷偷藏回产品图',
        sub: '既要大气，也要产品',
        canvas: { logoSize: 82, slogan: true, productInLogo: true },
        flags: { sneaky: true },
        reactions: [
          { from: 'me', text: '（你把产品图缩到指甲盖大小，P 进了 Logo 的角落。）' },
          { from: 'client', text: '大气！！辛苦辛苦！' },
          { from: 'director', text: '（私聊）你把产品 P 进 Logo 里了？' },
          { from: 'director', text: '（私聊）有点东西。别让客户发现。' },
        ],
      },
      {
        id: 'A4',
        label: '直接联系李总的老板反映情况',
        sub: '（越级，慎重）',
        death: 'leapfrog',
        reactions: [
          { from: 'me', text: '（你找到了老板的微信，发送了好友申请。）' },
          { from: 'system', text: '对方已通过你的好友申请。' },
          { from: 'system', text: '十分钟后：对方已开启朋友验证，请先发送验证请求……' },
        ],
      },
    ],
  },

  // ─────────────────── 第 2 轮 C 线：发错的那版 ───────────────────
  r2C: {
    id: 'r2C',
    label: '需求 2 / 3',
    intro: [
      { from: 'system', text: '【紧急私聊】客户 · 李总' },
      { from: 'system', text: '【IT 部通知】今日 15:00 机房检修，可能断电，请随时保存文件。' },
      { from: 'client', text: '辛苦，出事了。' },
      { from: 'client', text: '我把文件发印刷厂，发成你那个「专业版」了。' },
      { from: 'client', text: '5 万册，已经开机了。' },
      { from: 'client', text: '你能不能跟公司说——专业版就是最终版？拜托拜托 🙏' },
    ],
    canvas: { logoSize: 30, proVersion: true },
    options: [
      SAVE_OPTION,
      {
        id: 'C1',
        label: '背锅：承认专业版是最终版',
        sub: '救他一次',
        flags: { trust: true },
        reactions: [
          { from: 'me', text: '……对，那版就是最终版。我最后改过。' },
          { from: 'client', text: '兄弟！够意思！尾款下周就打！请你吃鸡腿！' },
          { from: 'director', text: '（私聊）印出来的那版，居然能看。' },
          { from: 'director', text: '（私聊）……你什么时候做的这版？' },
        ],
      },
      {
        id: 'C2',
        label: '说实话：是客户自己发错的',
        sub: '凭什么我背',
        death: 'honest',
        reactions: [
          { from: 'me', text: '文件管理是贵司的问题，我发的版本没有问题。' },
          { from: 'client', text: '……好的，知道了。' },
          { from: 'system', text: '十分钟后，李总给你们总监 Ray 打了个电话。' },
        ],
      },
      {
        id: 'C3',
        label: '收费封口：加钱才背锅',
        sub: '风险要有价格',
        flags: { money: true },
        reactions: [
          { from: 'me', text: '可以。但这是「版本管理服务」，加 20%。' },
          { from: 'client', text: '你！……行，行吧。但这件事到此为止。' },
          { from: 'director', text: '（私聊）客户主动给你加了预算？' },
          { from: 'director', text: '（私聊）你怎么办到的？？' },
        ],
      },
    ],
  },

  // ───────────────── 第 3 轮：系统变了，需求没变 ─────────────────
  r3: {
    id: 'r3',
    label: '需求 3 / 3',
    intro: [
      { from: 'system', text: '【公司通知 · 全员】' },
      { from: 'system', text: '即日起，客户反馈统一接入「智稿 AI」自动改稿，平均响应 5 分钟。' },
      { from: 'system', text: '请设计师将源文件整理归档。今后，以 AI 输出为准。' },
      { from: 'client', text: '在吗辛苦啦？' },
      { from: 'client', text: '那个 Logo……' },
      { from: 'client', text: '再大一点。', hot: true },
    ],
    options: [
      {
        id: 'R3A',
        label: '把需求喂给 AI，5 分钟交稿',
        sub: '服从系统，准点下班',
        canvas: { logoSize: 100, aiVersion: true, slogan: false, productInLogo: false, proVersion: false },
        death: 'ai',
        reactions: [
          { from: 'system', text: '智稿 AI 已交付。客户评分：★★★★★' },
          { from: 'director', text: '（私聊）这单子以后就归 AI 管了。' },
          { from: 'director', text: '（私聊）你今天……什么都没做，对吧。' },
        ],
      },
      {
        id: 'R3B',
        label: '关掉 AI，亲手改最后一版',
        sub: '违背流程，后果自负',
        canvas: { logoSize: 45, proVersion: true, aiVersion: false, slogan: false, productInLogo: false },
        ending: 'hand',
        reactions: [
          { from: 'me', text: '（你关掉 AI，把 Logo 放回 45%，让产品重新呼吸。）' },
          { from: 'client', text: '这版……怎么感觉不一样了？说不上来。' },
          { from: 'director', text: '（私聊）这版比 AI 好。' },
          { from: 'director', text: '（私聊）别说是你做的。系统会判定你「效率低下」。' },
        ],
      },
      {
        id: 'R3C',
        label: '把这几天所有版本打包发给客户，让他自己选',
        sub: 'v1 到 v9，一网打尽',
        zip: true,
        ending: 'chaos',
        reactions: [
          { from: 'me', text: '（附件：海报_全部版本_你挑一个.zip）' },
          { from: 'client', text: '？？？' },
          { from: 'client', text: '……你们设计师是不是有病。辛苦啦！' },
          { from: 'director', text: '（私聊）哈哈哈哈哈哈' },
          { from: 'director', text: '（私聊）截图发我，我要留档。' },
          { from: 'client', text: '等等。第 7 版是谁做的？就要那个。' },
          { from: 'system', text: '第 7 版，是你最初的那版专业稿。' },
        ],
      },
      {
        id: 'R3D',
        label: '（已读不回）',
        sub: '……',
        ending: 'ignore',
        reactions: [],
      },
    ],
  },
}

// 第 1 轮选择决定第 2 轮分支
export function nextRoundId(roundId: string, optionId: string): string | null {
  if (roundId === 'r1') return optionId === 'C' ? 'r2C' : 'r2A'
  if (roundId === 'r2A' || roundId === 'r2C') return 'r3'
  return null
}

// ════════════════════ 三层事件结构 ════════════════════

/** 突袭事件：无选择，纯叙事+强制后果，打破玩家节奏 */
export interface SurpriseEvent {
  id: string
  weight: number
  /** 触发条件（可选），返回 true 才入池 */
  condition?: (flags: Record<string, boolean>) => boolean
  intro: ChatMsg[]
  canvas?: Partial<CanvasState>
  flags?: Record<string, boolean>
}

/** 突袭事件池：每局随机抽取 0~1 个插入回合之间 */
export const surpriseEvents: SurpriseEvent[] = [
  {
    id: 'powerOutage',
    weight: 1,
    intro: [
      { from: 'system', text: '【突发】整个片区跳闸。' },
      { from: 'system', text: '你的屏幕黑了三秒。' },
      { from: 'me', text: '（文件……保存了吗？）' },
      { from: 'system', text: '来电后，PS 弹出一个恢复窗口。' },
      { from: 'system', text: '恢复内容：「未命名-1」· 3 分钟前。' },
    ],
    canvas: { logoSize: 25 },
    flags: { nearDeath: true },
  },
  {
    id: 'clientCall',
    weight: 1,
    intro: [
      { from: 'system', text: '【语音来电】客户 · 李总' },
      { from: 'client', text: '小X啊，我刚跟老板开会。' },
      { from: 'client', text: '他说了，LOGO还可以再大一点。', hot: true },
      { from: 'client', text: '你直接改，不用走流程了。' },
      { from: 'system', text: '电话挂断。你甚至没有机会说「好的」。' },
    ],
    canvas: { logoSize: 78 },
  },
  {
    id: 'directorWarning',
    weight: 1,
    condition: (flags) => flags.twoVersions === true,
    intro: [
      { from: 'director', text: '（私聊）你做的那个「专业版」，客户看到了。' },
      { from: 'director', text: '（私聊）李总问我们公司是不是有两个设计标准。' },
      { from: 'director', text: '（私聊）我帮你圆了。下不为例。' },
      { from: 'system', text: '那个藏在文件夹深处的 v_专业版.psd，突然变得烫手。' },
    ],
    flags: { warned: true },
  },
  {
    id: 'printerError',
    weight: 1,
    intro: [
      { from: 'system', text: '【印刷厂紧急通知】' },
      { from: 'system', text: '您发送的文件因「字体缺失」导致乱码。' },
      { from: 'system', text: '已自动替换为：微软雅黑。' },
      { from: 'client', text: '在吗？这版怎么跟之前不一样？？？' },
      { from: 'me', text: '（你检查文件——字体全被替换了。）' },
    ],
    flags: { printerError: true },
  },
]

/** 深渊事件：选择时埋下标记，指定轮次触发后续 */
export interface AbyssEffect {
  tag: string
  triggerRound: string
  intro: ChatMsg[]
  options: Option[]
}

/** 深渊事件注册表 */
export const abyssEffects: AbyssEffect[] = [
  {
    tag: 'twoVersions', // 与 flags.twoVersions 对应
    triggerRound: 'r3',
    intro: [
      { from: 'system', text: '【突发】印刷厂来电。' },
      { from: 'system', text: '「你们发了两个版本，我们印了大的那个。」' },
      { from: 'client', text: '在吗？海报怎么有两个版本？！' },
      { from: 'client', text: '老板问我们公司内部是不是不统一？？' },
    ],
    options: [
      {
        id: 'abyss_1',
        label: '装死：说是系统bug',
        sub: 'IT部的锅',
        flags: { blameIT: true },
        reactions: [
          { from: 'me', text: '（你截图了一个假的「系统异常」提示。）' },
          { from: 'client', text: '……行吧。下次注意。' },
          { from: 'director', text: '（私聊）你哪来的那张图？' },
          { from: 'director', text: '（私聊）算了，别告诉我。' },
        ],
      },
      {
        id: 'abyss_2',
        label: '承认：两个版本都是我做的',
        sub: '硬刚',
        death: 'honest',
        reactions: [
          { from: 'me', text: '是，我做了两版。一版给领导看，一版给专业看。' },
          { from: 'client', text: '……' },
          { from: 'client', text: '你们总监电话给我。' },
        ],
      },
    ],
  },
]

/** 首局强制钩子：第一局结束时抛出，制造「再来一局」动机 */
export const firstGameHook: ChatMsg[] = [
  { from: 'system', text: '【次日 00:13】' },
  { from: 'system', text: '你收到了一封匿名邮件。' },
  { from: 'system', text: '附件是一张名片扫描件。' },
  { from: 'me', text: '（名片上只有一个地址，和一行手写小字：）' },
export function nextRoundId(roundId: string, optionId: string): string | null {
  if (roundId === 'r1') return optionId === 'C' ? 'r2C' : 'r2A'
  if (roundId === 'r2A' || roundId === 'r2C') return 'r3'
  return null
}

// 每轮交付时发出去的文件名（文件名本身也是笑话）
export const deliveryFiles: Record<string, string> = {
  r1: '海报_v2.psd',
  r2A: '海报_v2_最终版.psd',
  r2C: '海报_专业版_最终版.psd',
}

// R3C 打包动画：设计师的命名堕落史
export const zipFiles: string[] = [
  '海报_v1.psd',
  '海报_v2.psd',
  '海报_v2_修改.psd',
  '海报_v3_大气版.psd',
  '海报_v4_更大气.psd',
  '海报_v5_最终版.psd',
  '海报_v6_最终版2.psd',
  '海报_v7_专业版.psd',
  '海报_v8_真的最终版.psd',
  '海报_v9_最终_再改是狗.psd',
]

export const zipName = '海报_全部版本_你挑一个.zip'

// ─────────────────────── 生存结局 ───────────────────────

export interface Ending {
  title: string
  lines: ChatMsg[]
}

export const endings: Record<string, Ending> = {
  hand: {
    title: '结局 · 未被预设的一版',
    lines: [
      { from: 'director', text: '（私聊）你身上那种不可预测的东西，是 AI 替代不了的。' },
      { from: 'director', text: '（私聊）继续保持。别声张。' },
    ],
  },
  chaos: {
    title: '结局 · 荒诞反击',
    lines: [
      { from: 'client', text: '下一季新品……还找你。别问为什么。辛苦啦！' },
      { from: 'director', text: '（私聊）你是我见过的第一个把甲方绕晕的人。' },
    ],
  },
  ignore: {
    title: '结局 · 已读不回',
    lines: [
      { from: 'system', text: '消息已被对方已读。' },
      { from: 'system', text: '三天过去了。' },
      { from: 'client', text: '在吗？' },
      { from: 'system', text: '你没有回复。' },
      { from: 'director', text: '（私聊）全公司都在猜你为什么已读不回。' },
      { from: 'director', text: '（私聊）别解释。他们现在看你的眼神都不一样了。' },
    ],
  },
  hand_trust: {
    title: '结局 · 甲方的自己人',
    lines: [
      { from: 'client', text: '以后我们的单子，不要用那个 AI。' },
      { from: 'client', text: '就要你亲手做的。辛苦啦！' },
      { from: 'director', text: '（私聊）恭喜，你有了「客户指定」待遇。' },
      { from: 'director', text: '（私聊）这待遇，AI 抢不走。' },
    ],
  },
  hand_money: {
    title: '结局 · 涨价的手艺人',
    lines: [
      { from: 'client', text: '亲手做的？那得加钱吧。' },
      { from: 'client', text: '加。别拿 AI 糊弄我。' },
      { from: 'director', text: '（私聊）AI 让设计免费，让「你做的」收费。' },
    ],
  },
}

/** 生存结局 = 第 3 轮选择 × 过程旗标 */
export function resolveEnding(choice: string, flags: Record<string, boolean>): string {
  if (choice === 'ignore') return 'ignore'
  if (choice === 'hand') {
    if (flags.trust) return 'hand_trust'
    if (flags.money) return 'hand_money'
    return 'hand'
  }
  return 'chaos'
}

// ─────────────── 毕业死法：菜鸟设计师的一万种死法 ───────────────

export interface Death {
  no: string
  title: string
  /** 写在《解除劳动合同通知书》上的死因 */
  reason: string
}

export const deaths: Record<string, Death> = {
  virus: {
    no: 'No.000',
    title: '手贱死',
    reason: '你点开了垃圾箱里的「offer补充条款_务必查收.exe」。offer 被当场粉碎。职业生涯结束于开始之前。',
  },
  reason: {
    no: 'No.001',
    title: '讲道理死',
    reason: '试图教甲方做人。李总投诉你「服务态度恶劣」，公司决定「优化」你。',
  },
  leapfrog: {
    no: 'No.002',
    title: '越级死',
    reason: '你绕开李总直接联系了他老板。没人告诉你，老板和李总是高中同学。',
  },
  honest: {
    no: 'No.003',
    title: '诚实死',
    reason: '你在乙方行业说了真话。李总当即终止合作，公司把你推出去祭天。',
  },
  blackout: {
    no: 'No.004',
    title: '断电死',
    reason: 'IT 部明明提醒过你的。海报_v9.psd 未保存。你对 Ctrl+S 的力量一无所知。',
  },
  ai: {
    no: 'No.005',
    title: 'AI 死',
    reason: '你把一切都喂给了 AI。经评估，你的岗位已无存续必要。',
  },
  slip: {
    no: 'No.006',
    title: '手滑死',
    reason: '你把「老板好油啊」发进了 47 人的公司大群。撤回时限两分钟，公司的网卡了三分钟。',
  },
}

// 过程中攒下的"债务"，在结尾一并结算
export function flagEpilogues(flags: Record<string, boolean>): string[] {
  const out: string[] = []
  if (flags.twoVersions) out.push('你做的两个版本，改变了这一天的走向。')
  if (flags.trust) out.push('李总欠你一个人情。这个人情比尾款值钱。')
  if (flags.money) out.push('你用荒诞给自己涨了价。')
  if (flags.sneaky) out.push('那个指甲盖大小的产品图，还藏在 Logo 里。')
  if (flags.saved) out.push('你保存了文件。你今天战胜了这个行业 80% 的意外。')
  return out
}
