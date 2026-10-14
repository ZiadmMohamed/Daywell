import { Fragment } from 'react'
import { MapPin, Sunrise } from 'lucide-react'
import { PRAYER_NAMES } from '@shared/constants/prayer'
import { zonedDateKey } from '@shared/time/dates'
import { formatCountdown } from '@shared/time/format'
import { PageHeader } from '../../components/Layout'
import { useT } from '../../hooks/useI18n'
import { useNow } from '../../hooks/useNow'
import { useSettings } from '../../services/store'
import { timeOfDay } from '../../services/text'
import { usePrayerTimes } from './usePrayerTimes'

export function PrayerPage() {
  const t = useT()
  const prayer = useSettings().prayer
  return (
    <div className="page prayer-page">
      <PageHeader title={t('nav.prayer')}>
        <span className="location-chip">
          <MapPin size={14} aria-hidden="true" />
          {t('prayer.location', { location: prayer.locationName, timezone: prayer.timezone })}
        </span>
      </PageHeader>
      <div className="prayer-layout">
        <NextPrayer />
        <Schedule />
      </div>
      <p className="disclaimer">{t('prayer.disclaimer', { method: t(`method.${prayer.method}`) })}</p>
    </div>
  )
}

function NextPrayer() {
  const t = useT()
  const now = useNow()
  const settings = useSettings()
  const { next, remainingMs } = usePrayerTimes(now)
  const tz = settings.prayer.timezone
  const isTomorrow = next !== null && next.date !== zonedDateKey(now, tz)
  return (
    <section className="next-prayer card" aria-labelledby="next-prayer-label">
      <span className="next-prayer__eyebrow" id="next-prayer-label">
        {t('prayer.next')}
      </span>
      {next ? (
        <>
          <span className="next-prayer__name">{t(`prayer.${next.name}`)}</span>
          <span className="next-prayer__countdown tabular" role="timer">
            {formatCountdown(remainingMs ?? 0)}
          </span>
          <span className="next-prayer__at tabular">
            {timeOfDay(next.at, settings.general.timeFormat, tz)}
            {isTomorrow && ` · ${t('prayer.tomorrow')}`}
          </span>
        </>
      ) : (
        <span className="next-prayer__name">{t('common.unavailable')}</span>
      )}
    </section>
  )
}

function Schedule() {
  const t = useT()
  const now = useNow('minute')
  const settings = useSettings()
  const { today, statuses, hasUnavailable } = usePrayerTimes(now)
  const tz = settings.prayer.timezone
  const format = settings.general.timeFormat
  return (
    <section className="schedule" aria-labelledby="schedule-title">
      <h2 className="list-title" id="schedule-title">
        {t('prayer.schedule')}
      </h2>
      <ul className="list card schedule__list">
        {PRAYER_NAMES.map((name) => {
          const at = today.times[name]
          const status = statuses[name]
          return (
            <Fragment key={name}>
              <li className={`schedule__row is-${status}`} aria-current={status === 'next' ? 'time' : undefined}>
                <span className="schedule__name">{t(`prayer.${name}`)}</span>
                {(status === 'current' || status === 'next' || status === 'unavailable') && (
                  <span className="schedule__status">{t(`prayer.status.${status}`)}</span>
                )}
                <span className="schedule__time tabular">{at === null ? '—' : timeOfDay(at, format, tz)}</span>
              </li>
              {name === 'fajr' && today.sunrise !== null && (
                <li className="schedule__row schedule__row--info">
                  <span className="schedule__name">
                    <Sunrise size={14} aria-hidden="true" />
                    {t('prayer.sunrise')}
                  </span>
                  <span className="schedule__time tabular">{timeOfDay(today.sunrise, format, tz)}</span>
                </li>
              )}
            </Fragment>
          )
        })}
      </ul>
      {hasUnavailable && (
        <p className="form-error" role="status">
          {t('prayer.unavailableDay')}
        </p>
      )}
    </section>
  )
}
