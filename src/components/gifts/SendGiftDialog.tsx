import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCoins } from "@/hooks/useCoins";
import { supabase } from "@/integrations/supabase/client";
import { fetchEdgeFunction } from "@/lib/auth-fetch";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Gift, Coins, Send, Loader2, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";

interface GiftItem {
  id: string;
  name: string;
  emoji: string;
  image_url: string | null;
  price: number;
  category: string;
  rarity: string;
  description_ru: string | null;
  description_uk: string | null;
}

interface SendGiftDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiverId: string;
  receiverName: string;
}

const rarityLabel: Record<string, string> = {
  common: "Обычный",
  rare: "Редкий",
  epic: "Эпический",
  legendary: "Легендарный",
};

const rarityColor: Record<string, string> = {
  common: "text-muted-foreground",
  rare: "text-blue-400",
  epic: "text-purple-400",
  legendary: "text-yellow-400",
};

const rarityBorder: Record<string, string> = {
  common: "border-border hover:border-primary/30",
  rare: "border-blue-400/30 hover:border-blue-400/60",
  epic: "border-purple-400/30 hover:border-purple-400/60",
  legendary: "border-yellow-400/30 hover:border-yellow-400/60 shadow-[0_0_15px_hsl(var(--yellow-glow)/0.15)]",
};

const categoryTabs = [
  { key: "all", label: "Все", emoji: "🎁" },
  { key: "panda", label: "Панды", emoji: "🐼" },
  { key: "german", label: "Немецкое", emoji: "🇩🇪" },
  { key: "study", label: "Учёба", emoji: "🎓" },
];

const SendGiftDialog = ({ open, onOpenChange, receiverId, receiverName }: SendGiftDialogProps) => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { balance, refetch: reloadCoins } = useCoins();
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedGift, setSelectedGift] = useState<GiftItem | null>(null);
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("all");
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      const { data } = await supabase
        .from("gift_items")
        .select("*")
        .eq("available", true)
        .order("sort_order") as any;
      setGifts(data ?? []);
      setLoading(false);
    };
    load();
  }, [open]);

  useEffect(() => {
    if (!open) {
      setSelectedGift(null);
      setMessage("");
      setSent(false);
      setCategory("all");
    }
  }, [open]);

  const filtered = category === "all" ? gifts : gifts.filter(g => g.category === category);

  const handleSend = async () => {
    if (!user || !selectedGift) return;
    setSending(true);
    const { data, error } = await supabase.rpc("send_gift", {
      p_sender_id: user.id,
      p_receiver_id: receiverId,
      p_gift_id: selectedGift.id,
      p_message: message.trim() || null,
    });
    setSending(false);
    if (error || !data) {
      toast({
        title: "Не удалось отправить",
        description: balance < selectedGift.price ? "Недостаточно монет!" : "Попробуйте позже",
        variant: "destructive",
      });
      return;
    }
    setSent(true);
    reloadCoins();

    // Send notifications (Telegram + in-app DM) — fire and forget
    fetchEdgeFunction("notify-gift", {
      receiver_id: receiverId,
      gift_name: selectedGift.name,
      gift_emoji: selectedGift.emoji,
      message: message.trim() || null,
    }).catch(() => {});

    setTimeout(() => onOpenChange(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm p-0 overflow-hidden border-border/50 bg-background max-h-[85vh]">
        <DialogTitle className="sr-only">Отправить подарок</DialogTitle>

        <AnimatePresence mode="wait">
          {sent ? (
            <motion.div
              key="sent"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex flex-col items-center justify-center gap-4 py-12 px-6"
            >
              <motion.div
                animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.2, 1] }}
                transition={{ duration: 0.6 }}
              >
                {selectedGift?.image_url ? (
                  <img src={selectedGift.image_url} alt="" className="w-24 h-24 object-contain" />
                ) : (
                  <span className="text-6xl">{selectedGift?.emoji}</span>
                )}
              </motion.div>
              <div className="text-center">
                <p className="font-display font-bold text-lg text-foreground">Подарок отправлен! 🎉</p>
                <p className="text-sm text-muted-foreground mt-1">{receiverName} получит {selectedGift?.name}</p>
              </div>
              <Sparkles className="w-6 h-6 text-primary animate-pulse" />
            </motion.div>
          ) : selectedGift ? (
            <motion.div key="confirm" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: -50, opacity: 0 }} className="p-5">
              <button onClick={() => setSelectedGift(null)} className="text-xs text-muted-foreground hover:text-foreground mb-3">← Назад к каталогу</button>

              <div className="flex flex-col items-center gap-3 mb-4">
                <div className={`w-28 h-28 rounded-2xl border-2 ${rarityBorder[selectedGift.rarity]} bg-card/50 flex items-center justify-center`}>
                  {selectedGift.image_url ? (
                    <img src={selectedGift.image_url} alt={selectedGift.name} className="w-24 h-24 object-contain" />
                  ) : (
                    <span className="text-5xl">{selectedGift.emoji}</span>
                  )}
                </div>
                <div className="text-center">
                  <h3 className="font-display font-bold text-foreground">{selectedGift.name}</h3>
                  <p className={`text-[10px] font-medium ${rarityColor[selectedGift.rarity]}`}>{rarityLabel[selectedGift.rarity]}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {lang === "uk" ? selectedGift.description_uk : selectedGift.description_ru}
                  </p>
                </div>
              </div>

              <div className="mb-4">
                <label className="text-xs text-muted-foreground mb-1 block">Сообщение (необязательно)</label>
                <input
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  placeholder={`Привет, ${receiverName}!`}
                  maxLength={100}
                  className="w-full px-3 py-2 rounded-lg bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <button
                onClick={handleSend}
                disabled={sending || balance < selectedGift.price}
                className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {sending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    Подарить за {selectedGift.price}
                    <Coins className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
              {balance < selectedGift.price && (
                <p className="text-[10px] text-destructive text-center mt-2">Недостаточно монет (у тебя {balance})</p>
              )}
            </motion.div>
          ) : (
            <motion.div key="catalog" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col">
              <div className="px-5 pt-5 pb-3">
                <div className="flex items-center gap-2 mb-1">
                  <Gift className="w-5 h-5 text-primary" />
                  <h3 className="font-display font-bold text-foreground">Подарок для {receiverName}</h3>
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  Баланс: {balance} <Coins className="w-3 h-3" />
                </p>
              </div>

              {/* Category tabs */}
              <div className="flex gap-1 px-5 pb-3 overflow-x-auto">
                {categoryTabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setCategory(tab.key)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      category === tab.key
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted/50 text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    {tab.emoji} {tab.label}
                  </button>
                ))}
              </div>

              {/* Gift grid */}
              <div className="px-5 pb-5 overflow-y-auto max-h-[50vh]">
                {loading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {filtered.map(gift => (
                      <motion.button
                        key={gift.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedGift(gift)}
                        className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all ${rarityBorder[gift.rarity]} bg-card/50`}
                      >
                        <div className="w-14 h-14 flex items-center justify-center">
                          {gift.image_url ? (
                            <img src={gift.image_url} alt={gift.name} className="w-12 h-12 object-contain" loading="lazy" />
                          ) : (
                            <span className="text-3xl">{gift.emoji}</span>
                          )}
                        </div>
                        <span className="text-[10px] font-medium text-foreground text-center leading-tight line-clamp-1">{gift.name}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                          {gift.price} <Coins className="w-2.5 h-2.5" />
                        </span>
                      </motion.button>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
};

export default SendGiftDialog;
