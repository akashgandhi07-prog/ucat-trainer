-- Follow-up to 20260614120000: admin_* functions inherit EXECUTE from PUBLIC, so
-- revoking `anon` alone was a no-op. Revoke from PUBLIC (and anon) and re-grant only
-- `authenticated` - the functions still self-check is_admin, so a non-admin
-- authenticated caller is rejected; anonymous callers can no longer reach them.

do $$
declare fn text;
begin
  for fn in
    select p.oid::regprocedure::text
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'admin\_%'
  loop
    execute format('revoke execute on function %s from public, anon', fn);
    execute format('grant execute on function %s to authenticated', fn);
  end loop;
end$$;
