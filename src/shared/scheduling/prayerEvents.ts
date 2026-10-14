import { PRAYER_NAMES } from '../constants/prayer'
import type { ScheduleWindow } from '../prayer/calc'
import type { PrayerSettings } from '../validation/settings'
import { isWithinQuietHours } from '../time/quietHours'
import type { ScheduledEvent } from './events'

/** Prayer notifications for today and tomorrow according to the user's preferences. */
export function planPrayerEvents(window: ScheduleWindow, settings: PrayerSettings): ScheduledEvent[] {
  if (!settings.notificationsEnabled) return []
  const events: ScheduledEvent[] = []
  for (const day of [window.today, window.tomorrow]) {
    for (const prayer of PRAYER_NAMES) {
      const prayerAt = day.times[prayer]
      if (prayerAt === null || !settings.notifyAt[prayer]) continue
      events.push({
        id: `prayer:${day.date}:${prayer}:at`,
        at: prayerAt,
        source: 'prayer',
        missedPolicy: 'skip',
        notify: true,
        payload: { kind: 'prayer-at', prayer, prayerAt }
      })
      if (settings.reminderBefore) {
        const leadMinutes = settings.reminderLeadMinutes
        events.push({
          id: `prayer:${day.date}:${prayer}:before`,
          at: prayerAt - leadMinutes * 60_000,
          source: 'prayer',
          missedPolicy: 'skip',
          notify: true,
          payload: { kind: 'prayer-before', prayer, prayerAt, leadMinutes }
        })
      }
    }
  }
  return events.filter((e) => !isWithinQuietHours(e.at, settings.quietHours))
}
