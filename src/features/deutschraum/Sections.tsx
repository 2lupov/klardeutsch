import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { L, Module, Section, isCorrect, normalize, seededShuffle, MODULES } from "./data";
import { DrState, getMedia, setMediaUrl } from "./store";
import { QuestionCard, SayBtn, UI } from "./ui";

type Upd = (fn: (s: DrState) => DrState) => void;
interface P { m: Module; lang: L; state: DrState; update: Upd; isAdmin: boolean }

const setAns = (update: Upd, key: string, v: string) => update((s) => ({ ...s, answers: { ...s.answers, [key]: v } }));

function MediaSlot({ mkey, kind, isAdmin, lang }: { mkey: string; kind: "video" | "audio"; isAdmin: boolean; lang: L }) {
  const [url, setUrl] = useState(() => getMedia()[mkey] || "");
  const [edit, setEdit] = useState(url);
  return (
    <div className="space-y-2">
      {url ? (kind === "video"
        ? <video src={url} controls playsInline className="w-full rounded-2xl bg-muted" />
        : <audio src={url} controls className="w-full" />)
        : kind === "audio" ? <p className="text-sm text-muted-foreground">{UI.noAudio[lang]}</p> : null}
      {isAdmin && (
        <div className="flex gap-2">
          <input value={edit} onChange={(e) => setEdit(e.target.value)} placeholder={UI.media[lang]}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-xs" />
          <button onClick={() => { setMediaUrl(mkey, edit.trim()); setUrl(edit.trim()); }}
            className="px-3 rounded-xl border border-border text-xs">{UI.save[lang]}</button>
        </div>
      )}
    </div>
  );
}

function Theory({ m, lang, isAdmin }: P) {
  return (
    <div className="space-y-4">
      <MediaSlot mkey={`${m.id}-video`} kind="video" isAdmin={isAdmin} lang={lang} />
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <p className="text-xs uppercase tracking-wide text-primary font-semibold mb-2">{m.grammar}</p>
        {m.rule[lang].split("\n").map((p, i) => <p key={i} className="mb-3 leading-relaxed text-foreground">{p}</p>)}
      </div>
    </div>
  );
}

