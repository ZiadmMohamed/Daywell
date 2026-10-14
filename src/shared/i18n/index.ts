import { ar } from './ar'
import { en, type MessageKey } from './en'

export type Language = 'en' | 'ar'
export type { MessageKey }

const dictionaries: Record<Language, Partial<Record<MessageKey, string>>> = { en, ar }

export type Translate = (key: MessageKey, vars?: Record<string, string | number>) => string

export function translate(language: Language, key: MessageKey, vars?: Record<string, string | number>): string {
  const template = dictionaries[language][key] ?? en[key]
  if (!vars) return template
  return template.replace(/\{(\w+)\}/g, (match, name: string) => (name in vars ? String(vars[name]) : match))
}

export function createTranslator(language: Language): Translate {
  return (key, vars) => translate(language, key, vars)
}

export function textDirection(language: Language): 'ltr' | 'rtl' {
  return language === 'ar' ? 'rtl' : 'ltr'
}
