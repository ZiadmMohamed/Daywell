import { memo, type CSSProperties } from 'react'
import type { Language } from '@shared/i18n'
import { formatClock, formatLongDate, getClockParts, type TimeFormat } from '@shared/time/format'
import type { ClockSettings } from '@shared/validation/settings'
import { assetUrl } from '../../services/sound'
import { FlipCard } from './FlipCard'
import { NatureScene } from './NatureScene'

interface ClockFaceProps {
  now: number
  clock: ClockSettings
  timeFormat: TimeFormat
  language: Language
  showDate: boolean
  variant: 'stage' | 'widget'
}

const FONT_FAMILIES: Record<Exclude<ClockSettings['font'], 'theme'>, string> = {
  inter: "'Inter', sans-serif",
  'space-grotesk': "'Space Grotesk', sans-serif",
  'jetbrains-mono': "'JetBrains Mono', monospace",
  playfair: "'Playfair Display', serif",
  orbitron: "'Orbitron', sans-serif"
}

function faceStyle(clock: ClockSettings, variant: ClockFaceProps['variant']): CSSProperties {
  const style: Record<string, string | number> = { '--clock-scale': variant === 'stage' ? clock.scale : 1 }
  if (clock.font !== 'theme') style['--clock-font'] = FONT_FAMILIES[clock.font]
  if (clock.textColor) style['--clock-color'] = clock.textColor
  if (clock.background === 'solid') style.background = clock.backgroundColor
  if (clock.background === 'image' && clock.backgroundImage) {
    style.backgroundImage = `linear-gradient(rgba(0,0,0,0.28), rgba(0,0,0,0.38)), url("${assetUrl(clock.backgroundImage)}")`
  }
  return style as CSSProperties
}

/** Renders the time in one of the built-in designs. Purely presentational. */
export const ClockFace = memo(function ClockFace({ now, clock, timeFormat, language, showDate, variant }: ClockFaceProps) {
  const date = new Date(now)
  const parts = getClockParts(date, timeFormat)
  const useThemeBackground = clock.background === 'theme' || (clock.background === 'image' && !clock.backgroundImage)
  const classes = [
    'clock',
    `clock--${clock.theme}`,
    `clock--${variant}`,
    useThemeBackground ? 'clock--themed-bg' : `clock--custom-bg clock--bg-${clock.background}`
  ].join(' ')

  return (
    <div className={classes} style={faceStyle(clock, variant)}>
      {clock.theme === 'nature' && useThemeBackground && <NatureScene />}
      <div className="clock__inner">
        <time className="clock__time" dateTime={date.toISOString()} aria-label={formatClock(date, timeFormat, clock.showSeconds)}>
          {clock.theme === 'flip' ? (
            <span className="clock__digits" aria-hidden="true">
              <FlipCard value={parts.hours.padStart(2, '0')} />
              <FlipCard value={parts.minutes} />
              {(clock.showSeconds || parts.period) && (
                <span className="flip-side">
                  {parts.period && <span className="clock__period">{parts.period}</span>}
                  {clock.showSeconds && <FlipCard value={parts.seconds} small />}
                </span>
              )}
            </span>
          ) : (
            <span className="clock__digits" aria-hidden="true">
              <span className="clock__hm">
                {parts.hours}
                <span className="clock__sep">:</span>
                {parts.minutes}
              </span>
              {clock.showSeconds && <span className="clock__seconds">{parts.seconds}</span>}
            </span>
          )}
          {parts.period && clock.theme !== 'flip' && (
            <span className="clock__period" aria-hidden="true">
              {parts.period}
            </span>
          )}
        </time>
        {showDate && <div className="clock__date">{formatLongDate(date, language)}</div>}
      </div>
    </div>
  )
})
