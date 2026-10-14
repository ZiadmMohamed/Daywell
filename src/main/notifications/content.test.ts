import { describe, expect, it } from 'vitest'
import type { ScheduledEvent } from '@shared/scheduling/events'
import { buildNotification, type ContentContext } from './content'

const ctx: ContentContext = {
  language: 'en',
  timeFormat: '12h',
  prayerTimeZone: 'Africa/Cairo',
  focusSound: true,
  athanFile: null,
  hydrationTotalMl: 750,
  hydrationGoalMl: 2000
}

const asrAt = Date.UTC(2026, 9, 14, 13, 2) // 16:02 in Cairo (UTC+3)

function event(payload: ScheduledEvent['payload']): ScheduledEvent {
  return { id: 'x', at: 0, source: 'prayer', missedPolicy: 'skip', notify: true, payload }
}

describe('notification content', () => {
  it('describes prayer time in the configured timezone', () => {
    const n = buildNotification(event({ kind: 'prayer-at', prayer: 'asr', prayerAt: asrAt }), ctx)
    expect(n).toMatchObject({ title: 'Asr', body: 'It is time for Asr prayer (4:02 PM).', page: 'prayer', sound: null, silent: false })
  })

  it('describes the pre-prayer reminder with its lead time', () => {
    const n = buildNotification(event({ kind: 'prayer-before', prayer: 'asr', prayerAt: asrAt, leadMinutes: 10 }), ctx)
    expect(n.title).toBe('Asr in 10 minutes')
  })

  it('plays the Athan only when the user chose a file, and silences the toast sound then', () => {
    const n = buildNotification(event({ kind: 'prayer-at', prayer: 'asr', prayerAt: asrAt }), { ...ctx, athanFile: 'athan-1234abcd.mp3' })
    expect(n.sound).toEqual({ kind: 'athan', file: 'athan-1234abcd.mp3' })
    expect(n.silent).toBe(true)
  })

  it('reports hydration progress', () => {
    const n = buildNotification(event({ kind: 'hydration-reminder' }), ctx)
    expect(n.body).toBe('750 of 2,000 ml so far today. Click to log a drink.')
    expect(n.page).toBe('hydration')
  })

  it('names the next phase when focus ends, and respects the sound preference', () => {
    const work = buildNotification(event({ kind: 'focus-end', phase: 'work', nextPhase: 'longBreak' }), { ...ctx, focusSound: false })
    expect(work.body).toBe('Nice work. Time for a long break.')
    expect(work.silent).toBe(true)
    const brk = buildNotification(event({ kind: 'focus-end', phase: 'shortBreak', nextPhase: 'work' }), ctx)
    expect(brk.title).toBe('Break is over')
  })

  it('localises to Arabic', () => {
    const n = buildNotification(event({ kind: 'prayer-at', prayer: 'maghrib', prayerAt: asrAt }), { ...ctx, language: 'ar' })
    expect(n.title).toBe('المغرب')
    expect(n.body).toContain('حان الآن موعد صلاة المغرب')
  })
})
