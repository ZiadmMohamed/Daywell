import { MISSED_EVENT_GRACE_MS, SCHEDULER_MAX_SLEEP_MS } from '@shared/constants/timing'
import { resolveDue, type EventSource, type ScheduledEvent } from '@shared/scheduling/events'
import type { NotificationOutcome } from '../database/repositories'

/** A feature that contributes timed events. Plans are recomputed from state on every wake. */
export interface SchedulerSource {
  readonly name: EventSource
  plan(now: number): ScheduledEvent[]
  /** Called once per event after it is handled. `delivered` is false for missed events. */
  onEvent?(event: ScheduledEvent, now: number, delivered: boolean): void
}

export interface SchedulerDeps {
  now(): number
  setTimer(callback: () => void, ms: number): unknown
  clearTimer(handle: unknown): void
  log: {
    has(eventId: string): boolean
    record(eventId: string, scheduledAt: number, outcome: NotificationOutcome, now: number): boolean
    updateOutcome(eventId: string, outcome: NotificationOutcome): void
  }
  /**
   * Handles a due event: plays any sound and, when `event.notify` is set, shows
   * its notification. Returns false if the notification could not be displayed.
   */
  deliver(event: ScheduledEvent): boolean
  /** Runs at the start of every wake-up, before planning (date and timezone checks). */
  onTick?(now: number): void
  onError?(error: unknown): void
}

const MAX_PASSES = 5

/**
 * The application's only timer loop. It sleeps until the earliest planned
 * event (never longer than SCHEDULER_MAX_SLEEP_MS), then asks every source for
 * its current plan, handles due events exactly once via the persistent log,
 * and re-arms. Sources never run their own timers.
 */
export class Scheduler {
  private readonly sources = new Map<EventSource, SchedulerSource>()
  private timer: unknown = null
  private running = false
  private rerun = false
  private stopped = true

  constructor(private readonly deps: SchedulerDeps) {}

  register(source: SchedulerSource): void {
    this.sources.set(source.name, source)
  }

  start(): void {
    this.stopped = false
    this.wake()
  }

  stop(): void {
    this.stopped = true
    if (this.timer !== null) this.deps.clearTimer(this.timer)
    this.timer = null
  }

  /** Re-plans immediately: after settings changes, user actions, resume from sleep, etc. */
  wake(): void {
    if (this.stopped) return
    if (this.running) {
      this.rerun = true
      return
    }
    this.running = true
    try {
      let nextAt: number | null = null
      let passes = 0
      do {
        this.rerun = false
        nextAt = this.pass()
        passes++
      } while (this.rerun && passes < MAX_PASSES)
      this.arm(nextAt)
    } catch (error) {
      this.deps.onError?.(error)
      this.arm(null)
    } finally {
      this.running = false
    }
  }

  /** One planning pass. Returns the next wake-up time, if any. */
  private pass(): number | null {
    const now = this.deps.now()
    this.deps.onTick?.(now)
    const events: ScheduledEvent[] = []
    for (const source of this.sources.values()) {
      try {
        events.push(...source.plan(now))
      } catch (error) {
        this.deps.onError?.(error)
      }
    }
    const { deliver, missed, nextAt } = resolveDue(events, now, (id) => this.deps.log.has(id), MISSED_EVENT_GRACE_MS)

    for (const event of missed) {
      if (this.deps.log.record(event.id, event.at, 'missed', now)) this.notifySource(event, now, false)
    }
    for (const event of deliver) {
      // Record first: even if displaying throws, the event can never repeat.
      if (!this.deps.log.record(event.id, event.at, event.notify ? 'shown' : 'silent', now)) continue
      let shown = false
      try {
        shown = this.deps.deliver(event)
      } catch (error) {
        this.deps.onError?.(error)
      }
      if (event.notify && !shown) this.deps.log.updateOutcome(event.id, 'failed')
      this.notifySource(event, now, true)
    }
    // Handling events can change plans (e.g. the next focus phase), so plan again.
    if (deliver.length > 0 || missed.length > 0) this.rerun = true
    return nextAt
  }

  private notifySource(event: ScheduledEvent, now: number, delivered: boolean): void {
    try {
      this.sources.get(event.source)?.onEvent?.(event, now, delivered)
    } catch (error) {
      this.deps.onError?.(error)
    }
  }

  private arm(nextAt: number | null): void {
    if (this.timer !== null) this.deps.clearTimer(this.timer)
    this.timer = null
    if (this.stopped) return
    const now = this.deps.now()
    const delay = nextAt === null ? SCHEDULER_MAX_SLEEP_MS : Math.min(Math.max(nextAt - now, 0), SCHEDULER_MAX_SLEEP_MS)
    this.timer = this.deps.setTimer(() => {
      this.timer = null
      this.wake()
    }, delay)
  }
}
