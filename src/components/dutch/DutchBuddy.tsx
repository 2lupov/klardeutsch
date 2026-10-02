import { useEffect, useRef, useState } from "react";
import { Loader2, Send, Volume2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Recorder from "./Recorder";
import { dutchAi, speak, SCENARIOS, VOICES, type Level } from "@/lib/dutch";
import { toast } from "sonner";

type Reply = { reply: string; reply_ru: string; correction: string; explain_ru: string; suggestions: string[] };
type Msg = { role: "user" | "assistant"; content: string; meta?: Reply };

export default function DutchBuddy({ level }: { level: Level }) {
  const [scenario, setScenario] = useState(SCENARIOS[0]);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [voice, setVoice] = useState(true);
  const [speed, setSpeed] = useState(0.9);
  const [showRu, setShowRu] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { end.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs, busy]);

  const ask = async (history: Msg[]) => {
    setBusy(true);
    try {
      const r = await dutchAi<Reply>({ action: "chat", level, scenario, history: history.map(({ role, content }) => ({ role, content })) });
      const next = [...history, { role: "assistant" as const, content: r.reply, meta: r }];
      // attach correction to the user's last message
      setMsgs(next);
      if (voice && r.reply) speak(r.reply, VOICES.B, speed).catch(() => {});
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); box.current?.focus(); }
  };

  const send = (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    const h = [...msgs, { role: "user" as const, content: t }];
    setMsgs(h); setInput("");
    ask(h);
  };

  const restart = (s = scenario) => { setScenario(s); setMsgs([]); setTimeout(() => ask([]), 0); };
  const last = [...msgs].reverse().find((m) => m.meta)?.meta;

  return (
    <div className="grid lg:grid-cols-[1fr_300px] gap-4 h-full min-h-0">
      <section className="flex flex-col min-h-0 rounded-2xl border border-border bg-card">
        <div className="flex flex-wrap items-center gap-2 p-3 border-b border-border">
          <span className="text-2xl">🧑‍🦱</span>
          <div className="mr-auto"><p className="font-semibold leading-tight">Daan</p><p className="text-xs text-muted-foreground">твой голландский друг · {scenario}</p></div>
          <Button size="sm" variant={voice ? "default" : "outline"} onClick={() => setVoice(!voice)}>🔊 Голос</Button>
          {[0.8, 0.9, 1].map((s) => <Button key={s} size="sm" variant={speed === s ? "secondary" : "ghost"} onClick={() => setSpeed(s)}>{s}x</Button>)}
          <Button size="sm" variant="ghost" onClick={() => setShowRu(!showRu)}>RU</Button>
          <Button size="sm" variant="ghost" onClick={() => restart()}><RotateCcw className="h-4 w-4" /></Button>
        </div>

        <div className="flex-1 overflow-y-auto min-h-0 p-4 space-y-3">
          {!msgs.length && !busy && (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-muted-foreground">
              <p>Общайся с Daan голосом или текстом. Забыл слово — вставь его по-русски или по-немецки.</p>
              <Button onClick={() => restart()}>Начать разговор</Button>
            </div>
          )}
          {msgs.map((m, i) => {
            const next = msgs[i + 1]?.meta;
            return m.role === "user" ? (
              <div key={i} className="flex flex-col items-end gap-1">
                <div className="max-w-[80%] rounded-2xl rounded-br-sm bg-primary text-primary-foreground px-4 py-2">{m.content}</div>
                {next?.correction && (
                  <div className="max-w-[80%] text-xs rounded-xl border border-border bg-muted/50 px-3 py-2">
                    ✏️ <b>{next.correction}</b>
                    {next.explain_ru && <p className="text-muted-foreground mt-0.5">{next.explain_ru}</p>}
                  </div>
                )}
              </div>
            ) : (
              <div key={i} className="max-w-[85%]">
                <div className="flex items-start gap-2">
                  <p className="leading-relaxed">{m.content}</p>
                  <button onClick={() => speak(m.content, VOICES.B, speed).catch(() => {})} className="text-muted-foreground hover:text-primary mt-1"><Volume2 className="h-4 w-4" /></button>
                </div>
                {showRu && m.meta?.reply_ru && <p className="text-sm text-muted-foreground">{m.meta.reply_ru}</p>}
                {!m.meta?.correction && m.meta?.explain_ru && <p className="text-xs text-muted-foreground mt-1">💡 {m.meta.explain_ru}</p>}
              </div>
            );
          })}
          {busy && <p className="text-muted-foreground text-sm flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Daan печатает…</p>}
          <div ref={end} />
        </div>

        {last?.suggestions?.length ? (
          <div className="flex flex-wrap gap-2 px-3 pt-2">
            {last.suggestions.map((s, i) => <button key={i} onClick={() => setInput(s)} className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted">{s}</button>)}
          </div>
        ) : null}
        <div className="flex gap-2 p-3 items-end">
          <Textarea ref={box} autoFocus rows={1} value={input} onChange={(e) => setInput(e.target.value)} placeholder="Typ in het Nederlands…"
            className="min-h-10 resize-none" onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(input); } }} />
          <Recorder label="" onText={(t) => send(t)} />
          <Button onClick={() => send(input)} disabled={busy || !input.trim()}><Send className="h-4 w-4" /></Button>
        </div>
      </section>

      <aside className="rounded-2xl border border-border bg-card p-3 overflow-y-auto min-h-0 space-y-1">
        <p className="text-sm font-semibold px-1 pb-1">Сценарии</p>
        {SCENARIOS.map((s) => (
          <button key={s} onClick={() => restart(s)} className={`w-full text-left text-sm rounded-xl px-3 py-2 ${s === scenario ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>{s}</button>
        ))}
      </aside>
    </div>
  );
}
