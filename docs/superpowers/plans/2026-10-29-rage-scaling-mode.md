# 狂暴放大独立模式 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在现有《再大一点》首页加入可独立进入、退出和重玩的“狂暴放大”模式，完整实现指数缩放、阶段演出、持续音与奇点结局。

**Architecture:** 用 `src/game/rage.ts` 保存可单测的缩放规则，用独立 React 组件负责界面和 Pointer/Keyboard 交互，并在现有音频模块中管理持续振荡器。`App` 只增加 `rage` 阶段和入口，不改剧情数据与存档。

**Tech Stack:** React 19、TypeScript、Vite、Tailwind CSS、Web Audio API、Vitest、Testing Library。

## Global Constraints

- 保留现有剧情、结局、图鉴和本地存档逻辑。
- 不增加路由，不新建应用。
- 普通滑块范围为 30%–100%，奇点阈值为 10000%。
- 松手、移出、取消、返回及卸载必须停止蓄力和持续音。
- 音频不可用时静默降级，视觉交互仍可完成。
- 支持窄屏与 `prefers-reduced-motion`。
- 不修改无关剧本和文案，不发布线上版本。

---

### Task 1: 可测试的缩放规则

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `vite.config.ts`
- Create: `src/test/setup.ts`
- Create: `src/game/rage.ts`
- Test: `src/game/rage.test.ts`

**Interfaces:**
- Produces: `MIN_SCALE = 30`、`MAX_SCALE = 10000`、`nextRageScale(current: number, elapsedMs: number): number`、`getRageStage(scale: number): 'normal' | 'glitch' | 'collapsing' | 'singularity'`、`getClientMessage(scale: number): string`、`getShakeMagnitude(scale: number): number`。

- [ ] **Step 1: 配置 Vitest 和浏览器测试环境**

运行：

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

在 `package.json` 的 `scripts` 中增加：

```json
"test": "vitest run"
```

将 `vite.config.ts` 的 `defineConfig` 导入改为以下来源，并在配置对象末尾加入 `test`：

```ts
import { defineConfig } from 'vitest/config'

// 保留现有 base、plugins、server、resolve，追加：
test: {
  environment: 'jsdom',
  setupFiles: './src/test/setup.ts',
},
```

创建 `src/test/setup.ts`：

```ts
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => cleanup())

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1))
vi.stubGlobal('cancelAnimationFrame', vi.fn())
```

- [ ] **Step 2: 写缩放规则的失败测试**

创建 `src/game/rage.test.ts`：

```ts
import { describe, expect, it } from 'vitest'
import {
  MAX_SCALE,
  getClientMessage,
  getRageStage,
  getShakeMagnitude,
  nextRageScale,
} from './rage'

describe('rage scaling rules', () => {
  it('uses frame-independent exponential growth and caps at singularity', () => {
    expect(nextRageScale(30, 1000 / 60)).toBeCloseTo(31.5)
    expect(nextRageScale(30, 1000)).toBeCloseTo(30 * Math.pow(1.05, 60))
    expect(nextRageScale(9999, 1000)).toBe(MAX_SCALE)
    expect(nextRageScale(30, 0)).toBe(30)
  })

  it('maps scale to stages, messages and shake', () => {
    expect(getRageStage(30)).toBe('normal')
    expect(getRageStage(101)).toBe('glitch')
    expect(getRageStage(500)).toBe('collapsing')
    expect(getRageStage(10000)).toBe('singularity')
    expect(getClientMessage(30)).toContain('再大一点')
    expect(getClientMessage(200)).toContain('有点感觉了')
    expect(getClientMessage(600)).toContain('满屏都是红的')
    expect(getClientMessage(3000)).toContain('系统音质过载')
    expect(getClientMessage(10000)).toBe('……')
    expect(getShakeMagnitude(499)).toBe(0)
    expect(getShakeMagnitude(10000)).toBe(12)
  })
})
```

- [ ] **Step 3: 运行测试并确认失败**

Run: `npm test -- src/game/rage.test.ts`

Expected: FAIL，提示无法解析 `./rage`。

- [ ] **Step 4: 实现最小规则模块**

创建 `src/game/rage.ts`：

