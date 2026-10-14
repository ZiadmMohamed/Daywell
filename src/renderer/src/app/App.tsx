import { useEffect, useState } from 'react'
import type { Page } from '@shared/types/state'
import { useDocumentLanguage } from '../hooks/useI18n'
import { useDocumentTheme } from '../hooks/useTheme'
import { playSound } from '../services/sound'
import { ClockPage } from '../features/clock/ClockPage'
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

  useEffect(() => window.daywell.onNavigate(setPage), [])
  useEffect(() => window.daywell.onPlaySound(playSound), [])

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
