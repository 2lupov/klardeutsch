import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Recycle, Coffee, Swords, Mic, ArrowLeft, Building2, Hammer } from "lucide-react";
import { usePlatform } from "@/hooks/usePlatform";
import { useLanguage } from "@/contexts/LanguageContext";
import ArticleSorter from "@/components/games/ArticleSorter";
import CafeBestellung from "@/components/games/CafeBestellung";
import PronunciationTrainer from "@/components/games/PronunciationTrainer";
import LebenInDeutschland from "@/components/games/LebenInDeutschland";
import Wortbaustelle from "@/components/games/Wortbaustelle";
import Challenges from "@/pages/Challenges";

type GameScreen = "list" | "article-sorter" | "cafe" | "challenges" | "pronunciation" | "leben" | "wortbaustelle";

const Games = () => {
  const [screen, setScreen] = useState<GameScreen>("list");
  const { isMobile } = usePlatform();
  const { t } = useLanguage();
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

  if (screen === "leben") {
    return <LebenInDeutschland onBack={() => setScreen("list")} />;
  }

  if (screen === "wortbaustelle") {
    return <Wortbaustelle onBack={() => setScreen("list")} />;
  }

  return (
    <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("back")}
      </button>
      <h1 className="font-display text-xl font-bold text-foreground mb-1 flex items-center gap-2">
        🎮 {t("gamesTitle")}
      </h1>
      <p className="text-sm text-muted-foreground mb-6">{t("gamesSubtitle")}</p>

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
              {t("gameArticleSorterTitle")}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t("gameArticleSorterDesc")}
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
              {t("gameCafeTitle")}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t("gameCafeDesc")}
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
              {t("gameDuelsTitle")}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t("gameDuelsDesc")}
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
              {t("gamePronunciationTitle")}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t("gamePronunciationDesc")}
            </p>
          </div>
          <Mic className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
        </button>

        <button
          onClick={() => setScreen("leben")}
          className="w-full glass-card p-5 flex items-center gap-4 text-left hover:border-primary/30 transition-all group"
        >
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-muted/30 flex items-center justify-center text-2xl flex-shrink-0">
            🏛
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">
              {t("gameLebenTitle")}
            </h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {t("gameLebenDesc")}
            </p>
          </div>
          <Building2 className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
        </button>
      </div>
    </div>
  );
};

export default Games;
