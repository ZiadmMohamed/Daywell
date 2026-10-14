import { CalculationMethod, Coordinates, HighLatitudeRule, Madhab, PrayerTimes } from 'adhan'
import type { CalculationParameters } from 'adhan'
import { PRAYER_NAMES, type PrayerName } from '../constants/prayer'
import type { PrayerSettings } from '../validation/settings'
import { addDaysToKey, parseDateKey, zonedDateKey } from '../time/dates'

export type PrayerConfig = Pick<
  PrayerSettings,
  'latitude' | 'longitude' | 'timezone' | 'method' | 'madhab' | 'highLatitudeRule' | 'adjustments'
>

export interface DaySchedule {
  /** Calendar date in the configured timezone (YYYY-MM-DD). */
  date: string
  /** Epoch ms for each prayer, or null when it cannot be calculated for this place and date. */
  times: Record<PrayerName, number | null>
  sunrise: number | null
}

export function buildParameters(config: PrayerConfig): CalculationParameters {
  const params = CalculationMethod[config.method]()
  params.madhab = config.madhab === 'hanafi' ? Madhab.Hanafi : Madhab.Shafi
  params.highLatitudeRule =
    config.highLatitudeRule === 'auto'
      ? HighLatitudeRule.recommended(new Coordinates(config.latitude, config.longitude))
      : config.highLatitudeRule
  // User adjustments are applied on top of the method's own built-in adjustments.
  params.adjustments = { ...params.adjustments, ...config.adjustments }
  return params
}

const validTime = (date: Date | null | undefined): number | null => {
  const ms = date?.getTime()
  return ms !== undefined && Number.isFinite(ms) ? ms : null
}

/**
 * Prayer times for one calendar date in the configured timezone. adhan reads the
 * year/month/day from the Date's *system-local* getters, so we construct the Date
 * from the configured timezone's calendar date rather than from an instant.
 */
export function calculateDay(dateKey: string, config: PrayerConfig): DaySchedule {
  const { year, month, day } = parseDateKey(dateKey)
  const coordinates = new Coordinates(config.latitude, config.longitude)
  const times = {} as Record<PrayerName, number | null>
  let sunrise: number | null = null
  try {
    const result = new PrayerTimes(coordinates, new Date(year, month - 1, day), buildParameters(config))
    for (const name of PRAYER_NAMES) times[name] = validTime(result[name])
    sunrise = validTime(result.sunrise)
  } catch {
    for (const name of PRAYER_NAMES) times[name] = null
  }
  return { date: dateKey, times, sunrise }
}

export interface ScheduleWindow {
  yesterday: DaySchedule
  today: DaySchedule
  tomorrow: DaySchedule
}

/** Yesterday, today and tomorrow around `now`, as seen in the configured timezone. */
export function calculateWindow(now: number, config: PrayerConfig): ScheduleWindow {
  const today = zonedDateKey(now, config.timezone)
  return {
    yesterday: calculateDay(addDaysToKey(today, -1), config),
    today: calculateDay(today, config),
    tomorrow: calculateDay(addDaysToKey(today, 1), config)
  }
}

export function isDayFullyAvailable(day: DaySchedule): boolean {
  return PRAYER_NAMES.every((name) => day.times[name] !== null)
}
