import { Droplets, Maximize2, Moon, Timer } from 'lucide-react'
import type { ReactNode } from 'react'
import { formatCountdown } from '@shared/time/format'
import type { Page } from '@shared/types/state'
import { navigate } from '../../app/App'
import { IconButton } from '../../components/Button'
import { ProgressRing } from '../../components/Layout'
import { useT } from '../../hooks/useI18n'
import { useNow } from '../../hooks/useNow'
import { useSettings } from '../../services/store'
import { timeOfDay } from '../../services/text'
import { useFocus } from '../focus/useFocus'
import { useHydration } from '../hydration/useHydration'
import { usePrayerTimes } from '../prayer-times/usePrayerTimes'
import { ClockFace } from './ClockFace'

/** The home screen: the clock first, with a quiet overview of everything else. */
export function ClockPage() {
  return (
    <div className="clock-page">
      <ClockStage />
      <div className="overview">
        <PrayerTile />
        <FocusTile />
        <HydrationTile />
      </div>
    </div>
  )
}

function ClockStage() {
  const t = useT()
  const settings = useSettings()
  const now = useNow(settings.clock.showSeconds || settings.clock.theme === 'flip' ? 'second' : 'minute')
  return (
    <div className="clock-stage">
      <IconButton
        className="clock-stage__fullscreen"
        label={t('fullscreen.enter')}
        icon={<Maximize2 size={16} />}
        onClick={() => void window.daywell.setFullscreen(true)}
      />
      <ClockFace
        now={now}
        clock={settings.clock}
        timeFormat={settings.general.timeFormat}
        language={settings.general.language}
        showDate={settings.clock.showDate}
        variant="stage"
      />
    </div>
  )
}

interface TileProps {
  page: Page
  icon: ReactNode
  label: string
  accent: string
  children: ReactNode
  aside?: ReactNode
}

function Tile({ page, icon, label, accent, children, aside }: TileProps) {
  return (
    <button type="button" className="tile" style={{ '--tile-accent': accent } as React.CSSProperties} onClick={() => navigate(page)}>
      <div className="tile__body">
        <span className="tile__label">
          {icon}
          {label}
        </span>
        {children}
      </div>
      {aside}
    </button>
  )
}

function PrayerTile() {
  const t = useT()
  const now = useNow()
  const settings = useSettings()
  const { next, remainingMs } = usePrayerTimes(now)
  return (
    <Tile page="prayer" icon={<Moon size={14} />} label={t('overview.nextPrayer')} accent="var(--prayer-color)">
      {next ? (
        <>
          <span className="tile__value">
            {t(`prayer.${next.name}`)}
            <span className="tile__meta">{timeOfDay(next.at, settings.general.timeFormat, settings.prayer.timezone)}</span>
          </span>
          <span className="tile__sub tabular">{t('prayer.remaining', { time: formatCountdown(remainingMs ?? 0) })}</span>
        </>
      ) : (
        <span className="tile__sub">{t('overview.noPrayer')}</span>
      )}
    </Tile>
  )
}

function FocusTile() {
  const t = useT()
  const now = useNow()
  const focus = useFocus(now)
  const { state } = focus
  const phase = t(`phase.${state.phase}`)
  const status =
    state.status === 'running'
      ? t('overview.inProgress', { phase, time: formatCountdown(focus.remainingMs) })
      : state.status === 'paused'
        ? t('overview.paused', { phase })
        : t('overview.focusIdle')
  return (
    <Tile
      page="focus"
      icon={<Timer size={14} />}
      label={t('overview.focus')}
      accent="var(--focus-color)"
      aside={
        <ProgressRing value={focus.progress} size={46} stroke={4} color="var(--focus-color)">
          <span />
        </ProgressRing>
      }
    >
      <span className="tile__value tabular">{status}</span>
      <span className="tile__sub">
        {focus.today.completedWork === 1 ? t('overview.sessionToday') : t('overview.sessionsToday', { n: focus.today.completedWork })}
      </span>
    </Tile>
  )
}

function HydrationTile() {
  const t = useT()
  const { progress } = useHydration()
  return (
    <Tile
      page="hydration"
      icon={<Droplets size={14} />}
      label={t('overview.hydration')}
      accent="var(--water-color)"
      aside={
        <ProgressRing value={progress.percent / 100} size={46} stroke={4} color="var(--water-color)">
          <span />
        </ProgressRing>
      }
    >
      <span className="tile__value tabular">
        {t('hydration.ofGoal', { total: progress.totalMl.toLocaleString('en-US'), goal: progress.goalMl.toLocaleString('en-US') })}
      </span>
      <span className="tile__sub tabular">
        {progress.goalReached ? t('hydration.goalReached') : `${progress.percent}%`}
      </span>
    </Tile>
  )
}
