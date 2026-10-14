import { useId } from 'react'

/** Layered hills for the Nature theme, drawn inline so it works offline and scales crisply. */
export function NatureScene() {
  const skyId = useId()
  return (
    <svg className="nature-scene" viewBox="0 0 800 400" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
      <defs>
        <linearGradient id={skyId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--nature-sky-top)" />
          <stop offset="1" stopColor="var(--nature-sky-bottom)" />
        </linearGradient>
      </defs>
      <rect width="800" height="400" fill={`url(#${skyId})`} />
      <circle cx="610" cy="120" r="46" fill="var(--nature-sun)" />
      <path d="M0 270 C 120 220 220 240 330 215 S 560 180 800 235 L 800 400 L 0 400 Z" fill="var(--nature-hill-1)" />
      <path d="M0 305 C 140 270 260 300 400 270 S 640 250 800 285 L 800 400 L 0 400 Z" fill="var(--nature-hill-2)" />
      <path d="M0 345 C 160 320 300 350 470 325 S 700 315 800 335 L 800 400 L 0 400 Z" fill="var(--nature-hill-3)" />
    </svg>
  )
}
