# Question Lab: one-click AI drafts

Admins can generate draft questions from `/admin/question-lab` without leaving the dashboard. The manual ChatGPT copy and paste flow is unchanged.

## Flow

1. Sign in as admin, open Question Lab, pick a trainer.
2. Ensure **Official examples** and **Output format** MD files are populated (same as manual flow).
3. Click **Generate 5 drafts**.
4. Edge Function calls OpenRouter (DeepSeek by default), runs checks, imports drafts.
5. Open **Review Queue**, review, then **Activate**.

AI never publishes active questions.

## Deploy Edge Function

```bash
supabase secrets set OPENROUTER_API_KEY=sk-or-...

# Optional model overrides
supabase secrets set OPENROUTER_GENERATE_MODEL=deepseek/deepseek-chat
supabase secrets set OPENROUTER_AUDIT_MODEL=google/gemini-2.0-flash-001

supabase functions deploy generate-trainer-questions
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are provided automatically in the Edge runtime.

## Trainers supported

- DM: Venn Logic, Data Logic, Argument Judge
- SJT: Appropriateness, Importance, Ranking
- QR: Conversions

Procedural trainers (syllogisms, mental maths, speed reading, etc.) stay on their existing generators.

## Verification layers

1. **Universal (code):** schema, duplicate stems, SJT structure, **UK English**, **no em/en dash**, **no AI/chat voice** (all options, stem, explanation, SJT rationales).
2. **Plugins (code):** set logic (Venn two-set overlap), numeric (data logic / conversions), SJT structure.
3. **LLM audit (cheap model):** wording, pedagogy, ambiguity; UK copy and no AI tone; does not override verified maths.

Soft copy issues (chatty phrasing, `!`, wordiness) import as `needs_review`, not `pass`.

## AI repair pass (automatic)

After the first generate + verify pass, any question that is **blocked** or **needs_review** (except **proven wrong maths**) is sent in **one extra batch** to the repair model with the issue list. Those are re-checked and imported if they pass.

Proven maths mismatches are never auto-repaired (unsafe to let the model invent new numbers).

Optional secret: `OPENROUTER_REPAIR_MODEL` (defaults to generate model).

Failed hard checks are not imported. Soft flags get `quality_status: needs_review`.

## Local dev

`supabase functions serve generate-trainer-questions` with secrets in `.env` or CLI. The admin UI calls the function with your session JWT.
