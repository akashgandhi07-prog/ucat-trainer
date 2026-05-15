-- Surface misconfiguration in Postgres logs instead of failing silently.

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
    raise warning 'Mailchimp signup sync skipped: edge_function_url not configured (table public.mailchimp_webhook_config)';
    return new;
  end if;
  if secret is null or trim(secret) = '' or secret like '%REPLACE_WITH%' then
    raise warning 'Mailchimp signup sync skipped: webhook_secret not configured (table public.mailchimp_webhook_config)';
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
