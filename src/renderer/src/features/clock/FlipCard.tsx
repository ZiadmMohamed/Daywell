import { useState } from 'react'

/**
 * A split-flap card. When the value changes, the old top half folds down to
 * reveal the new value — one short flip per change, nothing continuous.
 */
export function FlipCard({ value, small }: { value: string; small?: boolean }) {
  const [state, setState] = useState({ current: value, previous: value })
  if (state.current !== value) setState({ current: value, previous: state.current })
  const flipping = state.previous !== state.current

  return (
    <span className={`flip-card ${small ? 'flip-card--small' : ''}`} aria-hidden="true">
      <span className="flip-card__half flip-card__half--top">
        <span>{state.current}</span>
      </span>
      <span className="flip-card__half flip-card__half--bottom">
        <span>{flipping ? state.previous : state.current}</span>
      </span>
      {flipping && (
        <span key={state.current} className="flip-card__flaps">
          <span className="flip-card__half flip-card__half--top flip-card__flap-top">
            <span>{state.previous}</span>
          </span>
          <span className="flip-card__half flip-card__half--bottom flip-card__flap-bottom">
            <span>{state.current}</span>
          </span>
        </span>
      )}
    </span>
  )
}
