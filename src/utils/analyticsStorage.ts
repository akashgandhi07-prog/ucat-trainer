import { supabase } from '../lib/supabase';
import { trackEvent } from '../lib/analytics';

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

    // Persist to Supabase if user is logged in
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const timeSeconds = session.timeTaken ? parseInt(session.timeTaken, 10) : 60; // Default or parse "60s"

            const { error } = await supabase.from('sessions').insert({
                user_id: user.id,
                training_type: 'calculator',
                wpm: session.kps, // Mapping KPS to wpm column for consistency
                correct: session.correctQuestions || 0,
                total: session.totalQuestions || 0,
                time_seconds: timeSeconds,
                difficulty: session.mode, // Storing drill mode in difficulty column
                created_at: newSession.date,
                // created_at is automatic in DB usually, but we can enforce client time or let DB handle it. 
                // Let's rely on DB default or if needed pass it. 
                // Actually 'created_at' in the table might be sufficient. 
                // Let's pass it to match local session time exactly.
            });

            if (error) {
                console.error("Failed to save calculator session to Supabase:", error);
            } else {
                trackEvent("trainer_completed", { training_type: "calculator", mode: session.mode });
            }
        }
    } catch (err) {
        console.error("Error saving calculator session:", err);
    }

    return newSession;
};

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
