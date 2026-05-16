import { useAuthModal } from '../../contexts/AuthModalContext'
import { Button } from '@/components/ui/button'
import { MockScoresView } from '@/components/plan/mock-scores-view'

type MockScoresBrowseViewProps = {
  /** Signed-in cloud load failed after retry */
  loadError?: boolean
}

/** Preview mock tracker; logged-out users see a register CTA. */
export default function MockScoresBrowseView({ loadError = false }: MockScoresBrowseViewProps) {
  const { openAuthModal } = useAuthModal()

  return (
    <>
      <div className="border-b border-border bg-muted/25">
        <div className="mx-auto max-w-4xl px-4 py-4 sm:px-6 sm:py-5 lg:px-8">
          {loadError ? (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-foreground">Could not load mock tracker</p>
              <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                Refresh the page or try again in a moment. If it keeps happening, use Feedback in the header.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 space-y-1.5">
                <p className="text-sm font-semibold text-foreground">
                  Register for free to access this feature
                </p>
                <p className="text-xs leading-relaxed text-muted-foreground sm:text-sm">
                  Save mock scores across devices, set targets, and watch trends. No payment required.
                </p>
              </div>
              <Button
                type="button"
                className="w-full shrink-0 sm:w-auto"
                onClick={() => openAuthModal('register')}
              >
                Create free account
              </Button>
            </div>
          )}
        </div>
      </div>
      <MockScoresView readOnly browseOnly planId="browse" mockScores={[]} />
    </>
  )
}
