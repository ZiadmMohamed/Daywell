import { Segmented, Toggle } from '../../components/Controls'
import { Field, Section } from '../../components/Layout'
import { useT } from '../../hooks/useI18n'
import { useSettings } from '../../services/store'
import { useUpdateSettings } from './useUpdateSettings'

export function GeneralSettingsPanel() {
  const t = useT()
  const general = useSettings().general
  const update = useUpdateSettings('general')
  return (
    <>
      <Section title={t('settings.general')} id="general">
        <Field label={t('settings.launchAtStartup')} hint={t('settings.launchAtStartupHint')}>
          <Toggle label={t('settings.launchAtStartup')} checked={general.launchAtStartup} onChange={(v) => update({ launchAtStartup: v })} />
        </Field>
        <Field label={t('settings.minimizeToTray')} hint={t('settings.minimizeToTrayHint')}>
          <Toggle label={t('settings.minimizeToTray')} checked={general.minimizeToTray} onChange={(v) => update({ minimizeToTray: v })} />
        </Field>
      </Section>
      <Section title={t('settings.theme')} id="appearance">
        <Field label={t('settings.theme')}>
          <Segmented
            label={t('settings.theme')}
            value={general.theme}
            onChange={(theme) => update({ theme })}
            options={[
              { value: 'system', label: t('settings.theme.system') },
              { value: 'light', label: t('settings.theme.light') },
              { value: 'dark', label: t('settings.theme.dark') }
            ]}
          />
        </Field>
        <Field label={t('settings.timeFormat')}>
          <Segmented
            label={t('settings.timeFormat')}
            value={general.timeFormat}
            onChange={(timeFormat) => update({ timeFormat })}
            options={[
              { value: '12h', label: t('settings.timeFormat.12h') },
              { value: '24h', label: t('settings.timeFormat.24h') }
            ]}
          />
        </Field>
        <Field label={t('settings.language')}>
          <Segmented
            label={t('settings.language')}
            value={general.language}
            onChange={(language) => update({ language })}
            options={[
              { value: 'en', label: 'English' },
              { value: 'ar', label: 'العربية' }
            ]}
          />
        </Field>
      </Section>
    </>
  )
}
