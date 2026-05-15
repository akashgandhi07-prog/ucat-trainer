export function migrateGuestPlannerToCloud(studentId: string): Promise<{
  migrated: boolean
  reason?: string
}>