```ts
export const MIN_SCALE = 30
export const MAX_SCALE = 10000

export type RageStage = 'normal' | 'glitch' | 'collapsing' | 'singularity'

export function nextRageScale(current: number, elapsedMs: number): number {
  if (elapsedMs <= 0) return Math.min(Math.max(current, MIN_SCALE), MAX_SCALE)
  const frames = elapsedMs / (1000 / 60)
  return Math.min(current * Math.pow(1.05, frames), MAX_SCALE)
}

export function getRageStage(scale: number): RageStage {
  if (scale >= MAX_SCALE) return 'singularity'
  if (scale >= 500) return 'collapsing'
  if (scale > 100) return 'glitch'
  return 'normal'
}

export function getClientMessage(scale: number): string {
  if (scale >= MAX_SCALE) return '……'
  if (scale >= 2500) return '（对方正在讲话，但系统音质过载导致杂音…）'
  if (scale >= 500) return '等等……怎么满屏都是红的？小王你人呢？！'
  if (scale >= 100) return '对对对！有点感觉了！再加把劲！'
  return '那个 Logo，还是要再大一点，要有冲击力！'
}

export function getShakeMagnitude(scale: number): number {
  return scale >= 500 && scale < MAX_SCALE ? Math.min((scale - 500) / 400, 12) : 0
}
```

- [ ] **Step 5: 运行测试并提交**

Run: `npm test -- src/game/rage.test.ts`

Expected: 2 个测试全部 PASS。

```bash
git add package.json package-lock.json vite.config.ts src/test/setup.ts src/game/rage.ts src/game/rage.test.ts
git commit -m "test: 定义狂暴放大缩放规则"
```

---

### Task 2: 可清理、可静音的持续音

**Files:**
- Modify: `src/game/audio.ts`
- Test: `src/game/rage-audio.test.ts`

**Interfaces:**
- Consumes: 现有 `ac()`、`out()`、`muted`。
- Produces: `startRage(): void`、`updateRage(scale: number, active: boolean): void`、`stopRage(): void`。

- [ ] **Step 1: 写持续音失败测试**

创建 `src/game/rage-audio.test.ts`：

```ts
import { beforeEach, expect, it, vi } from 'vitest'

beforeEach(() => {
  vi.resetModules()
})

it('starts, updates and stops one sustained oscillator', async () => {
  const frequency = { setValueAtTime: vi.fn(), setTargetAtTime: vi.fn() }
  const gain = { setValueAtTime: vi.fn(), setTargetAtTime: vi.fn() }
  const stop = vi.fn()
  const oscillator = { type: '', frequency, connect: vi.fn(), start: vi.fn(), stop, disconnect: vi.fn() }
  const gainNode = { gain, connect: vi.fn(), disconnect: vi.fn() }

  class FakeAudioContext {
    currentTime = 0
    state = 'running'
    destination = {}
    gainCalls = 0
    createOscillator() { return oscillator }
    createGain() {
      return this.gainCalls++ === 0 ? { gain: { value: 0 }, connect: vi.fn() } : gainNode
    }
  }

  vi.stubGlobal('AudioContext', FakeAudioContext)
  const sfx = await import('./audio')
  sfx.startRage()
  sfx.startRage()
  expect(oscillator.start).toHaveBeenCalledTimes(1)
  sfx.updateRage(5000, true)
  expect(frequency.setTargetAtTime).toHaveBeenCalled()
  expect(gain.setTargetAtTime).toHaveBeenCalledWith(expect.any(Number), 0, 0.015)
  sfx.stopRage()
  sfx.stopRage()
  expect(stop).toHaveBeenCalledTimes(1)
})

it('silently degrades when Web Audio is unavailable', async () => {
  class BrokenAudioContext {
    constructor() { throw new Error('Audio unavailable') }
  }
  vi.stubGlobal('AudioContext', BrokenAudioContext)
  const sfx = await import('./audio')
  expect(() => {
    sfx.startRage()
    sfx.updateRage(5000, true)
    sfx.stopRage()
  }).not.toThrow()
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- src/game/rage-audio.test.ts`

Expected: FAIL，提示 `startRage` 不是函数。

