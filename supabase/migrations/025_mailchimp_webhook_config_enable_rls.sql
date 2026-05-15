-- Bullet 7 / advisor: public.mailchimp_webhook_config had RLS disabled (secrets readable via anon key).
-- Rows are only consumed inside SECURITY DEFINER public.trigger_mailchimp_on_signup(); the table owner
-- bypasses RLS, so the auth trigger keeps working. No client policies: anon/authenticated cannot SELECT.

alter table public.mailchimp_webhook_config enable row level security;

comment on table public.mailchimp_webhook_config is
  'Config for Mailchimp signup webhook: edge_function_url and webhook_secret. RLS on; no policies for API roles — reads only from trigger (definer/owner).';
