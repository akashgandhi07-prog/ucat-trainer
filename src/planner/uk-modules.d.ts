/* Ambient types for planner UI imported from src/planner/embedded (bundled by Vite). */

declare module '@/app/onboarding/onboarding-client' {
  import type { ComponentType } from 'react'
  export type OnboardingProfilePrefill = {
    fullName?: string | null
    examDate?: string | null
  }
  const OnboardingClient: ComponentType<{
    initialInviteToken?: string
    profilePrefill?: OnboardingProfilePrefill
  }>
  export default OnboardingClient
}

declare module '@/components/today/today-view' {
  import type { ComponentType } from 'react'
  export const TodayView: ComponentType<Record<string, unknown>>
}

declare module '@/components/plan/plan-calendar' {
  import type { ComponentType } from 'react'
  export const PlanCalendar: ComponentType<Record<string, unknown>>
  export const RebuildAheadModal: ComponentType<Record<string, unknown>>
}

declare module '@/components/plan/mock-scores-view' {
  import type { ComponentType } from 'react'
  export const MockScoresView: ComponentType<Record<string, unknown>>
}

declare module '@/components/plan/reflect-view' {
  import type { ComponentType } from 'react'
  export const ReflectView: ComponentType<Record<string, unknown>>
}

declare module '@/components/guest/guest-today-page' {
  export function GuestTodayPage(): import('react').ReactNode
}

declare module '@/components/guest/guest-plan-page' {
  export function GuestPlanPage(): import('react').ReactNode
}

declare module '@/components/guest/guest-reflect-page' {
  export function GuestReflectPage(): import('react').ReactNode
}

declare module '@/components/guest/guest-scores-page' {
  export function GuestScoresPage(): import('react').ReactNode
}

declare module '@/lib/guest-planner-store' {
  export type GuestPlannerBundle = {
    plan: { id: string; slug: string; exam_date: string; mock_target_total?: number | null; mock_target_sjt_band?: number | null }
    planWeeks: unknown[]
    planDays: unknown[]
    sessions: Array<{ id: string; day_date: string; session_type: string; duration_minutes: number }>
    completions: unknown[]
    mockScores: unknown[]
  }
  export function hasGuestPlanner(): boolean
  export function getGuestPlanner(): GuestPlannerBundle | null
  export function saveGuestPlanner(bundle: GuestPlannerBundle): void
  export function upsertGuestCompletion(
    sessionId: string,
    completed: boolean,
    minutesCompleted: number | null,
    perceivedEffort: number | null,
  ): void
  export function addGuestMockScore(score: Record<string, unknown>): unknown
  export function updateGuestMockTargets(
    mockTargetTotal: number | null,
    mockTargetSjtBand: number | null,
  ): void
}

declare module '@/lib/planner-client' {
  export function completeSession(input: Record<string, unknown>): Promise<void>
  export function updatePlanDay(input: Record<string, unknown>): Promise<void>
  export function addMockScore(input: Record<string, unknown>): Promise<unknown>
  export function updateMockTargets(input: Record<string, unknown>): Promise<void>
  export function saveExtraStudy(input: Record<string, unknown>): Promise<void>
  export function rebalancePlan(input: Record<string, unknown>): Promise<{ warnings: string[] }>
  export function saveWeeklyReflection(input: Record<string, unknown>): Promise<void>
}

declare module '@/lib/app-link' {
  import type { ReactNode } from 'react'
  export function Link(props: { href: string; children: ReactNode; className?: string }): import('react').JSX.Element
}

declare module '@/lib/utils' {
  export function parseDate(value: string): Date
  export function weeksUntil(date: Date): number
  export function cn(...inputs: unknown[]): string
}

declare module '@/components/ui/card' {
  import type { ReactNode } from 'react'
  export function Card(props: { children?: ReactNode; className?: string }): import('react').JSX.Element
  export function CardHeader(props: { children?: ReactNode; className?: string }): import('react').JSX.Element
  export function CardTitle(props: { children?: ReactNode; className?: string }): import('react').JSX.Element
  export function CardDescription(props: { children?: ReactNode; className?: string }): import('react').JSX.Element
  export function CardContent(props: { children?: ReactNode; className?: string }): import('react').JSX.Element
  export function CardFooter(props: { children?: ReactNode; className?: string }): import('react').JSX.Element
}

declare module '@/components/tutor/tutor-sidebar' {
  import type { ComponentType } from 'react'
  export const TutorSidebar: ComponentType<{ tutor: Record<string, unknown>; students: Record<string, unknown>[] }>
}

declare module '@/components/plan/plan-view' {
  import type { ComponentType } from 'react'
  export const PlanView: ComponentType<Record<string, unknown>>
}

declare module '@/components/tutor/tutor-note-form' {
  import type { ComponentType } from 'react'
  export const TutorNoteForm: ComponentType<{ planWeeks: unknown[]; planId: string }>
}

declare module '@/components/ui/button' {
  import type { ButtonHTMLAttributes, forwardRef } from 'react'
  export const Button: ReturnType<
    typeof forwardRef<
      HTMLButtonElement,
      ButtonHTMLAttributes<HTMLButtonElement> & {
        variant?: string
        size?: string
        loading?: boolean
      }
    >
  >
}
