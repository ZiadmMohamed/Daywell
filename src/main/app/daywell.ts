import { join } from 'node:path'
import { app, BrowserWindow, nativeImage, nativeTheme, powerMonitor, type NativeImage } from 'electron'
import { NOTIFICATION_LOG_RETENTION_MS } from '@shared/constants/timing'
import { IPC } from '@shared/constants/ipc'
import { createTranslator } from '@shared/i18n'
import type { ScheduledEvent } from '@shared/scheduling/events'
import { localDateKey, zonedDateKey } from '@shared/time/dates'
import { formatTimeOfDay } from '@shared/time/format'
import type { AppSlices, Page, SliceName, SoundCue } from '@shared/types/state'
import type { Settings, SettingsSection } from '@shared/validation/settings'
import type { Repositories } from '../database/repositories'
import { registerIpc } from '../ipc/handlers'
import { buildNotification } from '../notifications/content'
import { Notifier } from '../notifications/notifier'
import { Scheduler } from '../notifications/scheduler'
import { HydrationService } from '../services/hydrationService'
import { PomodoroService } from '../services/pomodoroService'
import { PrayerService } from '../services/prayerService'
import { SettingsService } from '../services/settingsService'
import { AppTray } from '../tray/tray'
import { applyMainWindowTheme, createMainWindow } from '../windows/mainWindow'
import { WidgetWindow } from '../windows/widgetWindow'
import { pickAsset, pruneAssets } from './assets'
import { log } from './log'
import { SoundPlayer } from './soundPlayer'

const TRAY_HINT_KEY = 'trayHintShown'

export function resourcePath(name: string): string {
  return join(__dirname, '../../resources', name)
}

/**
 * Composition root: owns the services, the single scheduler, the windows and
 * the tray, and keeps renderers in sync by publishing state slices.
 */
export class DaywellApp {
  private readonly settings: SettingsService
  private readonly pomodoro: PomodoroService
  private readonly hydration: HydrationService
  private readonly prayer: PrayerService
  private readonly scheduler: Scheduler
  private readonly notifier: Notifier
  private readonly widget: WidgetWindow
  private readonly sound: SoundPlayer
  private readonly appIcon: NativeImage
  private previousHydration: Settings['hydration']
  private mainWindow: BrowserWindow | null = null
  private tray: AppTray | null = null
  private quitting = false
  private readonly dirty = new Set<SliceName>()
  private flushQueued = false
  private lastLocalDate = localDateKey(Date.now())
  private lastOffset = new Date().getTimezoneOffset()

  constructor(private readonly repos: Repositories) {
    const now = Date.now()
    this.appIcon = nativeImage.createFromPath(resourcePath('icon.png'))
    this.settings = new SettingsService(repos.settings)
    this.pomodoro = new PomodoroService(repos.state, repos.focus, () => this.settings.get('focus'), () => this.publish('focus'))
    this.hydration = new HydrationService(
      repos.state,
      repos.hydration,
      () => this.settings.get('hydration'),
      () => this.publish('hydration'),
      now
    )
    this.previousHydration = this.settings.get('hydration')
    this.prayer = new PrayerService(() => this.settings.get('prayer'), () => this.publish('prayer'))
    this.widget = new WidgetWindow(repos.state)
    this.sound = new SoundPlayer(() => this.mainWindow)
    this.notifier = new Notifier(() => this.tray?.native ?? null, this.appIcon)
    this.scheduler = new Scheduler({
      now: () => Date.now(),
      setTimer: (callback, ms) => setTimeout(callback, ms),
      clearTimer: (handle) => clearTimeout(handle as NodeJS.Timeout),
      log: repos.notificationLog,
      deliver: (event) => this.deliver(event),
      onTick: (tickNow) => this.onTick(tickNow),
      onError: (error) => log.error('Scheduler error', error)
    })
    this.scheduler.register(this.pomodoro)
    this.scheduler.register(this.hydration)
    this.scheduler.register(this.prayer)
  }

