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

  if (!view) return null

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
