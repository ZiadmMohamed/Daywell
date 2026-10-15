import { useEffect, useState } from 'react'
import type { Page } from '@shared/types/state'
import { useDocumentLanguage } from '../hooks/useI18n'
import { useDocumentTheme } from '../hooks/useTheme'
import { playSound } from '../services/sound'
import { ClockPage } from '../features/clock/ClockPage'
import { FullscreenClock } from '../features/clock/FullscreenClock'
import { FocusPage } from '../features/focus/FocusPage'
import { HydrationPage } from '../features/hydration/HydrationPage'
import { PrayerPage } from '../features/prayer-times/PrayerPage'
import { SettingsPage } from '../features/settings/SettingsPage'
import { Sidebar } from './Sidebar'

const PAGES: Record<Page, () => React.JSX.Element> = {
  clock: ClockPage,
  focus: FocusPage,
  hydration: HydrationPage,
  prayer: PrayerPage,
  settings: SettingsPage
}

export function App() {
  useDocumentTheme()
  useDocumentLanguage()
  const [page, setPage] = useState<Page>('clock')
  const [fullscreen, setFullscreen] = useState(false)

  useEffect(
    () =>
      window.daywell.onNavigate((target) => {
        setPage(target)
        // Navigating (e.g. from a notification) always leaves the full-screen clock.
        void window.daywell.setFullscreen(false)
      }),
    []
  )
  useEffect(() => window.daywell.onPlaySound(playSound), [])
  useEffect(() => window.daywell.onFullscreenChange(setFullscreen), [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'F11') {
        event.preventDefault()
        void window.daywell.setFullscreen(!fullscreen)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [fullscreen])

  if (fullscreen) return <FullscreenClock />

  const Current = PAGES[page]
  return (
    <div className="shell">
      <div className="titlebar" aria-hidden="true" />
      <Sidebar page={page} onNavigate={setPage} />
      <main className="content" key={page}>
        <Current />
      </main>
    </div>
  )
}

/** Lets nested components (e.g. overview tiles) switch pages. */
export function navigate(page: Page): void {
  void window.daywell.showMain(page)
}
