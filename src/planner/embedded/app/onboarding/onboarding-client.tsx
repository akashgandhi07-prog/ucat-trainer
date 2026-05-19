'use client'

import { useState, useEffect } from 'react'
import { BookOpen, Timer } from 'lucide-react'
import { useRouter } from '@/lib/app-navigation'
import { OnboardingState, TimeAwayPeriod, CurrentSituation, SchoolYear } from '@/types'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { createClient } from '@/lib/supabase/client'
import { parseDate, toISODate, weeksUntil, DAY_NAMES_FULL } from '@/lib/utils'
import { buildGuestPlannerFromOnboarding } from '@/lib/build-guest-plan'
import { getGuestPlanner, saveGuestPlanner } from '@/lib/guest-planner-store'
import { createPlanFromOnboarding } from '@/lib/create-plan-from-onboarding'
import { cn } from '../../../../lib/cn'
import { APP_CONTENT_X } from '../../../../lib/appContentLayout'
import { PlannerOnboardingAside } from '../../../../components/layout/ProductUpsell'
import { useAuth } from '../../../../hooks/useAuth'
import { getUpsellProfileContext } from '../../../../lib/productUpsell'

const TOTAL_STEPS = 7

type ConfidenceKey = keyof OnboardingState['confidence']

type RequiredAnswers = {
  confidence: Record<ConfidenceKey, boolean>
  schoolDayHours: boolean
  weekendHours: boolean
  timeAway: boolean
  restDays: boolean
  ucatSen: boolean
}

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
  timeAwayPeriods: [],
  restDays: [],
  ucatSen: false,
}

