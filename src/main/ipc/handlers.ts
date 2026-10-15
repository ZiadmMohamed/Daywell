import { ipcMain, type IpcMainInvokeEvent } from 'electron'
import { z } from 'zod'
import { IPC } from '@shared/constants/ipc'
import type { AppSlices, Page } from '@shared/types/state'
import {
  addWaterInput,
  focusCommandInput,
  pauseHydrationInput,
  pickAssetInput,
  removeWaterInput,
  resizeWidgetInput,
  setFullscreenInput,
  setWidgetVisibleInput,
  showMainInput,
  updateSettingsInput,
  type AssetKind,
  type FocusCommand
} from '@shared/validation/ipc'
import type { SettingsSection } from '@shared/validation/settings'
import { log } from '../app/log'
import { isAppUrl } from '../windows/security'

const noInput = z.undefined()

export interface IpcBackend {
  snapshot(): AppSlices
  updateSettings(section: SettingsSection, patch: Record<string, unknown>): unknown
  focus(command: FocusCommand): void
  addWater(amountMl: number): void
  removeWater(id: number): void
  pauseHydration(pause: number | 'tomorrow' | null): void
  showMain(page?: Page): void
  setFullscreen(on: boolean): void
  setWidgetVisible(visible: boolean): void
  resizeWidget(width: number, height: number): void
  pickAsset(kind: AssetKind): Promise<string | null>
}

/**
 * Registers a handler whose payload is validated before it reaches the backend.
 * Requests from anything other than our own pages are rejected.
 */
function handle<S extends z.ZodType>(
  channel: string,
  schema: S,
  run: (input: z.infer<S>) => unknown
): void {
  ipcMain.handle(channel, async (event: IpcMainInvokeEvent, raw: unknown) => {
    const origin = event.senderFrame?.url ?? ''
    if (!isAppUrl(origin)) {
      log.warn(`Rejected IPC on ${channel} from an unexpected origin`)
      throw new Error('Forbidden')
    }
    const parsed = schema.safeParse(raw)
    if (!parsed.success) {
      log.warn(`Rejected invalid IPC payload on ${channel}`)
      throw new Error('Invalid request')
    }
    return run(parsed.data)
  })
}

export function registerIpc(backend: IpcBackend): void {
  handle(IPC.getSnapshot, noInput, () => backend.snapshot())
  handle(IPC.updateSettings, updateSettingsInput, ({ section, patch }) =>
    backend.updateSettings(section as SettingsSection, patch)
  )
  handle(IPC.focusCommand, focusCommandInput, (command) => backend.focus(command))
  handle(IPC.addWater, addWaterInput, (amount) => backend.addWater(amount))
  handle(IPC.removeWater, removeWaterInput, (id) => backend.removeWater(id))
  handle(IPC.pauseHydration, pauseHydrationInput, (pause) => backend.pauseHydration(pause))
  handle(IPC.showMain, showMainInput, (page) => backend.showMain(page as Page | undefined))
  handle(IPC.setFullscreen, setFullscreenInput, (on) => backend.setFullscreen(on))
  handle(IPC.setWidgetVisible, setWidgetVisibleInput, (visible) => backend.setWidgetVisible(visible))
  handle(IPC.resizeWidget, resizeWidgetInput, ({ width, height }) => backend.resizeWidget(width, height))
  handle(IPC.pickAsset, pickAssetInput, (kind) => backend.pickAsset(kind))
}
