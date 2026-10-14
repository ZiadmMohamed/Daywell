import { BrowserWindow, nativeTheme } from 'electron'
import type { GeneralSettings } from '@shared/validation/settings'
import { hardenWindow, loadPage, secureWebPreferences } from './security'

const COLORS = {
  dark: { background: '#0e1114', symbols: '#c9ced6' },
  light: { background: '#f7f6f3', symbols: '#3a3f47' }
}

export function resolveDark(theme: GeneralSettings['theme']): boolean {
  return theme === 'dark' || (theme === 'system' && nativeTheme.shouldUseDarkColors)
}

export function createMainWindow(theme: GeneralSettings['theme'], icon: Electron.NativeImage): BrowserWindow {
  const palette = resolveDark(theme) ? COLORS.dark : COLORS.light
  const window = new BrowserWindow({
    width: 1080,
    height: 720,
    minWidth: 760,
    minHeight: 540,
    show: false,
    title: 'Daywell',
    icon,
    backgroundColor: palette.background,
    titleBarStyle: 'hidden',
    titleBarOverlay: { color: palette.background, symbolColor: palette.symbols, height: 40 },
    webPreferences: secureWebPreferences()
  })
  hardenWindow(window)
  window.setMenu(null)
  void loadPage(window, 'index')
  return window
}

export function applyMainWindowTheme(window: BrowserWindow, theme: GeneralSettings['theme']): void {
  const palette = resolveDark(theme) ? COLORS.dark : COLORS.light
  window.setBackgroundColor(palette.background)
  try {
    window.setTitleBarOverlay({ color: palette.background, symbolColor: palette.symbols, height: 40 })
  } catch {
    // Title bar overlay is unavailable on some platforms; nothing to update.
  }
}
