import { contextBridge, ipcRenderer, type IpcRendererEvent } from 'electron'
import { IPC } from '../shared/constants/ipc'
import type { DaywellApi } from '../shared/types/api'

function subscribe<T extends unknown[]>(channel: string, listener: (...args: T) => void): () => void {
  const handler = (_event: IpcRendererEvent, ...args: unknown[]): void => listener(...(args as T))
  ipcRenderer.on(channel, handler)
  return () => ipcRenderer.removeListener(channel, handler)
}

const api: DaywellApi = {
  getSnapshot: () => ipcRenderer.invoke(IPC.getSnapshot),
  updateSettings: (section, patch) => ipcRenderer.invoke(IPC.updateSettings, { section, patch }),
  focus: (command) => ipcRenderer.invoke(IPC.focusCommand, command),
  addWater: (amountMl) => ipcRenderer.invoke(IPC.addWater, amountMl),
  removeWater: (id) => ipcRenderer.invoke(IPC.removeWater, id),
  pauseHydration: (pause) => ipcRenderer.invoke(IPC.pauseHydration, pause),
  showMain: (page) => ipcRenderer.invoke(IPC.showMain, page),
  setFullscreen: (on) => ipcRenderer.invoke(IPC.setFullscreen, on),
  onFullscreenChange: (listener) => subscribe(IPC.fullscreenChanged, listener),
  setWidgetVisible: (visible) => ipcRenderer.invoke(IPC.setWidgetVisible, visible),
  resizeWidget: (width, height) => ipcRenderer.invoke(IPC.resizeWidget, { width, height }),
  pickAsset: (kind) => ipcRenderer.invoke(IPC.pickAsset, kind),
  onSlice: (listener) => subscribe(IPC.sliceChanged, listener),
  onNavigate: (listener) => subscribe(IPC.navigate, listener),
  onPlaySound: (listener) => subscribe(IPC.playSound, listener)
}

contextBridge.exposeInMainWorld('daywell', api)
