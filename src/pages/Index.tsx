import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Level, CategoryData } from "@/data/lessons";
import { fetchLevelData } from "@/hooks/useLessons";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useProgress } from "@/hooks/useProgress";
import LevelSelector from "@/components/LevelSelector";
import CategorySelector from "@/components/CategorySelector";
import Flashcard from "@/components/Flashcard";
import Quiz from "@/components/Quiz";
import ReadingExercise from "@/components/ReadingExercise";
import { ArrowLeft, LogOut } from "lucide-react";

type Category = "vocabulary" | "grammar" | "reading";
type Screen = "levels" | "categories" | "exercise";

const Index = () => {
  const [screen, setScreen] = useState<Screen>("levels");
  const [level, setLevel] = useState<Level>("A1");
  const [category, setCategory] = useState<Category>("vocabulary");
  const [data, setData] = useState<CategoryData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const { user, loading, signOut } = useAuth();
  const { saveProgress } = useProgress();
  const { t } = useLanguage();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/auth");
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (screen !== "levels") {
      setDataLoading(true);
      fetchLevelData(level).then((d) => {
        setData(d);
        setDataLoading(false);
      });
    }
  }, [level, screen]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <span className="text-muted-foreground">{t("loading")}</span>
      </div>
    );
  }

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

  const handleVocabComplete = () => {
    saveProgress(level, "vocabulary", "flashcards", 0, true);
    handleBack();
  };

  const handleQuizComplete = (score: number) => {
    saveProgress(level, "grammar", "quiz", score, true);
    handleBack();
  };

  const handleReadingComplete = () => {
    saveProgress(level, "reading", "reading", 0, true);
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
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 w-full max-w-md mx-auto px-4 py-6">
        {screen === "exercise" && (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("back")}
          </button>
        )}

        {screen === "levels" && <LevelSelector onSelect={handleLevelSelect} />}
        {screen === "categories" && (
          <CategorySelector level={level} onSelect={handleCategorySelect} onBack={() => setScreen("levels")} />
        )}
        {screen === "exercise" && renderExercise()}
      </div>

      <div className="w-full border-t border-border bg-card/50 backdrop-blur-lg">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-between">
          <span className="text-xs text-muted-foreground font-display tracking-wider">
            KLAR · Deutsch lernen
          </span>
          <button
            onClick={signOut}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t("signOut")}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Index;
