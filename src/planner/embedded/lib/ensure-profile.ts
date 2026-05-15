/**
 * Ensures a profiles row exists for the signed-in user (RLS allows own insert).
 * Covers rare gaps where the auth trigger did not run yet or legacy accounts lack a row.
 */
import type { SupabaseClient, User } from '@supabase/supabase-js'

export async function ensureProfileForUser(sb: SupabaseClient, user: User): Promise<void> {
  const { data: existing } = await sb.from('profiles').select('id').eq('id', user.id).maybeSingle()
  if (existing) return

  const meta = user.user_metadata as Record<string, unknown> | undefined
  const roleRaw = typeof meta?.role === 'string' ? meta.role.trim().toLowerCase() : ''
  const planner_role =
    roleRaw === 'tutor' ? 'tutor' : roleRaw === 'student' ? 'student' : null

  const fullName =
    typeof meta?.full_name === 'string'
      ? meta.full_name
      : typeof meta?.name === 'string'
        ? meta.name
        : null

  const { error } = await sb.from('profiles').upsert(
    {
      id: user.id,
      email: user.email ?? null,
      planner_role,
      full_name: fullName,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  )

  if (error) console.error('ensureProfileForUser', error)
}
