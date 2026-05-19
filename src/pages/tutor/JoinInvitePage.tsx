import { useEffect, useState } from 'react'
import { Navigate, useParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import { useAuth } from '../../hooks/useAuth'
import { useAuthModal } from '../../contexts/AuthModalContext'
import { isPlannerTutor, isStudentInviteTokenValid } from '../../planner/lib/tutor-api'
import PlannerLoading from '../../planner/components/PlannerLoading'

const btnPrimary =
  'inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'
const btnSecondary =
  'inline-flex h-10 items-center justify-center rounded-lg bg-secondary px-4 text-sm font-medium text-foreground transition-colors hover:bg-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2'

export default function JoinInvitePage() {
  const { token } = useParams<{ token: string }>()
  const { user, loading } = useAuth()
  const { openAuthModal } = useAuthModal()
  const [valid, setValid] = useState<boolean | null>(null)
  const [redirectTo, setRedirectTo] = useState<string | null>(null)

  useEffect(() => {
    if (!token) {
      setValid(false)
      return
    }
    let cancelled = false
    void isStudentInviteTokenValid(token).then((ok) => {
      if (!cancelled) setValid(ok)
    })
    return () => {
      cancelled = true
    }
  }, [token])

  useEffect(() => {
    if (loading || valid !== true || !user || !token) return
    let cancelled = false
    void (async () => {
      if (await isPlannerTutor(user.id)) {
        if (!cancelled) setRedirectTo('/tutor')
        return
      }
      const { fetchActivePlan } = await import('../../planner/lib/load-planner-data')
      const plan = await fetchActivePlan(user.id)
      if (!cancelled) {
        setRedirectTo(plan ? '/study-plan/plan' : `/study-plan?invite=${encodeURIComponent(token)}`)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user, loading, valid, token])

  if (!token || valid === false) {
    return (
      <div className="min-h-[60vh] bg-gradient-to-br from-slate-50 to-blue-50 flex items-start justify-center px-4 py-16">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Invite link unavailable</CardTitle>
            <CardDescription>
              This link is invalid or has already been used. Ask your tutor for a fresh invite URL.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <button type="button" className={cn(btnSecondary, 'inline-flex w-auto')} onClick={() => openAuthModal('login')}>
              Sign in
            </button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (valid === null || loading || (user && !redirectTo)) {
    return <PlannerLoading />
  }

  if (redirectTo) return <Navigate to={redirectTo} replace />

  return (
    <div className="min-h-[60vh] bg-gradient-to-br from-slate-50 to-blue-50 flex items-start justify-center px-4 py-16">
      <div className="w-full max-w-lg space-y-6">
        <header className="text-center space-y-1">
          <p className="text-2xl font-bold tracking-tight text-foreground">UCAT study plan</p>
          <p className="text-sm text-muted-foreground">You&apos;ve been invited by your tutor</p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Create your revision plan</CardTitle>
            <CardDescription>
              Sign in or sign up with your email; no password needed. Your tutor will see progress once your plan is
              set up.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Use this same device browser when you tap the magic link from your email. That keeps your invite connected
              to your account.
            </p>
            <button
              type="button"
              className={btnPrimary}
              onClick={() => {
                sessionStorage.setItem('planner_invite_token', token)
                openAuthModal('login')
              }}
            >
              Continue with email
            </button>
            <p className="text-xs text-muted-foreground text-center">
              Share only this invite page with yourself. It&apos;s your personal onboarding link from your tutor.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
