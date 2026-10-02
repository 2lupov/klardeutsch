import { supabase } from "@/integrations/supabase/client";

export type Level = "A1" | "A2" | "B1" | "B2";
export type Word = { nl: string; article: string; de: string; ru: string; example: string; example_ru: string };

export const DAYS: { day: number; title: string; topic: string }[] = [
  { day: 1, title: "Привет, как дела", topic: "приветствия, реакции, small talk: Hoe is het, Echt waar, Wat leuk, Nou en" },
  { day: 2, title: "Поддержать разговор", topic: "переспросить, согласиться, не согласиться, вежливые связки, частицы hoor/toch/joh" },
  { day: 3, title: "Планы с другом", topic: "договориться о встрече: afspreken, zin hebben, kunnen, wanneer, waar" },
  { day: 4, title: "Тусовка и бар", topic: "вечеринка, бар, пиво, gezellig, заказать, угостить" },
  { day: 5, title: "WhatsApp-переписка", topic: "сленг и сокращения в чатах: sws, mss, wnnr, idd, haha, emoji, неформальный стиль" },
  { day: 6, title: "Голосовые и звонки", topic: "телефонные фразы, голосовые сообщения, перезвонить, связь" },
  { day: 7, title: "Кино и сериалы", topic: "фильмы, жанры, сюжет, персонажи, spannend, eng, saai, grappig" },
  { day: 8, title: "Обсуждаем серию", topic: "мнения о фильме, спойлеры, концовка, рекомендация" },
  { day: 9, title: "Истории из жизни", topic: "рассказать случай в прошедшем времени: en toen, gebeurde, ineens" },
  { day: 10, title: "Эмоции и чувства", topic: "чувства, настроение, жаловаться, радоваться, раздражение" },
  { day: 11, title: "Сарказм и подколы", topic: "дружеские подколки, ирония, ругательства-лайт, междометия" },
  { day: 12, title: "Еда и готовка", topic: "еда дома и в гостях, lekker, рецепты, голландская еда" },
  { day: 13, title: "Музыка, игры, спорт", topic: "хобби, музыка, видеоигры, футбол, спортзал" },
  { day: 14, title: "Мнения обо всём", topic: "высказывать мнение: ik vind, volgens mij, eigenlijk, sowieso, путешествия" },
];

export const SCENARIOS = [
  "Вільна розмова з другом",
  "Обговорюємо серіал, який ти щойно подивився",
  "Плануємо вихідні разом",
  "Друг розповідає плітки про спільних знайомих",
  "Голосові повідомлення у WhatsApp",
  "Сперечаємось, який фільм увімкнути",
  "Телефонний дзвінок: друг запізнюється",
];

