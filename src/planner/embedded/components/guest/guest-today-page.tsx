'use client'

import { useMemo } from 'react'
import { TodayView } from '@/components/today/today-view'
import { getGuestPlanner } from '@/lib/guest-planner-store'
import {
  guestStreak,
  guestWeeklyCompletionPercent,
  planDayForDate,
  sessionsWithGuestCompletions,
} from '@/lib/guest-plan-helpers'
import type { ExportPlanPdfInput } from '../../../lib/export-plan-pdf'
import { toISODate } from '@/lib/utils'

export function GuestTodayPage() {
  const bundle = getGuestPlanner()
  const today = toISODate(new Date())

  const view = useMemo(() => {
    if (!bundle) return null
    const todaySessions = bundle.sessions.filter((s) => s.day_date === today)
    const allSessionsWithCompletion = sessionsWithGuestCompletions(bundle, bundle.sessions)
    const plannerPdf: ExportPlanPdfInput = {
      plan: bundle.plan,
      planDays: bundle.planDays,
      sessions: allSessionsWithCompletion,
      todayDate: today,
    }
    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1)
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    return {
      sessions: sessionsWithGuestCompletions(bundle, todaySessions),
      planDay: planDayForDate(bundle, today),
      planId: bundle.plan.id,
      examDate: bundle.plan.exam_date,
      streak: guestStreak(bundle),
      weeklyCompletion: guestWeeklyCompletionPercent(
        bundle,
        toISODate(weekStart),
        toISODate(weekEnd),
      ),
      plan: bundle.plan,
      plannerPdf,
    }
  }, [bundle, today])

  // The saved bundle can vanish between the route's check and this read (a sign-in
  // clearing guest data mid-render), which used to render a blank page with no
  // spinner and no message. Send them somewhere they can act instead.
  if (!view) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-lg font-semibold text-foreground">Your timetable isn&apos;t loaded</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn&apos;t find a saved study plan in this browser. Build one to see your day.
        </p>
        <a
          href="/study-plan"
          className="mt-4 inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >
          Build my study plan
        </a>
      </div>
    )
  }

  return (
    <TodayView
      guestMode
      sessions={view.sessions}
      planDay={view.planDay}
      planId={view.planId}
      examDate={view.examDate}
      streak={view.streak}
      weeklyCompletion={view.weeklyCompletion}
      todayDate={today}
      plan={view.plan}
      plannerPdf={view.plannerPdf}
    />
  )
}
