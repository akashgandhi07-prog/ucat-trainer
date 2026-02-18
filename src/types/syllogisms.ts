/**
 * Types for the Syllogism Trainer (Decision Making).
 * UK English used in comments and display labels (e.g. colour, behaviour, analyse).
 */

export type LogicGroup = "categorical" | "relative" | "majority" | "complex";

/** A single syllogism question: one stimulus + one conclusion with correctness and explanation. */
export interface SyllogismQuestion {
  id: string;
  macro_block_id: string;
  stimulus_text: string;
  conclusion_text: string;
  is_correct: boolean;
  logic_group: LogicGroup;
  trick_type: string;
  explanation: string;
}

/** Session summary as stored in syllogism_sessions (with optional per-logic-group accuracy). */
export interface SyllogismSession {
  id: string;
  user_id: string;
  mode: "micro" | "macro";
  score: number;
  total_questions: number;
  average_time_per_decision: number;
  created_at: string;
  categorical_accuracy?: number | null;
  relative_accuracy?: number | null;
  majority_accuracy?: number | null;
  complex_accuracy?: number | null;
}

/** Payload for inserting a syllogism session (omits id and created_at). */
export interface SyllogismSessionInsert {
  user_id: string;
  mode: "micro" | "macro";
  score: number;
  total_questions: number;
  average_time_per_decision: number;
  categorical_accuracy?: number | null;
  relative_accuracy?: number | null;
  majority_accuracy?: number | null;
  complex_accuracy?: number | null;
}
