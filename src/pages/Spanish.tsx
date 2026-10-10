import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import courseHtml from "@/features/spanish/course.html?raw";
import { canSeeSpanish } from "@/features/spanish/access";

// Native ElevenLabs voice: the course's own speak() is redirected to the parent page,
// which plays permanently cached MP3s from the presentation-tts function.
const BRIDGE = `
function ttsOK(){return true;}
function stopAll(){SPK++;try{window.parent.__esStop&&window.parent.__esStop();}catch(e){}}
function speak(text,o){o=o||{};try{return window.parent.__esSpeak(plain(text),o.rate||S.set.rate||0.9,!!o.queue);}catch(e){return Promise.resolve(false);}}
`;

function patched() {
  return courseHtml.replace("/* ===== навигация и каркас ===== */", BRIDGE + "\n/* ===== навигация и каркас ===== */");
}

export default function Spanish() {
  const { user, loading } = useAuth();
  const [nick, setNick] = useState<string | null | undefined>(undefined);
  const html = useMemo(patched, []);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("nickname").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setNick(data?.nickname ?? null));
  }, [user]);

  useEffect(() => {
    let current: HTMLAudioElement | null = null;
    let chain = Promise.resolve<unknown>(true);
    const stop = () => { if (current) { current.pause(); current = null; } chain = Promise.resolve(true); };
    const play = async (text: string, rate: number) => {
      const { data } = await supabase.functions.invoke("presentation-tts", { body: { text, lang: "es", speed: rate } });
      if (!data?.url) return false;
      return new Promise<boolean>((res) => {
        const a = new Audio(data.url); current = a;
        a.onended = () => res(true); a.onerror = () => res(false);
        a.play().catch(() => res(false));
      });
    };
    (window as any).__esStop = stop;
    (window as any).__esSpeak = (text: string, rate: number, queue: boolean) => {
      if (!queue) stop();
      const p = chain.then(() => play(text, rate));
      chain = p;
      return p;
    };
    return () => { stop(); delete (window as any).__esStop; delete (window as any).__esSpeak; };
  }, []);

  if (loading || (user && nick === undefined)) return null;
  if (!user || !canSeeSpanish(nick)) return <Navigate to="/" replace />;

  return (
    <iframe
      title="Испанский с нуля"
      srcDoc={html}
      className="fixed inset-0 h-[100dvh] w-full border-0"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
    />
  );
}
