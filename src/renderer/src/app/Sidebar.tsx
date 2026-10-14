import { Clock3, Droplets, Moon, PanelTopOpen, Settings2, Timer, type LucideIcon } from 'lucide-react'
import type { MessageKey } from '@shared/i18n'
import type { Page } from '@shared/types/state'
import { useT } from '../hooks/useI18n'
import { useSettings } from '../services/store'

const ITEMS: ReadonlyArray<{ page: Page; icon: LucideIcon; label: MessageKey }> = [
  { page: 'clock', icon: Clock3, label: 'nav.clock' },
  { page: 'focus', icon: Timer, label: 'nav.focus' },
  { page: 'hydration', icon: Droplets, label: 'nav.hydration' },
  { page: 'prayer', icon: Moon, label: 'nav.prayer' },
  { page: 'settings', icon: Settings2, label: 'nav.settings' }
]

interface SidebarProps {
  page: Page
  onNavigate: (page: Page) => void
}

export function Sidebar({ page, onNavigate }: SidebarProps) {
  const t = useT()
  const widgetVisible = useSettings().widget.visible
  return (
    <nav className="sidebar" aria-label={t('nav.primary')}>
      <div className="sidebar__brand" aria-hidden="true">
        <span className="sidebar__logo" />
      </div>
      <ul className="sidebar__items">
        {ITEMS.map(({ page: target, icon: Icon, label }) => (
          <li key={target}>
            <button
              type="button"
              className="sidebar__item"
              aria-current={page === target ? 'page' : undefined}
              onClick={() => onNavigate(target)}
            >
              <Icon size={20} strokeWidth={1.75} aria-hidden="true" />
              <span className="sidebar__label">{t(label)}</span>
            </button>
          </li>
        ))}
      </ul>
      <button
        type="button"
        className="sidebar__item sidebar__widget"
        aria-pressed={widgetVisible}
        title={widgetVisible ? t('nav.hideWidget') : t('nav.showWidget')}
        onClick={() => void window.daywell.setWidgetVisible(!widgetVisible)}
      >
        <PanelTopOpen size={18} strokeWidth={1.75} aria-hidden="true" />
        <span className="sidebar__label">{t('nav.widget')}</span>
      </button>
    </nav>
  )
}
