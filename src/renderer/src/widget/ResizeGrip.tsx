import { useRef, type PointerEvent } from 'react'

/**
 * Bottom-corner handle that resizes the widget window. Pointer movement is
 * batched to one IPC request per animation frame.
 */
export function ResizeGrip({ label }: { label: string }) {
  const drag = useRef<{ x: number; y: number; width: number; height: number } | null>(null)
  const frame = useRef<number | null>(null)

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.screenX, y: event.screenY, width: window.outerWidth, height: window.outerHeight }
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const start = drag.current
    if (!start) return
    const width = Math.round(Math.min(1600, Math.max(180, start.width + event.screenX - start.x)))
    const height = Math.round(Math.min(1000, Math.max(80, start.height + event.screenY - start.y)))
    if (frame.current !== null) cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      frame.current = null
      void window.daywell.resizeWidget(width, height)
    })
  }

  const onPointerUp = (event: PointerEvent<HTMLDivElement>): void => {
    drag.current = null
    event.currentTarget.releasePointerCapture(event.pointerId)
  }

  return (
    <div
      className="widget__grip"
      role="presentation"
      title={label}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
    >
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M9 1 L1 9 M9 5 L5 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    </div>
  )
}
