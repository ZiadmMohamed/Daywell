import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'
import { Minus, Plus } from 'lucide-react'

interface ToggleProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  disabled?: boolean
}

/** An accessible on/off switch. */
export function Toggle({ checked, onChange, label, disabled }: ToggleProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className="toggle"
      onClick={() => onChange(!checked)}
    >
      <span className="toggle__thumb" />
    </button>
  )
}

interface SegmentedProps<T extends string> {
  value: T
  options: ReadonlyArray<{ value: T; label: string }>
  onChange: (value: T) => void
  label: string
}

/** A compact single-choice control (radio group) for a few options. */
export function Segmented<T extends string>({ value, options, onChange, label }: SegmentedProps<T>) {
  return (
    <div className="segmented" role="radiogroup" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="radio"
          aria-checked={option.value === value}
          className="segmented__option"
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

interface SelectProps<T extends string> {
  value: T
  onChange: (value: T) => void
  label: string
  children: ReactNode
}

export function Select<T extends string>({ value, onChange, label, children }: SelectProps<T>) {
  return (
    <select className="select" aria-label={label} value={value} onChange={(e) => onChange(e.target.value as T)}>
      {children}
    </select>
  )
}

interface SliderProps {
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
  label: string
  format?: (value: number) => string
}

export function Slider({ value, min, max, step, onChange, label, format }: SliderProps) {
  const percent = ((value - min) / (max - min)) * 100
  return (
    <div className="slider">
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        style={{ '--fill': `${percent}%` } as CSSProperties}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <output className="slider__value tabular">{format ? format(value) : value}</output>
    </div>
  )
}

interface NumberFieldProps {
  value: number
  min: number
  max: number
  step?: number
  onChange: (value: number) => void
  label: string
  unit?: string
  /** Allow decimals (e.g. coordinates). */
  decimal?: boolean
  stepper?: boolean
}

/**
 * Numeric input that only commits valid, in-range values (on blur or Enter),
 * so partially typed numbers never reach settings.
 */
export function NumberField({ value, min, max, step = 1, onChange, label, unit, decimal, stepper = true }: NumberFieldProps) {
  const [draft, setDraft] = useState(String(value))
  const [invalid, setInvalid] = useState(false)
  useEffect(() => {
    setDraft(String(value))
    setInvalid(false)
  }, [value])

  const commit = (raw: string): void => {
    const trimmed = raw.trim()
    const pattern = decimal ? /^-?\d+(\.\d+)?$/ : /^-?\d+$/
    const parsed = Number(trimmed)
    if (!pattern.test(trimmed) || parsed < min || parsed > max) {
      setInvalid(true)
      return
    }
    setInvalid(false)
    if (parsed !== value) onChange(parsed)
  }
  const nudge = (delta: number): void => {
    const next = Math.min(max, Math.max(min, Math.round((value + delta) * 1e6) / 1e6))
    if (next !== value) onChange(next)
  }

  return (
    <div className={`number-field ${invalid ? 'is-invalid' : ''}`}>
      {stepper && (
        <button
          type="button"
          className="number-field__step"
          aria-label={`${label}: −${step}`}
          onClick={() => nudge(-step)}
          disabled={value <= min}
        >
          <Minus size={14} />
        </button>
      )}
      <input
        className="number-field__input tabular"
        inputMode={decimal ? 'decimal' : 'numeric'}
        aria-label={label}
        aria-invalid={invalid}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(e.currentTarget.value)
        }}
      />
      {unit && <span className="number-field__unit">{unit}</span>}
      {stepper && (
        <button
          type="button"
          className="number-field__step"
          aria-label={`${label}: +${step}`}
          onClick={() => nudge(step)}
          disabled={value >= max}
        >
          <Plus size={14} />
        </button>
      )}
    </div>
  )
}

interface TimeFieldProps {
  value: string
  onChange: (value: string) => void
  label: string
}

export function TimeField({ value, onChange, label }: TimeFieldProps) {
  return (
    <input
      type="time"
      className="time-field tabular"
      aria-label={label}
      value={value}
      onChange={(e) => {
        if (/^\d{2}:\d{2}$/.test(e.target.value)) onChange(e.target.value)
      }}
    />
  )
}
