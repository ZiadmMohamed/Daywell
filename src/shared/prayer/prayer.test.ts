import { afterEach, describe, expect, it } from 'vitest'
import { calculateDay, calculateWindow, isDayFullyAvailable, type PrayerConfig } from './calc'
import { dayStatuses, findCurrentPrayer, findNextPrayer } from './next'
import { zonedDateKey, zonedParts } from '../time/dates'
import { PRAYER_NAMES } from '../constants/prayer'

/**
 * Reference: an independent low-precision solar position model (Astronomical
 * Almanac / NOAA approximation, accurate to ~0.01°). Rather than comparing to
 * hand-copied timetables, we verify that the sun is at the altitude each
 * method defines at every calculated time — the definition the published
 * schedules are themselves derived from.
 */
const rad = Math.PI / 180
function sun(ms: number, lat: number, lng: number): { altitude: number; hourAngle: number; declination: number } {
  const n = ms / 86_400_000 + 2440587.5 - 2451545.0
  const L = (280.46 + 0.9856474 * n) % 360
  const g = ((357.528 + 0.9856003 * n) % 360) * rad
  const lambda = (L + 1.915 * Math.sin(g) + 0.02 * Math.sin(2 * g)) * rad
  const eps = (23.439 - 0.0000004 * n) * rad
  const ra = Math.atan2(Math.cos(eps) * Math.sin(lambda), Math.cos(lambda)) / rad
  const decl = Math.asin(Math.sin(eps) * Math.sin(lambda))
  const gmst = (18.697374558 + 24.06570982441908 * n) % 24
  let hourAngle = (gmst * 15 + lng - ra) % 360
  if (hourAngle > 180) hourAngle -= 360
  if (hourAngle < -180) hourAngle += 360
  const altitude =
    Math.asin(Math.sin(lat * rad) * Math.sin(decl) + Math.cos(lat * rad) * Math.cos(decl) * Math.cos(hourAngle * rad)) / rad
  return { altitude, hourAngle, declination: decl / rad }
}

/** Altitude of the sun when an object's shadow equals `factor` × its length plus the noon shadow. */
function asrAltitude(lat: number, declination: number, factor: number): number {
  return Math.atan(1 / (factor + Math.tan(Math.abs(lat - declination) * rad))) / rad
}

// Times are rounded to the nearest minute; the sun moves up to ~0.25°/min.
const ANGLE_TOLERANCE = 0.4

const alexandria: PrayerConfig = {
  latitude: 31.2001,
  longitude: 29.9187,
  timezone: 'Africa/Cairo',
  method: 'Egyptian',
  madhab: 'shafi',
  highLatitudeRule: 'auto',
  adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 }
}

const at = (iso: string): number => new Date(iso).getTime()

describe('prayer calculation — Alexandria, Egyptian method', () => {
  const day = calculateDay('2026-03-21', alexandria)
  const { latitude: lat, longitude: lng } = alexandria

  it('computes all five prayers on the requested local date, in order', () => {
    expect(isDayFullyAvailable(day)).toBe(true)
    const times = PRAYER_NAMES.map((n) => day.times[n] as number)
    expect([...times].sort((a, b) => a - b)).toEqual(times)
    for (const t of times) expect(zonedDateKey(t, 'Africa/Cairo')).toBe('2026-03-21')
  })

  it('places Fajr at a solar depression of 19.5° and Isha at 17.5°', () => {
    expect(Math.abs(sun(day.times.fajr!, lat, lng).altitude + 19.5)).toBeLessThan(ANGLE_TOLERANCE)
    expect(Math.abs(sun(day.times.isha!, lat, lng).altitude + 17.5)).toBeLessThan(ANGLE_TOLERANCE)
  })

  it('places Maghrib at sunset and Dhuhr just after solar noon', () => {
    // Sunset: upper limb on the horizon with standard refraction (−0.833°).
    expect(Math.abs(sun(day.times.maghrib!, lat, lng).altitude + 0.833)).toBeLessThan(ANGLE_TOLERANCE)
    const dhuhrHourAngle = sun(day.times.dhuhr!, lat, lng).hourAngle
    // Dhuhr is at or a few minutes after transit (1 minute ≈ 0.25° of hour angle).
    expect(dhuhrHourAngle).toBeGreaterThanOrEqual(-0.3)
    expect(dhuhrHourAngle).toBeLessThan(1.5)
  })

  it('places standard Asr where shadows equal object length plus the noon shadow', () => {
    const s = sun(day.times.asr!, lat, lng)
    expect(Math.abs(s.altitude - asrAltitude(lat, s.declination, 1))).toBeLessThan(ANGLE_TOLERANCE)
  })

  it('formats sensible local wall-clock times', () => {
    const dhuhr = zonedParts(day.times.dhuhr!, 'Africa/Cairo')
    expect(dhuhr.hour).toBe(12)
    expect(zonedParts(day.times.fajr!, 'Africa/Cairo').hour).toBe(4)
    expect(zonedParts(day.times.maghrib!, 'Africa/Cairo').hour).toBe(18)
  })
})

