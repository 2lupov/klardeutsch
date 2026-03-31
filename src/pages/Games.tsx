import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Recycle, Coffee, Swords, Mic, ArrowLeft, Building2, Hammer, Puzzle, FileText, Link2, Phone, MessageCircle } from "lucide-react";
import { usePlatform } from "@/hooks/usePlatform";
import { useLanguage } from "@/contexts/LanguageContext";
import ArticleSorter from "@/components/games/ArticleSorter";
import CafeBestellung from "@/components/games/CafeBestellung";
import PronunciationTrainer from "@/components/games/PronunciationTrainer";
import LebenInDeutschland from "@/components/games/LebenInDeutschland";
import Wortbaustelle from "@/components/games/Wortbaustelle";
import Satzpuzzle from "@/components/games/Satzpuzzle";
import FormularHeld from "@/components/games/FormularHeld";
import RedewendungenMatch from "@/components/games/RedewendungenMatch";
import TelefonTrainer from "@/components/games/TelefonTrainer";
import Challenges from "@/pages/Challenges";
import Dialogues from "@/pages/Dialogues";

type GameScreen = "list" | "article-sorter" | "cafe" | "challenges" | "pronunciation" | "leben" | "wortbaustelle" | "satzpuzzle" | "formular" | "redewendungen" | "telefon" | "dialogues";

const Games = () => {
  const [screen, setScreen] = useState<GameScreen>("list");
  const { isMobile } = usePlatform();
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const state = location.state as any;
    if (state?.screen === "challenges") {
      setScreen("challenges");
    }
  }, [location.state]);

  if (screen === "article-sorter") return <ArticleSorter onBack={() => setScreen("list")} />;
  if (screen === "cafe") return <CafeBestellung onBack={() => setScreen("list")} />;
  if (screen === "challenges") return <Challenges onBack={() => setScreen("list")} />;
  if (screen === "pronunciation") return <PronunciationTrainer onBack={() => setScreen("list")} />;
  if (screen === "leben") return <LebenInDeutschland onBack={() => setScreen("list")} />;
  if (screen === "wortbaustelle") return <Wortbaustelle onBack={() => setScreen("list")} />;
  if (screen === "satzpuzzle") return <Satzpuzzle onBack={() => setScreen("list")} />;
  if (screen === "formular") return <FormularHeld onBack={() => setScreen("list")} />;
  if (screen === "redewendungen") return <RedewendungenMatch onBack={() => setScreen("list")} />;
  if (screen === "telefon") return <TelefonTrainer onBack={() => setScreen("list")} />;
  if (screen === "dialogues") return (
    <div className="relative">
      <div className="absolute top-4 left-4 z-10">
        <button onClick={() => setScreen("list")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> {t("back")}
        </button>
      </div>
      <Dialogues />
    </div>
  );

  const games = [
    { id: "dialogues" as const, emoji: "💬", icon: MessageCircle, titleKey: "navDialogues", descKey: "gameDialoguesDesc" },
    { id: "article-sorter" as const, emoji: "♻️", icon: Recycle, titleKey: "gameArticleSorterTitle", descKey: "gameArticleSorterDesc" },
    { id: "cafe" as const, emoji: "☕", icon: Coffee, titleKey: "gameCafeTitle", descKey: "gameCafeDesc" },
    { id: "satzpuzzle" as const, emoji: "🧩", icon: Puzzle, titleKey: "gameSatzpuzzleTitle", descKey: "gameSatzpuzzleDesc", isNew: true },
    { id: "formular" as const, emoji: "📬", icon: FileText, titleKey: "gameFormularTitle", descKey: "gameFormularDesc", isNew: true },
    { id: "redewendungen" as const, emoji: "🔗", icon: Link2, titleKey: "gameRedewendungenTitle", descKey: "gameRedewendungenDesc", isNew: true },
    { id: "telefon" as const, emoji: "📞", icon: Phone, titleKey: "gameTelefonTitle", descKey: "gameTelefonDesc", isNew: true },
    { id: "challenges" as const, emoji: "⚔️", icon: Swords, titleKey: "gameDuelsTitle", descKey: "gameDuelsDesc" },
    { id: "pronunciation" as const, emoji: "🗣", icon: Mic, titleKey: "gamePronunciationTitle", descKey: "gamePronunciationDesc" },
    { id: "leben" as const, emoji: "🏛", icon: Building2, titleKey: "gameLebenTitle", descKey: "gameLebenDesc" },
    { id: "wortbaustelle" as const, emoji: "🏗️", icon: Hammer, titleKey: "gameWortbaustelleTitle", descKey: "gameWortbaustelleDesc" },
  ];

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
        {games.map(game => {
          const Icon = game.icon;
          return (
            <button
              key={game.id}
              onClick={() => setScreen(game.id)}
              className="w-full glass-card p-5 flex items-center gap-4 text-left hover:border-primary/30 transition-all group relative"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-muted/30 flex items-center justify-center text-2xl flex-shrink-0">
                {game.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors flex items-center gap-2">
                  {t(game.titleKey as any)}
                  {game.isNew && (
                    <span className="px-1.5 py-0.5 rounded-full bg-primary/15 text-primary text-[9px] font-semibold uppercase">new</span>
                  )}
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {t(game.descKey as any)}
                </p>
              </div>
              <Icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Games;
