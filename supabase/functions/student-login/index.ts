// Student login by nickname + (possibly very short) password.
// Hardened: generic error messages (no enumeration), brute-force lockout,
// only teacher-created accounts allowed.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GENERIC_ERROR = "Неверный никнейм или пароль";
const MAX_FAILS = 8;
const LOCK_MINUTES = 15;

function jsonResp(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { nickname, password } = await req.json().catch(() => ({}));
    const nick = String(nickname || "").trim().toLowerCase();
    let pwd = String(password || "");

    if (!nick || !pwd || nick.length > 64 || pwd.length > 200) {
      return jsonResp({ error: GENERIC_ERROR }, 400);
    }

    // Mirror teacher-create-student padding for short passwords
    if (pwd.length < 6) pwd = pwd.padEnd(6, "0");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- Brute-force lockout check ---
    const { data: attempt } = await admin
      .from("student_login_attempts")
      .select("failed_count, locked_until")
      .eq("nickname", nick)
      .maybeSingle();

    if (attempt?.locked_until && new Date(attempt.locked_until) > new Date()) {
      return jsonResp(
        { error: "Слишком много попыток. Попробуйте позже." },
        429
      );
    }

    const recordFailure = async () => {
      const newCount = (attempt?.failed_count || 0) + 1;
      const locked =
        newCount >= MAX_FAILS
          ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
          : null;
      await admin
        .from("student_login_attempts")
        .upsert(
          {
            nickname: nick,
            failed_count: newCount,
            locked_until: locked,
            last_attempt_at: new Date().toISOString(),
          },
          { onConflict: "nickname" }
        );
    };

    // Find student profile by nickname (must be teacher-created)
    const { data: profile } = await admin
      .from("profiles")
      .select("user_id, created_by_teacher_id")
      .ilike("nickname", nick)
      .maybeSingle();

    if (!profile || !profile.created_by_teacher_id) {
      await recordFailure();
      return jsonResp({ error: GENERIC_ERROR }, 401);
    }

    const { data: userRes } = await admin.auth.admin.getUserById(profile.user_id);
    if (!userRes?.user?.email) {
      await recordFailure();
      return jsonResp({ error: GENERIC_ERROR }, 401);
    }

    const auth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!
    );
    const { data: session, error: signErr } = await auth.auth.signInWithPassword({
      email: userRes.user.email,
      password: pwd,
    });

    if (signErr || !session?.session) {
      await recordFailure();
      return jsonResp({ error: GENERIC_ERROR }, 401);
    }

    // Success → reset counter
    await admin
      .from("student_login_attempts")
      .upsert(
        { nickname: nick, failed_count: 0, locked_until: null, last_attempt_at: new Date().toISOString() },
        { onConflict: "nickname" }
      );

    return jsonResp({
      access_token: session.session.access_token,
      refresh_token: session.session.refresh_token,
    });
  } catch (e: any) {
    console.error("student-login error:", e?.message);
    return jsonResp({ error: GENERIC_ERROR }, 500);
  }
});
