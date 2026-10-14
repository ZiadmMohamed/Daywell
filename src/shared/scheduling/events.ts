import type { PrayerName } from '../constants/prayer'
import type { Phase } from '../pomodoro/machine'

export type EventSource = 'focus' | 'hydration' | 'prayer'

export type EventPayload =
  | { kind: 'focus-end'; phase: Phase; nextPhase: Phase }
  | { kind: 'hydration-reminder' }
  | { kind: 'prayer-at'; prayer: PrayerName; prayerAt: number }
  | { kind: 'prayer-before'; prayer: PrayerName; prayerAt: number; leadMinutes: number }

export interface ScheduledEvent {
  /** Deterministic id: the same real-world event always produces the same id. */
  id: string
  at: number
  source: EventSource
  /**
   * 'skip' drops events noticed later than the grace window (e.g. after sleep);
   * 'deliverLate' shows them once anyway (e.g. a focus session that ended).
   */
  missedPolicy: 'skip' | 'deliverLate'
  /** False when the event must still be processed but the user disabled its notification. */
  notify: boolean
  payload: EventPayload
}

export interface DueResolution {
  deliver: ScheduledEvent[]
  missed: ScheduledEvent[]
  /** Earliest future event, if any. */
  nextAt: number | null
}

/**
 * Splits planned events into those to deliver now, those missed, and the next
 * wake-up time. Already-handled ids are ignored, which is what prevents
 * duplicate notifications across re-plans, restarts and resumes.
 */
export function resolveDue(
  events: readonly ScheduledEvent[],
  now: number,
  isHandled: (id: string) => boolean,
  graceMs: number
): DueResolution {
  const deliver: ScheduledEvent[] = []
  const missed: ScheduledEvent[] = []
  let nextAt: number | null = null
  const seen = new Set<string>()
  for (const event of [...events].sort((a, b) => a.at - b.at)) {
    if (seen.has(event.id) || isHandled(event.id)) continue
    seen.add(event.id)
    if (event.at > now) {
      nextAt = nextAt === null ? event.at : Math.min(nextAt, event.at)
    } else if (now - event.at <= graceMs || event.missedPolicy === 'deliverLate') {
      deliver.push(event)
    } else {
      missed.push(event)
    }
  }
  return { deliver, missed, nextAt }
}
