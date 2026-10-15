import { BrowserWindow, screen, type Rectangle } from 'electron'
import { z } from 'zod'
import type { WidgetSettings } from '@shared/validation/settings'
import type { KeyValueRepository } from '../database/repositories'
import { hardenWindow, loadPage, secureWebPreferences } from './security'

const BOUNDS_KEY = 'widget.bounds'
const DEFAULT_SIZE = { width: 360, height: 170 }
const boundsSchema = z.object({ x: z.number(), y: z.number(), width: z.number().min(160), height: z.number().min(70) })

/** Restores saved bounds only if they are still mostly on a connected display. */
function restoreBounds(saved: unknown): Rectangle {
  const parsed = boundsSchema.safeParse(saved)
  const workArea = screen.getPrimaryDisplay().workArea
  const fallback = {
    ...DEFAULT_SIZE,
    x: workArea.x + workArea.width - DEFAULT_SIZE.width - 32,
    y: workArea.y + 32
  }
  if (!parsed.success) return fallback
  const bounds = parsed.data
  const display = screen.getDisplayMatching(bounds).workArea
  const visibleWidth = Math.min(bounds.x + bounds.width, display.x + display.width) - Math.max(bounds.x, display.x)
  const visibleHeight = Math.min(bounds.y + bounds.height, display.y + display.height) - Math.max(bounds.y, display.y)
  return visibleWidth >= 80 && visibleHeight >= 40 ? bounds : fallback
}

/**
 * A frameless, transparent desktop clock. It is created non-focusable and shown
 * inactive, so it never steals keyboard focus from the user's work.
 */
export class WidgetWindow {
  private window: BrowserWindow | null = null
  private saveTimer: NodeJS.Timeout | null = null

  constructor(private readonly stateRepo: KeyValueRepository) {}

  get browserWindow(): BrowserWindow | null {
    return this.window && !this.window.isDestroyed() ? this.window : null
  }

  isVisible(): boolean {
    return this.browserWindow?.isVisible() ?? false
  }

  apply(settings: WidgetSettings): void {
    if (!settings.visible) {
      // Destroy rather than hide so a hidden widget costs no memory.
      this.destroy()
      return
    }
    const window = this.browserWindow ?? this.create()
    window.setAlwaysOnTop(settings.alwaysOnTop, 'floating')
    window.setOpacity(settings.opacity)
    window.setIgnoreMouseEvents(settings.clickThrough, { forward: true })
    if (!window.isVisible()) {
      if (window.webContents.isLoading()) window.once('ready-to-show', () => window.showInactive())
      else window.showInactive()
    }
  }

  /** Resizes from the widget's own grip, keeping the top-left corner fixed. */
  resize(width: number, height: number): void {
    const window = this.browserWindow
    if (!window) return
    const bounds = window.getBounds()
    window.setBounds({ x: bounds.x, y: bounds.y, width, height })
    this.scheduleSave()
  }

  destroy(): void {
    this.flushBounds()
    this.browserWindow?.destroy()
    this.window = null
  }

  private create(): BrowserWindow {
    const bounds = restoreBounds(this.stateRepo.get(BOUNDS_KEY))
    const window = new BrowserWindow({
      ...bounds,
      minWidth: 180,
      minHeight: 80,
      frame: false,
      transparent: true,
      backgroundColor: '#00000000',
      // Transparent windows cannot be resized natively; the widget has its own grip.
      resizable: false,
      movable: true,
      minimizable: false,
      maximizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      focusable: false,
      hasShadow: false,
      show: false,
      title: 'Daywell Clock',
      webPreferences: { ...secureWebPreferences(), backgroundThrottling: true }
    })
    hardenWindow(window)
    window.on('moved', () => this.scheduleSave())
    window.on('resized', () => this.scheduleSave())
    window.on('closed', () => {
      this.window = null
    })
    void loadPage(window, 'widget')
    this.window = window
    return window
  }

  private scheduleSave(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = setTimeout(() => this.flushBounds(), 400)
  }

  private flushBounds(): void {
    if (this.saveTimer) clearTimeout(this.saveTimer)
    this.saveTimer = null
    const window = this.browserWindow
    if (window) this.stateRepo.set(BOUNDS_KEY, window.getBounds())
  }
}
