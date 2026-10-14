import { Menu, Tray, type NativeImage } from 'electron'
import type { Translate } from '@shared/i18n'

export interface TrayModel {
  t: Translate
  widgetVisible: boolean
  clickThrough: boolean
  focusStatus: 'idle' | 'running' | 'paused'
  quickAddMl: number
  /** e.g. "Asr at 3:25 PM", or null when unavailable. */
  nextPrayer: { name: string; time: string } | null
}

export interface TrayActions {
  openMain(): void
  toggleWidget(): void
  disableClickThrough(): void
  toggleFocus(): void
  logWater(amountMl: number): void
  exit(): void
}

/** System tray icon and menu. The menu is rebuilt only when what it shows has changed. */
export class AppTray {
  private readonly tray: Tray
  private lastSignature = ''

  constructor(
    icon: NativeImage,
    private readonly actions: TrayActions
  ) {
    this.tray = new Tray(icon)
    this.tray.setToolTip('Daywell')
    this.tray.on('click', () => actions.openMain())
  }

  get native(): Tray {
    return this.tray
  }

  update(model: TrayModel): void {
    const { t } = model
    const signature = JSON.stringify({ ...model, t: t('tray.open') })
    if (signature === this.lastSignature) return
    this.lastSignature = signature

    const nextLabel = model.nextPrayer ? t('tray.nextPrayer', { prayer: model.nextPrayer.name, time: model.nextPrayer.time }) : null
    const focusLabel =
      model.focusStatus === 'running' ? t('tray.pauseFocus') : model.focusStatus === 'paused' ? t('tray.resumeFocus') : t('tray.startFocus')

    const template: Electron.MenuItemConstructorOptions[] = [
      { label: t('tray.open'), click: () => this.actions.openMain() },
      { type: 'separator' },
      ...(nextLabel ? [{ label: nextLabel, enabled: false }, { type: 'separator' as const }] : []),
      { label: focusLabel, click: () => this.actions.toggleFocus() },
      { label: t('tray.logWater', { n: model.quickAddMl }), click: () => this.actions.logWater(model.quickAddMl) },
      { type: 'separator' },
      { label: model.widgetVisible ? t('tray.hideWidget') : t('tray.showWidget'), click: () => this.actions.toggleWidget() },
      ...(model.widgetVisible && model.clickThrough
        ? [{ label: t('tray.clickThroughOff'), click: () => this.actions.disableClickThrough() }]
        : []),
      { type: 'separator' },
      { label: t('tray.exit'), click: () => this.actions.exit() }
    ]
    this.tray.setContextMenu(Menu.buildFromTemplate(template))
    this.tray.setToolTip(nextLabel ? `Daywell · ${nextLabel}` : 'Daywell')
  }

  destroy(): void {
    if (!this.tray.isDestroyed()) this.tray.destroy()
  }
}
