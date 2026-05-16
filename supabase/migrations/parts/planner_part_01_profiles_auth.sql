alter table public.profiles
  add column if not exists email text;

alter table public.profiles
  add column if not exists planner_role text
    check (planner_role is null or planner_role in ('student', 'tutor'));

comment on column public.profiles.planner_role is 'Planner OTP role metadata; NULL = trainer-only';

create or replace function public.handle_auth_user_profiles_planner_sync()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  meta_role text := trim(lower(coalesce(new.raw_user_meta_data->>'role', '')));
  pr text := null;
  fn text := nullif(trim(coalesce(new.raw_user_meta_data->>'full_name', '')), '');
begin
  if meta_role = 'student' then pr := 'student'; end if;
  insert into public.profiles (id, email, planner_role, full_name, updated_at)
  values (new.id, new.email, pr, fn, now())
  on conflict (id) do update set
    email = coalesce(excluded.email, profiles.email),
    planner_role = coalesce(excluded.planner_role, profiles.planner_role),
    full_name = case
      when excluded.full_name is not null and length(trim(excluded.full_name)) > 0
        then excluded.full_name else profiles.full_name end,
    updated_at = now();
  return new;
end;
$$;

revoke all on function public.handle_auth_user_profiles_planner_sync() from public;
grant execute on function public.handle_auth_user_profiles_planner_sync() to service_role;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_auth_user_profiles_planner_sync();

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public
as $$
begin new.updated_at = now(); return new; end;
$$;
