import { useEffect, useMemo } from 'react'
import { createTranslator, textDirection, type Translate } from '@shared/i18n'
import { useSettings } from '../services/store'

export function useT(): Translate {
  const language = useSettings().general.language
  return useMemo(() => createTranslator(language), [language])
}

/** Keeps <html lang dir> in sync with the language preference. */
export function useDocumentLanguage(): void {
  const language = useSettings().general.language
  useEffect(() => {
    document.documentElement.lang = language
    document.documentElement.dir = textDirection(language)
  }, [language])
}
