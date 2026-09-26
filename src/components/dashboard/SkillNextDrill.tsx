import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import {
  getSkillAttempts,
  getSkillReviewState,
  recommendSkillTrainer,
  type SkillTrainerKey,
} from '../../lib/skillTrainerProgress'

const TRAINERS: Record<SkillTrainerKey, { label: string; path: string; purpose: string }> = {
  qr_setup: {
    label: 'QR Setup Trainer',
    path: '/ucat-qr-setup-trainer',
    purpose: 'translate words into the right calculation',
  },
  qr_extraction: {
    label: 'QR Data Extraction',
    path: '/ucat-qr-data-extraction-trainer',
    purpose: 'select the right table values and units',
  },
  qr_estimation: {
    label: 'Estimation & Elimination',
    path: '/ucat-qr-estimation-trainer',
    purpose: 'make faster calculate, estimate or skip decisions',
  },
  dm_constraints: {
    label: 'DM Constraint Builder',
    path: '/ucat-dm-constraint-builder',
    purpose: 'construct arrangements while tracking every rule',
  },
}

export default function SkillNextDrill() {
  const { user } = useAuth()
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const refresh = () => setNow(Date.now())
    window.addEventListener('skill-trainer-progress-updated', refresh)
    window.addEventListener('storage', refresh)
    const timer = window.setInterval(refresh, 60_000)
    return () => {
      window.removeEventListener('skill-trainer-progress-updated', refresh)
      window.removeEventListener('storage', refresh)
      window.clearInterval(timer)
    }
  }, [])

  const review = getSkillReviewState(user?.id, now)
  const recommendation = review.due[0]?.type ?? recommendSkillTrainer(user?.id)
  const trainer = TRAINERS[recommendation]
  const attemptCount = (Object.keys(TRAINERS) as SkillTrainerKey[])
    .reduce((sum, type) => sum + getSkillAttempts(type, user?.id).length, 0)
  // The link opens one trainer in review mode, which shows that trainer's due items,
  // so count only those.
  const dueHere = review.due.filter((item) => item.type === recommendation).length
  const hasDue = dueHere > 0
  const path = `${trainer.path}${hasDue ? '?review=1' : ''}`

  return (
    <section aria-label="Recommended skill drill" className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">Your skill focus</p>
          <h2 className="mt-1 text-lg font-semibold text-foreground">{trainer.label}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {hasDue
              ? `${dueHere} mistake${dueHere === 1 ? ' is' : 's are'} ready for review. Each mistake clears after two correct answers a few days apart.`
              : attemptCount === 0
                ? `Start here to ${trainer.purpose}. Your results will personalise later recommendations.`
                : `This is your least-practised or lowest-accuracy skill. Use it to ${trainer.purpose}.`}
          </p>
          {review.cleared > 0 && (
            <p className="mt-2 text-sm font-medium text-emerald-700">
              {review.cleared} skill mistake{review.cleared === 1 ? '' : 's'} successfully cleared
            </p>
          )}
          {!hasDue && review.pending.length > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              Next delayed retry due {new Date(review.pending[0].due).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })}.
            </p>
          )}
        </div>
        <Link to={path} className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
          {hasDue ? 'Review mistakes' : 'Start skill drill'}
        </Link>
      </div>
    </section>
  )
}
