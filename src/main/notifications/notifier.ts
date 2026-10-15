import { Notification, type NativeImage, type Tray } from 'electron'
import { log } from '../app/log'

export interface NotifyOptions {
  title: string
  body: string
  silent: boolean
  onClick: () => void
}

/**
 * How many recent notifications are kept referenced so their click handlers
 * survive garbage collection. Electron does not guarantee a 'close' event on
 * Windows (e.g. toasts that time out into the Action Center), so the set is
 * bounded rather than relying on 'close' alone.
 */
const MAX_TRACKED = 20

/**
 * Shows native Windows toast notifications. If toasts are unsupported or fail
 * (e.g. Focus Assist, policy, missing shortcut), falls back to a tray balloon.
 */
export class Notifier {
  /** Recent notifications, oldest first (Set preserves insertion order). */
  private readonly active = new Set<Notification>()
  /** Click handler for the balloon currently on screen; only one is shown at a time. */
  private balloonClick: (() => void) | null = null

  constructor(
    private readonly getTray: () => Tray | null,
    private readonly icon: NativeImage
  ) {}

  /** Number of notifications currently referenced (for diagnostics and tests). */
  get trackedCount(): number {
    return this.active.size
  }

  show(options: NotifyOptions): boolean {
    if (!Notification.isSupported()) return this.balloon(options)
    try {
      const notification = new Notification({
        title: options.title,
        body: options.body,
        silent: options.silent,
        icon: this.icon,
        timeoutType: 'default'
      })
      this.track(notification)
      const release = (): void => {
        this.active.delete(notification)
      }
      notification.on('click', () => {
        release()
        options.onClick()
      })
      notification.on('close', release)
      notification.on('failed', (_event, error) => {
        release()
        log.warn('Notification failed, using tray balloon', error)
        this.balloon(options)
      })
      notification.show()
      return true
    } catch (error) {
      log.warn('Notification could not be shown', error)
      return this.balloon(options)
    }
  }

  private track(notification: Notification): void {
    this.active.add(notification)
    while (this.active.size > MAX_TRACKED) {
      const oldest = this.active.values().next().value
      if (!oldest) break
      this.active.delete(oldest)
      oldest.removeAllListeners()
    }
  }

  private balloon(options: NotifyOptions): boolean {
    const tray = this.getTray()
    if (!tray || tray.isDestroyed()) return false
    // A new balloon replaces the previous one, so replace its click handler too
    // instead of stacking a listener per balloon that was never clicked.
    if (this.balloonClick) tray.removeListener('balloon-click', this.balloonClick)
    const onClick = (): void => {
      this.balloonClick = null
      options.onClick()
    }
    this.balloonClick = onClick
    tray.once('balloon-click', onClick)
    tray.displayBalloon({ title: options.title, content: options.body, icon: this.icon, noSound: options.silent })
    return true
  }
}
