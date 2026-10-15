import { z } from 'zod'
import { PAGES } from '../types/state'
import { SETTINGS_SECTIONS } from './settings'

export const updateSettingsInput = z.object({
  section: z.enum(SETTINGS_SECTIONS as [string, ...string[]]),
  patch: z.record(z.string(), z.unknown())
})

export const focusCommandInput = z.enum(['start', 'pause', 'resume', 'reset', 'skip'])
export type FocusCommand = z.infer<typeof focusCommandInput>

export const addWaterInput = z.number().int().min(1).max(5000)
export const removeWaterInput = z.number().int().positive()
/** Minutes to pause for, 'tomorrow' to pause until the next morning, or null to resume. */
export const pauseHydrationInput = z.union([z.number().int().min(1).max(24 * 60), z.literal('tomorrow'), z.null()])
export const showMainInput = z.enum(PAGES as unknown as [string, ...string[]]).optional()
export const setWidgetVisibleInput = z.boolean()
export const pickAssetInput = z.enum(['background', 'athan'])
export type AssetKind = z.infer<typeof pickAssetInput>
export const resizeWidgetInput = z.object({
  width: z.number().int().min(180).max(1600),
  height: z.number().int().min(80).max(1000)
})
export const setFullscreenInput = z.boolean()
