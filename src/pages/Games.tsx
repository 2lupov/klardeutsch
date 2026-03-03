import { useState } from "react";
import { ArrowLeft, Recycle } from "lucide-react";
import { usePlatform } from "@/hooks/usePlatform";
import ArticleSorter from "@/components/games/ArticleSorter";

type GameScreen = "list" | "article-sorter";

const Games = () => {
  const [screen, setScreen] = useState<GameScreen>("list");
  const { isMobile } = usePlatform();

  if (screen === "article-sorter") {
    return <ArticleSorter onBack={() => setScreen("list")} />;
  }

  return (
    <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
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

        {/* Placeholder for future games */}
        <div className="glass-card p-5 flex items-center gap-4 opacity-40">
          <div className="w-12 h-12 rounded-2xl bg-muted/30 flex items-center justify-center text-2xl flex-shrink-0">
            🔜
          </div>
          <div className="flex-1">
            <h3 className="font-display text-sm font-bold text-muted-foreground">Скоро...</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Новые игры в разработке</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Games;
