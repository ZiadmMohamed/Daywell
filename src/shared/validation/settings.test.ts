import { describe, expect, it } from 'vitest'
import { applySectionPatch, coerceSection, DEFAULT_SETTINGS } from './settings'

describe('persisted settings', () => {
  it('fills missing sections and fields with defaults', () => {
    expect(coerceSection('focus', undefined)).toEqual(DEFAULT_SETTINGS.focus)
    expect(coerceSection('focus', { workMinutes: 50 })).toEqual({ ...DEFAULT_SETTINGS.focus, workMinutes: 50 })
  })

  it('replaces only the invalid fields of a corrupted section', () => {
    const coerced = coerceSection('hydration', { dailyGoalMl: -3, reminderIntervalMinutes: 30, quickAddMl: 'nope' })
    expect(coerced.dailyGoalMl).toBe(DEFAULT_SETTINGS.hydration.dailyGoalMl)
    expect(coerced.quickAddMl).toEqual(DEFAULT_SETTINGS.hydration.quickAddMl)
    expect(coerced.reminderIntervalMinutes).toBe(30)
  })

  it('drops unknown fields', () => {
    expect(coerceSection('general', { ...DEFAULT_SETTINGS.general, evil: true })).not.toHaveProperty('evil')
  })
})

describe('settings updates', () => {
  it('applies a valid patch', () => {
    const next = applySectionPatch('prayer', DEFAULT_SETTINGS.prayer, { method: 'UmmAlQura', madhab: 'hanafi' })
    expect(next).toMatchObject({ method: 'UmmAlQura', madhab: 'hanafi', timezone: 'Africa/Cairo' })
  })

  it('rejects invalid values and unknown keys', () => {
    expect(() => applySectionPatch('prayer', DEFAULT_SETTINGS.prayer, { method: 'Invented' })).toThrow()
    expect(() => applySectionPatch('prayer', DEFAULT_SETTINGS.prayer, { timezone: 'Mars/Olympus' })).toThrow()
    expect(() => applySectionPatch('prayer', DEFAULT_SETTINGS.prayer, { latitude: 120 })).toThrow()
    expect(() => applySectionPatch('focus', DEFAULT_SETTINGS.focus, { workMinutes: 0 })).toThrow()
    expect(() => applySectionPatch('focus', DEFAULT_SETTINGS.focus, { injected: 1 })).toThrow()
    expect(() => applySectionPatch('clock', DEFAULT_SETTINGS.clock, { backgroundImage: '../../secrets.png' })).toThrow()
    expect(() => applySectionPatch('focus', DEFAULT_SETTINGS.focus, null)).toThrow()
  })
})
