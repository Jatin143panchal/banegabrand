import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type AppRole = "owner" | "admin" | "hr_manager" | "tl" | "employee";

const USERS: { email: string; password: string; name: string; role: AppRole }[] = [
  { email: "banegabrand.owner@gmail.com", password: "BanegaBrand@Owner1", name: "BanegaBrand Owner", role: "owner" },
  { email: "banegabrand.admin@gmail.com", password: "BanegaBrand@Admin1", name: "BanegaBrand Admin", role: "admin" },
  { email: "banegabrand.hr@gmail.com", password: "BanegaBrand@Hr1", name: "BanegaBrand HR", role: "hr_manager" },
  { email: "banegabrand.tl@gmail.com", password: "BanegaBrand@Tl1", name: "BanegaBrand Team Lead", role: "tl" },
  { email: "banegabrand.amit@gmail.com", password: "BanegaBrand@Emp1", name: "Amit Sharma", role: "employee" },
  { email: "banegabrand.priya@gmail.com", password: "BanegaBrand@Emp2", name: "Priya Verma", role: "employee" },
  { email: "banegabrand.raj@gmail.com", password: "BanegaBrand@Emp3", name: "Raj Kumar", role: "employee" },
];

async function ensureRole(supabase: ReturnType<typeof createClient>, userId: string, role: AppRole) {
  const { data: existing } = await supabase.from("user_roles").select("id, role").eq("user_id", userId);
  const hasRole = existing?.some((r) => r.role === role);
  if (!hasRole) {
    await supabase.from("user_roles").insert({ user_id: userId, role });
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const results: Record<string, unknown>[] = [];

    for (const u of USERS) {
      const found = existingUsers.users.find((x) => x.email?.toLowerCase() === u.email.toLowerCase());
      let userId = found?.id;

      if (found) {
        await supabase.auth.admin.updateUserById(found.id, {
          password: u.password,
          email_confirm: true,
        });
        await supabase.from("profiles").update({ display_name: u.name }).eq("user_id", found.id);
        results.push({ email: u.email, status: "updated", role: u.role });
      } else {
        const { data, error } = await supabase.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
          user_metadata: { full_name: u.name },
        });
        if (error) {
          results.push({ email: u.email, error: error.message });
          continue;
        }
        userId = data.user?.id;
        results.push({ email: u.email, status: "created", role: u.role, id: userId });
      }

      if (userId) await ensureRole(supabase, userId, u.role);
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
