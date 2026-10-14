import { useEffect, useMemo, useState } from 'react'
import { Music } from 'lucide-react'
import { CALCULATION_METHODS, PRAYER_NAMES } from '@shared/constants/prayer'
import { CITIES, findCity } from '@shared/prayer/cities'
import { listTimeZones } from '@shared/time/zones'
import type { PrayerSettings } from '@shared/validation/settings'
import { Button } from '../../components/Button'
import { NumberField, Segmented, Select, Toggle } from '../../components/Controls'
import { Field, Section } from '../../components/Layout'
import { useT } from '../../hooks/useI18n'
import { useSettings } from '../../services/store'
import { QuietHoursField } from './QuietHoursField'
import { useUpdateSettings } from './useUpdateSettings'

const CUSTOM = '__custom'

export function PrayerSettingsPanel() {
  return (
    <>
      <LocationSection />
      <CalculationSection />
      <NotificationSection />
    </>
  )
}

function LocationSection() {
  const t = useT()
  const prayer = useSettings().prayer
  const update = useUpdateSettings('prayer')
  const zones = useMemo(() => listTimeZones(), [])
  const [name, setName] = useState(prayer.locationName)
  useEffect(() => setName(prayer.locationName), [prayer.locationName])
  const city = findCity(prayer.cityId)

  const selectCity = (id: string): void => {
    if (id === CUSTOM) {
      update({ cityId: null })
      return
    }
    const chosen = findCity(id)
    if (!chosen) return
    update({
      cityId: chosen.id,
      locationName: `${chosen.name}, ${chosen.country}`,
      latitude: chosen.latitude,
      longitude: chosen.longitude,
      timezone: chosen.timezone
    })
  }

  return (
    <Section title={t('settings.city')} id="prayer-location">
      <Field label={t('settings.city')}>
        <Select label={t('settings.city')} value={prayer.cityId ?? CUSTOM} onChange={selectCity}>
          {CITIES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}, {c.country}
            </option>
          ))}
          <option value={CUSTOM}>{t('settings.customLocation')}</option>
        </Select>
      </Field>
      {city && city.method !== prayer.method && (
        <Field label={t('settings.methodSuggestion', { method: t(`method.${city.method}`) })}>
          <Button size="sm" variant="ghost" onClick={() => update({ method: city.method })}>
            {t('settings.useSuggested')}
          </Button>
        </Field>
      )}
      {prayer.cityId === null && (
        <>
          <Field label={t('settings.locationName')}>
            <input
              className="text-field"
              aria-label={t('settings.locationName')}
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => name.trim() && name.trim() !== prayer.locationName && update({ locationName: name.trim() })}
            />
          </Field>
          <Field label={t('settings.latitude')}>
            <NumberField decimal stepper={false} label={t('settings.latitude')} min={-90} max={90} value={prayer.latitude} onChange={(latitude) => update({ latitude })} />
          </Field>
          <Field label={t('settings.longitude')}>
            <NumberField
              decimal
              stepper={false}
              label={t('settings.longitude')}
              min={-180}
              max={180}
              value={prayer.longitude}
              onChange={(longitude) => update({ longitude })}
            />
          </Field>
        </>
      )}
      <Field label={t('settings.timezone')}>
        <Select label={t('settings.timezone')} value={prayer.timezone} onChange={(timezone) => update({ timezone })}>
          {zones.map((zone) => (
            <option key={zone} value={zone}>
              {zone.replace(/_/g, ' ')}
            </option>
          ))}
        </Select>
      </Field>
    </Section>
  )
}

