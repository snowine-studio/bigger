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
    expect(getShakeMagnitude(9999)).toBe(12)
    expect(getShakeMagnitude(10000)).toBe(0)
  })
})
