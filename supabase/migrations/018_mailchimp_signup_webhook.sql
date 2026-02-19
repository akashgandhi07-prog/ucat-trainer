-- Mailchimp registration sync: on auth.users INSERT we POST to the Edge Function
-- with a webhook secret so new users are added to Mailchimp without relying on
-- client session (works even when "Confirm email" is required).

create extension if not exists pg_net;

-- Config: URL and secret must match MAILCHIMP_WEBHOOK_SECRET in Edge Function secrets.
-- Replace placeholder URL and secret after deployment.
create table if not exists public.mailchimp_webhook_config (
  key text primary key,
  value text
);

insert into public.mailchimp_webhook_config (key, value) values
  ('edge_function_url', 'https://REPLACE_WITH_PROJECT_REF.supabase.co/functions/v1/add-mailchimp-subscriber'),
  ('webhook_secret', 'REPLACE_WITH_SAME_VALUE_AS_MAILCHIMP_WEBHOOK_SECRET')
on conflict (key) do nothing;

create or replace function public.trigger_mailchimp_on_signup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  edge_url text;
  secret text;
  req_body jsonb;
  request_id bigint;
begin
  select value into edge_url from public.mailchimp_webhook_config where key = 'edge_function_url';
  select value into secret from public.mailchimp_webhook_config where key = 'webhook_secret';

  if edge_url is null or trim(edge_url) = '' or edge_url like '%REPLACE_WITH%' then
    return new;
  end if;
  if secret is null or trim(secret) = '' or secret like '%REPLACE_WITH%' then
    return new;
  end if;

  req_body := jsonb_build_object(
    'secret', secret,
    'record', jsonb_build_object(
      'email', new.email,
      'raw_user_meta_data', coalesce(new.raw_user_meta_data, '{}'::jsonb)
    )
  );

  request_id := net.http_post(
    url := edge_url,
    body := req_body,
    params := '{}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000
  );

  return new;
end;
$$;

drop trigger if exists on_auth_user_created_mailchimp on auth.users;
create trigger on_auth_user_created_mailchimp
  after insert on auth.users
  for each row
  execute function public.trigger_mailchimp_on_signup();

comment on table public.mailchimp_webhook_config is 'Config for Mailchimp signup webhook: edge_function_url and webhook_secret (same as MAILCHIMP_WEBHOOK_SECRET).';