export const GRAMMAR: { title: string; rule: string; items: { q: string; options: string[]; answer: number; why: string }[] }[] = [
  {
    title: "De или het",
    rule: "de ≈ der/die (≈75%), het ≈ das. Уменьшительные -je всегда het. Множественное число всегда de.",
    items: [
      { q: "___ huis", options: ["de", "het"], answer: 1, why: "das Haus → het huis" },
      { q: "___ film", options: ["de", "het"], answer: 0, why: "der Film → de film" },
      { q: "___ meisje", options: ["de", "het"], answer: 1, why: "-je всегда het" },
      { q: "___ vrienden", options: ["de", "het"], answer: 0, why: "мн. число всегда de" },
      { q: "___ biertje", options: ["de", "het"], answer: 1, why: "-je → het" },
      { q: "___ serie", options: ["de", "het"], answer: 0, why: "die Serie → de serie" },
    ],
  },
  {
    title: "Прилагательные: mooi / mooie",
    rule: "Почти всегда -e. Без -e только: een/geen/geen + het-слово (een mooi huis) и после глагола (het is mooi).",
    items: [
      { q: "een ___ huis", options: ["mooi", "mooie"], answer: 0, why: "een + het-слово → без -e" },
      { q: "de ___ film", options: ["leuk", "leuke"], answer: 1, why: "с de → -e" },
      { q: "het ___ huis", options: ["groot", "grote"], answer: 1, why: "с het (определ.) → -e" },
      { q: "De film is ___", options: ["spannend", "spannende"], answer: 0, why: "после глагола без -e" },
    ],
  },
  {
    title: "Порядок слов",
    rule: "Как в немецком: глагол на 2 месте, инверсия, в придаточных (omdat, dat, als) глагол в конце. want — без смены порядка.",
    items: [
      { q: "Morgen ___ naar de film.", options: ["ik ga", "ga ik"], answer: 1, why: "инверсия как Morgen gehe ich" },
      { q: "Ik blijf thuis, omdat ik moe ___.", options: ["ben", "ben ik"], answer: 0, why: "omdat → глагол в конце" },
      { q: "Ik blijf thuis, want ik ___ moe.", options: ["ben", "moe ben"], answer: 0, why: "want = denn, прямой порядок" },
      { q: "Ik weet niet of hij ___.", options: ["komt", "komt hij"], answer: 0, why: "of = ob, глагол в конце" },
    ],
  },
  {
    title: "Частица er",
    rule: "er = da/es: 1) там (Ik ben er), 2) es gibt (Er is een feest), 3) с предлогом (erover = darüber), 4) с числом (Ik heb er twee).",
    items: [
      { q: "___ is een feest vanavond.", options: ["Het", "Er"], answer: 1, why: "es gibt → er is" },
      { q: "Ik heb ___ drie.", options: ["er", "het"], answer: 0, why: "er + число" },
      { q: "We praten ___.", options: ["erover", "over het"], answer: 0, why: "darüber → erover" },
    ],
  },
  {
    title: "Прошедшее: 't kofschip",
    rule: "Основа кончается на t,k,f,s,ch,p ('t kofschip) → -te/-t. Иначе → -de/-d. werken→werkte, spelen→speelde.",
    items: [
      { q: "Ik ___ gisteren lang. (werken)", options: ["werkte", "werkde"], answer: 0, why: "k ∈ kofschip → -te" },
      { q: "We ___ een spel. (spelen)", options: ["speelte", "speelde"], answer: 1, why: "l не в kofschip → -de" },
      { q: "Hij heeft ___ (fietsen)", options: ["gefietst", "gefietsd"], answer: 0, why: "s → -t" },
    ],
  },
  {
    title: "Разговорные частицы",
    rule: "nou — ну; hoor — смягчает (Het is goed, hoor); toch — же; joh — чувак/да ладно; even — по-быстрому; maar — смягчает просьбу.",
    items: [
      { q: "Kom ___ binnen! (заходи же)", options: ["maar", "toch"], answer: 0, why: "maar смягчает приглашение" },
      { q: "Dat is ___ niet waar, ___? (это же неправда, да?)", options: ["toch / toch", "hoor / joh"], answer: 0, why: "toch = doch / nicht wahr" },
      { q: "Mag ik ___ je telefoon? (на секунду)", options: ["even", "maar"], answer: 0, why: "even = mal kurz" },
    ],
  },
];

export async function dutchAi<T>(body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke("dutch-ai", { body });
  if (error) {
    let msg = error.message;
    try { const ctx = await (error as any).context?.json?.(); if (ctx?.error) msg = ctx.error; } catch { /* noop */ }
    throw new Error(msg);
  }
  if ((data as any)?.error) throw new Error((data as any).error);
  return data as T;
}

const base = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1`;
const audioCache = new Map<string, string>();
export const VOICES = { A: "pFZP5JQG7iQjIQuC4Bku", B: "TX3LPaxmHKxFdv7VOQHJ" } as const;

export async function speakUrl(text: string, voiceId: string = VOICES.A, speed = 1): Promise<string> {
  const key = `${voiceId}|${speed}|${text}`;
  const hit = audioCache.get(key);
  if (hit) return hit;
  const { data } = await supabase.auth.getSession();
  const res = await fetch(`${base}/elevenlabs-tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session?.access_token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ text, voiceId, speed: Math.min(1.2, Math.max(0.7, speed)) }),
  });
  if (!res.ok) throw new Error("Озвучка недоступна");
  const url = URL.createObjectURL(await res.blob());
  audioCache.set(key, url);
  return url;
}

let current: HTMLAudioElement | null = null;
export async function speak(text: string, voiceId?: string, speed = 1) {
  const url = await speakUrl(text, voiceId, speed);
  current?.pause();
  current = new Audio(url);
  await current.play();
  return current;
}

export async function transcribeDutch(blob: Blob): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const fd = new FormData();
  fd.append("audio", blob, "voice.webm");
  fd.append("language", "nld");
  const res = await fetch(`${base}/elevenlabs-transcribe`, {
    method: "POST",
    headers: { Authorization: `Bearer ${data.session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
    body: fd,
  });
  if (!res.ok) throw new Error("Не удалось распознать речь");
  return (await res.json()).text || "";
}

export function useLocal<T>(key: string, init: T) {
  const read = (): T => {
    try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : init; } catch { return init; }
  };
  return { read, write: (v: T) => localStorage.setItem(key, JSON.stringify(v)) };
}