function Vocab({ m, lang, state, update }: P) {
  const [mode, setMode] = useState<"meaning" | "recall" | "order">("meaning");
  const tr = (v: Module["vocab"][number]) => (lang === "de" ? v.definition : v[lang]);
  return (
    <div className="space-y-4">
      <div className="grid sm:grid-cols-2 gap-2">
        {m.vocab.map((v) => (
          <div key={v.de} className="rounded-xl border border-border bg-card/60 p-3">
            <p className="font-semibold flex items-center gap-1">{v.de}<SayBtn text={v.de} /></p>
            <p className="text-sm text-muted-foreground">{tr(v)}</p>
            <p className="text-xs italic text-muted-foreground mt-1">{v.example}</p>
          </div>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        {(["meaning", "recall", "order"] as const).map((k) => (
          <button key={k} onClick={() => setMode(k)} className={cn("px-3 py-1.5 rounded-full text-sm border", mode === k ? "bg-primary text-primary-foreground border-primary" : "border-border")}>{UI[k][lang]}</button>
        ))}
      </div>
      <div className="space-y-3">
        {m.vocab.map((v, i) => {
          const key = `${m.id}-v-${mode}-${i}`;
          if (mode === "meaning") {
            const others = m.vocab.filter((x) => x.de !== v.de);
            const opts = [tr(v), ...seededShuffle(others, m.id * 31 + i).slice(0, 2).map(tr)];
            return <QuestionCard key={key} idx={i} lang={lang} seed={m.id * 7} value={state.answers[key]} onAnswer={(a) => setAns(update, key, a)}
              q={{ prompt: v.de, answer: tr(v), options: opts, explanation: { ru: v.example, uk: v.example, de: v.example } }} />;
          }
          if (mode === "recall") {
            return <QuestionCard key={key} idx={i} lang={lang} value={state.answers[key]} onAnswer={(a) => setAns(update, key, a)}
              q={{ prompt: tr(v), answer: v.de, options: null, explanation: { ru: v.example, uk: v.example, de: v.example } }} />;
          }
          return <OrderTask key={key} idx={i} sentence={v.example} seed={m.id * 100 + i} lang={lang}
            value={state.answers[key]} onDone={(a) => setAns(update, key, a)} />;
        })}
      </div>
    </div>
  );
}

function OrderTask({ sentence, seed, idx, lang, value, onDone }: { sentence: string; seed: number; idx: number; lang: L; value?: string; onDone: (v: string) => void }) {
  const words = useMemo(() => sentence.split(" "), [sentence]);
  const shuffled = useMemo(() => seededShuffle(words.map((w, i) => ({ w, i })), seed), [words, seed]);
  const [picked, setPicked] = useState<number[]>([]);
  const built = picked.map((i) => words[i]).join(" ");
  const finished = value != null;
  const ok = finished && normalize(value!) === normalize(sentence);
  return (
    <div className="rounded-2xl border border-border bg-card/60 p-4 space-y-3">
      <p className="text-sm text-muted-foreground">{idx + 1}. {UI.order[lang]}</p>
      <div className="min-h-[44px] rounded-xl border border-dashed border-border p-2 text-foreground">{finished ? value : built}</div>
      {!finished && (
        <div className="flex flex-wrap gap-2">
          {shuffled.map(({ w, i }) => (
            <button key={i} disabled={picked.includes(i)} onClick={() => {
              const next = [...picked, i]; setPicked(next);
              if (next.length === words.length) onDone(next.map((k) => words[k]).join(" "));
            }} className="px-3 py-1.5 rounded-lg border border-border text-sm disabled:opacity-30">{w}</button>
          ))}
          {picked.length > 0 && <button onClick={() => setPicked([])} className="px-3 py-1.5 text-sm text-muted-foreground">{UI.reset[lang]}</button>}
        </div>
      )}
      {finished && <p className={cn("text-sm", ok ? "text-primary" : "text-destructive")}>{ok ? "✓" : `→ ${sentence}`}</p>}
    </div>
  );
}

function Questions({ m, lang, state, update, list, prefix }: P & { list: Module["practice"]; prefix: string }) {
  return <div className="space-y-3">{list.map((q, i) => {
    const key = `${m.id}-${prefix}-${i}`;
    return <QuestionCard key={key} q={q} idx={i} lang={lang} seed={m.id} value={state.answers[key]} onAnswer={(a) => setAns(update, key, a)} />;
  })}</div>;
}

function Reading(p: P) {
  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card/60 p-5 leading-relaxed whitespace-pre-line">{p.m.reading.text}</div>
      <Questions {...p} list={p.m.reading.questions} prefix="r" />
    </div>
  );
}

function Listening(p: P) {
  const [show, setShow] = useState(false);
  return (
    <div className="space-y-4">
      <MediaSlot mkey={`${p.m.id}-audio`} kind="audio" isAdmin={p.isAdmin} lang={p.lang} />
      <button onClick={() => setShow(!show)} className="text-sm text-primary underline">{UI.showScript[p.lang]}</button>
      {show && <div className="rounded-2xl border border-border bg-card/60 p-5 leading-relaxed">{p.m.listening.text}</div>}
      <Questions {...p} list={p.m.listening.questions} prefix="l" />
    </div>
  );
}

function Writing({ m, lang, state, update }: P) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  return (
    <div className="space-y-5">
      {m.writing.map((w, i) => {
        const key = `${m.id}-w-${i}`;
        const text = state.drafts[key] ?? "";
        const count = text.trim() ? text.trim().split(/\s+/).length : 0;
        return (
          <div key={i} className="rounded-2xl border border-border bg-card/60 p-4 space-y-3">
            <p className="font-medium">{w.prompt.de}</p>
            {lang !== "de" && <p className="text-sm text-muted-foreground">{w.prompt[lang]}</p>}
            <label className="text-xs text-muted-foreground">{UI.draft[lang]}</label>
            <textarea value={text} rows={6} onChange={(e) => update((s) => ({ ...s, drafts: { ...s.drafts, [key]: e.target.value } }))}
              className="w-full rounded-xl border border-border bg-background p-3 text-sm" />
            <p className="text-xs text-muted-foreground">{count} {UI.words[lang]}</p>
            <button onClick={() => setOpen({ ...open, [i]: !open[i] })} className="text-sm text-primary underline">{UI.model[lang]}</button>
            {open[i] && <p className="rounded-xl bg-primary/10 p-3 text-sm leading-relaxed">{w.model}</p>}
          </div>
        );
      })}
    </div>
  );
}

function Speaking({ m, lang }: P) {
  return (
    <div className="space-y-3">
      {m.speaking.map((s, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card/60 p-4">
          <p className="font-medium flex items-start gap-1"><span className="text-primary mr-1">{i + 1}.</span>{s.de}<SayBtn text={s.de} /></p>
          {lang !== "de" && <p className="text-sm text-muted-foreground mt-1">{s[lang]}</p>}
        </div>
      ))}
    </div>
  );
}

export function SectionView(p: P & { section: Section }) {
  switch (p.section) {
    case "theory": return <Theory {...p} />;
    case "vocab": return <Vocab {...p} />;
    case "grammar": return <Questions {...p} list={p.m.practice} prefix="g" />;
    case "reading": return <Reading {...p} />;
    case "listening": return <Listening {...p} />;
    case "writing": return <Writing {...p} />;
    case "speaking": return <Speaking {...p} />;
  }
}

export const allVocab = () => MODULES.flatMap((m) => m.vocab.map((v) => ({ ...v, module: m.id })));
export { isCorrect };
