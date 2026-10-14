/**
 * Renders the Daywell icon from SVG and writes:
 *   resources/icon.png  (512, used for windows and notifications)
 *   resources/tray.png  (32, system tray)
 *   build/icon.ico      (16–256, Windows executable and installer)
 *
 * Run with: npx electron scripts/generate-icons.cjs
 */
const { app, BrowserWindow } = require('electron')
const { writeFileSync, mkdirSync } = require('node:fs')
const { join } = require('node:path')

const root = join(__dirname, '..')

const svg = (size) => `
<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#1a2128"/>
      <stop offset="1" stop-color="#0c0f12"/>
    </linearGradient>
    <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#7fd3b8"/>
      <stop offset="0.55" stop-color="#5aa9e6"/>
      <stop offset="1" stop-color="#e2bd72"/>
    </linearGradient>
  </defs>
  <rect x="24" y="24" width="464" height="464" rx="112" fill="url(#bg)"/>
  <circle cx="256" cy="256" r="150" fill="none" stroke="url(#ring)" stroke-width="34"/>
  <path d="M256 256 L256 160" stroke="#f3f1ea" stroke-width="26" stroke-linecap="round"/>
  <path d="M256 256 L318 292" stroke="#f3f1ea" stroke-width="26" stroke-linecap="round"/>
  <circle cx="256" cy="256" r="18" fill="#f3f1ea"/>
</svg>`

function toIco(pngs) {
  const header = Buffer.alloc(6)
  header.writeUInt16LE(0, 0)
  header.writeUInt16LE(1, 2)
  header.writeUInt16LE(pngs.length, 4)
  const entries = []
  let offset = 6 + 16 * pngs.length
  for (const { size, data } of pngs) {
    const entry = Buffer.alloc(16)
    entry.writeUInt8(size >= 256 ? 0 : size, 0)
    entry.writeUInt8(size >= 256 ? 0 : size, 1)
    entry.writeUInt8(0, 2)
    entry.writeUInt8(0, 3)
    entry.writeUInt16LE(1, 4)
    entry.writeUInt16LE(32, 6)
    entry.writeUInt32LE(data.length, 8)
    entry.writeUInt32LE(offset, 12)
    offset += data.length
    entries.push(entry)
  }
  return Buffer.concat([header, ...entries, ...pngs.map((p) => p.data)])
}

async function render(size) {
  const win = new BrowserWindow({
    width: size,
    height: size,
    show: false,
    frame: false,
    transparent: true,
    useContentSize: true,
    webPreferences: { offscreen: true }
  })
  const html = `<html><body style="margin:0;background:transparent;overflow:hidden">${svg(size)}</body></html>`
  await win.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)
  await new Promise((r) => setTimeout(r, 300))
  const image = await win.webContents.capturePage({ x: 0, y: 0, width: size, height: size })
  win.destroy()
  return image.resize({ width: size, height: size, quality: 'best' })
}

app.whenReady().then(async () => {
  mkdirSync(join(root, 'resources'), { recursive: true })
  mkdirSync(join(root, 'build'), { recursive: true })
  // Render once at high resolution, then downscale for each size.
  const master = await render(1024)
  const at = (size) => master.resize({ width: size, height: size, quality: 'best' }).toPNG()
  writeFileSync(join(root, 'resources/icon.png'), at(512))
  writeFileSync(join(root, 'resources/tray.png'), at(32))
  writeFileSync(join(root, 'build/icon.png'), at(512))
  writeFileSync(join(root, 'build/icon.ico'), toIco([16, 24, 32, 48, 64, 128, 256].map((size) => ({ size, data: at(size) }))))
  console.log('Icons written')
  app.quit()
})
