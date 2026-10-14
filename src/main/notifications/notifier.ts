import { Notification, type NativeImage, type Tray } from 'electron'
import { log } from '../app/log'

export interface NotifyOptions {
  title: string
  body: string
  silent: boolean
  onClick: () => void
}

/**
 * Shows native Windows toast notifications. If toasts are unsupported or fail
 * (e.g. Focus Assist, policy, missing shortcut), falls back to a tray balloon.
 */
export class Notifier {
  /** Keeps notifications alive until closed so their click handlers are not garbage collected. */
  private readonly active = new Set<Notification>()

  constructor(
    private readonly getTray: () => Tray | null,
    private readonly icon: NativeImage
  ) {}

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
      this.active.add(notification)
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

  private balloon(options: NotifyOptions): boolean {
    const tray = this.getTray()
    if (!tray || tray.isDestroyed()) return false
    tray.displayBalloon({ title: options.title, content: options.body, icon: this.icon, noSound: options.silent })
    tray.once('balloon-click', options.onClick)
    return true
  }
}
