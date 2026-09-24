import { useEffect, useState } from "react";
import { Check, RotateCcw, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ARTIKEL_CLASS, isCorrectText, type Artikel, type LessonBlock } from "./types";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  block: LessonBlock;
  value: Record<number, string>;
  onChange: (value: Record<number, string>) => void;
  checked: boolean;
  readOnly?: boolean;
}

const articles: Artikel[] = ["der", "die", "das", "plural"];

function Emphasis({ text }: { text: string }) {
  return <>{text.split(/(\*\*[^*]+\*\*)/g).map((part, i) => part.startsWith("**") && part.endsWith("**") ? <strong key={i} className="font-semibold text-foreground">{part.slice(2, -2)}</strong> : <span key={i}>{part}</span>)}</>;
}

export default function EditorialBlock({ block, value, onChange, checked, readOnly }: Props) {
  const p = block.payload;
  const [reveal, setReveal] = useState(false);
  const [localCheck, setLocalCheck] = useState(false);
  const [imageUrl, setImageUrl] = useState("");
  useEffect(() => {
    const path = p.image_path ?? "";
    if (!path.startsWith("kits/")) { setImageUrl(path); return; }
    let mounted = true;
    supabase.storage.from("tutoring-materials").createSignedUrl(path, 3600).then(({ data }) => {
      if (mounted) setImageUrl(data?.signedUrl ?? "");
    });
    return () => { mounted = false; };
  }, [p.image_path]);
  const tested = checked || localCheck;
  const set = (i: number, text: string) => { onChange({ ...value, [i]: text }); setLocalCheck(false); setReveal(false); };

  if (block.type === "topic") return (
    <div className="space-y-3 border-b border-primary/30 pb-7">
      {p.chapter && <p className="font-display text-sm font-bold uppercase text-primary">{p.chapter}</p>}
      <h2 className="font-display text-3xl font-semibold leading-tight text-foreground sm:text-4xl">{block.title}</h2>
      {p.subtitle && <p className="text-lg text-muted-foreground">{p.subtitle}</p>}
      {p.intro && <p className="max-w-prose text-base leading-8 text-foreground">{p.intro}</p>}
    </div>
  );

  if (block.type === "callout") return (
    <aside className={`border-l-4 px-5 py-4 ${p.tone === "warning" ? "border-destructive bg-destructive/5" : p.tone === "example" ? "border-success bg-success/5" : "border-primary bg-primary/5"}`}>
      <h3 className="font-display text-sm font-bold text-foreground">{block.title || "Merke!"}</h3>
      <p className="mt-2 whitespace-pre-line text-sm leading-7 text-foreground"><Emphasis text={p.markdown ?? ""} /></p>
    </aside>
  );

  if (block.type === "table") return (
    <div>
      {block.title && <h3 className="mb-3 font-display text-lg font-semibold text-foreground">{block.title}</h3>}
      {p.instructions && <p className="mb-3 text-sm text-muted-foreground">{p.instructions}</p>}
      <div className="overflow-x-auto border-y border-border">
        <table className="w-full min-w-[480px] border-collapse text-left text-sm">
          <thead className="bg-primary/10 text-foreground"><tr>{(p.columns ?? []).map((col, i) => <th key={i} className="border-b border-primary/30 px-3 py-3 font-semibold">{col}</th>)}</tr></thead>
          <tbody>{(p.rows ?? []).map((row, i) => <tr key={i} className="even:bg-muted/40">{(p.columns ?? []).map((_, j) => <td key={j} className="border-b border-border/60 px-3 py-3 align-top leading-relaxed"><Emphasis text={row[j] ?? ""} /></td>)}</tr>)}</tbody>
        </table>
      </div>
      {p.caption && <p className="mt-2 text-xs text-muted-foreground">{p.caption}</p>}
    </div>
  );

  if (block.type === "image") return (
    <figure className="space-y-2">
      {imageUrl ? <img src={imageUrl} alt={p.caption || block.title || "Ілюстрація уроку"} className="max-h-[560px] w-full object-contain" /> : <div className="flex aspect-video items-center justify-center border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">Ілюстрацію не додано або немає доступу</div>}
      {(p.caption || p.context) && <figcaption className="text-sm leading-6 text-muted-foreground">{p.caption}{p.context && <span className="block">{p.context}</span>}</figcaption>}
    </figure>
  );

  if (block.type === "artikel") return (
    <div className="space-y-4">
      {p.instructions && <p className="text-sm text-muted-foreground">{p.instructions}</p>}
      {(p.article_items ?? []).map((item, i) => <div key={i} className="flex flex-wrap items-center gap-3 border-b border-border pb-3 last:border-0">
        <span className="w-6 text-xs text-muted-foreground">{i + 1}.</span>
        <div className="flex flex-wrap gap-1.5">{articles.map((a) => <Button key={a} type="button" size="sm" variant="outline" disabled={readOnly} onClick={() => set(i, a)} className={`min-w-12 ${value?.[i] === a ? ARTIKEL_CLASS[a] : ""}`}>{a === "plural" ? "die Pl." : a}</Button>)}</div>
        <strong className="text-base text-foreground">{item.word}</strong>
        {tested && value?.[i] && <span className={`text-sm font-semibold ${value[i] === item.article ? "text-success" : "text-destructive"}`}>{value[i] === item.article ? "Richtig!" : "Noch einmal"}</span>}
        {reveal && <span className="text-sm text-muted-foreground">{item.article === "plural" ? "die Pl." : item.article} {item.word}</span>}
        {item.hint && <span className="w-full pl-9 text-xs text-muted-foreground">{item.hint}</span>}
      </div>)}
      <ExerciseActions check={() => setLocalCheck(true)} reset={() => { onChange({}); setLocalCheck(false); setReveal(false); }} reveal={() => setReveal(true)} readOnly={readOnly} />
    </div>
  );

  if (block.type === "transformation") return (
    <div className="space-y-5">
      {p.instructions && <p className="text-sm text-muted-foreground">{p.instructions}</p>}
      {p.example?.source && <div className="border-l-2 border-primary bg-primary/5 px-4 py-3 text-sm leading-7"><span className="font-semibold">Beispiel: </span>{p.example.source}<span className="mx-2 text-muted-foreground">→</span>{p.example.answer}</div>}
      {(p.transformations ?? []).map((item, i) => <div key={i} className="space-y-2 border-b border-border pb-5 last:border-0">
        <p className="text-sm font-medium text-foreground">{i + 1}. {item.source}</p>
        <Input aria-label={`Відповідь ${i + 1}`} value={value?.[i] ?? ""} onChange={(e) => set(i, e.target.value)} disabled={readOnly} placeholder="Schreiben Sie den Satz …" className="h-auto min-h-11 border-x-0 border-t-0 rounded-none bg-transparent px-1 text-base" />
        {tested && value?.[i] && <p className={`text-xs font-semibold ${isCorrectText(value[i], item.answer) ? "text-success" : "text-destructive"}`}>{isCorrectText(value[i], item.answer) ? "Richtig!" : "Versuchen Sie es noch einmal."}</p>}
        {reveal && <p className="text-sm text-success">{item.answer}</p>}
        {item.hint && <p className="text-xs text-muted-foreground">{item.hint}</p>}
      </div>)}
      <ExerciseActions check={() => setLocalCheck(true)} reset={() => { onChange({}); setLocalCheck(false); setReveal(false); }} reveal={() => setReveal(true)} readOnly={readOnly} />
    </div>
  );

  return null;
}

function ExerciseActions({ check, reset, reveal, readOnly }: { check: () => void; reset: () => void; reveal: () => void; readOnly?: boolean }) {
  if (readOnly) return null;
  return <div className="flex flex-wrap gap-2 pt-1">
    <Button type="button" size="sm" onClick={check}><Check className="mr-1.5 h-4 w-4" />Prüfen</Button>
    <Button type="button" size="sm" variant="outline" onClick={reveal}><Eye className="mr-1.5 h-4 w-4" />Lösung anzeigen</Button>
    <Button type="button" size="sm" variant="ghost" onClick={reset}><RotateCcw className="mr-1.5 h-4 w-4" />Zurücksetzen</Button>
  </div>;
}