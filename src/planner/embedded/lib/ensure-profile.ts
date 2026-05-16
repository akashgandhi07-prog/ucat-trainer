/**
 * Ensures a profiles row exists for the signed-in user (RLS allows own insert).
 * Covers rare gaps where the auth trigger did not run yet or legacy accounts lack a row.
 */
import type { SupabaseClient, User } from '@supabase/supabase-js'

export async function ensureProfileForUser(sb: SupabaseClient, user: User): Promise<void> {
  const { data: existing } = await sb.from('profiles').select('id').eq('id', user.id).maybeSingle()
  if (existing) return

  const meta = user.user_metadata as Record<string, unknown> | undefined
  const fullName =
    typeof meta?.full_name === 'string'
      ? meta.full_name
      : typeof meta?.name === 'string'
        ? meta.name
        : null

  const { error } = await sb.rpc('ensure_profile_for_auth_user', {
    p_full_name: fullName,
  })

  if (error) throw new Error(error.message)
}
