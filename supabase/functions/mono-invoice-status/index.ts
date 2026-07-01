import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = Deno.env.get("MONOBANK_TOKEN")!;
    const url = new URL(req.url);
    let invoiceId = url.searchParams.get("invoiceId");
    if (!invoiceId && req.method === "POST") {
      const body = await req.json().catch(() => ({}));
      invoiceId = body.invoiceId;
    }
    if (!invoiceId) return new Response(JSON.stringify({ error: "invoiceId required" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

    const resp = await fetch(
      `https://api.monobank.ua/api/merchant/invoice/status?invoiceId=${invoiceId}`,
      { headers: { "X-Token": token } }
    );
    const data = await resp.json();

    // sync to DB
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await supabase.from("mono_payments").update({
      status: data.status,
      modified_date: data.modifiedDate ? new Date(data.modifiedDate).toISOString() : null,
      updated_at: new Date().toISOString(),
    }).eq("invoice_id", invoiceId);

    return new Response(JSON.stringify(data), {
      status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
