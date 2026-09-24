import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    let payload: any = {};
    try {
      const text = await req.text();
      payload = text ? JSON.parse(text) : {};
    } catch {
      payload = {};
    }

    const { to, subject, html, text, fromName, fromEmail } = payload;

    if (!to || !subject || (!html && !text)) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: to, subject, and html/text are required." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    let sender = `${fromName || "Banega Brand"} <${fromEmail || Deno.env.get("FROM_EMAIL") || "info@banegabrand.com"}>`;

    // 1. Try Resend if API Key is configured
    if (resendApiKey) {
      let resendRes = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${resendApiKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: sender,
          to: Array.isArray(to) ? to : [to],
          subject,
          html: html || undefined,
          text: text || undefined,
        }),
      });

      const resendRaw = await resendRes.text();
      let resendData: any = {};
      try {
        resendData = resendRaw ? JSON.parse(resendRaw) : {};
      } catch {
        resendData = { message: resendRaw };
      }

      // If domain verification error, fallback to onboarding@resend.dev
      if (!resendRes.ok && (resendData.message?.includes("domain") || resendData.message?.includes("verify") || resendData.message?.includes("from"))) {
        console.warn("[send-email] Retrying with onboarding@resend.dev...");
        sender = `${fromName || "Banega Brand"} <onboarding@resend.dev>`;
        resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: sender,
            to: Array.isArray(to) ? to : [to],
            subject,
            html: html || undefined,
            text: text || undefined,
          }),
        });
        const retryRaw = await resendRes.text();
        try {
          resendData = retryRaw ? JSON.parse(retryRaw) : {};
        } catch {
          resendData = { message: retryRaw };
        }
      }

      if (!resendRes.ok) {
        throw new Error(resendData.message || "Failed to send email via Resend");
      }

      return new Response(
        JSON.stringify({ success: true, provider: "resend", data: resendData }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Fallback / Dev Mode: Log email and return success
    console.log(`[Email Service] Dispatched to: ${to} | Subject: "${subject}"`);
    return new Response(
      JSON.stringify({
        success: true,
        mode: "simulated",
        message: "Email processed successfully. To send real inboxes in production, set RESEND_API_KEY in Supabase secrets.",
        recipient: to,
        subject,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("send-email error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
