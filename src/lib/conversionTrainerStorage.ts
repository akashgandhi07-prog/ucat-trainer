export type ConversionCategoryStat = {
  correct: number;
  total: number;
};

export type ConversionTrainerDetailSession = {
  id: string;
  created_at: string;
  correct: number;
  total: number;
  time_seconds: number;
  categoryStats: Record<string, ConversionCategoryStat>;
  trapStats: Record<string, number>;
};

const STORAGE_KEY = "ucat_conversion_trainer_details_v1";
const MAX_SESSIONS = 100;

function readSessions(): ConversionTrainerDetailSession[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (session): session is ConversionTrainerDetailSession =>
        session &&
        typeof session.id === "string" &&
        typeof session.created_at === "string" &&
        typeof session.correct === "number" &&
        typeof session.total === "number" &&
        typeof session.categoryStats === "object" &&
        typeof session.trapStats === "object",
    );
  } catch {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export function getConversionTrainerDetailSessions(): ConversionTrainerDetailSession[] {
  return readSessions();
}

export function appendConversionTrainerDetailSession(
  session: Omit<ConversionTrainerDetailSession, "id" | "created_at">,
): ConversionTrainerDetailSession {
  const nextSession: ConversionTrainerDetailSession = {
    ...session,
    id: crypto.randomUUID(),
    created_at: new Date().toISOString(),
  };
  const sessions = [nextSession, ...readSessions()].slice(0, MAX_SESSIONS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  return nextSession;
}
