// 《再大一点》音频引擎：全部用 Web Audio API 实时合成，无音频文件。
// BGM = 滑稽贝斯跳音循环；SFX = 按钮啵声 / 聊天气泡音 / 交付盖章 ka-chunk。

type Ctx = AudioContext

let ctx: Ctx | null = null
let master: GainNode | null = null
let muted = false

function ac(): Ctx {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.9
    master.connect(ctx.destination)
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

function out(): GainNode {
  ac()
  return master!
}

export function toggleMute(): boolean {
  muted = !muted
  if (master) master.gain.value = muted ? 0 : 0.9
  return muted
}

export function isMuted(): boolean {
  return muted
}

// ─────────────────────── 基础合成工具 ───────────────────────

interface ToneOpts {
  type: OscillatorType
  freq: number // Hz
  freqEnd?: number // 滑音目标
  at?: number // 开始时间（默认立即）
  dur: number
  gain: number
  attack?: number
}

function tone({ type, freq, freqEnd, at, dur, gain, attack = 0.005 }: ToneOpts) {
  const c = ac()
  const t0 = at ?? c.currentTime
  const osc = c.createOscillator()
  const g = c.createGain()
  osc.type = type
  osc.frequency.setValueAtTime(freq, t0)
  if (freqEnd) osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t0 + dur)
  g.gain.setValueAtTime(0, t0)
  g.gain.linearRampToValueAtTime(gain, t0 + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(g).connect(out())
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
}

let noiseBuf: AudioBuffer | null = null
function noise(dur: number, at: number | undefined, gain: number, lowpass: number) {
  const c = ac()
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const t0 = at ?? c.currentTime
  const src = c.createBufferSource()
  src.buffer = noiseBuf
  const f = c.createBiquadFilter()
  f.type = 'lowpass'
  f.frequency.value = lowpass
  const g = c.createGain()
  g.gain.setValueAtTime(gain, t0)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  src.connect(f).connect(g).connect(out())
  src.start(t0)
  src.stop(t0 + dur + 0.05)
}

// ─────────────────────── SFX ───────────────────────

/** 按钮啵声 */
export function click() {
  if (muted) return
  tone({ type: 'square', freq: 700, freqEnd: 980, dur: 0.07, gain: 0.06 })
}

/** 聊天气泡音：按说话人区分音高 */
export function pop(speaker: 'client' | 'director' | 'system' | 'me') {
  if (muted) return
  const base = { client: 520, director: 380, system: 240, me: 440 }[speaker]
  tone({ type: 'sine', freq: base, freqEnd: base * 0.62, dur: 0.09, gain: 0.09 })
  tone({ type: 'triangle', freq: base * 2, dur: 0.04, gain: 0.03 })
}

/** 发送文件：嗖～飞走 + 落点的液体 plop */
export function send() {
  if (muted) return
  const c = ac()
  const t0 = c.currentTime
  // 嗖：带通噪声上扫
  if (!noiseBuf) {
    noiseBuf = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  const src = c.createBufferSource()
  src.buffer = noiseBuf
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.Q.value = 1.2
  f.frequency.setValueAtTime(400, t0)
  f.frequency.exponentialRampToValueAtTime(3200, t0 + 0.28)
  const g = c.createGain()
  g.gain.setValueAtTime(0.001, t0)
  g.gain.exponentialRampToValueAtTime(0.35, t0 + 0.08)
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32)
  src.connect(f).connect(g).connect(out())
  src.start(t0)
  src.stop(t0 + 0.4)
  // 落点 plop
  tone({ type: 'sine', freq: 340, freqEnd: 130, at: t0 + 0.24, dur: 0.13, gain: 0.3, attack: 0.004 })
  tone({ type: 'sine', freq: 1300, freqEnd: 900, at: t0 + 0.24, dur: 0.025, gain: 0.05, attack: 0.001 })
}

/** 发送文件：macOS 式"把文件丢进去"的液体 plop */
export function drop() {
  if (muted) return
  const c = ac()
  const t0 = c.currentTime
  // 气流吸入感
  noise(0.08, t0, 0.22, 900)
  // 液体 plop：音高快速下坠
  tone({ type: 'sine', freq: 340, freqEnd: 130, at: t0 + 0.02, dur: 0.13, gain: 0.32, attack: 0.004 })
  tone({ type: 'triangle', freq: 180, freqEnd: 90, at: t0 + 0.05, dur: 0.1, gain: 0.15 })
  // 入水瞬间的小脆点
  tone({ type: 'sine', freq: 1400, freqEnd: 900, at: t0, dur: 0.025, gain: 0.06, attack: 0.001 })
}

/** Logo 长大：体积越大，音效越低、越长、越夸张 */
export function grow(size: number) {
  if (muted) return
  const c = ac()
  const t0 = c.currentTime
  const f0 = 520 - size * 3.2 // 越大越低
  const dur = 0.14 + size / 220 // 越大越长
  const g = 0.08 + size / 500 // 越大越响
  // 橡胶 boing：先压扁再弹起
  const osc = c.createOscillator()
  const gn = c.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(f0 * 0.55, t0)
  osc.frequency.exponentialRampToValueAtTime(f0 * 1.15, t0 + dur * 0.45)
  osc.frequency.exponentialRampToValueAtTime(f0 * 0.85, t0 + dur)
  gn.gain.setValueAtTime(0, t0)
  gn.gain.linearRampToValueAtTime(g, t0 + 0.01)
  gn.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
  osc.connect(gn).connect(out())
  osc.start(t0)
  osc.stop(t0 + dur + 0.05)
  // 低频身体感随体积增强
  tone({ type: 'sine', freq: 180 - size, freqEnd: 60, at: t0, dur: dur * 0.8, gain: size / 400 })
  // 大到 80% 以上附加一声闷"轰"
  if (size >= 80) noise(0.12, t0, 0.2, 400)
}

/** 打包盖章：清脆两段式「咔-嗒」（zip 动画专用） */
export function stamp() {
  if (muted) return
  const c = ac()
  const t0 = c.currentTime
  // 咔：高频脆击（瞬态要尖）
  noise(0.025, t0, 0.45, 2500)
  tone({ type: 'square', freq: 880, freqEnd: 420, at: t0, dur: 0.03, gain: 0.14, attack: 0.001 })
  // 嗒：中频机械咬合（主体）
  noise(0.05, t0 + 0.045, 0.5, 1100)
  tone({ type: 'triangle', freq: 340, freqEnd: 140, at: t0 + 0.045, dur: 0.09, gain: 0.3, attack: 0.001 })
  // 低频垫底（保留一点身体感，不糊）
  tone({ type: 'sine', freq: 150, freqEnd: 70, at: t0 + 0.045, dur: 0.11, gain: 0.22, attack: 0.001 })
  // 金属尾音
  tone({ type: 'square', freq: 2300, at: t0 + 0.09, dur: 0.04, gain: 0.03 })
}

// ─────────────────────── BGM：滑稽跳音循环 ───────────────────────

const BPM = 126
const STEP = 60 / BPM / 2 // 八分音符
const N = (midi: number) => 440 * Math.pow(2, (midi - 69) / 12)

// 2 小节 × 8 步。贝斯：大号式跳音；旋律： pizz 短音，带一点滑稽的滑音收尾
const bassline = [48, 48, 52, 55, 57, 55, 52, 48, 50, 50, 53, 57, 55, 52, 50, 43]
const melody: (number | null)[] = [64, null, 67, 69, 72, null, 71, 67, 69, null, 65, 64, 62, 64, 67, null]

let bgmTimer: number | null = null
let bgmStep = 0
let bgmNext = 0

function scheduleStep(step: number, t: number) {
  if (muted) return
  // 贝斯（短促跳音）
  tone({ type: 'triangle', freq: N(bassline[step]), at: t, dur: STEP * 0.85, gain: 0.11, attack: 0.004 })
  // 旋律（pizz 方波）
  const m = melody[step]
  if (m !== null) {
    const slide = step === 14 ? N(m) * 1.5 : undefined // 每循环一个滑稽上滑
    tone({ type: 'square', freq: N(m), freqEnd: slide, at: t, dur: STEP * 0.7, gain: 0.045, attack: 0.003 })
  }
  // 反拍小镲片感
  if (step % 2 === 1) noise(0.03, t, 0.015, 6000)
}

function bgmTick() {
  const c = ac()
  while (bgmNext < c.currentTime + 0.15) {
    scheduleStep(bgmStep, bgmNext)
    bgmStep = (bgmStep + 1) % 16
    bgmNext += STEP
  }
}

/** 首页 BGM（浏览器要求首次交互后才能发声） */
export function startBgm() {
  ac()
  if (bgmTimer !== null) return
  bgmStep = 0
  bgmNext = ac().currentTime + 0.08
  bgmTimer = window.setInterval(bgmTick, 40)
}

export function stopBgm() {
  if (bgmTimer !== null) {
    clearInterval(bgmTimer)
    bgmTimer = null
  }
}
