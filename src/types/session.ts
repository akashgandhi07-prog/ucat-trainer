/**
 * Strictly typed user session and auth state. Use these instead of ad-hoc or any types.
 * All types are explicit to prevent accidental 'any' in session flow.
 */
import type { User } from "@supabase/supabase-js";
import type { Profile } from "../lib/profileApi";

/** Authenticated user + profile. Use when you need both identity and profile. No `any`. */
export interface UserSession {
  readonly user: User;
  readonly profile: Profile | null;
}

/** Type guard: narrows to UserSession when user is present. */
export function hasUserSession(state: { user: User | null; profile: Profile | null }): state is UserSession {
  return state.user !== null;
}

/** Auth state exposed to the app (useAuth return type). */
export interface AuthState {
  readonly user: User | null;
  readonly profile: Profile | null;
  readonly loading: boolean;
  readonly isAdmin: boolean;
  /** True when initial getSession failed (e.g. network). Use with retryGetSession for recovery UI. */
  readonly sessionLoadFailed: boolean;
  refetchProfile: () => Promise<void>;
  /** Retry loading session (e.g. after network failure). */
  retryGetSession: () => Promise<void>;
}

/** Session row as returned from Supabase (sessions table). */
export interface SessionRow {
  id: string;
  user_id: string;
  training_type: "speed_reading" | "rapid_recall" | "keyword_scanning";
  wpm: number | null;
  correct: number;
  total: number;
  created_at: string;
  passage_id: string | null;
  wpm_rating?: string | null;
  time_seconds?: number | null;
}

/** Payload for inserting a row into sessions. Use this instead of Record<string, unknown>. */
export interface SessionInsertPayload {
  user_id: string;
  training_type: "speed_reading" | "rapid_recall" | "keyword_scanning";
  wpm: number | null;
  correct: number;
  total: number;
  passage_id?: string | null;
  wpm_rating?: string | null;
  time_seconds?: number | null;
}
