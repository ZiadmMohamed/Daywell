import { EventEmitter } from 'node:events'
import { describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ supported: true }))

vi.mock('electron', async () => {
  const { EventEmitter: Emitter } = await import('node:events')
  class Notification extends Emitter {
    static isSupported(): boolean {
      return state.supported
    }
    show(): void {}
  }
  return { Notification }
})

const { Notifier } = await import('./notifier')

class FakeTray extends EventEmitter {
  balloons = 0
  isDestroyed(): boolean {
    return false
  }
  displayBalloon(): void {
    this.balloons++
  }
}

const options = { title: 't', body: 'b', silent: false, onClick: () => {} }

describe('Notifier memory bounds', () => {
  it('keeps a bounded number of notifications referenced when Windows never reports close', () => {
    state.supported = true
    const notifier = new Notifier(() => null, {} as never)
    for (let i = 0; i < 500; i++) notifier.show(options)
    expect(notifier.trackedCount).toBeLessThanOrEqual(20)
  })

  it('does not stack a click listener per tray balloon', () => {
    state.supported = false
    const tray = new FakeTray()
    const notifier = new Notifier(() => tray as never, {} as never)
    for (let i = 0; i < 200; i++) notifier.show(options)
    expect(tray.balloons).toBe(200)
    expect(tray.listenerCount('balloon-click')).toBe(1)
  })

  it('still delivers the click for the balloon on screen', () => {
    state.supported = false
    const tray = new FakeTray()
    const notifier = new Notifier(() => tray as never, {} as never)
    const clicks: string[] = []
    notifier.show({ ...options, onClick: () => clicks.push('first') })
    notifier.show({ ...options, onClick: () => clicks.push('second') })
    tray.emit('balloon-click')
    expect(clicks).toEqual(['second'])
    expect(tray.listenerCount('balloon-click')).toBe(0)
  })
})
