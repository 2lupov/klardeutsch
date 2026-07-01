import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function validateTelegramInitData(initData: string, botToken: string): Promise<Record<string, string> | null> {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;
    params.delete("hash");
    const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");
    const encoder = new TextEncoder();
    const secretKeyData = await crypto.subtle.importKey("raw", encoder.encode("WebAppData"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const secretKey = await crypto.subtle.sign("HMAC", secretKeyData, encoder.encode(botToken));
    const dataKey = await crypto.subtle.importKey("raw", secretKey, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", dataKey, encoder.encode(dataCheckString));
    const calculatedHash = [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
    if (calculatedHash !== hash) return null;
    const authDate = parseInt(params.get("auth_date") || "0");
    if (Math.floor(Date.now() / 1000) - authDate > 86400) return null;
    const result: Record<string, string> = {};
    for (const [k, v] of entries) result[k] = v;
    return result;
  } catch { return null; }
}

async function validateTelegramLoginWidget(data: Record<string, string>, botToken: string): Promise<boolean> {
  try {
    const hash = data.hash;
    if (!hash) return false;
    const entries = Object.entries(data).filter(([k]) => k !== "hash").sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");
    const encoder = new TextEncoder();
    const tokenHash = await crypto.subtle.digest("SHA-256", encoder.encode(botToken));
    const key = await crypto.subtle.importKey("raw", tokenHash, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(dataCheckString));
    const calculatedHash = [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, "0")).join("");
    if (calculatedHash !== hash) return false;
    const authDate = parseInt(data.auth_date || "0");
    return Math.floor(Date.now() / 1000) - authDate <= 86400;
  } catch { return false; }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate caller JWT
    const authHeader = req.headers.get("Authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "");
    if (!jwt) {
      return new Response(JSON.stringify({ error: "Not authenticated" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userClient = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: `Bearer ${jwt}` } } });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Invalid session" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const currentUserId = userData.user.id;

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const body = await req.json();
    const { initData, loginWidget, action } = body;

    // Unlink
    if (action === "unlink") {
      await supabase.from("profiles").update({ telegram_chat_id: null } as any).eq("user_id", currentUserId);
      return new Response(JSON.stringify({ success: true, unlinked: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Link: validate Telegram payload
    let telegramId: number | null = null;
    let firstName: string | null = null;
    let username: string | null = null;

    if (initData) {
      const validated = await validateTelegramInitData(initData, botToken);
      if (!validated) return new Response(JSON.stringify({ error: "Invalid initData" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const u = JSON.parse(validated.user || "{}");
      telegramId = u.id; firstName = u.first_name || null; username = u.username || null;
    } else if (loginWidget) {
      const ok = await validateTelegramLoginWidget(loginWidget, botToken);
      if (!ok) return new Response(JSON.stringify({ error: "Invalid login widget data" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      telegramId = parseInt(loginWidget.id);
      firstName = loginWidget.first_name || null;
      username = loginWidget.username || null;
    } else {
      return new Response(JSON.stringify({ error: "No Telegram data provided" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (!telegramId) {
      return new Response(JSON.stringify({ error: "No telegram ID" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Check whether this Telegram is already attached to a different profile
    const { data: existing } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("telegram_chat_id", telegramId)
      .maybeSingle();

    if (existing && existing.user_id !== currentUserId) {
      return new Response(JSON.stringify({
        error: "telegram_taken",
        message: "Цей Telegram вже прив'язаний до іншого акаунту. Спочатку відв'яжіть його там або увійдіть через Telegram і перенесіть дані вручну.",
      }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Attach to current user
    const { error: updErr } = await supabase
      .from("profiles")
      .update({ telegram_chat_id: telegramId } as any)
      .eq("user_id", currentUserId);
    if (updErr) throw updErr;

    return new Response(JSON.stringify({
      success: true,
      telegram_chat_id: telegramId,
      telegram_first_name: firstName,
      telegram_username: username,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("link-telegram error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
