import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Gift } from "lucide-react";

interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  image_url: string | null;
  rarity: string;
}

interface UserGift {
  id: string;
  gift_id: string;
  sender_id: string;
  message: string | null;
  created_at: string;
  gift_items: GiftItem;
}

const rarityBorder: Record<string, string> = {
  common: "border-border",
  rare: "border-blue-400/50",
  epic: "border-purple-400/50",
  legendary: "border-yellow-400/50 shadow-[0_0_12px_hsl(var(--yellow-glow)/0.3)]",
};

const rarityGlow: Record<string, string> = {
  common: "",
  rare: "ring-1 ring-blue-400/20",
  epic: "ring-1 ring-purple-400/20",
  legendary: "ring-2 ring-yellow-400/30 animate-pulse",
};

interface GiftShelfProps {
  userId: string;
  compact?: boolean;
}

const GiftShelf = ({ userId, compact = false }: GiftShelfProps) => {
  const [gifts, setGifts] = useState<UserGift[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("user_gifts")
        .select("id, gift_id, sender_id, message, created_at, gift_items(id, name, emoji, image_url, rarity)")
        .eq("receiver_id", userId)
        .eq("displayed", true)
        .order("created_at", { ascending: false })
        .limit(20) as any;
      setGifts(data ?? []);
      setLoading(false);
    };
    load();
  }, [userId]);

  if (loading || gifts.length === 0) return null;

  return (
    <div className={compact ? "" : "glass-card p-4"}>
      {!compact && (
        <h3 className="flex items-center gap-2 text-sm font-display font-semibold text-foreground mb-3">
          <Gift className="w-4 h-4 text-primary" />
          Подарки ({gifts.length})
        </h3>
      )}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {gifts.map((g, i) => {
          const item = g.gift_items;
          return (
            <motion.div
              key={g.id}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.05 }}
              className={`flex-shrink-0 w-12 h-12 rounded-xl border-2 ${rarityBorder[item.rarity] || "border-border"} ${rarityGlow[item.rarity] || ""} bg-card overflow-hidden flex items-center justify-center`}
              title={`${item.emoji} ${item.name}`}
            >
              {item.image_url ? (
                <img src={item.image_url} alt={item.name} className="w-10 h-10 object-contain" loading="lazy" />
              ) : (
                <span className="text-xl">{item.emoji}</span>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default GiftShelf;
