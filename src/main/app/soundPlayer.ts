import { BrowserWindow, type WebContents } from 'electron'
import { IPC } from '@shared/constants/ipc'
import type { SoundCue } from '@shared/types/state'
import { loadPage, secureWebPreferences } from '../windows/security'
import { log } from './log'

/** Upper bound on how long the sound window may live, in case a page never reports back. */
const MAX_LIFETIME_MS = 15 * 60_000

/**
 * Plays sound cues. If the main window is open it plays them; otherwise an
 * invisible window is created just for the sound and destroyed when the sound
 * page reports that playback finished. This lets the main window be fully
 * destroyed while Daywell sits in the tray, without losing the focus chime or
 * the Athan.
 */
export class SoundPlayer {
  private window: BrowserWindow | null = null
  private ready = false
  private pending: SoundCue[] = []
  private lifetime: NodeJS.Timeout | null = null

  constructor(private readonly getMainWindow: () => BrowserWindow | null) {}

  play(cue: SoundCue): void {
    const main = this.getMainWindow()
    if (main && !main.isDestroyed() && !main.webContents.isLoading()) {
      main.webContents.send(IPC.playSound, cue)
      return
    }
    if (this.window && this.ready) {
      this.window.webContents.send(IPC.playSound, cue)
      return
    }
    this.pending.push(cue)
    if (!this.window) this.open()
  }

  /** Called when a page reports it has finished everything it was playing. */
  finished(sender: WebContents): void {
    if (this.window && !this.window.isDestroyed() && sender === this.window.webContents) this.close()
  }

  close(): void {
    if (this.lifetime) clearTimeout(this.lifetime)
    this.lifetime = null
    if (this.window && !this.window.isDestroyed()) this.window.destroy()
    this.window = null
    this.ready = false
    this.pending = []
  }

  private open(): void {
    const window = new BrowserWindow({
      show: false,
      width: 1,
      height: 1,
      skipTaskbar: true,
      focusable: false,
      webPreferences: { ...secureWebPreferences(), autoplayPolicy: 'no-user-gesture-required' }
    })
    this.window = window
    this.ready = false
    window.webContents.once('did-finish-load', () => {
      this.ready = true
      for (const cue of this.pending.splice(0)) window.webContents.send(IPC.playSound, cue)
    })
    window.on('closed', () => {
      if (this.window === window) {
        this.window = null
        this.ready = false
      }
    })
    this.lifetime = setTimeout(() => this.close(), MAX_LIFETIME_MS)
    loadPage(window, 'sound').catch((error: unknown) => {
      log.warn('Sound window failed to load', error)
      this.close()
    })
  }
}
