'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Timer } from 'lucide-react'
import { useRouter } from '@/lib/app-navigation'
import { OnboardingState, DateRange, CurrentSituation, SchoolYear } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { createClient } from '@/lib/supabase/client'
import { parseDate, toISODate, weeksUntil, DAY_NAMES_FULL } from '@/lib/utils'
import {
  UCAT_EXAM_WINDOW_END_ISO,
  UCAT_EXAM_WINDOW_START_ISO,
  clampToUcatExamWindow,
} from '@/lib/ucatExamWindow'
import { buildGuestPlannerFromOnboarding } from '@/lib/build-guest-plan'
import { getGuestPlanner, saveGuestPlanner } from '@/lib/guest-planner-store'
import { createPlanFromOnboarding } from '@/lib/create-plan-from-onboarding'
import { isMocksOnlyPlaceholderPlan } from '../../../lib/load-planner-data'
import { cn } from '../../../../lib/cn'
import { APP_CONTENT_X } from '../../../../lib/appContentLayout'
import { PlannerOnboardingAside } from '../../../../components/layout/ProductUpsell'
import { useAuth } from '../../../../hooks/useAuth'
import { getUpsellProfileContext } from '../../../../lib/productUpsell'

const TOTAL_STEPS = 7

export type OnboardingProfilePrefill = {
  fullName?: string | null
  examDate?: string | null
}

const choiceCardClass = (selected: boolean) =>
  cn(
    'rounded-xl border-2 p-4 sm:p-5 text-left transition-all',
    selected
      ? 'border-primary bg-training-active-muted'
      : 'border-border bg-card hover:border-muted-foreground/40',
  )

const fieldInputClass =
  'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring'

const INITIAL_STATE: OnboardingState = {
  hasPriorExperience: null,
  fullName: '',
  currentSituation: null,
  schoolYear: null,
  examDate: null,
  examTime: null,
  confidence: { vr: 3, dm: 3, qr: 3, sjt: 3 },
  schoolDayHours: 2,
  weekendHours: 4,
  holidayPeriods: [],
  restDays: [],
  busyPeriods: [],
  ucatSen: false,
}

