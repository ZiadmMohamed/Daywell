import { existsSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { DatabaseSync } from 'node:sqlite'
import { DEFAULT_SETTINGS } from '@shared/validation/settings'
import { initialState, start } from '@shared/pomodoro/machine'
import { DatabaseOpenError, migrate, openDatabase } from './connection'
import { MIGRATIONS, type Migration } from './migrations'
import { createRepositories } from './repositories'
import { SettingsService } from '../services/settingsService'
import { PomodoroService } from '../services/pomodoroService'
import { HydrationService } from '../services/hydrationService'

const dirs: string[] = []
function tempDb(): string {
  const dir = mkdtempSync(join(tmpdir(), 'daywell-test-'))
  dirs.push(dir)
  return join(dir, 'daywell.db')
}
afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true })
})

describe('migrations', () => {
  it('creates the schema on a new database', () => {
    const db = openDatabase(tempDb())
    const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type = 'table'").all() as { name: string }[]).map((r) => r.name)
    expect(tables).toEqual(expect.arrayContaining(['settings', 'app_state', 'focus_sessions', 'hydration_entries', 'notification_log']))
    db.close()
  })

  it('backs up and keeps data intact when a migration fails', () => {
    const path = tempDb()
    const db = openDatabase(path)
    createRepositories(db).hydration.insert(250, Date.now(), '2026-10-14')
    const broken: Migration = {
      version: MIGRATIONS.length + 1,
      description: 'broken',
      up: (d) => {
        d.exec('DELETE FROM hydration_entries')
        d.exec('THIS IS NOT SQL')
      }
    }
    let error: unknown
    try {
      migrate(db, path, [...MIGRATIONS, broken])
    } catch (e) {
      error = e
    }
    expect(error).toBeInstanceOf(DatabaseOpenError)
    expect((error as DatabaseOpenError).backupPath).toBe(`${path}.bak-v${MIGRATIONS.length}`)
    expect(existsSync(`${path}.bak-v${MIGRATIONS.length}`)).toBe(true)
    // The failed migration's partial changes were rolled back.
    expect(createRepositories(db).hydration.listForDate('2026-10-14')).toHaveLength(1)
    db.close()
  })

  it('refuses to open data from a newer schema rather than damaging it', () => {
    const db = new DatabaseSync(':memory:')
    db.exec('PRAGMA user_version = 999')
    expect(() => migrate(db, ':memory:')).toThrow(DatabaseOpenError)
  })
})

describe('persistence across restarts', () => {
  it('restores settings, water intake and a running focus session', () => {
    const path = tempDb()
    const T0 = Date.now()

    let db = openDatabase(path)
    let repos = createRepositories(db)
    const settings = new SettingsService(repos.settings)
    settings.update('focus', { workMinutes: 40 })
    settings.update('prayer', { method: 'UmmAlQura' })
    const hydration = new HydrationService(repos.state, repos.hydration, () => settings.get('hydration'), () => {}, T0)
    hydration.add(250, T0)
    hydration.add(500, T0 + 1000)
    const pomodoro = new PomodoroService(repos.state, repos.focus, () => settings.get('focus'), () => {})
    pomodoro.command('start', T0)
    db.close()

    db = openDatabase(path)
    repos = createRepositories(db)
    const restoredSettings = new SettingsService(repos.settings)
    expect(restoredSettings.get('focus').workMinutes).toBe(40)
    expect(restoredSettings.get('prayer').method).toBe('UmmAlQura')
    const restoredHydration = new HydrationService(repos.state, repos.hydration, () => restoredSettings.get('hydration'), () => {}, T0)
    expect(restoredHydration.slice(T0 + 2000).totalMl).toBe(750)
    const restoredPomodoro = new PomodoroService(repos.state, repos.focus, () => restoredSettings.get('focus'), () => {})
    expect(restoredPomodoro.current).toMatchObject({ status: 'running', endsAt: T0 + 40 * 60_000 })
    db.close()
  })

  it('records a session that finished while the app was closed', () => {
    const path = tempDb()
    const T0 = Date.UTC(2026, 9, 14, 9, 0)
    const db = openDatabase(path)
    const repos = createRepositories(db)
    repos.state.set('pomodoro', start(initialState(DEFAULT_SETTINGS.focus), T0))
    const pomodoro = new PomodoroService(repos.state, repos.focus, () => DEFAULT_SETTINGS.focus, () => {})
    const [event] = pomodoro.plan()
    expect(event).toMatchObject({ at: T0 + 25 * 60_000, missedPolicy: 'deliverLate' })
    pomodoro.onEvent(event!, T0 + 90 * 60_000)
    const today = pomodoro.slice(T0)
    expect(today.today.completedWork).toBe(1)
    expect(today.today.focusSeconds).toBe(25 * 60)
    expect(pomodoro.current).toMatchObject({ phase: 'shortBreak', status: 'idle' })
    db.close()
  })

  it('ignores corrupted stored values without losing other settings', () => {
    const db = openDatabase(tempDb())
    const repos = createRepositories(db)
    db.prepare("INSERT INTO settings (key, value, updated_at) VALUES ('hydration', '{not json', 0)").run()
    repos.settings.set('general', { ...DEFAULT_SETTINGS.general, timeFormat: '24h' })
    const settings = new SettingsService(repos.settings)
    expect(settings.get('hydration')).toEqual(DEFAULT_SETTINGS.hydration)
    expect(settings.get('general').timeFormat).toBe('24h')
    db.close()
  })
})
