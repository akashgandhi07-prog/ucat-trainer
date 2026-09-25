# Production smoke test

Run this after the targeted SJT migration and frontend release. Use a dedicated learner account. The test authenticates through Supabase, retrieves an active SJT question twice with exact filters, verifies the delayed-review state transitions, and saves then reads back a session.

```bash
SMOKE_BASE_URL=https://your-app.example \
SMOKE_SUPABASE_URL=https://your-project.supabase.co \
SMOKE_SUPABASE_ANON_KEY=... \
SMOKE_EMAIL=smoke-test@example.com \
SMOKE_PASSWORD=... \
npm run smoke:production
```

`SMOKE_SUPABASE_URL` and `SMOKE_SUPABASE_ANON_KEY` may be omitted when the matching `VITE_` variables are available in the environment. Never use a real learner account. The test reuses one fixed `client_session_id` for the dedicated account, so repeated runs update the same harmless one-question row instead of creating more data. It prints no credentials or access tokens.
