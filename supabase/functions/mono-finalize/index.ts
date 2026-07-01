import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = Deno.env.get("MONOBANK_TOKEN")!;
    const { invoiceId, amount, items } = await req.json();
    if (!invoiceId) throw new Error("invoiceId required");

    const payload: Record<string, unknown> = { invoiceId };
    if (amount) payload.amount = amount;               // часткова фіналізація
    if (items) payload.items = items;

    const resp = await fetch("https://api.monobank.ua/api/merchant/invoice/finalize", {
      method: "POST",
      headers: { "X-Token": token, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();

    if (resp.ok) {
      const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
      await supabase.from("mono_payments").update({
        finalized_at: new Date().toISOString(),
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
