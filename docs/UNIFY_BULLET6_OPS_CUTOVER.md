# Unify plan bullet 6: Ops, redirects, auth URLs, rollback

This document closes **checklist item 6** in **`docs/SKILLS_PLAN_UNIFY_PLAYBOOK.md`**: hosting redirects, **environment parity** with **`docs/SKILLS_PLAN_UNIFY_ENV.md`**, Supabase **Authentication** redirect allowlists, and a practical **rollback** path the team can execute without guesswork.

## Intent

1. Users and magic links always land on the **deployed** origins you intend (no stale domains).
2. **Staging** mirrors **production** in *shape*: same variables present, same Supabase project policy (unified vs dual-env-see env doc), so a green staging deploy predicts prod behaviour.
3. Supabase **Site URL** and **Redirect URLs** include every trainer and planner origin that participates in password reset, OTP, or invite flows.
4. If a cutover goes wrong, the team can **roll back** in ordered steps (feature flag → deploy → DNS / merge).

---

## 1. Environment parity checklist

Use **`docs/SKILLS_PLAN_UNIFY_ENV.md`** as the source of variable names.

| Check | Trainer (hosting env) | Planner (`uk/` hosting env) |
| --- | --- | --- |
| Supabase URL + anon key | `VITE_SUPABASE_*` → intended project | `NEXT_PUBLIC_SUPABASE_*` **match** if unified |
| Planner link (optional) | `VITE_PLANNER_URL` → **HTTPS** origin of deployed `uk` app | - |
| App origin for links | `VITE_SITE_URL` set if you rely on canonical URLs / analytics | `NEXT_PUBLIC_APP_URL` → **HTTPS** origin of planner (no trailing slash convention: trim in app, but be consistent) |
| Tutor invites | - | `SUPABASE_SERVICE_ROLE_KEY` present **only** on server |

**Preview deployments:** Each preview origin used for login or email links must be added to Supabase **Redirect URLs** (see below), or OTP and callbacks will fail with redirect errors.

**Dual-project mode:** If trainer and planner still point at different Supabase projects, document which hostnames map to which project in your team runbook; identity will not be shared until you unify (**`docs/SKILLS_PLAN_UNIFY_ENV.md`**).

---

## 2. Supabase Authentication (redirect allowlist)

In the Supabase dashboard: **Authentication → URL configuration**.

### Site URL

- Set to the **primary** user-facing origin for the **main** product surface you consider canonical (often trainer root **or** planner root-pick one story for “default” email templates).
- Changing Site URL affects default links in some templates; prefer being explicit in app code (`redirectTo`, `NEXT_PUBLIC_APP_URL`) over relying on defaults.

### Redirect URLs (add all that apply)

Include **exact** callback and recovery paths your apps use:

| Flow | Typical URL pattern |
| --- | --- |
| Planner OTP / magic link (code exchange) | `https://<planner-host>/auth/callback` |
| Local planner dev | `http://localhost:3000/auth/callback` (and any other dev ports you use) |
| Password reset (trainer) | `https://<trainer-host>/reset-password` (see `getResetRedirectUrl` in `src/components/auth/AuthModal.tsx`) |
| Trainer embedded in planner (`NEXT_PUBLIC_TRAINER_URL` iframe) | Same trainer origins as above; CSP `frame-ancestors` on the trainer host must allow the planner origin or the iframe stays blank until fixed. |
| Local trainer dev | `http://localhost:5173/reset-password` (or your Vite port) |

Also allow **parent** origins if your Supabase project settings accept wildcard patterns for your hosting provider’s preview URLs (e.g. `https://*.vercel.app/**` only if your security model accepts it).

After edits, run a full **password reset** and **planner OTP** test from each environment.

---

## 3. HTTP redirects and routing (hosting)

Plan these at the CDN or host (Vercel, Netlify, Cloudflare, etc.):

| Concern | Recommendation |
| --- | --- |
| Apex vs `www` | 301 permanently to a single canonical host; ensure Supabase redirect list includes **both** during migration if both stay live briefly. |
| Legacy planner domain | If traffic still hits an old hostname, **301** to the new **`uk`** production origin; preserve path only when routes match. |
| Trainer pathname migrations | In-app **`App.tsx`** already redirects short paths (e.g. `/reader`) to keyword routes; do not duplicate that in the edge unless you must support bookmarks on hosts that never hit the SPA. |

**Study plan link:** `VITE_PLANNER_URL` should point to the **public** planner origin users will use in production. If the planner moves hostnames, update trainer env and redeploy trainer (or users get broken links).

---

## 4. Rollback (ordered)

Choose the shallowest fix first:

1. **Navigation only:** Unset or blank **`VITE_PLANNER_URL`** in trainer production env and redeploy trainer-the **Study plan** header link disappears; trainer and drill DB usage are unchanged.
2. **Planner broken, trainer OK:** Revert or roll back the **`uk`** deployment to the last good deployment; keep Supabase migrations only if the database is compatible (schema rollback is a separate, dangerous step-usually avoid).
3. **Bad merge / release:** Revert the **`skills-plan-unify` → `main`** merge commit (or redeploy previous Git SHA) for the affected apps.
4. **DNS / domain cutover:** Repoint DNS to the previous origin or put a maintenance page up; update Supabase redirect allowlist if origins change again.

**Database:** Rolling back **application** code does not undo applied migrations. If a migration caused the incident, follow your DB branching or PITR process; do not truncate planner tables on production unless runbooked.

Use the **rollback owners** table in the next section so DNS, Supabase URL, and deploy permissions are not ambiguous during an incident.

---

## 5. Rollback owners (fill before merge)

| Role | Person / rotation | Can revert hosting deploy | Can edit Supabase Auth URLs | Can change DNS |
| --- | --- | --- | --- | --- |
| Primary | Assign owner before merge | yes | yes | yes |
| Backup | Assign owner before merge | yes | yes | no |

## 6. Communication

Before merge to **`main`**, leave a short internal note (Slack/wiki) listing:

- Production trainer URL and planner URL.
- Whether one or two Supabase projects are in use.
- Who approved Supabase redirect URL changes and when.

---

## Related docs

- [`UNIFY_RELEASE_GATE_STATUS.md`](UNIFY_RELEASE_GATE_STATUS.md) (recorded checks vs org-only tasks)
- [`SKILLS_PLAN_UNIFY_PLAYBOOK.md`](SKILLS_PLAN_UNIFY_PLAYBOOK.md) (full merge checklist)
- [`UNIFY_BULLET7_ADVISORS.md`](UNIFY_BULLET7_ADVISORS.md) (advisors triage + Mailchimp RLS)
- [`SKILLS_PLAN_UNIFY_ENV.md`](SKILLS_PLAN_UNIFY_ENV.md) (variable reference + dual Supabase)
- [`UNIFY_BULLET5_TRAINER_APP.md`](UNIFY_BULLET5_TRAINER_APP.md) (trainer smoke before cutover)
- [`ACCESS_RLS_MATRIX.md`](ACCESS_RLS_MATRIX.md) (auth and RLS expectations)
