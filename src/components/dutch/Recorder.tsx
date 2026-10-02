import { useRef, useState } from "react";
import { Mic, Square, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { transcribeDutch } from "@/lib/dutch";
import { toast } from "sonner";

export default function Recorder({ onText, label = "Говорить" }: { onText: (t: string) => void; label?: string }) {
  const [state, setState] = useState<"idle" | "rec" | "busy">("idle");
  const rec = useRef<MediaRecorder | null>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const mr = new MediaRecorder(stream);
      mr.ondataavailable = (e) => chunks.push(e.data);
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setState("busy");
        try {
          const text = await transcribeDutch(new Blob(chunks, { type: mr.mimeType }));
          if (text.trim()) onText(text.trim());
          else toast.error("Ничего не услышал, попробуй ещё раз");
        } catch (e) {
          toast.error((e as Error).message);
        } finally {
          setState("idle");
        }
      };
      mr.start();
      rec.current = mr;
      setState("rec");
    } catch {
      toast.error("Нужен доступ к микрофону");
    }
  };

  return (
    <Button
      type="button"
      variant={state === "rec" ? "destructive" : "default"}
      onClick={() => (state === "rec" ? rec.current?.stop() : start())}
      disabled={state === "busy"}
      className="gap-2"
    >
      {state === "busy" ? <Loader2 className="h-4 w-4 animate-spin" /> : state === "rec" ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
      {state === "rec" ? "Стоп" : state === "busy" ? "Распознаю…" : label}
    </Button>
  );
}
