import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, X, Sparkles } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  image_url: string | null;
  rarity: string;
  price: number;
  description_ru: string | null;
  description_uk: string | null;
}

interface UserGift {
  id: string;
  gift_id: string;
  sender_id: string;
  message: string | null;
  created_at: string;
  displayed: boolean;
  gift_items: GiftItem;
}

interface SenderProfile {
  display_name: string | null;
  avatar_url: string | null;
}

const rarityLabel: Record<string, Record<string, string>> = {
  common: { ru: "Обычный", uk: "Звичайний" },
  rare: { ru: "Редкий", uk: "Рідкісний" },
  epic: { ru: "Эпический", uk: "Епічний" },
  legendary: { ru: "Легендарный", uk: "Легендарний" },
};

const rarityColor: Record<string, string> = {
  common: "text-muted-foreground",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-amber-400",
};

const rarityBg: Record<string, string> = {
  common: "from-muted/20 to-transparent",
  rare: "from-blue-500/10 to-transparent",
  epic: "from-purple-500/10 to-transparent",
  legendary: "from-amber-500/10 to-transparent",
};

interface GiftShelfProps {
  userId: string;
  compact?: boolean;
}

const GiftShelf = ({ userId, compact = false }: GiftShelfProps) => {
  const { lang } = useLanguage();
  const [gifts, setGifts] = useState<UserGift[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<UserGift | null>(null);
  const [senderName, setSenderName] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("user_gifts")
        .select("id, gift_id, sender_id, message, created_at, displayed, gift_items(id, name, emoji, image_url, rarity, price, description_ru, description_uk)")
        .eq("receiver_id", userId)
        .order("created_at", { ascending: false })
        .limit(30) as any;
      setGifts(data ?? []);
      setLoading(false);
    };
    load();
  }, [userId]);

  const openGift = async (g: UserGift) => {
    setSelected(g);
    // Load sender name
    const { data } = await supabase
      .from("profiles")
      .select("display_name")
      .eq("user_id", g.sender_id)
      .single();
    setSenderName(data?.display_name || (lang === "uk" ? "Хтось" : "Кто-то"));

    // Mark as displayed if not yet
    if (!g.displayed) {
      await supabase.from("user_gifts").update({ displayed: true }).eq("id", g.id);
      setGifts(prev => prev.map(x => x.id === g.id ? { ...x, displayed: true } : x));
    }
  };

  if (loading || gifts.length === 0) return null;

  const item = selected?.gift_items;

  return (
    <div className={compact ? "" : "glass-card p-4"}>
      {!compact && (
        <h3 className="flex items-center gap-2 text-sm font-display font-semibold text-foreground mb-3">
          <Gift className="w-4 h-4 text-primary" />
          {lang === "uk" ? "Подарунки" : "Подарки"} ({gifts.length})
        </h3>
      )}
      <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide overscroll-x-contain" style={{ overflowY: "hidden" }}>
        {gifts.map((g, i) => {
          const gi = g.gift_items;
          const isNew = !g.displayed;
          return (
            <motion.button
              key={g.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 300 }}
              onClick={() => openGift(g)}
              className="flex-shrink-0 relative group"
            >
              <div className="w-14 h-14 flex items-center justify-center transition-transform group-hover:scale-110 group-active:scale-95">
                {gi.image_url ? (
                  <img src={gi.image_url} alt={gi.name} className="w-12 h-12 object-contain drop-shadow-md" loading="lazy" />
                ) : (
                  <span className="text-3xl drop-shadow-md">{gi.emoji}</span>
                )}
              </div>
              {isNew && (
                <motion.span
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-primary shadow-lg"
                />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-xs p-0 overflow-hidden border-border/30 bg-background">
          <DialogTitle className="sr-only">{item?.name}</DialogTitle>
          {item && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center"
            >
              {/* Gradient header */}
              <div className={`w-full pt-8 pb-6 flex flex-col items-center bg-gradient-to-b ${rarityBg[item.rarity]}`}>
                <motion.div
                  initial={{ y: -20, scale: 0.8 }}
                  animate={{ y: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                >
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-24 h-24 object-contain drop-shadow-lg" />
                  ) : (
                    <span className="text-6xl drop-shadow-lg">{item.emoji}</span>
                  )}
                </motion.div>
              </div>

              {/* Info */}
              <div className="px-6 pb-6 pt-4 w-full text-center space-y-3">
                <div>
                  <h3 className="font-display font-bold text-lg text-foreground">{item.name}</h3>
                  <span className={`text-xs font-semibold ${rarityColor[item.rarity]}`}>
                    {rarityLabel[item.rarity]?.[lang] || item.rarity}
                  </span>
                </div>

                {(lang === "uk" ? item.description_uk : item.description_ru) && (
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {lang === "uk" ? item.description_uk : item.description_ru}
                  </p>
                )}

                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    💰 {item.price} {lang === "uk" ? "монет" : "монет"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    {rarityLabel[item.rarity]?.[lang]}
                  </span>
                </div>

                {senderName && (
                  <p className="text-xs text-muted-foreground">
                    {lang === "uk" ? "Від" : "От"}: <span className="font-semibold text-foreground">@{senderName}</span>
                  </p>
                )}

                {selected?.message && (
                  <div className="bg-muted/30 rounded-xl px-4 py-3 text-sm text-foreground italic">
                    «{selected.message}»
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GiftShelf;
