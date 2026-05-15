-- Tutor-created share links: one URL per invitation; redeemed when student finishes onboarding plan creation.

create table public.student_invite_links (
  id uuid primary key default gen_random_uuid(),
  token text not null unique,
  tutor_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  redeemed_at timestamptz,
  redeemed_by_student_id uuid references public.users(id) on delete set null
);

create index student_invite_links_tutor_idx on public.student_invite_links (tutor_id);
create index student_invite_links_pending_idx on public.student_invite_links (token)
  where redeemed_at is null;

alter table public.student_invite_links enable row level security;

create policy "student_invite_links: tutor read own"
  on public.student_invite_links for select
  using (tutor_id = (select auth.uid()));

create policy "student_invite_links: tutor insert own"
  on public.student_invite_links for insert
  with check (tutor_id = (select auth.uid()));

-- Anonymous / anyone can validate a token exists and is unredeemed (no row data leaked beyond boolean via RPC).

create or replace function public.student_invite_token_valid(p_token text)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.student_invite_links
    where token = p_token and redeemed_at is null
  );
$$;

grant execute on function public.student_invite_token_valid(text) to anon, authenticated;

-- Student consumes invite; returns tutor uuid or null if invalid / already redeemed.

create or replace function public.consume_student_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tutor uuid;
  v_student uuid := auth.uid();
begin
  if v_student is null then
    raise exception 'Must be authenticated';
  end if;

  update public.student_invite_links
  set
    redeemed_at = now(),
    redeemed_by_student_id = v_student
  where token = p_token
    and redeemed_at is null
  returning tutor_id into v_tutor;

  return v_tutor;
end;
$$;

grant execute on function public.consume_student_invite(text) to authenticated;
