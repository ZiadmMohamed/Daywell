import { describe, expect, it } from 'vitest'
import { computeProgress, fillDailyTotals, isValidIntakeAmount, totalForDate, type HydrationEntry } from './totals'
import { nextHydrationReminder, type HydrationReminderInput } from './reminders'
import { localDateKey } from '../time/dates'

// vitest pins TZ=Africa/Cairo.
const local = (d: number, h: number, m = 0): number => new Date(2026, 9, d, h, m).getTime()

function entry(id: number, amountMl: number, recordedAt: number): HydrationEntry {
  return { id, amountMl, recordedAt, localDate: localDateKey(recordedAt) }
}

describe('daily totals', () => {
  it('sums entries for a local date', () => {
    const entries = [entry(1, 250, local(14, 9)), entry(2, 500, local(14, 13)), entry(3, 150, local(13, 20))]
    expect(totalForDate(entries, '2026-10-14')).toBe(750)
    expect(totalForDate(entries, '2026-10-13')).toBe(150)
    expect(totalForDate(entries, '2026-10-12')).toBe(0)
  })

  it('assigns entries to the local calendar date, not the UTC date', () => {
    // 01:30 in Cairo (UTC+3 in October) is still the previous day in UTC.
    const lateNight = local(15, 1, 30)
    expect(new Date(lateNight).toISOString().slice(0, 10)).toBe('2026-10-14')
    expect(localDateKey(lateNight)).toBe('2026-10-15')
    // 23:59 and 00:00 fall on different days.
    expect(localDateKey(local(14, 23, 59))).toBe('2026-10-14')
    expect(localDateKey(local(15, 0, 0))).toBe('2026-10-15')
  })

  it('fills missing days in history', () => {
    const history = fillDailyTotals(
      [
        { date: '2026-10-12', totalMl: 1800 },
        { date: '2026-10-14', totalMl: 750 }
      ],
      '2026-10-14',
      4
    )
    expect(history).toEqual([
      { date: '2026-10-11', totalMl: 0 },
      { date: '2026-10-12', totalMl: 1800 },
      { date: '2026-10-13', totalMl: 0 },
      { date: '2026-10-14', totalMl: 750 }
    ])
  })
})

describe('progress', () => {
  it('matches the documented example', () => {
    expect(computeProgress(750, 2000)).toEqual({
      goalMl: 2000,
      totalMl: 750,
      remainingMl: 1250,
      percent: 37.5,
      goalReached: false
    })
  })

  it('updates as water is added and caps at the goal', () => {
    expect(computeProgress(2000, 2000)).toMatchObject({ percent: 100, remainingMl: 0, goalReached: true })
    expect(computeProgress(2600, 2000)).toMatchObject({ percent: 100, remainingMl: 0, goalReached: true })
    expect(computeProgress(0, 2000).percent).toBe(0)
  })

  it('validates intake amounts', () => {
    expect(isValidIntakeAmount(250)).toBe(true)
    expect(isValidIntakeAmount(0)).toBe(false)
    expect(isValidIntakeAmount(-5)).toBe(false)
    expect(isValidIntakeAmount(12.5)).toBe(false)
    expect(isValidIntakeAmount(5001)).toBe(false)
  })
})

describe('reminder timing', () => {
  const base: HydrationReminderInput = {
    enabled: true,
    intervalMinutes: 60,
    quietHours: { enabled: true, start: '22:00', end: '08:00' },
    lastIntakeAt: null,
    lastReminderAt: null,
    armedAt: local(14, 9),
    pausedUntil: null,
    goalReached: false,
    nextDayStart: local(15, 0)
  }

  it('counts the interval from the latest drink or reminder', () => {
    expect(nextHydrationReminder(base)).toBe(local(14, 10))
    expect(nextHydrationReminder({ ...base, lastIntakeAt: local(14, 9, 40) })).toBe(local(14, 10, 40))
    expect(
      nextHydrationReminder({ ...base, lastReminderAt: local(14, 11), lastIntakeAt: local(14, 10, 30) })
    ).toBe(local(14, 12))
  })

  it('never schedules inside quiet hours', () => {
    expect(nextHydrationReminder({ ...base, lastIntakeAt: local(14, 21, 30) })).toBe(local(15, 8))
  })

  it('respects pauses and the disabled setting', () => {
    expect(nextHydrationReminder({ ...base, pausedUntil: local(14, 15) })).toBe(local(14, 15))
    expect(nextHydrationReminder({ ...base, enabled: false })).toBeNull()
  })

  it('waits until the next day once the goal is reached', () => {
    expect(nextHydrationReminder({ ...base, goalReached: true })).toBe(local(15, 8))
  })
})
