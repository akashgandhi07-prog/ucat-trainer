import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * True when `userId` is a linked tutor on `planId` (`plan_members.role = 'tutor'`).
 * Used by API guards and tutor-only server pages.
 */
export async function hasTutorPlanMembership(
  sb: SupabaseClient,
  planId: string,
  userId: string,
): Promise<boolean> {
  const { data: mem } = await sb
    .from('plan_members')
    .select('id')
    .eq('plan_id', planId)
    .eq('user_id', userId)
    .eq('role', 'tutor')
    .maybeSingle()
  return !!mem
}

/**
 * Authoritative check for student-only plan mutations.
 * Returns HTTP status when the caller must not proceed.
 */
export async function requireStudentPlan(
  sb: SupabaseClient,
  planId: string,
  userId: string,
): Promise<{ ok: true } | { ok: false; status: 404 | 403 }> {
  const { data } = await sb.from('plans').select('student_id').eq('id', planId).maybeSingle()
  if (!data) return { ok: false, status: 404 }
  if (data.student_id !== userId) return { ok: false, status: 403 }
  return { ok: true }
}

/**
 * Plan owner (student) or linked tutor (`plan_members.role = tutor`) may proceed.
 */
export async function requireStudentOrTutorPlan(
  sb: SupabaseClient,
  planId: string,
  userId: string,
): Promise<
  | { ok: true; role: 'student' | 'tutor'; studentId: string }
  | { ok: false; status: 404 | 403 }
> {
  const { data: plan } = await sb.from('plans').select('student_id').eq('id', planId).maybeSingle()
  if (!plan) return { ok: false, status: 404 }

  if (plan.student_id === userId) return { ok: true, role: 'student', studentId: plan.student_id }

  if (await hasTutorPlanMembership(sb, planId, userId)) {
    return { ok: true, role: 'tutor', studentId: plan.student_id }
  }
  return { ok: false, status: 403 }
}
