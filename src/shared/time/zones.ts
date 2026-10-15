/**
 * Only valid zones are cached: there are a few hundred of them, whereas invalid
 * input (e.g. from IPC) is unbounded and must not grow the cache.
 */
const validZones = new Set<string>()

export function isValidTimeZone(zone: string): boolean {
  if (validZones.has(zone)) return true
  if (zone.length === 0 || zone.length > 64) return false
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
  } catch {
    return false
  }
  validZones.add(zone)
  return true
}

export function systemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function listTimeZones(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
  return intl.supportedValuesOf ? intl.supportedValuesOf('timeZone') : ['UTC']
}
