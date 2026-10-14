import type { DailyTotal, HydrationEntry } from '../hydration/totals'
import type { Phase, PomodoroState } from '../pomodoro/machine'
import type { ScheduleWindow } from '../prayer/calc'
import type { Settings } from '../validation/settings'

export interface FocusSessionRecord {
  id: number
  phase: Phase
  startedAt: number
  endedAt: number
  durationSeconds: number
  completed: boolean
}

export interface FocusSlice {
  state: PomodoroState
  today: {
    completedWork: number
    focusSeconds: number
    sessions: FocusSessionRecord[]
  }
}

export interface HydrationSlice {
  /** Today's local date key (system timezone). */
  date: string
  totalMl: number
  entries: HydrationEntry[]
  history: DailyTotal[]
  pausedUntil: number | null
  nextReminderAt: number | null
}

export interface PrayerSlice {
  window: ScheduleWindow
}

export interface AppSlices {
  settings: Settings
  focus: FocusSlice
  hydration: HydrationSlice
  prayer: PrayerSlice
}

export type SliceName = keyof AppSlices

export type Page = 'clock' | 'focus' | 'hydration' | 'prayer' | 'settings'
export const PAGES: readonly Page[] = ['clock', 'focus', 'hydration', 'prayer', 'settings']

export type SoundCue = { kind: 'chime' } | { kind: 'athan'; file: string }
