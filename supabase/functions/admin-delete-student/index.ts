// Admin/teacher deletes a student: removes their data and their login account
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const userClient = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "unauthorized" }, 401);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const isAdmin = roles?.some((r: any) => r.role === "admin");
    const isTeacher = roles?.some((r: any) => r.role === "teacher");
    if (!isAdmin && !isTeacher) return json({ error: "forbidden" }, 403);

    const { user_id } = await req.json();
    if (!user_id || typeof user_id !== "string") return json({ error: "user_id required" }, 400);
    if (user_id === user.id) return json({ error: "Не можна видалити себе" }, 400);

    const { data: targetRoles } = await admin.from("user_roles").select("role").eq("user_id", user_id);
    if (targetRoles?.some((r: any) => r.role === "admin" || r.role === "teacher")) {
      return json({ error: "Не можна видалити адміна чи викладача" }, 400);
    }
    if (!isAdmin) {
      const { data: rel } = await admin.from("tutoring_relationships").select("id")
        .eq("teacher_id", user.id).eq("student_id", user_id).maybeSingle();
      if (!rel) return json({ error: "Це не ваш учень" }, 403);
    }

    // Best-effort cleanup of rows that may reference the user
    const byUser = ["student_boards", "user_coins", "coin_transactions", "user_gifts", "user_xp",
      "xp_transactions", "user_progress", "saved_words", "custom_words", "vocab_cards", "srs_cards",
      "daily_usage", "daily_bonuses", "course_purchases", "course_lesson_progress", "course_notes",
      "course_notebooks", "course_certificates", "purchases", "subscriptions", "referral_codes",
      "student_books", "school_group_members", "user_roles", "profiles"];
    const byStudent = ["tutoring_relationships", "student_assignments", "student_submissions",
      "tutoring_homework", "tutoring_lessons", "tutoring_placement_assignments", "teacher_student_notes",
      "school_attendance"];
    for (const t of byStudent) { try { await admin.from(t).delete().eq("student_id", user_id); } catch (_) {} }
    for (const t of byUser) { try { await admin.from(t).delete().eq("user_id", user_id); } catch (_) {} }

    const { error } = await admin.auth.admin.deleteUser(user_id);
    if (error) return json({ error: error.message }, 500);
    return json({ ok: true });
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500);
  }
});
