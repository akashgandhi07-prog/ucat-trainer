// Supabase Edge Function: Add new signups to Mailchimp audience
// Deploy: supabase functions deploy add-mailchimp-subscriber
// Secrets: MAILCHIMP_API_KEY, MAILCHIMP_LIST_ID (set via Supabase Dashboard)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubscriberPayload {
  email: string;
  firstName?: string;
  lastName?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const apiKey = Deno.env.get("MAILCHIMP_API_KEY");
  const listId = Deno.env.get("MAILCHIMP_LIST_ID");

  if (!apiKey || !listId) {
    console.error("MAILCHIMP_API_KEY or MAILCHIMP_LIST_ID not configured");
    return new Response(
      JSON.stringify({ error: "Mailchimp integration not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  let body: SubscriberPayload;
  try {
    body = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(
      JSON.stringify({ error: "Valid email is required" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  const firstName = typeof body.firstName === "string" ? body.firstName.trim() : "";
  const lastName = typeof body.lastName === "string" ? body.lastName.trim() : "";

  const dcMatch = apiKey.match(/-([a-z0-9]+)$/i);
  const datacenter = dcMatch ? dcMatch[1] : "us1";
  const baseUrl = `https://${datacenter}.api.mailchimp.com/3.0`;

  const mergeFields: Record<string, string> = {};
  if (firstName) mergeFields.FNAME = firstName;
  if (lastName) mergeFields.LNAME = lastName;

  const payload = {
    email_address: email,
    status: "subscribed",
    merge_fields: Object.keys(mergeFields).length > 0 ? merge_fields : undefined,
  };

  const auth = btoa(`anystring:${apiKey}`);

  try {
    const res = await fetch(`${baseUrl}/lists/${listId}/members`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      if (res.status === 400 && data?.title === "Member Exists") {
        return new Response(
          JSON.stringify({ ok: true, message: "Already subscribed" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      console.error("Mailchimp API error", res.status, data);
      return new Response(
        JSON.stringify({ error: data?.detail || "Failed to add subscriber" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ ok: true, message: "Subscriber added" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Mailchimp request failed", err);
    return new Response(
      JSON.stringify({ error: "Failed to add subscriber" }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
