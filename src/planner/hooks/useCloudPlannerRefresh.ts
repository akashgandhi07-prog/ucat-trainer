import { useCallback, useState } from 'react'
import { usePlannerRefresh } from '../shim/app-navigation'

/** Bump key when planner views call router.refresh() after Supabase writes. */
export function useCloudPlannerRefresh(): number {
  const [tick, setTick] = useState(0)
  const onRefresh = useCallback(() => setTick((t) => t + 1), [])
  usePlannerRefresh(onRefresh)
  return tick
}
