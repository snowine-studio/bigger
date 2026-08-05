import { useCallback, useEffect, useRef, useState } from 'react'
import {
  rounds,
  endings,
  deaths,
  nextRoundId,
  deliveryFiles,
  zipFiles,
  zipName,
  resolveEnding,
  flagEpilogues,
  initialCanvas,
  type CanvasState,
  type ChatMsg,
  type Option,
  type Speaker,
} from './game/script'
import * as sfx from './game/audio'

/** 打包 zip 三段式：看文件（停留）→ 点打包压成 zip → 点发送嗖地飞走 */
function ZipOverlay({ onDone }: { onDone: () => void }) {
  const [shown, setShown] = useState(0)
  const [stage, setStage] = useState<'list' | 'zipping' | 'zipped' | 'sent'>('list')

  useEffect(() => {
    const iv = setInterval(() => {
      setShown((s) => {
        if (s >= zipFiles.length) {
          clearInterval(iv)
          return s
        }
        sfx.pop('me')
        return s + 1
      })
    }, 230)
    return () => clearInterval(iv)
  }, [])

  const allShown = shown >= zipFiles.length

  const doZip = () => {
    sfx.click()
    setStage('zipping')
    setTimeout(() => {
      setStage('zipped')
      sfx.stamp()
    }, 450)
  }

  const doSend = () => {
    sfx.send()
    setStage('sent')
  }

  return (
    <div
      onClick={() => stage === 'sent' && onDone()}
      className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center gap-3 p-6"
    >
      {/* 文件列表：zipping 时整体收缩消失 */}
      {(stage === 'list' || stage === 'zipping') && (
        <div
          className={`w-full max-w-md space-y-1.5 transition-all duration-500 ${
            stage === 'zipping' ? 'opacity-0 scale-50 translate-y-8' : ''
          }`}
        >
          {zipFiles.slice(0, shown).map((f, i) => (
            <div
              key={i}
              className="bg-white text-black font-mono text-xs md:text-sm px-3 py-1.5 border-2 border-black shadow-[3px_3px_0_#1e50a2] animate-[fadeIn_.15s_ease]"
            >
              📄 {f}
            </div>
          ))}
        </div>
      )}

      {/* 阶段按钮 / zip 徽章 */}
      {stage === 'list' && allShown && (
        <button
          onClick={doZip}
          className="mt-3 px-8 py-3 bg-sky-300 text-black border-[3px] border-black font-black tracking-widest shadow-[5px_5px_0_#e60012] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#e60012] active:shadow-none transition-all animate-[fadeIn_.3s_ease]"
        >
          📦 打包
        </button>
      )}

      {stage === 'zipped' && (
        <>
          <div className="bg-[#ffe800] text-black font-black text-base md:text-xl px-6 py-4 border-4 border-black shadow-[8px_8px_0_#e60012] rotate-[-1deg] animate-[fadeIn_.2s_ease]">
            📦 {zipName}
          </div>
          <button
            onClick={doSend}
            className="mt-2 px-10 py-3 bg-lime-300 text-black border-[3px] border-black font-black tracking-widest shadow-[5px_5px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] active:shadow-none transition-all"
          >
            发送给客户 →
          </button>
        </>
      )}

      {stage === 'sent' && (
        <>
          <div className="bg-[#ffe800] text-black font-black text-base md:text-xl px-6 py-4 border-4 border-black shadow-[8px_8px_0_#e60012] animate-[flyOff_.55s_ease-in_forwards]">
            📦 {zipName}
          </div>
          <div className="text-lime-300 font-black text-sm mt-6 tracking-widest animate-[fadeIn_.3s_ease_.4s_both]">已发送 ✓</div>
          <div className="text-zinc-500 text-xs mt-3 animate-[fadeIn_.3s_ease_.7s_both]">点按任意处继续</div>
        </>
      )}
    </div>
  )
}

/** 全局静音开关 */
function MuteBtn() {
  const [m, setM] = useState(sfx.isMuted())
  return (
    <button
      onClick={(e) => {
        e.stopPropagation()
        setM(sfx.toggleMute())
      }}
      className="fixed bottom-3 right-3 z-[60] w-10 h-10 rounded-full bg-zinc-800 border-2 border-black text-sm flex items-center justify-center shadow-[3px_3px_0_#000] active:translate-x-[1px] active:translate-y-[1px] active:shadow-none"
      title={m ? '取消静音' : '静音'}
    >
      {m ? '🔇' : '🔊'}
    </button>
  )
}

/** 简历里「括号内的字」：鼠标悬停 / 点按才显现 */
function Secret({ children }: { children: React.ReactNode }) {
  const [show, setShow] = useState(false)
  return (
    <span
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onClick={(e) => {
        e.stopPropagation()
        setShow((v) => !v)
      }}
      className={`cursor-help transition-opacity duration-200 ${show ? 'opacity-100' : 'opacity-0'} text-zinc-400`}
    >
      {children}
    </span>
  )
}

type Phase = 'intro' | 'offer' | 'moments' | 'alarm' | 'playing' | 'interlude' | 'ending' | 'death'

// 死法图鉴（localStorage）
const DEATHS_KEY = 'zdyld_deaths'
function getUnlockedDeaths(): string[] {
  try {
    return JSON.parse(localStorage.getItem(DEATHS_KEY) ?? '[]')
  } catch {
    return []
  }
}
function unlockDeath(id: string): string[] {
  const list = getUnlockedDeaths()
  if (!list.includes(id)) {
    list.push(id)
    try {
      localStorage.setItem(DEATHS_KEY, JSON.stringify(list))
    } catch {
      /* 隐私模式忽略 */
    }
  }
  return list
}

const MSG_DELAY = 800 // 消息逐条弹出间隔（初玩者节奏）

const speakerMeta: Record<Speaker, { name: string; bubble: string; align: string; avatar: string }> = {
  // 李总 = 甲方世界：黄色爆炸贴纸，硬阴影，微微歪斜地拍在屏幕上
  client: {
    name: '客户 · 李总',
    bubble: 'bg-[#ffe800] text-black border-[3px] border-black shadow-[4px_4px_0_#e60012] rotate-[-0.8deg] font-bold rounded-lg',
    align: 'justify-start',
    avatar: '甲',
  },
  // Ray = 设计师世界：维持冷淡正常，他的"正常"就是对比
  director: { name: '总监 · Ray（私聊）', bubble: 'bg-violet-900/60 border-violet-700/50 text-zinc-100', align: 'justify-start', avatar: 'R' },
  system: { name: '系统', bubble: 'bg-zinc-800/80 border-zinc-600/50 text-zinc-300 italic', align: 'justify-center', avatar: '' },
  me: { name: '你', bubble: 'bg-[#ff2e88] text-white border-[3px] border-black shadow-[4px_4px_0_#1e50a2] rotate-[0.6deg] font-bold rounded-lg', align: 'justify-end', avatar: '我' },
}

function Avatar({ s }: { s: Speaker }) {
  if (s === 'system') return null
  return (
    <div className="w-8 h-8 shrink-0 rounded-full bg-zinc-700 border border-zinc-500 flex items-center justify-center text-xs font-bold text-zinc-200">
      {speakerMeta[s].avatar}
    </div>
  )
}

function ChatBubble({ msg }: { msg: ChatMsg }) {
  const meta = speakerMeta[msg.from]
  if (msg.from === 'system') {
    return (
      <div className="flex justify-center animate-[fadeIn_.4s_ease]">
        <div className={`max-w-[95%] rounded-lg border px-3 py-2 text-xs leading-relaxed ${meta.bubble}`}>{msg.text}</div>
      </div>
    )
  }
  // 李总：普通消息白贴纸，核心需求（hot）才是黄色爆炸贴——黄色只当警报用
  const bubble =
    msg.from === 'client'
      ? msg.hot
        ? speakerMeta.client.bubble
        : 'bg-white text-black border-[3px] border-black shadow-[4px_4px_0_#000] rotate-[-0.5deg] font-bold rounded-lg'
      : meta.bubble
  return (
    <div className={`flex gap-2 ${meta.align} animate-[fadeIn_.4s_ease]`}>
      {msg.from !== 'me' && <Avatar s={msg.from} />}
      <div className={`max-w-[85%] rounded-xl border px-3 py-2 text-sm leading-relaxed ${bubble}`}>
        <div className="text-[10px] opacity-60 mb-0.5">{meta.name}</div>
        {msg.text}
      </div>
      {msg.from === 'me' && <Avatar s={msg.from} />}
    </div>
  )
}

