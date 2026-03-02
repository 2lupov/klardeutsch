import { useState } from "react";
import { VocabCard } from "@/data/lessons";
import { ChevronLeft, ChevronRight, RotateCcw } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface FlashcardProps {
  cards: VocabCard[];
  onComplete: () => void;
}

const Flashcard = ({ cards, onComplete }: FlashcardProps) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [learned, setLearned] = useState<Set<string>>(new Set());
  const { t } = useLanguage();

  const card = cards[currentIndex];
  const progress = ((currentIndex + 1) / cards.length) * 100;

  const handleNext = () => {
    setFlipped(false);
    if (currentIndex < cards.length - 1) {
      setTimeout(() => setCurrentIndex(currentIndex + 1), 150);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setFlipped(false);
      setTimeout(() => setCurrentIndex(currentIndex - 1), 150);
    }
  };

  const markLearned = () => {
    setLearned((prev) => new Set(prev).add(card.id));
    handleNext();
  };

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Progress */}
      <div className="w-full">
        <div className="flex justify-between text-sm text-muted-foreground mb-2">
          <span>{currentIndex + 1} / {cards.length}</span>
          <span>{learned.size} {t("learned")}</span>
        </div>
        <div className="progress-bar">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm aspect-[3/4] cursor-pointer perspective-1000"
        onClick={() => setFlipped(!flipped)}
      >
        <div
          className={`relative w-full h-full transition-transform duration-500 preserve-3d ${
            flipped ? "[transform:rotateY(180deg)]" : ""
          }`}
          style={{ transformStyle: "preserve-3d" }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 glass-card glow-yellow flex flex-col items-center justify-center p-8 backface-hidden"
            style={{ backfaceVisibility: "hidden" }}
          >
            {card.article && (
              <span className="text-sm font-medium text-primary mb-2">{card.article}</span>
            )}
            <h2 className="text-3xl font-display font-bold text-foreground mb-4">{card.german}</h2>
            <p className="text-sm text-muted-foreground">{t("tapToFlip")}</p>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 glass-card flex flex-col items-center justify-center p-8 backface-hidden [transform:rotateY(180deg)]"
            style={{ backfaceVisibility: "hidden" }}
          >
            <h2 className="text-2xl font-display font-bold text-primary mb-4">{card.russian}</h2>
            {card.example && (
              <p className="text-sm text-muted-foreground italic text-center">"{card.example}"</p>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={handlePrev}
          disabled={currentIndex === 0}
          className="p-3 rounded-xl bg-secondary text-secondary-foreground disabled:opacity-30 transition-all hover:bg-secondary/80"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <button
          onClick={markLearned}
          className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold transition-all hover:opacity-90 glow-yellow"
        >
          {t("iLearned")}
        </button>

        <button
          onClick={handleNext}
          className="p-3 rounded-xl bg-secondary text-secondary-foreground transition-all hover:bg-secondary/80"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <button
        onClick={() => {
          setCurrentIndex(0);
          setFlipped(false);
          setLearned(new Set());
        }}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <RotateCcw className="w-4 h-4" />
        {t("restart")}
      </button>
    </div>
  );
};

export default Flashcard;
