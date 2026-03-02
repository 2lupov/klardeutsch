import { useState, useEffect } from "react";
import { Level, CategoryData } from "@/data/lessons";
import { fetchLevelData } from "@/hooks/useLessons";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProgress } from "@/hooks/useProgress";
import { usePlatform } from "@/hooks/usePlatform";
import LevelSelector from "@/components/LevelSelector";
import CategorySelector from "@/components/CategorySelector";
import Flashcard from "@/components/Flashcard";
import Quiz from "@/components/Quiz";
import ReadingExercise from "@/components/ReadingExercise";
import ListeningExercise from "@/components/ListeningExercise";
import DailyChallenge from "@/components/DailyChallenge";
import { ArrowLeft } from "lucide-react";

type Category = "vocabulary" | "grammar" | "reading" | "listening";
type Screen = "levels" | "categories" | "exercise";

const Index = () => {
  const [screen, setScreen] = useState<Screen>("levels");
  const [level, setLevel] = useState<Level>("A1");
  const [category, setCategory] = useState<Category>("vocabulary");
  const [data, setData] = useState<CategoryData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [clarity, setClarity] = useState(0);
  const { user } = useAuth();
  const { saveProgress } = useProgress();
  const { t } = useLanguage();
  const { isMobile } = usePlatform();

  useEffect(() => {
    if (screen !== "levels") {
      setDataLoading(true);
      fetchLevelData(level).then((d) => {
        setData(d);
        setDataLoading(false);
      });
    }
  }, [level, screen]);

  useEffect(() => {
    if (screen === "exercise") setClarity(0);
  }, [screen, category]);

  if (!user) return null;

  const handleLevelSelect = (l: Level) => {
    setLevel(l);
    setScreen("categories");
  };

  const handleCategorySelect = (c: Category) => {
    setCategory(c);
    setScreen("exercise");
  };

  const handleBack = () => {
    if (screen === "exercise") setScreen("categories");
    else if (screen === "categories") setScreen("levels");
  };

  const bumpClarity = (amount: number) => {
    setClarity((prev) => Math.min(1, prev + amount));
  };

  const handleVocabComplete = () => {
    bumpClarity(1);
    saveProgress(level, "vocabulary", "flashcards", 0, true);
    handleBack();
  };

  const handleQuizComplete = (score: number) => {
    bumpClarity(1);
    saveProgress(level, "grammar", "quiz", score, true);
    handleBack();
  };

  const handleReadingComplete = () => {
    bumpClarity(1);
    saveProgress(level, "reading", "reading", 0, true);
    handleBack();
  };

  const handleListeningComplete = () => {
    bumpClarity(1);
    saveProgress(level, "listening", "listening", 0, true);
    handleBack();
  };

  const renderExercise = () => {
    if (dataLoading || !data) {
      return <p className="text-muted-foreground text-center">{t("loading")}</p>;
    }
    switch (category) {
      case "vocabulary":
        return <Flashcard cards={data.vocabulary} onComplete={handleVocabComplete} />;
      case "grammar":
        return (
          <div className="flex flex-col gap-6 animate-slide-up">
            <div className="glass-card p-6">
              <div
                className="prose prose-invert prose-sm max-w-none [&_h2]:text-primary [&_h2]:font-display [&_strong]:text-foreground"
                dangerouslySetInnerHTML={{
                  __html: data.grammar.theory
                    .replace(/## (.*)/g, "<h2>$1</h2>")
                    .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
                    .replace(/\n\n/g, "<br/><br/>"),
                }}
              />
            </div>
            <Quiz questions={data.grammar.questions} onComplete={handleQuizComplete} />
          </div>
        );
      case "reading":
        return <ReadingExercise readings={data.reading} onComplete={handleReadingComplete} />;
      case "listening":
        return <ListeningExercise listenings={data.listening} onComplete={handleListeningComplete} />;
    }
  };

  return (
    <div className="flex flex-col min-h-full">
      {/* Fog overlay — only visible during exercises */}
      {screen === "exercise" && (
        <div className="fog-overlay" style={{ "--clarity": clarity } as React.CSSProperties} />
      )}

      <div className={`flex-1 w-full mx-auto px-4 relative z-10 flex flex-col items-center justify-center ${isMobile ? "max-w-md py-4" : "max-w-3xl py-8"}`}>
        {screen === "exercise" && (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("back")}
          </button>
        )}

        {screen === "levels" && (
          <>
            <LevelSelector onSelect={handleLevelSelect} />
            <div className={`w-full mt-4 ${isMobile ? "max-w-md" : "max-w-2xl"} mx-auto`}>
              <DailyChallenge />
            </div>
          </>
        )}
        {screen === "categories" && (
          <CategorySelector level={level} onSelect={handleCategorySelect} onBack={() => setScreen("levels")} />
        )}
        {screen === "exercise" && renderExercise()}
      </div>
    </div>
  );
};

export default Index;
