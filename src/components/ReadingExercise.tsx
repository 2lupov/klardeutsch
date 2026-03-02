import { useState } from "react";
import { ReadingText } from "@/data/lessons";
import Quiz from "./Quiz";
import { BookOpen } from "lucide-react";

interface ReadingExerciseProps {
  readings: ReadingText[];
  onComplete: () => void;
}

const ReadingExercise = ({ readings, onComplete }: ReadingExerciseProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showQuestions, setShowQuestions] = useState(false);

  const reading = readings[currentIndex];

  if (showQuestions) {
    return (
      <Quiz
        questions={reading.questions}
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
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-display font-semibold">{reading.title}</h3>
        </div>
        <p className="text-foreground/90 leading-relaxed text-base">{reading.text}</p>
      </div>

      <button
        onClick={() => setShowQuestions(true)}
        className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow"
      >
        Перейти к вопросам →
      </button>
    </div>
  );
};

export default ReadingExercise;
