alter table public.plans enable row level security;
alter table public.plan_weeks enable row level security;
alter table public.plan_days enable row level security;
alter table public.plan_sessions enable row level security;
alter table public.session_completions enable row level security;
alter table public.extra_study_logs enable row level security;
alter table public.mock_scores enable row level security;
alter table public.weekly_reflections enable row level security;
alter table public.plan_members enable row level security;
alter table public.student_invite_links enable row level security;

create or replace function public.student_invite_token_valid(p_token text)
returns boolean language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from public.student_invite_links
    where token = p_token and redeemed_at is null);
$$;
grant execute on function public.student_invite_token_valid(text) to anon, authenticated;

create or replace function public.consume_student_invite(p_token text)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_tutor uuid;
  v_student uuid := auth.uid();
begin
  if v_student is null then raise exception 'Must be authenticated'; end if;
  update public.student_invite_links set
    redeemed_at = now(),
    redeemed_by_student_id = v_student
  where token = p_token and redeemed_at is null returning tutor_id into v_tutor;
  return v_tutor;
end;
$$;
grant execute on function public.consume_student_invite(text) to authenticated;
