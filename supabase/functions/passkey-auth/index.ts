import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
} from "npm:@simplewebauthn/server@10.0.1";
import { isoBase64URL } from "npm:@simplewebauthn/server@10.0.1/helpers";

const ALLOWED_RP = ["klar.academy", "klardeutsch.org", "klardeutsch.lovable.app", "localhost"];

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function rpFromOrigin(origin: string): { rpID: string; origin: string } | null {
  try {
    const u = new URL(origin);
    const host = u.hostname.replace(/^www\./, "");
    const ok = ALLOWED_RP.includes(host) || host.endsWith(".lovable.app") || host.endsWith(".lovableproject.com");
    if (!ok) return null;
    return { rpID: host, origin: u.origin };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "");
    const rp = rpFromOrigin(String(body.origin ?? req.headers.get("origin") ?? ""));
    if (!rp) return json({ error: "Невідомий домен" }, 400);

    const url = Deno.env.get("SUPABASE_URL")!;
    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const getUser = async () => {
      const token = req.headers.get("Authorization")?.replace("Bearer ", "");
      if (!token) return null;
      const { data } = await admin.auth.getUser(token);
      return data.user ?? null;
    };

    // Cleanup old challenges
    await admin.from("webauthn_challenges").delete().lt("created_at", new Date(Date.now() - 10 * 60_000).toISOString());

    if (action === "register-options") {
      const user = await getUser();
      if (!user) return json({ error: "Потрібно увійти" }, 401);
      const { data: existing } = await admin.from("webauthn_credentials").select("credential_id").eq("user_id", user.id).eq("rp_id", rp.rpID);
      const { data: prof } = await admin.from("profiles").select("nickname, display_name").eq("user_id", user.id).maybeSingle();
      const name = prof?.nickname || prof?.display_name || "KLAR";
      const options = await generateRegistrationOptions({
        rpName: "KLAR",
        rpID: rp.rpID,
        userName: name,
        userDisplayName: prof?.display_name || name,
        attestationType: "none",
        excludeCredentials: (existing ?? []).map((c) => ({ id: c.credential_id })),
        authenticatorSelection: { authenticatorAttachment: "platform", residentKey: "required", userVerification: "required" },
      });
      const { data: ch } = await admin.from("webauthn_challenges").insert({ challenge: options.challenge, user_id: user.id, kind: "register" }).select("id").single();
      return json({ options, challengeId: ch!.id });
    }

    if (action === "register-verify") {
      const user = await getUser();
      if (!user) return json({ error: "Потрібно увійти" }, 401);
      const { data: ch } = await admin.from("webauthn_challenges").select("*").eq("id", body.challengeId).eq("user_id", user.id).eq("kind", "register").maybeSingle();
      if (!ch) return json({ error: "Час вийшов, спробуйте ще" }, 400);
      await admin.from("webauthn_challenges").delete().eq("id", ch.id);
      const v = await verifyRegistrationResponse({
        response: body.response,
        expectedChallenge: ch.challenge,
        expectedOrigin: rp.origin,
        expectedRPID: rp.rpID,
        requireUserVerification: true,
      });
      if (!v.verified || !v.registrationInfo) return json({ error: "Не вдалося підтвердити" }, 400);
      const info = v.registrationInfo;
      const { error } = await admin.from("webauthn_credentials").insert({
        user_id: user.id,
        credential_id: info.credentialID,
        public_key: isoBase64URL.fromBuffer(info.credentialPublicKey),
        counter: info.counter,
        transports: body.response?.response?.transports ?? null,
        rp_id: rp.rpID,
        device_name: String(body.deviceName ?? "").slice(0, 80) || null,
      });
      if (error) return json({ error: "Не вдалося зберегти ключ" }, 400);
      return json({ ok: true });
    }

    if (action === "login-options") {
      const options = await generateAuthenticationOptions({ rpID: rp.rpID, userVerification: "required" });
      const { data: ch } = await admin.from("webauthn_challenges").insert({ challenge: options.challenge, kind: "login" }).select("id").single();
      return json({ options, challengeId: ch!.id });
    }

    if (action === "login-verify") {
      const { data: ch } = await admin.from("webauthn_challenges").select("*").eq("id", body.challengeId).eq("kind", "login").maybeSingle();
      if (!ch) return json({ error: "Час вийшов, спробуйте ще" }, 400);
      await admin.from("webauthn_challenges").delete().eq("id", ch.id);
      const credId = String(body.response?.id ?? "");
      const { data: cred } = await admin.from("webauthn_credentials").select("*").eq("credential_id", credId).eq("rp_id", rp.rpID).maybeSingle();
      if (!cred) return json({ error: "Цей пристрій не прив'язаний. Увійдіть паролем і увімкніть Face ID у профілі." }, 404);
      const v = await verifyAuthenticationResponse({
        response: body.response,
        expectedChallenge: ch.challenge,
        expectedOrigin: rp.origin,
        expectedRPID: rp.rpID,
        requireUserVerification: true,
        authenticator: {
          credentialID: cred.credential_id,
          credentialPublicKey: isoBase64URL.toBuffer(cred.public_key),
          counter: Number(cred.counter),
          transports: cred.transports ?? undefined,
        },
      });
      if (!v.verified) return json({ error: "Біометрію не підтверджено" }, 401);
      await admin.from("webauthn_credentials").update({ counter: v.authenticationInfo.newCounter, last_used_at: new Date().toISOString() }).eq("id", cred.id);
      const { data: u } = await admin.auth.admin.getUserById(cred.user_id);
      if (!u.user?.email) return json({ error: "Акаунт не знайдено" }, 404);
      const { data: link, error } = await admin.auth.admin.generateLink({ type: "magiclink", email: u.user.email });
      if (error || !link.properties?.hashed_token) return json({ error: "Не вдалося створити сесію" }, 500);
      return json({ token_hash: link.properties.hashed_token });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("passkey-auth", e);
    return json({ error: "Помилка біометричного входу" }, 500);
  }
});
