import * as machine from '@shared/pomodoro/machine'
import type { PomodoroState } from '@shared/pomodoro/machine'
import type { ScheduledEvent } from '@shared/scheduling/events'
import { localDateKey } from '@shared/time/dates'
import type { FocusSlice } from '@shared/types/state'
import type { FocusCommand } from '@shared/validation/ipc'
import type { FocusSettings } from '@shared/validation/settings'
import type { FocusRepository, KeyValueRepository } from '../database/repositories'
import type { SchedulerSource } from '../notifications/scheduler'

const STATE_KEY = 'pomodoro'

/**
 * Holds the authoritative Pomodoro state in the main process, so it keeps
 * running with every window hidden. The scheduler wakes it exactly at the end
 * of each phase; the state itself is persisted on every transition.
 */
export class PomodoroService implements SchedulerSource {
  readonly name = 'focus' as const
  private state: PomodoroState

  constructor(
    private readonly stateRepo: KeyValueRepository,
    private readonly sessions: FocusRepository,
    private readonly config: () => FocusSettings,
    private readonly onChange: () => void
  ) {
    const parsed = machine.pomodoroStateSchema.safeParse(stateRepo.get(STATE_KEY))
    this.state = parsed.success ? machine.applyConfig(parsed.data, config()) : machine.initialState(config())
  }

  get current(): PomodoroState {
    return this.state
  }

  command(command: FocusCommand, now: number): void {
    const config = this.config()
    // Settle any phase that already ended before applying the user's action.
    this.reconcile(now)
    switch (command) {
      case 'start':
        this.commit(machine.start(this.state, now))
        break
      case 'pause':
        this.commit(machine.pause(this.state, now))
        break
      case 'resume':
        this.commit(machine.resume(this.state, now))
        break
      case 'reset':
        this.apply(machine.reset(this.state, config, now))
        break
      case 'skip':
        this.apply(machine.skip(this.state, config, now))
        break
    }
  }

  /** Toggle used by the tray: start, pause or resume as appropriate. */
  toggle(now: number): void {
    const status = this.state.status
    this.command(status === 'running' ? 'pause' : status === 'paused' ? 'resume' : 'start', now)
  }

  onSettingsChanged(): void {
    this.commit(machine.applyConfig(this.state, this.config()))
  }

  plan(): ScheduledEvent[] {
    const s = this.state
    if (s.status !== 'running' || s.endsAt === null || s.startedAt === null) return []
    const config = this.config()
    const completed = s.phase === 'work' ? s.completedInCycle + 1 : s.completedInCycle
    return [
      {
        id: `focus:${s.startedAt}:${s.phase}`,
        at: s.endsAt,
        source: 'focus',
        missedPolicy: 'deliverLate',
        notify: config.notificationsEnabled,
        payload: { kind: 'focus-end', phase: s.phase, nextPhase: machine.nextPhase(s.phase, completed, config) }
      }
    ]
  }

  onEvent(_event: ScheduledEvent, now: number): void {
    this.reconcile(now)
  }

  slice(now: number): FocusSlice {
    const sessions = this.sessions.listForDate(localDateKey(now))
    const work = sessions.filter((s) => s.phase === 'work' && s.completed)
    return {
      state: this.state,
      today: {
        completedWork: work.length,
        focusSeconds: work.reduce((sum, s) => sum + s.durationSeconds, 0),
        sessions
      }
    }
  }

  private reconcile(now: number): void {
    this.apply(machine.reconcile(this.state, this.config(), now))
  }

  private apply(transition: machine.Transition): void {
    if (transition.finished) {
      this.sessions.insert(transition.finished, localDateKey(transition.finished.startedAt))
    }
    this.commit(transition.state, transition.finished !== null)
  }

  private commit(next: PomodoroState, force = false): void {
    if (next === this.state && !force) return
    this.state = next
    this.stateRepo.set(STATE_KEY, next)
    this.onChange()
  }
}
