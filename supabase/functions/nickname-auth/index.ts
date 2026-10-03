import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const NicknameSchema = z.string().trim().toLowerCase().regex(/^[\p{L}\p{N}_.-]{3,24}$/u);
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
  z.object({
    action: z.literal("request-reset"),
    nickname: NicknameSchema,
    origin: z.string().url().max(200).optional(),
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

    const { action, nickname } = parsed.data;
    const password = "password" in parsed.data ? parsed.data.password : "";
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
        console.error("createUser failed", createError?.code, createError?.message);
        const msg = createError?.message.toLowerCase() ?? "";
        if (msg.includes("weak") || msg.includes("pwned") || (createError as any)?.code === "weak_password") {
          return json({ error: "Цей пароль занадто простий і відомий зломщикам. Придумай складніший (наприклад, з цифрами й літерами)." }, 400);
        }
        const duplicate = msg.includes("already");
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
      return json({ user_id: created.user.id, access_token: signedIn.session.access_token, refresh_token: signedIn.session.refresh_token });
    }

    if (action === "request-reset") {
      // Always answer the same way so nobody can probe which nicknames exist.
      const generic = { ok: true, message: "Якщо акаунт має прив'язаний Telegram, ми надіслали туди посилання для нового пароля." };
      const key = `reset:${nickname}`;
      const { data: last } = await admin
        .from("student_login_attempts")
        .select("last_attempt_at")
        .eq("nickname", key)
        .maybeSingle();
      if (last?.last_attempt_at && Date.now() - new Date(last.last_attempt_at).getTime() < 2 * 60_000) {
        return json(generic);
      }
      await admin.from("student_login_attempts").upsert({
        nickname: key, failed_count: 0, locked_until: null, last_attempt_at: new Date().toISOString(),
      }, { onConflict: "nickname" });

      const { data: profile } = await admin
        .from("profiles")
        .select("user_id, telegram_chat_id")
        .ilike("nickname", nickname)
        .maybeSingle();
      const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
      if (!profile?.telegram_chat_id || !botToken) return json(generic);

      const { data: userResult } = await admin.auth.admin.getUserById(profile.user_id);
      const authEmail = userResult.user?.email;
      if (!authEmail) return json(generic);

      const allowed = ["https://klar.academy", "https://www.klar.academy", "https://klardeutsch.org", "https://www.klardeutsch.org"];
      const reqOrigin = parsed.data.origin ? new URL(parsed.data.origin).origin : "";
      const base = allowed.includes(reqOrigin) || reqOrigin.endsWith(".lovable.app") ? reqOrigin : "https://klar.academy";
      const { data: link, error: linkError } = await admin.auth.admin.generateLink({
        type: "recovery",
        email: authEmail,
        options: { redirectTo: `${base}/reset-password` },
      });
      const actionLink = link?.properties?.action_link;
      if (linkError || !actionLink) return json(generic);

      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: profile.telegram_chat_id,
          parse_mode: "HTML",
          text: `🔐 <b>Відновлення пароля KLAR</b>\n\nХтось запросив новий пароль для акаунта <b>@${nickname}</b>.\nНатисніть кнопку нижче, щоб задати новий пароль. Посилання одноразове.\n\nЯкщо це були не ви — просто проігноруйте повідомлення.`,
          reply_markup: { inline_keyboard: [[{ text: "Задати новий пароль", url: actionLink }]] },
        }),
      }).catch(() => null);
      return json(generic);
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