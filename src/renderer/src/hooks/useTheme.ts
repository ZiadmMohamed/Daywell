import { useEffect, useState } from 'react'
import { useSettings } from '../services/store'

const query = window.matchMedia('(prefers-color-scheme: dark)')

/** Applies the light/dark theme to <html data-theme>, following the system when asked. */
export function useDocumentTheme(): 'light' | 'dark' {
  const preference = useSettings().general.theme
  const [systemDark, setSystemDark] = useState(query.matches)
  useEffect(() => {
    const listener = (event: MediaQueryListEvent): void => setSystemDark(event.matches)
    query.addEventListener('change', listener)
    return () => query.removeEventListener('change', listener)
  }, [])
  const theme = preference === 'system' ? (systemDark ? 'dark' : 'light') : preference
  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])
  return theme
}
