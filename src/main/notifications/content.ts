import { createTranslator, type Language } from '@shared/i18n'
import type { ScheduledEvent } from '@shared/scheduling/events'
import { formatTimeOfDay, type TimeFormat } from '@shared/time/format'
import type { Page, SoundCue } from '@shared/types/state'

export interface NotificationContent {
  title: string
  body: string
  /** Suppresses the system notification sound. */
  silent: boolean
  /** Page to open when the notification is clicked. */
  page: Page
  /** Extra sound to play through the app (chime or Athan). */
  sound: SoundCue | null
}

export interface ContentContext {
  language: Language
  timeFormat: TimeFormat
  prayerTimeZone: string
  focusSound: boolean
  athanFile: string | null
  hydrationTotalMl: number
  hydrationGoalMl: number
}

export function buildNotification(event: ScheduledEvent, ctx: ContentContext): NotificationContent {
  const t = createTranslator(ctx.language)
  const payload = event.payload
  switch (payload.kind) {
    case 'focus-end': {
      const isWork = payload.phase === 'work'
      return {
        title: t(isWork ? 'notify.focusEnd.work.title' : 'notify.focusEnd.break.title'),
        body: isWork
          ? t('notify.focusEnd.work.body', { next: t(`phase.${payload.nextPhase}`).toLowerCase() })
          : t('notify.focusEnd.break.body'),
        silent: !ctx.focusSound,
        page: 'focus',
        sound: null
      }
    }
    case 'hydration-reminder':
      return {
        title: t('notify.hydration.title'),
        body: t('notify.hydration.body', {
          total: ctx.hydrationTotalMl.toLocaleString('en-US'),
          goal: ctx.hydrationGoalMl.toLocaleString('en-US')
        }),
        silent: false,
        page: 'hydration',
        sound: null
      }
    case 'prayer-at': {
      const prayer = t(`prayer.${payload.prayer}`)
      const time = formatTimeOfDay(payload.prayerAt, ctx.timeFormat, ctx.prayerTimeZone)
      const athan: SoundCue | null = ctx.athanFile ? { kind: 'athan', file: ctx.athanFile } : null
      return {
        title: t('notify.prayerAt.title', { prayer }),
        body: t('notify.prayerAt.body', { prayer, time }),
        silent: athan !== null,
        page: 'prayer',
        sound: athan
      }
    }
    case 'prayer-before': {
      const prayer = t(`prayer.${payload.prayer}`)
      const time = formatTimeOfDay(payload.prayerAt, ctx.timeFormat, ctx.prayerTimeZone)
      return {
        title: t('notify.prayerBefore.title', { prayer, n: payload.leadMinutes }),
        body: t('notify.prayerBefore.body', { prayer, time }),
        silent: false,
        page: 'prayer',
        sound: null
      }
    }
  }
}
