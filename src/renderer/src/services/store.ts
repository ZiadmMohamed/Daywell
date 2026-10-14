import { useSyncExternalStore } from 'react'
import type { AppSlices, SliceName } from '@shared/types/state'

/**
 * Renderer-side mirror of main-process state. The main process pushes one
 * slice at a time; only that slice gets a new reference, so components that
 * read other slices do not re-render.
 */
let state: AppSlices | null = null
const listeners = new Set<() => void>()

function emit(): void {
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export async function initStore(): Promise<void> {
  // Updates that arrive before the snapshot are older than it and are dropped.
  window.daywell.onSlice((name, value) => {
    if (!state) return
    state = { ...state, [name]: value }
    emit()
  })
  state = await window.daywell.getSnapshot()
  emit()
}

export function useSlice<K extends SliceName>(name: K): AppSlices[K] {
  return useSyncExternalStore(subscribe, () => {
    if (!state) throw new Error('Store used before initialisation')
    return state[name]
  })
}

export function useSettings(): AppSlices['settings'] {
  return useSlice('settings')
}
