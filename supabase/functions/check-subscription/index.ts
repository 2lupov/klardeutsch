import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Product IDs mapping
const PRODUCT_PLANS: Record<string, string> = {
  "prod_UHXJotgIVP6afr": "school",    // KLAR Premium Monthly
  "prod_UHXKQOXJ5R75l2": "school",    // KLAR Premium Yearly
  "prod_UHXalUo3ZN9Pc4": "assistant", // KLAR Assistent Monthly
  "prod_UHXaeHTZf311G2": "assistant", // KLAR Assistent Yearly
  "prod_UHXbWc5G7D73w6": "allinone",  // KLAR All-in-One Monthly
  "prod_UHXbI82BUNn1YR": "allinone",  // KLAR All-in-One Yearly
};

const logStep = (step: string, details?: any) => {
  console.log(`[CHECK-SUB] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No auth header");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Auth error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("No user email");

    logStep("Checking subscription", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      await supabaseAdmin.from("subscriptions").upsert(
        { user_id: user.id, plan: "free", status: "active" },
        { onConflict: "user_id" }
      );
      return new Response(JSON.stringify({ subscribed: false, plan: "free" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const customerId = customers.data[0].id;
    // Get ALL active subscriptions (user might have multiple)
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 10,
    });

    if (subscriptions.data.length === 0) {
      logStep("No active subscription");
      await supabaseAdmin.from("subscriptions").upsert(
        { user_id: user.id, stripe_customer_id: customerId, plan: "free", status: "active" },
        { onConflict: "user_id" }
      );
      return new Response(JSON.stringify({ subscribed: false, plan: "free" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine which plans are active
    const activePlans: string[] = [];
    let latestEnd: Date | null = null;
    let cancelAtPeriodEnd = false;
    let primarySub = subscriptions.data[0];

    for (const sub of subscriptions.data) {
      const productId = sub.items.data[0]?.price?.product as string;
      const plan = PRODUCT_PLANS[productId];
      if (plan) activePlans.push(plan);
      
      const subEnd = new Date(sub.current_period_end * 1000);
      if (!latestEnd || subEnd > latestEnd) {
        latestEnd = subEnd;
        cancelAtPeriodEnd = sub.cancel_at_period_end;
        primarySub = sub;
      }
    }

    // Determine effective plan: allinone > school+assistant > individual
    let effectivePlan = "free";
    const hasSchool = activePlans.includes("school") || activePlans.includes("allinone");
    const hasAssistant = activePlans.includes("assistant") || activePlans.includes("allinone");

    if (activePlans.includes("allinone")) {
      effectivePlan = "allinone";
    } else if (hasSchool && hasAssistant) {
      effectivePlan = "allinone";
    } else if (hasSchool) {
      effectivePlan = "school";
    } else if (hasAssistant) {
      effectivePlan = "assistant";
    }

    const subscriptionEnd = latestEnd?.toISOString() ?? null;
    logStep("Active subscription found", { effectivePlan, activePlans, end: subscriptionEnd });

    // Save to DB - use "premium" for backward compatibility with is_premium() function
    const dbPlan = effectivePlan === "free" ? "free" : "premium";
    await supabaseAdmin.from("subscriptions").upsert({
      user_id: user.id,
      stripe_customer_id: customerId,
      stripe_subscription_id: primarySub.id,
      plan: dbPlan,
      status: "active",
      current_period_start: new Date(primarySub.current_period_start * 1000).toISOString(),
      current_period_end: subscriptionEnd,
      cancel_at_period_end: cancelAtPeriodEnd,
    }, { onConflict: "user_id" });

    return new Response(JSON.stringify({
      subscribed: true,
      plan: effectivePlan,
      has_school: hasSchool,
      has_assistant: hasAssistant,
      subscription_end: subscriptionEnd,
      cancel_at_period_end: cancelAtPeriodEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
