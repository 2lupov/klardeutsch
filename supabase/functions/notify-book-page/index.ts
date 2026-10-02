import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};
const ADMIN_CHAT_ID = "5109895086";
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
const esc = (v: unknown) => String(v ?? "—").slice(0, 300).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);
    const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: claims, error: cErr } = await anon.auth.getClaims(auth.replace("Bearer ", ""));
    if (cErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const uid = claims.claims.sub as string;

    const { page_id } = await req.json().catch(() => ({}));
    if (typeof page_id !== "string" || page_id.length > 64) return json({ error: "page_id required" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: page } = await admin
      .from("student_book_pages")
      .select("page_number, homework_note, homework_status, sb:student_books(student_id, book:book_files(title))")
      .eq("id", page_id)
      .maybeSingle();
    const sb: any = (page as any)?.sb;
    if (!page || sb?.student_id !== uid) return json({ error: "Not found" }, 404);
    if ((page as any).homework_status !== "done") return json({ ok: true, skipped: true });

    const { data: prof } = await admin.from("profiles").select("display_name, nickname").eq("user_id", uid).maybeSingle();
    const who = `${esc(prof?.display_name || "Учень")}${prof?.nickname ? ` (@${esc(prof.nickname)})` : ""}`;
    const text = [
      "📕 <b>Здано сторінку підручника</b>",
      `👤 ${who}`,
      `📖 ${esc(sb?.book?.title || "Підручник")} · стор. ${(page as any).page_number}`,
      (page as any).homework_note ? `📝 ${esc((page as any).homework_note)}` : "",
      "Перевір: Адмінка → Завдання → Завдання учнів",
    ].filter(Boolean).join("\n");

    const token = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (token) {
      const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: ADMIN_CHAT_ID, text, parse_mode: "HTML" }),
      });
      if (!r.ok) console.error("Telegram failed", r.status, await r.text());
    }
    return json({ ok: true });
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});
