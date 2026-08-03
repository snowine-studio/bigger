// 《再大一点》Demo 剧本数据
// 引擎只认这里的数据，改剧情只动这个文件。

export type Speaker = 'client' | 'director' | 'system' | 'me'

export interface ChatMsg {
  from: Speaker
  text: string
}

export interface CanvasState {
  logoSize: number // logo 占画面宽度百分比
  slogan: boolean // 金色闪烁 slogan
  productInLogo: boolean // 产品图被偷偷塞进 logo
  aiVersion: boolean // AI 一键生成版（logo 糊满全屏）
  proVersion: boolean // 你亲手改的专业版
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
  /** 第 3 轮专用：直接指向结局 */
  ending?: string
}

export interface Round {
  id: string
  label: string
  intro: ChatMsg[]
  canvas?: Partial<CanvasState>
  options: Option[]
}

export const rounds: Record<string, Round> = {
  // ───────────────────────── 第 1 轮：再大一点 ─────────────────────────
  r1: {
    id: 'r1',
    label: '需求 1 / 3',
    intro: [
      { from: 'system', text: '【新派单】客户 · 李总（年费合同客户）' },
      { from: 'client', text: '在吗？海报初稿看了。' },
      { from: 'client', text: '整体不错，很有感觉。' },
      { from: 'client', text: '但是吧……不够大气。' },
      { from: 'client', text: 'Logo，再大一点。' },
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
          { from: 'client', text: '哎——对！这就是我要的大气！！' },
          { from: 'director', text: '（私聊）你为什么把产品图挡住了？？？' },
          { from: 'director', text: '……算了。客户高兴就好。吧。' },
        ],
      },
      {
        id: 'B',
        label: '坚持专业：解释比例问题',
        sub: '跟他讲讲什么叫视觉层级',
        funnel: true,
        reactions: [
          { from: 'me', text: '李总，Logo 已经占画面 30% 了，再大会挤压产品主体，视觉层级会——' },
          { from: 'client', text: '我不是设计师，我不懂什么比例。' },
          { from: 'client', text: '你就告诉我：能不能，再，大，一，点？' },
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
          { from: 'client', text: '这版可以！就它了！' },
          { from: 'system', text: '你悄悄保留了另一个版本。没有人知道。' },
        ],
      },
    ],
  },

  // ───────────────────── 第 2 轮 A 线：老板也看了 ─────────────────────
  r2A: {
    id: 'r2A',
    label: '需求 2 / 3',
    intro: [
      { from: 'system', text: '【新派单 · 加急】客户 · 李总' },
      { from: 'client', text: '在吗？我们老板看到海报了。' },
      { from: 'client', text: '老板说：Logo 还不够大。' },
      { from: 'client', text: '顺便加一句 slogan：「行业领导者」。' },
      { from: 'client', text: '要金色的。会闪的那种。' },
    ],
    canvas: { logoSize: 62 },
    options: [
      {
        id: 'A1',
        label: '照做：再放大 + 金色闪烁 slogan',
        sub: '大就大到底',
        canvas: { logoSize: 82, slogan: true },
        reactions: [
          { from: 'me', text: '（Logo 占满画面，产品彻底消失，slogan 金光闪闪。）' },
          { from: 'client', text: '完美！老板非常满意！！' },
          { from: 'director', text: '（私聊）这图……产品在哪？' },
          { from: 'director', text: '哦。在 Logo 底下。行吧。' },
        ],
      },
      {
        id: 'A2',
        label: '找总监求助',
        sub: '这活儿不能只有我一个人扛',
        funnel: true,
        reactions: [
          { from: 'director', text: '（私聊）我也想帮你。' },
          { from: 'director', text: '但是他老板，是我们年费合同的签字人。' },
          { from: 'director', text: '……你知道该怎么办。' },
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
          { from: 'client', text: '大气！！' },
          { from: 'director', text: '（私聊）你把产品 P 进 Logo 里了？' },
          { from: 'director', text: '有点东西。别让客户发现。' },
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
      { from: 'client', text: '出事了。' },
      { from: 'client', text: '我把文件发印刷厂，发成你那个「专业版」了。' },
      { from: 'client', text: '5 万册，已经开机了。' },
      { from: 'client', text: '你能不能跟公司说——专业版就是最终版？' },
    ],
    canvas: { logoSize: 30, proVersion: true },
    options: [
      {
        id: 'C1',
        label: '背锅：承认专业版是最终版',
        sub: '救他一次',
        flags: { trust: true },
        reactions: [
          { from: 'me', text: '……对，那版就是最终版。我最后改过。' },
          { from: 'client', text: '兄弟！够意思！尾款下周就打！' },
          { from: 'director', text: '（私聊）印出来的那版，居然能看。' },
          { from: 'director', text: '……你什么时候做的这版？' },
        ],
      },
      {
        id: 'C2',
        label: '说实话：是客户自己发错的',
        sub: '凭什么我背',
        flags: { complaint: true },
        reactions: [
          { from: 'me', text: '文件管理是贵司的问题，我发的版本没有问题。' },
          { from: 'client', text: '……行。你等着。' },
          { from: 'director', text: '（私聊）客户投诉你了，说你「文件管理混乱」。' },
          { from: 'director', text: '我帮你压下来了。下不为例。' },
        ],
      },
      {
        id: 'C3',
        label: '收费封口：加钱才背锅',
        sub: '风险要有价格',
        flags: { money: true },
        reactions: [
          { from: 'me', text: '可以。但这是「版本管理服务」，加 20%。' },
          { from: 'client', text: '你！……行。但这件事到此为止。' },
          { from: 'director', text: '（私聊）客户主动给你加了预算？' },
          { from: 'director', text: '你怎么办到的？？' },
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
      { from: 'client', text: '在吗？' },
      { from: 'client', text: '那个 Logo……' },
      { from: 'client', text: '再大一点。' },
    ],
    options: [
      {
        id: 'R3A',
        label: '把需求喂给 AI，5 分钟交稿',
        sub: '服从系统，准点下班',
        canvas: { logoSize: 100, aiVersion: true, slogan: false, productInLogo: false, proVersion: false },
        ending: 'ai',
        reactions: [
          { from: 'system', text: '智稿 AI 已交付。客户评分：★★★★★' },
          { from: 'director', text: '（私聊）这单子以后就归 AI 管了。' },
          { from: 'director', text: '你今天……什么都没做，对吧。' },
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
          { from: 'director', text: '别说是你做的。系统会判定你「效率低下」。' },
        ],
      },
      {
        id: 'R3C',
        label: '把这几天所有版本打包发给客户，让他自己选',
        sub: 'v1 到 v9，一网打尽',
        ending: 'chaos',
        reactions: [
          { from: 'me', text: '（附件：海报_v1.zip …… 海报_v9_最终_真的最终.zip）' },
          { from: 'client', text: '？？？' },
          { from: 'client', text: '……你们设计师是不是有病。' },
          { from: 'director', text: '（私聊）哈哈哈哈哈哈' },
          { from: 'director', text: '截图发我，我要留档。' },
          { from: 'client', text: '等等。第 7 版是谁做的？就要那个。' },
          { from: 'system', text: '第 7 版，是你最初的那版专业稿。' },
        ],
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

export interface Ending {
  title: string
  lines: ChatMsg[]
}

export const endings: Record<string, Ending> = {
  ai: {
    title: '结局 · 高效牛马',
    lines: [
      { from: 'system', text: '设计师季度绩效评估：协作度优秀，效率提升 340%。' },
      { from: 'director', text: '（私聊）恭喜你，成功把自己训练成了 AI 的操作员。' },
    ],
  },
  hand: {
    title: '结局 · 未被预设的一版',
    lines: [
      { from: 'director', text: '（私聊）你身上那种不可预测的东西，是 AI 替代不了的。' },
      { from: 'director', text: '继续保持。别声张。' },
    ],
  },
  chaos: {
    title: '结局 · 荒诞反击',
    lines: [
      { from: 'client', text: '下一季新品……还找你。别问为什么。' },
      { from: 'director', text: '（私聊）你是我见过的第一个把甲方绕晕的人。' },
    ],
  },
}

// 过程中攒下的"债务"，在结尾一并结算
export function flagEpilogues(flags: Record<string, boolean>): string[] {
  const out: string[] = []
  if (flags.twoVersions) out.push('你做的两个版本，改变了这一天的走向。')
  if (flags.trust) out.push('李总欠你一个人情。这个人情比尾款值钱。')
  if (flags.money) out.push('你用荒诞给自己涨了价。')
  if (flags.complaint) out.push('你的档案里多了一条投诉，也多了一条骨气。')
  if (flags.sneaky) out.push('那个指甲盖大小的产品图，还藏在 Logo 里。')
  return out
}
