import { useMemo } from 'react'
import { dayStatuses, findCurrentPrayer, findNextPrayer, type PrayerEvent, type PrayerStatus } from '@shared/prayer/next'
import { isDayFullyAvailable, type DaySchedule } from '@shared/prayer/calc'
import type { PrayerName } from '@shared/constants/prayer'
import { useSlice } from '../../services/store'

export interface PrayerView {
  today: DaySchedule
  next: PrayerEvent | null
  current: PrayerEvent | null
  statuses: Record<PrayerName, PrayerStatus>
  remainingMs: number | null
  hasUnavailable: boolean
}

/** Derives next/current prayer and the countdown from the computed schedule and the current time. */
export function usePrayerTimes(now: number): PrayerView {
  const { window } = useSlice('prayer')
  const minute = Math.floor(now / 60_000)
  const derived = useMemo(() => {
    const at = minute * 60_000
    return { statuses: dayStatuses(window.today, window, at) }
  }, [window, minute])
  const next = findNextPrayer(window, now)
  return {
    today: window.today,
    next,
    current: findCurrentPrayer(window, now),
    statuses: derived.statuses,
    remainingMs: next ? next.at - now : null,
    hasUnavailable: !isDayFullyAvailable(window.today)
  }
}
