import { calculateWindow, type ScheduleWindow } from '@shared/prayer/calc'
import { findNextPrayer, type PrayerEvent } from '@shared/prayer/next'
import type { ScheduledEvent } from '@shared/scheduling/events'
import { planPrayerEvents } from '@shared/scheduling/prayerEvents'
import { zonedDateKey } from '@shared/time/dates'
import type { PrayerSlice } from '@shared/types/state'
import type { PrayerSettings } from '@shared/validation/settings'
import type { SchedulerSource } from '../notifications/scheduler'

/**
 * Calculates prayer times locally (no network) and keeps a three-day window
 * around today in the configured timezone. The window is recomputed when the
 * configured calendar date or any prayer setting changes.
 */
export class PrayerService implements SchedulerSource {
  readonly name = 'prayer' as const
  private window: ScheduleWindow | null = null
  private computedFor: { date: string; settings: PrayerSettings } | null = null

  constructor(
    private readonly settings: () => PrayerSettings,
    private readonly onChange: () => void
  ) {}

  /** Recomputes if needed. Returns true when the schedule changed. */
  refresh(now: number): boolean {
    const settings = this.settings()
    const date = zonedDateKey(now, settings.timezone)
    if (this.window && this.computedFor?.date === date && this.computedFor.settings === settings) return false
    this.window = calculateWindow(now, settings)
    this.computedFor = { date, settings }
    this.onChange()
    return true
  }

  current(now: number): ScheduleWindow {
    this.refresh(now)
    return this.window as ScheduleWindow
  }

  next(now: number): PrayerEvent | null {
    return findNextPrayer(this.current(now), now)
  }

  plan(now: number): ScheduledEvent[] {
    return planPrayerEvents(this.current(now), this.settings())
  }

  slice(now: number): PrayerSlice {
    return { window: this.current(now) }
  }
}
