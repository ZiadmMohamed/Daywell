export type TimeFormat = '12h' | '24h'

export interface ClockParts {
  hours: string
  minutes: string
  seconds: string
  /** 'AM' / 'PM' for 12-hour format, otherwise null. */
  period: 'AM' | 'PM' | null
}

const pad2 = (n: number): string => String(n).padStart(2, '0')

/** Splits a time into display parts. 24-hour hours are zero padded; 12-hour hours are not. */
export function getClockParts(date: Date, format: TimeFormat): ClockParts {
  const h = date.getHours()
  const minutes = pad2(date.getMinutes())
  const seconds = pad2(date.getSeconds())
  if (format === '24h') return { hours: pad2(h), minutes, seconds, period: null }
  const h12 = h % 12 === 0 ? 12 : h % 12
  return { hours: String(h12), minutes, seconds, period: h < 12 ? 'AM' : 'PM' }
}

export function formatClock(date: Date, format: TimeFormat, showSeconds: boolean): string {
  const p = getClockParts(date, format)
  const time = showSeconds ? `${p.hours}:${p.minutes}:${p.seconds}` : `${p.hours}:${p.minutes}`
  return p.period ? `${time} ${p.period}` : time
}

/** Locale tag for Intl date formatting; digits stay Latin for consistency with the clock. */
export function intlLocale(language: 'en' | 'ar'): string {
  return language === 'ar' ? 'ar-EG-u-nu-latn' : 'en-US'
}

export function formatLongDate(date: Date, language: 'en' | 'ar', timeZone?: string): string {
  return new Intl.DateTimeFormat(intlLocale(language), {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    ...(timeZone ? { timeZone } : {})
  }).format(date)
}

export function formatShortDate(date: Date, language: 'en' | 'ar'): string {
  return new Intl.DateTimeFormat(intlLocale(language), { weekday: 'short', day: 'numeric', month: 'short' }).format(date)
}

/** Time of day for schedules and lists, optionally in an explicit timezone. */
export function formatTimeOfDay(ms: number, format: TimeFormat, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-US', {
    hour: format === '24h' ? '2-digit' : 'numeric',
    minute: '2-digit',
    hourCycle: format === '24h' ? 'h23' : 'h12',
    ...(timeZone ? { timeZone } : {})
  }).format(new Date(ms))
}

/**
 * Countdown text. Seconds are rounded up so a timer reads 25:00 when it starts
 * and only reaches 0:00 at the actual end.
 */
export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${pad2(m)}:${pad2(s)}`
}

/** "1 h 25 min" style summary for durations. */
export function formatMinutesSummary(totalSeconds: number): { hours: number; minutes: number } {
  const minutes = Math.round(totalSeconds / 60)
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 }
}
