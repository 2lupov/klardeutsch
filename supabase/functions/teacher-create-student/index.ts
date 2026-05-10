// Teacher creates a student account: account + profile + active relationship
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function genPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let p = "";
  for (let i = 0; i < 10; i++) p += chars[Math.floor(Math.random() * chars.length)];
  return p;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: roles } = await supabase
      .from("user_roles").select("role").eq("user_id", user.id);
    const isTeacher = roles?.some((r: any) => r.role === "teacher" || r.role === "admin");
    if (!isTeacher) {
      return new Response(JSON.stringify({ error: "Only teachers can create students" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    let email = (body.email || "").trim().toLowerCase();
    const displayName = (body.display_name || "").trim();
    const note = (body.note || "").trim();
    const customPassword = (body.password || "").trim();
    const ageRaw = body.age;
    const age = (typeof ageRaw === "number" && ageRaw >= 5 && ageRaw <= 120) ? ageRaw : null;
    const isKid = age !== null ? (age <= 12) : !!body.is_kid;

    if (!displayName) {
      return new Response(JSON.stringify({ error: "Name required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate nickname from display name
    const slug = displayName
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 16) || "student";
    const nickname = `${slug}_${Math.random().toString(36).slice(2, 6)}`;

    // Email is optional — auto-generate a stable internal one if not provided
    let emailIsAuto = false;
    if (!email) {
      email = `${nickname}@students.klardeutsch.local`;
      emailIsAuto = true;
    } else if (!email.includes("@")) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const password = customPassword || genPassword();

    // Create user (auto-confirm email so they can sign in immediately)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { display_name: displayName, created_by_teacher: true, email_is_auto: emailIsAuto },
    });

    if (createErr || !created.user) {
      return new Response(JSON.stringify({ error: createErr?.message || "create failed" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const studentId = created.user.id;

    // Update profile (created automatically via trigger handle_new_user)
    await admin.from("profiles").update({
      display_name: displayName,
      nickname,
      created_by_teacher_id: user.id,
      must_change_password: !customPassword,
      age,
      is_kid: isKid,
    }).eq("user_id", studentId);

    // Create active relationship
    await admin.from("tutoring_relationships").insert({
      teacher_id: user.id,
      student_id: studentId,
      status: "active",
      note: note || null,
    });

    return new Response(JSON.stringify({
      success: true,
      student_id: studentId,
      email,
      password,
      must_change_password: !customPassword,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e.message || "unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