describe('calculation configuration', () => {
  it('uses the selected method: Umm al-Qura Isha is a fixed 90 minutes after Maghrib', () => {
    const makkah: PrayerConfig = { ...alexandria, latitude: 21.4225, longitude: 39.8262, timezone: 'Asia/Riyadh', method: 'UmmAlQura' }
    const day = calculateDay('2026-06-21', makkah)
    expect((day.times.isha! - day.times.maghrib!) / 60_000).toBe(90)
    // Umm al-Qura Fajr angle is 18.5°.
    expect(Math.abs(sun(day.times.fajr!, makkah.latitude, makkah.longitude).altitude + 18.5)).toBeLessThan(ANGLE_TOLERANCE)
  })

  it('changing the method changes Fajr and Isha', () => {
    const egyptian = calculateDay('2026-03-21', alexandria)
    const mwl = calculateDay('2026-03-21', { ...alexandria, method: 'MuslimWorldLeague' })
    // MWL uses 18°/17° instead of 19.5°/17.5°: later Fajr, earlier Isha.
    expect(mwl.times.fajr!).toBeGreaterThan(egyptian.times.fajr!)
    expect(mwl.times.isha!).toBeLessThan(egyptian.times.isha!)
  })

  it('Hanafi Asr is later than standard Asr and matches a shadow factor of 2', () => {
    const shafi = calculateDay('2026-03-21', alexandria)
    const hanafi = calculateDay('2026-03-21', { ...alexandria, madhab: 'hanafi' })
    expect(hanafi.times.asr!).toBeGreaterThan(shafi.times.asr! + 30 * 60_000)
    const s = sun(hanafi.times.asr!, alexandria.latitude, alexandria.longitude)
    expect(Math.abs(s.altitude - asrAltitude(alexandria.latitude, s.declination, 2))).toBeLessThan(ANGLE_TOLERANCE)
    // Other prayers are unaffected by the Asr preference.
    expect(hanafi.times.fajr).toBe(shafi.times.fajr)
    expect(hanafi.times.isha).toBe(shafi.times.isha)
  })

  it('applies manual minute adjustments exactly, per prayer', () => {
    const base = calculateDay('2026-03-21', alexandria)
    const adjusted = calculateDay('2026-03-21', {
      ...alexandria,
      adjustments: { fajr: 3, dhuhr: 0, asr: -2, maghrib: 5, isha: 0 }
    })
    expect(adjusted.times.fajr! - base.times.fajr!).toBe(3 * 60_000)
    expect(adjusted.times.asr! - base.times.asr!).toBe(-2 * 60_000)
    expect(adjusted.times.maghrib! - base.times.maghrib!).toBe(5 * 60_000)
    expect(adjusted.times.dhuhr).toBe(base.times.dhuhr)
    expect(adjusted.times.isha).toBe(base.times.isha)
  })
})

