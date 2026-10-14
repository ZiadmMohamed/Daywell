import { AppWindow, EyeOff } from 'lucide-react'
import { ClockFace } from '../features/clock/ClockFace'
import { useDocumentLanguage, useT } from '../hooks/useI18n'
import { useNow } from '../hooks/useNow'
import { useDocumentTheme } from '../hooks/useTheme'
import { useSettings } from '../services/store'
import { ResizeGrip } from './ResizeGrip'

/**
 * The desktop clock. The whole surface is a drag handle; a small toolbar
 * appears on hover with a way back to the app and a way to hide the widget.
 */
export function WidgetApp() {
  useDocumentTheme()
  useDocumentLanguage()
  const t = useT()
  const settings = useSettings()
  const now = useNow(settings.clock.showSeconds || settings.clock.theme === 'flip' ? 'second' : 'minute')

  return (
    <div className="widget">
      <ClockFace
        now={now}
        clock={settings.clock}
        timeFormat={settings.general.timeFormat}
        language={settings.general.language}
        showDate={settings.widget.showDate}
        variant="widget"
      />
      <div className="widget__toolbar">
        <button type="button" className="widget__button" aria-label={t('widget.openApp')} title={t('widget.openApp')} onClick={() => void window.daywell.showMain()}>
          <AppWindow size={14} />
        </button>
        <button
          type="button"
          className="widget__button"
          aria-label={t('widget.hide')}
          title={t('widget.hide')}
          onClick={() => void window.daywell.setWidgetVisible(false)}
        >
          <EyeOff size={14} />
        </button>
      </div>
      <ResizeGrip label={t('widget.resize')} />
    </div>
  )
}
