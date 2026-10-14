import { Pause, Play, RotateCcw, SkipForward } from 'lucide-react'
import { formatCountdown, formatMinutesSummary } from '@shared/time/format'
import type { FocusSessionRecord } from '@shared/types/state'
import { Button, IconButton } from '../../components/Button'
import { PageHeader, ProgressRing } from '../../components/Layout'
import { useT } from '../../hooks/useI18n'
import { useNow } from '../../hooks/useNow'
import { useSettings, useSlice } from '../../services/store'
import { timeOfDay } from '../../services/text'
import { useFocus } from './useFocus'

const PHASE_COLORS = {
  work: 'var(--focus-color)',
  shortBreak: 'var(--accent)',
  longBreak: 'var(--water-color)'
} as const

export function FocusPage() {
  const t = useT()
  return (
    <div className="page focus-page">
      <PageHeader title={t('nav.focus')} />
      <div className="focus-layout">
        <FocusTimer />
        <FocusSummary />
      </div>
    </div>
  )
}

function FocusTimer() {
  const t = useT()
  const now = useNow()
  const settings = useSettings().focus
  const { state, remainingMs, progress } = useFocus(now)
  const color = PHASE_COLORS[state.phase]
  const cyclePosition = state.phase === 'work' ? state.completedInCycle + 1 : state.completedInCycle

  return (
    <section className="card focus-timer" aria-label={t('nav.focus')}>
      <ProgressRing value={progress} size={300} stroke={8} color={color}>
        <span className="focus-timer__phase" style={{ color }}>
          {t(`phase.${state.phase}`)}
        </span>
        <span className="focus-timer__time tabular" role="timer" aria-live="off">
          {formatCountdown(remainingMs)}
        </span>
        <span className="focus-timer__cycle">
          {t('focus.cycle', { n: Math.min(Math.max(cyclePosition, 1), settings.longBreakEvery), total: settings.longBreakEvery })}
        </span>
      </ProgressRing>

      <div className="cycle-dots" aria-hidden="true">
        {Array.from({ length: settings.longBreakEvery }, (_, i) => (
          <span key={i} className={`cycle-dots__dot ${i < state.completedInCycle ? 'is-done' : ''}`} />
        ))}
      </div>

      <div className="focus-timer__controls">
        <IconButton label={t('focus.reset')} icon={<RotateCcw size={18} />} size="lg" onClick={() => void window.daywell.focus('reset')} />
        {state.status === 'running' ? (
          <Button variant="primary" size="lg" icon={<Pause size={18} />} onClick={() => void window.daywell.focus('pause')}>
            {t('focus.pause')}
          </Button>
        ) : (
          <Button
            variant="primary"
            size="lg"
            icon={<Play size={18} />}
            onClick={() => void window.daywell.focus(state.status === 'paused' ? 'resume' : 'start')}
          >
            {state.status === 'paused' ? t('focus.resume') : t('focus.start')}
          </Button>
        )}
        <IconButton label={t('focus.skip')} icon={<SkipForward size={18} />} size="lg" onClick={() => void window.daywell.focus('skip')} />
      </div>
      {settings.autoStartNext && <p className="focus-timer__note">{t('focus.autoStartOn')}</p>}
    </section>
  )
}

function FocusSummary() {
  const t = useT()
  const { today } = useSlice('focus')
  const settings = useSettings()
  const total = formatMinutesSummary(today.focusSeconds)
  return (
    <section className="focus-summary" aria-label={t('focus.today')}>
      <div className="stats">
        <div className="stat card">
          <span className="stat__value tabular">{today.completedWork}</span>
          <span className="stat__label">{t('focus.completedSessions')}</span>
        </div>
        <div className="stat card">
          <span className="stat__value tabular">
            {total.hours > 0 ? t('common.hoursMinutes', { h: total.hours, m: total.minutes }) : t('common.minutesOnly', { m: total.minutes })}
          </span>
          <span className="stat__label">{t('focus.focusTime')}</span>
        </div>
      </div>
      <h2 className="list-title">{t('focus.history')}</h2>
      {today.sessions.length === 0 ? (
        <p className="empty">{t('focus.noSessions')}</p>
      ) : (
        <ul className="list card">
          {today.sessions.map((session) => (
            <SessionRow key={session.id} session={session} timeFormat={settings.general.timeFormat} />
          ))}
        </ul>
      )}
    </section>
  )
}

function SessionRow({ session, timeFormat }: { session: FocusSessionRecord; timeFormat: '12h' | '24h' }) {
  const t = useT()
  return (
    <li className="list__row">
      <span className="list__dot" style={{ background: PHASE_COLORS[session.phase] }} aria-hidden="true" />
      <span className="list__main">{t(`phase.${session.phase}`)}</span>
      <span className="list__meta tabular">
        {timeOfDay(session.startedAt, timeFormat)} · {t('common.minutesOnly', { m: Math.round(session.durationSeconds / 60) })}
      </span>
      <span className={`badge ${session.completed ? 'badge--ok' : ''}`}>{session.completed ? t('focus.completed') : t('focus.stopped')}</span>
    </li>
  )
}
