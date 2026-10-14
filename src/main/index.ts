import { join } from 'node:path'
import { app, dialog } from 'electron'
import type { DatabaseSync } from 'node:sqlite'
import { createTranslator } from '@shared/i18n'
import { DatabaseOpenError, openDatabase } from './database/connection'
import { createRepositories } from './database/repositories'
import { handleAssetProtocol, registerAssetScheme } from './app/assets'
import { DaywellApp } from './app/daywell'
import { log } from './app/log'

const APP_ID = 'com.daywell.app'

if (!app.requestSingleInstanceLock()) {
  app.quit()
} else {
  let daywell: DaywellApp | null = null
  let db: DatabaseSync | null = null

  registerAssetScheme()
  // Toasts on Windows are attributed to this id; in development use the Electron binary.
  app.setAppUserModelId(app.isPackaged ? APP_ID : process.execPath)

  app.on('second-instance', () => daywell?.showMain())

  app.whenReady().then(() => {
    const dbPath = join(app.getPath('userData'), 'daywell.db')
    try {
      db = openDatabase(dbPath)
    } catch (error) {
      log.error('Database could not be opened', error)
      const t = createTranslator('en')
      const backup = error instanceof DatabaseOpenError && error.backupPath ? error.backupPath : dbPath
      dialog.showErrorBox(t('error.title'), `${(error as Error).message}\n\n${t('error.database', { path: backup })}`)
      app.exit(1)
      return
    }
    handleAssetProtocol()
    daywell = new DaywellApp(createRepositories(db))
    daywell.start(process.argv.includes('--hidden'))
    log.info('Daywell started')
  })

  // Keep running in the tray with no windows open; quitting is explicit.
  app.on('window-all-closed', () => {
    if (daywell === null) app.quit()
  })

  app.on('before-quit', () => {
    daywell?.shutdown()
  })

  app.on('will-quit', () => {
    try {
      db?.close()
    } catch (error) {
      log.warn('Database close failed', error)
    }
  })
}
