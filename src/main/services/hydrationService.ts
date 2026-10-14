import { z } from 'zod'
import { HYDRATION_HISTORY_DAYS } from '@shared/constants/timing'
import { nextHydrationReminder } from '@shared/hydration/reminders'
import { computeProgress, fillDailyTotals, isValidIntakeAmount } from '@shared/hydration/totals'
import type { ScheduledEvent } from '@shared/scheduling/events'
import { addDaysToKey, localDateKey, startOfLocalDay } from '@shared/time/dates'
import type { HydrationSlice } from '@shared/types/state'
import type { HydrationSettings } from '@shared/validation/settings'
import type { HydrationRepository, KeyValueRepository } from '../database/repositories'
import type { SchedulerSource } from '../notifications/scheduler'

const STATE_KEY = 'hydration'

const reminderStateSchema = z.object({
  lastReminderAt: z.number().nullable(),
  pausedUntil: z.number().nullable()
})
type ReminderState = z.infer<typeof reminderStateSchema>

export class HydrationService implements SchedulerSource {
  readonly name = 'hydration' as const
  private reminder: ReminderState
  /** Reminders count from here when there is no more recent drink or reminder. */
  private armedAt: number

  constructor(
    private readonly stateRepo: KeyValueRepository,
    private readonly entries: HydrationRepository,
    private readonly settings: () => HydrationSettings,
    private readonly onChange: () => void,
    now: number
  ) {
    const parsed = reminderStateSchema.safeParse(stateRepo.get(STATE_KEY))
    this.reminder = parsed.success ? parsed.data : { lastReminderAt: null, pausedUntil: null }
    this.armedAt = now
  }

  add(amountMl: number, now: number): void {
    if (!isValidIntakeAmount(amountMl)) throw new Error('Invalid amount')
    this.entries.insert(amountMl, now, localDateKey(now))
    this.onChange()
  }

  remove(id: number): void {
    if (this.entries.delete(id)) this.onChange()
  }

  pause(pause: number | 'tomorrow' | null, now: number): void {
    let pausedUntil: number | null = null
    if (pause === 'tomorrow') {
      const tomorrow = new Date(startOfLocalDay(now))
      tomorrow.setDate(tomorrow.getDate() + 1)
      pausedUntil = tomorrow.getTime()
    } else if (typeof pause === 'number') {
      pausedUntil = now + pause * 60_000
    }
    this.saveReminder({ ...this.reminder, pausedUntil })
  }

  onSettingsChanged(previous: HydrationSettings, now: number): void {
    // Re-enabling reminders starts a fresh interval instead of firing immediately.
    if (!previous.remindersEnabled && this.settings().remindersEnabled) this.armedAt = now
    this.onChange()
  }

  nextReminderAt(now: number): number | null {
    const settings = this.settings()
    const today = localDateKey(now)
    const total = this.totalFor(today)
    const tomorrow = new Date(startOfLocalDay(now))
    tomorrow.setDate(tomorrow.getDate() + 1)
    const pausedUntil = this.reminder.pausedUntil !== null && this.reminder.pausedUntil > now ? this.reminder.pausedUntil : null
    return nextHydrationReminder({
      enabled: settings.remindersEnabled,
      intervalMinutes: settings.reminderIntervalMinutes,
      quietHours: settings.quietHours,
      lastIntakeAt: this.entries.latestRecordedAt(),
      lastReminderAt: this.reminder.lastReminderAt,
      armedAt: this.armedAt,
      pausedUntil,
      goalReached: computeProgress(total, settings.dailyGoalMl).goalReached,
      nextDayStart: tomorrow.getTime()
    })
  }

  plan(now: number): ScheduledEvent[] {
    const at = this.nextReminderAt(now)
    if (at === null) return []
    return [
      {
        id: `hydration:${at}`,
        at,
        source: 'hydration',
        missedPolicy: 'skip',
        notify: true,
        payload: { kind: 'hydration-reminder' }
      }
    ]
  }

  onEvent(_event: ScheduledEvent, now: number): void {
    // Whether shown or missed (e.g. during sleep), the next reminder counts from now.
    this.saveReminder({ ...this.reminder, lastReminderAt: now })
  }

  totalFor(localDate: string): number {
    return this.entries.listForDate(localDate).reduce((sum, e) => sum + e.amountMl, 0)
  }

  slice(now: number): HydrationSlice {
    const date = localDateKey(now)
    const entries = this.entries.listForDate(date)
    const totals = this.entries.totalsSince(addDaysToKey(date, -(HYDRATION_HISTORY_DAYS - 1)))
    const pausedUntil = this.reminder.pausedUntil !== null && this.reminder.pausedUntil > now ? this.reminder.pausedUntil : null
    return {
      date,
      totalMl: entries.reduce((sum, e) => sum + e.amountMl, 0),
      entries,
      history: fillDailyTotals(totals, date, HYDRATION_HISTORY_DAYS),
      pausedUntil,
      nextReminderAt: this.nextReminderAt(now)
    }
  }

  private saveReminder(next: ReminderState): void {
    this.reminder = next
    this.stateRepo.set(STATE_KEY, next)
    this.onChange()
  }
}
