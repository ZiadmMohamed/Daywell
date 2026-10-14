import type { QuietHours } from '@shared/validation/settings'
import { TimeField, Toggle } from '../../components/Controls'
import { Field } from '../../components/Layout'
import { useT } from '../../hooks/useI18n'

interface QuietHoursFieldProps {
  label: string
  value: QuietHours
  onChange: (value: QuietHours) => void
}

export function QuietHoursField({ label, value, onChange }: QuietHoursFieldProps) {
  const t = useT()
  return (
    <Field label={label} hint={t('settings.quietHoursHint')}>
      {value.enabled && (
        <span className="time-range">
          <TimeField label={t('settings.from')} value={value.start} onChange={(start) => onChange({ ...value, start })} />
          <span aria-hidden="true">–</span>
          <TimeField label={t('settings.to')} value={value.end} onChange={(end) => onChange({ ...value, end })} />
        </span>
      )}
      <Toggle label={label} checked={value.enabled} onChange={(enabled) => onChange({ ...value, enabled })} />
    </Field>
  )
}
