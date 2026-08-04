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

/** 交付盖章：ka-chunk 爽感 = 低频重锤 + 机械噪声 + 金属尾音 */
export function stamp() {
  if (muted) return
  const c = ac()
  const t0 = c.currentTime
  // 1. 机械撞击噪声（闷）
  noise(0.1, t0, 0.4, 500)
  // 2. 低频重锤（身体感）
  tone({ type: 'sine', freq: 110, freqEnd: 48, at: t0, dur: 0.22, gain: 0.5, attack: 0.002 })
  // 3. 腔体共鸣
  tone({ type: 'triangle', freq: 220, freqEnd: 130, at: t0 + 0.015, dur: 0.14, gain: 0.16 })
  // 4. 金属尾音 ting
  tone({ type: 'square', freq: 1900, at: t0 + 0.05, dur: 0.05, gain: 0.035 })
  tone({ type: 'square', freq: 2600, at: t0 + 0.07, dur: 0.04, gain: 0.02 })
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
