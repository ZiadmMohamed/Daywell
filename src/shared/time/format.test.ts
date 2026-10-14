import { describe, expect, it } from 'vitest'
import { formatClock, formatCountdown, formatLongDate, formatTimeOfDay, getClockParts } from './format'

// vitest pins TZ=Africa/Cairo; local Date constructors are in that zone.
describe('clock formatting', () => {
  const afternoon = new Date(2026, 9, 14, 15, 7, 9)
  const midnight = new Date(2026, 9, 14, 0, 5, 0)
  const noon = new Date(2026, 9, 14, 12, 0, 0)

  it('formats 24-hour time with zero padding', () => {
    expect(getClockParts(afternoon, '24h')).toEqual({ hours: '15', minutes: '07', seconds: '09', period: null })
    expect(formatClock(midnight, '24h', false)).toBe('00:05')
  })

  it('formats 12-hour time with AM/PM and 12 for midnight and noon', () => {
    expect(getClockParts(afternoon, '12h')).toEqual({ hours: '3', minutes: '07', seconds: '09', period: 'PM' })
    expect(formatClock(midnight, '12h', false)).toBe('12:05 AM')
    expect(formatClock(noon, '12h', false)).toBe('12:00 PM')
  })

  it('shows or hides seconds', () => {
    expect(formatClock(afternoon, '24h', true)).toBe('15:07:09')
    expect(formatClock(afternoon, '12h', true)).toBe('3:07:09 PM')
  })

  it('formats the date with the day of the week', () => {
    expect(formatLongDate(afternoon, 'en')).toBe('Wednesday, October 14, 2026')
    expect(formatLongDate(afternoon, 'ar')).toContain('الأربعاء')
  })

  it('formats a time of day in an explicit timezone', () => {
    const instant = Date.UTC(2026, 9, 14, 12, 30)
    expect(formatTimeOfDay(instant, '24h', 'Asia/Tokyo')).toBe('21:30')
    expect(formatTimeOfDay(instant, '12h', 'America/New_York')).toBe('8:30 AM')
  })
})

describe('countdown formatting', () => {
  it('rounds up partial seconds so the end is exact', () => {
    expect(formatCountdown(25 * 60_000)).toBe('25:00')
    expect(formatCountdown(59_001)).toBe('01:00')
    expect(formatCountdown(1)).toBe('00:01')
    expect(formatCountdown(0)).toBe('00:00')
    expect(formatCountdown(-500)).toBe('00:00')
  })

  it('includes hours when needed', () => {
    expect(formatCountdown((1 * 3600 + 42 * 60 + 18) * 1000)).toBe('1:42:18')
  })
})
