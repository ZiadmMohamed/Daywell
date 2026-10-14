import { existsSync } from 'node:fs'
import { DatabaseSync } from 'node:sqlite'
import { LATEST_SCHEMA_VERSION, MIGRATIONS, type Migration } from './migrations'

export class DatabaseOpenError extends Error {
  constructor(
    message: string,
    readonly backupPath: string | null,
    options?: { cause?: unknown }
  ) {
    super(message, options)
    this.name = 'DatabaseOpenError'
  }
}

function userVersion(db: DatabaseSync): number {
  const row = db.prepare('PRAGMA user_version').get() as { user_version: number } | undefined
  return row?.user_version ?? 0
}

export function transaction<T>(db: DatabaseSync, work: () => T): T {
  db.exec('BEGIN IMMEDIATE')
  try {
    const result = work()
    db.exec('COMMIT')
    return result
  } catch (error) {
    db.exec('ROLLBACK')
    throw error
  }
}

/**
 * Applies pending migrations. Before upgrading an existing database a complete
 * copy is written next to it, and each migration runs in its own transaction,
 * so a failure leaves the original data untouched.
 */
export function migrate(db: DatabaseSync, path: string, migrations: readonly Migration[] = MIGRATIONS): void {
  const current = userVersion(db)
  const latest = migrations[migrations.length - 1]?.version ?? 0
  if (current > latest) {
    throw new DatabaseOpenError(
      `The data file was created by a newer version of Daywell (schema ${current}, this build supports ${latest}).`,
      null
    )
  }
  const pending = migrations.filter((m) => m.version > current)
  if (pending.length === 0) return

  let backupPath: string | null = null
  if (current > 0 && path !== ':memory:') {
    backupPath = `${path}.bak-v${current}`
    if (!existsSync(backupPath)) db.exec(`VACUUM INTO '${backupPath.replace(/'/g, "''")}'`)
  }

  for (const migration of pending) {
    try {
      transaction(db, () => {
        migration.up(db)
        db.exec(`PRAGMA user_version = ${migration.version}`)
      })
    } catch (cause) {
      throw new DatabaseOpenError(`Migration ${migration.version} (${migration.description}) failed.`, backupPath, {
        cause
      })
    }
  }
}

export function openDatabase(path: string): DatabaseSync {
  let db: DatabaseSync
  try {
    db = new DatabaseSync(path)
    db.exec('PRAGMA journal_mode = WAL; PRAGMA synchronous = NORMAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 2000;')
  } catch (cause) {
    throw new DatabaseOpenError('The data file could not be opened.', null, { cause })
  }
  try {
    migrate(db, path)
  } catch (error) {
    db.close()
    throw error
  }
  return db
}

export { LATEST_SCHEMA_VERSION }
