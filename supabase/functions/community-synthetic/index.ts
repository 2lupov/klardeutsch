import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const admin = createClient(SUPABASE_URL, SERVICE_KEY);

const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type Persona = {
  user_id?: string; display_name: string; username: string; writing_style: string; interests: string[];
  activity_level: number; emoji_frequency: number; typo_frequency: number; average_message_length: number;
  active_hours: number[]; personality_notes: string; language: "ru" | "uk";
};

const H = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

// Pool of synthetic community personas (technically flagged as synthetic in DB).
const POOL: Persona[] = [
  ["Оля", "olya_berlin", "коротко, без заглавных, часто «хз», «ну»", ["переезд в Берлин", "Termin в Bürgeramt"], 1.2, 0.3, 0.08, 35, H(8, 23), "уже 2 года в Германии, помогает новичкам", "ru"],
  ["Андрій", "andriy_de", "спокійно, по ділу, інколи довші пояснення", ["telc B1", "граматика"], 1, 0.1, 0.03, 60, H(7, 22), "готується до B1, любить розбирати Dativ/Akkusativ", "uk"],
  ["Марина К.", "marinak", "дружелюбно, много смайликов", ["сериалы на немецком", "слова"], 1.3, 0.6, 0.05, 40, H(10, 24), "учит через Netflix, делится находками", "ru"],
  ["Dima", "dima_92", "сухо, иногда сарказм, латиницей имя", ["работа IT", "Ausländerbehörde"], 0.8, 0.05, 0.1, 30, H(12, 24), "айтишник в Мюнхене", "ru"],
  ["Ірина", "iryna_lviv", "тепло, підтримує інших", ["діти в Kita", "побут"], 1, 0.4, 0.04, 45, H(8, 21), "мама двох дітей, вчить A2", "uk"],
  ["Сергей", "serg_h", "мало пишет, коротко, «+1», «согласен»", ["курсы интеграции"], 0.6, 0.05, 0.06, 18, H(9, 20), "ходит на Integrationskurs", "ru"],
  ["Катя", "katya_studies", "энергично, вопросы, восклицания", ["Uni", "Studienkolleg"], 1.2, 0.35, 0.07, 40, H(10, 24), "поступает в универ", "ru"],
  ["Олег", "oleg_koeln", "по-взрослому, без смайлов, иногда ворчит", ["документы", "налоги"], 0.7, 0.02, 0.05, 55, H(7, 21), "50 лет, учит язык с нуля", "ru"],
  ["Настя", "nastya_a1", "неуверенно, много вопросов, «а это правильно?»", ["A1", "произношение"], 1.1, 0.3, 0.12, 30, H(9, 23), "только начала учить", "ru"],
  ["Богдан", "bogdan_w", "жартує, мемний стиль", ["футбол", "розмовна мова"], 1, 0.5, 0.1, 25, H(13, 24), "студент, живе у Відні", "uk"],
  ["Лена", "lena_hh", "аккуратно, грамотно, советы", ["telc B2", "письмо"], 0.9, 0.15, 0.02, 70, H(8, 22), "сдала B2, делится опытом", "ru"],
  ["Макс", "maks_ua", "коротко, суржик іноді", ["робота", "Jobcenter"], 0.8, 0.2, 0.12, 25, H(10, 23), "шукає роботу", "uk"],
  ["Юля", "yulia_dd", "болтливо, истории из жизни", ["Arzt", "аптека"], 1.1, 0.4, 0.06, 65, H(9, 22), "медсестра, учит профессиональную лексику", "ru"],
  ["Тарас", "taras_m", "впевнено, трохи категорично", ["граматика", "Perfekt"], 0.8, 0.1, 0.04, 45, H(8, 23), "любить правила", "uk"],
  ["Аня", "anya_reads", "мягко, рекомендует книги и подкасты", ["подкасты", "чтение"], 0.9, 0.25, 0.03, 50, H(11, 24), "слушает Easy German", "ru"],
  ["Вова", "vova_trk", "очень коротко, опечатки", ["водительские права", "работа"], 0.7, 0.1, 0.18, 15, H(6, 20), "дальнобойщик, учит в дороге", "ru"],
  ["Соломія", "solomiya", "акуратно, ввічливо", ["вимова", "пісні"], 0.9, 0.3, 0.03, 40, H(9, 22), "вчить через пісні", "uk"],
  ["Рома", "roma_dev", "иронично, айтишный сленг", ["приложения", "Anki"], 0.9, 0.2, 0.07, 35, H(12, 24), "оптимизирует обучение", "ru"],
  ["Таня", "tanya_ffm", "по-деловому, конкретные советы", ["собеседования", "резюме"], 0.8, 0.1, 0.03, 55, H(7, 21), "HR во Франкфурте", "ru"],
  ["Павло", "pavlo_k", "просто, по-сільському тепло", ["сусіди", "магазини"], 0.7, 0.2, 0.1, 30, H(6, 21), "живе в маленькому містечку", "uk"],
  ["Даша", "dasha_b1", "эмоционально, переживает за экзамен", ["telc B1", "Sprechen"], 1.2, 0.45, 0.06, 40, H(10, 24), "экзамен через месяц", "ru"],
  ["Ігор", "igor_s", "мало слів, але по суті", ["лексика", "Präpositionen"], 0.6, 0.05, 0.05, 25, H(8, 22), "", "uk"],
  ["Вика", "vika_mz", "весело, иногда капс для эмоций", ["немецкий юмор", "друзья-немцы"], 1, 0.5, 0.08, 35, H(12, 24), "встречается с немцем", "ru"],
  ["Артём", "artem_ka", "вежливо, развёрнуто", ["Ausbildung", "профессия"], 0.8, 0.1, 0.04, 60, H(8, 22), "идёт на Ausbildung", "ru"],
  ["Христина", "khrystyna", "легко, з емодзі", ["кулінарія", "рецепти німецькою"], 0.9, 0.5, 0.05, 35, H(9, 23), "", "uk"],
].map(([display_name, username, writing_style, interests, activity_level, emoji_frequency, typo_frequency, average_message_length, active_hours, personality_notes, language]) => ({
  display_name, username, writing_style, interests, activity_level, emoji_frequency, typo_frequency,
  average_message_length, active_hours, personality_notes, language,
} as Persona));

