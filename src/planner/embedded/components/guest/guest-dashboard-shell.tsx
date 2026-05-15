'use client'

import { useEffect } from 'react'
import { useRouter } from '@/lib/app-navigation'
import { getGuestPlanner } from '@/lib/guest-planner-store'
import { GuestNavSidebar } from '@/components/guest/guest-nav-sidebar'
import { GuestSignInCta } from '@/components/guest/guest-sign-in-cta'

export function GuestDashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const bundle = getGuestPlanner()

  useEffect(() => {
    if (!bundle) router.replace('/onboarding')
  }, [bundle, router])

  if (!bundle) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 text-sm">
        Loading your plan…
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <GuestNavSidebar planSlug={bundle.plan.slug} />
      <main className="flex-1 min-w-0 bg-slate-50">
        <div className="px-4 sm:px-6 pt-4 max-w-5xl">
          <GuestSignInCta />
        </div>
        {children}
      </main>
    </div>
  )
}
