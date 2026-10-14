import { describe, expect, it } from 'vitest'
import { resolveDue, type ScheduledEvent } from './events'
import { planPrayerEvents } from './prayerEvents'
import { calculateWindow } from '../prayer/calc'
import { DEFAULT_SETTINGS, type PrayerSettings } from '../validation/settings'

const GRACE = 2 * 60_000
const T = Date.UTC(2026, 9, 14, 12, 0)

function event(id: string, at: number, missedPolicy: ScheduledEvent['missedPolicy'] = 'skip'): ScheduledEvent {
  return { id, at, source: 'hydration', missedPolicy, notify: true, payload: { kind: 'hydration-reminder' } }
}

describe('resolveDue', () => {
  it('delivers due events and reports the next wake-up', () => {
    const r = resolveDue([event('a', T - 1000), event('b', T + 60_000), event('c', T + 5_000)], T, () => false, GRACE)
    expect(r.deliver.map((e) => e.id)).toEqual(['a'])
    expect(r.missed).toEqual([])
    expect(r.nextAt).toBe(T + 5_000)
  })

  it('never delivers an already-handled event (duplicate prevention)', () => {
    const handled = new Set(['a'])
    const r = resolveDue([event('a', T - 1000), event('a', T - 1000)], T, (id) => handled.has(id), GRACE)
    expect(r.deliver).toEqual([])
  })

  it('collapses duplicate ids produced by overlapping sources', () => {
    const r = resolveDue([event('a', T - 1000), event('a', T - 1000)], T, () => false, GRACE)
    expect(r.deliver).toHaveLength(1)
  })

  it('treats stale events after a sleep as missed, without flooding', () => {
    const afterSleep = T + 6 * 60 * 60_000
    const stale = [event('p1', T), event('p2', T + 60 * 60_000), event('p3', T + 2 * 60 * 60_000)]
    const r = resolveDue(stale, afterSleep, () => false, GRACE)
    expect(r.deliver).toEqual([])
    expect(r.missed.map((e) => e.id)).toEqual(['p1', 'p2', 'p3'])
  })

  it('still delivers late events whose policy asks for it, once', () => {
    const focusEnd = event('focus', T, 'deliverLate')
    const r = resolveDue([focusEnd], T + 3 * 60 * 60_000, () => false, GRACE)
    expect(r.deliver.map((e) => e.id)).toEqual(['focus'])
  })
})

describe('planPrayerEvents', () => {
  const settings = DEFAULT_SETTINGS.prayer
  const window = calculateWindow(T, settings)

  it('plans an event per prayer for today and tomorrow with stable ids', () => {
    const events = planPrayerEvents(window, settings)
    expect(events).toHaveLength(10)
    expect(events[0]).toMatchObject({ id: `prayer:${window.today.date}:fajr:at`, at: window.today.times.fajr })
    expect(planPrayerEvents(window, settings).map((e) => e.id)).toEqual(events.map((e) => e.id))
  })

  it('respects per-prayer preferences and the global switch', () => {
    const noAsr: PrayerSettings = { ...settings, notifyAt: { ...settings.notifyAt, asr: false } }
    expect(planPrayerEvents(window, noAsr).some((e) => e.id.includes(':asr:'))).toBe(false)
    expect(planPrayerEvents(window, { ...settings, notificationsEnabled: false })).toEqual([])
  })

  it('adds pre-prayer reminders with the configured lead time', () => {
    const events = planPrayerEvents(window, { ...settings, reminderBefore: true, reminderLeadMinutes: 15 })
    const before = events.find((e) => e.id === `prayer:${window.today.date}:dhuhr:before`)
    expect(before?.at).toBe(window.today.times.dhuhr! - 15 * 60_000)
    expect(events).toHaveLength(20)
  })

  it('recalculates when settings change but keeps ids stable so handled events are not repeated', () => {
    const shifted = calculateWindow(T, { ...settings, adjustments: { ...settings.adjustments, dhuhr: 5 } })
    const a = planPrayerEvents(window, settings).find((e) => e.id.endsWith('dhuhr:at'))!
    const b = planPrayerEvents(shifted, settings).find((e) => e.id.endsWith('dhuhr:at'))!
    expect(b.id).toBe(a.id)
    expect(b.at - a.at).toBe(5 * 60_000)
  })

  it('skips notifications inside the prayer quiet hours', () => {
    // vitest pins TZ=Africa/Cairo, the same zone as the default location.
    const quiet: PrayerSettings = { ...settings, quietHours: { enabled: true, start: '03:00', end: '06:30' } }
    const events = planPrayerEvents(window, quiet)
    expect(events.some((e) => e.id.endsWith('fajr:at'))).toBe(false)
    expect(events).toHaveLength(8)
  })
})