function CalculationSection() {
  const t = useT()
  const prayer = useSettings().prayer
  const update = useUpdateSettings('prayer')
  const setAdjustment = (name: keyof PrayerSettings['adjustments'], minutes: number): void =>
    update({ adjustments: { ...prayer.adjustments, [name]: minutes } })

  return (
    <Section title={t('settings.method')} id="prayer-calculation">
      <Field label={t('settings.method')}>
        <Select label={t('settings.method')} value={prayer.method} onChange={(method) => update({ method })}>
          {CALCULATION_METHODS.map((method) => (
            <option key={method} value={method}>
              {t(`method.${method}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t('settings.madhab')}>
        <Segmented
          label={t('settings.madhab')}
          value={prayer.madhab}
          onChange={(madhab) => update({ madhab })}
          options={[
            { value: 'shafi', label: t('settings.madhab.shafi') },
            { value: 'hanafi', label: t('settings.madhab.hanafi') }
          ]}
        />
      </Field>
      <Field label={t('settings.highLatitudeRule')}>
        <Select label={t('settings.highLatitudeRule')} value={prayer.highLatitudeRule} onChange={(highLatitudeRule) => update({ highLatitudeRule })}>
          {(['auto', 'middleofthenight', 'seventhofthenight', 'twilightangle'] as const).map((rule) => (
            <option key={rule} value={rule}>
              {t(`settings.hlr.${rule}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t('settings.adjustments')} stacked>
        <div className="adjustments">
          {PRAYER_NAMES.map((name) => (
            <label key={name} className="adjustments__item">
              <span>{t(`prayer.${name}`)}</span>
              <NumberField
                label={`${t(`prayer.${name}`)} ${t('settings.adjustments')}`}
                min={-60}
                max={60}
                value={prayer.adjustments[name]}
                onChange={(minutes) => setAdjustment(name, minutes)}
              />
            </label>
          ))}
        </div>
      </Field>
    </Section>
  )
}

function NotificationSection() {
  const t = useT()
  const prayer = useSettings().prayer
  const update = useUpdateSettings('prayer')

  const chooseAthan = async (): Promise<void> => {
    const athanFile = await window.daywell.pickAsset('athan')
    if (athanFile) update({ athanFile, athanEnabled: true })
  }

  return (
    <Section title={t('settings.prayerNotifications')} id="prayer-notifications">
      <Field label={t('settings.prayerNotifications')}>
        <Toggle
          label={t('settings.prayerNotifications')}
          checked={prayer.notificationsEnabled}
          onChange={(notificationsEnabled) => update({ notificationsEnabled })}
        />
      </Field>
      {prayer.notificationsEnabled && (
        <>
          <Field label={t('settings.notifyFor')}>
            <div className="chip-group" role="group" aria-label={t('settings.notifyFor')}>
              {PRAYER_NAMES.map((name) => (
                <button
                  key={name}
                  type="button"
                  className="chip"
                  aria-pressed={prayer.notifyAt[name]}
                  onClick={() => update({ notifyAt: { ...prayer.notifyAt, [name]: !prayer.notifyAt[name] } })}
                >
                  {t(`prayer.${name}`)}
                </button>
              ))}
            </div>
          </Field>
          <Field label={t('settings.reminderBefore')}>
            <Toggle label={t('settings.reminderBefore')} checked={prayer.reminderBefore} onChange={(reminderBefore) => update({ reminderBefore })} />
          </Field>
          {prayer.reminderBefore && (
            <Field label={t('settings.leadTime')}>
              <Segmented
                label={t('settings.leadTime')}
                value={String(prayer.reminderLeadMinutes)}
                onChange={(value) => update({ reminderLeadMinutes: Number(value) })}
                options={['5', '10', '15', '20', '30'].map((value) => ({ value, label: t('common.minutes', { n: value }) }))}
              />
            </Field>
          )}
          <QuietHoursField label={t('settings.prayerQuietHours')} value={prayer.quietHours} onChange={(quietHours) => update({ quietHours })} />
          <Field label={t('settings.athan')} hint={t('settings.athanHint')}>
            {prayer.athanFile && (
              <Toggle label={t('settings.athan')} checked={prayer.athanEnabled} onChange={(athanEnabled) => update({ athanEnabled })} />
            )}
            <Button size="sm" icon={<Music size={14} />} onClick={() => void chooseAthan()}>
              {t('common.choose')}
            </Button>
          </Field>
        </>
      )}
    </Section>
  )
}
