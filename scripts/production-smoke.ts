import "dotenv/config";
import assert from "node:assert/strict";
import { nextReviewEntry } from "../src/lib/sjtReview";

const baseUrl = process.env.SMOKE_BASE_URL;
const supabaseUrl = process.env.SMOKE_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const anonKey = process.env.SMOKE_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
const email = process.env.SMOKE_EMAIL;
const password = process.env.SMOKE_PASSWORD;
const required = { SMOKE_BASE_URL: baseUrl, VITE_SUPABASE_URL: supabaseUrl, VITE_SUPABASE_ANON_KEY: anonKey, SMOKE_EMAIL: email, SMOKE_PASSWORD: password };
const missing = Object.entries(required).filter(([, value]) => !value).map(([name]) => name);
if (missing.length) throw new Error(`Missing smoke-test environment variables: ${missing.join(", ")}`);

const appResponse = await fetch(baseUrl!, { redirect: "follow" });
assert.equal(appResponse.ok, true, `App returned HTTP ${appResponse.status}`);
assert.match(appResponse.headers.get("content-type") ?? "", /text\/html/i);

const authResponse = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
  method: "POST",
  headers: { apikey: anonKey!, "Content-Type": "application/json" },
  body: JSON.stringify({ email, password }),
});
assert.equal(authResponse.ok, true, `Authentication failed with HTTP ${authResponse.status}`);
const auth = await authResponse.json() as { access_token?: string; user?: { id?: string } };
assert.ok(auth.access_token && auth.user?.id, "Authentication response did not contain a user and access token");
const headers = { apikey: anonKey!, Authorization: `Bearer ${auth.access_token}`, "Content-Type": "application/json" };

async function fetchQuestion(filters: Record<string, unknown>) {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_sjt_practice_question`, {
    method: "POST", headers, body: JSON.stringify(filters),
  });
  assert.equal(response.ok, true, `SJT question RPC failed with HTTP ${response.status}`);
  return response.json() as Promise<null | { id: string; type: string; domain: string; difficulty: string }>;
}

const initial = await fetchQuestion({ p_type: "appropriateness", p_exclude_ids: [] });
assert.ok(initial, "No active appropriateness question is available");
const filtered = await fetchQuestion({
  p_type: initial.type,
  p_domain: initial.domain,
  p_difficulty: initial.difficulty,
  p_question_id: initial.id,
  p_exclude_ids: [],
});
assert.deepEqual(filtered && { id: filtered.id, type: filtered.type, domain: filtered.domain, difficulty: filtered.difficulty }, initial);

const now = Date.now();
const reviewQuestion = { id: "smoke-review", type: "appropriateness" as const, domain: "trust_professionalism" as const };
const missed = nextReviewEntry(undefined, reviewQuestion, 0, 1, now);
assert.equal(missed?.successes, 0);
const firstSuccess = nextReviewEntry(missed!, reviewQuestion, 1, 1, missed!.due);
assert.equal(firstSuccess?.successes, 1);
assert.equal(nextReviewEntry(firstSuccess!, reviewQuestion, 1, 1, firstSuccess!.due), null);

const smokeSessionId = "00000000-0000-4000-8000-000000000001";
const sessionPayload = {
  user_id: auth.user.id,
  training_type: "rapid_recall",
  difficulty: "easy",
  wpm: null,
  correct: 1,
  total: 1,
  passage_id: "production-smoke-test",
  client_session_id: smokeSessionId,
};
const saveResponse = await fetch(`${supabaseUrl}/rest/v1/sessions?on_conflict=user_id,client_session_id`, {
  method: "POST",
  headers: { ...headers, Prefer: "resolution=merge-duplicates,return=representation" },
  body: JSON.stringify(sessionPayload),
});
assert.equal(saveResponse.ok, true, `Session save failed with HTTP ${saveResponse.status}`);
const saved = await saveResponse.json() as Array<{ user_id: string; client_session_id: string; correct: number; total: number }>;
assert.equal(saved.length, 1);
assert.deepEqual({ user_id: saved[0].user_id, client_session_id: saved[0].client_session_id, correct: saved[0].correct, total: saved[0].total }, {
  user_id: auth.user.id, client_session_id: smokeSessionId, correct: 1, total: 1,
});

const readResponse = await fetch(`${supabaseUrl}/rest/v1/sessions?user_id=eq.${encodeURIComponent(auth.user.id!)}&client_session_id=eq.${smokeSessionId}&select=user_id,client_session_id,correct,total`, { headers });
assert.equal(readResponse.ok, true, `Saved session read-back failed with HTTP ${readResponse.status}`);
const readBack = await readResponse.json() as unknown[];
assert.equal(readBack.length, 1, "The idempotent smoke session was not readable by its owner");

console.log("Production smoke passed: app availability, authentication, filtered SJT retrieval, delayed review retries and idempotent session saving.");
