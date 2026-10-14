import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../validation/settings'
import {
  applyConfig,
  initialState,
  pause,
  pomodoroStateSchema,
  progress,
  reconcile,
  remainingMs,
  reset,
  resume,
  skip,
  start,
  type PomodoroState
} from './machine'

const config = DEFAULT_SETTINGS.focus
const MIN = 60_000
const T0 = Date.UTC(2026, 9, 14, 9, 0)

/** Runs the current phase to completion. */
function finish(state: PomodoroState, cfg = config): PomodoroState {
  const running = state.status === 'running' ? state : start(state, T0)
  return reconcile(running, cfg, running.endsAt!).state
}

describe('starting and timing', () => {
  it('starts a 25-minute work session by default', () => {
    const s = start(initialState(config), T0)
    expect(s).toMatchObject({ phase: 'work', status: 'running', startedAt: T0, endsAt: T0 + 25 * MIN })
    expect(remainingMs(s, T0 + 10 * MIN)).toBe(15 * MIN)
    expect(progress(s, T0 + 5 * MIN)).toBeCloseTo(0.2)
  })

  it('derives remaining time from timestamps, not tick counts', () => {
    const s = start(initialState(config), T0)
    // However irregularly it is observed (throttled renderer, busy system), the answer is the same.
    expect(remainingMs(s, T0 + 24 * MIN + 59_500)).toBe(500)
    expect(remainingMs(s, T0 + 60 * MIN)).toBe(0)
  })
})

describe('pause, resume and reset', () => {
  it('freezes remaining time while paused and continues from it', () => {
    let s = start(initialState(config), T0)
    s = pause(s, T0 + 10 * MIN)
    expect(s.status).toBe('paused')
    expect(remainingMs(s, T0 + 50 * MIN)).toBe(15 * MIN)
    s = resume(s, T0 + 50 * MIN)
    expect(s.endsAt).toBe(T0 + 65 * MIN)
    expect(reconcile(s, config, T0 + 64 * MIN).finished).toBeNull()
    expect(reconcile(s, config, T0 + 65 * MIN).finished).toMatchObject({ phase: 'work', completed: true })
  })

  it('ignores invalid transitions', () => {
    const idle = initialState(config)
    expect(pause(idle, T0)).toBe(idle)
    expect(resume(idle, T0)).toBe(idle)
    const running = start(idle, T0)
    expect(start(running, T0 + MIN)).toBe(running)
  })

  it('reset abandons the session and records it as incomplete', () => {
    const s = start(initialState(config), T0)
    const { state, finished } = reset(s, config, T0 + 7 * MIN)
    expect(state).toEqual(initialState(config))
    expect(finished).toMatchObject({ phase: 'work', completed: false, durationMs: 7 * MIN, endedAt: T0 + 7 * MIN })
  })

  it('reset from idle records nothing', () => {
    expect(reset(initialState(config), config, T0).finished).toBeNull()
  })
})

describe('session transitions', () => {
  it('moves from work to a short break and back', () => {
    let s = finish(initialState(config))
    expect(s).toMatchObject({ phase: 'shortBreak', status: 'idle', completedInCycle: 1, remainingMs: 5 * MIN })
    s = finish(s)
    expect(s).toMatchObject({ phase: 'work', completedInCycle: 1 })
  })

  it('schedules a long break after every fourth work session', () => {
    let s = initialState(config)
    const phases: string[] = []
    for (let i = 0; i < 9; i++) {
      s = finish(s)
      phases.push(s.phase)
    }
    expect(phases).toEqual([
      'shortBreak',
      'work',
      'shortBreak',
      'work',
      'shortBreak',
      'work',
      'longBreak',
      'work',
      'shortBreak'
    ])
  })

  it('respects a custom long-break frequency and durations', () => {
    const custom = { ...config, longBreakEvery: 2, longBreakMinutes: 30 }
    let s = initialState(custom)
    s = finish(finish(finish(s, custom), custom), custom)
    expect(s).toMatchObject({ phase: 'longBreak', remainingMs: 30 * MIN })
    s = finish(s, custom)
    expect(s).toMatchObject({ phase: 'work', completedInCycle: 0 })
  })

  it('skip moves on without counting the session', () => {
    const s = start(initialState(config), T0)
    const { state, finished } = skip(s, config, T0 + 3 * MIN)
    expect(state).toMatchObject({ phase: 'shortBreak', status: 'idle', completedInCycle: 0 })
    expect(finished).toMatchObject({ completed: false, durationMs: 3 * MIN })
  })

  it('auto-starts the next session seamlessly when enabled', () => {
    const auto = { ...config, autoStartNext: true }
    const s = start(initialState(auto), T0)
    const { state } = reconcile(s, auto, T0 + 25 * MIN + 2_000)
    expect(state).toMatchObject({
      phase: 'shortBreak',
      status: 'running',
      startedAt: T0 + 25 * MIN,
      endsAt: T0 + 30 * MIN
    })
  })

  it('applies new durations to a phase that has not started', () => {
    const s = applyConfig(initialState(config), { ...config, workMinutes: 50 })
    expect(s.remainingMs).toBe(50 * MIN)
    const running = start(initialState(config), T0)
    expect(applyConfig(running, { ...config, workMinutes: 50 })).toBe(running)
  })
})

describe('recovery', () => {
  it('after simulated suspension, completes exactly one phase and records its real end time', () => {
    const auto = { ...config, autoStartNext: true }
    const s = start(initialState(auto), T0)
    // The machine slept for three hours, long past several would-be sessions.
    const { state, finished } = reconcile(s, auto, T0 + 3 * 60 * MIN)
    expect(finished).toMatchObject({ phase: 'work', completed: true, endedAt: T0 + 25 * MIN })
    // The next phase is not started in the past, so nothing chains.
    expect(state).toMatchObject({ phase: 'shortBreak', status: 'idle' })
    expect(reconcile(state, auto, T0 + 3 * 60 * MIN).finished).toBeNull()
  })

  it('a running session survives an application restart via its serialized state', () => {
    const s = start(initialState(config), T0)
    const restored = pomodoroStateSchema.parse(JSON.parse(JSON.stringify(s)))
    expect(remainingMs(restored, T0 + 20 * MIN)).toBe(5 * MIN)
    expect(reconcile(restored, config, T0 + 20 * MIN).finished).toBeNull()
  })

  it('a session that ended while the app was closed is completed on restart', () => {
    const s = pomodoroStateSchema.parse(JSON.parse(JSON.stringify(start(initialState(config), T0))))
    const { state, finished } = reconcile(s, config, T0 + 40 * MIN)
    expect(finished).toMatchObject({ completed: true, endedAt: T0 + 25 * MIN })
    expect(state.phase).toBe('shortBreak')
  })

  it('a paused session stays paused across a restart', () => {
    const s = pause(start(initialState(config), T0), T0 + 5 * MIN)
    const restored = pomodoroStateSchema.parse(JSON.parse(JSON.stringify(s)))
    expect(reconcile(restored, config, T0 + 10 * 60 * MIN).finished).toBeNull()
    expect(remainingMs(restored, T0 + 10 * 60 * MIN)).toBe(20 * MIN)
  })
})