const INITIAL_REQUIRED_ANSWERS: RequiredAnswers = {
  confidence: { vr: false, dm: false, qr: false, sjt: false },
  schoolDayHours: false,
  weekendHours: false,
  timeAway: false,
  restDays: false,
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
  const [requiredAnswers, setRequiredAnswers] = useState<RequiredAnswers>(INITIAL_REQUIRED_ANSWERS)
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
      examDate: s.examDate || exam || null,
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
        .select('id')
        .eq('student_id', user.id)
        .eq('status', 'active')
        .limit(1)
        .maybeSingle()
        .then(({ data }) => { if (data) router.replace('/dashboard') })
    })
  }, [router])

  function update(partial: Partial<OnboardingState>) {
    if ('currentSituation' in partial) {
      setRequiredAnswers((answers) => ({
        ...answers,
        schoolDayHours: false,
        weekendHours: false,
      }))
    }
    setState(s => ({ ...s, ...partial }))
  }

  function nextStep() {
    if (!canAdvance(step, state, requiredAnswers)) return
    setStep(s => Math.min(s + 1, TOTAL_STEPS))
  }
  function prevStep() { setStep(s => Math.max(s - 1, 1)) }

  async function handleSubmit() {
    if (!allStepsComplete(state, requiredAnswers)) return
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
            {step === 3 && (
              <Step3
                state={state}
                onUpdate={update}
                warning={!!examDateWarning}
                ucatSenAnswered={requiredAnswers.ucatSen}
                onUcatSenAnswer={() => setRequiredAnswers((answers) => ({ ...answers, ucatSen: true }))}
              />
            )}
            {step === 4 && (
              <Step4
                state={state}
                onUpdate={update}
                answered={requiredAnswers.confidence}
                onAnswer={(key) => setRequiredAnswers((answers) => ({
                  ...answers,
                  confidence: { ...answers.confidence, [key]: true },
                }))}
              />
            )}
            {step === 5 && (
              <Step5
                state={state}
                onUpdate={update}
                answered={{
                  schoolDayHours: requiredAnswers.schoolDayHours,
                  weekendHours: requiredAnswers.weekendHours,
                }}
                onAnswer={(key) => setRequiredAnswers((answers) => ({ ...answers, [key]: true }))}
              />
            )}
            {step === 6 && (
              <Step6
                state={state}
                onUpdate={update}
                answered={requiredAnswers.timeAway}
                onAnswer={() => setRequiredAnswers((answers) => ({ ...answers, timeAway: true }))}
              />
            )}
            {step === 7 && (
              <Step7
                state={state}
                onUpdate={update}
                answered={requiredAnswers.restDays}
                onAnswer={() => setRequiredAnswers((answers) => ({ ...answers, restDays: true }))}
              />
            )}
          </CardContent>

          <CardFooter className="flex justify-between">
            <Button variant="ghost" onClick={prevStep} disabled={step === 1}>
              ← Back
            </Button>
            <div className="flex gap-3">
              {error && <p className="text-sm text-red-600 self-center">{error}</p>}
              {step < TOTAL_STEPS ? (
                <Button onClick={nextStep} disabled={!canAdvance(step, state, requiredAnswers)}>
                  Continue →
                </Button>
              ) : (
                <Button onClick={handleSubmit} loading={loading} disabled={!canAdvance(step, state, requiredAnswers)}>
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
        label="Your name *"
        placeholder="First name (or full name)"
        value={state.fullName}
        onChange={(e) => onUpdate({ fullName: e.target.value })}
        hint="So we can personalise your plan."
        autoFocus
        required
      />

      <div>
        <label className="text-sm font-semibold text-foreground mb-3 block">What's your current situation? *</label>
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
                weekendHours: 4,
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
          <label className="text-sm font-semibold text-foreground mb-3 block">Which year are you in? *</label>
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

function Step3({
  state,
  onUpdate,
  warning,
  ucatSenAnswered,
  onUcatSenAnswer,
}: StepProps & {
  warning: boolean
  ucatSenAnswered: boolean
  onUcatSenAnswer: () => void
}) {
  const today = toISODate(new Date())
  return (
    <div className="space-y-4">
      <Input
        label="UCAT exam date *"
        type="date"
        value={state.examDate ?? ''}
        min={today}
        onChange={e => onUpdate({ examDate: e.target.value || null })}
        required
      />
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          Exam time *
        </label>
        <input
          type="time"
          value={state.examTime ?? ''}
          onChange={e => onUpdate({ examTime: e.target.value || null })}
          className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          required
        />
        <p className="text-xs text-muted-foreground mt-1">No sessions will be scheduled on exam day.</p>
      </div>
      <div>
        <label className="text-sm font-medium text-foreground mb-1.5 block">
          Are you taking UCATSEN (extra time)? *
        </label>
        <div className="grid grid-cols-2 gap-3">
          {[
            { value: true, label: 'Yes', sub: 'Full mocks become 2h 30m.' },
            { value: false, label: 'No', sub: 'Full mocks stay at about 2h.' },
          ].map((option) => {
            const selected = ucatSenAnswered && state.ucatSen === option.value
            return (
              <button
                key={String(option.value)}
                type="button"
                onClick={() => {
                  onUpdate({ ucatSen: option.value })
                  onUcatSenAnswer()
                }}
                className={choiceCardClass(selected)}
              >
                <div className="font-semibold text-foreground text-sm">{option.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{option.sub}</div>
              </button>
            )
          })}
        </div>
      </div>
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

function Step4({
  state,
  onUpdate,
  answered,
  onAnswer,
}: StepProps & {
  answered: Record<ConfidenceKey, boolean>
  onAnswer: (key: ConfidenceKey) => void
}) {
  const sections: { key: ConfidenceKey; label: string }[] = [
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
      {sections.map(({ key, label }) => {
        const isAnswered = answered[key]
        return (
          <div key={key} className="space-y-2">
            <Slider
              label={`${label} *`}
              value={state.confidence[key]}
              min={1}
              max={5}
              lowLabel="Not confident"
              highLabel="Very confident"
              onChange={v => {
                onUpdate({ confidence: { ...state.confidence, [key]: v } })
                onAnswer(key)
              }}
            />
            {!isAnswered && (
              <Button
                type="button"
                variant="outline"
                onClick={() => onAnswer(key)}
                className="h-8 px-3 text-xs"
              >
                Confirm {state.confidence[key]}
              </Button>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Step 5: Study hours (all student types) ─────────────────────────────────

function Step5({
  state,
  onUpdate,
  answered,
  onAnswer,
}: StepProps & {
  answered: { schoolDayHours: boolean; weekendHours: boolean }
  onAnswer: (key: 'schoolDayHours' | 'weekendHours') => void
}) {
  const sit = state.currentSituation
  const isFlexible = sit === 'gap_year' || sit === 'graduated_free'
  const isWorking = sit === 'graduated_working'

  if (isFlexible) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Since you have a flexible schedule, all days are treated equally. What's the maximum you could study on a really good day?
        </p>
        <HourPicker
          options={[2, 3, 4, 5, 6, 8]}
          value={state.weekendHours}
          color="blue"
          answered={answered.weekendHours}
          onChange={h => {
            onUpdate({ schoolDayHours: h, weekendHours: h })
            onAnswer('schoolDayHours')
            onAnswer('weekendHours')
          }}
        />
        <p className="text-xs text-muted-foreground">
          We'll start at about half this and ramp up each week. Pick an ambitious max - you can always lower it later.
        </p>
      </div>
    )
  }

  if (isWorking) {
    return (
      <div className="space-y-6">
        <div>
          <label className="text-sm font-semibold text-foreground mb-3 block">
            On a really good work day, what's the maximum you could study? *
          </label>
          <HourPicker
            options={[0.5, 1, 1.5, 2, 2.5, 3]}
            value={state.schoolDayHours}
            color="blue"
            answered={answered.schoolDayHours}
            onChange={h => {
              onUpdate({ schoolDayHours: h })
              onAnswer('schoolDayHours')
            }}
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground mb-3 block">
            On a really good day off or weekend, what's the maximum you could study? *
          </label>
          <HourPicker
            options={[2, 3, 4, 5, 6, 8]}
            value={state.weekendHours}
            color="green"
            answered={answered.weekendHours}
            onChange={h => {
              onUpdate({ weekendHours: h })
              onAnswer('weekendHours')
            }}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          We'll ramp up from about half these numbers, so pick what a genuinely good day looks like.
        </p>
      </div>
    )
  }

  // School student
  return (
    <div className="space-y-6">
      <div>
        <label className="text-sm font-semibold text-foreground mb-3 block">
          On a really good school day (Mon-Fri during term), what's the maximum you could study? *
        </label>
        <HourPicker
          options={[1, 1.5, 2, 2.5, 3, 4]}
          value={state.schoolDayHours}
          color="blue"
          answered={answered.schoolDayHours}
          onChange={h => {
            onUpdate({ schoolDayHours: h })
            onAnswer('schoolDayHours')
          }}
        />
      </div>
      <div>
        <label className="text-sm font-semibold text-foreground mb-3 block">
          On a really good weekend day or during holidays, what's the maximum you could study? *
        </label>
        <HourPicker
          options={[2, 3, 4, 5, 6, 8]}
          value={state.weekendHours}
          color="green"
          answered={answered.weekendHours}
          onChange={h => {
            onUpdate({ weekendHours: h })
            onAnswer('weekendHours')
          }}
        />
        <p className="text-xs text-muted-foreground mt-2">
          We'll start at about half this and ramp up each week. Pick something ambitious.
        </p>
      </div>
    </div>
  )
}

// ─── Step 6: Time away (unified for all student types) ────────────────────────

function Step6({
  state,
  onUpdate,
  answered,
  onAnswer,
}: StepProps & {
  answered: boolean
  onAnswer: () => void
}) {
  const [rangeStart, setRangeStart] = useState('')
  const [rangeEnd, setRangeEnd] = useState('')
  const [rangeLabel, setRangeLabel] = useState('')
  const [kind, setKind] = useState<'holiday' | 'busy'>('busy')
  const today = toISODate(new Date())

  function addPeriod() {
    if (!rangeStart || !rangeEnd || rangeEnd < rangeStart) return
    const period: TimeAwayPeriod = { start: rangeStart, end: rangeEnd, kind, label: rangeLabel || undefined }
    onUpdate({ timeAwayPeriods: [...state.timeAwayPeriods, period] })
    onAnswer()
    setRangeStart(''); setRangeEnd(''); setRangeLabel('')
  }

  function remove(i: number) {
    onUpdate({ timeAwayPeriods: state.timeAwayPeriods.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Add any time away between now and your exam - school holidays, family trips, festivals, anything. We'll use these to schedule study intelligently around them. If there is none, confirm that below.
      </p>

      <Button
        type="button"
        variant={answered && state.timeAwayPeriods.length === 0 ? 'default' : 'outline'}
        onClick={() => {
          onUpdate({ timeAwayPeriods: [] })
          onAnswer()
        }}
        className="w-full"
      >
        I have no time away before my exam
      </Button>

      <div className="rounded-lg border border-border bg-muted p-4 space-y-3">
        {/* Kind toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setKind('busy')}
            className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium transition-all ${
              kind === 'busy'
                ? 'border-red-400 bg-red-50 text-red-700'
                : 'border-border text-muted-foreground hover:border-muted-foreground/40'
            }`}
          >
            Fully unavailable
          </button>
          <button
            type="button"
            onClick={() => setKind('holiday')}
            className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium transition-all ${
              kind === 'holiday'
                ? 'border-green-400 bg-green-50 text-green-700'
                : 'border-border text-muted-foreground hover:border-muted-foreground/40'
            }`}
          >
            Holiday (more study time)
          </button>
        </div>
        <p className="text-xs text-muted-foreground">
          {kind === 'busy'
            ? 'No sessions scheduled - perfect for festivals, family trips, or anything where you genuinely can\'t study.'
            : 'Treated as a free day: higher daily hours applied - ideal for school holidays when you have more time.'}
        </p>

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
          <input type="text"
            placeholder={kind === 'busy' ? 'Label (e.g. Family holiday)' : 'Label (e.g. Summer holidays)'}
            value={rangeLabel}
            onChange={e => setRangeLabel(e.target.value)}
            className="flex-1 h-9 rounded-lg border border-border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
          <Button onClick={addPeriod} disabled={!rangeStart || !rangeEnd || rangeEnd < rangeStart} variant="outline">Add</Button>
        </div>
      </div>

      {state.timeAwayPeriods.length > 0 ? (
        <div className="space-y-2">
          {state.timeAwayPeriods.map((p, i) => {
            const isHoliday = p.kind === 'holiday'
            return (
              <div key={i} className={`flex items-center justify-between rounded-lg border px-4 py-2.5 ${
                isHoliday ? 'border-green-200 bg-green-50' : 'border-red-100 bg-red-50'
              }`}>
                <div>
                  <span className={`text-xs font-semibold uppercase tracking-wide mr-2 ${isHoliday ? 'text-green-600' : 'text-red-400'}`}>
                    {isHoliday ? 'Holiday' : 'Blocked'}
                  </span>
                  <span className={`text-sm font-medium ${isHoliday ? 'text-green-800' : 'text-red-800'}`}>
                    {p.label || (isHoliday ? 'School holiday' : 'Unavailable')}
                  </span>
                  <span className={`text-xs ml-2 ${isHoliday ? 'text-green-600' : 'text-red-500'}`}>{formatRange(p)}</span>
                </div>
                <button type="button" onClick={() => remove(i)}
                  className={`text-lg leading-none ml-3 transition-colors ${isHoliday ? 'text-green-400 hover:text-red-500' : 'text-red-300 hover:text-red-600'}`}>×</button>
              </div>
            )
          })}
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground py-4">
          {answered
            ? 'No time away added.'
            : 'Add time away or confirm that you have none before continuing.'}
        </p>
      )}
    </div>
  )
}

// ─── Step 7: Rest days ────────────────────────────────────────────────────────

function Step7({
  state,
  onUpdate,
  answered,
  onAnswer,
}: StepProps & {
  answered: boolean
  onAnswer: () => void
}) {
  function toggle(day: number) {
    const updated = state.restDays.includes(day)
      ? state.restDays.filter(d => d !== day)
      : [...state.restDays, day]
    onUpdate({ restDays: updated })
    onAnswer()
  }

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted-foreground">
        Select any days that should <strong>always</strong> be rest days. Sessions will never be scheduled on them. If you do not need fixed rest days, confirm that below.
      </p>
      <Button
        type="button"
        variant={answered && state.restDays.length === 0 ? 'default' : 'outline'}
        onClick={() => {
          onUpdate({ restDays: [] })
          onAnswer()
        }}
        className="w-full"
      >
        I do not need guaranteed rest days
      </Button>
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
        {!answered
          ? 'Choose at least one rest day or confirm that you do not need any.'
          : state.restDays.length === 0
          ? 'No guaranteed rest days selected: sessions may be scheduled any day.'
          : `${state.restDays.length} day${state.restDays.length > 1 ? 's' : ''} always kept free.`}
      </p>
    </div>
  )
}

// ─── Shared sub-components ────────────────────────────────────────────────────

function HourPicker({ options, value, color, answered, onChange }: {
  options: number[]
  value: number
  color: 'blue' | 'green'
  answered: boolean
  onChange: (h: number) => void
}) {
  const active = color === 'blue'
    ? 'border-primary bg-training-active-muted text-primary'
    : 'border-green-500 bg-green-50 text-green-700'
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {options.map(h => {
        const selected = answered && value === h
        return (
          <button
            key={h}
            type="button"
            onClick={() => onChange(h)}
            className={`flex-1 min-w-[3rem] rounded-lg border-2 py-2.5 text-sm font-semibold transition-all ${
              selected ? active : 'border-border text-muted-foreground hover:border-muted-foreground/40'
            }`}
          >
            {h}h
          </button>
        )
      })}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

type StepProps = {
  state: OnboardingState
  onUpdate: (p: Partial<OnboardingState>) => void
}

function formatRange(p: { start: string; end: string }): string {
  const fmt = (d: string) => parseDate(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return p.start === p.end ? fmt(p.start) : `${fmt(p.start)} - ${fmt(p.end)}`
}

const STEP_TITLES = [
  'Have you started UCAT practice yet?',
  'A bit about you',
  'When is your exam?',
  'How confident are you in each section?',
  'How much can you study?',
  'Any time away before your exam?',
  'Any guaranteed rest days?',
]

const STEP_DESCRIPTIONS = [
  'This sets whether your first sessions are timed or untimed foundations.',
  'We\'ll use this to personalise your plan and how we talk about your schedule.',
  'We\'ll build your plan backwards from your exam date.',
  'Weaker sections get more sessions allocated. You can adjust these later.',
  'We\'ll ramp up from about half your max, so be ambitious.',
  'Add holidays, trips, festivals - or confirm there is nothing to add.',
  'Choose guaranteed rest days - or confirm you are happy to study any day.',
]

function canAdvance(step: number, state: OnboardingState, requiredAnswers: RequiredAnswers): boolean {
  if (step === 1) return state.hasPriorExperience !== null
  if (step === 2) {
    return (
      state.fullName.trim().length > 0 &&
      !!state.currentSituation &&
      (state.currentSituation !== 'school' || !!state.schoolYear)
    )
  }
  if (step === 3) return !!state.examDate && !!state.examTime && requiredAnswers.ucatSen
  if (step === 4) return Object.values(requiredAnswers.confidence).every(Boolean)
  if (step === 5) {
    if (state.currentSituation === 'gap_year' || state.currentSituation === 'graduated_free') {
      return requiredAnswers.weekendHours
    }
    return requiredAnswers.schoolDayHours && requiredAnswers.weekendHours
  }
  if (step === 6) return requiredAnswers.timeAway
  if (step === 7) return requiredAnswers.restDays
  return true
}

function allStepsComplete(state: OnboardingState, requiredAnswers: RequiredAnswers): boolean {
  return Array.from({ length: TOTAL_STEPS }).every((_, index) =>
    canAdvance(index + 1, state, requiredAnswers),
  )
}
