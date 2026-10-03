import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const NicknameSchema = z.string().trim().toLowerCase().regex(/^[a-z0-9_]{3,24}$/);
const PasswordSchema = z.string().min(6).max(200);
const BodySchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("register"),
    nickname: NicknameSchema,
    password: PasswordSchema,
    email: z.union([z.literal(""), z.string().trim().email().max(255)]).optional().default(""),
  }),
  z.object({
    action: z.literal("login"),
    nickname: NicknameSchema,
    password: PasswordSchema,
  }),
]);

const GENERIC_LOGIN_ERROR = "Неправильний нікнейм або пароль";
const MAX_FAILS = 8;
const LOCK_MINUTES = 15;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const parsed = BodySchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) {
      return json({ error: "Перевірте нікнейм, пароль та email" }, 400);
    }

    const { action, nickname, password } = parsed.data;
    const url = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!url || !serviceKey || !anonKey) return json({ error: "Сервіс тимчасово недоступний" }, 500);

    const admin = createClient(url, serviceKey);
    const auth = createClient(url, anonKey);

    if (action === "register") {
      const { data: existing } = await admin
        .from("profiles")
        .select("user_id")
        .ilike("nickname", nickname)
        .maybeSingle();
      if (existing) return json({ error: "Цей нікнейм уже зайнятий" }, 409);

      const requestedEmail = parsed.data.email.trim().toLowerCase();
      const authEmail = requestedEmail || `${nickname}@users.klar.local`;
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email: authEmail,
        password,
        email_confirm: true,
        user_metadata: {
          display_name: nickname,
          email_is_auto: !requestedEmail,
          self_registered: true,
        },
      });
      if (createError || !created.user) {
        const duplicate = createError?.message.toLowerCase().includes("already");
        return json({ error: duplicate ? "Цей email або нікнейм уже використовується" : "Не вдалося створити акаунт" }, 400);
      }

      const { error: profileError } = await admin
        .from("profiles")
        .update({ nickname, display_name: nickname })
        .eq("user_id", created.user.id);
      if (profileError) {
        await admin.auth.admin.deleteUser(created.user.id);
        return json({ error: profileError.code === "23505" ? "Цей нікнейм уже зайнятий" : "Не вдалося створити профіль" }, 409);
      }

      const { data: signedIn, error: signInError } = await auth.auth.signInWithPassword({ email: authEmail, password });
      if (signInError || !signedIn.session) return json({ error: "Акаунт створено, але не вдалося увійти" }, 500);
      return json({ access_token: signedIn.session.access_token, refresh_token: signedIn.session.refresh_token });
    }

    const { data: attempt } = await admin
      .from("student_login_attempts")
      .select("failed_count, locked_until")
      .eq("nickname", nickname)
      .maybeSingle();
    if (attempt?.locked_until && new Date(attempt.locked_until) > new Date()) {
      return json({ error: "Забагато спроб. Спробуйте пізніше." }, 429);
    }

    const recordFailure = async () => {
      const failedCount = (attempt?.failed_count ?? 0) + 1;
      const lockedUntil = failedCount >= MAX_FAILS
        ? new Date(Date.now() + LOCK_MINUTES * 60_000).toISOString()
        : null;
      await admin.from("student_login_attempts").upsert({
        nickname,
        failed_count: failedCount,
        locked_until: lockedUntil,
        last_attempt_at: new Date().toISOString(),
      }, { onConflict: "nickname" });
    };

    const { data: profile } = await admin
      .from("profiles")
      .select("user_id")
      .ilike("nickname", nickname)
      .maybeSingle();
    if (!profile) {
      await recordFailure();
      return json({ error: GENERIC_LOGIN_ERROR }, 401);
    }

    const { data: userResult } = await admin.auth.admin.getUserById(profile.user_id);
    const authEmail = userResult.user?.email;
    if (!authEmail) {
      await recordFailure();
      return json({ error: GENERIC_LOGIN_ERROR }, 401);
    }

    const { data: signedIn, error: signInError } = await auth.auth.signInWithPassword({ email: authEmail, password });
    if (signInError || !signedIn.session) {
      await recordFailure();
      return json({ error: GENERIC_LOGIN_ERROR }, 401);
    }

    await admin.from("student_login_attempts").upsert({
      nickname,
      failed_count: 0,
      locked_until: null,
      last_attempt_at: new Date().toISOString(),
    }, { onConflict: "nickname" });

    return json({ access_token: signedIn.session.access_token, refresh_token: signedIn.session.refresh_token });
  } catch {
    return json({ error: "Сервіс тимчасово недоступний" }, 500);
  }
});