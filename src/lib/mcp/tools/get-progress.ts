import { createClient } from "@supabase/supabase-js";
import { defineTool, type ToolContext } from "@lovable.dev/mcp-js";
import { z } from "zod";

function clientFor(ctx: ToolContext) {
  return createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
    global: { headers: { Authorization: `Bearer ${ctx.getToken()}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export default defineTool({
  name: "get_progress",
  title: "Get my learning progress",
  description:
    "Returns the signed-in KLAR user's total XP, coin balance, current level, and profile display name.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = clientFor(ctx);
    const userId = ctx.getUserId();

    const [profile, xp, coins] = await Promise.all([
      supabase.from("profiles").select("display_name, nickname, level").eq("user_id", userId).maybeSingle(),
      supabase.from("user_xp").select("total_xp").eq("user_id", userId).maybeSingle(),
      supabase.from("user_coins").select("balance").eq("user_id", userId).maybeSingle(),
    ]);

    const result = {
      display_name: profile.data?.display_name ?? null,
      nickname: profile.data?.nickname ?? null,
      level: profile.data?.level ?? null,
      total_xp: xp.data?.total_xp ?? 0,
      coins: coins.data?.balance ?? 0,
    };

    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      structuredContent: result,
    };
  },
});
