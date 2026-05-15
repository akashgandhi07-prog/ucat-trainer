# Mailchimp Integration Setup

This app integrates with Mailchimp in two ways:

1. **Registration → Subscriber**: New signups are added to your Mailchimp audience.
2. **Password reset emails**: Sent via Mailchimp Transactional (Mandrill) instead of Supabase.

---

## 1. Registration → Mailchimp Subscriber

### Prerequisites

- Supabase project with Edge Functions enabled
- Mailchimp account with an Audience (List) created

### What is the webhook secret?

**You don’t get it from Mailchimp or Supabase.** You **create** it yourself. It’s a random password that only your database and your Edge Function know. When the database trigger calls the Edge Function, it sends this secret; the function checks it and only then adds the user to Mailchimp. That way only your app can use the webhook, not someone else.

**How to create it:** run this in your terminal. It prints one long random string:

```bash
openssl rand -hex 32
```

Example output: `a1b2c3d4e5f6...` (64 characters). **Copy that whole string** and use it in the steps below as “your webhook secret”. Use the same string in both Supabase secrets and the database config.

### Deploy the Edge Function

1. Install Supabase CLI: `npm install -g supabase`
2. Log in: `supabase login`
3. Link project: `supabase link --project-ref YOUR_PROJECT_REF`
4. Set secrets (replace with your values):

   ```bash
   supabase secrets set MAILCHIMP_API_KEY=your-api-key-here
   supabase secrets set MAILCHIMP_LIST_ID=your-audience-list-id
   supabase secrets set MAILCHIMP_WEBHOOK_SECRET=PASTE_THE_STRING_FROM_openssl_rand_here
   ```

   For `MAILCHIMP_WEBHOOK_SECRET`, paste the exact string you got from `openssl rand -hex 32`. You’ll use the same string again when filling in the database config (server-side sync step).

5. Deploy the function:

   ```bash
   supabase functions deploy add-mailchimp-subscriber
   ```

### Server-side sync on register (recommended)

New users are synced to Mailchimp **as soon as they press Register**, via a database trigger on `auth.users` that calls the Edge Function with a webhook secret. This works even when "Confirm email" is required (no client session needed).

1. Run the migration that adds the trigger and config table:

   ```bash
   supabase db push
   ```

   Or run the migration file `supabase/migrations/018_mailchimp_signup_webhook.sql` in the SQL editor.

2. Set the webhook config in the database so the trigger can call your Edge Function. In the Supabase Dashboard → **SQL Editor**, run (replace the placeholders):

   - **edge_function_url**: Your project’s Edge Function URL. Find **YOUR_PROJECT_REF** in the Supabase dashboard URL, e.g. `https://supabase.com/dashboard/project/abcdefghijklmnop` → the ref is `abcdefghijklmnop`.
   - **webhook_secret**: **The exact same string** you created with `openssl rand -hex 32` and set as `MAILCHIMP_WEBHOOK_SECRET` in the previous step. Not a new random string - the same one.

   ```sql
   UPDATE public.mailchimp_webhook_config
   SET value = 'https://YOUR_PROJECT_REF.supabase.co/functions/v1/add-mailchimp-subscriber'
   WHERE key = 'edge_function_url';

   UPDATE public.mailchimp_webhook_config
   SET value = 'PASTE_YOUR_SAME_WEBHOOK_SECRET_HERE'
   WHERE key = 'webhook_secret';
   ```

   Until both are set to real values (no `REPLACE_WITH` or placeholders), the trigger will do nothing and no request is sent.

   **RLS:** `public.mailchimp_webhook_config` has **RLS enabled** (migration **`025_mailchimp_webhook_config_enable_rls.sql`**). The **anon** API key cannot `SELECT` these rows; keep using the **SQL Editor** (or another privileged session) for the `UPDATE` statements above. Supabase **Advisors** may list INFO “RLS enabled no policy” for this table - that is **intentional** (deny client reads of secrets). See **`docs/UNIFY_BULLET7_ADVISORS.md`**.

### Get Mailchimp credentials

- **API key**: Mailchimp → Account → Extras → API keys → Create a key
- **List ID**: Mailchimp → Audience → All contacts → Settings → Audience name and defaults → Audience ID

### Merge fields and tag

The Edge Function sends these merge fields for every new signup (and updates them when the contact already exists):

