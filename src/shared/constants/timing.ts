const MINUTE = 60_000

/** Events older than this when the app wakes are treated as missed, not shown. */
export const MISSED_EVENT_GRACE_MS = 2 * MINUTE

/** The scheduler never sleeps longer than this, so clock and date changes are noticed. */
export const SCHEDULER_MAX_SLEEP_MS = MINUTE

/** Handled-event log entries older than this are pruned. */
export const NOTIFICATION_LOG_RETENTION_MS = 7 * 24 * 60 * MINUTE

/** How many days of hydration history to show. */
export const HYDRATION_HISTORY_DAYS = 7
