import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

// Price is fixed on the server so the client cannot change it.
export const A2_COURSE_ID = "a2a2a2a2-0000-4000-8000-000000000a02";
export const A2_PRICE_KOP = 50000; // 500 UAH

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL")!;
    const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
    const { data: u } = await anon.auth.getUser();
    if (!u.user) return json({ error: "Unauthorized" }, 401);
    const svc = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: owned } = await svc.from("course_purchases").select("id")
      .eq("user_id", u.user.id).eq("course_id", A2_COURSE_ID).maybeSingle();
    if (owned) return json({ owned: true });

    const origin = req.headers.get("origin") || "https://klardeutsch.org";
    const reference = `a2course_${u.user.id}_${Date.now()}`;
    const resp = await fetch("https://api.monobank.ua/api/merchant/invoice/create", {
      method: "POST",
      headers: { "X-Token": Deno.env.get("MONOBANK_TOKEN")!, "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: A2_PRICE_KOP, ccy: 980, paymentType: "debit",
        merchantPaymInfo: { reference, destination: "Курс Deutsch A2 — Perfekt",
          basketOrder: [{ name: "Курс Deutsch A2 — Perfekt", qty: 1, sum: A2_PRICE_KOP, total: A2_PRICE_KOP, code: "a2-course" }] },
        redirectUrl: `${origin}/course/a2`,
        webHookUrl: `${url}/functions/v1/mono-webhook`,
        validity: 3600,
      }),
    });
    const data = await resp.json();
    if (!resp.ok) { console.error("mono error", resp.status, data); return json({ error: "Monobank error", details: data }, resp.status); }

    await svc.from("mono_payments").insert({
      invoice_id: data.invoiceId, user_id: u.user.id, amount: A2_PRICE_KOP, ccy: 980,
      status: "created", payment_type: "debit", reference, destination: "Курс Deutsch A2 — Perfekt", page_url: data.pageUrl,
    });
    return json({ pageUrl: data.pageUrl, invoiceId: data.invoiceId });
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