const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").replace(/\s+/g, " ").trim();
const kyivHour = () => Number(new Intl.DateTimeFormat("en-GB", { hour: "numeric", hour12: false, timeZone: "Europe/Kyiv" }).format(new Date()));
const rand = (a: number, b: number) => a + Math.random() * (b - a);

async function isAdminRequest(req: Request): Promise<"cron" | "admin" | null> {
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  if (token === SERVICE_KEY) return "cron";
  const { data: { user } } = await admin.auth.getUser(token);
  if (!user) return null;
  const { data } = await admin.rpc("has_role", { _user_id: user.id, _role: "admin" });
  return data ? "admin" : null;
}

async function seed() {
  const { data: existing } = await admin.from("synthetic_personas").select("username");
  const have = new Set((existing ?? []).map((e) => e.username));
  let created = 0;
  for (const p of POOL) {
    if (have.has(p.username)) continue;
    const email = `${p.username}@synthetic.klar.local`;
    const { data, error } = await admin.auth.admin.createUser({
      email, password: crypto.randomUUID() + "Aa1!", email_confirm: true,
      user_metadata: { synthetic: true, display_name: p.display_name },
    });
    if (error || !data.user) { console.error("createUser", p.username, error?.message); continue; }
    const uid = data.user.id;
    const avatar = `https://api.dicebear.com/9.x/notionists/svg?seed=${encodeURIComponent(p.username)}`;
    const { error: pe } = await admin.from("profiles").update({
      display_name: p.display_name, nickname: p.username, avatar_url: avatar, is_synthetic: true,
      onboarding_completed: true, preferred_lang: p.language,
    }).eq("user_id", uid);
    if (pe) console.error("profile", pe.message);
    const { error: se } = await admin.from("synthetic_personas").insert({ ...p, user_id: uid, avatar_url: avatar });
    if (se) console.error("persona", se.message); else created++;
  }
  return created;
}