  start(startHidden: boolean): void {
    this.repos.notificationLog.pruneBefore(Date.now() - NOTIFICATION_LOG_RETENTION_MS)
    registerIpc({
      snapshot: () => this.snapshot(),
      updateSettings: (section, patch) => this.updateSettings(section, patch),
      focus: (command) => {
        this.pomodoro.command(command, Date.now())
        this.scheduler.wake()
      },
      addWater: (amount) => this.addWater(amount),
      removeWater: (id) => {
        this.hydration.remove(id)
        this.scheduler.wake()
      },
      pauseHydration: (pause) => {
        this.hydration.pause(pause, Date.now())
        this.scheduler.wake()
      },
      showMain: (page) => this.showMain(page),
      setFullscreen: (on) => this.mainWindow?.setFullScreen(on),
      setWidgetVisible: (visible) => this.updateSettings('widget', { visible }),
      resizeWidget: (width, height) => this.widget.resize(width, height),
      pickAsset: (kind) => pickAsset(kind, this.mainWindow),
      soundFinished: (sender) => this.sound.finished(sender)
    })

    this.settings.onChange((section, all) => this.onSettingsChanged(section, all))
    nativeTheme.on('updated', () => this.mainWindow && applyMainWindowTheme(this.mainWindow, this.settings.get('general').theme))

    this.tray = new AppTray(nativeImage.createFromPath(resourcePath('tray.png')), {
      openMain: () => this.showMain(),
      toggleWidget: () => this.updateSettings('widget', { visible: !this.settings.get('widget').visible }),
      disableClickThrough: () => this.updateSettings('widget', { clickThrough: false }),
      toggleFocus: () => {
        this.pomodoro.toggle(Date.now())
        this.scheduler.wake()
      },
      logWater: (amount) => this.addWater(amount),
      exit: () => this.quit()
    })

    // Started at login: stay in the tray without creating a window at all.
    if (!startHidden) this.createMainWindow()
    this.widget.apply(this.settings.get('widget'))
    this.applyLoginItem()

    powerMonitor.on('suspend', () => log.info('System suspending'))
    powerMonitor.on('resume', () => {
      log.info('System resumed; reconciling timers')
      this.scheduler.wake()
    })
    powerMonitor.on('unlock-screen', () => this.scheduler.wake())

    this.scheduler.start()
    this.refreshTray()
    void pruneAssets([this.settings.get('clock').backgroundImage, this.settings.get('prayer').athanFile])
  }

  showMain(page?: Page): void {
    if (!this.mainWindow) {
      // A new window opens directly on the requested page and shows itself once painted.
      this.createMainWindow(page)
      return
    }
    const window = this.mainWindow
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
    if (page) window.webContents.send(IPC.navigate, page)
  }

  isQuitting(): boolean {
    return this.quitting
  }

  quit(): void {
    this.quitting = true
    app.quit()
  }

  shutdown(): void {
    this.quitting = true
    this.scheduler.stop()
    this.sound.close()
    this.widget.destroy()
    this.tray?.destroy()
  }

  private createMainWindow(page?: Page): BrowserWindow {
    const window = createMainWindow(this.settings.get('general').theme, this.appIcon, page)
    window.once('ready-to-show', () => window.show())
    window.on('close', () => {
      if (this.quitting) return
      // Closing to the tray destroys the window to free its memory (~70 MB);
      // all state lives in the main process, so reopening restores it exactly.
      if (this.settings.get('general').minimizeToTray) this.showTrayHintOnce()
      else this.quit()
    })
    window.on('closed', () => {
      this.mainWindow = null
    })
    // Keep the renderer in sync however full screen is entered or left (button, F11, Esc, OS).
    window.on('enter-full-screen', () => window.webContents.send(IPC.fullscreenChanged, true))
    window.on('leave-full-screen', () => window.webContents.send(IPC.fullscreenChanged, false))
    window.on('hide', () => {
      if (window.isFullScreen()) window.setFullScreen(false)
    })
    this.mainWindow = window
    return window
  }

  private showTrayHintOnce(): void {
    if (this.repos.state.get(TRAY_HINT_KEY) === true) return
    this.repos.state.set(TRAY_HINT_KEY, true)
    const t = createTranslator(this.settings.get('general').language)
    this.notifier.show({ title: t('notify.trayHint.title'), body: t('notify.trayHint.body'), silent: true, onClick: () => this.showMain() })
  }

  private addWater(amountMl: number): void {
    this.hydration.add(amountMl, Date.now())
    this.scheduler.wake()
  }

  private updateSettings(section: SettingsSection, patch: Record<string, unknown>): unknown {
    return this.settings.update(section, patch)
  }