- [ ] **Step 3: 实现持续音控制**

在 `src/game/audio.ts` 末尾追加：

```ts
// ─────────────────────── 狂暴放大持续音 ───────────────────────

let rageOsc: OscillatorNode | null = null
let rageGain: GainNode | null = null

export function startRage(): void {
  if (rageOsc) return
  try {
    const c = ac()
    const osc = c.createOscillator()
    const gain = c.createGain()
    osc.type = 'sawtooth'
    osc.frequency.setValueAtTime(60, c.currentTime)
    gain.gain.setValueAtTime(0, c.currentTime)
    osc.connect(gain)
    gain.connect(out())
    osc.start()
    rageOsc = osc
    rageGain = gain
  } catch {
    rageOsc = null
    rageGain = null
  }
}

export function updateRage(scale: number, active: boolean): void {
  if (!rageOsc || !rageGain) return
  try {
    const c = ac()
    const normalized = Math.min(Math.max((scale - 100) / 9900, 0), 1)
    rageOsc.frequency.setTargetAtTime(60 + normalized * 740, c.currentTime, 0.015)
    const volume = active && scale > 100 && !muted ? 0.05 + normalized * 0.15 : 0
    rageGain.gain.setTargetAtTime(volume, c.currentTime, 0.015)
  } catch {
    // 音频失败不影响视觉交互。
  }
}

export function stopRage(): void {
  const osc = rageOsc
  const gain = rageGain
  rageOsc = null
  rageGain = null
  if (!osc || !gain) return
  try {
    gain.gain.setTargetAtTime(0, ac().currentTime, 0.005)
    osc.stop(ac().currentTime + 0.03)
    osc.onended = () => {
      osc.disconnect()
      gain.disconnect()
    }
  } catch {
    // 已关闭或不可用的音频上下文无需额外处理。
  }
}
```

- [ ] **Step 4: 运行音频测试并提交**

Run: `npm test -- src/game/rage-audio.test.ts`

Expected: 2 个测试全部 PASS。

```bash
git add src/game/audio.ts src/game/rage-audio.test.ts
git commit -m "feat: 添加狂暴放大持续音"
```

---

### Task 3: 独立互动组件

**Files:**
- Create: `src/components/RageScalingPrototype.tsx`
- Test: `src/components/RageScalingPrototype.test.tsx`

**Interfaces:**
- Consumes: Task 1 的缩放规则；Task 2 的 `startRage`、`updateRage`、`stopRage`。
- Produces: `export function RageScalingPrototype({ onExit }: { onExit: () => void }): React.JSX.Element`。

- [ ] **Step 1: 写组件失败测试**

创建 `src/components/RageScalingPrototype.test.tsx`：

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import { RageScalingPrototype } from './RageScalingPrototype'
import * as sfx from '../game/audio'

vi.mock('../game/audio', () => ({
  startRage: vi.fn(),
  updateRage: vi.fn(),
  stopRage: vi.fn(),
}))

