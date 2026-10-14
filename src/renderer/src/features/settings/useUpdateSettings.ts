import { useCallback } from 'react'
import type { Settings, SettingsSection } from '@shared/validation/settings'

/**
 * Returns an updater for one settings section. The main process validates and
 * persists every change, then pushes the new settings back to all windows.
 */
export function useUpdateSettings<K extends SettingsSection>(section: K) {
  return useCallback(
    (patch: Partial<Settings[K]>) => {
      window.daywell.updateSettings(section, patch).catch((error: unknown) => {
        console.warn(`Settings update rejected for ${section}`, error)
      })
    },
    [section]
  )
}
