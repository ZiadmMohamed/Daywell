import { ImagePlus } from 'lucide-react'
import { CLOCK_FONTS, CLOCK_THEMES } from '@shared/constants/clock'
import { Button } from '../../components/Button'
import { Segmented, Select, Slider, Toggle } from '../../components/Controls'
import { Field, Section } from '../../components/Layout'
import { useT } from '../../hooks/useI18n'
import { useNow } from '../../hooks/useNow'
import { useSettings } from '../../services/store'
import { ClockFace } from '../clock/ClockFace'
import { useUpdateSettings } from './useUpdateSettings'

export function ClockSettingsPanel() {
  return (
    <>
      <ThemePicker />
      <ClockAppearance />
      <WidgetSettings />
    </>
  )
}

function ThemePicker() {
  const t = useT()
  const settings = useSettings()
  const update = useUpdateSettings('clock')
  const now = useNow('minute')
  return (
    <section className="section" aria-labelledby="clock-theme-title">
      <h2 className="section__title" id="clock-theme-title">
        {t('settings.clockTheme')}
      </h2>
      <div className="theme-grid" role="radiogroup" aria-labelledby="clock-theme-title">
        {CLOCK_THEMES.map((theme) => (
          <button
            key={theme}
            type="button"
            role="radio"
            aria-checked={settings.clock.theme === theme}
            className="theme-option"
            onClick={() => update({ theme })}
          >
            <span className="theme-option__preview">
              <ClockFace
                now={now}
                clock={{ ...settings.clock, theme, showSeconds: false, background: 'theme', font: 'theme', textColor: null, scale: 1 }}
                timeFormat={settings.general.timeFormat}
                language={settings.general.language}
                showDate={false}
                variant="widget"
              />
            </span>
            <span className="theme-option__label">{t(`clockTheme.${theme}`)}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function ClockAppearance() {
  const t = useT()
  const clock = useSettings().clock
  const update = useUpdateSettings('clock')

  const chooseImage = async (): Promise<void> => {
    const name = await window.daywell.pickAsset('background')
    if (name) update({ background: 'image', backgroundImage: name })
  }

  return (
    <Section title={t('settings.clock')} id="clock-appearance">
      <Field label={t('settings.font')}>
        <Select label={t('settings.font')} value={clock.font} onChange={(font) => update({ font })}>
          {CLOCK_FONTS.map((font) => (
            <option key={font} value={font}>
              {t(`font.${font}`)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label={t('settings.textColor')}>
        <label className="inline-check">
          <Toggle label={t('settings.textColorTheme')} checked={clock.textColor === null} onChange={(useTheme) => update({ textColor: useTheme ? null : '#ffffff' })} />
          <span>{t('settings.textColorTheme')}</span>
        </label>
        {clock.textColor !== null && (
          <input
            type="color"
            className="color-input"
            aria-label={t('settings.textColor')}
            value={clock.textColor}
            onChange={(e) => update({ textColor: e.target.value })}
          />
        )}
      </Field>
      <Field label={t('settings.background')}>
        <Segmented
          label={t('settings.background')}
          value={clock.background}
          onChange={(background) => (background === 'image' && !clock.backgroundImage ? void chooseImage() : update({ background }))}
          options={[
            { value: 'theme', label: t('settings.background.theme') },
            { value: 'solid', label: t('settings.background.solid') },
            { value: 'image', label: t('settings.background.image') }
          ]}
        />
        {clock.background === 'solid' && (
          <input
            type="color"
            className="color-input"
            aria-label={t('settings.background.solid')}
            value={clock.backgroundColor}
            onChange={(e) => update({ backgroundColor: e.target.value })}
          />
        )}
        {clock.background === 'image' && (
          <Button size="sm" icon={<ImagePlus size={14} />} onClick={() => void chooseImage()}>
            {t('common.choose')}
          </Button>
        )}
      </Field>
      <Field label={t('settings.showSeconds')}>
        <Toggle label={t('settings.showSeconds')} checked={clock.showSeconds} onChange={(showSeconds) => update({ showSeconds })} />
      </Field>
      <Field label={t('settings.showDate')}>
        <Toggle label={t('settings.showDate')} checked={clock.showDate} onChange={(showDate) => update({ showDate })} />
      </Field>
      <Field label={t('settings.clockSize')}>
        <Slider
          label={t('settings.clockSize')}
          min={0.6}
          max={1.6}
          step={0.05}
          value={clock.scale}
          onChange={(scale) => update({ scale })}
          format={(v) => `${Math.round(v * 100)}%`}
        />
      </Field>
    </Section>
  )
}

function WidgetSettings() {
  const t = useT()
  const widget = useSettings().widget
  const update = useUpdateSettings('widget')
  return (
    <Section title={t('settings.widget')} id="widget">
      <Field label={t('settings.widgetVisible')} hint={t('settings.widgetHint')}>
        <Toggle label={t('settings.widgetVisible')} checked={widget.visible} onChange={(visible) => update({ visible })} />
      </Field>
      <Field label={t('settings.alwaysOnTop')}>
        <Toggle label={t('settings.alwaysOnTop')} checked={widget.alwaysOnTop} onChange={(alwaysOnTop) => update({ alwaysOnTop })} />
      </Field>
      <Field label={t('settings.opacity')}>
        <Slider
          label={t('settings.opacity')}
          min={0.3}
          max={1}
          step={0.05}
          value={widget.opacity}
          onChange={(opacity) => update({ opacity })}
          format={(v) => `${Math.round(v * 100)}%`}
        />
      </Field>
      <Field label={t('settings.showDate')}>
        <Toggle label={t('settings.showDate')} checked={widget.showDate} onChange={(showDate) => update({ showDate })} />
      </Field>
      <Field label={t('settings.clickThrough')} hint={t('settings.clickThroughHint')}>
        <Toggle label={t('settings.clickThrough')} checked={widget.clickThrough} onChange={(clickThrough) => update({ clickThrough })} />
      </Field>
    </Section>
  )
}