export default function OnboardingClient({
  initialInviteToken,
  profilePrefill,
}: {
  initialInviteToken?: string
  profilePrefill?: OnboardingProfilePrefill
}) {
  const router = useRouter()
  const inviteToken = initialInviteToken

  const [step, setStep] = useState(1)
  const [state, setState] = useState<OnboardingState>(INITIAL_STATE)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    if (!profilePrefill) return
    const name = profilePrefill.fullName?.trim()
    const exam = profilePrefill.examDate?.trim()
    if (!name && !exam) return

    setState((s) => ({
      ...s,
      fullName: s.fullName || name || '',
      examDate: s.examDate || (exam ? clampToUcatExamWindow(exam) : null),
    }))
  }, [profilePrefill?.fullName, profilePrefill?.examDate])

  // Redirect to dashboard if already has an active plan
  useEffect(() => {
    const guest = getGuestPlanner()
    if (guest?.plan) {
      router.replace('/dashboard')
      return
    }
    const sb = createClient()
    sb.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      sb.from('plans')
        .select('id, exam_date')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()
        .then(({ data }) => {
          if (data && !isMocksOnlyPlaceholderPlan(data)) router.replace('/dashboard')
        })
    })
  }, [router])

  function update(partial: Partial<OnboardingState>) {
    setState(s => ({ ...s, ...partial }))
  }

  function nextStep() { setStep(s => Math.min(s + 1, TOTAL_STEPS)) }
  function prevStep() { setStep(s => Math.max(s - 1, 1)) }

  async function handleSubmit() {
    if (!state.examDate || state.hasPriorExperience === null || !state.currentSituation) return
    setLoading(true)
    setError(null)

    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()

      if (!user) {
        const bundle = buildGuestPlannerFromOnboarding(state)
        saveGuestPlanner(bundle)
        router.push('/dashboard')
        return
      }

      // Save full name to the users profile
      if (state.fullName.trim()) {
        await sb.from('profiles').update({ full_name: state.fullName.trim() }).eq('id', user.id)
      }

      await createPlanFromOnboarding({ state, inviteToken })

      router.push('/dashboard')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const examDateWarning = state.examDate && weeksUntil(parseDate(state.examDate)) < 3
  const { user, profile } = useAuth()
  const { firstName, stream } = getUpsellProfileContext(user, profile)
  return (
    <div className="flex flex-1 min-h-0 flex-col lg:flex-row lg:items-stretch">
      <div className="flex-1 min-w-0 overflow-y-auto py-6 sm:py-8 lg:py-10">
        <div className={cn(APP_CONTENT_X, 'mx-auto w-full max-w-xl lg:max-w-2xl')}>
          <div className="space-y-6 min-w-0">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
            Build your study plan
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Answer a few questions and we&apos;ll generate a personalised UCAT revision schedule.
          </p>
        </div>

        <div
          className="flex gap-1.5"
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={TOTAL_STEPS}
        >
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 flex-1 rounded-full transition-all duration-300',
                i + 1 <= step ? 'bg-primary' : 'bg-muted',
              )}
            />
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="text-xs font-medium text-primary uppercase tracking-wide mb-1">
              Step {step} of {TOTAL_STEPS}
            </div>
            <CardTitle className="text-xl">{STEP_TITLES[step - 1]}</CardTitle>
            <CardDescription>{STEP_DESCRIPTIONS[step - 1]}</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {step === 1 && <Step1 state={state} onUpdate={update} />}
            {step === 2 && <Step2 state={state} onUpdate={update} />}
            {step === 3 && <Step3 state={state} onUpdate={update} warning={!!examDateWarning} />}
            {step === 4 && <Step4 state={state} onUpdate={update} />}
            {step === 5 && <Step5 state={state} onUpdate={update} />}
            {step === 6 && <Step6 state={state} onUpdate={update} />}
            {step === 7 && <Step7 state={state} onUpdate={update} />}
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button variant="ghost" onClick={prevStep} disabled={step === 1}>
              ← Back
            </Button>
            <div className="flex gap-3">
              {error && <p className="text-sm text-red-600 self-center">{error}</p>}
              {step < TOTAL_STEPS ? (
                <Button onClick={nextStep} disabled={!canAdvance(step, state)}>
                  Continue →
                </Button>
              ) : (
                <Button onClick={handleSubmit} loading={loading} disabled={!canAdvance(step, state)}>
                  Generate my plan
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
          </div>
        </div>
      </div>

      <PlannerOnboardingAside
        panel
        className="hidden lg:flex lg:w-[17.5rem] xl:w-72 shrink-0"
        stream={stream}
        firstName={firstName}
      />

      <PlannerOnboardingAside
        panel
        className="lg:hidden border-t border-border bg-muted/20"
        stream={stream}
        firstName={firstName}
      />
    </div>
  )
}

// ─── Step 1: UCAT experience ──────────────────────────────────────────────────

function Step1({ state, onUpdate }: StepProps) {
  const choices = [
    {
      val: false as const,
      Icon: BookOpen,
      title: 'No',
      sub: "I'm starting fresh with untimed foundations",
    },
    {
      val: true as const,
      Icon: Timer,
      title: 'Yes',
      sub: "I've done some timed UCAT practice",
    },
  ] as const

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
        {choices.map(({ val, Icon, title, sub }) => {
          const selected = state.hasPriorExperience === val
          return (
            <button
              key={String(val)}
              type="button"
              onClick={() => onUpdate({ hasPriorExperience: val })}
              className={cn(
                'rounded-xl border-2 p-4 text-left transition-all sm:p-5',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                selected
                  ? 'border-primary bg-training-active-muted shadow-sm'
                  : 'border-border bg-card hover:border-muted-foreground/50 hover:bg-muted/40',
              )}
            >
              <div
                className={cn(
                  'mb-3 flex h-10 w-10 items-center justify-center rounded-lg',
                  selected ? 'bg-primary/15 text-primary' : 'bg-muted text-muted-foreground',
                )}
                aria-hidden
              >
                <Icon className="h-5 w-5" strokeWidth={2} />
              </div>
              <div className="font-semibold tracking-tight text-foreground">{title}</div>
              <div className="mt-1 text-sm leading-snug text-muted-foreground">{sub}</div>
            </button>
          )
        })}
      </div>
      <p className="text-xs leading-relaxed text-muted-foreground">
        This determines whether your first week uses timed or untimed practice.
      </p>
    </div>
  )
}

