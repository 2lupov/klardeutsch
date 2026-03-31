import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Volume2, CheckCircle2 } from "lucide-react";
import type { Lang } from "@/i18n/translations";

interface Props {
  lesson: { id: string; title: string; content: any };
  onComplete: (score: number) => void;
  lang: Lang;
}

const SpeakingChallengeLesson = ({ lesson, onComplete, lang }: Props) => {
  const content = lesson.content as any;
  const textDe = content?.text_de ?? "";
  const tips = content?.tips ?? [];

  const [attempts, setAttempts] = useState(0);
  const [completed, setCompleted] = useState(false);

  const handleRecord = () => {
    // Simulated — real implementation would use ElevenLabs STT
    setAttempts((p) => p + 1);
    if (attempts >= 1) {
      setCompleted(true);
      onComplete(85);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-foreground">{lesson.title}</h2>
      </div>

      {/* Text to read */}
      <div className="p-5 rounded-xl border border-border/30 bg-card/40 space-y-4">
        <p className="text-base text-foreground font-medium leading-relaxed">{textDe}</p>
        <Button variant="outline" size="sm" className="text-xs">
          <Volume2 className="w-3.5 h-3.5 mr-1.5" />
          {lang === "uk" ? "Слухати еталон" : "Слушать эталон"}
        </Button>
      </div>

      {/* Tips */}
      {tips.length > 0 && (
        <div className="space-y-1">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
            {lang === "uk" ? "Підказки" : "Подсказки"}
          </p>
          {tips.map((tip: string, i: number) => (
            <p key={i} className="text-xs text-muted-foreground">• {tip}</p>
          ))}
        </div>
      )}

      {/* Record */}
      <div className="flex flex-col items-center gap-4">
        {completed ? (
          <div className="flex items-center gap-2 text-primary text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5" />
            85% — {lang === "uk" ? "Відмінно!" : "Отлично!"}
          </div>
        ) : (
          <>
            <Button onClick={handleRecord} size="lg" className="font-display font-bold gap-2">
              <Mic className="w-5 h-5" />
              {lang === "uk" ? "Записати" : "Записать"}
            </Button>
            <p className="text-[11px] text-muted-foreground">
              {lang === "uk" ? `Спроба ${attempts + 1} з 3` : `Попытка ${attempts + 1} из 3`}
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default SpeakingChallengeLesson;
