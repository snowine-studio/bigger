import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

function fakeAudioContext(resume: () => Promise<void>) {
  return class {
    currentTime = 0
    state = 'suspended'
    destination = {}
    resume = resume

    createGain() {
      return {
        gain: {
          value: 0,
          setValueAtTime: vi.fn(),
          linearRampToValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect: vi.fn(),
      }
    }

    createOscillator() {
      return {
        type: '',
        frequency: {
          setValueAtTime: vi.fn(),
          exponentialRampToValueAtTime: vi.fn(),
        },
        connect(node: unknown) { return node },
        start: vi.fn(),
        stop: vi.fn(),
      }
    }
  }
}

async function renderApp() {
  vi.resetModules()
  const { default: App } = await import('./App')
  return render(<App />)
}

afterEach(async () => {
  const sfx = await import('./game/audio')
  sfx.stopBgm()
  sfx.stopRage()
  vi.unstubAllGlobals()
})

it('enters rage mode from intro and returns without changing the story', async () => {
  const resume = vi.fn().mockResolvedValue(undefined)
  vi.stubGlobal('AudioContext', fakeAudioContext(resume))
  await renderApp()

  fireEvent.click(screen.getByRole('button', { name: '⚡ 狂暴放大' }))
  expect(resume).toHaveBeenCalled()
  expect(screen.getByText(/海报_v9_最终定稿/)).toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: '返回首页' }))
  expect(screen.getByRole('button', { name: '开始' })).toBeInTheDocument()
})

it('enters rage mode when AudioContext construction throws', async () => {
  vi.stubGlobal('AudioContext', class {
    constructor() { throw new Error('Audio unavailable') }
  })
  await renderApp()

  const entry = screen.getByRole('button', { name: '⚡ 狂暴放大' })
  fireEvent.pointerDown(entry)
  fireEvent.click(entry)
  expect(screen.getByText(/海报_v9_最终定稿/)).toBeInTheDocument()
})

it('enters rage mode without an unhandled rejection when audio resume rejects', async () => {
  vi.stubGlobal('AudioContext', fakeAudioContext(() => Promise.reject(new Error('Resume blocked'))))
  await renderApp()

  const entry = screen.getByRole('button', { name: '⚡ 狂暴放大' })
  fireEvent.pointerDown(entry)
  fireEvent.click(entry)
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(screen.getByText(/海报_v9_最终定稿/)).toBeInTheDocument()
})
