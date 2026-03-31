import { useState, useEffect } from "react";
import { Level, CategoryData } from "@/data/lessons";
import { fetchLevelData, fetchTopics } from "@/hooks/useLessons";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import TheoryRenderer from "@/components/course/TheoryRenderer";
import { useProgress } from "@/hooks/useProgress";
import { usePlatform } from "@/hooks/usePlatform";
import { useDailySummary } from "@/hooks/useDailySummary";
import LevelSelector from "@/components/LevelSelector";
import CategorySelector from "@/components/CategorySelector";
import TopicSelector from "@/components/TopicSelector";
import Flashcard from "@/components/Flashcard";
import Quiz from "@/components/Quiz";
import ReadingExercise from "@/components/ReadingExercise";
import ListeningExercise from "@/components/ListeningExercise";
import WritingExercise from "@/components/WritingExercise";
import DailyChallenge from "@/components/DailyChallenge";
import SRSWidget from "@/components/SRSWidget";
import DailySummaryModal from "@/components/daily/DailySummaryModal";
import { ArrowLeft, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

type Category = "vocabulary" | "grammar" | "reading" | "listening" | "writing";
type Screen = "levels" | "categories" | "topics" | "exercise";

const Index = () => {
  const [screen, setScreen] = useState<Screen>("levels");
  const [level, setLevel] = useState<Level>("A1");
  const [category, setCategory] = useState<Category>("vocabulary");
  const [topic, setTopic] = useState<string>("Allgemein");
  const [topics, setTopics] = useState<string[]>([]);
  const [data, setData] = useState<CategoryData | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [clarity, setClarity] = useState(0);
  const { user } = useAuth();
  const { saveProgress } = useProgress();
  const { t, lang } = useLanguage();
  const { isMobile } = usePlatform();
  const { showSummary, triggerSummary, closeSummary } = useDailySummary();
  const navigate = useNavigate();

  // Load data when entering exercise
  useEffect(() => {
    if (screen === "exercise") {
      setDataLoading(true);
      fetchLevelData(level, topic).then((d) => {
        setData(d);
        setDataLoading(false);
      });
    }
  }, [level, screen, topic]);

  const [singleTopic, setSingleTopic] = useState(false);

  // Load topics when entering topics screen
  useEffect(() => {
    if (screen === "topics" && category !== "writing") {
      setDataLoading(true);
      fetchTopics(level, category as "vocabulary" | "grammar" | "reading" | "listening").then((t) => {
        if (t.length === 1) {
          // Only one topic — skip selection
          setSingleTopic(true);
          setTopic(t[0]);
          setScreen("exercise");
        } else {
          setSingleTopic(false);
          setTopics(t);
          setDataLoading(false);
        }
      });
    }
  }, [screen, level, category]);

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
    if (c === "writing") {
      setScreen("exercise");
    } else {
      setScreen("topics");
    }
  };

  const handleTopicSelect = (t: string) => {
    setTopic(t);
    setScreen("exercise");
  };

  const handleBack = () => {
    if (screen === "exercise") {
      // If there was only one topic, skip topics screen and go to categories
      if (singleTopic) {
        setSingleTopic(false);
        setScreen("categories");
      } else {
        setScreen("topics");
      }
    } else if (screen === "topics") setScreen("categories");
    else if (screen === "categories") setScreen("levels");
  };

  const bumpClarity = (amount: number) => {
    setClarity((prev) => Math.min(1, prev + amount));
  };

  const handleVocabComplete = () => {
    bumpClarity(1);
    saveProgress(level, "vocabulary", "flashcards", 0, true);
    triggerSummary();
    handleBack();
  };

  const handleQuizComplete = (score: number) => {
    bumpClarity(1);
    saveProgress(level, "grammar", "quiz", score, true);
    triggerSummary();
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

  const handleWritingComplete = () => {
    bumpClarity(1);
    saveProgress(level, "writing", "writing", 0, true);
    // Writing skips topics, go straight to categories
    setScreen("categories");
  };

  const renderExercise = () => {
    if (category === "writing") {
      return (
        <WritingExercise
          level={level}
          onComplete={handleWritingComplete}
          onBack={handleBack}
        />
      );
    }
    if (dataLoading || !data) {
      return <p className="text-muted-foreground text-center">{t("loading")}</p>;
    }
    const emptyState = (
      <div className="flex flex-col items-center justify-center gap-4 py-12 animate-slide-up">
        <p className="text-4xl">📭</p>
        <p className="text-muted-foreground text-center">{t("contentComingSoon")}</p>
        <button onClick={handleBack} className="text-primary hover:underline text-sm">{t("back")}</button>
      </div>
    );

    switch (category) {
      case "vocabulary":
        if (data.vocabulary.length === 0) return emptyState;
        return <Flashcard cards={data.vocabulary} onComplete={handleVocabComplete} />;
      case "grammar":
        if (!data.grammar.theory && data.grammar.questions.length === 0) return emptyState;
        return (
          <div className="flex flex-col gap-6 animate-slide-up">
            <div className="glass-card p-6">
              <TheoryRenderer theory={data.grammar.theory} lang={lang} />
            </div>
            <Quiz questions={data.grammar.questions} onComplete={handleQuizComplete} level={level} category="grammar" />
          </div>
        );
      case "reading":
        if (data.reading.length === 0) return emptyState;
        return <ReadingExercise readings={data.reading} onComplete={handleReadingComplete} level={level} />;
      case "listening":
        if (data.listening.length === 0) return emptyState;
        return <ListeningExercise listenings={data.listening} onComplete={handleListeningComplete} />;
    }
  };

  return (
    <div className={`flex flex-col ${isMobile ? "min-h-full" : "h-full"}`}>
      {screen === "exercise" && (
        <div className="fog-overlay" style={{ "--clarity": clarity } as React.CSSProperties} />
      )}

      <div className={`flex-1 w-full mx-auto px-4 relative z-10 flex flex-col items-center justify-center ${isMobile ? "max-w-md py-4" : "max-w-4xl py-4"}`}>
        {screen === "exercise" && (
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            {t("back")}
          </button>
        )}

        {screen === "levels" && (
          <>
            <LevelSelector onSelect={handleLevelSelect} />
            <div className={`w-full mt-3 ${isMobile ? "max-w-md" : "max-w-2xl"} mx-auto space-y-3`}>
              <SRSWidget />
              <DailyChallenge />
            </div>
          </>
        )}
        {screen === "categories" && (
          <CategorySelector level={level} onSelect={handleCategorySelect} onBack={() => setScreen("levels")} />
        )}
        {screen === "topics" && (
          dataLoading ? (
            <p className="text-muted-foreground text-center">{t("loading")}</p>
          ) : (
            <TopicSelector
              level={level}
              category={category as "vocabulary" | "grammar" | "reading" | "listening"}
              topics={topics}
              onSelect={handleTopicSelect}
              onBack={() => setScreen("categories")}
            />
          )
        )}
        {screen === "exercise" && renderExercise()}
      </div>
      <DailySummaryModal open={showSummary} onClose={closeSummary} />
    </div>
  );
};

export default Index;
