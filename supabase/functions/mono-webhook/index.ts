import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sign",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Cache pubkey in memory
let cachedPubKey: string | null = null;
async function getPubKey(token: string): Promise<string> {
  if (cachedPubKey) return cachedPubKey;
  const r = await fetch("https://api.monobank.ua/api/merchant/pubkey", {
    headers: { "X-Token": token },
  });
  const j = await r.json();
  cachedPubKey = j.key as string;
  return cachedPubKey;
}

function pemToBinary(pem: string): Uint8Array {
  const b64 = pem.replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

// DER -> raw (r|s) for WebCrypto ECDSA
function derToRaw(der: Uint8Array, size = 32): Uint8Array {
  // Expect: 0x30 len 0x02 rlen r 0x02 slen s
  let offset = 2;
  if (der[0] !== 0x30) throw new Error("bad DER");
  if (der[1] & 0x80) offset = 2 + (der[1] & 0x7f);
  if (der[offset] !== 0x02) throw new Error("bad DER r");
  const rLen = der[offset + 1];
  let r = der.slice(offset + 2, offset + 2 + rLen);
  offset = offset + 2 + rLen;
  if (der[offset] !== 0x02) throw new Error("bad DER s");
  const sLen = der[offset + 1];
  let s = der.slice(offset + 2, offset + 2 + sLen);
  // pad/trim to size
  const norm = (buf: Uint8Array) => {
    if (buf.length > size) buf = buf.slice(buf.length - size);
    if (buf.length < size) {
      const pad = new Uint8Array(size);
      pad.set(buf, size - buf.length);
      buf = pad;
    }
    return buf;
  };
  r = norm(r); s = norm(s);
  const out = new Uint8Array(size * 2);
  out.set(r, 0); out.set(s, size);
  return out;
}

async function verifySignature(pubKeyPem: string, signatureB64: string, body: string): Promise<boolean> {
  try {
    const keyDer = pemToBinary(pubKeyPem);
    const key = await crypto.subtle.importKey(
      "spki", keyDer,
      { name: "ECDSA", namedCurve: "P-256" },
      false, ["verify"]
    );
    const sigDer = Uint8Array.from(atob(signatureB64), c => c.charCodeAt(0));
    const sigRaw = derToRaw(sigDer, 32);
    const data = new TextEncoder().encode(body);
    return await crypto.subtle.verify({ name: "ECDSA", hash: "SHA-256" }, key, sigRaw, data);
  } catch (e) {
    console.error("verify error", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token = Deno.env.get("MONOBANK_TOKEN")!;
  const rawBody = await req.text();
  const signature = req.headers.get("x-sign") || req.headers.get("X-Sign") || "";

  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(rawBody); } catch { /**/ }

  let valid = false;
  try {
    const pub = await getPubKey(token);
    valid = signature ? await verifySignature(pub, signature, rawBody) : false;
  } catch (e) {
    console.error("pubkey fetch failed", e);
  }

  // Always log
  await supabase.from("mono_webhook_logs").insert({
    invoice_id: (parsed.invoiceId as string) ?? null,
    status: (parsed.status as string) ?? null,
    signature_valid: valid,
    raw_body: parsed,
    headers: Object.fromEntries(req.headers.entries()),
    error: valid ? null : "invalid or missing signature",
  });

  console.log("[mono-webhook]", { invoiceId: parsed.invoiceId, status: parsed.status, valid });

  if (!valid) {
    return new Response(JSON.stringify({ error: "invalid signature" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const invoiceId = parsed.invoiceId as string | undefined;
  if (invoiceId) {
    const status = parsed.status as string;
    const patch: Record<string, unknown> = {
      status,
      webhook_data: parsed,
      modified_date: parsed.modifiedDate ? new Date(parsed.modifiedDate as string).toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    if (status === "success") patch.finalized_at = new Date().toISOString();
    if (status === "reversed" || status === "failure" || status === "expired") patch.cancelled_at = new Date().toISOString();

    // idempotent update
    await supabase.from("mono_payments").update(patch).eq("invoice_id", invoiceId);

    // Grant A2 course access after a successful full payment
    if (status === "success") {
      const { data: pay } = await supabase.from("mono_payments").select("user_id, reference, amount").eq("invoice_id", invoiceId).maybeSingle();
      const paid = Number(parsed.finalAmount ?? parsed.amount ?? 0);
      if (pay?.user_id && String(pay.reference ?? "").startsWith("a2course_") && paid >= 50000) {
        await supabase.from("course_purchases").upsert(
          { user_id: pay.user_id, course_id: "a2a2a2a2-0000-4000-8000-000000000a02" },
          { onConflict: "user_id,course_id", ignoreDuplicates: true },
        );
      }
    }
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
