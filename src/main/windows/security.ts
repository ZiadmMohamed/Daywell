import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, shell, type BrowserWindow, type WebPreferences } from 'electron'

export const preloadPath = (): string => join(__dirname, '../preload/index.js')

export function secureWebPreferences(): WebPreferences {
  return {
    preload: preloadPath(),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: true,
    webSecurity: true,
    spellcheck: false,
    devTools: !app.isPackaged
  }
}

/**
 * Loads one of the renderer pages, from the dev server during development.
 * `hash` is passed to the page as its initial location hash (e.g. the screen to open).
 */
export function loadPage(window: BrowserWindow, page: 'index' | 'widget' | 'sound', hash?: string): Promise<void> {
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (!app.isPackaged && devUrl) return window.loadURL(`${devUrl}/${page}.html${hash ? `#${hash}` : ''}`)
  return window.loadFile(join(__dirname, `../renderer/${page}.html`), hash ? { hash } : undefined)
}

/** Is this URL one of our own renderer pages? */
export function isAppUrl(url: string): boolean {
  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (!app.isPackaged && devUrl && url.startsWith(devUrl)) return true
  return url.startsWith(pathToFileURL(join(__dirname, '../renderer')).href + '/')
}

/** Blocks navigation away from the app and opens external http(s) links in the browser. */
export function hardenWindow(window: BrowserWindow): void {
  const contents = window.webContents
  contents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })
  contents.on('will-navigate', (event, url) => {
    if (!isAppUrl(url)) event.preventDefault()
  })
  contents.on('will-attach-webview', (event) => event.preventDefault())
  contents.session.setPermissionRequestHandler((_wc, _permission, callback) => callback(false))
}
