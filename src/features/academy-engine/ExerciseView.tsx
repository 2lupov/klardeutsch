import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, X, Mic, Square, RotateCcw } from "lucide-react";
import { isAccepted, sameSet } from "./answers";
import { pick, RUBRIC_CRITERIA, type Exercise, type Lang, type QuestionItem, type Rubric } from "./types";

const L = {
  uk: {
    check: "Перевірити", correct: "Правильно", wrong: "Ще раз", accepted: "Допустимо:", reset: "Скинути",
    rec: "Записати", stop: "Зупинити", again: "Записати ще раз", self: "Оцініть свою відповідь за рубрикою",
    support: "Я користувався(-лася) опорою (шаблон, словник, підказка)", save: "Зберегти в паспорт", saved: "Збережено в паспорт",
    sample: "Зразок виконання", micErr: "Немає доступу до мікрофона",
    crit: { task: "Виконання задачі", coherence: "Зв'язність", vocabulary: "Словник", grammar: "Граматика", pronunciation: "Вимова" },
    lvl: ["Не виконано", "Недостатньо", "Достатньо", "Добре"],
  },
  ru: {
    check: "Проверить", correct: "Правильно", wrong: "Ещё раз", accepted: "Допустимо:", reset: "Сбросить",
    rec: "Записать", stop: "Остановить", again: "Записать ещё раз", self: "Оцените свой ответ по рубрике",
    support: "Я пользовался(-лась) опорой (шаблон, словарь, подсказка)", save: "Сохранить в паспорт", saved: "Сохранено в паспорт",
    sample: "Образец выполнения", micErr: "Нет доступа к микрофону",
    crit: { task: "Выполнение задачи", coherence: "Связность", vocabulary: "Словарь", grammar: "Грамматика", pronunciation: "Произношение" },
    lvl: ["Не выполнено", "Недостаточно", "Достаточно", "Хорошо"],
  },
};

export interface VoiceResult { rubric: Rubric; withSupport: boolean }

interface Props { ex: Exercise; lang: Lang; onDone?: (ok: boolean) => void; onVoiceSubmit?: (r: VoiceResult) => Promise<void> }

const Feedback = ({ ok, lang }: { ok: boolean | null; lang: Lang }) =>
  ok === null ? null : (
    <div className={`mt-3 flex items-center gap-2 text-sm font-medium ${ok ? "text-primary" : "text-destructive"}`}>
      {ok ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />} {ok ? L[lang].correct : L[lang].wrong}
    </div>
  );

const Media = ({ ex }: { ex: Exercise }) => (
  <>
    {ex.audioUrl && <audio controls src={ex.audioUrl} className="mb-3 w-full" />}
    {ex.videoUrl && <video controls src={ex.videoUrl} className="mb-3 w-full rounded-lg" />}
  </>
);

function Choice({ q, sel, setSel }: { q: QuestionItem; sel: number[]; setSel: (v: number[]) => void }) {
  const multi = q.correct.length > 1;
  return (
    <div className="space-y-2">
      <p className="font-medium text-foreground">{q.question}</p>
      {q.options.map((o, i) => {
        const on = sel.includes(i);
        return (
          <button key={i} type="button"
            onClick={() => setSel(multi ? (on ? sel.filter((x) => x !== i) : [...sel, i]) : [i])}
            className={`block w-full rounded-lg border px-3 py-2 text-left text-sm transition ${on ? "border-primary bg-primary/10 text-foreground" : "border-border bg-card text-muted-foreground hover:border-primary/50"}`}>
            {o}
          </button>
        );
      })}
    </div>
  );
}

