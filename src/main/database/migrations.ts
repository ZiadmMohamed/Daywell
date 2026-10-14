import type { DatabaseSync } from 'node:sqlite'

export interface Migration {
  version: number
  description: string
  up(db: DatabaseSync): void
}

/**
 * Ordered schema migrations. Never edit a released migration; append a new one.
 * Timestamps are stored as INTEGER epoch milliseconds (UTC). Local calendar
 * dates are stored explicitly as TEXT 'YYYY-MM-DD' because they depend on the
 * timezone in effect when the record was created.
 */
export const MIGRATIONS: readonly Migration[] = [
  {
    version: 1,
    description: 'initial schema',
    up(db) {
      db.exec(`
        CREATE TABLE settings (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE app_state (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL,
          updated_at INTEGER NOT NULL
        );

        CREATE TABLE focus_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          session_type TEXT NOT NULL CHECK (session_type IN ('work', 'shortBreak', 'longBreak')),
          started_at INTEGER NOT NULL,
          ended_at INTEGER NOT NULL,
          duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0),
          completed INTEGER NOT NULL CHECK (completed IN (0, 1)),
          local_date TEXT NOT NULL,
          created_at INTEGER NOT NULL
        );
        CREATE INDEX idx_focus_sessions_local_date ON focus_sessions (local_date);

        CREATE TABLE hydration_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          amount_ml INTEGER NOT NULL CHECK (amount_ml > 0 AND amount_ml <= 5000),
          recorded_at INTEGER NOT NULL,
          local_date TEXT NOT NULL
        );
        CREATE INDEX idx_hydration_entries_local_date ON hydration_entries (local_date);

        CREATE TABLE notification_log (
          event_id TEXT PRIMARY KEY,
          scheduled_at INTEGER NOT NULL,
          handled_at INTEGER NOT NULL,
          outcome TEXT NOT NULL CHECK (outcome IN ('shown', 'silent', 'missed', 'failed'))
        );
        CREATE INDEX idx_notification_log_handled_at ON notification_log (handled_at);
      `)
    }
  }
]

export const LATEST_SCHEMA_VERSION = MIGRATIONS[MIGRATIONS.length - 1]?.version ?? 0
