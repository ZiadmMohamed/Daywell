import { progress, remainingMs } from '@shared/pomodoro/machine'
import { useSlice } from '../../services/store'

/** Live view of the focus timer, computed from timestamps on every render. */
export function useFocus(now: number) {
  const focus = useSlice('focus')
  const { state } = focus
  return {
    ...focus,
    remainingMs: remainingMs(state, now),
    progress: progress(state, now)
  }
}