function VoiceAnswer({ ex, lang, onVoiceSubmit }: { ex: Extract<Exercise, { type: "VoiceAnswer" }>; lang: Lang; onVoiceSubmit?: Props["onVoiceSubmit"] }) {
  const t = L[lang];
  const [rec, setRec] = useState<MediaRecorder | null>(null);
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState("");
  const [rubric, setRubric] = useState<Partial<Rubric>>({});
  const [support, setSupport] = useState(true);
  const [saved, setSaved] = useState(false);
  const chunks = useRef<Blob[]>([]);
  useEffect(() => () => { if (url) URL.revokeObjectURL(url); }, [url]);

  const start = async () => {
    setErr("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      chunks.current = [];
      r.ondataavailable = (e) => chunks.current.push(e.data);
      r.onstop = () => {
        stream.getTracks().forEach((tr) => tr.stop());
        setUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(new Blob(chunks.current, { type: r.mimeType })); });
      };
      r.start(); setRec(r);
    } catch { setErr(t.micErr); }
  };
  const stop = () => { rec?.stop(); setRec(null); };
  const complete = RUBRIC_CRITERIA.every((c) => typeof rubric[c] === "number");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {rec ? <Button onClick={stop} variant="destructive"><Square className="mr-2 h-4 w-4" />{t.stop}</Button>
          : <Button onClick={start}>{url ? <RotateCcw className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}{url ? t.again : t.rec}</Button>}
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      {url && <audio controls src={url} className="w-full" />}
      {url && (
        <div className="space-y-3 rounded-xl border border-border bg-card/60 p-3">
          {ex.sampleText && (
            <details className="text-sm text-muted-foreground"><summary className="cursor-pointer">{t.sample}</summary><p className="mt-2">{pick(ex.sampleText, lang)}</p></details>
          )}
          <p className="text-sm font-medium text-foreground">{t.self}</p>
          {RUBRIC_CRITERIA.map((c) => (
            <div key={c} className="space-y-1">
              <p className="text-xs text-muted-foreground">{t.crit[c]}</p>
              <div className="grid grid-cols-2 gap-1 sm:grid-cols-4">
                {t.lvl.map((lv, i) => (
                  <button key={i} type="button" onClick={() => setRubric({ ...rubric, [c]: i })}
                    className={`rounded-md border px-2 py-1 text-xs ${rubric[c] === i ? "border-primary bg-primary/15 text-foreground" : "border-border text-muted-foreground"}`}>{lv}</button>
                ))}
              </div>
            </div>
          ))}
          <label className="flex items-start gap-2 text-sm text-foreground">
            <input type="checkbox" checked={support} onChange={(e) => setSupport(e.target.checked)} className="mt-1" />{t.support}
          </label>
          <Button disabled={!complete || saved} onClick={async () => { await onVoiceSubmit?.({ rubric: rubric as Rubric, withSupport: support }); setSaved(true); }}>
            {saved ? t.saved : t.save}
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ExerciseView({ ex, lang, onDone, onVoiceSubmit }: Props) {
  const t = L[lang];
  const [ok, setOk] = useState<boolean | null>(null);
  const [gaps, setGaps] = useState<Record<string, string>>({});
  const [text, setText] = useState("");
  const [sel, setSel] = useState<number[]>([]);
  const [qSel, setQSel] = useState<number[][]>([]);
  const [built, setBuilt] = useState<number[]>([]);
  const [pairSel, setPairSel] = useState<Record<number, string>>({});

  const shuffledRights = useMemo(
    () => (ex.type === "Zuordnung" ? [...ex.pairs.map((p) => p.right)].sort((a, b) => a.localeCompare(b)) : []), [ex]);

  const finish = (v: boolean) => { setOk(v); onDone?.(v); };

  const check = () => {
    switch (ex.type) {
      case "Lueckentext": return finish(Object.entries(ex.gaps).every(([k, v]) => isAccepted(gaps[k] ?? "", v)));
      case "Zuordnung": return finish(ex.pairs.every((p, i) => pairSel[i] === p.right));
      case "MultipleChoice": return finish(sameSet(sel, ex.correct));
      case "Satzbau": return finish(isAccepted(built.map((i) => ex.words[i]).join(" "), ex.validAnswers));
      case "Fehlerkorrektur":
      case "Diktat": return finish(isAccepted(text, ex.validAnswers));
      case "Hoerverstehen":
      case "Leseverstehen": return finish(ex.questions.every((q, i) => sameSet(qSel[i] ?? [], q.correct)));
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card/40 p-4">
      <p className="mb-3 text-sm text-muted-foreground">{pick(ex.prompt, lang)}</p>
      <Media ex={ex} />

      {ex.type === "Lueckentext" && (
        <p className="leading-loose text-foreground">
          {ex.text.split(/(\{\{\d+\}\})/).map((part, i) => {
            const m = part.match(/\{\{(\d+)\}\}/);
            return m ? (
              <input key={i} value={gaps[m[1]] ?? ""} onChange={(e) => setGaps({ ...gaps, [m[1]]: e.target.value })}
                className="mx-1 w-28 rounded-md border border-border bg-background px-2 py-0.5 text-foreground" />
            ) : <span key={i}>{part}</span>;
          })}
        </p>
      )}

      {ex.type === "Zuordnung" && (
        <div className="space-y-2">
          {ex.pairs.map((p, i) => (
            <div key={i} className="flex flex-col gap-1 sm:flex-row sm:items-center">
              <span className="min-w-0 flex-1 text-foreground">{p.left}</span>
              <select value={pairSel[i] ?? ""} onChange={(e) => setPairSel({ ...pairSel, [i]: e.target.value })}
                className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-foreground">
                <option value="">—</option>
                {shuffledRights.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          ))}
        </div>
      )}

      {ex.type === "MultipleChoice" && <Choice q={ex} sel={sel} setSel={setSel} />}

      {ex.type === "Satzbau" && (
        <div className="space-y-3">
          <div className="min-h-[44px] rounded-lg border border-dashed border-border p-2 text-foreground">
            {built.map((i, k) => (
              <button key={k} type="button" onClick={() => setBuilt(built.filter((_, j) => j !== k))}
                className="m-1 rounded-md bg-primary/15 px-2 py-1 text-sm">{ex.words[i]}</button>
            ))}
          </div>
          <div>
            {ex.words.map((w, i) => !built.includes(i) && (
              <button key={i} type="button" onClick={() => setBuilt([...built, i])}
                className="m-1 rounded-md border border-border px-2 py-1 text-sm text-foreground">{w}</button>
            ))}
          </div>
        </div>
      )}

      {ex.type === "Fehlerkorrektur" && <p className="mb-2 font-medium text-foreground">{ex.sentence}</p>}
      {(ex.type === "Fehlerkorrektur" || ex.type === "Diktat") && (
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={2}
          className="w-full rounded-md border border-border bg-background p-2 text-foreground" />
      )}

      {ex.type === "Leseverstehen" && <p className="mb-3 whitespace-pre-line rounded-lg bg-muted/40 p-3 text-foreground">{ex.text}</p>}
      {(ex.type === "Hoerverstehen" || ex.type === "Leseverstehen") && (
        <div className="space-y-4">
          {ex.questions.map((q, i) => (
            <Choice key={i} q={q} sel={qSel[i] ?? []} setSel={(v) => { const n = [...qSel]; n[i] = v; setQSel(n); }} />
          ))}
          {ex.type === "Hoerverstehen" && ok !== null && ex.transcript && (
            <p className="rounded-lg bg-muted/40 p-3 text-sm text-muted-foreground">{ex.transcript}</p>
          )}
        </div>
      )}

      {ex.type === "VoiceAnswer" ? <VoiceAnswer ex={ex} lang={lang} onVoiceSubmit={onVoiceSubmit} /> : (
        <div className="mt-4 flex gap-2">
          <Button onClick={check}>{t.check}</Button>
          {ex.type === "Satzbau" && <Button variant="outline" onClick={() => { setBuilt([]); setOk(null); }}>{t.reset}</Button>}
        </div>
      )}
      <Feedback ok={ok} lang={lang} />
    </div>
  );
}
