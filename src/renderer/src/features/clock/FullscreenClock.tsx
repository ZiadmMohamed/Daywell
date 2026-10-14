import { useEffect, useState } from 'react'
import { Minimize2 } from 'lucide-react'
import { formatCountdown } from '@shared/time/format'
import { IconButton } from '../../components/Button'
import { useT } from '../../hooks/useI18n'
import { useNow } from '../../hooks/useNow'
import { useSettings } from '../../services/store'
import { timeOfDay } from '../../services/text'
import { useFocus } from '../focus/useFocus'
import { usePrayerTimes } from '../prayer-times/usePrayerTimes'
import { ClockFace } from './ClockFace'

const IDLE_MS = 2500

/**
 * Immersive full-screen clock. Controls and the cursor appear when the mouse
 * moves and fade away when it rests; Esc leaves full screen.
 */
export function FullscreenClock() {
  const t = useT()
  const settings = useSettings()
  const now = useNow()
  const [active, setActive] = useState(true)

  useEffect(() => {
    let timer = setTimeout(() => setActive(false), IDLE_MS)
    const wake = (): void => {
      setActive(true)
      clearTimeout(timer)
      timer = setTimeout(() => setActive(false), IDLE_MS)
    }
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') void window.daywell.setFullscreen(false)
      else wake()
    }
    window.addEventListener('mousemove', wake)
    window.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('mousemove', wake)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  return (
    <div className={`fullscreen ${active ? 'is-active' : ''}`}>
      <ClockFace
        now={now}
        clock={settings.clock}
        timeFormat={settings.general.timeFormat}
        language={settings.general.language}
        showDate={settings.clock.showDate}
        variant="fullscreen"
        footer={<StatusLine now={now} />}
      />
      <div className="fullscreen__controls">
        <span className="fullscreen__hint">{t('fullscreen.hint')}</span>
        <IconButton
          label={t('fullscreen.exit')}
          icon={<Minimize2 size={18} />}
          className="fullscreen__exit"
          onClick={() => void window.daywell.setFullscreen(false)}
        />
      </div>
    </div>
  )
}

/** A quiet line with the next prayer and, if one is in progress, the focus timer. */
function StatusLine({ now }: { now: number }) {
  const t = useT()
  const settings = useSettings()
  const { next, remainingMs } = usePrayerTimes(now)
  const focus = useFocus(now)
  const items: string[] = []
  if (next) {
    items.push(
      t('fullscreen.nextPrayer', {
        prayer: t(`prayer.${next.name}`),
        time: timeOfDay(next.at, settings.general.timeFormat, settings.prayer.timezone),
        countdown: formatCountdown(remainingMs ?? 0)
      })
    )
  }
  if (focus.state.status !== 'idle') {
    items.push(t('fullscreen.focus', { phase: t(`phase.${focus.state.phase}`), time: formatCountdown(focus.remainingMs) }))
  }
  if (items.length === 0) return null
  return (
    <div className="fullscreen__status tabular">
      {items.map((item) => (
        <span key={item.split(' · ')[0]}>{item}</span>
      ))}
    </div>
  )
}