/** 椰树风跑马灯 */
function Marquee({ className = '', reverse = false }: { className?: string; reverse?: boolean }) {
  const text = '再大一点 ✦ 大气 ✦ 客户满意 ✦ 行业领导者 ✦ 不够刺激 ✦ 五彩斑斓的黑 ✦ 高级感 ✦ 国际化 ✦ '
  return (
    <div className={`absolute left-0 right-0 h-8 bg-[#ffe800] border-y-2 border-black overflow-hidden flex items-center ${className}`}>
      <div
        className="whitespace-nowrap font-black text-black text-sm tracking-widest"
        style={{ animation: `marquee 22s linear infinite ${reverse ? 'reverse' : ''}` }}
      >
        {text.repeat(4)}
      </div>
    </div>
  )
}

/** 中间画布：一张新丑风海报，Logo 会长大；big=true 时为全屏放大模式 */
function Poster({ c, big = false }: { c: CanvasState; big?: boolean }) {
  // proVersion = 设计师亲手改的那版：丑得有章法，一眼"不一样"
  const pro = c.proVersion && !c.aiVersion
  return (
    <div
      className={`relative w-full ${big ? '' : 'max-w-[18vh] md:max-w-none'} aspect-[3/4] max-h-full overflow-hidden border-[3px] border-black shadow-[6px_6px_0_#000] transition-colors duration-700 ${
        pro ? 'bg-[#f4efe4]' : 'bg-[#ffd23f]'
      }`}
      style={{ containerType: 'inline-size' }}
    >
      {/* 顶部黑条密排小字（新丑标配） */}
      {!c.aiVersion && (
        <div className="absolute top-0 inset-x-0 bg-black text-[#ffd23f] font-black px-1 py-[1cqw] whitespace-nowrap overflow-hidden z-10" style={{ fontSize: '3.2cqw', letterSpacing: '0.25em' }}>
          NEW ARRIVAL ✦ 2026 春季新品 ✦ NEW ARRIVAL ✦ 2026 春季新品 ✦ NEW ARRIVAL
        </div>
      )}

      {/* 巨型裁切黑字（pro 版收敛为规整小字） */}
      {!c.aiVersion && !pro && (
        <div className="absolute left-[-4cqw] top-[10cqw] font-black text-black leading-none select-none" style={{ fontSize: '30cqw', transform: 'rotate(-6deg)' }}>
          新品
        </div>
      )}
      {pro && (
        <div className="absolute left-[6cqw] top-[9cqw] font-black text-black leading-none select-none" style={{ fontSize: '9cqw', letterSpacing: '0.3em' }}>
          新品上市
        </div>
      )}

      {/* 产品图：平涂撞色 + 粗黑描边 + 硬阴影 */}
      {!c.aiVersion && (
        <div className="absolute left-1/2 top-[64%] -translate-x-1/2 -translate-y-1/2 w-[26cqw] h-[36cqw]">
          <div
            className="w-full h-full bg-[#0d9488] relative"
            style={{ border: '1cqw solid #000', boxShadow: '2cqw 2cqw 0 #e60012', borderRadius: '6cqw 6cqw 1.5cqw 1.5cqw' }}
          >
            <div className="absolute left-1/2 -translate-x-1/2 -top-[4.5cqw] w-[10cqw] h-[5cqw] bg-[#0d9488]" style={{ border: '1cqw solid #000' }} />
            <div className="absolute inset-x-[2.5cqw] top-[11cqw] h-[12cqw] bg-white flex items-center justify-center" style={{ border: '0.8cqw solid #000' }}>
              <span className="font-black text-black tracking-widest text-center leading-tight" style={{ fontSize: '3cqw' }}>
                富硒
                <br />
                养生杯
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Logo：白椭圆贴纸标，带过渡动画地长大 */}
      <div
        className="absolute left-1/2 top-[7%] -translate-x-1/2 bg-white flex items-center justify-center transition-all duration-700 ease-in-out z-10"
        style={{
          width: `${c.logoSize}%`,
          aspectRatio: '1/1',
          borderRadius: '50%',
          border: '1.2cqw solid #000',
          boxShadow: '1.5cqw 1.5cqw 0 #000',
        }}
      >
        <span className="font-black text-black tracking-tight transition-all duration-700" style={{ fontSize: `${c.logoSize * 0.24}cqw` }}>
          LOGO
        </span>
        {c.productInLogo && (
          <div className="absolute right-[6%] bottom-[6%] w-[10%] h-[14%] bg-[#0d9488]" style={{ border: '0.5cqw solid #000', borderRadius: '1cqw 1cqw 0.3cqw 0.3cqw' }} />
        )}
      </div>

      {/* 红色爆炸贴（pro 版摘掉） */}
      {!c.aiVersion && !pro && (
        <div
          className="absolute right-[4%] top-[38%] bg-[#e60012] text-[#ffe800] font-black flex items-center justify-center z-10"
          style={{ width: '18cqw', height: '18cqw', fontSize: '6cqw', border: '1cqw solid #000', transform: 'rotate(14deg)', clipPath: 'polygon(50% 0%,61% 12%,75% 6%,80% 20%,94% 21%,93% 36%,100% 46%,93% 58%,97% 72%,85% 78%,82% 93%,68% 90%,58% 100%,48% 90%,34% 95%,29% 81%,14% 80%,17% 65%,6% 55%,15% 44%,10% 30%,24% 28%,30% 14%,42% 20%)' }}
        >
          必买!
        </div>
      )}

      {/* 底部密排小字（新丑标配） */}
      {!c.aiVersion && (
        <div className="absolute bottom-[1.5cqw] inset-x-[3cqw] text-black font-bold leading-tight z-0" style={{ fontSize: '2.6cqw' }}>
          本品由设计师在凌晨两点精心编排　成分：大气 30%　高级感 20%　国际视野 15%　玄学 35%　未经授权禁止缩小Logo　最终解释权归甲方所有
        </div>
      )}

      {c.slogan && (
        <div className="absolute bottom-[9cqw] inset-x-0 text-center z-20">
          <span className="font-black text-[#ffe800] bg-[#e60012] px-[2cqw] py-[0.5cqw] animate-pulse" style={{ fontSize: '7cqw', border: '1cqw solid #000', boxShadow: '1cqw 1cqw 0 #000' }}>
            ★ 行业领导者 ★
          </span>
        </div>
      )}

      {c.aiVersion && (
        <div className="absolute bottom-2 right-2 z-20 font-mono bg-black text-green-400 px-2 py-1" style={{ fontSize: '3cqw', border: '0.5cqw solid #ffe800' }}>
          GENERATED BY 智稿AI · 5min
        </div>
      )}
      {pro && (
        <div className="absolute bottom-[6cqw] right-[3cqw] z-20 font-mono bg-black text-[#f4efe4] px-2 py-1" style={{ fontSize: '3cqw' }}>
          v_专业版.psd
        </div>
      )}
    </div>
  )
}

export default function App() {
  const [phase, setPhase] = useState<Phase>('intro')
  const [roundId, setRoundId] = useState('r1')
  const [chat, setChat] = useState<ChatMsg[]>([])
  const [canvas, setCanvas] = useState<CanvasState>(initialCanvas)
  const [flags, setFlags] = useState<Record<string, boolean>>({})
  const [available, setAvailable] = useState<Option[]>([])
  const [busy, setBusy] = useState(false)
  const [canNext, setCanNext] = useState(false)
  const [endingId, setEndingId] = useState<string | null>(null)
  const [deathId, setDeathId] = useState<string | null>(null)
  const [takeover, setTakeover] = useState(false) // AI 全屏吞噬
  const [zipFx, setZipFx] = useState(false) // 打包 zip 动画
  const [zoomed, setZoomed] = useState(false) // 海报全屏放大
  const [attachment, setAttachment] = useState<'offer' | 'resume' | 'portfolio' | null>(null) // 邮件附件预览
  const [mailView, setMailView] = useState<'offer' | 'trash' | 'rejections'>('offer') // 邮箱里正在看的文件夹
  const [virus, setVirus] = useState(0) // 病毒阶段：0 无 / 1 运行中 / 2 offer 已销毁
  const [spamNote, setSpamNote] = useState<string | null>(null) // 点了垃圾邮件后的吐槽
  const [alarmSet, setAlarmSet] = useState(false) // 闹钟是否改到 7:00
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const pending = useRef<{ msgs: ChatMsg[]; fired: number; done: () => void } | null>(null)
  const afterTakeover = useRef<(() => void) | null>(null)
  const chatBox = useRef<HTMLDivElement>(null)
  const optionsBox = useRef<HTMLElement>(null)
  const lastChosenRef = useRef('')

  const clearTimers = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
  }

  useEffect(() => {
    chatBox.current?.scrollTo({ top: chatBox.current.scrollHeight, behavior: 'smooth' })
  }, [chat])

  // Logo 每变大一次就触发音效，体积越大越夸张
  const prevLogoSize = useRef(initialCanvas.logoSize)
  useEffect(() => {
    if (canvas.logoSize > prevLogoSize.current) sfx.grow(canvas.logoSize)
    prevLogoSize.current = canvas.logoSize
  }, [canvas.logoSize])

  // 手机端：选项出现时自动滚到选项区，避免玩家不知道还有选项
  useEffect(() => {
    if ((available.length > 0 || canNext) && !busy && window.matchMedia('(max-width: 767px)').matches) {
      const t = setTimeout(() => optionsBox.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 120)
      return () => clearTimeout(t)
    }
  }, [available.length, canNext, busy])

  useEffect(() => clearTimers, [])

  // 病毒邮件：运行 2.4 秒后，offer 被销毁（计入死法图鉴：手贱死）
  useEffect(() => {
    if (virus !== 1) return
    const t = setTimeout(() => {
      setVirus(2)
      unlockDeath('virus')
    }, 2400)
    return () => clearTimeout(t)
  }, [virus])

  /** 逐条把消息推进聊天框；点聊天区可快进 */
  const pushMessages = useCallback((msgs: ChatMsg[], done: () => void) => {
    if (msgs.length === 0) {
      done()
      return
    }
    const p = { msgs, fired: 0, done }
    pending.current = p
    msgs.forEach((m, i) => {
      timers.current.push(
        setTimeout(() => {
          p.fired = i + 1
          setChat((prev) => [...prev, m])
          sfx.pop(m.from)
          if (i === msgs.length - 1) {
            if (pending.current === p) pending.current = null
            done()
          }
        }, MSG_DELAY * (i + 1)),
      )
    })
  }, [])

  /** 快进：立即补完当前队列 */
  const flush = useCallback(() => {
    const p = pending.current
    if (!p) return
    clearTimers()
    pending.current = null
    const rest = p.msgs.slice(p.fired)
    if (rest.length) setChat((prev) => [...prev, ...rest])
    p.done()
  }, [])

  const startRound = useCallback(
    (id: string) => {
      const r = rounds[id]
      setRoundId(id)
      setAvailable(r.options)
      setCanNext(false)
      setBusy(true)
      if (r.canvas) setCanvas((c) => ({ ...c, ...r.canvas }))
      pushMessages(r.intro, () => setBusy(false))
    },
    [pushMessages],
  )

  const startGame = () => {
    clearTimers()
    pending.current = null
    afterTakeover.current = null
    setChat([])
    setFlags({})
    setCanvas(initialCanvas)
    setEndingId(null)
    setDeathId(null)
    setTakeover(false)
    setZipFx(false)
    lastChosenRef.current = ''
    setAttachment(null)
    setPhase('playing')
    startRound('r1')
  }

  const choose = (opt: Option) => {
    if (busy) return
    sfx.click()
    setBusy(true)
    const mergedFlags = opt.flags ? { ...flags, ...opt.flags } : flags
    if (opt.canvas) setCanvas((c) => ({ ...c, ...opt.canvas }))
    if (opt.flags) setFlags(mergedFlags)

    const afterReactions = () => {
      if (opt.death) {
        setDeathId(opt.death)
        setBusy(false)
        setCanNext(false)
        setPhase('death')
        return
      }
      if (opt.ending) {
        setEndingId(resolveEnding(opt.ending, mergedFlags))
        setBusy(false)
        setCanNext(false)
        setPhase('interlude')
        return
      }
      if (opt.funnel) {
        setAvailable((prev) => prev.filter((o) => o.id !== opt.id))
        setBusy(false)
      } else {
        setAvailable([])
        setBusy(false)
        setCanNext(true)
      }
    }

    if (opt.zip) {
      // 打包发客户：文件逐个弹出压成 zip，点按才继续
      afterTakeover.current = () => {
        afterTakeover.current = null
        setZipFx(false)
        pushMessages(opt.reactions, afterReactions)
      }
      setZipFx(true)
    } else if (opt.canvas?.aiVersion) {
      // AI 结局：Logo 吃掉整个屏幕，等玩家点按才继续
      afterTakeover.current = () => {
        afterTakeover.current = null
        setTakeover(false)
        pushMessages(opt.reactions, afterReactions)
      }
      setTakeover(true)
    } else {
      pushMessages(opt.reactions, afterReactions)
    }
  }

  const chooseTracked = (opt: Option) => {
    if (!opt.funnel) lastChosenRef.current = opt.id
    choose(opt)
  }

  const goNext = () => {
    const next = nextRoundId(roundId, lastChosenRef.current)
    if (!next) return
    // 第 2 轮没保存就交付 → 机房断电，毕业
    if ((roundId === 'r2A' || roundId === 'r2C') && !flags.saved) {
      setDeathId('blackout')
      setPhase('death')
      return
    }
    // 剧情内动作：先把稿子发出去，新需求自己找上门
    sfx.send() // 嗖～发过去
    setBusy(true)
    pushMessages([{ from: 'me', text: `（你发送了「${deliveryFiles[roundId] ?? '海报.psd'}」）` }], () => startRound(next))
  }

  const epilogues = flagEpilogues(flags)
  const ending = endingId ? endings[endingId] : null
  const death = deathId ? deaths[deathId] : null

  // 过场卡：「当天晚上 23:47」黑场 2 秒后进入结局
  useEffect(() => {
    if (phase !== 'interlude') return
    const t = setTimeout(() => setPhase('ending'), 2100)
    return () => clearTimeout(t)
  }, [phase])

  // ─────────────── 开场 ───────────────
  if (phase === 'intro') {
    return (
      <div
        className="min-h-screen bg-black text-zinc-100 flex flex-col items-center justify-center gap-6 p-8 relative overflow-hidden"
        onPointerDown={() => sfx.startBgm()}
      >
        {/* 椰树风跑马灯：上下各一条 */}
        <Marquee className="top-0" />
        <Marquee className="bottom-0" reverse />
        <div className="newugly-title select-none">再大一点</div>
        <div className="bg-[#1e50a2] text-[#ffe800] font-black text-sm md:text-base px-4 py-1 border-2 border-black shadow-[4px_4px_0_#e60012] rotate-[0.5deg]">
          在吗？Logo 再大一点。
        </div>
        <div className="text-zinc-500 text-xs">DAY 1 · 五个结局 · 六种死法 · 大约 3 分钟</div>
        <button
          onClick={() => {
            sfx.stopBgm()
            sfx.click()
            setAlarmSet(false)
            setMailView('offer')
            setSpamNote(null)
            setPhase('offer')
          }}
          className="mt-4 px-14 py-5 bg-[#e60012] text-[#ffe800] border-4 border-black font-black text-2xl tracking-[0.3em] shadow-[8px_8px_0_#ffe800] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[4px_4px_0_#ffe800] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none transition-all"
        >
          开始
        </button>
        <MuteBtn />
      </div>
    )
  }

  // ─────────────── 前情 1/3：那封 offer 邮件（Q邮邮箱） ───────────────
  if (phase === 'offer') {
    const sideItem = 'cursor-pointer px-2.5 py-1.5 text-zinc-600 hover:bg-[#ffe800] hover:text-black'
    return (
      <div className="min-h-screen bg-[#e8eef5] text-zinc-900 flex flex-col animate-[fadeIn_.5s_ease]">
        {/* 邮箱顶栏 */}
        <div className="flex items-center gap-3 bg-[#1d6fd1] px-4 py-2.5 text-white border-b-[3px] border-black">
          <span className="text-lg font-black tracking-wide" style={{ textShadow: '2px 2px 0 #000' }}>Q邮邮箱</span>
          <span className="hidden text-xs bg-black px-1.5 py-0.5 font-mono sm:inline">你毕业前注册的那个邮箱</span>
          <span className="ml-auto text-xs font-bold underline underline-offset-2">设置 | 退出</span>
        </div>

        <div className="flex flex-1">
          {/* 左侧栏（手机端收起） */}
          <aside className="hidden w-44 shrink-0 flex-col gap-1 border-r-[3px] border-black bg-white px-2 py-3 text-[13px] font-mono md:flex">
            <div className="mb-2 flex flex-col gap-2 px-1">
              <span className="border-2 border-black bg-[#ff2e88] py-2 text-center text-sm font-black text-white shadow-[3px_3px_0_#000]">✉️ 写信</span>
              <span className="border-2 border-black bg-white py-2 text-center text-sm font-bold shadow-[3px_3px_0_#000]">收信</span>
            </div>
            <button onClick={() => setMailView('offer')} className={`${sideItem} text-left ${mailView === 'offer' ? 'border-2 border-black bg-[#ffe800] font-black text-black' : ''}`}>📥 收件箱 <span className="font-black">(32)</span></button>
            <p className={sideItem}>⭐ 星标邮件</p>
            <p className={sideItem}>👥 群邮件 <span className="text-zinc-400">(4)</span></p>
            <p className={sideItem}>📝 草稿箱 <span className="text-zinc-400">(1)</span></p>
            <p className={sideItem}>📤 已发送</p>
            <p className={sideItem}>🗑️ 已删除</p>
            <button onClick={() => setMailView('trash')} className={`${sideItem} text-left ${mailView === 'trash' ? 'border-2 border-black bg-[#ffe800] font-black text-black' : ''}`}>🚮 垃圾箱 <span className="text-zinc-400">(87)</span></button>
            <p className="mt-2 border-t-2 border-black pt-2 text-xs text-zinc-400">我的文件夹</p>
            <button onClick={() => setMailView('rejections')} className={`${sideItem} text-left ${mailView === 'rejections' ? 'border-2 border-black bg-[#ffe800] font-black text-black' : ''}`}>📁 求职投递(46)</button>
            <p className={sideItem}>📁 毕业论文(别问)</p>
            <p className="mt-2 border-t-2 border-black pt-2 text-xs text-zinc-400">其他功能</p>
            <p className={sideItem}>📅 日历 | 🗒️ 记事本</p>
            <p className={`${sideItem} flex items-center gap-1`}>
              📄 简历
              <span className="border border-black bg-[#e60012] px-1 text-[10px] font-black text-white">NEW</span>
            </p>
          </aside>

          {/* 主区域 */}
          <main className="min-w-0 flex-1 px-3 py-3 sm:px-5">
            {/* 工具栏（纯装饰） */}
            <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-2 border-black bg-white px-3 py-2 text-xs font-mono text-zinc-600 shadow-[4px_4px_0_#000]">
              <span className="cursor-pointer hover:bg-[#ffe800]">◀ 返回</span>
              <span className="cursor-pointer hover:bg-[#ffe800]">删除</span>
              <span className="cursor-pointer hover:bg-[#ffe800]">转发</span>
              <span className="cursor-pointer hover:bg-[#ffe800]">举报</span>
              <span className="cursor-pointer hover:bg-[#ffe800]">标记为 ▾</span>
              <span className="ml-auto hidden sm:inline">第 1 / 32 封</span>
            </div>

            {/* 手机端文件夹快捷入口 */}
            <div className="mb-3 flex gap-2 md:hidden">
              <button
                onClick={() => setMailView('offer')}
                className={`flex-1 border-2 border-black px-2 py-1.5 text-xs font-bold shadow-[3px_3px_0_#000] ${mailView === 'offer' ? 'bg-[#ffe800]' : 'bg-white'}`}
              >
                📥 收件箱(32)
              </button>
              <button
                onClick={() => setMailView('rejections')}
                className={`flex-1 border-2 border-black px-2 py-1.5 text-xs font-bold shadow-[3px_3px_0_#000] ${mailView === 'rejections' ? 'bg-[#ffe800]' : 'bg-white'}`}
              >
                📁 求职投递(46)
              </button>
              <button
                onClick={() => setMailView('trash')}
                className={`flex-1 border-2 border-black px-2 py-1.5 text-xs font-bold shadow-[3px_3px_0_#000] ${mailView === 'trash' ? 'bg-[#ffe800]' : 'bg-white'}`}
              >
                🚮 垃圾箱(87)
              </button>
            </div>

            {/* ── 垃圾箱：87 个发财机会 ── */}
            {mailView === 'trash' && (
              <div className="relative border-[3px] border-black bg-white shadow-[8px_8px_0_#e60012]">
                <div className="border-b-[3px] border-black px-4 py-3 sm:px-6">
                  <p className="text-base font-black">🚮 垃圾箱 <span className="text-zinc-400">(87)</span></p>
                  <p className="mt-0.5 text-xs text-zinc-400">87 个发财机会，和一个别的什么。</p>
                </div>
                {spamNote && (
                  <p className="border-b-2 border-dashed border-black bg-[#ffe800] px-4 py-1.5 text-xs font-bold sm:px-6 animate-[fadeIn_.3s_ease]">💬 {spamNote}</p>
                )}
                <ul className="text-sm">
                  {[
                    { from: '幸运抽奖中心', sub: '【中奖了】iPhone 17 Pro Max 免费领取', note: '你居然点开了。还好只是广告。' },
                    { from: '澳门线上娱乐', sub: '澳门首家线上堵场上线啦！', note: '别点这个，真的。' },
                    { from: '国际快递客服', sub: '您的包裹在海关被扣，点击补缴关税 ¥98', note: '你没有包裹。你连买的东西都没有。' },
                    { from: '职称论文代办', sub: '核心期刊代发，一周见刊', note: '你是设计师，你评什么职称。' },
                    { from: 'Adobe 官方旗舰店（假）', sub: '全套正版 ¥9.9，懂的都懂', note: '你电脑里那个 ¥9.9 的就是这么来的。' },
                    { from: '兼职联盟', sub: '打字员日结 800，宝妈学生均可', note: '你室友信了这个，现在在卖茶叶。' },
                  ].map((m) => (
                    <li key={m.sub}>
                      <button
                        onClick={() => { sfx.click(); setSpamNote(m.note) }}
                        className="flex w-full items-baseline gap-2 border-b border-zinc-200 px-4 py-2.5 text-left hover:bg-[#ffe800] sm:px-6"
                      >
                        <span className="shrink-0 text-xs font-bold text-zinc-500 w-28 truncate">{m.from}</span>
                        <span className="min-w-0 flex-1 truncate">{m.sub}</span>
                      </button>
                    </li>
                  ))}
                  {/* 病毒邮件：发件人冒充公司人事部 */}
                  <li>
                    <button
                      onClick={() => { sfx.drop(); setSpamNote(null); setVirus(1) }}
                      className="flex w-full items-baseline gap-2 border-b border-zinc-200 bg-red-50 px-4 py-2.5 text-left hover:bg-red-100 sm:px-6"
                    >
                      <span className="shrink-0 text-xs font-bold text-zinc-500 w-28 truncate">宏图伟业·人事部</span>
                      <span className="min-w-0 flex-1 truncate font-bold text-red-700">【重要】offer补充条款_务必查收.pdf.exe</span>
                      <span className="shrink-0 text-[10px] text-red-400">⚠️ 未读</span>
                    </button>
                  </li>
                </ul>
                <p className="px-4 py-3 text-center text-[10px] text-zinc-400 sm:px-6">系统提示：垃圾箱邮件将于 30 天后自动删除（那封 .exe 除外，它等的就是你）</p>
              </div>
            )}

            {/* ── 求职投递：46 次主动出击 ── */}
            {mailView === 'rejections' && (
              <div className="relative border-[3px] border-black bg-white shadow-[8px_8px_0_#0d9488]">
                <div className="border-b-[3px] border-black px-4 py-3 sm:px-6">
                  <p className="text-base font-black">📁 求职投递 <span className="text-zinc-400">(46)</span></p>
                  <p className="mt-0.5 text-xs text-zinc-400">你主动投出的 46 份简历，和它们的下场。</p>
                </div>
                <ul className="text-sm">
                  {[
                    { from: '星辰设计工作室', sub: '很遗憾，您的简历未通过初筛', detail: '系统记录：你的作品集一共被打开 12 秒。' },
                    { from: '奥美森国际（4A）', sub: '感谢投递，简历已进入人才库', detail: '人才库，深度冷冻的那种。' },
                    { from: '某大厂设计部', sub: '本岗位要求：应届生，5 年以上经验', detail: '你到现在也没想明白这五年从哪来。' },
                    { from: '大象互动', sub: '您的作品风格与本司不符', detail: '他们实际需要一个会做 PPT 的。' },
                    { from: '不知名公司 HR', sub: '面试邀请（发错了，请忽略）', detail: '你激动了四十分钟。' },
                    { from: '自动回复', sub: '恭喜！您已进入终面！', detail: '发送于三个月前。你当时在军训，没看到。' },
                    { from: '已读不回科技有限公司', sub: '已读。', detail: '就这两个字。' },
                  ].map((m) => (
                    <li key={m.sub} className="border-b border-zinc-200 px-4 py-2.5 sm:px-6">
                      <p className="flex items-baseline gap-2">
                        <span className="shrink-0 text-xs font-bold text-zinc-500 w-28 truncate">{m.from}</span>
                        <span className="min-w-0 flex-1">{m.sub}</span>
                      </p>
                      <p className="mt-0.5 pl-0 text-[11px] text-zinc-400 sm:pl-[7.5rem]">{m.detail}</p>
                    </li>
                  ))}
                </ul>
                <p className="px-4 py-3 text-center text-[10px] text-zinc-400 sm:px-6">第 46 份投给了宏图伟业。然后你就收到了这封 offer。所以，知足吧。</p>
              </div>
            )}

            {/* ── 收件箱：那封 offer ── */}
            {mailView === 'offer' && (
            <>
            {/* 邮件本体 */}
            <div className="relative border-[3px] border-black bg-white shadow-[8px_8px_0_#1d6fd1]">
              {/* 贴纸 */}
              <span className="absolute -right-2 -top-3 z-10 rotate-6 border-2 border-black bg-[#e60012] px-2 py-0.5 text-xs font-black text-white shadow-[3px_3px_0_#000]">
                内含 offer !!
              </span>
              {/* 邮件头 */}
              <div className="border-b-[3px] border-black px-4 py-4 sm:px-6">
                <p className="text-base font-black sm:text-lg">【录用通知】同学，你被选中了！</p>
                <div className="mt-3 flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-black bg-[#ff2e88] text-sm font-black text-white">宏</span>
                  <div className="text-xs leading-relaxed text-zinc-500">
                    <p><span className="font-bold text-zinc-700">宏图伟业广告 · 人事部</span> &lt;hr@htwy-ad.cn&gt;</p>
                    <p>时间：昨天 18:52 &nbsp;·&nbsp; 收件人：未来的大设计师（也就是你）</p>
                  </div>
                </div>
              </div>

              {/* 正文 */}
              <div className="px-4 py-5 text-sm leading-[1.9] sm:px-6">
                <p>同学你好：</p>
                <p className="mt-2">你的作品集我们<b>全部看完了</b>（一共 5 个文件，看了 3 个）。</p>
                <p className="mt-2">
                  经我司高层（李总本人）连夜研究决定：
                  <b className="border-2 border-black bg-[#ffe800] px-1">你非常适合我们公司。</b>
                </p>
                <p className="mt-2">随信附上：</p>
                <p className="mt-1 pl-4">① 正式 offer —— 请打印签字，明天带过来；</p>
                <p className="pl-4">② 你的简历和作品集 —— 存档用。简历里「精通 Photoshop」的「精通」，我们会按「了解」理解。</p>
                <p className="mt-2">明天见。</p>
                <p className="mt-5 text-zinc-500">宏图伟业广告有限公司 人事部</p>
                <p className="text-xs text-zinc-400">（公司在阳光家园小区 3 栋 2 单元 501，电梯坏了，请走楼梯。）</p>

                {/* 附件区：三个附件 */}
                <div className="mt-5 border-2 border-dashed border-black bg-zinc-100 p-3">
                  <p className="mb-2 text-xs font-mono text-zinc-500">附件 <span className="font-black text-black">(3)</span> 个 · 全部下载</p>
                  <div className="grid gap-2.5 sm:grid-cols-3">
                    <button
                      onClick={() => { sfx.click(); setAttachment('offer') }}
                      className="flex items-center gap-2 border-2 border-black bg-white px-3 py-2.5 text-left shadow-[3px_3px_0_#e60012] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#e60012]"
                    >
                      <span className="text-xl">📄</span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-black font-mono">录用通知书_Offer.pdf</span>
                        <span className="block text-[10px] text-zinc-400">256KB · 点击预览</span>
                      </span>
                    </button>
                    <button
                      onClick={() => { sfx.click(); setAttachment('resume') }}
                      className="flex items-center gap-2 border-2 border-black bg-white px-3 py-2.5 text-left shadow-[3px_3px_0_#1d6fd1] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#1d6fd1]"
                    >
                      <span className="text-xl">📝</span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-black font-mono">我的简历_最终版3.doc</span>
                        <span className="block text-[10px] text-zinc-400">89KB · 点击预览</span>
                      </span>
                    </button>
                    <button
                      onClick={() => { sfx.click(); setAttachment('portfolio') }}
                      className="flex items-center gap-2 border-2 border-black bg-white px-3 py-2.5 text-left shadow-[3px_3px_0_#0d9488] transition-all hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0_#0d9488]"
                    >
                      <span className="text-xl">🗜️</span>
                      <span className="min-w-0">
                        <span className="block truncate text-xs font-black font-mono">我的作品集_最终_真的最终.zip</span>
                        <span className="block text-[10px] text-zinc-400">45.2MB · 点击预览</span>
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* 接受 offer */}
            <div className="mt-5 flex justify-center pb-8">
              <button
                onClick={() => {
                  sfx.click()
                  setPhase('moments')
                }}
                className="px-10 py-4 bg-lime-300 text-black border-[3px] border-black font-black text-lg tracking-widest shadow-[6px_6px_0_#1d6fd1] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#1d6fd1] transition-all"
              >
                接受 offer →
              </button>
            </div>
            </>
            )}
          </main>
        </div>

        {/* ── 病毒接管：offer 粉碎机 ── */}
        {virus > 0 && (
          <div className={`fixed inset-0 z-[100] flex items-center justify-center p-6 ${virus === 1 ? 'animate-[alarmFlash_.5s_linear_infinite]' : 'bg-[#e60012]'}`}>
            {virus === 1 && (
              <div className="w-full max-w-md font-mono text-red-500">
                <p className="text-lg font-black animate-pulse">⚠️ 未知程序运行中</p>
                <p className="mt-2 text-xs">offer补充条款_务必查收.pdf.exe</p>
                <div className="mt-4 h-4 w-full overflow-hidden border-2 border-red-500">
                  <div className="h-full w-1/4 bg-red-500 animate-[loadingbar_.8s_linear_infinite_alternate]" />
                </div>
                <p className="mt-3 text-xs animate-pulse">正在定位：录用通知书_Offer.pdf …</p>
                <p className="mt-1 text-[10px] text-red-800">此刻后悔已经来不及了</p>
              </div>
            )}
            {virus === 2 && (
              <div className="w-full max-w-lg border-4 border-black bg-black p-6 text-center shadow-[12px_12px_0_#ffe800] animate-[fadeIn_.4s_ease]">
                <p className="font-mono text-xs text-red-500">offer粉碎机.exe · 运行完毕</p>
                <p className="mt-4 text-3xl font-black text-[#ffe800]" style={{ textShadow: '3px 3px 0 #e60012' }}>你的 offer 已被永久删除</p>
                <p className="mt-4 text-sm text-zinc-400 leading-relaxed">
                  宏图伟业人事部表示：我们没发过这封邮件。<br />
                  那 46 次求职投递，你可以再来一遍了。
                </p>
                <p className="mt-5 font-mono text-xs text-zinc-500">菜鸟设计师的一万种死法 · No.000 手贱死</p>
                <button
                  onClick={() => {
                    sfx.click()
                    setVirus(0)
                    setMailView('offer')
                    setAttachment(null)
                    setPhase('intro')
                  }}
                  className="mt-6 border-[3px] border-black bg-[#ffe800] px-8 py-3 font-black text-black shadow-[6px_6px_0_#fff] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#fff] transition-all"
                >
                  重开人生 →
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── 附件预览弹层 ── */}
        {attachment && (
          <div
            onClick={() => setAttachment(null)}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          >
            <div
              className="max-h-[85vh] w-full max-w-2xl overflow-y-auto border-[3px] border-black bg-white p-4 sm:p-6 shadow-[10px_10px_0_#000] cursor-default"
              onClick={(e) => e.stopPropagation()}
            >
              {/* 附件①：正式 offer 文件 */}
              {attachment === 'offer' && (
                <div className="border-4 border-double border-red-700 bg-[#fffdf5] p-5 sm:p-7 text-zinc-900">
                  <p className="text-center text-xs tracking-[0.5em] text-red-700">宏图伟业广告有限公司</p>
                  <p className="mt-1 text-center text-2xl font-black tracking-[0.3em] text-red-700">录用通知书</p>
                  <div className="my-4 border-t-2 border-red-700" />
                  <p className="text-sm leading-[2]">
                    兹录用 <u>&nbsp;你&nbsp;</u> 同志为我司<b>设计师（试用期）</b>，
                    试用期薪资 4500 元/月，转正后另行面议（注：已面议完毕，结果不可更改）。
                  </p>
                  <p className="mt-2 text-sm leading-[2]">
                    请于<b>明日上午 9:00 前</b>携本通知书、身份证，以及饱满的热情，
                    到阳光家园小区 3 栋 2 单元 501 报到。
                  </p>
                  <p className="mt-2 text-sm leading-[2] text-zinc-500">
                    备注：岗位实行弹性工作制——上班很固定，下班很弹性。
                  </p>
                  <div className="mt-6 flex items-end justify-between">
                    <p className="text-xs text-zinc-500">
                      宏图伟业广告有限公司<br />人事部（兼行政、兼前台）
                    </p>
                    <span className="flex h-20 w-20 -rotate-12 items-center justify-center rounded-full border-4 border-red-600 text-center text-[10px] font-black leading-tight text-red-600">
                      宏图伟业<br />广告有限<br />公司
                    </span>
                  </div>
                  <p className="mt-4 text-center text-[10px] text-zinc-400">（本通知书最终解释权归李总所有）</p>
                </div>
              )}

              {/* 附件②：你的简历 */}
              {attachment === 'resume' && (
                <div className="border-2 border-black bg-white p-5 sm:p-6 text-zinc-900">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xl font-black">个 人 简 历</p>
                      <p className="mt-1 text-xs text-zinc-500">求职意向：平面设计师（能发工资就行）</p>
                    </div>
                    <span className="flex h-16 w-12 shrink-0 items-center justify-center border-2 border-black bg-zinc-100 text-center text-[10px] leading-tight text-zinc-400">
                      一寸<br />免冠<br />照片<br />（忘贴）
                    </span>
                  </div>
                  <div className="mt-4 space-y-3 text-xs leading-relaxed">
                    <section>
                      <p className="inline-block border-2 border-black bg-black px-2 py-0.5 font-black text-white">▍专业技能</p>
                      <ul className="mt-1.5 list-disc space-y-1 pl-5">
                        <li>精通 Photoshop<Secret>（打开过）</Secret></li>
                        <li>熟练使用 AI<Secret>（知道是软件，不是人工智能）</Secret></li>
                        <li>擅长 Word 艺术字排版<Secret>（曾获全宿舍一致好评）</Secret></li>
                        <li>精通核心快捷键：Ctrl+C、Ctrl+V、Ctrl+Z<Secret>（按使用频率排序）</Secret></li>
                      </ul>
                    </section>
                    <section>
                      <p className="inline-block border-2 border-black bg-black px-2 py-0.5 font-black text-white">▍获奖经历</p>
                      <ul className="mt-1.5 list-disc space-y-1 pl-5">
                        <li>二舅五金店「年度最佳设计奖」<Secret>（唯一参评作品）</Secret></li>
                        <li>军训先进个人<Secret>（与设计无关，但能吃苦，真的）</Secret></li>
                      </ul>
                    </section>
                    <section>
                      <p className="inline-block border-2 border-black bg-black px-2 py-0.5 font-black text-white">▍项目经验</p>
                      <ul className="mt-1.5 list-disc space-y-1 pl-5">
                        <li>独立运营个人表情包 IP<Secret>（48 张，累计传播：自己换手机传了 2 次）</Secret></li>
                        <li>主导二舅五金建材品牌升级项目<Secret>（甲方是二舅，尾款是一顿饭）</Secret></li>
                      </ul>
                    </section>
                    <section>
                      <p className="inline-block border-2 border-black bg-black px-2 py-0.5 font-black text-white">▍自我评价</p>
                      <p className="mt-1.5">吃苦耐劳，接受无偿加班，抗压能力强。<Secret>（当时是真心的。）</Secret></p>
                    </section>
                  </div>
                  <p className="mt-4 text-center text-[10px] text-zinc-400">文件名：我的简历_最终版3.doc（最终版、最终版2 已被覆盖）</p>
                  <p className="mt-1 text-center text-[10px] text-zinc-300">* 简历上有些地方，把鼠标放上去（或点一下）会有惊喜</p>
                </div>
              )}

              {/* 附件③：作品集 */}
              {attachment === 'portfolio' && (
                <div>
                  <p className="mb-3 text-sm font-bold text-zinc-800">📁 我的作品集_最终_真的最终.zip · 预览（5 个文件）</p>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {/* 课堂作业 ×3 */}
                    <div className="bg-white border-2 border-black p-1 shadow-[4px_4px_0_#52525b]">
                      <div className="aspect-square bg-zinc-200 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute w-1/2 h-1 bg-black rotate-12" />
                        <div className="absolute w-2 h-2 bg-black rounded-full left-3 top-3" />
                        <div className="absolute w-2 h-2 bg-black rounded-full right-4 bottom-5" />
                      </div>
                      <div className="text-[10px] font-mono p-1">点线面构成练习.ai</div>
                    </div>
                    <div className="bg-white border-2 border-black p-1 shadow-[4px_4px_0_#52525b]">
                      <div className="aspect-square grid grid-cols-3">
                        {['#e60012', '#ffe800', '#1e50a2', '#ff2e88', '#0d9488', '#000', '#ffe800', '#1e50a2', '#e60012'].map((c, i) => (
                          <div key={i} style={{ background: c }} />
                        ))}
                      </div>
                      <div className="text-[10px] font-mono p-1">色彩构成作业.ai</div>
                    </div>
                    <div className="bg-white border-2 border-black p-1 shadow-[4px_4px_0_#52525b]">
                      <div className="aspect-square bg-white flex items-center justify-center">
                        <span className="font-black text-black" style={{ fontSize: '3rem' }}>永</span>
                      </div>
                      <div className="text-[10px] font-mono p-1">字体练习_永字八法.ai</div>
                    </div>
                    {/* 表情包合集 */}
                    <div className="bg-white border-2 border-black p-1 shadow-[4px_4px_0_#52525b]">
                      <div className="aspect-square grid grid-cols-3 place-items-center text-2xl bg-zinc-50">
                        {['😂', '🔥', '👍', '😭', '🙏', '💪', '🐶', '💰', '✨'].map((e, i) => (
                          <span key={i}>{e}</span>
                        ))}
                      </div>
                      <div className="text-[10px] font-mono p-1">表情包合集（精品）.zip</div>
                    </div>
                    {/* 亲戚招牌 */}
                    <div className="bg-white border-2 border-black p-1 shadow-[4px_4px_0_#52525b] col-span-2">
                      <div className="aspect-[3/1] bg-[#e60012] flex items-center justify-center border-2 border-black" style={{ boxShadow: 'inset 0 0 0 2px #ffe800' }}>
                        <span className="font-black text-[#ffe800] text-xl md:text-2xl tracking-widest" style={{ textShadow: '2px 2px 0 #000' }}>
                          老王五金建材 · 电话 138XXXX8888
                        </span>
                      </div>
                      <div className="text-[10px] font-mono p-1">给二舅店里做的招牌（实物已安装）.psd</div>
                    </div>
                  </div>
                  <p className="mt-3 text-center text-xs text-zinc-400">课堂作业 ×3 · 表情包合集 ×1 · 二舅家招牌 ×1</p>
                </div>
              )}

              <p className="mt-4 text-center text-xs text-zinc-400">点击空白处关闭预览</p>
            </div>
          </div>
        )}
        <MuteBtn />
      </div>
    )
  }

  // ─────────────── 前情 2/3：当晚的朋友圈 ───────────────
  if (phase === 'moments') {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center gap-5 p-4">
        <div className="max-w-md w-full bg-white text-black rounded-xl border-[3px] border-black shadow-[8px_8px_0_#ff2e88] overflow-hidden animate-[fadeIn_.5s_ease]">
          <div className="bg-zinc-100 border-b-2 border-black px-4 py-2 text-xs text-zinc-500">朋友圈</div>
          <div className="p-4 flex gap-3">
            <div className="w-10 h-10 shrink-0 rounded bg-[#ff2e88] border-2 border-black flex items-center justify-center font-black text-white">我</div>
            <div className="flex-1 space-y-2">
              <div className="font-black text-sm">我</div>
              <div className="text-sm">新的开始 💪</div>
              {/* 配图：offer 邮件截图 */}
              <div className="w-2/3 bg-white border-2 border-black shadow-[3px_3px_0_#000] p-2">
                <div className="bg-zinc-100 border border-zinc-300 px-2 py-1 text-[9px] text-zinc-500">📧 收件箱（1）</div>
                <div className="text-[10px] font-black mt-1">【Offer】设计师（试用期）｜欢迎加入</div>
                <div className="text-[9px] text-zinc-400">就是看重你的潜力。</div>
              </div>
              <div className="text-xs text-zinc-400 flex items-center gap-2">
                <span>10 分钟前</span>
                <span className="border border-zinc-300 rounded px-1">👥 部分朋友可见</span>
              </div>
              <div className="bg-zinc-100 rounded p-2 text-xs space-y-1">
                <div><span className="font-bold text-[#1e50a2]">妈妈</span> ❤️　<span className="font-bold text-[#1e50a2]">二姨</span> ❤️　<span className="font-bold text-[#1e50a2]">大学室友·阿哲</span> ❤️</div>
                <div><span className="font-bold text-[#1e50a2]">阿哲：</span>可以啊！哪个公司？</div>
                <div><span className="font-bold">我</span> 回复 <span className="font-bold text-[#1e50a2]">阿哲：</span>说了你也没听过哈哈（其实我也没听过）</div>
              </div>
            </div>
          </div>
        </div>
        <button
          onClick={() => {
            sfx.click()
            setPhase('alarm')
          }}
          className="px-10 py-4 bg-lime-300 text-black border-[3px] border-black font-black text-lg tracking-widest shadow-[6px_6px_0_#1e50a2] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#1e50a2] transition-all"
        >
          放下手机 →
        </button>
        <MuteBtn />
      </div>
    )
  }

  // ─────────────── 前情 3/3：闹钟 ───────────────
  if (phase === 'alarm') {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center gap-5 p-4">
        <div className="max-w-md w-full bg-black rounded-2xl border-[3px] border-zinc-700 shadow-[8px_8px_0_#0d9488] overflow-hidden animate-[fadeIn_.5s_ease]">
          <div className="px-4 py-2 text-xs text-zinc-500 flex justify-between border-b border-zinc-800">
            <span>闹钟</span>
            <span>23:58</span>
          </div>
          <div className="p-5 flex items-center justify-between">
            <div>
              <div className="font-black text-5xl tracking-wider text-white transition-all">
                {alarmSet ? '07:00' : '09:00'}
              </div>
              <div className="text-xs text-zinc-500 mt-1">{alarmSet ? '上班第一天（新增）' : '每天'}</div>
            </div>
            {/* 开关：玩家亲手拨到 7:00 */}
            <button
              onClick={() => {
                sfx.click()
                setAlarmSet((v) => !v)
              }}
              className={`w-16 h-9 rounded-full border-2 border-black relative transition-colors ${alarmSet ? 'bg-lime-400' : 'bg-zinc-600'}`}
            >
              <div
                className={`absolute top-0.5 w-7 h-7 rounded-full bg-white border-2 border-black transition-all ${alarmSet ? 'left-8' : 'left-0.5'}`}
              />
            </button>
          </div>
          {alarmSet && <div className="px-5 pb-4 text-xs text-teal-300 animate-[fadeIn_.4s_ease]">已改为 07:00 · 上班第一天</div>}
        </div>
        {alarmSet && (
          <button
            onClick={() => {
              sfx.click()
              startGame()
            }}
            className="px-10 py-4 bg-[#ffe800] text-black border-[3px] border-black font-black text-lg tracking-widest shadow-[6px_6px_0_#e60012] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#e60012] transition-all animate-[fadeIn_.4s_ease]"
          >
            第一天，上班 →
          </button>
        )}
        <MuteBtn />
      </div>
    )
  }

  // ─────────────── 过场卡 ───────────────
  if (phase === 'interlude') {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-zinc-500 text-sm tracking-[0.5em] animate-[fadeIn_1.2s_ease]">当天晚上 23:47</div>
      </div>
    )
  }

  // ─────────────── 毕业（死亡画面：解除劳动合同通知书） ───────────────
  if (phase === 'death' && death) {
    const unlocked = unlockDeath(deathId!)
    const total = Object.keys(deaths).length
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex flex-col items-center justify-center gap-6 p-6">
        <div className="max-w-md w-full bg-white text-black border-4 border-black shadow-[10px_10px_0_#52525b] p-6 relative animate-[fadeIn_.5s_ease]">
          <div className="text-center font-black text-lg tracking-[0.2em] border-b-2 border-black pb-3">解除劳动合同通知书</div>
          <div className="mt-4 space-y-3 text-sm leading-relaxed">
            <p className="font-black text-base">{death.title}</p>
            <p>{death.reason}</p>
            <p className="text-zinc-500 text-xs">经公司研究决定，即日起与你解除劳动合同。工位与门禁卡将于今日回收。</p>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div className="text-xs text-zinc-500">
              宏图伟业广告有限公司
              <br />
              人力资源部
            </div>
            <div className="w-16 h-16 rounded-full border-4 border-[#52525b] text-[#52525b] flex items-center justify-center font-black text-sm rotate-[-12deg]">毕业</div>
          </div>
        </div>
        <div className="text-xs text-zinc-500 tracking-widest">
          菜鸟设计师的一万种死法 · {death.no}　｜　图鉴 {unlocked.length} / {total}
        </div>
        <button
          onClick={() => {
            sfx.click()
            setDeathId(null)
            setAlarmSet(false)
            setMailView('offer')
            setSpamNote(null)
            setVirus(0)
            setPhase('offer')
          }}
          className="px-10 py-4 bg-rose-400 text-black border-[3px] border-black font-black tracking-widest shadow-[6px_6px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[3px_3px_0_#000] transition-all"
        >
          重新投简历 →
        </button>
        <MuteBtn />
      </div>
    )
  }

  // ─────────────── 结局（活过了 DAY 1） ───────────────
  if (phase === 'ending' && ending) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex flex-col items-center justify-center gap-6 p-8">
        <div className="text-xs tracking-[0.5em] text-zinc-500 animate-[fadeIn_.5s_ease]">DAY 1 · 你活下来了</div>
        <div className="max-w-lg w-full space-y-3 mt-2">
          {ending.lines.map((m, i) => (
            <div key={i} className="animate-[fadeIn_.4s_ease_both]" style={{ animationDelay: `${0.4 + i * 0.75}s` }}>
              <ChatBubble msg={m} />
            </div>
          ))}
        </div>
        <div className="newugly-ending select-none text-center animate-[fadeIn_.5s_ease_both]" style={{ animationDelay: `${0.6 + ending.lines.length * 0.75}s` }}>
          {ending.title}
        </div>
        {epilogues.length > 0 && (
          <div
            className="max-w-lg w-full mt-2 border-2 border-black bg-white text-black p-4 space-y-1 shadow-[6px_6px_0_#e60012] animate-[fadeIn_.5s_ease_both]"
            style={{ animationDelay: `${1.1 + ending.lines.length * 0.75}s` }}
          >
            <div className="text-xs text-zinc-500 mb-2">这一天留下的痕迹：</div>
            {epilogues.map((e, i) => (
              <div key={i} className="text-sm font-bold">· {e}</div>
            ))}
          </div>
        )}
        <div className="text-zinc-600 text-sm mt-2 animate-[fadeIn_.5s_ease_both]" style={{ animationDelay: `${1.5 + ending.lines.length * 0.75}s` }}>
          DAY 2（待续）
        </div>
        <button
          onClick={() => {
            sfx.click()
            startGame()
          }}
          className="px-8 py-3 bg-[#ffe800] text-black border-[3px] border-black font-black tracking-widest shadow-[5px_5px_0_#1e50a2] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#1e50a2] transition-all animate-[fadeIn_.5s_ease_both]"
          style={{ animationDelay: `${1.7 + ending.lines.length * 0.75}s` }}
        >
          再过一遍 DAY 1
        </button>
        <MuteBtn />
      </div>
    )
  }

  // ─────────────── 游戏主界面 ───────────────
  const round = rounds[roundId]
  return (
    <div className="h-[100dvh] bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden">
      <main className="flex-1 flex flex-col md:grid md:grid-cols-[1fr_1.1fr_1fr] gap-2 md:gap-3 p-2 md:p-3 min-h-0 overflow-hidden">
        {/* 左：需求聊天（点按可快进）；手机端弹性收缩，内部滚动 */}
        <section className="flex flex-col flex-1 min-h-0 rounded-xl border border-zinc-800 bg-zinc-900/40">
          <div className="shrink-0 px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500 flex justify-between">
            <span>需求 / 私聊</span>
            <span className="text-zinc-600">{busy ? '点按可快进' : `DAY 1 · ${round.label}`}</span>
          </div>
          <div ref={chatBox} onClick={flush} className="flex-1 overflow-y-auto p-3 space-y-3 cursor-pointer">
            {chat.map((m, i) => (
              <ChatBubble key={i} msg={m} />
            ))}
            {busy && <div className="text-center text-xs text-zinc-600 animate-pulse">……</div>}
          </div>
        </section>

        {/* 中：设计稿（手机端缩小固定，不挤占聊天与选项） */}
        <section className="flex flex-col shrink-0 md:shrink md:min-h-0 rounded-xl border border-zinc-800 bg-zinc-900/40 p-2 md:p-3">
          <div className="shrink-0 text-xs text-zinc-500 pb-1 md:pb-2 flex justify-between">
            <span>设计稿 · 海报.psd</span>
            <span className="font-mono">Logo 占比 {canvas.logoSize}%</span>
          </div>
          <div
            className="flex-1 min-h-0 flex items-center justify-center max-h-[24vh] md:max-h-none cursor-zoom-in"
            onClick={() => {
              sfx.click()
              setZoomed(true)
            }}
            title="点按放大"
          >
            <Poster c={canvas} />
          </div>
        </section>

        {/* 右：操作（手机端两列平铺钉在底部，全部露出） */}
        <section ref={optionsBox} className="flex flex-col shrink-0 md:shrink md:min-h-0 max-h-[36vh] md:max-h-none rounded-xl border border-zinc-800 bg-zinc-900/40">
          <div className="shrink-0 px-4 py-2 border-b border-zinc-800 text-xs text-zinc-500">你的操作</div>
          <div className="flex-1 overflow-y-auto p-3 grid grid-cols-2 md:grid-cols-1 gap-2 md:gap-3 content-start">
            {available.map((o, i) => {
              // 新丑撞色按钮（去黄，减少视觉疲劳）；隐藏选项「已读不回」故意灰扑扑
              const palette = [
                'bg-rose-400 hover:bg-rose-300 shadow-[4px_4px_0_#1e50a2]',
                'bg-sky-300 hover:bg-sky-200 shadow-[4px_4px_0_#e60012]',
                'bg-lime-300 hover:bg-lime-200 shadow-[4px_4px_0_#1e50a2]',
                'bg-fuchsia-300 hover:bg-fuchsia-200 shadow-[4px_4px_0_#e60012]',
              ]
              const color = o.id === 'R3D' ? 'bg-zinc-200 text-zinc-500 shadow-[4px_4px_0_#52525b]' : palette[i % palette.length] + ' text-black'
              return (
                <button
                  key={o.id}
                  disabled={busy}
                  onClick={() => chooseTracked(o)}
                  className={`w-full text-left border-[3px] border-black p-3 md:p-4 disabled:opacity-40 active:translate-x-[2px] active:translate-y-[2px] active:shadow-none transition-all ${color}`}
                >
                  <div className="font-black text-sm leading-snug">{o.label}</div>
                  {o.sub && <div className="text-xs opacity-60 mt-1 font-bold">{o.sub}</div>}
                </button>
              )
            })}
            {canNext && (
              <button
                onClick={goNext}
                className="col-span-2 md:col-span-1 w-full bg-lime-300 text-black border-[3px] border-black font-black py-4 tracking-widest shadow-[5px_5px_0_#000] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#000] transition-all"
              >
                📎 发送「{deliveryFiles[roundId] ?? '海报.psd'}」→
              </button>
            )}
            {!canNext && available.length === 0 && busy && (
              <div className="col-span-2 md:col-span-1 text-center text-xs text-zinc-600 animate-pulse pt-4">等待对方回复……</div>
            )}
          </div>
        </section>
      </main>

      {/* 海报全屏放大：点一下看细节，再点收起 */}
      {zoomed && (
        <div
          onClick={() => {
            sfx.click()
            setZoomed(false)
          }}
          className="fixed inset-0 z-40 bg-black/90 flex flex-col items-center justify-center gap-3 cursor-zoom-out animate-[fadeIn_.2s_ease]"
        >
          <div className="w-[min(88vw,68vh)]">
            <Poster c={canvas} big />
          </div>
          <div className="text-zinc-500 text-xs">再点一下收起</div>
        </div>
      )}

      {/* 打包 zip 动画 */}
      {zipFx && <ZipOverlay onDone={() => afterTakeover.current?.()} />}

      {/* AI 全屏吞噬：新丑风贴纸标吃掉整个屏幕（点按继续） */}
      {takeover && (
        <div
          onClick={() => {
            sfx.click()
            afterTakeover.current?.()
          }}
          className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden bg-[#ffd23f]/70 cursor-pointer"
        >
          <div
            className="bg-white flex items-center justify-center animate-[takeoverZoom_1.1s_ease-in_forwards]"
            style={{ borderRadius: '50%', border: '8px solid #000', boxShadow: '16px 16px 0 #e60012' }}
          >
            <span className="font-black text-black tracking-tight animate-[takeoverText_1.1s_ease-in_forwards]">LOGO</span>
          </div>
          <div className="absolute bottom-10 inset-x-0 text-center text-black/60 font-bold text-sm animate-[fadeIn_.6s_ease_1.4s_both]">
            点按任意处继续
          </div>
        </div>
      )}

      <MuteBtn />
    </div>
  )
}
