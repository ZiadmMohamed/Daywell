import { NumberField, Toggle } from '../../components/Controls'
import { Field, Section } from '../../components/Layout'
import { useT } from '../../hooks/useI18n'
import { useSettings } from '../../services/store'
import { QuietHoursField } from './QuietHoursField'
import { useUpdateSettings } from './useUpdateSettings'

export function HydrationSettingsPanel() {
  const t = useT()
  const hydration = useSettings().hydration
  const update = useUpdateSettings('hydration')

  const setQuickAdd = (index: number, amount: number): void => {
    const quickAddMl = hydration.quickAddMl.map((value, i) => (i === index ? amount : value))
    update({ quickAddMl })
  }

  return (
    <>
      <Section title={t('settings.hydration')} id="hydration-goal">
        <Field label={t('settings.dailyGoal')}>
          <NumberField
            label={t('settings.dailyGoal')}
            min={250}
            max={10000}
            step={250}
            value={hydration.dailyGoalMl}
            unit="ml"
            onChange={(dailyGoalMl) => update({ dailyGoalMl })}
          />
        </Field>
        <Field label={t('settings.quickAdd')}>
          {hydration.quickAddMl.map((amount, index) => (
            <NumberField
              key={index}
              label={`${t('settings.quickAdd')} ${index + 1}`}
              min={10}
              max={2000}
              step={50}
              value={amount}
              unit="ml"
              stepper={false}
              onChange={(value) => setQuickAdd(index, value)}
            />
          ))}
        </Field>
      </Section>
      <Section title={t('settings.reminders')} id="hydration-reminders">
        <Field label={t('settings.reminders')}>
          <Toggle
            label={t('settings.reminders')}
            checked={hydration.remindersEnabled}
            onChange={(remindersEnabled) => update({ remindersEnabled })}
          />
        </Field>
        <Field label={t('settings.reminderInterval')}>
          <NumberField
            label={t('settings.reminderInterval')}
            min={15}
            max={480}
            step={15}
            value={hydration.reminderIntervalMinutes}
            unit={t('common.minutes', { n: '' }).trim()}
            onChange={(reminderIntervalMinutes) => update({ reminderIntervalMinutes })}
          />
        </Field>
        <QuietHoursField label={t('settings.quietHours')} value={hydration.quietHours} onChange={(quietHours) => update({ quietHours })} />
      </Section>
    </>
  )
}
