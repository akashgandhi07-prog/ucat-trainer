import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ReflectView } from '@/components/plan/reflect-view'
import { GuestReflectPage } from '@/components/guest/guest-reflect-page'

export default async function ReflectPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return <GuestReflectPage />

  const { data: plan } = await sb
    .from('plans')
    .select('id')
    .eq('student_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!plan) redirect('/onboarding')

  const { data: reflections } = await sb
    .from('weekly_reflections')
    .select('*')
    .eq('plan_id', plan.id)
    .order('week_number')

  const { data: planWeeks } = await sb
    .from('plan_weeks')
    .select('week_number, week_start, is_locked')
    .eq('plan_id', plan.id)
    .order('week_number')

  return (
    <ReflectView
      planId={plan.id}
      reflections={reflections ?? []}
      planWeeks={planWeeks ?? []}
    />
  )
}
