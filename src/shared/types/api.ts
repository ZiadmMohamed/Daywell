import type { AssetKind, FocusCommand } from '../validation/ipc'
import type { Settings, SettingsSection } from '../validation/settings'
import type { AppSlices, Page, SliceName, SoundCue } from './state'

/** The complete, narrow API the preload script exposes to renderers as `window.daywell`. */
export interface DaywellApi {
  getSnapshot(): Promise<AppSlices>
  updateSettings<K extends SettingsSection>(section: K, patch: Partial<Settings[K]>): Promise<Settings[K]>
  focus(command: FocusCommand): Promise<void>
  addWater(amountMl: number): Promise<void>
  removeWater(id: number): Promise<void>
  pauseHydration(pause: number | 'tomorrow' | null): Promise<void>
  showMain(page?: Page): Promise<void>
  /** Puts the main window into (or out of) full-screen clock mode. */
  setFullscreen(on: boolean): Promise<void>
  onFullscreenChange(listener: (on: boolean) => void): () => void
  setWidgetVisible(visible: boolean): Promise<void>
  /** Resizes the desktop widget (transparent windows cannot be resized natively). */
  resizeWidget(width: number, height: number): Promise<void>
  /** Opens a native file picker; returns the stored asset name, or null if cancelled. */
  pickAsset(kind: AssetKind): Promise<string | null>
  /** Sent by the background sound page when everything it was asked to play has finished. */
  soundFinished(): Promise<void>
  onSlice<K extends SliceName>(listener: (name: K, value: AppSlices[K]) => void): () => void
  onNavigate(listener: (page: Page) => void): () => void
  onPlaySound(listener: (cue: SoundCue) => void): () => void
}
