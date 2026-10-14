import { useState, type FormEvent } from 'react'
import { BellOff, BellRing, Droplet, X } from 'lucide-react'
import { isValidIntakeAmount } from '@shared/hydration/totals'
import { parseDateKey } from '@shared/time/dates'
import { formatShortDate } from '@shared/time/format'
import { Button, IconButton } from '../../components/Button'
import { PageHeader, ProgressRing } from '../../components/Layout'
import { useT } from '../../hooks/useI18n'
import { useNow } from '../../hooks/useNow'
import { useSettings } from '../../services/store'
import { timeOfDay } from '../../services/text'
import { useHydration } from './useHydration'

const fmt = (n: number): string => n.toLocaleString('en-US')

export function HydrationPage() {
  const t = useT()
  return (
    <div className="page hydration-page">
      <PageHeader title={t('nav.hydration')} />
      <div className="hydration-layout">
        <IntakeCard />
        <div className="hydration-side">
          <ReminderStatus />
          <TodayEntries />
          <History />
        </div>
      </div>
    </div>
  )
}

function IntakeCard() {
  const t = useT()
  const { progress, settings } = useHydration()
  const [custom, setCustom] = useState('')
  const [error, setError] = useState(false)

  const submitCustom = (event: FormEvent): void => {
    event.preventDefault()
    const amount = Number(custom.trim())
    if (!/^\d+$/.test(custom.trim()) || !isValidIntakeAmount(amount)) {
      setError(true)
      return
    }
    setError(false)
    setCustom('')
    void window.daywell.addWater(amount)
  }

  return (
    <section className="card intake" aria-label={t('hydration.title')}>
      <ProgressRing value={progress.percent / 100} size={240} stroke={10} color="var(--water-color)" label={t('hydration.title')}>
        <Droplet size={22} className="intake__icon" aria-hidden="true" />
        <span className="intake__total tabular">{fmt(progress.totalMl)}</span>
        <span className="intake__goal tabular">/ {t('common.ml', { n: fmt(progress.goalMl) })}</span>
        <span className="intake__percent tabular">{progress.percent}%</span>
      </ProgressRing>
      <p className="intake__remaining">
        {progress.goalReached ? t('hydration.goalReached') : t('hydration.remaining', { n: fmt(progress.remainingMl) })}
      </p>

      <div className="intake__quick" role="group" aria-label={t('hydration.quickAdd')}>
        {settings.quickAddMl.map((amount, index) => (
          <button key={`${amount}-${index}`} type="button" className="quick-add" onClick={() => void window.daywell.addWater(amount)}>
            <span className="quick-add__plus">+</span>
            <span className="tabular">{fmt(amount)}</span>
            <span className="quick-add__unit">ml</span>
          </button>
        ))}
      </div>

      <form className="intake__custom" onSubmit={submitCustom}>
        <label className="visually-hidden" htmlFor="custom-amount">
          {t('hydration.custom')}
        </label>
        <input
          id="custom-amount"
          className="text-field tabular"
          inputMode="numeric"
          placeholder={t('hydration.custom')}
          value={custom}
          aria-invalid={error}
          aria-describedby={error ? 'custom-amount-error' : undefined}
          onChange={(e) => setCustom(e.target.value)}
        />
        <Button type="submit" variant="secondary">
          {t('hydration.add')}
        </Button>
      </form>
      {error && (
        <p id="custom-amount-error" className="form-error" role="alert">
          {t('hydration.invalidAmount')}
        </p>
      )}
    </section>
  )
}

function ReminderStatus() {
  const t = useT()
  useNow('minute')
  const { nextReminderAt, pausedUntil, settings } = useHydration()
  const timeFormat = useSettings().general.timeFormat
  let text: string
  if (!settings.remindersEnabled) text = t('hydration.remindersOff')
  else if (pausedUntil) text = t('hydration.pausedUntil', { time: timeOfDay(pausedUntil, timeFormat) })
  else if (nextReminderAt) text = t('hydration.nextReminder', { time: timeOfDay(nextReminderAt, timeFormat) })
  else text = t('hydration.remindersOff')

  return (
    <div className="reminder-status card">
      <span className="reminder-status__text">
        {pausedUntil || !settings.remindersEnabled ? <BellOff size={16} /> : <BellRing size={16} />}
        {text}
      </span>
      {settings.remindersEnabled && (
        <span className="reminder-status__actions">
          {pausedUntil ? (
            <Button size="sm" variant="ghost" onClick={() => void window.daywell.pauseHydration(null)}>
              {t('hydration.resume')}
            </Button>
          ) : (
            <>
              <Button size="sm" variant="ghost" onClick={() => void window.daywell.pauseHydration(60)}>
                {t('hydration.pause1h')}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => void window.daywell.pauseHydration('tomorrow')}>
                {t('hydration.pauseTomorrow')}
              </Button>
            </>
          )}
        </span>
      )}
    </div>
  )
}

function TodayEntries() {
  const t = useT()
  const { entries } = useHydration()
  const timeFormat = useSettings().general.timeFormat
  return (
    <section aria-labelledby="entries-title">
      <h2 className="list-title" id="entries-title">
        {t('hydration.todayEntries')}
      </h2>
      {entries.length === 0 ? (
        <p className="empty">{t('hydration.noEntries')}</p>
      ) : (
        <ul className="list card entries">
          {entries.map((entry) => (
            <li key={entry.id} className="list__row">
              <span className="list__dot" style={{ background: 'var(--water-color)' }} aria-hidden="true" />
              <span className="list__main tabular">{t('common.ml', { n: fmt(entry.amountMl) })}</span>
              <span className="list__meta tabular">{timeOfDay(entry.recordedAt, timeFormat)}</span>
              <IconButton
                size="sm"
                label={`${t('common.remove')} ${t('common.ml', { n: entry.amountMl })}`}
                icon={<X size={14} />}
                onClick={() => void window.daywell.removeWater(entry.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function History() {
  const t = useT()
  const { history, settings, date } = useHydration()
  const language = useSettings().general.language
  const max = Math.max(settings.dailyGoalMl, ...history.map((d) => d.totalMl))
  return (
    <section aria-labelledby="history-title">
      <h2 className="list-title" id="history-title">
        {t('hydration.history')}
      </h2>
      <div className="history card" style={{ '--goal': settings.dailyGoalMl / max } as React.CSSProperties}>
        <div className="history__goal" aria-hidden="true" />
        <ol className="history__bars">
          {history.map((day) => {
            const { year, month, day: d } = parseDateKey(day.date)
            const label = formatShortDate(new Date(year, month - 1, d), language)
            return (
              <li key={day.date} className={`history__day ${day.date === date ? 'is-today' : ''}`}>
                <span className="history__track">
                  <span
                    className={`history__bar ${day.totalMl >= settings.dailyGoalMl ? 'is-met' : ''}`}
                    style={{ height: `${Math.max(2, (day.totalMl / max) * 100)}%` }}
                    title={`${label}: ${fmt(day.totalMl)} ml`}
                  />
                </span>
                <span className="visually-hidden">{`${label}: ${fmt(day.totalMl)} ml`}</span>
                <span className="history__label" aria-hidden="true">
                  {label.split(/[\s,]/)[0]}
                </span>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
