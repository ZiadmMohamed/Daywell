import { NumberField, Toggle } from '../../components/Controls'
import { Field, Section } from '../../components/Layout'
import { useT } from '../../hooks/useI18n'
import { useSettings } from '../../services/store'
import { useUpdateSettings } from './useUpdateSettings'

export function FocusSettingsPanel() {
  const t = useT()
  const focus = useSettings().focus
  const update = useUpdateSettings('focus')
  const min = t('common.minutes', { n: '' }).trim()
  return (
    <>
      <Section title={t('settings.focus')} id="focus-durations">
        <Field label={t('settings.workMinutes')}>
          <NumberField label={t('settings.workMinutes')} min={1} max={180} value={focus.workMinutes} unit={min} onChange={(workMinutes) => update({ workMinutes })} />
        </Field>
        <Field label={t('settings.shortBreakMinutes')}>
          <NumberField
            label={t('settings.shortBreakMinutes')}
            min={1}
            max={60}
            value={focus.shortBreakMinutes}
            unit={min}
            onChange={(shortBreakMinutes) => update({ shortBreakMinutes })}
          />
        </Field>
        <Field label={t('settings.longBreakMinutes')}>
          <NumberField
            label={t('settings.longBreakMinutes')}
            min={1}
            max={120}
            value={focus.longBreakMinutes}
            unit={min}
            onChange={(longBreakMinutes) => update({ longBreakMinutes })}
          />
        </Field>
        <Field label={t('settings.longBreakEvery')}>
          <NumberField
            label={t('settings.longBreakEvery')}
            min={2}
            max={12}
            value={focus.longBreakEvery}
            unit={t('settings.sessionsUnit', { n: '' }).trim()}
            onChange={(longBreakEvery) => update({ longBreakEvery })}
          />
        </Field>
      </Section>
      <Section title={t('settings.reminders')} id="focus-behaviour">
        <Field label={t('settings.autoStartNext')}>
          <Toggle label={t('settings.autoStartNext')} checked={focus.autoStartNext} onChange={(autoStartNext) => update({ autoStartNext })} />
        </Field>
        <Field label={t('settings.focusNotifications')}>
          <Toggle
            label={t('settings.focusNotifications')}
            checked={focus.notificationsEnabled}
            onChange={(notificationsEnabled) => update({ notificationsEnabled })}
          />
        </Field>
        <Field label={t('settings.soundEnabled')}>
          <Toggle label={t('settings.soundEnabled')} checked={focus.soundEnabled} onChange={(soundEnabled) => update({ soundEnabled })} />
        </Field>
      </Section>
    </>
  )
}