// ─── Step 2: About you ────────────────────────────────────────────────────────

const SITUATIONS: { value: CurrentSituation; label: string; sub: string }[] = [
  { value: 'school',            label: 'Still at school',        sub: 'Sixth form or secondary school' },
  { value: 'gap_year',          label: 'Gap year',               sub: 'Between school and university' },
  { value: 'graduated_free',    label: 'Graduated - free',       sub: 'No job, fully available to study' },
  { value: 'graduated_working', label: 'Graduated - working',    sub: 'Currently employed or interning' },
]

const SCHOOL_YEARS: { value: SchoolYear; label: string }[] = [
  { value: 'year_12', label: 'Year 12 (Lower Sixth)' },
  { value: 'year_13', label: 'Year 13 (Upper Sixth)' },
  { value: 'other',   label: 'Other / not sure' },
]

function Step2({ state, onUpdate }: StepProps) {
  return (
    <div className="space-y-6">
      <Input
        label="Your name"
        placeholder="First name (or full name)"
        value={state.fullName}
        onChange={(e) => onUpdate({ fullName: e.target.value })}
        hint="So we can personalise your plan."
        autoFocus
      />

      <div>
        <label className="text-sm font-semibold text-foreground mb-3 block">What's your current situation?</label>
        <div className="grid grid-cols-2 gap-3">
          {SITUATIONS.map(({ value, label, sub }) => (
            <button
              key={value}
              type="button"
              onClick={() => onUpdate({
                currentSituation: value,
                // Clear school year if switching away from school
                schoolYear: value === 'school' ? (state.schoolYear ?? null) : null,
                // Reset hours to sensible defaults per situation
                schoolDayHours: value === 'graduated_working' ? 1.5 : 2,
                weekendHours: value === 'gap_year' || value === 'graduated_free' ? 4 : 4,
                holidayPeriods: value === 'school' ? state.holidayPeriods : [],
              })}
              className={choiceCardClass(state.currentSituation === value)}
            >
              <div className="font-semibold text-foreground text-sm">{label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
            </button>
          ))}
        </div>
      </div>

      {state.currentSituation === 'school' && (
        <div>
          <label className="text-sm font-semibold text-foreground mb-3 block">Which year are you in?</label>
          <div className="flex gap-3">
            {SCHOOL_YEARS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => onUpdate({ schoolYear: value })}
                className={`flex-1 rounded-lg border-2 py-2.5 px-3 text-sm text-left transition-all ${
                  state.schoolYear === value
                    ? 'border-primary bg-training-active-muted text-primary font-semibold'
                    : 'border-border text-muted-foreground hover:border-muted-foreground/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Step 3: Exam date & time ─────────────────────────────────────────────────

function Step3({ state, onUpdate, warning }: StepProps & { warning: boolean }) {
  return (
    <div className="space-y-4">
      <Input
        label="UCAT exam date"
        type="date"
        value={state.examDate ?? ''}
        min={UCAT_EXAM_WINDOW_START_ISO}
        max={UCAT_EXAM_WINDOW_END_ISO}
        hint="Official sittings only: 13 July to 24 September 2026."
        onChange={e =>
          onUpdate({
            examDate: e.target.value ? clampToUcatExamWindow(e.target.value) : null,
          })
        }
      />
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          Exam time <span className="text-muted-foreground font-normal">(optional)</span>
        </label>
        <input
          type="time"
          value={state.examTime ?? ''}
          onChange={e => onUpdate({ examTime: e.target.value || null })}
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <p className="text-xs text-muted-foreground mt-1">No sessions will be scheduled on exam day.</p>
      </div>
      <label className="flex items-start gap-3 rounded-xl border border-border bg-muted p-4 cursor-pointer">
        <input
          type="checkbox"
          checked={state.ucatSen}
          onChange={e => onUpdate({ ucatSen: e.target.checked })}
          className="mt-1 h-4 w-4 rounded border-border text-primary focus:ring-ring"
        />
        <span>
          <span className="font-medium text-foreground">I am taking UCATSEN (extra time)</span>
          <span className="block text-sm text-muted-foreground mt-1">
            Full mocks in your plan will be scheduled as 2h 30m to match your test conditions. Mock reflection blocks stay at about 2 hours.
          </span>
        </span>
      </label>
      {warning && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
          ⚠️ Your exam is fewer than 3 weeks away. Your plan will be compressed and mock-heavy from day one.
        </div>
      )}
      {state.examDate && !warning && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-800">
          ✓ {weeksUntil(parseDate(state.examDate))} weeks until your exam. We'll build a progressive plan across all phases.
        </div>
      )}
    </div>
  )
}

// ─── Step 4: Confidence ───────────────────────────────────────────────────────

function Step4({ state, onUpdate }: StepProps) {
  const sections: { key: keyof OnboardingState['confidence']; label: string }[] = [
    { key: 'vr',  label: 'Verbal Reasoning' },
    { key: 'dm',  label: 'Decision Making' },
    { key: 'qr',  label: 'Quantitative Reasoning' },
    { key: 'sjt', label: 'Situational Judgement' },
  ]
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Rate how confident you feel in each section. Lower confidence = more sessions allocated.
      </p>
      {sections.map(({ key, label }) => (
        <Slider
          key={key}
          label={label}
          value={state.confidence[key]}
          min={1}
          max={5}
          lowLabel="Not confident"
          highLabel="Very confident"
          onChange={v => onUpdate({ confidence: { ...state.confidence, [key]: v } })}
        />
      ))}
    </div>
  )
}

// --- Step 5: Study hours - framing adapts to situation ---

function Step5({ state, onUpdate }: StepProps) {
  const sit = state.currentSituation

  if (sit === 'gap_year' || sit === 'graduated_free') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Since you have a flexible schedule, all days are treated equally. What's the maximum you could study on a really good day?
        </p>
        <HourPicker
          options={[2, 3, 4, 5, 6, 8]}
          value={state.weekendHours}
          color="blue"
          onChange={h => onUpdate({ schoolDayHours: h, weekendHours: h })}
        />
        <p className="text-xs text-muted-foreground">
          We'll start at about half this and ramp up each week. Pick an ambitious max.
        </p>
      </div>
    )
  }

  if (sit === 'graduated_working') {
    return (
      <div className="space-y-6">
        <div>
          <label className="text-sm font-semibold text-foreground mb-3 block">
            On a really good work day, what's the maximum you could study?
          </label>
          <HourPicker
            options={[0.5, 1, 1.5, 2, 2.5, 3]}
            value={state.schoolDayHours}
            color="blue"
            onChange={h => onUpdate({ schoolDayHours: h })}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground mb-3 block">
            On a really good day off or weekend, what's the maximum you could study?
          </label>
          <HourPicker
            options={[2, 3, 4, 5, 6, 8]}
            value={state.weekendHours}
            color="green"
            onChange={h => onUpdate({ weekendHours: h })}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          We'll ramp up from about half these numbers, so pick what a genuinely good day looks like.
        </p>
      </div>
    )
  }

  // Default: school student
  return (
    <SchoolHoursStep state={state} onUpdate={onUpdate} />
  )
}

function SchoolHoursStep({ state, onUpdate }: StepProps) {
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [rangeLabel, setRangeLabel] = useState('')
  const today = toISODate(new Date())

  function addHoliday() {
    if (!rangeStart || !rangeEnd || rangeEnd < rangeStart) return
    onUpdate({ holidayPeriods: [...state.holidayPeriods, { start: rangeStart, end: rangeEnd, label: rangeLabel || undefined }] })
    setRangeStart(''); setRangeEnd(''); setRangeLabel('')
  }

  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-semibold text-foreground mb-3 block">
          On a really good school day (Mon-Fri during term), what's the maximum you could study?
        </label>
        <HourPicker
          options={[1, 1.5, 2, 2.5, 3, 4]}
          value={state.schoolDayHours}
          color="blue"
          onChange={h => onUpdate({ schoolDayHours: h })}
        />
      </div>

      <div>
        <label className="text-sm font-semibold text-foreground mb-3 block">
          On a really good weekend day or during holidays, what's the maximum you could study?
        </label>
        <HourPicker
          options={[2, 3, 4, 5, 6, 8]}
          value={state.weekendHours}
          color="green"
          onChange={h => onUpdate({ weekendHours: h })}
        />
        <p className="text-xs text-muted-foreground mt-2">
          We'll start at about half this and ramp up each week. Pick something ambitious.
        </p>
      </div>

      <div>
        <label className="text-sm font-semibold text-foreground mb-2 block">
          When are your school holidays? <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <p className="text-xs text-muted-foreground mb-3">
          We'll apply the higher daily hours during these periods automatically.
        </p>
        <div className="rounded-lg border border-border bg-muted p-4 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Start</label>
              <input type="date" value={rangeStart} min={today} max={state.examDate ?? undefined}
                onChange={e => setRangeStart(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">End</label>
              <input type="date" value={rangeEnd} min={rangeStart || today} max={state.examDate ?? undefined}
                onChange={e => setRangeEnd(e.target.value)}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="Label (e.g. Summer holidays)" value={rangeLabel}
              onChange={e => setRangeLabel(e.target.value)}
              className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            <Button onClick={addHoliday} disabled={!rangeStart || !rangeEnd || rangeEnd < rangeStart} variant="outline">Add</Button>
          </div>
        </div>
        {state.holidayPeriods.length > 0 && (
          <div className="mt-3 space-y-2">
            {state.holidayPeriods.map((p, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 px-4 py-2.5">
                <div>
                  <span className="text-sm font-medium text-green-800">{p.label || 'School holiday'}</span>
                  <span className="text-xs text-green-600 ml-2">{formatRange(p)}</span>
                </div>
                <button type="button" onClick={() => onUpdate({ holidayPeriods: state.holidayPeriods.filter((_, idx) => idx !== i) })}
                  className="text-green-400 hover:text-red-500 transition-colors text-lg leading-none ml-3">×</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Step 6: Rest days ────────────────────────────────────────────────────────

function Step6({ state, onUpdate }: StepProps) {
  function toggle(day: number) {
    const updated = state.restDays.includes(day)
      ? state.restDays.filter(d => d !== day)
      : [...state.restDays, day]
    onUpdate({ restDays: updated })
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Select any days that should <strong>always</strong> be rest days. Sessions will never be scheduled on them. Completely optional.
      </p>
      <div className="grid grid-cols-7 gap-2">
        {DAY_NAMES_FULL.map((name, i) => (
          <button
            key={i}
            type="button"
            onClick={() => toggle(i)}
            className={`rounded-lg border-2 py-3 text-center transition-all ${
              state.restDays.includes(i)
                ? 'border-primary bg-muted text-foreground font-semibold'
                : 'border-border text-muted-foreground hover:border-muted-foreground/40'
            }`}
          >
            <div className="text-xs font-medium">{name.slice(0, 3)}</div>
          </button>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {state.restDays.length === 0
          ? 'No rest days selected: sessions may be scheduled any day.'
          : `${state.restDays.length} day${state.restDays.length > 1 ? 's' : ''} always kept free.`}
      </p>
    </div>
  )
}

// ─── Step 7: Busy periods ─────────────────────────────────────────────────────

function Step7({ state, onUpdate }: StepProps) {
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [rangeLabel, setRangeLabel] = useState('')
  const today = toISODate(new Date())

  function addPeriod() {
    if (!rangeStart || !rangeEnd || rangeEnd < rangeStart) return
    onUpdate({ busyPeriods: [...state.busyPeriods, { start: rangeStart, end: rangeEnd, label: rangeLabel || undefined }] })
    setRangeStart(''); setRangeEnd(''); setRangeLabel('')
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Any periods where you're completely unavailable: trips, exams, commitments? These will be blocked out. You can also adjust this from your plan later.
      </p>
      <div className="rounded-lg border border-border bg-muted p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Start</label>
            <input type="date" value={rangeStart} min={today} max={state.examDate ?? undefined}
              onChange={e => setRangeStart(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">End</label>
            <input type="date" value={rangeEnd} min={rangeStart || today} max={state.examDate ?? undefined}
              onChange={e => setRangeEnd(e.target.value)}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
        <div className="flex gap-2">
          <input type="text" placeholder="Label (e.g. Family holiday)" value={rangeLabel}
            onChange={e => setRangeLabel(e.target.value)}
            className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <Button onClick={addPeriod} disabled={!rangeStart || !rangeEnd || rangeEnd < rangeStart} variant="outline">Add</Button>
        </div>
      </div>
      {state.busyPeriods.length > 0 ? (
        <div className="space-y-2">
          {state.busyPeriods.map((p, i) => (
            <div key={i} className="flex items-center justify-between rounded-lg border border-red-100 bg-red-50 px-4 py-2.5">
              <div>
                <span className="text-sm font-medium text-red-800">{p.label || 'Unavailable'}</span>
                <span className="text-xs text-red-500 ml-2">{formatRange(p)}</span>
              </div>
              <button type="button" onClick={() => onUpdate({ busyPeriods: state.busyPeriods.filter((_, idx) => idx !== i) })}
                className="text-red-300 hover:text-red-600 transition-colors text-lg leading-none ml-3">×</button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground py-4">
          No blocked periods: you can skip this and adjust from your plan later.
        </p>
      )}
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function HourPicker({ options, value, color, onChange }: {
  options: number[]
  value: number
  color: 'blue' | 'green'
  onChange: (h: number) => void
}) {
  const active = color === 'blue'
    ? 'border-primary bg-training-active-muted text-primary'
    : 'border-green-500 bg-green-50 text-green-700'
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {options.map(h => (
        <button
          key={h}
          type="button"
          onClick={() => onChange(h)}
          className={`flex-1 min-w-[3rem] rounded-lg border-2 py-2.5 text-sm font-semibold transition-all ${
            value === h ? active : 'border-border text-muted-foreground hover:border-muted-foreground/40'
          }`}
        >
          {h}h
        </button>
      ))}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type StepProps = {
  state: OnboardingState
  onUpdate: (p: Partial<OnboardingState>) => void
}

function formatRange(p: DateRange): string {
  const fmt = (d: string) => parseDate(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return p.start === p.end ? fmt(p.start) : `${fmt(p.start)} - ${fmt(p.end)}`
}

const STEP_TITLES = [
  'Have you started UCAT practice yet?',
  'A bit about you',
  'When is your exam?',
  'How confident are you in each section?',
  'How much can you study?',
  'Any guaranteed rest days?',
  'Any periods you\'re unavailable?',
]

const STEP_DESCRIPTIONS = [
  'This sets whether your first sessions are timed or untimed foundations.',
  'We\'ll use this to personalise your plan and how we talk about your schedule.',
  'We\'ll build your plan backwards from your exam date.',
  'Weaker sections get more sessions allocated. You can adjust these later.',
  'We\'ll ramp up from about half your max, so be ambitious.',
  'Optional: skip if you\'re happy to study any day of the week.',
  'Optional: add holidays or commitments where you can\'t study at all.',
]

function canAdvance(step: number, state: OnboardingState): boolean {
  if (step === 1) return state.hasPriorExperience !== null
  if (step === 2) return !!state.currentSituation && (state.currentSituation !== 'school' || !!state.schoolYear)
  if (step === 3) return !!state.examDate
  return true
}
