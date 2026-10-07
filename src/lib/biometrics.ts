import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { supabase } from "@/integrations/supabase/client";

const FLAG = "klar_passkey_enabled";

export async function isBiometricSupported(): Promise<boolean> {
  try {
    if (typeof window === "undefined" || !window.PublicKeyCredential) return false;
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

export const hasLocalPasskey = () => {
  try { return localStorage.getItem(FLAG) === "1"; } catch { return false; }
};
const setLocalPasskey = (on: boolean) => {
  try { on ? localStorage.setItem(FLAG, "1") : localStorage.removeItem(FLAG); } catch { /* ignore */ }
};

async function call(action: string, extra: Record<string, unknown> = {}) {
  const { data, error } = await supabase.functions.invoke("passkey-auth", {
    body: { action, origin: window.location.origin, ...extra },
  });
  if (error) {
    let msg = "Помилка біометрії";
    try { msg = (await (error as any).context?.json())?.error ?? msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function enableBiometric(): Promise<void> {
  const { options, challengeId } = await call("register-options");
  const response = await startRegistration(options);
  await call("register-verify", { challengeId, response, deviceName: navigator.platform || "device" });
  setLocalPasskey(true);
}

export async function loginWithBiometric(): Promise<void> {
  const { options, challengeId } = await call("login-options");
  const response = await startAuthentication(options);
  const { token_hash } = await call("login-verify", { challengeId, response });
  const { error } = await supabase.auth.verifyOtp({ token_hash, type: "magiclink" });
  if (error) throw new Error("Не вдалося увійти");
  setLocalPasskey(true);
}

export async function disableBiometric(): Promise<void> {
  const { data: { user } } = await supabase.auth.getUser();
  if (user) await supabase.from("webauthn_credentials" as any).delete().eq("user_id", user.id);
  setLocalPasskey(false);
}
