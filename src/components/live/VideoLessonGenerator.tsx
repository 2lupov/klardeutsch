import { useEffect, useMemo, useRef, useState } from "react";
import { FunctionsHttpError } from "@supabase/supabase-js";
import { BookOpenCheck, Loader2, Sparkles, Square, WandSparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database, Json } from "@/integrations/supabase/types";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import LessonReader from "@/components/blocks/LessonReader";
import { normalizeKit, kitSections, type LessonKit } from "@/lib/lesson-kits";
import { toast } from "@/hooks/use-toast";

type Mode = "lesson" | "exercises" | "summary";
type Draft = Omit<LessonKit, "id" | "owner_id" | "created_at" | "last_assigned_at" | "presentation_id"> & { sections: any[]; blocks: any[] };
const OPTIONS: Array<{ id: Mode; label: string }> = [
  { id: "lesson", label: "Повний урок" },
  { id: "exercises", label: "Інтерактивні вправи" },
  { id: "summary", label: "Конспект і словник" },
];

async function errorMessage(error: unknown) {
  if (error instanceof FunctionsHttpError) {
    try { const payload = await error.context.json(); return payload?.error || error.message; } catch { return error.message; }
  }
  return error instanceof Error ? error.message : "Невідома помилка";
}

export default function VideoLessonGenerator({ classId, videoUrl, onUseLesson }: { classId: string; videoUrl: string; onUseLesson: (kit: LessonKit) => Promise<void> | void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [level, setLevel] = useState("A2");
  const [modes, setModes] = useState<Mode[]>(["lesson", "exercises", "summary"]);
  const [transcript, setTranscript] = useState("");
  const [instructions, setInstructions] = useState("");
  const [status, setStatus] = useState<"idle" | "captions" | "generating" | "ready" | "saving">("idle");
  const [captionSource, setCaptionSource] = useState<"youtube" | "manual" | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [enabled, setEnabled] = useState<string[]>([]);
  const abortRef = useRef<AbortController | null>(null);

  const preview = useMemo(() => draft ? {
    ...draft,
    sections: draft.sections.map((section) => ({ ...section, blocks: section.blocks.filter((block: any, index: number) => enabled.includes(`${section.id}:${index}`)) })).filter((section) => section.blocks.length),
  } : null, [draft, enabled]);

  const loadCaptions = async () => {
    if (!videoUrl) return;
    setStatus("captions");
    const { data, error } = await supabase.functions.invoke("video-to-lesson", { body: { action: "transcript", class_id: classId, video_url: videoUrl } });
    if (!error && data?.transcript) { setTranscript(data.transcript); setCaptionSource("youtube"); }
    else setCaptionSource("manual");
    setStatus("idle");
  };

  useEffect(() => { if (open && !transcript && !captionSource) void loadCaptions(); }, [open]);

  const toggleMode = (id: Mode) => setModes((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  const generate = async () => {
    if (!modes.length) { toast({ title: "Виберіть матеріали" }); return; }
    if (transcript.trim().length < 80 && captionSource === "manual") { toast({ title: "Додайте транскрипт", description: "Потрібно щонайменше кілька речень.", variant: "destructive" }); return; }
    const controller = new AbortController();
    abortRef.current = controller;
    setStatus("generating");
    setDraft(null);
    const { data, error } = await supabase.functions.invoke("video-to-lesson", {
      body: { action: "generate", class_id: classId, video_url: videoUrl, level, modes, transcript, instructions },
      signal: controller.signal,
    });
    abortRef.current = null;
    if (error) {
      if (controller.signal.aborted) toast({ title: "Генерацію зупинено" });
      else toast({ title: "Не вдалося створити урок", description: await errorMessage(error), variant: "destructive" });
      setStatus("idle");
      return;
    }
    const next = data?.draft as Draft | undefined;
    if (!next?.sections?.length) { toast({ title: "ШІ не створив матеріали", variant: "destructive" }); setStatus("idle"); return; }
    setDraft(next);
    setEnabled(next.sections.flatMap((section: any) => section.blocks.map((_: any, index: number) => `${section.id}:${index}`)));
    setStatus("ready");
  };

  const save = async () => {
    if (!user || !preview || !preview.sections.length) return;
    setStatus("saving");
    const blocks = preview.sections.flatMap((section) => section.blocks);
    const insert: Database["public"]["Tables"]["lesson_kits"]["Insert"] = {
      owner_id: user.id,
      title: preview.title,
      level: preview.level,
      source: "youtube",
      focus: preview.focus,
      notes: videoUrl,
      page_paths: [],
      blocks: blocks as Json,
      sections: preview.sections as Json,
      topics: preview.topics,
      summary: preview.summary,
      kind: "lesson",
    };
    const { data, error } = await supabase.from("lesson_kits").insert(insert).select("*").single();
    if (error || !data) { toast({ title: "Не вдалося зберегти урок", description: error?.message, variant: "destructive" }); setStatus("ready"); return; }
    const kit = normalizeKit(data);
    await onUseLesson(kit);
    toast({ title: "Урок створено", description: "Збережено в бібліотеці та показано учневі." });
    setOpen(false);
    setStatus("idle");
  };

  return (
    <>
      <Button type="button" animated={false} variant="outline" onClick={() => setOpen(true)} disabled={!videoUrl}>
        <WandSparkles /> Створити урок з відео
      </Button>
      <Dialog open={open} onOpenChange={(next) => { if (status !== "generating") setOpen(next); }}>
        <DialogContent className="flex max-h-[92dvh] max-w-5xl flex-col overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border px-6 py-5">
            <DialogTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> AI-урок із відео</DialogTitle>
            <DialogDescription>Перевірте джерело, рівень і матеріали перед створенням.</DialogDescription>
          </DialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
            {!draft ? <div className="grid gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
              <div className="space-y-4">
                <div><p className="mb-2 text-sm font-medium">Рівень</p><Select value={level} onValueChange={setLevel}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{["A1","A2","B1","B2","C1"].map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
                <div><p className="mb-2 text-sm font-medium">Що створити</p><div className="space-y-2">{OPTIONS.map((option) => <label key={option.id} className="flex cursor-pointer items-center gap-2 text-sm"><Checkbox checked={modes.includes(option.id)} onCheckedChange={() => toggleMode(option.id)} />{option.label}</label>)}</div></div>
                <div><p className="mb-2 text-sm font-medium">Побажання</p><Textarea value={instructions} onChange={(event) => setInstructions(event.target.value)} placeholder="Наприклад: більше лексики для розмови" /></div>
              </div>
              <div className="space-y-2"><div className="flex items-center justify-between gap-3"><p className="text-sm font-medium">Транскрипт відео</p>{status === "captions" ? <span className="flex items-center gap-1 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> Отримуємо субтитри…</span> : captionSource === "youtube" ? <span className="text-xs text-primary">Субтитри знайдено</span> : captionSource === "manual" ? <span className="text-xs text-muted-foreground">Вставте текст вручну</span> : null}</div><Textarea className="min-h-[320px] resize-y" value={transcript} onChange={(event) => { setTranscript(event.target.value); setCaptionSource("manual"); }} placeholder="Якщо субтитри недоступні, вставте сюди текст відео…" /></div>
            </div> : <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-display text-lg font-semibold">{draft.title}</h3><p className="text-sm text-muted-foreground">Зніміть позначку з блоків, які не потрібно додавати.</p></div><Button variant="outline" onClick={() => { setDraft(null); setStatus("idle"); }}>Змінити налаштування</Button></div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{draft.sections.flatMap((section) => section.blocks.map((block: any, index: number) => { const key = `${section.id}:${index}`; return <label key={key} className="flex cursor-pointer items-start gap-2 rounded-md border border-border p-3 text-sm"><Checkbox checked={enabled.includes(key)} onCheckedChange={() => setEnabled((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key])} /><span><b>{block.title || block.type}</b><span className="block text-xs text-muted-foreground">{section.title}</span></span></label>; }))}</div>
              {preview && <div className="max-h-[48dvh] overflow-y-auto rounded-md border border-border"><LessonReader title={preview.title} level={preview.level} sections={preview.sections} readOnly showActions={false} /></div>}
            </div>}
          </div>
          <DialogFooter className="shrink-0 border-t border-border px-6 py-4">
            {status === "generating" ? <Button variant="destructive" onClick={() => abortRef.current?.abort()}><Square /> Зупинити</Button> : draft ? <Button onClick={save} disabled={status === "saving" || !enabled.length}>{status === "saving" ? <Loader2 className="animate-spin" /> : <BookOpenCheck />} Зберегти й показати учневі</Button> : <Button onClick={generate} disabled={status === "captions"}><Sparkles /> Створити матеріали</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
