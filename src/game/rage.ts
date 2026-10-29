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