  private onSettingsChanged(section: SettingsSection, all: Settings): void {
    const now = Date.now()
    switch (section) {
      case 'general':
        if (this.mainWindow) applyMainWindowTheme(this.mainWindow, all.general.theme)
        this.applyLoginItem()
        break
      case 'widget':
        this.widget.apply(all.widget)
        break
      case 'focus':
        this.pomodoro.onSettingsChanged()
        break
      case 'hydration':
        this.hydration.onSettingsChanged(this.previousHydration, now)
        break
      case 'clock':
      case 'prayer':
        void pruneAssets([all.clock.backgroundImage, all.prayer.athanFile])
        break
    }
    this.previousHydration = all.hydration
    this.publish('settings')
    if (section === 'prayer') this.publish('prayer')
    this.scheduler.wake()
  }

  private applyLoginItem(): void {
    if (!app.isPackaged) return
    app.setLoginItemSettings({ openAtLogin: this.settings.get('general').launchAtStartup, args: ['--hidden'] })
  }

  /** Called by the scheduler at least once a minute: notices date and timezone changes. */
  private onTick(now: number): void {
    const date = localDateKey(now)
    const offset = new Date(now).getTimezoneOffset()
    if (date !== this.lastLocalDate || offset !== this.lastOffset) {
      log.info('Local date or timezone changed; refreshing')
      this.lastLocalDate = date
      this.lastOffset = offset
      // Keep the handled-event log bounded even if Daywell runs for weeks without restarting.
      this.repos.notificationLog.pruneBefore(now - NOTIFICATION_LOG_RETENTION_MS)
      this.publish('focus')
      this.publish('hydration')
    }
    this.prayer.refresh(now)
    this.refreshTray()
  }

  private deliver(event: ScheduledEvent): boolean {
    const settings = this.settings.all
    const now = Date.now()
    const content = buildNotification(event, {
      language: settings.general.language,
      timeFormat: settings.general.timeFormat,
      prayerTimeZone: settings.prayer.timezone,
      focusSound: settings.focus.soundEnabled,
      athanFile: settings.prayer.athanEnabled ? settings.prayer.athanFile : null,
      hydrationTotalMl: this.hydration.totalFor(localDateKey(now)),
      hydrationGoalMl: settings.hydration.dailyGoalMl
    })
    // A short in-app chime marks the end of a focus phase even when its notification is turned off.
    const sound: SoundCue | null =
      event.payload.kind === 'focus-end' ? (settings.focus.soundEnabled ? { kind: 'chime' } : null) : content.sound
    if (sound) this.sound.play(sound)
    if (!event.notify) return true
    return this.notifier.show({
      title: content.title,
      body: content.body,
      silent: content.silent || sound !== null,
      onClick: () => this.showMain(content.page)
    })
  }

  private snapshot(): AppSlices {
    const now = Date.now()
    return {
      settings: this.settings.all,
      focus: this.pomodoro.slice(now),
      hydration: this.hydration.slice(now),
      prayer: this.prayer.slice(now)
    }
  }

  private sliceValue(name: SliceName, now: number): AppSlices[SliceName] {
    switch (name) {
      case 'settings':
        return this.settings.all
      case 'focus':
        return this.pomodoro.slice(now)
      case 'hydration':
        return this.hydration.slice(now)
      case 'prayer':
        return this.prayer.slice(now)
    }
  }

  /** Queues a slice to be sent to all windows; several changes in one tick are sent once. */
  private publish(name: SliceName): void {
    this.dirty.add(name)
    if (this.flushQueued) return
    this.flushQueued = true
    queueMicrotask(() => {
      this.flushQueued = false
      const now = Date.now()
      const names = [...this.dirty]
      this.dirty.clear()
      const windows = BrowserWindow.getAllWindows().filter((w) => !w.isDestroyed())
      for (const sliceName of names) {
        const value = this.sliceValue(sliceName, now)
        for (const window of windows) window.webContents.send(IPC.sliceChanged, sliceName, value)
      }
      this.refreshTray()
    })
  }

  private refreshTray(): void {
    if (!this.tray) return
    const settings = this.settings.all
    const t = createTranslator(settings.general.language)
    const now = Date.now()
    const next = this.prayer.next(now)
    this.tray.update({
      t,
      widgetVisible: settings.widget.visible,
      clickThrough: settings.widget.clickThrough,
      focusStatus: this.pomodoro.current.status,
      quickAddMl: settings.hydration.quickAddMl[1] ?? settings.hydration.quickAddMl[0] ?? 250,
      nextPrayer: next
        ? {
            name: t(`prayer.${next.name}`),
            time:
              formatTimeOfDay(next.at, settings.general.timeFormat, settings.prayer.timezone) +
              (next.date !== zonedDateKey(now, settings.prayer.timezone) ? ` (${t('prayer.tomorrow')})` : '')
          }
        : null
    })
  }
}
