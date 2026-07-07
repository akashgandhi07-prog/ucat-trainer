# UCAT Trainer + Planner — repo guide

One repo, one deployed app (`ucat.theukcatpeople.co.uk`, Vite + React 19 + TypeScript + Tailwind 4 + Supabase, Vercel): UCAT skills trainers (VR, DM, QR, SJT) **plus the study planner**, which lives embedded at `src/planner/embedded` and is wired in via aliases in `vite.config.ts`.

Read **`docs/PROJECT_SUMMARY_FOR_LLM.md`** before non-trivial work. Other key docs: `docs/WEEKLY_EMAILS.md` (weekly summary email runbook), `docs/SKILLS_PLAN_UNIFY_PLAYBOOK.md` (how the planner was merged in), `docs/SUPABASE_RLS.md`, `rules.md` (copy rules).

## Commands

```sh
npm run dev      # vite dev server
npm run check    # typecheck + eslint — run before finishing any change
npm run build    # tsc -b && vite build — must pass before committing
npm run backup   # timestamped .tgz of the whole workspace to ~/Backups/ucat-trainer/
```

`unify:*` scripts verify the planner merge (see the unify docs); `seed:*`/`verify:*`/`export:*` scripts manage question content.

## Layout

- `src/App.tsx` — all routing; SEO-keyword URLs + legacy redirects (don't rename routes casually). Pages are lazy-loaded via `lazyWithRetry`.
- `src/pages/` — trainer pages plus `planner/`, `tutor/`, `admin/`; `src/planner/embedded` — the planner app source (eslint-ignored; edit with care, it has its own conventions)
- `src/lib/` — supabase client, schemas, analytics, logging; `question-lab/` — question authoring pipeline
- `supabase/` — migrations and edge functions (`send-weekly-summaries`, `unsubscribe`, `add-mailchimp-subscriber`, `generate-trainer-questions`)
- `uk/` — the ORIGINAL standalone Next.js planner, its own separate git repo, superseded by `src/planner/embedded`. Ignored by this repo's git and eslint. Do not develop new planner features there.

## Copy rules (from `rules.md`)

UK English. **No em dashes or en dashes in any user-facing copy** — use commas, colons, `to` for ranges, or `·` for meta lines.

## Conventions

- Commit messages: one short line describing the actual change. No placeholder messages.
- `.env` / `.env.local` are gitignored; never commit them.
- Supabase: the trainer + planner share one project (`qhhmcsdteqcuhvdqhkfo`). RLS is load-bearing; check `docs/ACCESS_RLS_MATRIX.md` before schema changes.
- Verify before declaring done: `npm run check` && `npm run build`.
