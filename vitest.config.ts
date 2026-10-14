import { resolve } from 'node:path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@renderer': resolve(__dirname, 'src/renderer/src')
    }
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Pin a process timezone so "system local" logic is deterministic; tests that
    // need a different system timezone document it explicitly.
    env: { TZ: 'Africa/Cairo' }
  }
})
