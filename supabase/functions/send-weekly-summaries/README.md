# Weekly study-summary emails

Sends each signed-in user a weekly email summarising their UCAT trainer activity
(sessions, accuracy, study time, active days) and study-plan adherence. Built on
**Resend** (send) + **Supabase Edge Functions** (render/send + unsubscribe) +
**pg_cron** (schedule).

- Sender: `TheUKCATPeople <hello@ucat.theukcatpeople.co.uk>`
- Consent: service email to all account holders, with a one-click unsubscribe
  (`profiles.weekly_summary_opt_out`) independent of the Mailchimp marketing flag.
- Schedule: Sundays 17:00 UTC (18:00 BST), summarising the Mon–Sun week that just ended.

## Files

| File | Purpose |
|---|---|
| `migrations/20260617120000_weekly_summary_emails.sql` | opt-out column + unsubscribe token, `weekly_summary_log`, `weekly_summary_data()` RPC, pg_cron job |
| `functions/send-weekly-summaries/index.ts` | computes the week, calls the RPC, renders + sends via Resend, logs each send |
| `functions/unsubscribe/index.ts` | one-click opt-out via per-user token |

## One-time setup

### 1. Verify the sending domain in Resend
In the Resend dashboard → **Domains** → add `ucat.theukcatpeople.co.uk`. Resend
generates ~3 DNS records (MX + SPF on `send.ucat…`, DKIM on `resend._domainkey.ucat…`,
and optionally DMARC). Add them in **Cloudflare** (DNS authority for the zone).

> Note: `ucat.theukcatpeople.co.uk` itself is a CNAME to Vercel. Resend's records live on
> `send.ucat…` and `resend._domainkey.ucat…` (different names), so there's no CNAME conflict.
> Set those Cloudflare records to **DNS only** (grey cloud), not proxied.

### 2. Set edge-function secrets
```bash
supabase secrets set RESEND_API_KEY=<your-resend-key>
supabase secrets set WEEKLY_SUMMARY_CRON_SECRET=<random-long-string>
```
> The Resend key pasted in chat is exposed — **generate a fresh one** and use that here.

### 3. Set Vault secrets used by the cron job (Supabase SQL editor)
```sql
select vault.create_secret('https://qhhmcsdteqcuhvdqhkfo.supabase.co', 'weekly_summary_base_url');
select vault.create_secret('<anon-key>',                                 'weekly_summary_anon_key');
select vault.create_secret('<same-value-as-WEEKLY_SUMMARY_CRON_SECRET>', 'weekly_summary_cron_secret');
```

### 4. Apply the migration and deploy the functions
```bash
supabase db push
supabase functions deploy send-weekly-summaries
supabase functions deploy unsubscribe
```

## Test before going live
Dry run (counts recipients, renders sample subjects, sends nothing):
```bash
curl -i -X POST "https://qhhmcsdteqcuhvdqhkfo.supabase.co/functions/v1/send-weekly-summaries" \
  -H "Authorization: Bearer <anon-key>" -H "Content-Type: application/json" \
  -d '{"secret":"<cron-secret>","dryRun":true}'
```
Send a single real email to yourself by pinning the week to one with your own activity
(the `weekly_summary_log` unique constraint prevents duplicates per week):
```bash
curl -i -X POST "https://qhhmcsdteqcuhvdqhkfo.supabase.co/functions/v1/send-weekly-summaries" \
  -H "Authorization: Bearer <anon-key>" -H "Content-Type: application/json" \
  -d '{"secret":"<cron-secret>","weekStart":"2026-06-08","weekEnd":"2026-06-14"}'
```

## Notes / future work
- Study time excludes SJT drills (the `sjt_sessions` table stores no per-session timing).
- Users with zero activity **and** no active plan are skipped (no empty emails).
- To change the schedule, edit the `cron.schedule(...)` cron expression in the migration
  (or `select cron.alter_job(...)`). Alternative scheduler: a GitHub Actions workflow that
  `curl`s the function weekly with the cron secret in repo secrets.
