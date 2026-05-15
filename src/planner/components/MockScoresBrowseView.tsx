import { Link } from 'react-router-dom'
import { MockScoresView } from '@/components/plan/mock-scores-view'

type MockScoresBrowseViewProps = {
  /** Signed-in user with no cloud plan yet */
  signedIn?: boolean
}

/** Read-only mock tracker when no plan exists yet. */
export default function MockScoresBrowseView({ signedIn = false }: MockScoresBrowseViewProps) {
  return (
    <>
      <div className="border-b border-border bg-muted/30 px-4 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <p className="text-sm font-medium text-foreground">Logging requires a study plan</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            {signedIn
              ? 'You can explore charts and goals here. Create a free study plan to save mock scores to your account.'
              : 'Browse how tracking works below. Create a free plan on this device to log scores (sign in later to sync).'}
          </p>
          <Link
            to="/study-plan"
            className="mt-2 inline-flex text-xs font-medium text-primary hover:underline"
          >
            Set up study plan →
          </Link>
        </div>
      </div>
      <MockScoresView readOnly browseOnly planId="browse" mockScores={[]} />
    </>
  )
}
