-- Idempotent: create or replace; grants re-issued.
create or replace function public.get_admin_sjt_quality_signals(since_ts timestamptz default now() - interval '30 days')
returns table(question_id text, question_type text, answer_changes bigint, explanation_opens bigint, abandons bigint, reports bigint, signal_total bigint)
language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Admin access required';
  end if;
  return query
  with events as (
    select ae.event_properties->>'question_id' as qid,
      max(ae.event_properties->>'question_type') as qtype,
      count(*) filter (where ae.event_name = 'sjt_answer_changed') as changes,
      count(*) filter (where ae.event_name = 'sjt_explanation_opened') as explanations,
      count(*) filter (where ae.event_name = 'sjt_scenario_abandoned') as abandoned
    from public.analytics_events ae
    where ae.created_at >= since_ts
      and ae.event_name in ('sjt_answer_changed','sjt_explanation_opened','sjt_scenario_abandoned')
      and ae.event_properties->>'question_id' is not null
    group by ae.event_properties->>'question_id'
  ), reports_by_question as (
    -- Reports are stored as 'sjt:<question id>' or 'sjt:<question id>:<item id>';
    -- events use the bare question id. Normalise so both join on the question.
    select case
        when qf.question_identifier like 'sjt:%' then split_part(qf.question_identifier, ':', 2)
        else qf.question_identifier
      end as qid,
      max(nullif(replace(qf.trainer_type, 'sjt_', ''), qf.trainer_type)) as qtype,
      count(*) as report_count
    from public.question_feedback qf
    where qf.created_at >= since_ts and qf.trainer_type like 'sjt%'
      and qf.question_identifier is not null
    group by 1
  )
  select coalesce(e.qid, r.qid), coalesce(e.qtype, r.qtype, 'unknown'),
    coalesce(e.changes,0), coalesce(e.explanations,0), coalesce(e.abandoned,0), coalesce(r.report_count,0),
    coalesce(e.changes,0) + coalesce(e.abandoned,0) * 2 + coalesce(r.report_count,0) * 3
  from events e full join reports_by_question r on r.qid = e.qid
  order by 7 desc, 1
  limit 100;
end;
$$;
revoke all on function public.get_admin_sjt_quality_signals(timestamptz) from public;
grant execute on function public.get_admin_sjt_quality_signals(timestamptz) to authenticated;
comment on function public.get_admin_sjt_quality_signals(timestamptz) is 'Admin-only SJT quality triage using behavioural signals and direct reports.';
