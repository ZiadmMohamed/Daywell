import type { DaywellApi } from '../shared/types/api'

declare global {
  interface Window {
    daywell: DaywellApi
  }
}

export {}
