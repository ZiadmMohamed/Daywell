/**
 * Pure Pomodoro state machine. Time is never counted down by ticks: a running
 * phase stores the absolute `endsAt` timestamp and remaining time is derived
 * from the current clock. Every transition takes `now` explicitly, which makes
 * suspension, restarts and throttling straightforward to reason about and test.
 */
import { z } from 'zod'
import type { FocusSettings } from '../validation/settings'
import { MISSED_EVENT_GRACE_MS } from '../constants/timing'

export const PHASES = ['work', 'shortBreak', 'longBreak'] as const
export type Phase = (typeof PHASES)[number]

export const pomodoroStateSchema = z.object({
  phase: z.enum(PHASES),
  status: z.enum(['idle', 'running', 'paused']),
  /** When the current phase was first started (null until started). */
  startedAt: z.number().nullable(),
  /** Absolute end time while running. */
  endsAt: z.number().nullable(),
  /** Remaining time while idle or paused. */
  remainingMs: z.number().nonnegative(),
  /** Total length of the current phase. */
  durationMs: z.number().positive(),
  /** Work sessions completed in the current cycle (resets after a long break). */
  completedInCycle: z.number().int().nonnegative()
})
export type PomodoroState = z.infer<typeof pomodoroStateSchema>

export interface FinishedSession {
  phase: Phase
  startedAt: number
  endedAt: number
  /** Time actually spent in the phase, excluding pauses. */
  durationMs: number
  completed: boolean
}

export interface Transition {
  state: PomodoroState
  /** Session to record, if one finished or was abandoned. */
  finished: FinishedSession | null
}

export function phaseDurationMs(phase: Phase, config: FocusSettings): number {
  const minutes =
    phase === 'work' ? config.workMinutes : phase === 'shortBreak' ? config.shortBreakMinutes : config.longBreakMinutes
  return minutes * 60_000
}

export function initialState(config: FocusSettings): PomodoroState {
  return idleState('work', 0, config)
}

function idleState(phase: Phase, completedInCycle: number, config: FocusSettings): PomodoroState {
  const durationMs = phaseDurationMs(phase, config)
  return { phase, status: 'idle', startedAt: null, endsAt: null, remainingMs: durationMs, durationMs, completedInCycle }
}

export function remainingMs(state: PomodoroState, now: number): number {
  if (state.status === 'running' && state.endsAt !== null) return Math.max(0, state.endsAt - now)
  return state.remainingMs
}

/** Fraction of the current phase elapsed, 0..1. */
export function progress(state: PomodoroState, now: number): number {
  return Math.min(1, Math.max(0, 1 - remainingMs(state, now) / state.durationMs))
}

/** The phase that follows `phase`, given the cycle count after it finished. */
export function nextPhase(phase: Phase, completedInCycle: number, config: FocusSettings): Phase {
  if (phase !== 'work') return 'work'
  return completedInCycle > 0 && completedInCycle % config.longBreakEvery === 0 ? 'longBreak' : 'shortBreak'
}

export function start(state: PomodoroState, now: number): PomodoroState {
  if (state.status !== 'idle') return state
  return { ...state, status: 'running', startedAt: now, endsAt: now + state.remainingMs }
}

export function pause(state: PomodoroState, now: number): PomodoroState {
  if (state.status !== 'running' || state.endsAt === null) return state
  return { ...state, status: 'paused', endsAt: null, remainingMs: Math.max(0, state.endsAt - now) }
}

export function resume(state: PomodoroState, now: number): PomodoroState {
  if (state.status !== 'paused') return state
  return { ...state, status: 'running', endsAt: now + state.remainingMs }
}

function abandoned(state: PomodoroState, now: number): FinishedSession | null {
  if (state.status === 'idle' || state.startedAt === null) return null
  return {
    phase: state.phase,
    startedAt: state.startedAt,
    endedAt: now,
    durationMs: Math.max(0, state.durationMs - remainingMs(state, now)),
    completed: false
  }
}

/** Abandons the current session and returns to the start of a fresh cycle. */
export function reset(state: PomodoroState, config: FocusSettings, now: number): Transition {
  return { state: initialState(config), finished: abandoned(state, now) }
}

/** Abandons the current phase and moves to the next one. */
export function skip(state: PomodoroState, config: FocusSettings, now: number): Transition {
  const next = nextPhase(state.phase, state.completedInCycle, config)
  const completedInCycle = state.phase === 'longBreak' ? 0 : state.completedInCycle
  let nextState = idleState(next, completedInCycle, config)
  if (config.autoStartNext) nextState = start(nextState, now)
  return { state: nextState, finished: abandoned(state, now) }
}

/**
 * Advances a running phase whose end time has passed. If the app was suspended
 * or closed well past the end, the next phase is left idle rather than started
 * in the past, so at most one phase is ever completed per reconciliation and a
 * long sleep never silently chains several sessions.
 */
export function reconcile(state: PomodoroState, config: FocusSettings, now: number): Transition {
  if (state.status !== 'running' || state.endsAt === null || now < state.endsAt) {
    return { state, finished: null }
  }
  const endedAt = state.endsAt
  const finished: FinishedSession = {
    phase: state.phase,
    startedAt: state.startedAt ?? endedAt - state.durationMs,
    endedAt,
    durationMs: state.durationMs,
    completed: true
  }
  const completedInCycle =
    state.phase === 'work' ? state.completedInCycle + 1 : state.phase === 'longBreak' ? 0 : state.completedInCycle
  const next = nextPhase(state.phase, completedInCycle, config)
  let nextState = idleState(next, completedInCycle, config)
  if (config.autoStartNext) {
    // Continue seamlessly from the previous end if we noticed promptly;
    // otherwise wait for the user rather than starting a session they missed.
    const onTime = now - endedAt <= MISSED_EVENT_GRACE_MS && now < endedAt + nextState.durationMs
    if (onTime) nextState = start(nextState, endedAt)
  }
  return { state: nextState, finished }
}

/** Applies changed durations to a phase that has not started yet. */
export function applyConfig(state: PomodoroState, config: FocusSettings): PomodoroState {
  if (state.status !== 'idle') return state
  return idleState(state.phase, state.completedInCycle, config)
}
