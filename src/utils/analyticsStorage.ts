import { supabase } from '../lib/supabase';
import { trackEvent } from '../lib/analytics';
import { withRetry } from '../lib/retry';
import { supabaseLog } from '../lib/logger';
import { appendGuestSession } from '../lib/guestSessions';
import type { MentalMathsSummaryStats } from '../hooks/useMentalMathsLogic';
import { difficultyFromStageIndex } from '../components/mentalMaths/mentalMathsStages';

export interface GameSession {
    id: string;
    date: string;
    kps: number;
    accuracy: number;
    mode: 'sprint' | 'fingerTwister' | 'memory' | 'stages' | 'free';
    correctQuestions?: number;
    totalQuestions?: number;
    timeTaken?: string;
}

const STORAGE_KEY = 'ucat_mastery_stats';

export const saveSession = async (session: Omit<GameSession, 'id' | 'date'>) => {
    const history = getHistory();
    const newSession: GameSession = {
        ...session,
        id: crypto.randomUUID(),
        date: new Date().toISOString()
    };

    // Keep last 50 sessions in local storage
    const updatedHistory = [newSession, ...history].slice(0, 50);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));

    // Persist to Supabase if logged in, otherwise add to guest_sessions for the dashboard
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const timeSeconds = session.timeTaken ? parseInt(session.timeTaken, 10) : 60;
            const payload = {
                user_id: user.id,
                training_type: 'calculator' as const,
                wpm: session.kps,
                correct: session.correctQuestions || 0,
                total: session.totalQuestions || 0,
                time_seconds: timeSeconds,
            };
            try {
                await withRetry(async () => {
                    const { error } = await supabase.from('sessions').insert(payload);
                    if (error) throw error;
                });
                supabaseLog.info("calculator_session_saved", {
                    userId: user.id,
                    mode: session.mode,
                    kps: session.kps,
                    correct: payload.correct,
                    total: payload.total,
                });
                trackEvent("trainer_completed", { training_type: "calculator", mode: session.mode });
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                supabaseLog.error("calculator_session_save_failed", { message, userId: user.id });
            }
        } else {
            appendGuestSession({
                training_type: 'calculator',
                wpm: session.kps,
                correct: session.correctQuestions || 0,
                total: session.totalQuestions || 0,
                time_seconds: session.timeTaken ? parseInt(session.timeTaken, 10) : 60,
            });
        }
    } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        supabaseLog.error("calculator_session_auth_check_failed", { message });
    }

    return newSession;
};

/** Save a mental maths session to Supabase. wpm column stores average time per question in ms. Returns true on success. */
export async function saveMentalMathsSession(
  stats: MentalMathsSummaryStats,
  userId: string
): Promise<boolean> {
  const difficulty = difficultyFromStageIndex(stats.stageIndex);
  const timeSeconds = Math.round((stats.avgTimeMs * stats.total) / 1000) || 1;
  const payload = {
    user_id: userId,
    training_type: 'mental_maths' as const,
    difficulty,
    wpm: Math.round(stats.avgTimeMs),
    correct: stats.correct,
    total: stats.total,
    time_seconds: timeSeconds,
  };
  try {
    await withRetry(async () => {
      const { error } = await supabase.from('sessions').insert(payload);
      if (error) throw error;
    });
    supabaseLog.info("mental_maths_session_saved", {
      userId,
      difficulty,
      correct: stats.correct,
      total: stats.total,
    });
    trackEvent("trainer_completed", { training_type: "mental_maths", difficulty });
    return true;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    supabaseLog.error("mental_maths_session_save_failed", { message, userId });
    return false;
  }
}

export const getHistory = (): GameSession[] => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) return [];
        const parsed = JSON.parse(stored);
        if (!Array.isArray(parsed)) return [];

        // Validate and sanitize data
        return parsed.filter(item =>
            item &&
            typeof item.kps === 'number' && !isNaN(item.kps) &&
            typeof item.accuracy === 'number' && !isNaN(item.accuracy)
        );
    } catch (e) {
        console.error("Failed to parse history", e);
        // If data is corrupt, clear it to prevent persistent crashing
        localStorage.removeItem(STORAGE_KEY);
        return [];
    }
};

export const getAggregatedStats = () => {
    const history = getHistory();
    if (history.length === 0) return { averageKps: 0, averageAccuracy: 0, totalSessions: 0 };

    const totalKps = history.reduce((acc, curr) => acc + curr.kps, 0);
    const totalAcc = history.reduce((acc, curr) => acc + curr.accuracy, 0);

    return {
        averageKps: Number((totalKps / history.length).toFixed(1)),
        averageAccuracy: Number((totalAcc / history.length).toFixed(1)),
        totalSessions: history.length
    };
};

export const clearHistory = () => {
    localStorage.removeItem(STORAGE_KEY);
};
