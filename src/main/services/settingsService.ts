import {
  applySectionPatch,
  coerceSection,
  SETTINGS_SECTIONS,
  type Settings,
  type SettingsSection
} from '@shared/validation/settings'
import type { KeyValueRepository } from '../database/repositories'

type Listener = (section: SettingsSection, settings: Settings) => void

/** Owns user preferences: loads them leniently, updates them strictly, persists and announces changes. */
export class SettingsService {
  private current: Settings
  private readonly listeners = new Set<Listener>()

  constructor(private readonly repo: KeyValueRepository) {
    const loaded = {} as Record<SettingsSection, unknown>
    for (const section of SETTINGS_SECTIONS) loaded[section] = coerceSection(section, repo.get(section))
    this.current = loaded as Settings
  }

  get all(): Settings {
    return this.current
  }

  get<K extends SettingsSection>(section: K): Settings[K] {
    return this.current[section]
  }

  update<K extends SettingsSection>(section: K, patch: unknown): Settings[K] {
    const next = applySectionPatch(section, this.current[section], patch)
    this.current = { ...this.current, [section]: next }
    this.repo.set(section, next)
    for (const listener of this.listeners) listener(section, this.current)
    return next
  }

  onChange(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }
}
