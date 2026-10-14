import type { QuietHours } from '../validation/settings'

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function minutesOfLocalDay(ms: number): number {
  const d = new Date(ms)
  return d.getHours() * 60 + d.getMinutes()
}

/**
 * Whether `ms` (system local time) is inside the quiet window. Windows may wrap
 * past midnight (e.g. 22:00 → 08:00). A window with start === end is empty.
 */
export function isWithinQuietHours(ms: number, quiet: QuietHours): boolean {
  if (!quiet.enabled) return false
  const start = toMinutes(quiet.start)
  const end = toMinutes(quiet.end)
  if (start === end) return false
  const now = minutesOfLocalDay(ms)
  return start < end ? now >= start && now < end : now >= start || now < end
}

/** The first instant at or after `ms` that is outside the quiet window. */
export function quietHoursEndAfter(ms: number, quiet: QuietHours): number {
  if (!isWithinQuietHours(ms, quiet)) return ms
  const end = toMinutes(quiet.end)
  const candidate = new Date(ms)
  candidate.setHours(Math.floor(end / 60), end % 60, 0, 0)
  if (candidate.getTime() <= ms) candidate.setDate(candidate.getDate() + 1)
  return candidate.getTime()
}
