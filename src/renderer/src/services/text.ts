import { formatTimeOfDay } from '@shared/time/format'

/**
 * Wraps text in a left-to-right isolate so values like "7:48 PM" keep their
 * order inside right-to-left (Arabic) text. Invisible in left-to-right layouts.
 */
export function ltr(text: string): string {
  return `⁦${text}⁩`
}

/** A time of day formatted for display, safe to embed in either text direction. */
export function timeOfDay(...args: Parameters<typeof formatTimeOfDay>): string {
  return ltr(formatTimeOfDay(...args))
}
