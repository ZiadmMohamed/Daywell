/**
 * Calendar-date helpers. A "date key" is a local calendar date formatted as
 * YYYY-MM-DD. Keys are either in the system timezone (hydration, focus) or in an
 * explicit IANA timezone (prayer times).
 */

export interface DateParts {
  year: number
  month: number
  day: number
  hour: number
  minute: number
  second: number
}

const pad2 = (n: number): string => String(n).padStart(2, '0')

export function toDateKey(year: number, month: number, day: number): string {
  return `${year}-${pad2(month)}-${pad2(day)}`
}

export function parseDateKey(key: string): { year: number; month: number; day: number } {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) throw new Error(`Invalid date key: ${key}`)
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) }
}

/** Calendar date of `ms` in the system's local timezone. */
export function localDateKey(ms: number): string {
  const d = new Date(ms)
  return toDateKey(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

const zonedFormatters = new Map<string, Intl.DateTimeFormat>()

function zonedFormatter(timeZone: string): Intl.DateTimeFormat {
  let formatter = zonedFormatters.get(timeZone)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    })
    zonedFormatters.set(timeZone, formatter)
  }
  return formatter
}

/** Wall-clock components of `ms` in an explicit IANA timezone. */
export function zonedParts(ms: number, timeZone: string): DateParts {
  const parts: Partial<Record<Intl.DateTimeFormatPartTypes, number>> = {}
  for (const part of zonedFormatter(timeZone).formatToParts(new Date(ms))) {
    if (part.type !== 'literal') parts[part.type] = Number(part.value)
  }
  return {
    year: parts.year ?? 1970,
    month: parts.month ?? 1,
    day: parts.day ?? 1,
    hour: (parts.hour ?? 0) % 24,
    minute: parts.minute ?? 0,
    second: parts.second ?? 0
  }
}

export function zonedDateKey(ms: number, timeZone: string): string {
  const p = zonedParts(ms, timeZone)
  return toDateKey(p.year, p.month, p.day)
}

export function addDaysToKey(key: string, days: number): string {
  const { year, month, day } = parseDateKey(key)
  const d = new Date(Date.UTC(year, month - 1, day + days))
  return toDateKey(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
}

/** Start of the local (system timezone) day containing `ms`. */
export function startOfLocalDay(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}
