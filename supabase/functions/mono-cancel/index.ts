import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function requireOwner(req: Request, invoiceId: string) {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) return { error: "Unauthorized", status: 401 };
  const authed = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const { data: userData, error: userErr } = await authed.auth.getUser();
  if (userErr || !userData?.user) return { error: "Unauthorized", status: 401 };
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: pay } = await admin.from("mono_payments").select("user_id").eq("invoice_id", invoiceId).maybeSingle();
  if (!pay) return { error: "Invoice not found", status: 404 };
  const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
  if (pay.user_id !== userData.user.id && !isAdmin) return { error: "Forbidden", status: 403 };
  return { admin };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = Deno.env.get("MONOBANK_TOKEN")!;
    const { invoiceId, amount, extRef, items } = await req.json();
    if (!invoiceId) throw new Error("invoiceId required");

    const auth = await requireOwner(req, invoiceId);
    if ("error" in auth) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: Record<string, unknown> = { invoiceId };
    if (amount) payload.amount = amount;
    if (extRef) payload.extRef = extRef;
    if (items) payload.items = items;

    const resp = await fetch("https://api.monobank.ua/api/merchant/invoice/cancel", {
      method: "POST",
      headers: { "X-Token": token, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();

    if (resp.ok) {
      await auth.admin.from("mono_payments").update({
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("invoice_id", invoiceId);
    }

    return new Response(JSON.stringify(data), {
      status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
