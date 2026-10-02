import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Volume2, Play, Pause, Check, Languages } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { dutchAi, speakWord, speakUrl, VOICES, type Level } from "@/lib/dutch";
import { getVocabMap, addIfNew, bulkAddIfNew, markKnown, getStats, type VocabItem, type GlossaryEntry } from "@/lib/vocabStore";
import { toast } from "sonner";

type ReadingLesson = { title: string; text: string; text_ru: string; glossary: GlossaryEntry[] };

const IDEAS = [
  "Короткий рассказ о странном дне",
  "Пост в стиле блога о жизни в Амстердаме",
  "Дневниковая запись о выходных",
  "Забавная новость из маленького города",
  "Письмо другу о недавней поездке",
  "История с неожиданным концом",
];

// Intl.Segmenter — корректная юникод-токенизация по словам (слова отдельно от
// пробелов и пунктуации). Там, где его нет (очень старый браузер), — запасной
// вариант на регулярке: по словам он грубее, но для чтения достаточно.
function tokenize(text: string): { text: string; isWord: boolean }[] {
  const Seg = (Intl as any).Segmenter;
  if (Seg) {
    const seg = new Seg("nl", { granularity: "word" });
    return [...seg.segment(text)].map((s: any) => ({ text: s.segment, isWord: s.isWordLike }));
  }
  return text
    .split(/(\s+|[.,!?;:()"„""…\-])/)
    .filter((t) => t.length)
    .map((t) => ({ text: t, isWord: /\p{L}/u.test(t) }));
}

const norm = (s: string) => s.trim().toLowerCase();

export default function Reader({ level }: { level: Level }) {
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [lesson, setLesson] = useState<ReadingLesson | null>(null);
  const [vocabMap, setVocabMap] = useState<Map<string, VocabItem>>(new Map());
  const [stats, setStats] = useState({ known: 0, learning: 0, dueNow: 0 });
  const [showRu, setShowRu] = useState(false);
  const [selected, setSelected] = useState<{ surface: string; entry?: GlossaryEntry; item?: VocabItem; loading?: boolean } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [curPara, setCurPara] = useState(-1);
  const audio = useRef<HTMLAudioElement | null>(null);
  const stopFlag = useRef(false);
  const lookupCache = useRef<Map<string, GlossaryEntry>>(new Map());
  const activeClick = useRef<string | null>(null);

  useEffect(() => { refreshVocab(); }, []);

  const refreshVocab = async () => {
    try {
      const [map, s] = await Promise.all([getVocabMap(), getStats()]);
      setVocabMap(map);
      setStats(s);
    } catch {
      /* тихо — пустая страница словаря не должна блокировать чтение */
    }
  };

  const generate = async (t = topic) => {
    setBusy(true); setLesson(null); setSelected(null); stop();
    try {
      const l = await dutchAi<ReadingLesson>({ action: "reading", level, topic: t });
      setLesson(l);
      await bulkAddIfNew(l.glossary, "reader");
      await refreshVocab();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const paragraphs = useMemo(() => (lesson ? lesson.text.split(/\n{2,}/).filter((p) => p.trim()) : []), [lesson]);

  const wordState = (surface: string): "unseen" | "active" | "known" => {
    const item = vocabMap.get(norm(surface));
    if (!item) return "unseen";
    return item.status === "known" ? "known" : "active";
  };

  const onWordClick = async (surface: string) => {
    const key = norm(surface);
    activeClick.current = key;
    const existing = vocabMap.get(key);
    const glossaryHit = lesson?.glossary.find((g) => norm(g.nl) === key);
    setSelected({ surface, entry: glossaryHit, item: existing, loading: !glossaryHit && !existing });
    speakWord(surface).catch(() => {});

    if (existing) return; // уже в словаре — панель уже показывает всё нужное

    let entry = glossaryHit ?? lookupCache.current.get(key);
    if (!entry) {
      try {
        const res = await dutchAi<{ entries: GlossaryEntry[] }>({ action: "translate", query: surface, direction: "nl-ru" });
        entry = res.entries?.[0] ? { nl: surface, ...res.entries[0] } : { nl: surface };
        lookupCache.current.set(key, entry);
      } catch {
        entry = { nl: surface };
      }
    }
    if (activeClick.current !== key) return; // за это время кликнули по другому слову

    try {
      const saved = await addIfNew(entry, "reader");
      if (saved) setVocabMap((m) => new Map(m).set(key, saved));
      if (activeClick.current === key) setSelected({ surface, entry, item: saved ?? undefined, loading: false });
    } catch {
      if (activeClick.current === key) setSelected({ surface, entry, loading: false });
    }
  };

  const markWordKnown = async (surface: string) => {
    await markKnown(surface);
    await refreshVocab();
    setSelected(null);
  };

  const playAll = async () => {
    if (!paragraphs.length) return;
    stopFlag.current = false;
    setPlaying(true);
    try {
      for (let i = 0; i < paragraphs.length; i++) {
        if (stopFlag.current) break;
        setCurPara(i);
        const url = await speakUrl(paragraphs[i], VOICES.A, 1);
        await new Promise<void>((res) => {
          audio.current?.pause();
          const a = new Audio(url);
          audio.current = a;
          a.onended = () => res();
          a.onerror = () => res();
          a.play().catch(() => res());
        });
      }
    } catch (e) {
      toast.error((e as Error).message);
    }
    setPlaying(false); setCurPara(-1);
  };
  const stop = () => { stopFlag.current = true; audio.current?.pause(); setPlaying(false); setCurPara(-1); };

  return (
    <div className="h-full overflow-y-auto min-h-0 space-y-4 pr-1 pb-24">
      <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span>Известно: <b className="text-foreground">{stats.known}</b></span>
          <span>Учится: <b className="text-foreground">{stats.learning}</b></span>
          <span>На повторение сейчас: <b className="text-foreground">{stats.dueNow}</b></span>
        </div>
        <div className="flex gap-2">
          <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="О чём текст? (или выбери идею ниже)"
            onKeyDown={(e) => e.key === "Enter" && !busy && generate()} />
          <Button onClick={() => generate()} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Сгенерировать текст"}</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {IDEAS.map((i) => (
            <button key={i} disabled={busy} onClick={() => { setTopic(i); generate(i); }}
              className="text-xs rounded-full border border-border px-3 py-1 hover:bg-muted">{i}</button>
          ))}
        </div>
      </div>

      {busy && <p className="text-center text-muted-foreground py-8">ИИ пишет текст под твой уровень… ~15–30 сек</p>}

      {lesson && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-lg font-semibold mr-auto">📖 {lesson.title}</h2>
            {playing
              ? <Button size="sm" onClick={stop} className="gap-1"><Pause className="h-4 w-4" />Стоп</Button>
              : <Button size="sm" onClick={playAll} className="gap-1"><Play className="h-4 w-4" />Слушать текст</Button>}
            <Button size="sm" variant="outline" onClick={() => setShowRu(!showRu)} className="gap-1">
              <Languages className="h-4 w-4" />{showRu ? "Скрыть перевод" : "Перевод"}
            </Button>
          </div>

          <div className="space-y-3 text-lg leading-relaxed">
            {paragraphs.map((p, pi) => (
              <p key={pi} className={`rounded-lg transition px-1 -mx-1 ${curPara === pi ? "bg-primary/10" : ""}`}>
                {tokenize(p).map((tk, ti) =>
                  !tk.isWord ? (
                    <span key={ti}>{tk.text}</span>
                  ) : (
                    <span
                      key={ti}
                      onClick={() => onWordClick(tk.text)}
                      className={`cursor-pointer rounded px-0.5 transition ${
                        wordState(tk.text) === "unseen" ? "bg-sky-500/15 hover:bg-sky-500/30" :
                        wordState(tk.text) === "active" ? "bg-amber-500/15 hover:bg-amber-500/30" :
                        "hover:bg-muted"
                      }`}
                    >
                      {tk.text}
                    </span>
                  )
                )}
              </p>
            ))}
          </div>

          {showRu && <p className="text-sm text-muted-foreground border-t border-border pt-3">{lesson.text_ru}</p>}
        </div>
      )}

      {!lesson && !busy && (
        <div className="text-center text-muted-foreground py-12 space-y-2">
          <p>Текст подбирается под твой уровень ({level}).</p>
          <p className="text-sm">Нажимай на любое слово — услышишь произношение и увидишь перевод, оно само попадёт в повторение.</p>
          <p className="text-xs">🔵 слово не встречалось · 🟡 ещё учится · без подсветки — уже выучено</p>
        </div>
      )}

      {selected && (
        <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-card p-4 shadow-lg">
          <div className="mx-auto max-w-2xl flex items-start gap-3">
            <button onClick={() => speakWord(selected.surface)} className="mt-1 text-muted-foreground hover:text-primary shrink-0">
              <Volume2 className="h-5 w-5" />
            </button>
            <div className="flex-1 min-w-0">
              <p className="font-semibold">
                {selected.entry?.article && <span className="text-sky-400">{selected.entry.article} </span>}
                {selected.surface}
                {selected.entry?.ru && <span className="text-muted-foreground font-normal"> — {selected.entry.ru}</span>}
              </p>
              {selected.entry?.de && <p className="text-xs text-muted-foreground">🇩🇪 {selected.entry.de}</p>}
              {selected.loading && <p className="text-xs text-muted-foreground">ищу перевод…</p>}
              {selected.item && (
                <p className="text-xs text-muted-foreground mt-1">
                  {selected.item.status === "known" ? "уже выучено" : `в повторении · интервал ${Math.round(selected.item.interval_days)} дн.`}
                </p>
              )}
            </div>
            <Button size="sm" variant="outline" onClick={() => markWordKnown(selected.surface)} className="gap-1 shrink-0">
              <Check className="h-4 w-4" />Знаю
            </Button>
            <button onClick={() => setSelected(null)} className="text-muted-foreground hover:text-foreground shrink-0 px-1">✕</button>
          </div>
        </div>
      )}
    </div>
  );
}
