export const PRAYER_NAMES = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'] as const
export type PrayerName = (typeof PRAYER_NAMES)[number]

/** Keys match adhan's CalculationMethod factory names. */
export const CALCULATION_METHODS = [
  'Egyptian',
  'MuslimWorldLeague',
  'UmmAlQura',
  'Karachi',
  'Dubai',
  'Qatar',
  'Kuwait',
  'MoonsightingCommittee',
  'NorthAmerica',
  'Singapore',
  'Turkey',
  'Tehran'
] as const
export type CalculationMethodId = (typeof CALCULATION_METHODS)[number]
