import { addDaysToKey } from '../time/dates'

export interface HydrationEntry {
  id: number
  amountMl: number
  recordedAt: number
  /** Local calendar date (system timezone) when the entry was recorded. */
  localDate: string
}

export interface DailyTotal {
  date: string
  totalMl: number
}

export interface HydrationProgress {
  goalMl: number
  totalMl: number
  remainingMl: number
  /** Percentage of the goal, 0..100, rounded to one decimal place. Capped at 100. */
  percent: number
  goalReached: boolean
}

export function totalForDate(entries: readonly HydrationEntry[], date: string): number {
  return entries.reduce((sum, e) => (e.localDate === date ? sum + e.amountMl : sum), 0)
}

export function computeProgress(totalMl: number, goalMl: number): HydrationProgress {
  const raw = goalMl > 0 ? (totalMl / goalMl) * 100 : 0
  return {
    goalMl,
    totalMl,
    remainingMl: Math.max(0, goalMl - totalMl),
    percent: Math.min(100, Math.round(raw * 10) / 10),
    goalReached: totalMl >= goalMl
  }
}

/**
 * Daily totals for the `days` days ending at `todayKey` (oldest first), including
 * days with no entries.
 */
export function fillDailyTotals(totals: readonly DailyTotal[], todayKey: string, days: number): DailyTotal[] {
  const byDate = new Map(totals.map((t) => [t.date, t.totalMl]))
  const result: DailyTotal[] = []
  for (let offset = days - 1; offset >= 0; offset--) {
    const date = addDaysToKey(todayKey, -offset)
    result.push({ date, totalMl: byDate.get(date) ?? 0 })
  }
  return result
}

export function isValidIntakeAmount(amountMl: number): boolean {
  return Number.isInteger(amountMl) && amountMl > 0 && amountMl <= 5000
}
