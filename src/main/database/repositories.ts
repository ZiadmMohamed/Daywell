import type { DatabaseSync } from 'node:sqlite'
import type { DailyTotal, HydrationEntry } from '@shared/hydration/totals'
import type { FinishedSession, Phase } from '@shared/pomodoro/machine'
import type { FocusSessionRecord } from '@shared/types/state'

/** JSON values keyed by string, used for both user settings and runtime state. */
export class KeyValueRepository {
  constructor(
    private readonly db: DatabaseSync,
    private readonly table: 'settings' | 'app_state'
  ) {}

  get(key: string): unknown {
    const row = this.db.prepare(`SELECT value FROM ${this.table} WHERE key = ?`).get(key) as { value: string } | undefined
    if (!row) return undefined
    try {
      return JSON.parse(row.value) as unknown
    } catch {
      return undefined
    }
  }

  set(key: string, value: unknown, now = Date.now()): void {
    this.db
      .prepare(
        `INSERT INTO ${this.table} (key, value, updated_at) VALUES (?, ?, ?)
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`
      )
      .run(key, JSON.stringify(value), now)
  }
}

interface FocusRow {
  id: number
  session_type: Phase
  started_at: number
  ended_at: number
  duration_seconds: number
  completed: number
}

export class FocusRepository {
  constructor(private readonly db: DatabaseSync) {}

  insert(session: FinishedSession, localDate: string, now = Date.now()): void {
    this.db
      .prepare(
        `INSERT INTO focus_sessions (session_type, started_at, ended_at, duration_seconds, completed, local_date, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        session.phase,
        session.startedAt,
        session.endedAt,
        Math.round(session.durationMs / 1000),
        session.completed ? 1 : 0,
        localDate,
        now
      )
  }

  listForDate(localDate: string): FocusSessionRecord[] {
    const rows = this.db
      .prepare(
        `SELECT id, session_type, started_at, ended_at, duration_seconds, completed
         FROM focus_sessions WHERE local_date = ? ORDER BY started_at DESC`
      )
      .all(localDate) as unknown as FocusRow[]
    return rows.map((r) => ({
      id: r.id,
      phase: r.session_type,
      startedAt: r.started_at,
      endedAt: r.ended_at,
      durationSeconds: r.duration_seconds,
      completed: r.completed === 1
    }))
  }
}

interface HydrationRow {
  id: number
  amount_ml: number
  recorded_at: number
  local_date: string
}

export class HydrationRepository {
  constructor(private readonly db: DatabaseSync) {}

  insert(amountMl: number, recordedAt: number, localDate: string): number {
    const result = this.db
      .prepare('INSERT INTO hydration_entries (amount_ml, recorded_at, local_date) VALUES (?, ?, ?)')
      .run(amountMl, recordedAt, localDate)
    return Number(result.lastInsertRowid)
  }

  delete(id: number): boolean {
    return this.db.prepare('DELETE FROM hydration_entries WHERE id = ?').run(id).changes > 0
  }

  listForDate(localDate: string): HydrationEntry[] {
    const rows = this.db
      .prepare(
        'SELECT id, amount_ml, recorded_at, local_date FROM hydration_entries WHERE local_date = ? ORDER BY recorded_at DESC'
      )
      .all(localDate) as unknown as HydrationRow[]
    return rows.map((r) => ({ id: r.id, amountMl: r.amount_ml, recordedAt: r.recorded_at, localDate: r.local_date }))
  }

  totalsSince(fromLocalDate: string): DailyTotal[] {
    return (
      this.db
        .prepare(
          `SELECT local_date AS date, SUM(amount_ml) AS totalMl FROM hydration_entries
           WHERE local_date >= ? GROUP BY local_date ORDER BY local_date`
        )
        .all(fromLocalDate) as unknown as { date: string; totalMl: number }[]
    ).map((r) => ({ date: r.date, totalMl: Number(r.totalMl) }))
  }

  latestRecordedAt(): number | null {
    const row = this.db.prepare('SELECT MAX(recorded_at) AS latest FROM hydration_entries').get() as
      | { latest: number | null }
      | undefined
    return row?.latest ?? null
  }
}

export type NotificationOutcome = 'shown' | 'silent' | 'missed' | 'failed'

export class NotificationLogRepository {
  constructor(private readonly db: DatabaseSync) {}

  has(eventId: string): boolean {
    return this.db.prepare('SELECT 1 FROM notification_log WHERE event_id = ?').get(eventId) !== undefined
  }

  /** Records an event as handled. Returns false if it was already handled. */
  record(eventId: string, scheduledAt: number, outcome: NotificationOutcome, now: number): boolean {
    const result = this.db
      .prepare(
        `INSERT INTO notification_log (event_id, scheduled_at, handled_at, outcome) VALUES (?, ?, ?, ?)
         ON CONFLICT(event_id) DO NOTHING`
      )
      .run(eventId, scheduledAt, now, outcome)
    return result.changes > 0
  }

  updateOutcome(eventId: string, outcome: NotificationOutcome): void {
    this.db.prepare('UPDATE notification_log SET outcome = ? WHERE event_id = ?').run(outcome, eventId)
  }

  pruneBefore(cutoff: number): void {
    this.db.prepare('DELETE FROM notification_log WHERE handled_at < ?').run(cutoff)
  }
}

export interface Repositories {
  settings: KeyValueRepository
  state: KeyValueRepository
  focus: FocusRepository
  hydration: HydrationRepository
  notificationLog: NotificationLogRepository
}

export function createRepositories(db: DatabaseSync): Repositories {
  return {
    settings: new KeyValueRepository(db, 'settings'),
    state: new KeyValueRepository(db, 'app_state'),
    focus: new FocusRepository(db),
    hydration: new HydrationRepository(db),
    notificationLog: new NotificationLogRepository(db)
  }
}
