import { useSyncExternalStore } from 'react'

/**
 * One shared ticker for the whole window, aligned to wall-clock seconds. It
 * stops while the window is hidden and while nothing is subscribed, so a hidden
 * app costs no CPU. Components choose the resolution they need; minute-level
 * subscribers re-render once a minute, not every second.
 */
let now = Date.now()
let timer: ReturnType<typeof setTimeout> | null = null
const listeners = new Set<() => void>()

function schedule(): void {
  if (timer !== null || listeners.size === 0 || document.hidden) return
  timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 2)
}

function tick(): void {
  timer = null
  now = Date.now()
  for (const listener of listeners) listener()
  schedule()
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    if (timer !== null) clearTimeout(timer)
    timer = null
  } else {
    tick()
  }
})

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  schedule()
  return () => {
    listeners.delete(listener)
    if (listeners.size === 0 && timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }
}

export function useNow(resolution: 'second' | 'minute' = 'second'): number {
  const step = resolution === 'second' ? 1000 : 60_000
  return useSyncExternalStore(subscribe, () => Math.floor(now / step) * step)
}
