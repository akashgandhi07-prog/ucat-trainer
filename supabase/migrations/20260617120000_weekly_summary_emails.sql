-- Weekly study-summary emails (Resend + pg_cron).
--
-- Adds an unsubscribe token + suppression flag to profiles, a per-week send log
-- (idempotency), an aggregate RPC for each user's weekly stats, and a pg_cron job
-- that invokes the `send-weekly-summaries` edge function via pg_net.
--
-- Consent model: summaries are sent to ALL signed-in users as a service email
-- (about their own account activity), honouring a dedicated one-click unsubscribe
-- (`weekly_summary_opt_out`) that is independent of the Mailchimp marketing opt-in.
--
-- Operator setup (one-time; values are NOT stored in the repo):
--   supabase secrets set RESEND_API_KEY=...              -- edge function
--   supabase secrets set WEEKLY_SUMMARY_CRON_SECRET=...  -- edge function
--   -- Vault secrets read by the cron job (run in the SQL editor):
--   select vault.create_secret('https://<ref>.supabase.co', 'weekly_summary_base_url');
--   select vault.create_secret('<anon-key>',                 'weekly_summary_anon_key');
--   select vault.create_secret('<cron-secret>',              'weekly_summary_cron_secret'); -- same value as WEEKLY_SUMMARY_CRON_SECRET

alter table public.profiles
  add column if not exists weekly_summary_opt_out boolean not null default false,
  add column if not exists unsubscribe_token uuid not null default gen_random_uuid();

create unique index if not exists profiles_unsubscribe_token_idx
  on public.profiles (unsubscribe_token);

create table if not exists public.weekly_summary_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  sent_at timestamptz not null default now(),
  status text not null default 'sent' check (status in ('sent', 'failed', 'skipped')),
  error text,
  unique (user_id, week_start)
);

alter table public.weekly_summary_log enable row level security;
-- No RLS policies: only service_role (used by the edge function) bypasses RLS.
revoke all on public.weekly_summary_log from anon, authenticated;

comment on table public.weekly_summary_log is
  'One row per user per ISO week the weekly summary was processed; enforces idempotency.';

-- Per-user weekly activity aggregate across every trainer session table, plus plan
-- adherence. SECURITY DEFINER so it can read auth.users email and bypass RLS; locked
-- to service_role only.
create or replace function public.weekly_summary_data(p_week_start date, p_week_end date)
returns table (
  user_id uuid,
  email text,
  first_name text,
  unsubscribe_token uuid,
  sessions_count bigint,
  correct_sum numeric,
  total_sum numeric,
  study_seconds bigint,
  active_days bigint,
  planned_sessions bigint,
  completed_sessions bigint
)
language sql
security definer
set search_path = public, auth, pg_catalog
as $$
  with activity as (
    -- VR/QR trainers: correct/total scored, timed.
    select user_id, created_at,
           correct::numeric as correct_pts,
           total::numeric as total_pts,
           coalesce(time_seconds, 0) as study_seconds
    from public.sessions
    where created_at >= p_week_start and created_at < (p_week_end + 1)
    union all
    -- SJT trainer: point-scored (half marks), not timed.
    select user_id, created_at, score, max_score, 0
    from public.sjt_sessions
    where created_at >= p_week_start and created_at < (p_week_end + 1)
    union all
    -- DM trainer: correct count out of total_questions, timed.
    select user_id, created_at,
           score::numeric, total_questions::numeric, elapsed_seconds
    from public.dm_trainer_sessions
    where created_at >= p_week_start and created_at < (p_week_end + 1)
  ),
  agg as (
    select user_id,
           count(*) as sessions_count,
           sum(correct_pts) as correct_sum,
           sum(total_pts) as total_sum,
           sum(study_seconds)::bigint as study_seconds,
           count(distinct ((created_at at time zone 'Europe/London')::date)) as active_days
    from activity
    group by user_id
  ),
  active_plan as (
    select distinct on (student_id) student_id as user_id, id as plan_id
    from public.plans
    where status = 'active'
    order by student_id, created_at desc
  ),
  planned as (
    select ap.user_id,
           count(*) filter (where t.session_type <> 'rest') as planned_sessions,
           count(*) filter (
             where t.session_type <> 'rest' and c.session_id is not null
           ) as completed_sessions
    from active_plan ap
    join public.plan_sessions t
      on t.plan_id = ap.plan_id
     and t.day_date >= p_week_start
     and t.day_date <= p_week_end
    left join public.session_completions c
      on c.session_id = t.id and c.student_id = ap.user_id
    group by ap.user_id
  ),
  base as (
    select user_id from agg
    union
    select user_id from active_plan
  )
  select b.user_id,
         u.email::text,
         pr.first_name,
         pr.unsubscribe_token,
         coalesce(a.sessions_count, 0),
         coalesce(a.correct_sum, 0),
         coalesce(a.total_sum, 0),
         coalesce(a.study_seconds, 0),
         coalesce(a.active_days, 0),
         coalesce(pl.planned_sessions, 0),
         coalesce(pl.completed_sessions, 0)
  from base b
  join auth.users u on u.id = b.user_id
  left join public.profiles pr on pr.id = b.user_id
  left join agg a on a.user_id = b.user_id
  left join planned pl on pl.user_id = b.user_id
  where u.email is not null
    and coalesce(pr.weekly_summary_opt_out, false) = false;
$$;

revoke all on function public.weekly_summary_data(date, date) from public, anon, authenticated;
grant execute on function public.weekly_summary_data(date, date) to service_role;

-- ── Schedule ────────────────────────────────────────────────────────────────
-- pg_cron runs in UTC. 17:00 UTC = 18:00 BST / 17:00 GMT on Sundays. The edge
-- function summarises the Mon–Sun week that ends on the run day.
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Re-running this migration replaces the schedule rather than duplicating it.
select cron.unschedule(jobid) from cron.job where jobname = 'weekly-study-summary';

select cron.schedule(
  'weekly-study-summary',
  '0 17 * * 0',
  $cron$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets
            where name = 'weekly_summary_base_url')
           || '/functions/v1/send-weekly-summaries',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets
                                      where name = 'weekly_summary_anon_key')
    ),
    body := jsonb_build_object(
      'secret', (select decrypted_secret from vault.decrypted_secrets
                 where name = 'weekly_summary_cron_secret')
    )
  );
  $cron$
);
