import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { SettingsView } from '@/components/settings/settings-view'
import { GuestReflectPage } from '@/components/guest/guest-reflect-page'

export default async function SettingsPage() {
  const sb = await createClient()
  const { data: { user } } = await sb.auth.getUser()
  if (!user) return <GuestReflectPage />

  const { data: plan } = await sb
    .from('plans')
    .select('id, exam_date, exam_time, rest_days, ucat_sen')
    .eq('student_id', user.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!plan) redirect('/onboarding')

  return (
    <SettingsView
      planId={plan.id}
      examDate={plan.exam_date}
      examTime={plan.exam_time ?? null}
      ucatSen={plan.ucat_sen ?? false}
    />
  )
}
