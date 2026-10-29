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
