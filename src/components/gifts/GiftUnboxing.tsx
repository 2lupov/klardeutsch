import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, Sparkles } from "lucide-react";

interface GiftItem {
  name: string;
  emoji: string;
  image_url: string | null;
  rarity: string;
  description_ru: string | null;
  description_uk: string | null;
}

interface NewGift {
  id: string;
  sender_id: string;
  message: string | null;
  gift_items: GiftItem;
}

const rarityLabel: Record<string, Record<string, string>> = {
  common: { ru: "Обычный", uk: "Звичайний" },
  rare: { ru: "Редкий", uk: "Рідкісний" },
  epic: { ru: "Эпический", uk: "Епічний" },
  legendary: { ru: "Легендарний", uk: "Легендарний" },
};

const rarityColor: Record<string, string> = {
  common: "text-muted-foreground",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-amber-400",
};

interface Props {
  userId: string;
}

const GiftUnboxing = ({ userId }: Props) => {
  const { lang } = useLanguage();
  const [newGifts, setNewGifts] = useState<NewGift[]>([]);
  const [current, setCurrent] = useState(0);
  const [senderName, setSenderName] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("user_gifts")
        .select("id, sender_id, message, gift_items(name, emoji, image_url, rarity, description_ru, description_uk)")
        .eq("receiver_id", userId)
        .eq("displayed", false)
        .order("created_at", { ascending: true })
        .limit(10) as any;
      if (data && data.length > 0) {
        setNewGifts(data);
        loadSender(data[0].sender_id);
      }
    };
    load();
  }, [userId]);

  const loadSender = async (senderId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", senderId)
      .single();
    setSenderName(data?.display_name || "?");
  };

  const markDisplayed = async (giftId: string) => {
    await supabase.from("user_gifts").update({ displayed: true }).eq("id", giftId);
  };

  const handleReveal = () => setRevealed(true);

  const handleNext = async () => {
    await markDisplayed(newGifts[current].id);
    if (current + 1 < newGifts.length) {
      setCurrent(current + 1);
      setRevealed(false);
      setSenderName("");
      loadSender(newGifts[current + 1].sender_id);
    } else {
      setDismissed(true);
    }
  };

  if (dismissed || newGifts.length === 0) return null;

  const gift = newGifts[current];
  const item = gift?.gift_items;
  if (!item) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6"
        onClick={(e) => e.target === e.currentTarget && handleNext()}
      >
        <motion.div
          initial={{ scale: 0.7, y: 40 }}
          animate={{ scale: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 250, damping: 20 }}
          className="w-full max-w-xs rounded-3xl bg-card border border-border/30 overflow-hidden shadow-2xl"
        >
          {!revealed ? (
            /* Wrapped gift */
            <motion.button
              onClick={handleReveal}
              className="w-full flex flex-col items-center gap-4 py-12 px-6"
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={{ y: [0, -8, 0], rotate: [0, -3, 3, 0] }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Gift className="w-14 h-14 text-primary" />
                </div>
              </motion.div>
              <div className="text-center">
                <p className="font-display font-bold text-foreground text-lg">
                  {lang === "uk" ? "Новий подарунок!" : "Новый подарок!"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {lang === "uk" ? "Натисни, щоб відкрити" : "Нажми, чтобы открыть"}
                </p>
                {newGifts.length > 1 && (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    {current + 1} / {newGifts.length}
                  </p>
                )}
              </div>
            </motion.button>
          ) : (
            /* Revealed gift */
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center"
            >
              <div className="w-full pt-8 pb-4 flex flex-col items-center">
                <motion.div
                  initial={{ scale: 0, rotate: -20 }}
                  animate={{ scale: 1, rotate: 0 }}
                  transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
                >
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-28 h-28 object-contain drop-shadow-lg" />
                  ) : (
                    <span className="text-7xl drop-shadow-lg">{item.emoji}</span>
                  )}
                </motion.div>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                  className="flex items-center gap-1 mt-3"
                >
                  <Sparkles className="w-3 h-3 text-primary" />
                  <span className={`text-xs font-semibold ${rarityColor[item.rarity]}`}>
                    {rarityLabel[item.rarity]?.[lang] || item.rarity}
                  </span>
                </motion.div>
              </div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
                className="px-6 pb-6 w-full text-center space-y-3"
              >
                <h3 className="font-display font-bold text-lg text-foreground">{item.name}</h3>

                {(lang === "uk" ? item.description_uk : item.description_ru) && (
                  <p className="text-sm text-muted-foreground">
                    {lang === "uk" ? item.description_uk : item.description_ru}
                  </p>
                )}

                {senderName && (
                  <p className="text-xs text-muted-foreground">
                    {lang === "uk" ? "Від" : "От"} <span className="font-semibold text-foreground">@{senderName}</span>
                  </p>
                )}

                {gift.message && (
                  <div className="bg-muted/30 rounded-xl px-4 py-3 text-sm text-foreground italic">
                    «{gift.message}»
                  </div>
                )}

                <button
                  onClick={handleNext}
                  className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm mt-2"
                >
                  {current + 1 < newGifts.length
                    ? (lang === "uk" ? "Далі" : "Дальше")
                    : (lang === "uk" ? "Чудово!" : "Отлично!")}
                </button>
              </motion.div>
            </motion.div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default GiftUnboxing;
