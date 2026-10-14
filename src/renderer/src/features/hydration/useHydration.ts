import { computeProgress } from '@shared/hydration/totals'
import { useSettings, useSlice } from '../../services/store'

export function useHydration() {
  const hydration = useSlice('hydration')
  const settings = useSettings().hydration
  return { ...hydration, settings, progress: computeProgress(hydration.totalMl, settings.dailyGoalMl) }
}
