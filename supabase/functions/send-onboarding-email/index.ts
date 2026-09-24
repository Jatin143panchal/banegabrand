import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  try {
    let body: any = {};
    try {
      const text = await req.text();
      body = text ? JSON.parse(text) : {};
    } catch {
      body = {};
    }

    const to = body.to;
    const subject = body.subject;
    const html = body.html;
    const fromEmail = body.fromEmail || "info@banegabrand.com";
    const fromName = body.fromName || "Banega Brand";

    if (!to || !subject || !html) {
      return new Response(JSON.stringify({ error: "to, subject, html required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (resendKey) {
      const recipientList = Array.isArray(to) ? to : [to];
      let sender = `${fromName} <${fromEmail}>`;
      let res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendKey.trim()}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: sender,
          to: recipientList,
          subject,
          html,
        }),
      });

      const resRaw = await res.text();
      let data: any = {};
      try {
        data = resRaw ? JSON.parse(resRaw) : {};
      } catch {
        data = { message: resRaw };
      }

      if (!res.ok && (data.message?.includes("domain") || data.message?.includes("verify") || data.message?.includes("from"))) {
        sender = `${fromName} <onboarding@resend.dev>`;
        res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${resendKey.trim()}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: sender,
            to: recipientList,
            subject,
            html,
          }),
        });
        const retryRaw = await res.text();
        try {
          data = retryRaw ? JSON.parse(retryRaw) : {};
        } catch {
          data = { message: retryRaw };
        }
      }

      if (!res.ok) {
        return new Response(JSON.stringify({ error: data }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ ok: true, data }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ error: "Configure RESEND_API_KEY in Supabase secrets" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
