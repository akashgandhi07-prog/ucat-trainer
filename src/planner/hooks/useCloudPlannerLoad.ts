import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { DBPlan } from '../embedded/types'
import {
  fetchActivePlan,
  isMocksOnlyPlaceholderPlan,
} from '../lib/load-planner-data'

const LOAD_TIMEOUT_MS = 12_000

export type CloudPlannerLoadState<T> =
  | { status: 'loading'; data: T | null }
  | { status: 'ready'; data: T }
  | { status: 'no-plan' }
  | { status: 'error'; data: T | null; message: string }

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`${label} timed out. Check your connection and try again.`))
    }, ms)
    promise
      .then((value) => {
        window.clearTimeout(timer)
        resolve(value)
      })
      .catch((err) => {
        window.clearTimeout(timer)
        reject(err)
      })
  })
}

/**
 * Loads planner cloud data for signed-in users. Uses a generation counter so stale
 * in-flight requests (e.g. rapid router.refresh) cannot leave the UI stuck loading.
 */
export function useCloudPlannerLoad<T>(
  userId: string | undefined,
  refreshTick: number,
  load: (plan: DBPlan, userId: string) => Promise<T>,
): CloudPlannerLoadState<T> & { retry: () => void } {
  const [state, setState] = useState<CloudPlannerLoadState<T>>({ status: 'loading', data: null })
  const [retryKey, setRetryKey] = useState(0)
  const generationRef = useRef(0)
  const loadRef = useRef(load)
  useLayoutEffect(() => { loadRef.current = load })

  const retry = useCallback(() => setRetryKey((k) => k + 1), [])

  useEffect(() => {
    if (!userId) return

    const generation = ++generationRef.current
    const loadingTimer = window.setTimeout(() => {
      if (generationRef.current !== generation) return
      setState((prev) =>
        prev.status === 'ready' ? { status: 'loading', data: prev.data } : { status: 'loading', data: null },
      )
    }, 0)

    void (async () => {
      try {
        const plan = await withTimeout(
          fetchActivePlan(userId),
          LOAD_TIMEOUT_MS,
          'Loading your plan',
        )
        if (generationRef.current !== generation) return

        if (!plan || isMocksOnlyPlaceholderPlan(plan)) {
          setState({ status: 'no-plan' })
          return
        }

        const data = await withTimeout(
          loadRef.current(plan, userId),
          LOAD_TIMEOUT_MS,
          'Loading your timetable',
        )
        if (generationRef.current !== generation) return

        setState({ status: 'ready', data })
      } catch (e) {
        if (generationRef.current !== generation) return
        const message = e instanceof Error ? e.message : 'Could not load your plan'
        setState((prev) => ({
          status: 'error',
          data: prev.status === 'ready' ? prev.data : null,
          message,
        }))
      }
    })()

    return () => {
      window.clearTimeout(loadingTimer)
      generationRef.current += 1
    }
  }, [userId, refreshTick, retryKey])

  return { ...state, retry }
}
