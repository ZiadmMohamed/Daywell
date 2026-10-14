import type { ReactNode } from 'react'

interface FieldProps {
  label: string
  hint?: string
  children: ReactNode
  /** Stack the control under the label instead of beside it. */
  stacked?: boolean
}

/** A settings row: label and optional hint on one side, control on the other. */
export function Field({ label, hint, children, stacked }: FieldProps) {
  return (
    <div className={`field ${stacked ? 'field--stacked' : ''}`}>
      <div className="field__text">
        <span className="field__label">{label}</span>
        {hint && <span className="field__hint">{hint}</span>}
      </div>
      <div className="field__control">{children}</div>
    </div>
  )
}

export function Section({ title, children, id }: { title: string; children: ReactNode; id: string }) {
  return (
    <section className="section" aria-labelledby={`${id}-title`}>
      <h2 className="section__title" id={`${id}-title`}>
        {title}
      </h2>
      <div className="section__body">{children}</div>
    </section>
  )
}

export function PageHeader({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <header className="page-header">
      <h1 className="page-header__title">{title}</h1>
      {children && <div className="page-header__aside">{children}</div>}
    </header>
  )
}

interface ProgressRingProps {
  /** 0..1 */
  value: number
  size: number
  stroke: number
  color: string
  children?: ReactNode
  label?: string
}

/** Circular progress indicator drawn with SVG; the arc animates smoothly between values. */
export function ProgressRing({ value, size, stroke, color, children, label }: ProgressRingProps) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const clamped = Math.min(1, Math.max(0, value))
  const a11y = label
    ? { role: 'progressbar', 'aria-label': label, 'aria-valuemin': 0, 'aria-valuemax': 100, 'aria-valuenow': Math.round(clamped * 100) }
    : {}
  return (
    <div className="ring" style={{ width: size, height: size }} {...a11y}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="var(--surface-3)" strokeWidth={stroke} />
        <circle
          className="ring__arc"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="ring__content">{children}</div>
    </div>
  )
}
