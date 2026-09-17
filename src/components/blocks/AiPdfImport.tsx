import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { FileUp, Loader2, Sparkles, Wand2 } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { DEMO_LEKTION } from "./demoLesson";
import LibraryBookPicker from "./LibraryBookPicker";
import { cn } from "@/lib/utils";

(pdfjsLib as any).GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const STEPS = [
  "Читаємо сторінки й розпізнаємо німецький текст…",
  "Визначаємо типи завдань (Lückentext, Satzbau, Wortschatz)…",
  "Витягуємо правильні ключі та грамматичні правила…",
  "Збираємо інтерактивні блоки уроку…",
];

interface Props {
  lessonId: string;
  /** Викликається після створення блоків; передає шляхи сторінок для звірки. */
  onCreated: (pagePaths: string[]) => void;
}

export default function AiPdfImport({ lessonId, onCreated }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [total, setTotal] = useState(0);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(2);
  const [level, setLevel] = useState("A2");
  const [focus, setFocus] = useState<"kursbuch" | "arbeitsbuch">("kursbuch");
  const [prompt, setPrompt] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [drag, setDrag] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const pick = async (f: File) => {
    if (f.type !== "application/pdf") {
      toast({ title: "Потрібен PDF-файл", variant: "destructive" });
      return;
    }
    setFile(f);
    try {
      const buf = await f.arrayBuffer();
      const pdf = await (pdfjsLib as any).getDocument({ data: buf }).promise;
      setTotal(pdf.numPages);
      setFrom(1);
      setTo(Math.min(2, pdf.numPages));
    } catch {
      toast({ title: "Не вдалося прочитати PDF", variant: "destructive" });
    }
  };

  const renderRange = async (): Promise<string[]> => {
    const buf = await file!.arrayBuffer();
    const pdf = await (pdfjsLib as any).getDocument({ data: buf }).promise;
    const paths: string[] = [];
    for (let n = from; n <= Math.min(to, pdf.numPages); n++) {
      const page = await pdf.getPage(n);
      const base = page.getViewport({ scale: 1 });
      const scale = Math.min(2.2, 1400 / base.width);
      const viewport = page.getViewport({ scale });
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width);
      canvas.height = Math.floor(viewport.height);
      const ctx = canvas.getContext("2d")!;
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: ctx, viewport }).promise;
      const blob = await new Promise<Blob>((res, rej) =>
        canvas.toBlob((b) => (b ? res(b) : rej(new Error("canvas"))), "image/jpeg", 0.82),
      );
      const path = `pdf/${lessonId}/${Date.now()}-${n}.jpg`;
      const { error } = await supabase.storage.from("tutoring-materials").upload(path, blob, { upsert: true });
      if (error) throw error;
      paths.push(path);
      canvas.width = 0;
      canvas.height = 0;
    }
    return paths;
  };

  const generate = async () => {
    if (!file) return;
    setBusy(true);
    setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 4000);
    try {
      const paths = await renderRange();
      setStep(1);
      const { data, error } = await supabase.functions.invoke("pdf-to-lesson-blocks", {
        body: { lesson_id: lessonId, image_paths: paths, level, focus, instructions: prompt.slice(0, 1500) },
      });
      if (error) throw error;
      setStep(3);
      toast({ title: "Урок готовий", description: `Створено блоків: ${data?.blocks ?? 0}` });
      onCreated(paths);
    } catch (e: any) {
      const msg = String(e?.message ?? "");
      toast({
        title: "Не вдалося створити урок",
        description: msg.includes("402")
          ? "Закінчились AI-кредити робочого простору."
          : msg.includes("429")
            ? "Забагато запитів до ШІ, спробуйте за хвилину."
            : msg || "Спробуйте ще раз",
        variant: "destructive",
      });
    } finally {
      clearInterval(timer);
      setBusy(false);
    }
  };

  const loadDemo = async () => {
    setBusy(true);
    setStep(0);
    const timer = setInterval(() => setStep((s) => Math.min(s + 1, STEPS.length - 1)), 700);
    try {
      const { count } = await supabase
        .from("tutoring_lesson_blocks")
        .select("id", { count: "exact", head: true })
        .eq("lesson_id", lessonId);
      const base = count ?? 0;
      await new Promise((r) => setTimeout(r, 3000));
      const rows = DEMO_LEKTION.map((b, i) => ({
        lesson_id: lessonId,
        type: b.type,
        title: b.title,
        payload: b.payload as any,
        sort_order: base + i,
        source: "demo",
      }));
      const { error } = await supabase.from("tutoring_lesson_blocks").insert(rows);
      if (error) throw error;
      toast({ title: "Демо-урок завантажено", description: "Schritte Plus Neu A2, Lektion 3" });
      onCreated([]);
    } catch (e: any) {
      toast({ title: "Не вдалося завантажити демо", description: e?.message, variant: "destructive" });
    } finally {
      clearInterval(timer);
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files?.[0];
          if (f) pick(f);
        }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-colors",
          drag ? "border-primary bg-primary/5" : "hover:bg-muted/50",
        )}
      >
        <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])} />
        <FileUp className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
        <p className="text-sm font-medium">{file ? file.name : "Перетягніть PDF підручника або натисніть, щоб вибрати"}</p>
        {total > 0 && <p className="text-xs text-muted-foreground">Сторінок у файлі: {total}</p>}
      </div>

      <div onClick={(e) => e.stopPropagation()}>
        <LibraryBookPicker
          theme="app"
          disabled={busy}
          label="Взяти з бібліотеки книг"
          onPick={(f, b) => {
            pick(f);
            if (b.level) setLevel(b.level);
            if (b.kind === "arbeitsbuch" || b.kind === "grammatik") setFocus("arbeitsbuch");
          }}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div>
          <Label className="text-xs">Сторінка з</Label>
          <Input type="number" min={1} value={from} onChange={(e) => setFrom(Number(e.target.value) || 1)} />
        </div>
        <div>
          <Label className="text-xs">по</Label>
          <Input type="number" min={1} value={to} onChange={(e) => setTo(Number(e.target.value) || 1)} />
        </div>
        <div>
          <Label className="text-xs">Рівень</Label>
          <Select value={level} onValueChange={setLevel}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["A1", "A2", "B1", "B2"].map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Фокус</Label>
          <Select value={focus} onValueChange={(v) => setFocus(v as any)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="kursbuch">Kursbuch — читання/аудіо</SelectItem>
              <SelectItem value="arbeitsbuch">Arbeitsbuch — грамматика</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label className="text-xs">Що саме потрібно (необовʼязково)</Label>
        <Textarea rows={2} value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Напр.: акцент на Wechselpräpositionen, більше Lückentext" />
      </div>

      {busy && (
        <div className="space-y-2 rounded-2xl border bg-muted/40 p-4">
          <Progress value={((step + 1) / STEPS.length) * 100} />
          <motion.p key={step} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm">
            {STEPS[step]}
          </motion.p>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button onClick={generate} disabled={!file || busy}>
          {busy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1 h-4 w-4" />}
          Lektion automatisch generieren
        </Button>
        <Button variant="outline" onClick={loadDemo} disabled={busy}>
          <Sparkles className="mr-1 h-4 w-4" />
          Демо-розворот Schritte Plus Neu A2 (Lektion 3)
        </Button>
      </div>
    </div>
  );
}