it('supports slider, pointer hold, keyboard hold and exit', () => {
  const onExit = vi.fn()
  render(<RageScalingPrototype onExit={onExit} />)

  fireEvent.change(screen.getByRole('slider'), { target: { value: '80' } })
  expect(screen.getByRole('slider')).toHaveValue('80')

  const hold = screen.getByRole('button', { name: /按住不放/ })
  fireEvent.pointerDown(hold)
  expect(sfx.startRage).toHaveBeenCalledTimes(1)
  fireEvent.pointerUp(hold)
  expect(sfx.stopRage).toHaveBeenCalled()
  fireEvent.keyDown(hold, { key: ' ' })
  expect(sfx.startRage).toHaveBeenCalledTimes(2)
  fireEvent.keyUp(hold, { key: ' ' })

  fireEvent.click(screen.getByRole('button', { name: '返回首页' }))
  expect(onExit).toHaveBeenCalledTimes(1)
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- src/components/RageScalingPrototype.test.tsx`

Expected: FAIL，提示无法解析组件模块。

- [ ] **Step 3: 实现完整组件**

创建 `src/components/RageScalingPrototype.tsx`：

```tsx
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
  const jitterX = (Math.random() - 0.5) * shake
  const jitterY = (Math.random() - 0.5) * shake

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
```

- [ ] **Step 4: 运行组件测试并提交**

Run: `npm test -- src/components/RageScalingPrototype.test.tsx`

Expected: 1 个测试 PASS，音频 mock 调用次数符合断言。

```bash
git add src/components/RageScalingPrototype.tsx src/components/RageScalingPrototype.test.tsx
git commit -m "feat: 实现狂暴放大独立组件"
```

---

### Task 4: 首页接入与端到端验证

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

**Interfaces:**
- Consumes: `RageScalingPrototype({ onExit })`。
- Produces: `Phase` 新增 `'rage'`；首页入口可进入独立模式，返回按钮恢复 `intro`。

- [ ] **Step 1: 写首页入口失败测试**

创建 `src/App.test.tsx`：

```tsx
import { fireEvent, render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'
import App from './App'

vi.mock('./game/audio', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./game/audio')>()
  return {
    ...actual,
    startBgm: vi.fn(),
    stopBgm: vi.fn(),
    click: vi.fn(),
    startRage: vi.fn(),
    updateRage: vi.fn(),
    stopRage: vi.fn(),
  }
})

it('enters rage mode from intro and returns without changing the story', () => {
  render(<App />)
  fireEvent.click(screen.getByRole('button', { name: '⚡ 狂暴放大' }))
  expect(screen.getByText(/海报_v9_最终定稿/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '返回首页' }))
  expect(screen.getByRole('button', { name: '开始' })).toBeInTheDocument()
})
```

- [ ] **Step 2: 运行测试并确认失败**

Run: `npm test -- src/App.test.tsx`

Expected: FAIL，找不到“⚡ 狂暴放大”按钮。

- [ ] **Step 3: 接入阶段和首页入口**

在 `src/App.tsx` 顶部增加：

```ts
import { RageScalingPrototype } from './components/RageScalingPrototype'
```

将 `Phase` 联合类型扩展为：

```ts
type Phase =
  | 'intro'
  | 'offer'
  | 'moments'
  | 'alarm'
  | 'onboard'
  | 'setup'
  | 'day2'
  | 'retouch'
  | 'folderGag'
  | 'promotion'
  | 'gallery'
  | 'playing'
  | 'interlude'
  | 'ending'
  | 'death'
  | 'rage'
```

在 `// ─────────────── 开场 ───────────────` 之前增加：

```tsx
if (phase === 'rage') {
  return (
    <>
      <RageScalingPrototype onExit={() => setPhase('intro')} />
      <MuteBtn />
    </>
  )
}
```

在首页“开始”按钮之后、“图鉴”按钮之前增加：

```tsx
<button
  onClick={() => {
    sfx.stopBgm()
    sfx.click()
    setPhase('rage')
  }}
  className="px-6 py-2.5 bg-[#e60012] text-white border-[3px] border-black font-black text-sm tracking-widest shadow-[4px_4px_0_#ffe800] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#ffe800] transition-all"
>
  ⚡ 狂暴放大
</button>
```

- [ ] **Step 4: 运行全部自动检查**

```bash
npm test
npm run lint
npm run build
```

Expected: 所有测试 PASS；ESLint 无错误；TypeScript 与 Vite 构建成功。

- [ ] **Step 5: 启动开发服务器并做浏览器验证**

Run: `npm run dev -- --host 127.0.0.1 --port 3000`

验证以下实际行为：

1. 首页进入“狂暴放大”，返回后“开始”仍进入原剧情。
2. 滑块覆盖 30%、100%；按住后超过 100%，松手暂停，再按继续。
3. 鼠标移出、Pointer Cancel、空格和 Enter 均能正确开始或停止。
4. 达到 10000% 后出现奇点结局，持续音停止；两种“重新体验”按钮均恢复 30%。
5. 反复进入退出无残留声音；全局静音可用。
6. 桌面与窄屏布局无主要按钮遮挡，减少动态效果设置会取消抖动。

验证后停止临时开发服务器，不保留后台 Node/Vite 进程。

- [ ] **Step 6: 提交最终接入**

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "feat: 首页接入狂暴放大模式"
```
