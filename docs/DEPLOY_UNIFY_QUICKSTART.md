# Deploy unified trainer + planner (quickstart)

One Supabase project: `https://qhhmcsdteqcuhvdqhkfo.supabase.co` (Skills / linked MCP project). Schema is already applied; do not replay `SUBMIT_ALL_MIGRATIONS_IN_ORDER.sql` on this project.

## 1. Two Vercel projects (recommended)

| Project | Root directory | Framework | Production domain (example) |
| --- | --- | --- | --- |
| **Trainer** | `.` (repo root) | Vite | `https://ucat.theukcatpeople.co.uk` |
| **Planner** | `uk` | Next.js | e.g. `https://plan.theukcatpeople.co.uk` or a `*.vercel.app` preview first |

Connect both to branch **`skills-plan-unify`** (then `main` after merge).

## 2. Environment variables

Copy anon key from Supabase Dashboard → Project Settings → API (do not commit).

### Trainer (root)

```
VITE_SUPABASE_URL=https://qhhmcsdteqcuhvdqhkfo.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
VITE_SITE_URL=https://ucat.theukcatpeople.co.uk
VITE_PLANNER_URL=https://<your-planner-host>
```

### Planner (`uk/`)

```
NEXT_PUBLIC_SUPABASE_URL=https://qhhmcsdteqcuhvdqhkfo.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<same anon key>
NEXT_PUBLIC_APP_URL=https://<your-planner-host>
NEXT_PUBLIC_TRAINER_URL=https://ucat.theukcatpeople.co.uk
SUPABASE_SERVICE_ROLE_KEY=<service role, server only>
```

## 3. Supabase Auth redirect URLs

Dashboard → Authentication → URL configuration. Add (adjust hosts):

- `https://<planner-host>/auth/callback`
- `https://ucat.theukcatpeople.co.uk/reset-password`
- Preview URLs if you use Vercel previews: `https://*.vercel.app/auth/callback`

## 4. Smoke test (single login)

1. Sign in on **trainer** → run a short drill → check `sessions` row (Dashboard or Supabase Table Editor).
2. Open **Study plan** / **Mock scores** from header or dashboard hub → complete onboarding on planner if prompted.
3. Log one mock score → check `mock_scores` row.
4. Sign out and back in → data still visible.

## 5. Merge

When smoke passes: PR **`skills-plan-unify` → `main`** on [TheUKCATPeople/skills-trainer](https://github.com/TheUKCATPeople/skills-trainer) (see `docs/UNIFY_BULLET1_GIT.md`).
