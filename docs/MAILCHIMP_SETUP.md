# Mailchimp Integration Setup

This app integrates with Mailchimp in two ways:

1. **Registration → Subscriber**: New signups are added to your Mailchimp audience.
2. **Password reset emails**: Sent via Mailchimp Transactional (Mandrill) instead of Supabase.

---

## 1. Registration → Mailchimp Subscriber

### Prerequisites

- Supabase project with Edge Functions enabled
- Mailchimp account with an Audience (List) created

### Deploy the Edge Function

1. Install Supabase CLI: `npm install -g supabase`
2. Log in: `supabase login`
3. Link project: `supabase link --project-ref YOUR_PROJECT_REF`
4. Set secrets (replace with your values):

   ```bash
   supabase secrets set MAILCHIMP_API_KEY=your-api-key-here
   supabase secrets set MAILCHIMP_LIST_ID=your-audience-list-id
   ```

5. Deploy the function:

   ```bash
   supabase functions deploy add-mailchimp-subscriber
   ```

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
| Uni Subject       | `MERGE19` | Medicine, Dentistry, Veterinary Medicine, or Other |

Every synced contact is also tagged **skillstrainer** (the tag is created automatically in Mailchimp when first used). You can segment or automate on this tag.

Ensure your Mailchimp audience has merge fields for **Entry Year** (MERGE8), **Sign Up Source** (MERGE9), **Year** (MERGE18), and **Uni Subject** (MERGE19) if you use them. Default `FNAME` and `LNAME` are always sent.

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
