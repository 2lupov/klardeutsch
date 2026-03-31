import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useSRS, SRSCardWithWord } from "@/hooks/useSRS";
import { useXP } from "@/hooks/useXP";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, Eye } from "lucide-react";

const qualityButtons = [
  { q: 1, emoji: "😰", ru: "Не знал", uk: "Не знав", color: "border-red-400/30 bg-red-400/10 text-red-300" },
  { q: 2, emoji: "🤔", ru: "С трудом", uk: "Важко", color: "border-orange-400/30 bg-orange-400/10 text-orange-300" },
  { q: 4, emoji: "🙂", ru: "Помню", uk: "Пам'ятаю", color: "border-green-400/30 bg-green-400/10 text-green-300" },
  { q: 5, emoji: "😎", ru: "Легко", uk: "Легко", color: "border-primary/30 bg-primary/10 text-primary" },
];

const Review = () => {
  const { fetchDueCards, reviewCard } = useSRS();
  const { awardXP } = useXP();
  const { lang } = useLanguage();
  const navigate = useNavigate();

  const [cards, setCards] = useState<SRSCardWithWord[]>([]);
  const [current, setCurrent] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [done, setDone] = useState(false);
  const [reviewed, setReviewed] = useState(0);

  useEffect(() => {
    fetchDueCards().then((c) => {
      if (c && c.length) setCards(c);
      else setDone(true);
    });
  }, []);

  const handleQuality = async (q: number) => {
    if (!cards[current]) return;
    await reviewCard(cards[current].id, q);
    setReviewed((r) => r + 1);
    setFlipped(false);

    if (current + 1 >= cards.length) {
      const xp = Math.max(5, cards.length * 2);
      await awardXP(xp);
      setDone(true);
    } else {
      setCurrent((c) => c + 1);
    }
  };

  if (done) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-6 text-center">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
          <p className="text-5xl mb-4">🎉</p>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {lang === "uk" ? "Повторення завершено!" : "Повторение завершено!"}
          </h2>
          <p className="text-muted-foreground mb-6">
            {reviewed} {lang === "uk" ? "карток переглянуто" : "карточек просмотрено"}
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold"
          >
            {lang === "uk" ? "На головну" : "На главную"}
          </button>
        </motion.div>
      </div>
    );
  }

  const card = cards[current];
  if (!card) return null;

  return (
    <div className="min-h-[100dvh] bg-background p-6">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button onClick={() => navigate(-1)} className="text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <span className="text-sm text-muted-foreground">
            {current + 1}/{cards.length}
          </span>
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -30 }}
            className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-8 shadow-2xl text-center min-h-[200px] flex flex-col items-center justify-center cursor-pointer"
            onClick={() => !flipped && setFlipped(true)}
          >
            {!flipped ? (
              <>
                <p className="text-sm text-muted-foreground mb-1">{card.article || ""}</p>
                <p className="text-3xl font-bold text-foreground mb-4">{card.german}</p>
                <p className="text-sm text-muted-foreground flex items-center gap-1">
                  <Eye className="w-4 h-4" />
                  {lang === "uk" ? "Натисни для перекладу" : "Нажми для перевода"}
                </p>
              </>
            ) : (
              <>
                <p className="text-2xl font-bold text-primary mb-2">
                  {lang === "uk" ? (card.ukrainian || card.russian) : card.russian}
                </p>
                {card.example && (
                  <p className="text-sm text-muted-foreground italic">{card.example}</p>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>

        {flipped && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-2 mt-6"
          >
            {qualityButtons.map((b) => (
              <button
                key={b.q}
                onClick={() => handleQuality(b.q)}
                className={`py-3 rounded-xl border font-medium ${b.color}`}
              >
                {b.emoji} {lang === "uk" ? b.uk : b.ru}
              </button>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default Review;
