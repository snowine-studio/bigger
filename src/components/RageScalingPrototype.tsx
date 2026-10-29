import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent } from 'react'
import * as sfx from '../game/audio'
import {
  MAX_SCALE,
  MIN_SCALE,
  getClientMessage,
  getRageStage,
  getShakeMagnitude,
  nextRageScale,
} from '../game/rage'

export function RageScalingPrototype({ onExit }: { onExit: () => void }) {
  const [scale, setScale] = useState(MIN_SCALE)
  const [isRaging, setIsRaging] = useState(false)
  const [isSingularity, setIsSingularity] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(false)
  const scaleRef = useRef(MIN_SCALE)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    sfx.updateRage(scale, isRaging && !isSingularity)
  }, [scale, isRaging, isSingularity])

  useEffect(() => {
    if (!isRaging || isSingularity) {
      sfx.stopRage()
      return
    }
    let raf = 0
    let previous = performance.now()
    const loop = (now: number) => {
      const elapsed = Math.min(Math.max(now - previous, 0), 100)
      previous = now
      const next = nextRageScale(scaleRef.current, elapsed)
      scaleRef.current = next
      setScale(next)
      if (next >= MAX_SCALE) {
        setIsSingularity(true)
        setIsRaging(false)
        return
      }
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(raf)
      sfx.stopRage()
    }
  }, [isRaging, isSingularity])

  const start = () => {
    if (isSingularity || isRaging) return
    sfx.startRage()
    setIsRaging(true)
  }
  const stop = () => setIsRaging(false)
  const changeScale = (value: number) => {
    scaleRef.current = value
    setScale(value)
  }
  const reset = () => {
    scaleRef.current = MIN_SCALE
    setScale(MIN_SCALE)
    setIsRaging(false)
    setIsSingularity(false)
  }
  const pointerStart = (event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault()
    start()
  }
  const keyStart = (event: KeyboardEvent<HTMLButtonElement>) => {
    if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) {
      event.preventDefault()
      start()
    }
  }
  const keyStop = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      stop()
    }
  }

  const stage = getRageStage(scale)
  const shake = reducedMotion ? 0 : getShakeMagnitude(scale)
  const collapsing = stage === 'collapsing'
  const jitterX = Math.sin(scale) * shake * 0.5
  const jitterY = Math.cos(scale) * shake * 0.5

  return (
    <div
      className="relative flex h-[100dvh] min-h-[540px] w-full flex-col overflow-hidden bg-[#1e1e1e] font-sans text-white"
      style={{ transform: `translate(${jitterX}px, ${jitterY}px)` }}
    >
      <button
        onClick={onExit}
        className="absolute right-3 top-2 z-50 rounded border border-zinc-500 bg-black/70 px-3 py-1 text-xs font-bold hover:bg-white hover:text-black"
      >
        返回首页
      </button>
      <header
        className="flex h-12 shrink-0 items-center border-b border-zinc-700 bg-[#2d2d2d] px-4 transition-transform"
        style={{ transform: collapsing ? `rotate(${-shake * 0.4}deg) translateY(${-shake * 2}px)` : 'none' }}
      >
        <span className="mr-4 truncate text-xs font-bold sm:text-sm">PS - 海报_v9_最终定稿_不要改了.psd</span>
        <span className="ml-auto shrink-0 pr-20 font-mono text-xs text-zinc-400">缩放: {Math.round(scale)}%</span>
      </header>

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside
          className="flex shrink-0 flex-col border-b border-zinc-700 bg-[#252526] p-3 transition-all md:border-b-0 md:border-r md:p-4"
          style={{ width: collapsing ? `${Math.max(300 - shake * 15, 120)}px` : undefined, transform: collapsing ? `scaleX(${Math.max(1 - shake * 0.04, 0.4)})` : 'none', transformOrigin: 'left center' }}
        >
          <div className="mb-2 text-xs text-zinc-400">微信 (3) - 李总 (甲方)</div>
          <div className="rounded-md bg-[#333] p-2.5 text-xs leading-relaxed sm:text-sm">
            <strong>李总：</strong>
            <p className="mt-1">{getClientMessage(scale)}</p>
          </div>
          {scale > 200 && <div className="mt-2 text-[11px] text-red-400 md:mt-auto">⚠️ 警告：当前画布图层超出安全边距！</div>}
        </aside>

        <main className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#141414] p-3">
          <div className="relative flex aspect-[5/7] max-h-full w-[min(400px,72vw)] items-center justify-center overflow-hidden bg-[#f5f5f5] shadow-[0_0_20px_rgba(0,0,0,0.5)]">
            <div
              className="absolute bottom-[7%] flex aspect-square w-[30%] items-center justify-center rounded-lg bg-[#4a90e2] text-center text-xs text-white transition-opacity"
              style={{ opacity: Math.max(1 - (scale - 30) / 70, 0) }}
            >
              核心产品 (已消失)
            </div>
            <div
              className="flex aspect-square w-[30%] items-center justify-center rounded-full bg-[#e74c3c] text-xl font-black text-white will-change-transform"
              style={{ transform: `scale(${scale / 30})`, boxShadow: stage === 'glitch' ? '4px 0 #00ffff, -4px 0 #ff00ff' : 'none' }}
            >
              {scale < 200 ? 'LOGO' : ''}
            </div>
          </div>
        </main>
      </div>

      <footer className="flex shrink-0 flex-col gap-3 border-t border-zinc-700 bg-[#252526] p-4 md:h-[90px] md:flex-row md:items-center md:justify-between md:gap-4 md:px-8 md:py-0">
        <div className="flex items-center gap-3 text-xs sm:text-sm">
          <span className="shrink-0">普通放大:</span>
          <input
            aria-label="普通放大"
            type="range"
            min={MIN_SCALE}
            max="100"
            value={Math.min(scale, 100)}
            disabled={isRaging || isSingularity}
            onChange={(event) => changeScale(Number(event.target.value))}
            className="min-w-0 flex-1 md:w-[200px] md:flex-none"
          />
          <span className="w-10 text-xs text-zinc-400">{Math.round(Math.min(scale, 100))}%</span>
        </div>
        {!isSingularity ? (
          <button
            onPointerDown={pointerStart}
            onPointerUp={stop}
            onPointerLeave={stop}
            onPointerCancel={stop}
            onKeyDown={keyStart}
            onKeyUp={keyStop}
            onContextMenu={(event) => event.preventDefault()}
            className={`touch-none select-none rounded-md px-5 py-3 text-xs font-bold text-white transition-transform sm:text-sm ${isRaging ? 'scale-95 bg-[#c0392b] shadow-[0_0_15px_#ff5555]' : 'bg-[#e74c3c]'}`}
          >
            ⚡ 按住不放：狠！狠！放！大！（恶意顺从）
          </button>
        ) : (
          <button onClick={reset} className="rounded-md bg-[#27ae60] px-7 py-3 text-sm font-bold text-white">
            🔄 重新体验（时光倒流）
          </button>
        )}
      </footer>

      {isSingularity && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center overflow-y-auto bg-[#e74c3c] p-8 pt-16 text-center text-white animate-[fadeIn_.8s_ease-in-out]">
          <h1 className="text-3xl font-black sm:text-5xl">结局达成：超验大师 (Transcendence)</h1>
          <p className="mt-5 max-w-2xl text-sm leading-8 sm:text-lg">
            因时间紧迫，纯红稿被推上了时代广场巨幕。<br />
            全球当代艺术界高度评价：“这是对消费主义符号暴力最纯粹的去中心化解构。”<br />
            公司挂牌当天股价暴涨 300%，李总连夜坐头等舱回国，把你的工位搬到了董事长办公室隔壁。
          </p>
          <div className="mt-7 rounded-lg bg-black/30 px-6 py-3 text-xs sm:text-sm">🏆 获得传奇成就：【奇点设计师】（把时代格式化）</div>
          <button onClick={reset} className="mt-6 rounded-md bg-white px-6 py-3 text-sm font-black text-[#c0392b]">🔄 重新体验</button>
        </div>
      )}
    </div>
  )
}
