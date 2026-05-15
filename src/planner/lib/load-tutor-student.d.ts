export function loadTutorStudentPlan(
  tutorId: string,
  planId: string,
): Promise<{
  plan: Record<string, unknown>
  planWeeks: Record<string, unknown>[]
  planDays: Record<string, unknown>[]
  sessions: Array<Record<string, unknown> & { completed: boolean }>
  mockScores: Record<string, unknown>[]
  reflections: Array<{
    id: string
    week_number: number
    difficulty_rating: number
    reflection_text: string
  }>
} | null>
