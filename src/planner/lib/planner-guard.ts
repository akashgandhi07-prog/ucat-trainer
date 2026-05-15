import type { SupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

export async function requireStudentPlan(
  planId: string,
  userId: string,
  sb: SupabaseClient = supabase,
): Promise<{ ok: true } | { ok: false; status: 404 | 403; message: string }> {
  const { data } = await sb.from('plans').select('student_id').eq('id', planId).maybeSingle()
  if (!data) return { ok: false, status: 404, message: 'Plan not found' }
  if (data.student_id !== userId) return { ok: false, status: 403, message: 'Not allowed to update this plan' }
  return { ok: true }
}

export async function requireStudentOrTutorPlan(
  planId: string,
  userId: string,
  sb: SupabaseClient = supabase,
): Promise<
  | { ok: true; role: 'student' | 'tutor'; studentId: string }
  | { ok: false; status: 404 | 403; message: string }
> {
  const { data: plan } = await sb.from('plans').select('student_id').eq('id', planId).maybeSingle()
  if (!plan) return { ok: false, status: 404, message: 'Plan not found' }

  if (plan.student_id === userId) {
    return { ok: true, role: 'student', studentId: plan.student_id }
  }

  const { data: mem } = await sb
    .from('plan_members')
    .select('id')
    .eq('plan_id', planId)
    .eq('user_id', userId)
    .eq('role', 'tutor')
    .maybeSingle()

  if (mem) return { ok: true, role: 'tutor', studentId: plan.student_id }
  return { ok: false, status: 403, message: 'Not allowed to update this plan' }
}
