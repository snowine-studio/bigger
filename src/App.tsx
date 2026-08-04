import { useCallback, useEffect, useRef, useState } from 'react'
import {
  rounds,
  endings,
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

/** 打包 zip 全屏动画：文件逐个弹出 → 压成 zip → 盖章发送 → 点按继续 */
function ZipOverlay({ onDone }: { onDone: () => void }) {
  const [shown, setShown] = useState(0)
  const [zipped, setZipped] = useState(false)

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

  useEffect(() => {
    if (shown >= zipFiles.length && !zipped) {
      const t = setTimeout(() => {
        setZipped(true)
        sfx.stamp()
      }, 380)
      return () => clearTimeout(t)
    }
  }, [shown, zipped])

  return (
    <div
      onClick={() => zipped && onDone()}
      className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-center gap-2 p-6 cursor-pointer"
    >
      {!zipped ? (
        <div className="w-full max-w-md space-y-1.5">
          {zipFiles.slice(0, shown).map((f, i) => (
            <div
              key={i}
              className="bg-white text-black font-mono text-xs md:text-sm px-3 py-1.5 border-2 border-black shadow-[3px_3px_0_#1e50a2] animate-[fadeIn_.15s_ease]"
            >
              📄 {f}
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="bg-[#ffe800] text-black font-black text-base md:text-xl px-6 py-4 border-4 border-black shadow-[8px_8px_0_#e60012] rotate-[-1deg] animate-[fadeIn_.2s_ease]">
            📦 {zipName}
          </div>
          <div className="text-lime-300 font-black text-sm mt-2 tracking-widest">已发送 ✓</div>
          <div className="text-zinc-500 text-xs mt-4">点按任意处继续</div>
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

type Phase = 'intro' | 'playing' | 'ending'

const MSG_DELAY = 800 // 消息逐条弹出间隔（初玩者节奏）

const speakerMeta: Record<Speaker, { name: string; bubble: string; align: string; avatar: string }> = {
  // 李总 = 甲方世界：黄色爆炸贴纸，硬阴影，微微歪斜地拍在屏幕上
  client: {
    name: '客户 · 李总',
    bubble: 'bg-[#ffe800] text-black border-[3px] border-black shadow-[4px_4px_0_#e60012] rotate-[-0.8deg] font-bold rounded-lg',
    align: 'justify-start',
    avatar: '甲',
  },
  // 阿May = 设计师世界：维持冷淡正常，她的"正常"就是对比
  director: { name: '总监 · 阿May（私聊）', bubble: 'bg-violet-900/60 border-violet-700/50 text-zinc-100', align: 'justify-start', avatar: '监' },
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
              <span className="font-black text-black tracking-widest" style={{ fontSize: '3.4cqw' }}>PRODUCT</span>
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
  const [takeover, setTakeover] = useState(false) // AI 全屏吞噬
  const [zipFx, setZipFx] = useState(false) // 打包 zip 动画
  const [zoomed, setZoomed] = useState(false) // 海报全屏放大
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
    setTakeover(false)
    setZipFx(false)
    lastChosenRef.current = ''
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
      if (opt.ending) {
        setEndingId(resolveEnding(opt.ending, mergedFlags))
        setBusy(false)
        setCanNext(false)
        setPhase('ending')
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
    // 剧情内动作：先把稿子发出去，新需求自己找上门
    sfx.drop() // macOS 式"把文件丢进去"的 plop
    setBusy(true)
    pushMessages([{ from: 'me', text: `（你发送了「${deliveryFiles[roundId] ?? '海报.psd'}」）` }], () => startRound(next))
  }

  const epilogues = flagEpilogues(flags)
  const ending = endingId ? endings[endingId] : null

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
        <div className="text-zinc-500 text-xs">DAY 1 · 三条需求 · 九个结局 · 大约 3 分钟</div>
        <button
          onClick={() => {
            sfx.stopBgm()
            sfx.click()
            startGame()
          }}
          className="mt-4 px-14 py-5 bg-[#e60012] text-[#ffe800] border-4 border-black font-black text-2xl tracking-[0.3em] shadow-[8px_8px_0_#ffe800] hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-[4px_4px_0_#ffe800] active:translate-x-[6px] active:translate-y-[6px] active:shadow-none transition-all"
        >
          接单
        </button>
        <MuteBtn />
      </div>
    )
  }

  // ─────────────── 结局 ───────────────
  if (phase === 'ending' && ending) {
    return (
      <div className="min-h-screen bg-black text-zinc-100 flex flex-col items-center justify-center gap-6 p-8">
        <div className="text-xs tracking-[0.5em] text-zinc-500">DAY 1 结束</div>
        <div className="newugly-ending select-none text-center">{ending.title}</div>
        <div className="max-w-lg w-full space-y-3 mt-2">
          {ending.lines.map((m, i) => (
            <ChatBubble key={i} msg={m} />
          ))}
        </div>
        {epilogues.length > 0 && (
          <div className="max-w-lg w-full mt-4 border-2 border-black bg-white text-black p-4 space-y-1 shadow-[6px_6px_0_#e60012]">
            <div className="text-xs text-zinc-500 mb-2">这一天留下的痕迹：</div>
            {epilogues.map((e, i) => (
              <div key={i} className="text-sm font-bold">· {e}</div>
            ))}
          </div>
        )}
        <div className="text-zinc-600 text-sm mt-2">DAY 2（待续）</div>
        <button
          onClick={() => {
            sfx.click()
            startGame()
          }}
          className="px-8 py-3 bg-[#ffe800] text-black border-[3px] border-black font-black tracking-widest shadow-[5px_5px_0_#1e50a2] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#1e50a2] transition-all"
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
