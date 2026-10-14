import { useState } from 'react'
import type { MessageKey } from '@shared/i18n'
import { PageHeader } from '../../components/Layout'
import { useT } from '../../hooks/useI18n'
import { ClockSettingsPanel } from './ClockSettingsPanel'
import { FocusSettingsPanel } from './FocusSettingsPanel'
import { GeneralSettingsPanel } from './GeneralSettingsPanel'
import { HydrationSettingsPanel } from './HydrationSettingsPanel'
import { PrayerSettingsPanel } from './PrayerSettingsPanel'

const TABS = [
  { id: 'general', label: 'settings.general', Panel: GeneralSettingsPanel },
  { id: 'clock', label: 'settings.clock', Panel: ClockSettingsPanel },
  { id: 'focus', label: 'settings.focus', Panel: FocusSettingsPanel },
  { id: 'hydration', label: 'settings.hydration', Panel: HydrationSettingsPanel },
  { id: 'prayer', label: 'settings.prayer', Panel: PrayerSettingsPanel }
] as const satisfies ReadonlyArray<{ id: string; label: MessageKey; Panel: () => React.JSX.Element }>

type TabId = (typeof TABS)[number]['id']

export function SettingsPage() {
  const t = useT()
  const [tab, setTab] = useState<TabId>('general')
  const active = TABS.find((item) => item.id === tab) ?? TABS[0]
  const Panel = active.Panel

  const onKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return
    const rtl = document.documentElement.dir === 'rtl'
    const forward = (event.key === 'ArrowRight') !== rtl
    const index = TABS.findIndex((item) => item.id === tab)
    const next = TABS[(index + (forward ? 1 : TABS.length - 1)) % TABS.length]
    if (next) {
      setTab(next.id)
      document.getElementById(`tab-${next.id}`)?.focus()
    }
  }

  return (
    <div className="page settings-page">
      <PageHeader title={t('settings.title')} />
      <div className="tabs" role="tablist" aria-label={t('settings.title')} onKeyDown={onKeyDown}>
        {TABS.map((item) => (
          <button
            key={item.id}
            id={`tab-${item.id}`}
            type="button"
            role="tab"
            className="tabs__tab"
            aria-selected={item.id === tab}
            aria-controls={`panel-${item.id}`}
            tabIndex={item.id === tab ? 0 : -1}
            onClick={() => setTab(item.id)}
          >
            {t(item.label)}
          </button>
        ))}
      </div>
      <div className="settings-panel" role="tabpanel" id={`panel-${active.id}`} aria-labelledby={`tab-${active.id}`}>
        <Panel />
      </div>
    </div>
  )
}