async function tick(force: boolean) {
  const { data: s, error: se } = await admin.from("synthetic_settings").select("*").eq("id", 1).single();
  if (se || !s) return { skipped: "no_settings" };
  if (!s.enabled && !force) return { skipped: "disabled" };
  const now = Date.now();
  if (!force && s.next_run_at && new Date(s.next_run_at).getTime() > now) return { skipped: "waiting" };

  const hour = kyivHour();
  const quiet = s.quiet_hours_start <= s.quiet_hours_end
    ? hour >= s.quiet_hours_start && hour < s.quiet_hours_end
    : hour >= s.quiet_hours_start || hour < s.quiet_hours_end;
  const levelMul = s.activity_level === "low" ? 1.8 : s.activity_level === "high" ? 0.6 : 1;
  const schedule = async (burst = false) => {
    let mins = rand(s.min_delay_minutes, s.max_delay_minutes) * levelMul;
    if (hour >= 23 || hour < 8) mins *= 2.5;
    if (burst) mins = rand(1.5, 6);
    await admin.from("synthetic_settings").update({ next_run_at: new Date(now + mins * 60000).toISOString() }).eq("id", 1);
  };
  if (quiet && !force) { await schedule(); return { skipped: "quiet_hours" }; }

  const { data: personas } = await admin.from("synthetic_personas").select("*").eq("enabled", true).limit(s.active_personas);
  if (!personas?.length) return { skipped: "no_personas" };
  const synthIds = new Set(personas.map((p) => p.user_id));
  const { data: allSynth } = await admin.from("profiles").select("user_id").eq("is_synthetic", true);
  (allSynth ?? []).forEach((r) => synthIds.add(r.user_id));

  const hourAgo = new Date(now - 3600000).toISOString();
  const { count } = await admin.from("community_messages").select("id", { count: "exact", head: true })
    .gte("created_at", hourAgo).in("user_id", [...synthIds]);
  if (!force && (count ?? 0) >= s.max_messages_per_hour) { await schedule(); return { skipped: "hourly_cap" }; }

  const { data: recentDesc } = await admin.from("community_messages").select("id, user_id, content, created_at, reply_to_id")
    .order("created_at", { ascending: false }).limit(25);
  const recent = (recentDesc ?? []).reverse();
  const uids = [...new Set(recent.map((m) => m.user_id))];
  const { data: profs } = uids.length ? await admin.from("profiles").select("user_id, display_name").in("user_id", uids) : { data: [] };
  const nameOf = (id: string) => profs?.find((p) => p.user_id === id)?.display_name || "user";

  const last = recent[recent.length - 1];
  const lastAge = last ? (now - new Date(last.created_at).getTime()) / 60000 : Infinity;
  // bot-to-bot guard: stop chains of synthetic-only messages
  const tailSynth = [...recent].reverse().findIndex((m) => !synthIds.has(m.user_id));
  const synthStreak = tailSynth === -1 ? recent.length : tailSynth;
  if (!force && synthStreak >= 4 && lastAge < 180) { await schedule(); return { skipped: "bot_chain_guard" }; }

  // real user waiting? reply sometimes, not always
  const realLast = last && !synthIds.has(last.user_id) && lastAge < 90;
  if (!force && !realLast && Math.random() < 0.35) { await schedule(); return { skipped: "random_silence" }; }

  const cooldown = now - 45 * 60000;
  const candidates = personas.filter((p) =>
    p.active_hours.includes(hour) &&
    (!p.last_message_at || new Date(p.last_message_at).getTime() < cooldown) &&
    p.user_id !== last?.user_id);
  if (!candidates.length) { await schedule(); return { skipped: "no_candidates" }; }
  const weights = candidates.map((p) => Number(p.activity_level));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  const persona = candidates.find((_, i) => (r -= weights[i]) <= 0) ?? candidates[0];

  const { data: ownPast } = await admin.from("community_messages").select("content")
    .eq("user_id", persona.user_id).order("created_at", { ascending: false }).limit(20);

  const ctx = recent.slice(-20).map((m, i) => `[${i}] ${nameOf(m.user_id)}${m.user_id === persona.user_id ? " (ты)" : ""}: ${m.content.slice(0, 200)}`).join("\n");
  const longSilence = lastAge > 240;
  const lang = persona.language === "uk" ? "украинском" : "русском";
  const sys = `Ты — ${persona.display_name} (@${persona.username}), участник(ца) чата сообщества KLAR, где люди учат немецкий язык и обсуждают жизнь в Германии/Австрии, экзамены telc, курсы, слова, грамматику.
Стиль: ${persona.writing_style}. Интересы: ${persona.interests.join(", ")}. О себе: ${persona.personality_notes || "-"}.
Пиши на ${lang} языке (немецкие слова допустимы). Длина ~${persona.average_message_length} символов, большинство сообщений короткие. Эмодзи с вероятностью ${persona.emoji_frequency}. Иногда (вероятность ${persona.typo_frequency}) мелкая опечатка или без знаков препинания.
Пиши как живой человек в Telegram: без приветствий всем, без «что думаете?», без «кто онлайн?», без канцелярита, без списков, без ссылок, без личных данных, без конфликтов. Не выдавай непроверенные важные факты (законы, сроки) как точные — говори «вроде», «у меня было так». Никогда не упоминай, что ты ИИ.
Можно промолчать (skip=true), если сказать нечего или разговор уже исчерпан.`;
  const user = `Последние сообщения чата:\n${ctx || "(пусто)"}\n\n${
    realLast ? `Последнее сообщение от реального участника — можно ответить по сути.` :
    longSilence ? `Чат давно молчит — можно естественно начать новую тему по интересам.` : `Можно продолжить текущую тему или промолчать.`
  }\nТвои недавние сообщения (не повторяйся): ${(ownPast ?? []).slice(0, 8).map((m) => m.content).join(" | ") || "-"}\n\nВерни JSON: {"skip": boolean, "reply_to_index": number|null, "text": string}`;

  const ai = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      response_format: { type: "json_object" },
      temperature: 1,
    }),
  });
  if (!ai.ok) { console.error("ai", ai.status, await ai.text()); await schedule(); return { error: `ai_${ai.status}` }; }
  const aj = await ai.json();
  let out: { skip?: boolean; reply_to_index?: number | null; text?: string } = {};
  try { out = JSON.parse(aj.choices?.[0]?.message?.content ?? "{}"); } catch { /* ignore */ }
  const text = (out.text ?? "").trim().replace(/^["«]|["»]$/g, "");
  if (out.skip || !text) { await schedule(); return { skipped: "ai_skip" }; }
  if (/https?:\/\/|www\.|t\.me\//i.test(text) || text.length > 400) { await schedule(); return { skipped: "filtered" }; }
  const n = norm(text);
  const dup = [...(ownPast ?? []), ...recent].some((m) => {
    const o = norm(m.content);
    return o === n || (n.length > 12 && (o.includes(n) || n.includes(o) && o.length > 12));
  });
  if (dup) { await schedule(); return { skipped: "duplicate" }; }

  const ctxList = recent.slice(-20);
  const target = typeof out.reply_to_index === "number" ? ctxList[out.reply_to_index] : undefined;
  const replyTarget = target && target.user_id !== persona.user_id ? target : undefined;

  const { error: ie } = await admin.from("community_messages").insert({
    user_id: persona.user_id, content: text, image_urls: [],
    reply_to_id: replyTarget?.id ?? null,
    reply_to_content: replyTarget?.content.slice(0, 200) ?? null,
    reply_to_sender: replyTarget ? nameOf(replyTarget.user_id) : null,
  });
  if (ie) { console.error("insert", ie.message); await schedule(); return { error: "insert_failed" }; }
  await admin.from("synthetic_personas").update({ last_message_at: new Date().toISOString() }).eq("user_id", persona.user_id);
  await schedule(Math.random() < 0.2);
  return { sent: true, persona: persona.username };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const who = await isAdminRequest(req);
    if (!who) return json({ error: "unauthorized" }, 401);
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "tick";
    if (action === "seed") {
      if (who !== "admin") return json({ error: "forbidden" }, 403);
      return json({ created: await seed() });
    }
    if (action === "tick") return json(await tick(who === "admin" && body?.force === true));
    return json({ error: "unknown action" }, 400);
  } catch (e) {
    console.error(e);
    return json({ error: (e as Error).message }, 500);
  }
});
