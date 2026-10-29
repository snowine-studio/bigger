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
