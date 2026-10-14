import { resolve } from 'node:path'
import { defineConfig } from 'electron-vite'
import type { Plugin } from 'vite'
import react from '@vitejs/plugin-react'

const alias = {
  '@shared': resolve(__dirname, 'src/shared'),
  '@renderer': resolve(__dirname, 'src/renderer/src')
}

/**
 * Injects a Content-Security-Policy meta tag. Production is strict; development
 * additionally allows Vite's HMR websocket and the React refresh inline preamble.
 */
function contentSecurityPolicy(): Plugin {
  let isDev = false
  return {
    name: 'daywell-csp',
    configResolved(config) {
      isDev = config.command === 'serve'
    },
    transformIndexHtml(html) {
      const directives = [
        "default-src 'self'",
        isDev ? "script-src 'self' 'unsafe-inline'" : "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: daywell-asset:",
        "media-src 'self' daywell-asset:",
        "font-src 'self' data:",
        isDev ? "connect-src 'self' ws: http://localhost:*" : "connect-src 'self'",
        "object-src 'none'",
        "base-uri 'none'",
        "form-action 'none'"
      ]
      const tag = `<meta http-equiv="Content-Security-Policy" content="${directives.join('; ')}" />`
      return html.replace('<!-- CSP -->', tag)
    }
  }
}

export default defineConfig({
  main: {
    resolve: { alias },
    build: {
      rollupOptions: {
        external: ['node:sqlite']
      }
    }
  },
  preload: {
    resolve: { alias },
    build: {
      rollupOptions: {
        output: { format: 'cjs' }
      }
    }
  },
  renderer: {
    resolve: { alias },
    plugins: [react(), contentSecurityPolicy()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/renderer/index.html'),
          widget: resolve(__dirname, 'src/renderer/widget.html')
        }
      }
    }
  }
})
