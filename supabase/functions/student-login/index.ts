// Student login by nickname + (possibly very short) password.
// Looks up the email from the profile, pads short passwords to match
// the stored padding done in teacher-create-student, then signs in.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { nickname, password } = await req.json();
    const nick = String(nickname || "").trim().toLowerCase();
    let pwd = String(password || "");

    if (!nick || !pwd) {
      return new Response(JSON.stringify({ error: "Никнейм и пароль обязательны" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Mirror teacher-create-student: short passwords are padded with "0" to 6
    if (pwd.length < 6) pwd = pwd.padEnd(6, "0");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find student profile by nickname (must be teacher-created)
    const { data: profile } = await admin
      .from("profiles")
      .select("user_id, created_by_teacher_id")
      .ilike("nickname", nick)
      .maybeSingle();

    if (!profile || !profile.created_by_teacher_id) {
      return new Response(JSON.stringify({ error: "Ученик не найден" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the email from auth.users
    const { data: userRes, error: userErr } = await admin.auth.admin.getUserById(profile.user_id);
    if (userErr || !userRes?.user?.email) {
      return new Response(JSON.stringify({ error: "Аккаунт повреждён" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Sign in using anon client to obtain a real session
    const auth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const { data: session, error: signErr } = await auth.auth.signInWithPassword({
      email: userRes.user.email,
      password: pwd,
    });

    if (signErr || !session?.session) {
      return new Response(JSON.stringify({ error: "Неверный пароль" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({
      access_token: session.session.access_token,
      refresh_token: session.session.refresh_token,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
