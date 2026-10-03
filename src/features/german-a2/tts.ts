import { supabase } from "@/integrations/supabase/client";

/** German ElevenLabs voices: default narrator + a female and male voice for dialogues. */
export const VOICES = {
  default: "aTTiK3YzK3dXETpuDE2h",
  female: "EXAVITQu4vr4xnSDxMaL",
  male: "JBFqnCBsd6RMkjVDRZzb",
};

const cache = new Map<string, Promise<string>>();
let current: HTMLAudioElement | null = null;
let stopToken = 0;

function fetchAudio(text: string, voiceId: string, speed: number): Promise<string> {
  const k = `${voiceId}|${speed}|${text}`;
  if (!cache.has(k)) {
    const p = (async () => {
      const { data } = await supabase.auth.getSession();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${data.session?.access_token ?? ""}`,
        },
        body: JSON.stringify({ text, voiceId, speed }),
      });
      if (!res.ok) throw new Error(`TTS ${res.status}`);
      return URL.createObjectURL(await res.blob());
    })();
    p.catch(() => cache.delete(k));
    cache.set(k, p);
  }
  return cache.get(k)!;
}

export function stopSpeaking() {
  stopToken++;
  current?.pause();
  current = null;
}

function playUrl(url: string, token: number): Promise<void> {
  return new Promise(resolve => {
    if (token !== stopToken) return resolve();
    current?.pause();
    const a = new Audio(url);
    current = a;
    a.onended = () => resolve();
    a.onerror = () => resolve();
    a.onpause = () => resolve();
    a.play().catch(() => resolve());
  });
}

/** Speak one German phrase (cleans "der/die" hints like "(-e)"). */
export async function speak(text: string, voiceId = VOICES.default, speed = 0.9) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return;
  stopSpeaking();
  const token = stopToken;
  try { await playUrl(await fetchAudio(clean, voiceId, speed), token); } catch (e) { console.error(e); }
}

const FEMALE = /^(lena|anna|frau|maria|sara|julia|lisa|mutter|mama|emma|eva|sophie|laura|kellnerin|ärztin|verkäuferin)/i;

/** Plays a dialogue line by line with a voice per speaker. Resolves when finished or stopped. */
export async function playDialogue(lines: { speaker?: string; text: string }[], onLine?: (i: number) => void) {
  stopSpeaking();
  const token = stopToken;
  const speakers: string[] = [];
  const voiceFor = (s?: string) => {
    if (!s) return VOICES.default;
    if (!speakers.includes(s)) speakers.push(s);
    if (FEMALE.test(s)) return VOICES.female;
    return speakers.indexOf(s) % 2 === 0 ? VOICES.male : VOICES.female;
  };
  const urls = lines.map(l => fetchAudio(l.text, voiceFor(l.speaker), 0.9));
  for (let i = 0; i < lines.length; i++) {
    if (token !== stopToken) return;
    onLine?.(i);
    try { await playUrl(await urls[i]!, token); } catch { /* skip line */ }
  }
  onLine?.(-1);
}
