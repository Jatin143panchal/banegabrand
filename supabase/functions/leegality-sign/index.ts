import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// CORS headers - Allow your Vercel domain
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://banegabrand-seven.vercel.app",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400",
};

const LEEGALITY_BASE_URL = Deno.env.get("LEEGALITY_BASE_URL") || "https://sandbox.leegality.com/api/v3.0";
const LEEGALITY_AUTH_TOKEN = Deno.env.get("LEEGALITY_AUTH_TOKEN");
const LEEGALITY_WORKFLOW_ID = Deno.env.get("LEEGALITY_WORKFLOW_ID");

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { lead_id, document_url, signer_name, signer_email, signer_phone, redirect_url } = body;

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select("id, name, email, phone")
      .eq("id", lead_id)
      .single();

    if (leadError || !lead) {
      return new Response(JSON.stringify({ error: "Lead not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = {
      workflow_id: LEEGALITY_WORKFLOW_ID,
      document_url: document_url,
      signers: [{ name: signer_name, email: signer_email, phone: signer_phone || undefined, order: 1 }],
      redirect_url: redirect_url || `${Deno.env.get("FRONTEND_URL")}/leads`,
      webhook_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/leegality-webhook`,
      is_sequential: true,
      send_email: true,
      send_sms: !!signer_phone,
    };

    const leegalityResponse = await fetch(`${LEEGALITY_BASE_URL}/sign/request`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LEEGALITY_AUTH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!leegalityResponse.ok) {
      const errorData = await leegalityResponse.json();
      return new Response(JSON.stringify({ error: errorData.message || "Leegality request failed" }), {
        status: leegalityResponse.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const leegalityData = await leegalityResponse.json();

    await supabase
      .from("leads")
      .update({
        leegality_document_id: leegalityData.document_id,
        leegality_status: "pending",
        leegality_initiated_at: new Date().toISOString(),
      })
      .eq("id", lead_id);

    return new Response(
      JSON.stringify({
        success: true,
        sign_url: leegalityData.sign_url,
        document_id: leegalityData.document_id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Edge function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
