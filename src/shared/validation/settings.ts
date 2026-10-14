import { z } from 'zod'
import { CLOCK_FONTS, CLOCK_THEMES } from '../constants/clock'
import { CALCULATION_METHODS } from '../constants/prayer'
import { isValidTimeZone } from '../time/zones'

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Expected HH:MM')
const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Expected #RRGGBB')
const assetName = z.string().regex(/^[a-z0-9-]{1,64}\.(png|jpe?g|webp|mp3|ogg|wav|m4a)$/)

export const quietHoursSchema = z.object({
  enabled: z.boolean(),
  start: hhmm,
  end: hhmm
})

export const generalSchema = z.object({
  launchAtStartup: z.boolean(),
  minimizeToTray: z.boolean(),
  theme: z.enum(['system', 'light', 'dark']),
  language: z.enum(['en', 'ar']),
  timeFormat: z.enum(['12h', '24h'])
})

export const clockSchema = z.object({
  theme: z.enum(CLOCK_THEMES),
  font: z.enum(CLOCK_FONTS),
  textColor: hexColor.nullable(),
  background: z.enum(['theme', 'solid', 'image']),
  backgroundColor: hexColor,
  backgroundImage: assetName.nullable(),
  showSeconds: z.boolean(),
  showDate: z.boolean(),
  scale: z.number().min(0.6).max(1.6)
})

export const widgetSchema = z.object({
  visible: z.boolean(),
  alwaysOnTop: z.boolean(),
  opacity: z.number().min(0.3).max(1),
  clickThrough: z.boolean(),
  showDate: z.boolean()
})

export const focusSchema = z.object({
  workMinutes: z.number().int().min(1).max(180),
  shortBreakMinutes: z.number().int().min(1).max(60),
  longBreakMinutes: z.number().int().min(1).max(120),
  longBreakEvery: z.number().int().min(2).max(12),
  autoStartNext: z.boolean(),
  soundEnabled: z.boolean(),
  notificationsEnabled: z.boolean()
})

export const hydrationSchema = z.object({
  dailyGoalMl: z.number().int().min(250).max(10000),
  quickAddMl: z.array(z.number().int().min(10).max(2000)).min(1).max(5),
  remindersEnabled: z.boolean(),
  reminderIntervalMinutes: z.number().int().min(15).max(480),
  quietHours: quietHoursSchema
})

const prayerFlags = z.object({
  fajr: z.boolean(),
  dhuhr: z.boolean(),
  asr: z.boolean(),
  maghrib: z.boolean(),
  isha: z.boolean()
})

const adjustment = z.number().int().min(-60).max(60)

export const prayerSchema = z.object({
  cityId: z.string().max(64).nullable(),
  locationName: z.string().min(1).max(80),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  timezone: z.string().refine(isValidTimeZone, 'Unknown timezone'),
  method: z.enum(CALCULATION_METHODS),
  madhab: z.enum(['shafi', 'hanafi']),
  highLatitudeRule: z.enum(['auto', 'middleofthenight', 'seventhofthenight', 'twilightangle']),
  adjustments: z.object({
    fajr: adjustment,
    dhuhr: adjustment,
    asr: adjustment,
    maghrib: adjustment,
    isha: adjustment
  }),
  notificationsEnabled: z.boolean(),
  notifyAt: prayerFlags,
  reminderBefore: z.boolean(),
  reminderLeadMinutes: z.number().int().min(1).max(60),
  quietHours: quietHoursSchema,
  athanEnabled: z.boolean(),
  athanFile: assetName.nullable()
})

export const settingsSchema = z.object({
  general: generalSchema,
  clock: clockSchema,
  widget: widgetSchema,
  focus: focusSchema,
  hydration: hydrationSchema,
  prayer: prayerSchema
})

export type GeneralSettings = z.infer<typeof generalSchema>
export type ClockSettings = z.infer<typeof clockSchema>
export type WidgetSettings = z.infer<typeof widgetSchema>
export type FocusSettings = z.infer<typeof focusSchema>
export type HydrationSettings = z.infer<typeof hydrationSchema>
export type PrayerSettings = z.infer<typeof prayerSchema>
export type QuietHours = z.infer<typeof quietHoursSchema>
export type Settings = z.infer<typeof settingsSchema>
export type SettingsSection = keyof Settings

export const SETTINGS_SECTIONS = Object.keys(settingsSchema.shape) as SettingsSection[]

export const DEFAULT_SETTINGS: Settings = {
  general: {
    launchAtStartup: false,
    minimizeToTray: true,
    theme: 'system',
    language: 'en',
    timeFormat: '12h'
  },
  clock: {
    theme: 'minimal',
    font: 'theme',
    textColor: null,
    background: 'theme',
    backgroundColor: '#101418',
    backgroundImage: null,
    showSeconds: true,
    showDate: true,
    scale: 1
  },
  widget: {
    visible: false,
    alwaysOnTop: true,
    opacity: 0.95,
    clickThrough: false,
    showDate: true
  },
  focus: {
    workMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakEvery: 4,
    autoStartNext: false,
    soundEnabled: true,
    notificationsEnabled: true
  },
  hydration: {
    dailyGoalMl: 2000,
    quickAddMl: [150, 250, 500],
    remindersEnabled: true,
    reminderIntervalMinutes: 60,
    quietHours: { enabled: true, start: '22:00', end: '08:00' }
  },
  prayer: {
    cityId: 'alexandria',
    locationName: 'Alexandria, Egypt',
    latitude: 31.2001,
    longitude: 29.9187,
    timezone: 'Africa/Cairo',
    method: 'Egyptian',
    madhab: 'shafi',
    highLatitudeRule: 'auto',
    adjustments: { fajr: 0, dhuhr: 0, asr: 0, maghrib: 0, isha: 0 },
    notificationsEnabled: true,
    notifyAt: { fajr: true, dhuhr: true, asr: true, maghrib: true, isha: true },
    reminderBefore: false,
    reminderLeadMinutes: 10,
    quietHours: { enabled: false, start: '23:00', end: '04:00' },
    athanEnabled: false,
    athanFile: null
  }
}

/**
 * Reads a persisted settings section leniently: every field that is missing or
 * invalid falls back to its default, so a corrupt or older value never crashes
 * the app and never silently replaces the other, valid fields.
 */
export function coerceSection<K extends SettingsSection>(section: K, raw: unknown): Settings[K] {
  const defaults = DEFAULT_SETTINGS[section]
  const shape = settingsSchema.shape[section].shape as Record<string, z.ZodType>
  const source = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {}
  const result: Record<string, unknown> = {}
  for (const [key, fallback] of Object.entries(defaults)) {
    const parsed = shape[key]?.safeParse(source[key])
    result[key] = parsed?.success ? parsed.data : fallback
  }
  return result as Settings[K]
}

/** Strictly validates a patch applied on top of the current section. */
export function applySectionPatch<K extends SettingsSection>(
  section: K,
  current: Settings[K],
  patch: unknown
): Settings[K] {
  if (!patch || typeof patch !== 'object' || Array.isArray(patch)) {
    throw new Error('Settings patch must be an object')
  }
  const schema = settingsSchema.shape[section].strict()
  return schema.parse({ ...current, ...patch }) as Settings[K]
}
