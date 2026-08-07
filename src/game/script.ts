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
  reactions: [{ from: 'me', text: '（你按下了 Ctrl+S。你对技术负责。技术是否为你负责，15:00 见分晓。）' }],
}

export const rounds: Record<string, Round> = {
  // ───────────────────────── 第 1 轮：再大一点 ─────────────────────────
  r1: {
    id: 'r1',
    label: '需求 1 / 3',
    intro: [
      { from: 'system', text: '【派单流转】市场部 → 李总 → 你' },
      { from: 'system', text: '【原始需求】「要有大气感」（转发自：李总微信语音，2\'17"）' },
      { from: 'system', text: '【备注】李总原话：「你懂我意思吧？」' },
      { from: 'client', text: '辛苦辛苦，在忙吗？' },
      { from: 'client', text: '海报初稿看了。整体……怎么说呢，差点意思。' },
      { from: 'client', text: '要大气，要国际化。我们明年可是要去纳斯达克敲钟的。' },
      { from: 'client', text: '具体怎么弄，你们专业的看着办。反正——再大一点。', hot: true },
      { from: 'system', text: '你没有收到参考图、尺寸要求或任何书面定义。「大气」没有翻译件。' },
    ],
    canvas: { logoSize: 30 },
    options: [
      {
        id: 'A',
        label: '照做：往大里猜',
        sub: '猜错的风险也是你的',
        canvas: { logoSize: 62 },
        reactions: [
          { from: 'me', text: '（你把 Logo 从 30% 拉到了 62%。）' },
          { from: 'client', text: '哎呀——对！就是这个感觉！国际化！' },
          { from: 'client', text: '改完这单给你加鸡腿 🍗' },
          { from: 'system', text: '没有人知道「国际化」和「大」之间的关系。包括李总。' },
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
          { from: 'system', text: '他承认自己无法表达，但责任仍在你。' },
          { from: 'director', text: '（私聊）别跟他讲道理。他签的是年费合同。' },
        ],
      },
      {
        id: 'C',
        label: '偷做两个版本：客户版 + 专业版',
        sub: '一个交差，一个留给自己',
        canvas: { logoSize: 62 },
        flags: { twoVersions: true },
        reactions: [
          { from: 'me', text: '（你提交了放大版，同时在文件夹深处留下了 v_专业版.psd。）' },
          { from: 'client', text: '这版可以！国际化！就它了！' },
          { from: 'system', text: '他选了哪版、另一版会不会被看到，你永远不会知道。' },
        ],
      },
      {
        id: 'D',
        label: '跟李总深入探讨设计理论',
        sub: '（不建议）',
        death: 'reason',
        reactions: [
          { from: 'me', text: '李总，设计是一门关于信息层级的科学，我们先把「大气」定义清楚——' },
          { from: 'client', text: '……' },
          { from: 'client', text: '麻烦把你们总监电话给我一下，谢谢。' },
          { from: 'system', text: '你试图澄清一个无法表达的需求。系统惩罚了试图澄清的人。' },
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
      { from: 'system', text: '【派单流转】李总的老板 → 李总 → 你 ｜ 另有：李总的儿子（7 岁）→ 李总 → 你' },
      { from: 'system', text: '【IT 部通知】今日 15:00 机房检修，可能断电，请随时保存文件。' },
      { from: 'client', text: '在吗辛苦啦！' },
      { from: 'client', text: '两个事。第一，我儿子看了海报，他说不行。他今年七岁，审美很前卫。' },
      { from: 'client', text: '第二，我们老板发话了：Logo 还不够大。再加句 slogan：「行业领导者」，要金色的，会闪的，对标苹果。', hot: true },
      { from: 'client', text: '两个意见都要落实。你们设计师不就是干这个的？' },
      { from: 'system', text: '提示：老板要「更大」，儿子说「不行」。两个需求互为否定，且都有截图为证。你将对最终结果负责。' },
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
          { from: 'system', text: '两个互相否定的需求同时被宣布满意。没有人解释为什么。' },
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
          { from: 'system', text: '你绕过了信息链。信息链随即绕过了你。' },
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
      { from: 'system', text: '【派单流转】你 → 李总 → 印刷厂（已跳过：审核）' },
      { from: 'system', text: '【IT 部通知】今日 15:00 机房检修，可能断电，请随时保存文件。' },
      { from: 'client', text: '辛苦，出事了。' },
      { from: 'client', text: '我把文件发印刷厂，发成你那个「专业版」了。' },
      { from: 'client', text: '5 万册，已经开机了。' },
      { from: 'client', text: '你能不能跟公司说——专业版就是最终版？拜托拜托 🙏' },
      { from: 'system', text: '信息在链路上滑了一格。现在它停在你这里，连同 5 万册。' },
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
          { from: 'system', text: '你为一个不属于你的错误负了责。这就是这个岗位的日常。' },
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
          { from: 'system', text: '这个系统不需要真实。它需要有人负责。' },
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
          { from: 'system', text: '你第一次发现，「负责」是可以定价的。' },
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
      { from: 'system', text: 'AI 接入的环节：和你一样，信息链最末端。' },
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
          { from: 'me', text: '（你打开 AI 的源文件：关键词是「大气、国际化、领导满意」——和你上次用的完全一样。）' },
          { from: 'system', text: '区别在于：AI 不需要解释为什么 Logo 挡住了产品。' },
          { from: 'director', text: '（私聊）这单子以后就归 AI 管了。' },
          { from: 'director', text: '（私聊）你今天……什么都没做，对吧。' },
          { from: 'system', text: '系统找到了一个不需要负责的末端。' },
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
          { from: 'system', text: '你保留了不可预测性。代价是：每一版，都要你亲手做。' },
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
          { from: 'system', text: '需求绕了一圈，回到你没说出口的地方。' },
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
      { from: 'system', text: '李总不知道他想要什么，但他知道找你要。' },
      { from: 'system', text: 'AI 可以生成一千版，但它不会在被投诉时坐在会议室里。' },
    ],
  },
  chaos: {
    title: '结局 · 荒诞反击',
    lines: [
      { from: 'client', text: '下一季新品……还找你。别问为什么。辛苦啦！' },
      { from: 'director', text: '（私聊）你是我见过的第一个把甲方绕晕的人。' },
      { from: 'system', text: '需求绕了一圈，回到你没说出口的地方。' },
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
      { from: 'system', text: '沉默没有失真。但它也没有被交付。' },
    ],
  },
  hand_trust: {
    title: '结局 · 甲方的自己人',
    lines: [
      { from: 'client', text: '以后我们的单子，不要用那个 AI。' },
      { from: 'client', text: '就要你亲手做的。辛苦啦！' },
      { from: 'director', text: '（私聊）恭喜，你有了「客户指定」待遇。' },
      { from: 'director', text: '（私聊）这待遇，AI 抢不走。' },
      { from: 'system', text: '从今往后，每一版的责任都精确到人：你。' },
    ],
  },
  hand_money: {
    title: '结局 · 涨价的手艺人',
    lines: [
      { from: 'client', text: '亲手做的？那得加钱吧。' },
      { from: 'client', text: '加。别拿 AI 糊弄我。' },
      { from: 'director', text: '（私聊）AI 让设计免费，让「你做的」收费。' },
      { from: 'system', text: '你卖的不是图，是有人愿意为结果签字。' },
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
    reason: '你试图把不可表达的东西表达清楚。系统惩罚了试图澄清的人：李总投诉你「服务态度恶劣」，公司决定「优化」你。',
  },
  leapfrog: {
    no: 'No.002',
    title: '越级死',
    reason: '你绕过了信息链，信息链绕过了你：没人告诉你，老板和李总是高中同学。',
  },
  honest: {
    no: 'No.003',
    title: '诚实死',
    reason: '这个系统不需要真实，它需要有人负责：李总当即终止合作，公司把你推出去祭天。',
  },
  blackout: {
    no: 'No.004',
    title: '断电死',
    reason: '你对技术负责，技术不为你负责：IT 部明明提醒过你的。海报_v9.psd 未保存。',
  },
  ai: {
    no: 'No.005',
    title: 'AI 死',
    reason: '系统找到了不需要负责的末端。经评估，你的岗位已无存续必要。',
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
