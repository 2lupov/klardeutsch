import { useState } from "react";
import { CheckCircle2, Volume2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Lang } from "@/i18n/translations";

interface Phrase {
  de: string;
  ru: string;
  usage?: string;
}

interface DialogueLine {
  person: number;
  de: string;
  ru: string;
}

interface DialogueContent {
  situation?: string;
  persons?: string[];
  dialogue?: DialogueLine[];
  phrases?: Phrase[];
  cultural_note?: string;
}

interface Props {
  lesson: { id: string; title: string; content: any };
  onComplete: () => void;
  lang: Lang;
}

const DialogueTextLesson = ({ lesson, onComplete, lang }: Props) => {
  const c = (lesson.content as DialogueContent) || {};
  const dialogue = c.dialogue ?? [];
  const phrases = c.phrases ?? [];
  const persons = c.persons ?? ["Person A", "Person B"];
  const [showTranslations, setShowTranslations] = useState<Set<number>>(new Set());
  const [completed, setCompleted] = useState(false);

  const toggleTranslation = (i: number) => {
    setShowTranslations(prev => {
      const s = new Set(prev);
      s.has(i) ? s.delete(i) : s.add(i);
      return s;
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold text-foreground">{lesson.title}</h2>

      {/* Situation */}
      {c.situation && (
        <div className="p-3 rounded-xl border border-border/30 bg-card/40">
          <p className="text-xs text-muted-foreground">{lang === "uk" ? "Ситуація" : "Ситуация"}</p>
          <p className="text-sm font-semibold text-foreground">{c.situation}</p>
        </div>
      )}

      {/* Dialogue */}
      <div className="space-y-3">
        {dialogue.map((line, i) => {
          const isLeft = line.person === 0;
          return (
            <div key={i} className={`flex ${isLeft ? "justify-start" : "justify-end"}`}>
              <div className={`max-w-[80%] space-y-1 ${isLeft ? "" : "text-right"}`}>
                <p className="text-[10px] text-muted-foreground">{persons[line.person] || `Person ${line.person + 1}`}</p>
                <div className={`p-3 rounded-2xl ${isLeft ? "bg-muted/30 rounded-tl-sm" : "bg-primary/10 rounded-tr-sm"}`}>
                  <p className="text-sm text-foreground">{line.de}</p>
                  <button onClick={() => toggleTranslation(i)}
                    className="text-[10px] text-muted-foreground hover:text-foreground mt-1 transition-colors">
                    {showTranslations.has(i) ? line.ru : (lang === "uk" ? "показати переклад" : "показать перевод")}
                  </button>
                </div>
                <button className="p-1 rounded-full hover:bg-muted/30 transition-colors inline-flex">
                  <Volume2 className="w-3.5 h-3.5 text-primary" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Key phrases */}
      {phrases.length > 0 && (
        <div className="space-y-2 pt-4 border-t border-border/20">
          <h3 className="text-xs font-display font-bold text-muted-foreground uppercase tracking-wider">
            {lang === "uk" ? "Ключові фрази" : "Ключевые фразы"}
          </h3>
          <div className="rounded-xl border border-border/30 bg-card/30 overflow-hidden">
            {phrases.map((p, i) => (
              <div key={i} className="flex items-start gap-3 p-3 border-b border-border/10 last:border-0">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">{p.de}</p>
                  <p className="text-xs text-muted-foreground">{p.ru}</p>
                  {p.usage && <p className="text-[10px] text-muted-foreground/60 mt-0.5 italic">{p.usage}</p>}
                </div>
                <button className="p-1.5 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors shrink-0">
                  <Volume2 className="w-3 h-3 text-primary" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cultural note */}
      {c.cultural_note && (
        <div className="p-3 rounded-xl border border-accent/30 bg-accent/5 flex items-start gap-2">
          <span className="text-lg">🇩🇪</span>
          <div>
            <p className="text-xs font-bold text-accent">{lang === "uk" ? "Культурна замітка" : "Культурная заметка"}</p>
            <p className="text-xs text-foreground/80">{c.cultural_note}</p>
          </div>
        </div>
      )}

      {/* Complete */}
      <div className="flex justify-center pt-4">
        {completed ? (
          <div className="flex items-center gap-2 text-primary text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5" /> {lang === "uk" ? "Завершено!" : "Завершено!"}
          </div>
        ) : (
          <Button onClick={() => { setCompleted(true); onComplete(); }} className="font-display font-bold" size="lg">
            {lang === "uk" ? "Урок завершено ✓" : "Урок завершён ✓"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default DialogueTextLesson;
