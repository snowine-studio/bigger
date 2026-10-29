import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { RageScalingPrototype } from './RageScalingPrototype'
import * as sfx from '../game/audio'

vi.mock('../game/audio', () => ({
  startRage: vi.fn(),
  updateRage: vi.fn(),
  stopRage: vi.fn(),
}))

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.restoreAllMocks()
})

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

it.each([
  ['element blur', (hold: HTMLElement) => fireEvent.blur(hold)],
  ['window blur', () => fireEvent.blur(window)],
  ['visibility loss', () => {
    vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
    fireEvent(document, new Event('visibilitychange'))
  }],
])('stops keyboard charging and sustained audio on %s even when released elsewhere', (_event, loseFocus) => {
  render(<RageScalingPrototype onExit={vi.fn()} />)
  const hold = screen.getByRole('button', { name: /按住不放/ })
  vi.mocked(sfx.stopRage).mockClear()
  vi.mocked(cancelAnimationFrame).mockClear()

  fireEvent.keyDown(hold, { key: ' ' })
  expect(hold).toHaveClass('scale-95')
  expect(sfx.startRage).toHaveBeenCalledTimes(1)

  loseFocus(hold)
  fireEvent.keyUp(document.body, { key: ' ' })

  expect(hold).not.toHaveClass('scale-95')
  expect(sfx.stopRage).toHaveBeenCalled()
  expect(cancelAnimationFrame).toHaveBeenCalled()
})
