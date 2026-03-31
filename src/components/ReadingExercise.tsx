import { useState } from "react";
import { ReadingText } from "@/data/lessons";
import Quiz from "./Quiz";
import { BookOpen, Volume2, Pause } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useListeningAudio } from "@/contexts/ListeningAudioContext";

interface ReadingExerciseProps {
  readings: ReadingText[];
  onComplete: () => void;
  level?: string;
}

const ReadingExercise = ({ readings, onComplete, level = "A1" }: ReadingExerciseProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showQuestions, setShowQuestions] = useState(false);
  const { t } = useLanguage();
  const { playing, loading, play: playAudio, currentTitle } = useListeningAudio();

  const reading = readings[currentIndex];
  const isThisPlaying = playing && currentTitle === reading.title;
  const isThisLoading = loading && currentTitle === reading.title;

  const handlePlayReading = () => {
    playAudio(reading.text, reading.title);
  };

  if (showQuestions) {
    return (
      <Quiz
        questions={reading.questions}
        level={level}
        category="reading"
        onComplete={() => {
          if (currentIndex < readings.length - 1) {
            setCurrentIndex((i) => i + 1);
            setShowQuestions(false);
          } else {
            onComplete();
          }
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6 animate-slide-up">
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <BookOpen className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-display font-semibold">{reading.title}</h3>
          </div>
          <button
            onClick={handlePlayReading}
            disabled={loading}
            className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
            title={t("readAloud")}
          >
            {loading ? (
              <span className="animate-pulse text-xs">...</span>
            ) : playing ? (
              <Pause className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        </div>
        <p className="text-foreground/90 leading-relaxed text-base">{reading.text}</p>
      </div>

      <button
        onClick={() => setShowQuestions(true)}
        className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow"
      >
        {t("goToQuestions")}
      </button>
    </div>
  );
};

export default ReadingExercise;
