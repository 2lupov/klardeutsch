import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight, X, Maximize2, CheckCircle2 } from "lucide-react";

export type Slide =
  | { type: "title"; title: string; subtitle?: string }
  | { type: "bullets"; title: string; bullets: string[] }
  | { type: "vocab"; title?: string; words: { term: string; translation?: string; example?: string }[] }
  | { type: "example"; title?: string; text: string; note?: string }
  | { type: "quiz"; question: string; options: string[]; answer: string }
  | { type: "closing"; title: string; text?: string }
  | { type: string; [k: string]: any };

interface Props {
  open: boolean;
  onClose: () => void;
  slides: Slide[];
  lessonTitle?: string;
}

export default function LessonSlidesViewer({ open, onClose, slides, lessonTitle }: Props) {
  const [i, setI] = useState(0);
  const [answered, setAnswered] = useState<Record<number, string>>({});

  useEffect(() => { if (open) setI(0); }, [open]);

  const total = slides.length;
  const next = useCallback(() => setI(v => Math.min(total - 1, v + 1)), [total]);
  const prev = useCallback(() => setI(v => Math.max(0, v - 1)), []);

  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") { e.preventDefault(); next(); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); prev(); }
      else if (e.key === "Escape") onClose();
      else if (e.key === "f" || e.key === "F") {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen().catch(() => {});
      }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, next, prev, onClose]);

  if (!open || total === 0) return null;
  const s = slides[i] || slides[0];

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-[95vw] w-[95vw] h-[90vh] p-0 gap-0 bg-slate-950 border-slate-800 overflow-hidden">
        {/* Top bar */}
        <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/60 to-transparent text-white/80">
          <div className="text-xs truncate">{lessonTitle || "Презентація уроку"}</div>
          <div className="flex items-center gap-3">
            <span className="text-xs tabular-nums">{i + 1} / {total}</span>
            <button onClick={() => document.documentElement.requestFullscreen().catch(() => {})} className="p-1 hover:bg-white/10 rounded"><Maximize2 className="w-4 h-4" /></button>
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Slide surface — 16:9 fit */}
        <div className="w-full h-full flex items-center justify-center bg-slate-950 select-none">
          <div className="relative w-full h-full max-w-[calc(90vh*16/9)] max-h-[calc(95vw*9/16)] mx-auto flex items-center justify-center px-8 md:px-16 py-16">
            <SlideBody
              slide={s}
              answered={answered[i]}
              onAnswer={(a) => setAnswered(prev => ({ ...prev, [i]: a }))}
            />
          </div>
        </div>

        {/* Nav pills */}
        <button
          onClick={prev}
          disabled={i === 0}
          className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white disabled:opacity-30 hover:bg-white/20"
        ><ChevronLeft className="w-6 h-6" /></button>
        <button
          onClick={next}
          disabled={i === total - 1}
          className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/10 text-white disabled:opacity-30 hover:bg-white/20"
        ><ChevronRight className="w-6 h-6" /></button>

        {/* Progress dots */}
        <div className="absolute bottom-3 left-0 right-0 flex items-center justify-center gap-1.5 z-10">
          {slides.map((_, k) => (
            <button
              key={k}
              onClick={() => setI(k)}
              className={`h-1.5 rounded-full transition-all ${k === i ? "w-6 bg-white" : "w-1.5 bg-white/30 hover:bg-white/60"}`}
            />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SlideBody({ slide, answered, onAnswer }: { slide: Slide; answered?: string; onAnswer: (a: string) => void }) {
  if (slide.type === "title") {
    return (
      <div className="text-center text-white space-y-6">
        <h1 className="text-5xl md:text-7xl font-bold tracking-tight leading-tight">{slide.title}</h1>
        {slide.subtitle && <p className="text-xl md:text-2xl text-white/70">{slide.subtitle}</p>}
      </div>
    );
  }

  if (slide.type === "bullets") {
    return (
      <div className="text-white w-full max-w-4xl space-y-8">
        <h2 className="text-4xl md:text-5xl font-bold tracking-tight">{slide.title}</h2>
        <ul className="space-y-4">
          {(slide.bullets || []).map((b: string, k: number) => (
            <li key={k} className="flex items-start gap-3 text-xl md:text-2xl leading-relaxed">
              <span className="text-indigo-400 mt-1">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      </div>
    );
  }

  if (slide.type === "vocab") {
    return (
      <div className="text-white w-full max-w-4xl space-y-6">
        <h2 className="text-3xl md:text-4xl font-bold">{slide.title || "Словник"}</h2>
        <div className="grid gap-3">
          {(slide.words || []).map((w: any, k: number) => (
            <div key={k} className="p-4 rounded-2xl bg-white/5 border border-white/10">
              <div className="flex items-baseline gap-3 flex-wrap">
                <span className="text-2xl md:text-3xl font-semibold">{w.term}</span>
                {w.translation && <span className="text-white/60 text-lg md:text-xl">— {w.translation}</span>}
              </div>
              {w.example && <p className="mt-1 text-white/70 italic text-base md:text-lg">{w.example}</p>}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (slide.type === "example") {
    return (
      <div className="text-white w-full max-w-3xl space-y-6 text-center">
        {slide.title && <h2 className="text-3xl md:text-4xl font-bold">{slide.title}</h2>}
        <p className="text-2xl md:text-4xl font-medium leading-snug bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-white/10 rounded-3xl px-8 py-10">
          {slide.text}
        </p>
        {slide.note && <p className="text-white/60 text-lg">{slide.note}</p>}
      </div>
    );
  }

  if (slide.type === "quiz") {
    const correct = answered && answered === slide.answer;
    return (
      <div className="text-white w-full max-w-3xl space-y-6">
        <h2 className="text-3xl md:text-4xl font-bold leading-tight">{slide.question}</h2>
        <div className="grid gap-3">
          {(slide.options || []).map((o: string, k: number) => {
            const isPicked = answered === o;
            const isRight = o === slide.answer;
            const revealed = !!answered;
            return (
              <button
                key={k}
                disabled={!!answered}
                onClick={() => onAnswer(o)}
                className={`text-left px-5 py-4 rounded-2xl text-lg md:text-xl border transition-all
                  ${revealed && isRight ? "bg-emerald-500/20 border-emerald-400 text-white" : ""}
                  ${revealed && isPicked && !isRight ? "bg-rose-500/20 border-rose-400 text-white" : ""}
                  ${!revealed ? "bg-white/5 border-white/10 hover:bg-white/10" : ""}
                `}
              >
                <span className="mr-3 text-white/50">{String.fromCharCode(65 + k)}.</span>{o}
                {revealed && isRight && <CheckCircle2 className="inline w-5 h-5 ml-2 text-emerald-400" />}
              </button>
            );
          })}
        </div>
        {answered && (
          <p className={`text-lg ${correct ? "text-emerald-400" : "text-rose-400"}`}>
            {correct ? "✅ Правильно!" : `❌ Правильна відповідь: ${slide.answer}`}
          </p>
        )}
      </div>
    );
  }

  if (slide.type === "closing") {
    return (
      <div className="text-center text-white space-y-6 max-w-3xl">
        <h1 className="text-5xl md:text-6xl font-bold">{slide.title}</h1>
        {slide.text && <p className="text-xl md:text-2xl text-white/80 leading-relaxed">{slide.text}</p>}
      </div>
    );
  }

  return (
    <pre className="text-white/70 text-sm max-w-3xl overflow-auto">{JSON.stringify(slide, null, 2)}</pre>
  );
}
