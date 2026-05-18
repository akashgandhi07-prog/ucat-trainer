-- Provide a security-definer RPC so authenticated users can update their own
-- ucat_exam_date without needing table-level INSERT/UPDATE on profiles.
-- This sidesteps PostgREST column-level-grant limitations introduced in 036.

create or replace function public.set_ucat_exam_date(p_exam_date date)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only update the calling user's own row.
  update public.profiles
  set
    ucat_exam_date = p_exam_date,
    updated_at     = now()
  where id = (select auth.uid());

  -- If no row exists yet, create a minimal one.
  if not found then
    insert into public.profiles (id, ucat_exam_date, updated_at)
    values ((select auth.uid()), p_exam_date, now())
    on conflict (id) do update
      set ucat_exam_date = excluded.ucat_exam_date,
          updated_at     = excluded.updated_at;
  end if;
end;
$$;

-- Only authenticated users may call this; anon cannot.
revoke execute on function public.set_ucat_exam_date(date) from public, anon;
grant  execute on function public.set_ucat_exam_date(date) to authenticated;
