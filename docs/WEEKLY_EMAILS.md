# Weekly study-summary emails — runbook

Personalised weekly emails ("your UCAT week: 5 sessions, 78% accuracy") sent every
**Sunday 17:00 UTC** to every user who trained that week or has an active study plan.

## Architecture (all already built and deployed)

```
pg_cron job "weekly-study-summary"  (Sunday 17:00 UTC)
  └─ reads 3 secrets from Supabase Vault
  └─ net.http_post → edge function send-weekly-summaries
       └─ RPC weekly_summary_data(week_start, week_end)
       │    aggregates: sessions + sjt_sessions + dm_trainer_sessions
       │    + plan adherence (plan_sessions vs session_completions)
       │    excludes profiles.weekly_summary_opt_out = true
       └─ sends via Resend API (from hello@ucat.theukcatpeople.co.uk)
       └─ logs to weekly_summary_log (unique user_id+week_start = idempotent)
Unsubscribe: edge function `unsubscribe` (?token=<profiles.unsubscribe_token>)
  sets weekly_summary_opt_out = true. One-click (RFC 8058) supported.
```

Local copies of both function sources: `supabase/functions/send-weekly-summaries/`
and `supabase/functions/unsubscribe/`.

## History (July 2026)

The system was deployed ~June 2026 but never worked: the cron job failed every
Sunday because the three Vault secrets were never created, and the edge function
had no secrets either. On 2026-07-07 the Vault secrets were created
(`weekly_summary_base_url`, `weekly_summary_anon_key`, `weekly_summary_cron_secret`)
and the cron → function pipeline was verified working. Remaining setup is below.

## Remaining setup (dashboard, one time)

1. **Resend account**: sign up at resend.com → Domains → add
   `ucat.theukcatpeople.co.uk` → add the DNS records it shows (at your DNS host)
   → wait for "Verified" → API Keys → create key (starts `re_`).
2. **Function secrets**: Supabase dashboard → project `TheUKCATPeople Trainer` →
   Edge Functions → Secrets → add:
   - `RESEND_API_KEY` = the `re_...` key
   - `WEEKLY_SUMMARY_CRON_SECRET` = value of `weekly_summary_cron_secret` in
     Database → Vault (they must match)

## Test (safe, sends nothing)

```sh
curl -s -X POST "https://qhhmcsdteqcuhvdqhkfo.supabase.co/functions/v1/send-weekly-summaries" \
  -H "Content-Type: application/json" \
  -d '{"secret":"<cron secret from Vault>","dryRun":true}'
```

Expect `{"weekStart":...,"candidates":N,"sent":0,...,"dryRun":true}`. Remove
`dryRun` to really send. Sunday runs then happen automatically; check
`select * from weekly_summary_log order by created_at desc` and
`select status, return_message from cron.job_run_details order by start_time desc limit 3`.
