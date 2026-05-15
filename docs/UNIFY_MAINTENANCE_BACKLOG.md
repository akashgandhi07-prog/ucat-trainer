# Unify maintenance backlog (optional)

Small follow-ups that do **not** block the playbook checklist if explicitly accepted. Track owners in **`UNIFY_BULLET7_ADVISORS.md`** when you ship with known gaps.

## Dependency / supply chain

| Item | Notes |
| --- | --- |
| **`uk/` PostCSS (transitive via `next`)** | After bumping **Next.js** to **16.2.6**, `npm audit` may still report **moderate** PostCSS (nested under `next`). Do **not** run `npm audit fix --force` blindly (it can pin an ancient Next). Prefer waiting for a **Next** patch that bumps the bundled PostCSS, or overrides only if you verify the build. |

## Database / Supabase

| Item | Notes |
| --- | --- |
| **`pg_net` in `public`** | Advisor **0014**. Moving the extension is non-trivial on hosted Supabase; defer unless Supabase documents a supported migration path. |
| **Auth leaked-password protection** | Dashboard **Authentication** setting; not a repo migration. |
| **`student_invite_token_valid` + anon (0028)** | Required for **`/join/[token]`** without a session. Removing the lint means a **service_role** server route for token checks (see **`UNIFY_BULLET7_ADVISORS.md`**). |

## Related

- [`UNIFY_BULLET7_ADVISORS.md`](UNIFY_BULLET7_ADVISORS.md)
- [`SKILLS_PLAN_UNIFY_PLAYBOOK.md`](SKILLS_PLAN_UNIFY_PLAYBOOK.md)
