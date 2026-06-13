/**
 * Cloud-served VR passage pool.
 *
 * Question Lab can now generate full VR passage sets (trainer_type 'vr-passages':
 * a 260-400 word passage plus four authored tfct/mc4 questions). This module fetches
 * the active sets once per page load via the get_vr_passage_sets RPC and exposes
 * them in the same Passage shape the local bank uses, so trainers can treat
 * [...RAW_PASSAGES, ...cloud] as one pool. Authored questions ride along for quizzes
 * that prefer human-reviewed items over generated distortions.
 */

import { supabase } from "./supabase";
import { supabaseLog } from "./logger";
import type { Passage } from "../data/passages";

export type VrAuthoredQuestion = {
  type: "tfct" | "mc4";
  questionCategory: "standard" | "author-opinion" | "not-except";
  statement?: string;
  stem?: string;
  options?: string[];
  answer: string;
  explanation: string;
};

export type CloudVrPassageSet = {
  passage: Passage;
  questions: VrAuthoredQuestion[];
};

const DIFFICULTY_SCORE: Record<string, number> = { easy: 2, medium: 5, hard: 8 };

let cached: CloudVrPassageSet[] | null = null;
let inFlight: Promise<CloudVrPassageSet[]> | null = null;

function mapRow(row: unknown): CloudVrPassageSet | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const id = typeof r.id === "string" ? r.id : "";
  const passageText = typeof r.passage === "string" ? r.passage : "";
  const title = typeof r.title === "string" ? r.title : "";
  if (!id || !passageText || !title) return null;

  const questions: VrAuthoredQuestion[] = Array.isArray(r.questions)
    ? (r.questions.filter(
        (q) => q && typeof q === "object" && typeof (q as VrAuthoredQuestion).answer === "string",
      ) as VrAuthoredQuestion[])
    : [];

  return {
    passage: {
      id: `qlvr_${id}`,
      title,
      text: passageText,
      category: typeof r.category === "string" && r.category ? r.category : "Science",
      difficulty:
        DIFFICULTY_SCORE[typeof r.difficulty === "string" ? r.difficulty : "medium"] ?? 5,
    },
    questions,
  };
}

/** Fetch active cloud VR passage sets, cached for the page lifetime. Fails soft to []. */
export async function fetchCloudVrPassageSets(): Promise<CloudVrPassageSet[]> {
  if (cached) return cached;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const { data, error } = await supabase.rpc("get_vr_passage_sets");
      if (error) throw error;
      const rows = Array.isArray(data) ? data : [];
      cached = rows.map(mapRow).filter((s): s is CloudVrPassageSet => s !== null);
    } catch (err) {
      supabaseLog.error("vr_passage_pool_fetch_failed", {
        message: err instanceof Error ? err.message : String(err),
      });
      cached = [];
    } finally {
      inFlight = null;
    }
    return cached ?? [];
  })();
  return inFlight;
}

/** Authored questions for a pool passage, when it came from the cloud bank. */
export function getAuthoredQuestionsForPassage(passageId: string): VrAuthoredQuestion[] | null {
  if (!cached || !passageId.startsWith("qlvr_")) return null;
  const set = cached.find((s) => s.passage.id === passageId);
  return set && set.questions.length > 0 ? set.questions : null;
}
