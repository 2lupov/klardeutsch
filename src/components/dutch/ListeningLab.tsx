import { useRef, useState } from "react";
import { Loader2, Play, Pause, RotateCcw, Eye, EyeOff, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Recorder from "./Recorder";
import { dutchAi, speakUrl, VOICES, type Level } from "@/lib/dutch";
import { toast } from "sonner";

type Lesson = {
  title: string; summary_ru: string;
  lines: { speaker: "A" | "B"; nl: string; ru: string }[];
  vocab: { nl: string; ru: string; de: string }[];
  particles: { nl: string; explain_ru: string }[];
  quiz: { q_ru: string; options: string[]; answer: number }[];
  gaps: { line: number; word: string }[];
};

const IDEAS = ["Друзья выбирают фильм на вечер", "Рассказ о странном свидании", "Обсуждение финала сериала", "Влог: мой день в Амстердаме", "Разговор в машине по дороге на фестиваль", "Голосовое: друг опаздывает"];
const norm = (s: string) => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, "").trim();

export default function ListeningLab({ level }: { level: Level }) {
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [urls, setUrls] = useState<string[]>([]);
  const [show, setShow] = useState(false);
  const [cur, setCur] = useState(-1);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [gapIn, setGapIn] = useState<Record<number, string>>({});
  const [checked, setChecked] = useState(false);
  const [shadow, setShadow] = useState<Record<number, string>>({});
  const audio = useRef<HTMLAudioElement | null>(null);
  const stopFlag = useRef(false);

  const generate = async (t = topic) => {
    setBusy(true); setLesson(null); setUrls([]); setShow(false); setAnswers({}); setGapIn({}); setChecked(false); setShadow({});
    try {
      const l = await dutchAi<Lesson>({ action: "listening", level, topic: t });
      setLesson(l);
      const u = await Promise.all(l.lines.map((ln) => speakUrl(ln.nl, ln.speaker === "B" ? VOICES.B : VOICES.A, 1)));
      setUrls(u);
    } catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
  };

  const playFrom = async (i: number, only = false) => {
    stopFlag.current = false;
    setPlaying(true);
    for (let k = i; k < urls.length; k++) {
      if (stopFlag.current) break;
      setCur(k);
      await new Promise<void>((res) => {
        audio.current?.pause();
        const a = new Audio(urls[k]);
        a.playbackRate = speed;
        audio.current = a;
        a.onended = () => res();
        a.onerror = () => res();
        a.play().catch(() => res());
      });
      if (only) break;
    }
    setPlaying(false);
  };
  const stop = () => { stopFlag.current = true; audio.current?.pause(); setPlaying(false); };

  const score = lesson ? lesson.quiz.filter((q, i) => answers[i] === q.answer).length + lesson.gaps.filter((g, i) => norm(gapIn[i] || "") === norm(g.word)).length : 0;

  return (
    <div className="h-full overflow-y-auto min-h-0 space-y-4 pr-1">
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex gap-2">
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="О чём аудирование? (или выбери идею ниже)" onKeyDown={(e) => e.key === "Enter" && !busy && generate()} />
          <Button onClick={() => generate()} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Создать"}</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {IDEAS.map((i) => <button key={i} disabled={busy} onClick={() => { setTopic(i); generate(i); }} className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted">{i}</button>)}
        </div>
      </div>

      {busy && <p className="text-center text-muted-foreground py-8">ШИ пишет сцену и озвучивает голосами… ~20–40 сек</p>}

      {lesson && urls.length > 0 && (
        <>
          <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold mr-auto">🎧 {lesson.title}</h2>
              {[0.8, 1, 1.2].map((s) => <Button key={s} size="sm" variant={speed === s ? "default" : "outline"} onClick={() => setSpeed(s)}>{s}x</Button>)}
            </div>
            <div className="flex gap-2">
              {playing ? <Button onClick={stop} className="gap-2"><Pause className="h-4 w-4" />Пауза</Button>
                : <Button onClick={() => playFrom(cur > 0 && cur < urls.length - 1 ? cur : 0)} className="gap-2"><Play className="h-4 w-4" />Слушать</Button>}
              <Button variant="outline" onClick={() => { stop(); playFrom(Math.max(0, cur - 1)); }}><RotateCcw className="h-4 w-4" /></Button>
              <Button variant="outline" onClick={() => setShow(!show)} className="gap-2 ml-auto">{show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}{show ? "Скрыть текст" : "Разобрать текст"}</Button>
            </div>
            {!show ? (
              <p className="text-sm text-muted-foreground">Слепое слушание: прослушай 1–2 раза, попробуй понять суть, потом открой текст.</p>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">{lesson.summary_ru}</p>
                {lesson.lines.map((l, i) => (
                  <div key={i} className={`rounded-xl p-3 transition ${cur === i ? "bg-primary/15 ring-1 ring-primary" : "bg-muted/40"}`}>
                    <div className="flex items-start gap-2">
                      <button onClick={() => { stop(); playFrom(i, true); }} className="mt-0.5 text-muted-foreground hover:text-primary"><Volume2 className="h-4 w-4" /></button>
                      <div className="flex-1">
                        <p><b className="text-primary">{l.speaker}:</b> {l.nl}</p>
                        <p className="text-sm text-muted-foreground">{l.ru}</p>
                        {shadow[i] && <p className="text-xs mt-1">🗣 ты: <i>{shadow[i]}</i></p>}
                      </div>
                      <Recorder label="Повтори" onText={(t) => setShadow((s) => ({ ...s, [i]: t }))} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {show && (
            <div className="grid md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="font-semibold mb-2">Слова и выражения</h3>
                {lesson.vocab.map((v, i) => <p key={i} className="text-sm py-0.5"><b>{v.nl}</b> — {v.ru}{v.de && <span className="text-muted-foreground"> · 🇩🇪 {v.de}</span>}</p>)}
              </div>
              <div className="rounded-2xl border border-border bg-card p-4">
                <h3 className="font-semibold mb-2">Частицы и разговорное</h3>
                {lesson.particles.map((p, i) => <p key={i} className="text-sm py-0.5"><b>{p.nl}</b> — {p.explain_ru}</p>)}
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
            <h3 className="font-semibold">Проверь понимание</h3>
            {lesson.quiz.map((q, i) => (
              <div key={i}>
                <p className="text-sm mb-1">{i + 1}. {q.q_ru}</p>
                <div className="flex flex-wrap gap-2">
                  {q.options.map((o, j) => {
                    const sel = answers[i] === j;
                    const cls = checked ? (j === q.answer ? "border-emerald-500 bg-emerald-500/15" : sel ? "border-destructive bg-destructive/15" : "") : sel ? "border-primary bg-primary/15" : "";
                    return <button key={j} onClick={() => !checked && setAnswers({ ...answers, [i]: j })} className={`text-sm rounded-lg border border-border px-3 py-1.5 ${cls}`}>{o}</button>;
                  })}
                </div>
              </div>
            ))}
            <h3 className="font-semibold pt-2">Диктант: впиши услышанное слово</h3>
            {lesson.gaps.map((g, i) => {
              const line = lesson.lines[g.line]?.nl ?? "";
              const masked = line.replace(new RegExp(g.word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"), "_____");
              const ok = norm(gapIn[i] || "") === norm(g.word);
              return (
                <div key={i} className="flex flex-wrap items-center gap-2 text-sm">
                  <button onClick={() => { stop(); playFrom(g.line, true); }} className="text-muted-foreground hover:text-primary"><Volume2 className="h-4 w-4" /></button>
                  <span className="flex-1 min-w-48">{masked}</span>
                  <Input className={`w-40 h-8 ${checked ? (ok ? "border-emerald-500" : "border-destructive") : ""}`} value={gapIn[i] || ""} onChange={(e) => setGapIn({ ...gapIn, [i]: e.target.value })} />
                  {checked && !ok && <span className="text-emerald-400">{g.word}</span>}
                </div>
              );
            })}
            <div className="flex items-center gap-3">
              <Button onClick={() => setChecked(true)}>Проверить</Button>
              {checked && <span className="font-semibold">{score} / {lesson.quiz.length + lesson.gaps.length}</span>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
