const cache = new Map<string, boolean>()

export function isValidTimeZone(zone: string): boolean {
  const known = cache.get(zone)
  if (known !== undefined) return known
  let valid: boolean
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone })
    valid = zone.length > 0
  } catch {
    valid = false
  }
  cache.set(zone, valid)
  return valid
}

export function systemTimeZone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone
}

export function listTimeZones(): string[] {
  const intl = Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }
  return intl.supportedValuesOf ? intl.supportedValuesOf('timeZone') : ['UTC']
}
