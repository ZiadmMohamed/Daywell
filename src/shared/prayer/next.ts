import { PRAYER_NAMES, type PrayerName } from '../constants/prayer'
import type { DaySchedule, ScheduleWindow } from './calc'

export interface PrayerEvent {
  name: PrayerName
  at: number
  date: string
}

export type PrayerStatus = 'passed' | 'current' | 'next' | 'upcoming' | 'unavailable'

/** All calculable prayers across the window, in chronological order. */
export function flattenWindow(window: ScheduleWindow): PrayerEvent[] {
  const events: PrayerEvent[] = []
  for (const day of [window.yesterday, window.today, window.tomorrow]) {
    for (const name of PRAYER_NAMES) {
      const at = day.times[name]
      if (at !== null) events.push({ name, at, date: day.date })
    }
  }
  return events.sort((a, b) => a.at - b.at)
}

/** The first prayer strictly after `now` (rolls over to tomorrow's Fajr after Isha). */
export function findNextPrayer(window: ScheduleWindow, now: number): PrayerEvent | null {
  return flattenWindow(window).find((e) => e.at > now) ?? null
}

/** The most recent prayer at or before `now` (yesterday's Isha before today's Fajr). */
export function findCurrentPrayer(window: ScheduleWindow, now: number): PrayerEvent | null {
  const past = flattenWindow(window).filter((e) => e.at <= now)
  return past[past.length - 1] ?? null
}

/** Display status for each of a day's prayers relative to `now`. */
export function dayStatuses(day: DaySchedule, window: ScheduleWindow, now: number): Record<PrayerName, PrayerStatus> {
  const next = findNextPrayer(window, now)
  const current = findCurrentPrayer(window, now)
  const statuses = {} as Record<PrayerName, PrayerStatus>
  for (const name of PRAYER_NAMES) {
    const at = day.times[name]
    if (at === null) statuses[name] = 'unavailable'
    else if (next && next.date === day.date && next.name === name) statuses[name] = 'next'
    else if (current && current.date === day.date && current.name === name) statuses[name] = 'current'
    else statuses[name] = at <= now ? 'passed' : 'upcoming'
  }
  return statuses
}
