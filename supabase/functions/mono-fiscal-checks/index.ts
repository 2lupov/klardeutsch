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
      const b = await req.json().catch(() => ({})); invoiceId = b.invoiceId;
    }
    if (!invoiceId) throw new Error("invoiceId required");

    const resp = await fetch(
      `https://api.monobank.ua/api/merchant/invoice/fiscal-checks?invoiceId=${invoiceId}`,
      { headers: { "X-Token": token } }
    );
    const data = await resp.json();
    return new Response(JSON.stringify(data), {
      status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
