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
