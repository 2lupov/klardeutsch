import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MONO_API = "https://api.monobank.ua/api/merchant/invoice/create";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const token = Deno.env.get("MONOBANK_TOKEN")!;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const svc = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, svc);

    // Optional user (function may be called by guests too)
    let userId: string | null = null;
    const authHeader = req.headers.get("Authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data } = await anon.auth.getClaims(authHeader.replace("Bearer ", ""));
      userId = data?.claims?.sub ?? null;
    }

    const body = await req.json();
    const {
      amount,                          // копійки
      ccy = 980,
      paymentType = "debit",           // "debit" | "hold"
      description = "Оплата",
      reference,
      redirectUrl,
      basketOrder,                     // [{name, qty, sum, total, code, tax, discounts?}]
      discounts,                       // basket-level discounts
      validity = 3600,
    } = body ?? {};

    if (!amount || typeof amount !== "number" || amount < 1) {
      return new Response(JSON.stringify({ error: "amount (kopiykas) required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") || "";
    const webHookUrl = `${supabaseUrl}/functions/v1/mono-webhook`;
    const finalRedirect = redirectUrl || `${origin}/payment-result`;

    const merchantPaymInfo: Record<string, unknown> = {
      reference: reference || crypto.randomUUID(),
      destination: description,
    };
    if (basketOrder) merchantPaymInfo.basketOrder = basketOrder;
    if (discounts) merchantPaymInfo.discounts = discounts;

    const payload = {
      amount,
      ccy,
      paymentType,
      merchantPaymInfo,
      redirectUrl: finalRedirect,
      webHookUrl,
      validity,
    };

    const resp = await fetch(MONO_API, {
      method: "POST",
      headers: { "X-Token": token, "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();

    if (!resp.ok) {
      return new Response(JSON.stringify({ error: "Monobank error", details: data }), {
        status: resp.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    await supabase.from("mono_payments").insert({
      invoice_id: data.invoiceId,
      user_id: userId,
      amount, ccy,
      status: "created",
      payment_type: paymentType,
      reference: merchantPaymInfo.reference as string,
      destination: description,
      page_url: data.pageUrl,
      basket: basketOrder ?? null,
      discounts: discounts ?? null,
    });

    return new Response(JSON.stringify({
      invoiceId: data.invoiceId,
      pageUrl: data.pageUrl,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
