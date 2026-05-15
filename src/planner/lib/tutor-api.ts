import { supabase } from '../../lib/supabase'

export type TutorStudentPlan = {
  id: string
  slug: string
  exam_date: string
  status: string
  student: { id: string; email: string | null; full_name: string | null }
}

export async function isPlannerTutor(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from('profiles')
    .select('planner_role')
    .eq('id', userId)
    .maybeSingle()
  return data?.planner_role === 'tutor'
}

export async function fetchTutorStudents(tutorId: string): Promise<TutorStudentPlan[]> {
  const { data: members, error } = await supabase
    .from('plan_members')
    .select(`
      plan_id,
      plan:plans(
        id, slug, exam_date, status,
        student:profiles!plans_student_id_fkey(id, email, full_name)
      )
    `)
    .eq('user_id', tutorId)
    .eq('role', 'tutor')

  if (error) throw new Error(error.message)

  return (members ?? [])
    .map((m) => {
      const raw = m.plan as unknown
      const plan = Array.isArray(raw) ? raw[0] : raw
      if (!plan || typeof plan !== 'object') return null
      const row = plan as TutorStudentPlan & {
        student?: TutorStudentPlan['student'] | TutorStudentPlan['student'][]
      }
      const st = row.student
      const student = Array.isArray(st) ? st[0] : st
      if (!student) return null
      return { ...row, student } as TutorStudentPlan
    })
    .filter((p): p is TutorStudentPlan => p != null)
}

function inviteToken(): string {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  let binary = ''
  for (const b of bytes) binary += String.fromCharCode(b)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export async function createTutorInviteLink(tutorId: string): Promise<string> {
  const isTutor = await isPlannerTutor(tutorId)
  if (!isTutor) throw new Error('Forbidden')

  const token = inviteToken()
  const { error } = await supabase.from('student_invite_links').insert({
    token,
    tutor_id: tutorId,
  })
  if (error) throw new Error(error.message)

  return `${window.location.origin}/join/${token}`
}

export async function isStudentInviteTokenValid(token: string): Promise<boolean> {
  const { data, error } = await supabase.rpc('student_invite_token_valid', { p_token: token })
  if (error) return false
  return Boolean(data)
}
