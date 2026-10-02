import { useEffect, useMemo, useState } from "react";
import { Loader2, Volume2, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { dutchAi, speakWord } from "@/lib/dutch";
import { GRAMMAR } from "@/lib/dutch";
import { BRIDGE, FALSE } from "./GrammarBridge";
import { byId, nextOf, type CurriculumModule } from "@/lib/curriculum";
import { getOrCreateContent, passModule, recordAttempt, type ModuleContent } from "@/lib/moduleStore";
import { addIfNew, bulkAddIfNew, type VocabItem } from "@/lib/vocabStore";
import { getVocabMap } from "@/lib/vocabStore";
import { toast } from "sonner";

// Та же токенизация, что в Reader.tsx — здесь не выношу в общий модуль,
// чтобы не трогать уже работающий Reader лишний раз; см. README про этот
// осознанный дубль.
function tokenize(text: string): { text: string; isWord: boolean }[] {
  const Seg = (Intl as any).Segmenter;
  if (Seg) {
    const seg = new Seg("nl", { granularity: "word" });
    return [...seg.segment(text)].map((s: any) => ({ text: s.segment, isWord: s.isWordLike }));
  }
  return text.split(/(\s+|[.,!?;:()"„""…\-])/).filter((t) => t.length).map((t) => ({ text: t, isWord: /\p{L}/u.test(t) }));
}
const norm = (s: string) => s.trim().toLowerCase();

type Step = "learn" | "grammar" | "test" | "result";

export default function Module({ moduleId, onExit }: { moduleId: string; onExit: () => void }) {
  const mod = byId(moduleId);
  const [step, setStep] = useState<Step>("learn");
  const [busy, setBusy] = useState(true);
  const [content, setContent] = useState<ModuleContent | null>(null);
  const [vocabMap, setVocabMap] = useState<Map<string, VocabItem>>(new Map());
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [checked, setChecked] = useState(false);
  const [score, setScore] = useState(0);

  useEffect(() => { if (mod) load(); }, [moduleId]);

  const load = async () => {
    setBusy(true); setStep("learn"); setAnswers({}); setChecked(false);
    try {
      const c = await getOrCreateContent(mod!, () => generate(mod!));
      setContent(c);
      await bulkAddIfNew(c.glossary, "module");
      setVocabMap(await getVocabMap());
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const generate = async (m: CurriculumModule): Promise<ModuleContent> => {
    const needsAiGrammar = !m.grammarKey && !m.grammarSpecial;
    return dutchAi<ModuleContent>({
      action: "module",
      level: m.level,
      topic: m.topic,
      wordTarget: m.wordTarget,
      grammarPrompt: needsAiGrammar ? m.grammarPrompt : undefined,
    });
  };

  const paragraphs = useMemo(() => (content ? content.text.split(/\n{2,}/).filter((p) => p.trim()) : []), [content]);
  const wordKnown = (surface: string) => vocabMap.get(norm(surface))?.status === "known";

  const onWordClick = async (surface: string) => {
    speakWord(surface).catch(() => {});
    const key = norm(surface);
    if (vocabMap.has(key)) return;
    const hit = content?.glossary.find((g) => norm(g.nl) === key);
    const saved = await addIfNew(hit ?? { nl: surface }, "module").catch(() => null);
    if (saved) setVocabMap((m) => new Map(m).set(key, saved));
  };

  const grammarBlock = (() => {
    if (!mod || mod.grammarSpecial) return null; // "sounds" рендерится отдельной веткой ниже
    if (mod.grammarKey) {
      const g = GRAMMAR.find((x) => x.title === mod.grammarKey);
      return g ? { rule: g.rule, items: g.items } : null;
    }
    return content?.grammar ?? null;
  })();

  const submitTest = async () => {
    if (!content || !mod) return;
    const correct = content.quiz.filter((q, i) => answers[i] === q.answer).length;
    const s = content.quiz.length ? correct / content.quiz.length : 0;
    setScore(s); setChecked(true);
    const threshold = mod.isReview ? 0.8 : 0.7;
    try {
      if (s >= threshold) await passModule(mod.id, s);
      else await recordAttempt(mod.id, s);
    } catch (e) { toast.error((e as Error).message); }
    setStep("result");
  };

  if (!mod) return <div className="p-6 text-muted-foreground">Модуль не найден.</div>;

  if (busy) {
    return <div className="h-full flex items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Готовлю модуль «{mod.title}»…</div>;
  }
  if (!content) return null;

  const threshold = mod.isReview ? 0.8 : 0.7;
  const passed = score >= threshold;
  const next = nextOf(mod.order);

  return (
    <div className="h-full overflow-y-auto min-h-0 space-y-4 pr-1 pb-6">
      <div className="flex items-center gap-2">
        <button onClick={onExit} className="text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></button>
        <div>
          <p className="text-xs text-muted-foreground">{mod.level} · модуль {mod.order}</p>
          <h2 className="text-lg font-semibold">{mod.title}</h2>
        </div>
        <div className="ml-auto flex gap-1">
          {(["learn", "grammar", "test"] as Step[]).map((s, i) => (
            <button key={s} onClick={() => setStep(s)}
              className={`rounded-full px-3 py-1 text-xs ${step === s || (step === "result" && s === "test") ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground"}`}>
              {i + 1}. {s === "learn" ? "Учить" : s === "grammar" ? "Грамматика" : "Тест"}
            </button>
          ))}
        </div>
      </div>

      {step === "learn" && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <h3 className="font-semibold">{content.title}</h3>
          <div className="space-y-3 text-lg leading-relaxed">
            {paragraphs.map((p, pi) => (
              <p key={pi}>
                {tokenize(p).map((tk, ti) => !tk.isWord ? <span key={ti}>{tk.text}</span> : (
                  <span key={ti} onClick={() => onWordClick(tk.text)}
                    className={`cursor-pointer rounded px-0.5 transition ${wordKnown(tk.text) ? "hover:bg-muted" : "bg-amber-500/15 hover:bg-amber-500/30"}`}>
                    {tk.text}
                  </span>
                ))}
              </p>
            ))}
          </div>
          <details className="text-sm text-muted-foreground">
            <summary className="cursor-pointer">Показать перевод</summary>
            <p className="mt-2">{content.text_ru}</p>
          </details>
          <Button size="sm" onClick={() => setStep("grammar")} className="gap-1">Дальше: грамматика <ArrowRight className="h-4 w-4" /></Button>
        </div>
      )}

      {step === "grammar" && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          {mod.grammarSpecial === "sounds" ? (
            <div className="space-y-6">
              <div><h3 className="font-semibold mb-2">Звуковые переходы DE → NL</h3>
                {BRIDGE.map(([a, b]) => <p key={a} className="py-1"><b className="text-primary">{a}</b> — {b}</p>)}</div>
              <div><h3 className="font-semibold mb-2">Ложные друзья</h3>
                <div className="grid sm:grid-cols-2 gap-2">{FALSE.map(([a, b]) => <p key={a} className="rounded-lg bg-muted/40 px-3 py-2"><b>{a}</b> — {b}</p>)}</div></div>
            </div>
          ) : grammarBlock ? (
            <>
              <p className="rounded-xl bg-muted/40 p-3 text-sm">{grammarBlock.rule}</p>
              {grammarBlock.items.map((it, i) => <GrammarItem key={i} it={it} />)}
            </>
          ) : (
            <p className="text-muted-foreground text-sm">Для этого модуля грамматика не задана.</p>
          )}
          <Button size="sm" onClick={() => setStep("test")} className="gap-1">Дальше: тест <ArrowRight className="h-4 w-4" /></Button>
        </div>
      )}

      {step === "test" && (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
          <p className="text-sm text-muted-foreground">Нужно {Math.round(threshold * 100)}%, чтобы открыть следующий модуль.</p>
          {content.quiz.map((q, i) => (
            <div key={i}>
              <p className="text-sm mb-1">{i + 1}. {q.q_ru}</p>
              <div className="flex flex-wrap gap-2">
                {q.options.map((o, j) => {
                  const sel = answers[i] === j;
                  return <button key={j} onClick={() => !checked && setAnswers({ ...answers, [i]: j })}
                    className={`text-sm rounded-lg border border-border px-3 py-1.5 ${sel ? "border-primary bg-primary/15" : ""}`}>{o}</button>;
                })}
              </div>
            </div>
          ))}
          <Button onClick={submitTest} disabled={Object.keys(answers).length < content.quiz.length}>Проверить</Button>
        </div>
      )}

      {step === "result" && (
        <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
          <p className="text-2xl font-bold">{Math.round(score * 100)}%</p>
          {passed ? (
            <>
              <p className="text-emerald-400 flex items-center justify-center gap-1"><Check className="h-5 w-5" />Модуль пройден</p>
              {next ? <Button onClick={onExit} className="gap-1">К следующему модулю <ArrowRight className="h-4 w-4" /></Button>
                : <p className="text-muted-foreground">Это был последний модуль программы 🎉</p>}
            </>
          ) : (
            <>
              <p className="text-muted-foreground">Нужно {Math.round(threshold * 100)}%. Пересмотри текст и грамматику и попробуй тест ещё раз.</p>
              <div className="flex justify-center gap-2">
                <Button variant="outline" onClick={() => setStep("grammar")}>К грамматике</Button>
                <Button onClick={() => { setAnswers({}); setChecked(false); setStep("test"); }}>Пройти тест заново</Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function GrammarItem({ it }: { it: { q: string; options: string[]; answer: number; why: string } }) {
  const [sel, setSel] = useState<number | undefined>(undefined);
  return (
    <div>
      <p className="mb-1">{it.q}</p>
      <div className="flex flex-wrap gap-2">
        {it.options.map((o, j) => {
          const cls = sel === undefined ? "" : j === it.answer ? "border-emerald-500 bg-emerald-500/15" : sel === j ? "border-destructive bg-destructive/15" : "";
          return <button key={j} onClick={() => setSel(j)} className={`rounded-lg border border-border px-3 py-1.5 text-sm ${cls}`}>{o}</button>;
        })}
      </div>
      {sel !== undefined && <p className="text-xs text-muted-foreground mt-1">{it.why}</p>}
    </div>
  );
}
