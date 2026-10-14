import { describe, expect, it } from 'vitest'
import { isWithinQuietHours, quietHoursEndAfter } from './quietHours'

const at = (h: number, m = 0, day = 14): number => new Date(2026, 9, day, h, m).getTime()

describe('quiet hours', () => {
  const overnight = { enabled: true, start: '22:00', end: '08:00' }
  const daytime = { enabled: true, start: '13:00', end: '14:30' }

  it('handles windows that wrap past midnight', () => {
    expect(isWithinQuietHours(at(23), overnight)).toBe(true)
    expect(isWithinQuietHours(at(3), overnight)).toBe(true)
    expect(isWithinQuietHours(at(8), overnight)).toBe(false)
    expect(isWithinQuietHours(at(21, 59), overnight)).toBe(false)
    expect(isWithinQuietHours(at(22), overnight)).toBe(true)
  })

  it('handles same-day windows', () => {
    expect(isWithinQuietHours(at(13, 30), daytime)).toBe(true)
    expect(isWithinQuietHours(at(14, 30), daytime)).toBe(false)
  })

  it('is inactive when disabled or empty', () => {
    expect(isWithinQuietHours(at(23), { ...overnight, enabled: false })).toBe(false)
    expect(isWithinQuietHours(at(23), { enabled: true, start: '10:00', end: '10:00' })).toBe(false)
  })

  it('finds the end of the current quiet window', () => {
    expect(quietHoursEndAfter(at(23), overnight)).toBe(at(8, 0, 15))
    expect(quietHoursEndAfter(at(3), overnight)).toBe(at(8))
    expect(quietHoursEndAfter(at(12), overnight)).toBe(at(12))
  })
})
