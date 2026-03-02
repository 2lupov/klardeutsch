import { useState } from "react";
import { Level, lessonsData } from "@/data/lessons";
import LevelSelector from "@/components/LevelSelector";
import CategorySelector from "@/components/CategorySelector";
import Flashcard from "@/components/Flashcard";
import Quiz from "@/components/Quiz";
import ReadingExercise from "@/components/ReadingExercise";
import { ArrowLeft } from "lucide-react";

type Category = "vocabulary" | "grammar" | "reading";
type Screen = "levels" | "categories" | "exercise";

const Index = () => {
  const [screen, setScreen] = useState<Screen>("levels");
  const [level, setLevel] = useState<Level>("A1");
  const [category, setCategory] = useState<Category>("vocabulary");

  const data = lessonsData[level];

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

  const renderExercise = () => {
    switch (category) {
      case "vocabulary":
        return <Flashcard cards={data.vocabulary} onComplete={handleBack} />;
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
            <Quiz questions={data.grammar.questions} onComplete={handleBack} />
          </div>
        );
      case "reading":
        return <ReadingExercise readings={data.reading} onComplete={handleBack} />;
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
            Назад
          </button>
        )}

        {screen === "levels" && <LevelSelector onSelect={handleLevelSelect} />}
        {screen === "categories" && (
          <CategorySelector level={level} onSelect={handleCategorySelect} onBack={() => setScreen("levels")} />
        )}
        {screen === "exercise" && renderExercise()}
      </div>

      {/* Bottom bar */}
      <div className="w-full border-t border-border bg-card/50 backdrop-blur-lg">
        <div className="max-w-md mx-auto px-4 py-3 flex items-center justify-center">
          <span className="text-xs text-muted-foreground font-display tracking-wider">
            KLAR · Deutsch lernen
          </span>
        </div>
      </div>
    </div>
  );
};

export default Index;
