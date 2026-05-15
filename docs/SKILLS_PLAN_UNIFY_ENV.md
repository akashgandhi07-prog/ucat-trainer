# Environment variables (skills-trainer + `uk/` planner)

Use this as a reference when configuring **staging** and **production**. Values must match **one** Supabase project when the apps share the same login.

## Vite trainer (repo root)

| Variable | Required | Purpose |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | Yes | Supabase project URL. |
| `VITE_SUPABASE_ANON_KEY` | Yes | Public anon key for browser client. |
| `VITE_SITE_URL` | If used | Canonical site URL for links or analytics helpers (see `src/lib/siteUrl.ts`). |
| `VITE_PLANNER_URL` | No | If set (trimmed), the header shows **Study plan** and opens this URL in a new tab (deployed **`uk`** app). Omit to hide the link. |

## Next.js planner (`uk/`)

| Variable | Required | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Same Supabase URL as the trainer for unified auth. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Same anon key as the trainer. |
| `NEXT_PUBLIC_APP_URL` | Recommended | Origin of the planner app (magic-link redirects, invite URLs). Falls back to request origin in some routes. |
| `NEXT_PUBLIC_TRAINER_URL` | For `/ucat*` embed shell | Public **https** origin of the Vite trainer (no trailing slash). Same drills as the standalone app, loaded in an iframe under the planner chrome. If unset, `/ucat` routes show setup instructions instead of the iframe. |
| `SUPABASE_SERVICE_ROLE_KEY` | For invites | Server-only. Needed for `auth.admin.inviteUserByEmail` on tutor invite API routes. |

## Shared rules

- **Never** expose `SUPABASE_SERVICE_ROLE_KEY` to the browser or commit it to the repo.
- Supabase **Authentication** settings: add every production and preview origin that participates in OTP flows (`Site URL`, **Redirect URLs**), including `/auth/callback` paths for **`uk`**.
- After changing URLs, retest OTP login and deep links with invite tokens.

## Dual Supabase (temporary / staged rollout)

**Preferred:** trainer and planner use the **same** `VITE_*` / `NEXT_PUBLIC_*` URL and anon key (one Skills project). Shared login and **`public.profiles`** behave as documented in **`docs/ACCESS_RLS_MATRIX.md`**.

If you **must** split (for example planner on a branch DB while trainer stays on production):

| App | Variables | Effect |
| --- | --- | --- |
| Trainer | `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` → **project A** | Drill **`sessions`**, trainer auth, **`profiles`** axis for trainer. |
| Planner | `NEXT_PUBLIC_SUPABASE_*` → **project B** | Planner schema + OTP; **no** shared session with trainer **A**. |

**Limitations:** users will **not** have one account across both apps; **`VITE_PLANNER_URL`** may still deep-link to the planner but the planner will not see trainer **A** identities. Treat dual-env as **short-lived** and track a cutover to one project. Release checklist item **5** still applies to trainer **against its configured project**; document which project is canonical for trainer in your runbook until unified.

## Related docs

- [`DEPLOY_UNIFY_QUICKSTART.md`](DEPLOY_UNIFY_QUICKSTART.md) copy-paste deploy checklist (two Vercel projects, redirect URLs, smoke test).
- [`SKILLS_PLAN_UNIFY_PLAYBOOK.md`](SKILLS_PLAN_UNIFY_PLAYBOOK.md) for branch and release flow.
- [`UNIFY_BULLET5_TRAINER_APP.md`](UNIFY_BULLET5_TRAINER_APP.md) for trainer smoke and env expectations before **`skills-plan-unify` → `main`**.
- [`UNIFY_BULLET6_OPS_CUTOVER.md`](UNIFY_BULLET6_OPS_CUTOVER.md) for redirects, Supabase redirect allowlists, parity, and rollback before **`skills-plan-unify` → `main`**.
- [`UNIFY_BULLET8_CI_PARITY.md`](UNIFY_BULLET8_CI_PARITY.md) for **`unify:bullet2-verify-ci`** vs **`unify:bullet2-verify`** and scheduled workflows.
- [`ACCESS_RLS_MATRIX.md`](ACCESS_RLS_MATRIX.md) for access expectations against the unified database.
