import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Recycle, Coffee, Swords, Mic, ArrowLeft } from "lucide-react";
import { usePlatform } from "@/hooks/usePlatform";
import ArticleSorter from "@/components/games/ArticleSorter";
import CafeBestellung from "@/components/games/CafeBestellung";
import PronunciationTrainer from "@/components/games/PronunciationTrainer";
import Challenges from "@/pages/Challenges";

type GameScreen = "list" | "article-sorter" | "cafe" | "challenges" | "pronunciation";

const Games = () => {
  const [screen, setScreen] = useState<GameScreen>("list");
  const { isMobile } = usePlatform();
  const location = useLocation();
  const navigate = useNavigate();

  // Handle navigation from UserProfileDialog
  useEffect(() => {
    const state = location.state as any;
    if (state?.screen === "challenges") {
      setScreen("challenges");
    }
  }, [location.state]);

  if (screen === "article-sorter") {
    return <ArticleSorter onBack={() => setScreen("list")} />;
  }

  if (screen === "cafe") {
    return <CafeBestellung onBack={() => setScreen("list")} />;
  }

  if (screen === "challenges") {
    return <Challenges onBack={() => setScreen("list")} />;
  }

  if (screen === "pronunciation") {
    return <PronunciationTrainer onBack={() => setScreen("list")} />;
  }

  return (
    <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Назад
      </button>
      <h1 className="font-display text-xl font-bold text-foreground mb-1 flex items-center gap-2">
        🎮 Мини-игры
      </h1>
      <p className="text-sm text-muted-foreground mb-6">Учи немецкий играючи</p>

      <div className="space-y-3">
        <button
          onClick={() => setScreen("article-sorter")}
          className="w-full glass-card p-5 flex items-center gap-4 text-left hover:border-primary/30 transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-yellow-glow/20 flex items-center justify-center text-2xl flex-shrink-0">
            ♻️
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">
              Der/Die/Das: Сортировка мусора
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Сортируй слова по артиклям — как мусор в Германии!
            </p>
          </div>
          <Recycle className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
        </button>

        <button
          onClick={() => setScreen("cafe")}
          className="w-full glass-card p-5 flex items-center gap-4 text-left hover:border-primary/30 transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-muted/30 to-primary/20 flex items-center justify-center text-2xl flex-shrink-0">
            ☕
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">
              Café Bestellung: Не будь туристом
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Закажи кофе как настоящий берлинец — успей ответить бармену!
            </p>
          </div>
          <Coffee className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
        </button>

        <button
          onClick={() => setScreen("challenges")}
          className="w-full glass-card p-5 flex items-center gap-4 text-left hover:border-primary/30 transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-destructive/20 flex items-center justify-center text-2xl flex-shrink-0">
            ⚔️
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">
              Дуэли: Вызови друга
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Соревнуйся с друзьями — кто лучше знает немецкий!
            </p>
          </div>
          <Swords className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
        </button>

        <button
          onClick={() => setScreen("pronunciation")}
          className="w-full glass-card p-5 flex items-center gap-4 text-left hover:border-primary/30 transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl flex-shrink-0">
            🗣
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">
              Произношение: Sprich nach!
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Слушай, повторяй и сравнивай своё произношение с эталоном
            </p>
          </div>
          <Mic className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
        </button>
      </div>
    </div>
  );
};

export default Games;
