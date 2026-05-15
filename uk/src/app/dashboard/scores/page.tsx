import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { MockScoresView } from '@/components/plan/mock-scores-view'

export default async function ScoresPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: plan } = await sb
    .from('plans')
    .select('*')
    .eq('student_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!plan) redirect('/onboarding')

  const { data: mockScores } = await sb
    .from('mock_scores')
    .select('*')
    .eq('plan_id', plan.id)
    .order('logged_date')

  return (
    <MockScoresView
      planId={plan.id}
      mockScores={mockScores ?? []}
      initialTargetTotal={plan.mock_target_total ?? null}
      initialTargetSjtBand={plan.mock_target_sjt_band ?? null}
    />
  )
}
