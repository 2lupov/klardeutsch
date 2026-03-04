import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Validate Telegram Mini App initData using HMAC-SHA256.
 * See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
async function validateTelegramInitData(initData: string, botToken: string): Promise<Record<string, string> | null> {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return null;

    // Build data-check-string: sort all params except hash, join with \n

    params.delete("hash");
    const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

    // Create secret key: HMAC-SHA256("WebAppData", botToken)
    const encoder = new TextEncoder();
    const secretKeyData = await crypto.subtle.importKey(
      "raw",
      encoder.encode("WebAppData"),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const secretKey = await crypto.subtle.sign("HMAC", secretKeyData, encoder.encode(botToken));

    // Calculate hash: HMAC-SHA256(secretKey, dataCheckString)
    const dataKey = await crypto.subtle.importKey(
      "raw",
      secretKey,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", dataKey, encoder.encode(dataCheckString));

    // Compare
    const calculatedHash = [...new Uint8Array(signature)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (calculatedHash !== hash) {
      console.error("Hash mismatch:", calculatedHash, "vs", hash);
      return null;
    }

    // Check auth_date is not too old (allow 24h)
    const authDate = parseInt(params.get("auth_date") || "0");
    const now = Math.floor(Date.now() / 1000);
    if (now - authDate > 86400) {
      console.error("initData too old:", now - authDate, "seconds");
      return null;
    }

    // Return parsed data
    const result: Record<string, string> = {};
    for (const [k, v] of entries) {
      result[k] = v;
    }
    return result;
  } catch (err) {
    console.error("validateTelegramInitData error:", err);
    return null;
  }
}

/**
 * Validate Telegram Login Widget data.
 * See: https://core.telegram.org/widgets/login#checking-authorization
 */
async function validateTelegramLoginWidget(data: Record<string, string>, botToken: string): Promise<boolean> {
  try {
    const hash = data.hash;
    if (!hash) return false;

    const checkEntries = Object.entries(data)
      .filter(([k]) => k !== "hash")
      .sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = checkEntries.map(([k, v]) => `${k}=${v}`).join("\n");

    // SHA256(bot_token) as secret key
    const encoder = new TextEncoder();
    const tokenHash = await crypto.subtle.digest("SHA-256", encoder.encode(botToken));

    const key = await crypto.subtle.importKey(
      "raw",
      tokenHash,
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(dataCheckString));

    const calculatedHash = [...new Uint8Array(signature)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (calculatedHash !== hash) return false;

    // Check auth_date not too old (1 day)
    const authDate = parseInt(data.auth_date || "0");
    const now = Math.floor(Date.now() / 1000);
    return now - authDate <= 86400;
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!botToken) throw new Error("TELEGRAM_BOT_TOKEN not set");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();
    const { initData, loginWidget } = body;

    let telegramId: number | null = null;
    let firstName: string | null = null;
    let lastName: string | null = null;
    let username: string | null = null;

    if (initData) {
      // TMA flow
      const validated = await validateTelegramInitData(initData, botToken);
      if (!validated) {
        return new Response(JSON.stringify({ error: "Invalid initData" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const user = JSON.parse(validated.user || "{}");
      telegramId = user.id;
      firstName = user.first_name || null;
      lastName = user.last_name || null;
      username = user.username || null;
    } else if (loginWidget) {
      // Telegram Login Widget flow
      const valid = await validateTelegramLoginWidget(loginWidget, botToken);
      if (!valid) {
        return new Response(JSON.stringify({ error: "Invalid login widget data" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      telegramId = parseInt(loginWidget.id);
      firstName = loginWidget.first_name || null;
      lastName = loginWidget.last_name || null;
      username = loginWidget.username || null;
    } else {
      return new Response(JSON.stringify({ error: "No auth data provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!telegramId) {
      return new Response(JSON.stringify({ error: "No telegram ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log("Telegram auth for ID:", telegramId, "name:", firstName);

    // 1. Check if profile with this telegram_chat_id exists
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("telegram_chat_id", telegramId)
      .single();

    let userId: string;

    if (existingProfile) {
      // Existing user — just sign them in
      userId = existingProfile.user_id;
      console.log("Found existing user:", userId);
    } else {
      // Create new user with telegram-based email
      const email = `tg_${telegramId}@telegram.klar.local`;
      const password = crypto.randomUUID() + crypto.randomUUID(); // unguessable

      const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          telegram_id: telegramId,
          first_name: firstName,
          username,
        },
      });

      if (createErr) {
        // User might already exist with this email (edge case)
        if (createErr.message?.includes("already been registered")) {
          const { data: { users } } = await supabase.auth.admin.listUsers();
          const found = users?.find((u: any) => u.email === email);
          if (found) {
            userId = found.id;
          } else {
            throw createErr;
          }
        } else {
          throw createErr;
        }
      } else {
        userId = newUser.user!.id;
      }

      // Set display name and telegram_chat_id on profile
      const displayName = firstName
        ? (lastName ? `${firstName} ${lastName}` : firstName)
        : (username || `User_${telegramId}`);

      // Wait a moment for the trigger to create the profile
      await new Promise((r) => setTimeout(r, 500));

      await supabase
        .from("profiles")
        .update({
          display_name: displayName,
          telegram_chat_id: telegramId,
        })
        .eq("user_id", userId);

      console.log("Created new user:", userId, "display_name:", displayName);
    }

    // 2. Generate session for this user using admin API
    // We'll use generateLink to create a magic link, then exchange it
    const fakeEmail = `tg_${telegramId}@telegram.klar.local`;

    const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
      type: "magiclink",
      email: fakeEmail,
    });

    if (linkErr || !linkData) {
      console.error("generateLink error:", linkErr);
      throw new Error("Failed to generate auth link");
    }

    // Extract the token from the link properties
    const token = linkData.properties?.hashed_token;
    if (!token) {
      throw new Error("No hashed_token in link response");
    }

    // Verify the OTP to get a session
    const { data: sessionData, error: verifyErr } = await supabase.auth.verifyOtp({
      token_hash: token,
      type: "magiclink",
    });

    if (verifyErr || !sessionData.session) {
      console.error("verifyOtp error:", verifyErr);
      throw new Error("Failed to create session");
    }

    return new Response(
      JSON.stringify({
        access_token: sessionData.session.access_token,
        refresh_token: sessionData.session.refresh_token,
        expires_in: sessionData.session.expires_in,
        user: {
          id: sessionData.session.user.id,
          email: sessionData.session.user.email,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("telegram-auth error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
