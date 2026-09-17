import { useRef, useState } from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import type { LessonBlock } from "./types";

interface SchreibenValue {
  text?: string;
  transcript?: string;
  pronunciation_score?: number;
  problem_words?: string[];
}

interface Props {
  block: LessonBlock;
  value: SchreibenValue;
  onChange: (v: SchreibenValue) => void;
  checked: boolean;
  readOnly?: boolean;
}

export default function SchreibenBlock({ block, value, onChange, checked, readOnly }: Props) {
  const p = block.payload || {};
  const [recording, setRecording] = useState(false);
  const [scoring, setScoring] = useState(false);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const words = String(value?.text ?? "").trim().split(/\s+/).filter(Boolean).length;
  const min = p.min_words ?? 20;

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        if (blob.size < 2048) {
          toast({ title: "Запис вийшов порожній", description: "Спробуйте ще раз і говоріть трохи довше.", variant: "destructive" });
          return;
        }
        await score(blob);
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
    } catch {
      toast({ title: "Немає доступу до мікрофона", description: "Дозвольте запис у налаштуваннях браузера.", variant: "destructive" });
    }
  };

  const stop = () => {
    recRef.current?.stop();
    recRef.current = null;
    setRecording(false);
  };

  const score = async (blob: Blob) => {
    setScoring(true);
    try {
      const b64 = await new Promise<string>((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(String(fr.result).split(",")[1] ?? "");
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
      const { data, error } = await supabase.functions.invoke("score-pronunciation", {
        body: { audio_base64: b64, mime: "audio/webm", reference: p.prompt ?? "", block_id: block.id },
      });
      if (error) throw error;
      onChange({
        ...(value ?? {}),
        transcript: data?.transcript ?? "",
        pronunciation_score: data?.score ?? null,
        problem_words: data?.problem_words ?? [],
      });
      toast({ title: "Готово", description: `Вимова: ${data?.score ?? "—"}%` });
    } catch (e: any) {
      toast({ title: "Не вдалося оцінити вимову", description: e?.message ?? "Спробуйте ще раз", variant: "destructive" });
    } finally {
      setScoring(false);
    }
  };

  return (
    <div className="space-y-4">
      {p.instructions && <p className="text-sm text-muted-foreground">{p.instructions}</p>}
      {p.prompt && <p className="rounded-xl bg-muted/50 p-3 font-medium">{p.prompt}</p>}

      {(p.redemittel ?? []).length > 0 && (
        <div className="flex flex-wrap gap-1">
          {(p.redemittel ?? []).map((r, i) => (
            <button
              key={i}
              disabled={readOnly}
              onClick={() => onChange({ ...(value ?? {}), text: `${value?.text ? value.text + " " : ""}${r}` })}
              className="rounded-lg border border-dashed px-2 py-1 text-xs hover:bg-muted"
            >
              {r}
            </button>
          ))}
        </div>
      )}

      <Textarea
        value={value?.text ?? ""}
        disabled={readOnly}
        onChange={(e) => onChange({ ...(value ?? {}), text: e.target.value })}
        rows={6}
        placeholder="Schreiben Sie hier …"
        className={cn(checked && (words >= min ? "border-emerald-500" : "border-destructive"))}
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>
          {words} / {min} слів
        </span>
        {p.allow_voice !== false && !readOnly && (
          <Button size="sm" variant={recording ? "destructive" : "outline"} onClick={recording ? stop : start} disabled={scoring}>
            {scoring ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : recording ? <Square className="mr-1 h-4 w-4" /> : <Mic className="mr-1 h-4 w-4" />}
            {scoring ? "Аналізуємо…" : recording ? "Стоп" : "Сказати вголос"}
          </Button>
        )}
      </div>

      {value?.transcript && (
        <div className="space-y-1 rounded-xl border bg-muted/40 p-3 text-sm">
          <p className="text-xs text-muted-foreground">Що почув ШІ:</p>
          <p>{value.transcript}</p>
          {typeof value.pronunciation_score === "number" && (
            <p className="text-xs">
              Вимова: <span className="font-semibold">{value.pronunciation_score}%</span>
            </p>
          )}
          {(value.problem_words ?? []).length > 0 && (
            <p className="flex flex-wrap gap-1 text-xs">
              {(value.problem_words ?? []).map((w, i) => (
                <span key={i} className="rounded bg-destructive/10 px-1.5 py-0.5 text-destructive">
                  {w}
                </span>
              ))}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
