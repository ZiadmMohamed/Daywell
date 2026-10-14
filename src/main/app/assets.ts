import { randomUUID } from 'node:crypto'
import { copyFile, mkdir, readdir, rm, stat } from 'node:fs/promises'
import { extname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { app, dialog, net, protocol, type BrowserWindow } from 'electron'
import type { AssetKind } from '@shared/validation/ipc'
import { log } from './log'

/**
 * User-chosen files (clock background images, Athan audio) are copied into the
 * app's own data folder and served through the `daywell-asset:` protocol, which
 * only ever resolves plain file names inside that folder. Renderers never get
 * filesystem paths or access.
 */
export const ASSET_SCHEME = 'daywell-asset'
const NAME_PATTERN = /^[a-z0-9-]{1,64}\.(png|jpe?g|webp|mp3|ogg|wav|m4a)$/
const MAX_BYTES = 25 * 1024 * 1024

const FILTERS: Record<AssetKind, Electron.FileFilter[]> = {
  background: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] }],
  athan: [{ name: 'Audio', extensions: ['mp3', 'ogg', 'wav', 'm4a'] }]
}

export function assetsDir(): string {
  return join(app.getPath('userData'), 'assets')
}

export function registerAssetScheme(): void {
  protocol.registerSchemesAsPrivileged([
    { scheme: ASSET_SCHEME, privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } }
  ])
}

export function handleAssetProtocol(): void {
  protocol.handle(ASSET_SCHEME, (request) => {
    const name = decodeURIComponent(new URL(request.url).pathname.replace(/^\/+/, ''))
    if (!NAME_PATTERN.test(name)) return new Response('Not found', { status: 404 })
    return net.fetch(pathToFileURL(join(assetsDir(), name)).toString())
  })
}

export async function pickAsset(kind: AssetKind, parent: BrowserWindow | null): Promise<string | null> {
  const options: Electron.OpenDialogOptions = { properties: ['openFile'], filters: FILTERS[kind] }
  const result = parent ? await dialog.showOpenDialog(parent, options) : await dialog.showOpenDialog(options)
  const source = result.filePaths[0]
  if (result.canceled || !source) return null
  const extension = extname(source).slice(1).toLowerCase()
  const allowed = FILTERS[kind].flatMap((f) => f.extensions)
  if (!allowed.includes(extension)) throw new Error('Unsupported file type')
  if ((await stat(source)).size > MAX_BYTES) throw new Error('File is too large')
  const name = `${kind}-${randomUUID().slice(0, 8)}.${extension}`
  await mkdir(assetsDir(), { recursive: true })
  await copyFile(source, join(assetsDir(), name))
  return name
}

/** Removes copied files that are no longer referenced by any setting. */
export async function pruneAssets(referenced: ReadonlyArray<string | null>): Promise<void> {
  const keep = new Set(referenced.filter((n): n is string => n !== null))
  try {
    for (const name of await readdir(assetsDir())) {
      if (NAME_PATTERN.test(name) && !keep.has(name)) await rm(join(assetsDir(), name), { force: true })
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') log.warn('Asset cleanup failed', error)
  }
}
