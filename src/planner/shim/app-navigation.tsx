import { useCallback, useEffect } from 'react'
import {
  useLocation,
  useNavigate,
  useSearchParams as useRouterSearchParams,
} from 'react-router-dom'

const PATH_MAP: Record<string, string> = {
  '/dashboard': '/study-plan/today',
  '/dashboard/plan': '/study-plan/plan',
  '/dashboard/scores': '/mock-scores',
  '/dashboard/reflect': '/study-plan/reflect',
  '/dashboard/settings': '/study-plan/reflect',
  '/onboarding': '/study-plan',
}

export function mapPlannerPath(path: string): string {
  if (path.startsWith('http') || path.startsWith('/auth') || path.startsWith('/plan/')) {
    return path
  }
  const base = path.split('?')[0] ?? path
  const query = path.includes('?') ? path.slice(path.indexOf('?')) : ''
  const mapped = PATH_MAP[base] ?? base
  if (mapped === '/study-plan' && query.includes('next=/dashboard')) {
    return '/study-plan/today'
  }
  if (mapped.startsWith('/study-plan') || mapped === '/mock-scores') {
    return mapped + query.replace('next=/dashboard', 'next=/study-plan/today')
  }
  return mapped + query
}

export function useRouter() {
  const navigate = useNavigate()
  return {
    push: (path: string) => navigate(mapPlannerPath(path)),
    replace: (path: string) => navigate(mapPlannerPath(path), { replace: true }),
    refresh: () => {
      window.dispatchEvent(new CustomEvent('planner-refresh'))
    },
  }
}

export function usePathname(): string {
  return useLocation().pathname
}

export function useSearchParams() {
  const [params] = useRouterSearchParams()
  return params
}

/** Re-read guest planner data after TodayView calls router.refresh(). */
export function usePlannerRefresh(onRefresh: () => void): void {
  const handler = useCallback(() => onRefresh(), [onRefresh])
  useEffectPlannerRefresh(handler)
}

function useEffectPlannerRefresh(handler: () => void) {
  useEffect(() => {
    window.addEventListener('planner-refresh', handler)
    return () => window.removeEventListener('planner-refresh', handler)
  }, [handler])
}
