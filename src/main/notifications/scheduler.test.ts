import { describe, expect, it } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import type { ScheduledEvent } from '@shared/scheduling/events'
import { migrate } from '../database/connection'
import { NotificationLogRepository } from '../database/repositories'
import { Scheduler, type SchedulerSource } from './scheduler'

const MIN = 60_000
const T0 = Date.UTC(2026, 9, 14, 9, 0)

/** A controllable clock with a single pending timer, like the real event loop. */
class FakeClock {
  time = T0
  private pending: { at: number; callback: () => void } | null = null

  now = (): number => this.time
  setTimer = (callback: () => void, ms: number): object => {
    this.pending = { at: this.time + ms, callback }
    return this.pending
  }
  clearTimer = (handle: unknown): void => {
    if (this.pending === handle) this.pending = null
  }
  get nextTimerAt(): number | null {
    return this.pending?.at ?? null
  }
  /** Advances time, firing timers as they come due (normal running). */
  advance(ms: number): void {
    const target = this.time + ms
    while (this.pending && this.pending.at <= target) {
      const { at, callback } = this.pending
      this.pending = null
      this.time = at
      callback()
    }
    this.time = target
  }
  /** Jumps time without firing timers (system suspended). */
  sleep(ms: number): void {
    this.time += ms
  }
}

function newLog(): NotificationLogRepository {
  const db = new DatabaseSync(':memory:')
  migrate(db, ':memory:')
  return new NotificationLogRepository(db)
}

function setup(sources: SchedulerSource[], log = newLog()) {
  const clock = new FakeClock()
  const delivered: string[] = []
  const scheduler = new Scheduler({
    now: clock.now,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    log,
    deliver: (event) => {
      if (event.notify) delivered.push(event.id)
      return true
    }
  })
  for (const source of sources) scheduler.register(source)
  return { clock, scheduler, delivered, log }
}

/** Fixed prayer-like events: one per hour. */
function hourlySource(name: 'prayer' | 'hydration' = 'prayer', count = 6): SchedulerSource & { notify: boolean } {
  const source = {
    name,
    notify: true,
    plan(): ScheduledEvent[] {
      return Array.from({ length: count }, (_, i) => ({
        id: `${name}:${i}`,
        at: T0 + (i + 1) * 60 * MIN,
        source: name,
        missedPolicy: 'skip' as const,
        notify: source.notify,
        payload: { kind: 'hydration-reminder' as const }
      }))
    }
  }
  return source
}

describe('Scheduler', () => {
  it('delivers each event once, at its time, with a single timer', () => {
    const { clock, scheduler, delivered } = setup([hourlySource()])
    scheduler.start()
    expect(clock.nextTimerAt).toBe(T0 + MIN) // never sleeps longer than a minute
    clock.advance(59 * MIN)
    expect(delivered).toEqual([])
    clock.advance(MIN)
    expect(delivered).toEqual(['prayer:0'])
    clock.advance(2 * 60 * MIN)
    expect(delivered).toEqual(['prayer:0', 'prayer:1', 'prayer:2'])
  })

  it('does not duplicate when woken repeatedly or re-planned after settings changes', () => {
    const source = hourlySource()
    const { clock, scheduler, delivered } = setup([source])
    scheduler.start()
    clock.advance(60 * MIN)
    for (let i = 0; i < 5; i++) scheduler.wake()
    source.notify = false // a settings change
    scheduler.wake()
    source.notify = true
    scheduler.wake()
    expect(delivered).toEqual(['prayer:0'])
  })

  it('does not duplicate across an application restart (persistent log)', () => {
    const log = newLog()
    const first = setup([hourlySource()], log)
    first.scheduler.start()
    first.clock.advance(60 * MIN)
    first.scheduler.stop()
    const second = setup([hourlySource()], log)
    second.clock.time = first.clock.time
    second.scheduler.start()
    expect(second.delivered).toEqual([])
  })

  it('after waking from sleep, skips stale events instead of flooding', () => {
    const { clock, scheduler, delivered, log } = setup([hourlySource()])
    scheduler.start()
    clock.sleep(4 * 60 * MIN + 30_000) // suspended across four events
    scheduler.wake() // powerMonitor 'resume'
    expect(delivered).toEqual(['prayer:3']) // due 30 s ago: within the grace window
    expect(log.has('prayer:0')).toBe(true) // recorded as missed, never shown later
    clock.advance(60 * MIN)
    expect(delivered).toEqual(['prayer:3', 'prayer:4'])
  })

  it('respects disabled notifications while still processing the event', () => {
    const source = hourlySource()
    source.notify = false
    const handled: boolean[] = []
    const withHook: SchedulerSource = { ...source, plan: source.plan, onEvent: (_e, _n, d) => handled.push(d) }
    const { clock, scheduler, delivered } = setup([withHook])
    scheduler.start()
    clock.advance(60 * MIN)
    expect(delivered).toEqual([])
    expect(handled).toEqual([true])
  })

  it('re-plans after an event so chained events (next focus phase) are scheduled', () => {
    let endsAt = T0 + 25 * MIN
    let phase = 0
    const focus: SchedulerSource = {
      name: 'focus',
      plan: () =>
        phase < 2
          ? [{ id: `focus:${phase}`, at: endsAt, source: 'focus', missedPolicy: 'deliverLate', notify: true, payload: { kind: 'focus-end', phase: 'work', nextPhase: 'shortBreak' } }]
          : [],
      onEvent: () => {
        phase++
        endsAt += 5 * MIN
      }
    }
    const { clock, scheduler, delivered } = setup([focus])
    scheduler.start()
    clock.advance(25 * MIN)
    expect(delivered).toEqual(['focus:0'])
    expect(clock.nextTimerAt).toBe(T0 + 26 * MIN)
    clock.advance(5 * MIN)
    expect(delivered).toEqual(['focus:0', 'focus:1'])
  })

  it('delivers a late focus-end once after sleep (deliverLate policy)', () => {
    const focus: SchedulerSource = {
      name: 'focus',
      plan: () => [{ id: 'focus:1', at: T0 + 25 * MIN, source: 'focus', missedPolicy: 'deliverLate', notify: true, payload: { kind: 'focus-end', phase: 'work', nextPhase: 'shortBreak' } }]
    }
    const { clock, scheduler, delivered } = setup([focus])
    scheduler.start()
    clock.sleep(3 * 60 * MIN)
    scheduler.wake()
    scheduler.wake()
    expect(delivered).toEqual(['focus:1'])
  })

  it('keeps running when a source throws', () => {
    const broken: SchedulerSource = {
      name: 'hydration',
      plan: () => {
        throw new Error('boom')
      }
    }
    const { clock, scheduler, delivered } = setup([broken, hourlySource()])
    scheduler.start()
    clock.advance(60 * MIN)
    expect(delivered).toEqual(['prayer:0'])
  })
})
