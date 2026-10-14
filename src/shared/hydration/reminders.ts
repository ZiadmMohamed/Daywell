import type { QuietHours } from '../validation/settings'
import { quietHoursEndAfter } from '../time/quietHours'

export interface HydrationReminderInput {
  enabled: boolean
  intervalMinutes: number
  quietHours: QuietHours
  /** Most recent intake, or null if none recorded. */
  lastIntakeAt: number | null
  /** Most recent reminder that was shown or skipped. */
  lastReminderAt: number | null
  /** When reminders were (re)armed: app start or a settings change. */
  armedAt: number
  /** Reminders are paused until this instant. */
  pausedUntil: number | null
  /** Today's goal has already been reached. */
  goalReached: boolean
  /** Start of the next local day; reminders resume then once the goal is reached. */
  nextDayStart: number
}

/**
 * When the next hydration reminder is due, or null if none should be scheduled.
 * Reminders count from the latest of: last drink, last reminder, or arming time,
 * are postponed while paused, and never fall inside quiet hours.
 */
export function nextHydrationReminder(input: HydrationReminderInput): number | null {
  if (!input.enabled) return null
  const intervalMs = input.intervalMinutes * 60_000
  const base = Math.max(input.lastIntakeAt ?? 0, input.lastReminderAt ?? 0, input.armedAt)
  let at = base + intervalMs
  if (input.goalReached) at = Math.max(at, input.nextDayStart)
  if (input.pausedUntil !== null) at = Math.max(at, input.pausedUntil)
  return quietHoursEndAfter(at, input.quietHours)
}