| Mailchimp field   | Merge tag | Value sent |
|-------------------|-----------|------------|
| First Name        | `FNAME`   | From registration form |
| Last Name         | `LNAME`   | From registration form |
| Entry Year        | `MERGE8`  | e.g. `2026` |
| Sign Up Source    | `MERGE9`  | Always `skills trainer` |
| Year (dropdown)   | `MERGE18` | e.g. `2026 Entry (Starting University September 2026)` or `Other` |
| Uni Subject (Subject) | `MERGE19` or auto-detected | Medicine, Dentistry, Veterinary Medicine, or Other - must match Mailchimp dropdown **exactly** |

Optional secret **`MAILCHIMP_MERGE_UNI_SUBJECT`**: set to your audience field’s merge tag (e.g. `MERGE19`) if auto-detection picks the wrong field. The function loads your audience merge fields and matches the field named **Uni Subject** or **Subject**.

Every synced contact is also tagged **skillstrainer** (the tag is created automatically in Mailchimp when first used). You can segment or automate on this tag.

Ensure your Mailchimp audience has merge fields for **Entry Year** (MERGE8), **Sign Up Source** (MERGE9), **Year** (MERGE18), and **Uni Subject** (MERGE19) if you use them. Default `FNAME` and `LNAME` are always sent.

**Year (MERGE18) and Uni Subject (MERGE19) are dropdowns in Mailchimp.** The API only accepts values that match your audience choices **exactly** (including punctuation and spacing). The Edge Function maps signup `entry_year` (e.g. `2026`) to the full Year label and sends `stream` as one of Medicine, Dentistry, Veterinary Medicine, or Other. If those fields stay empty, common causes are: the signup webhook ran before user metadata was available (redeploy the updated `add-mailchimp-subscriber` function), merge tags in Mailchimp don’t match `MERGE18`/`MERGE19`, or the audience’s dropdown choices were edited so they no longer match the strings above.

---

## 2. Password Reset Emails via Mailchimp

To send password reset (and other auth) emails from your domain instead of Supabase’s default:

### Use Mailchimp Transactional (Mandrill)

Mailchimp Transactional is separate from Marketing. It’s used for transactional emails like password resets.

1. Enable Mailchimp Transactional:
   - Add-on for Mailchimp Standard plans, or
   - Standalone at [mandrillapp.com](https://mandrillapp.com)

2. Get SMTP details:
   - Go to [SMTP & API Info](https://mandrillapp.com/settings/index)
   - Note your API key

3. Configure Supabase SMTP:
   - Supabase Dashboard → Project → Authentication → SMTP Settings
   - Enable custom SMTP
   - Use:
     - **Host**: `smtp.mandrillapp.com`
     - **Port**: `587` (or `465` for SSL)
     - **Username**: Your Mailchimp primary contact email (or any string)
     - **Password**: Your Mailchimp Transactional API key
     - **Sender email**: `no-reply@yourdomain.com` (must match a verified domain in Mandrill)
     - **Sender name**: Your app name (e.g. “UCAT Trainer”)

4. Verify your domain in Mandrill:
   - Mandrill → Sending Domains → Add domain
   - Add the DKIM (and SPF) DNS records it provides

---

## Troubleshooting

- **“Member Exists”**: Email already in the list; the integration treats this as success.
- **Password reset not sending**: Confirm SMTP settings and that the sender domain is verified in Mandrill.
- **Edge Function 500**: Check that `MAILCHIMP_API_KEY` and `MAILCHIMP_LIST_ID` are set in Supabase secrets.
- **New signups not in Mailchimp**: If using server-side sync, ensure `MAILCHIMP_WEBHOOK_SECRET` is set in Edge Function secrets and that `mailchimp_webhook_config` has the correct `edge_function_url` and `webhook_secret` (same value). The trigger only runs when both are set to non-placeholder values.
- **Year or Uni Subject empty on the contact**: Redeploy `add-mailchimp-subscriber` after pulling the latest function (it reads `stream` and `entry_year` from `raw_user_meta_data` reliably, including camelCase and numeric values). In Supabase → Edge Functions → `add-mailchimp-subscriber` → Logs, look for `Mailchimp webhook: missing stream or entry_year` (means metadata was empty when the webhook ran). If Mailchimp returns 400 on create/update, open the response body: dropdown merge fields reject values that don’t match the audience field choices exactly.
- **Subject wrong or blank**: In Mailchimp → Audience → Settings → Audience fields, open **Subject** / **Uni Subject** and confirm dropdown choices include **Medicine**, **Dentistry**, **Veterinary Medicine** (or **Veterinary** - the function maps aliases), and **Other**. Note the merge tag (often `MERGE19`). Older contacts signed up before the webhook was configured are not backfilled automatically.