describe('timezones and daylight saving', () => {
  const originalTz = process.env.TZ
  afterEach(() => {
    process.env.TZ = originalTz
  })

  it('uses the configured timezone calendar date even when the system timezone differs', () => {
    // System at UTC+14 while the configured location is UTC-10: different calendar days most of the time.
    process.env.TZ = 'Pacific/Kiritimati'
    const honolulu: PrayerConfig = { ...alexandria, latitude: 21.3069, longitude: -157.8583, timezone: 'Pacific/Honolulu', method: 'NorthAmerica' }
    const now = at('2026-07-01T20:00:00Z') // 10:00 in Honolulu on July 1, already July 2 in Kiritimati
    const window = calculateWindow(now, honolulu)
    expect(window.today.date).toBe('2026-07-01')
    for (const name of PRAYER_NAMES) {
      expect(zonedDateKey(window.today.times[name]!, 'Pacific/Honolulu')).toBe('2026-07-01')
    }
  })

  it('handles the start of daylight saving time (New York, 8 March 2026)', () => {
    const nyc: PrayerConfig = { ...alexandria, latitude: 40.7128, longitude: -74.006, timezone: 'America/New_York', method: 'NorthAmerica' }
    const before = calculateDay('2026-03-07', nyc)
    const after = calculateDay('2026-03-08', nyc)
    // Solar noon barely moves between days, so local Dhuhr jumps by one hour.
    expect(zonedParts(before.times.dhuhr!, nyc.timezone).hour).toBe(12)
    expect(zonedParts(after.times.dhuhr!, nyc.timezone).hour).toBe(13)
    const deltaMinutes = (after.times.dhuhr! - before.times.dhuhr!) / 60_000
    expect(Math.abs(deltaMinutes - 24 * 60)).toBeLessThan(2)
    for (const name of PRAYER_NAMES) expect(zonedDateKey(after.times[name]!, nyc.timezone)).toBe('2026-03-08')
  })

  it('handles the end of daylight saving time in Egypt (30 October 2026)', () => {
    const before = calculateDay('2026-10-29', alexandria)
    const after = calculateDay('2026-10-30', alexandria)
    const hourOf = (ms: number): number => zonedParts(ms, 'Africa/Cairo').hour
    expect(hourOf(after.times.dhuhr!)).toBe(hourOf(before.times.dhuhr!) - 1)
  })
})

describe('unavailable times', () => {
  it('reports times as unavailable instead of inventing them (Tromsø, midsummer)', () => {
    const tromso: PrayerConfig = { ...alexandria, latitude: 69.6492, longitude: 18.9553, timezone: 'Europe/Oslo', method: 'MuslimWorldLeague' }
    const day = calculateDay('2026-06-21', tromso)
    expect(isDayFullyAvailable(day)).toBe(false)
    for (const name of PRAYER_NAMES) {
      const value = day.times[name]
      expect(value === null || Number.isFinite(value)).toBe(true)
    }
  })
})

describe('next prayer selection', () => {
  const window = calculateWindow(at('2026-03-21T10:00:00Z'), alexandria)
  const { today, tomorrow, yesterday } = window

  it('selects the first prayer after now', () => {
    const now = today.times.dhuhr! + 60_000
    expect(findNextPrayer(window, now)).toMatchObject({ name: 'asr', date: '2026-03-21' })
    expect(findCurrentPrayer(window, now)).toMatchObject({ name: 'dhuhr', date: '2026-03-21' })
  })

  it('treats a prayer as next until its exact time, then current', () => {
    const asr = today.times.asr!
    expect(findNextPrayer(window, asr - 1)?.name).toBe('asr')
    expect(findNextPrayer(window, asr)?.name).toBe('maghrib')
    expect(findCurrentPrayer(window, asr)?.name).toBe('asr')
  })

  it("rolls over to tomorrow's Fajr when no prayers remain today", () => {
    const now = today.times.isha! + 60_000
    expect(findNextPrayer(window, now)).toMatchObject({ name: 'fajr', date: tomorrow.date, at: tomorrow.times.fajr })
  })

  it("treats yesterday's Isha as current between midnight and Fajr", () => {
    const now = today.times.fajr! - 60 * 60_000
    expect(findCurrentPrayer(window, now)).toMatchObject({ name: 'isha', date: yesterday.date })
    expect(findNextPrayer(window, now)).toMatchObject({ name: 'fajr', date: today.date })
  })

  it('marks statuses for the daily schedule', () => {
    const now = today.times.dhuhr! + 60_000
    expect(dayStatuses(today, window, now)).toEqual({
      fajr: 'passed',
      dhuhr: 'current',
      asr: 'next',
      maghrib: 'upcoming',
      isha: 'upcoming'
    })
  })

  it('updates the window at midnight in the configured timezone', () => {
    const beforeMidnight = calculateWindow(at('2026-03-21T21:59:00Z'), alexandria) // 23:59 Cairo
    const afterMidnight = calculateWindow(at('2026-03-21T22:01:00Z'), alexandria) // 00:01 Cairo
    expect(beforeMidnight.today.date).toBe('2026-03-21')
    expect(afterMidnight.today.date).toBe('2026-03-22')
    expect(afterMidnight.yesterday.times.isha).toBe(beforeMidnight.today.times.isha)
  })
})
