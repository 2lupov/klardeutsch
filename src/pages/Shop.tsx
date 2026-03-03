import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCoins } from "@/hooks/useCoins";
import { usePlatform } from "@/hooks/usePlatform";
import { supabase } from "@/integrations/supabase/client";
import { Coins, ShoppingBag, Check, Lock, Sparkles } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ShopItem {
  id: string;
  title: string;
  description: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
  item_type: string;
  content: string | null;
}

const Shop = () => {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const { isMobile, isTelegram } = usePlatform();
  const { balance, purchaseItem } = useCoins();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [purchased, setPurchased] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [revealedContent, setRevealedContent] = useState<string | null>(null);
  const [justPurchased, setJustPurchased] = useState<string | null>(null);
  const [balanceBounce, setBalanceBounce] = useState(false);
  const balanceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: shopData }, { data: purchaseData }] = await Promise.all([
        supabase.from("shop_items").select("*").eq("available", true).order("created_at"),
        supabase.from("purchases").select("item_id").eq("user_id", user.id),
      ]);
      setItems((shopData as ShopItem[]) ?? []);
      setPurchased(new Set((purchaseData ?? []).map((p: any) => p.item_id)));
      setLoading(false);
    };
    load();
  }, [user]);

  const handleBuy = async (item: ShopItem) => {
    if (purchased.has(item.id) || balance < item.price) return;
    setBuying(item.id);

    const ok = await purchaseItem(item.id);
    if (ok) {
      // Trigger animations
      setJustPurchased(item.id);
      setBalanceBounce(true);

      // Haptic feedback
      try {
        (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success");
      } catch {}

      toast({
        title: `🎉 ${t("purchaseSuccess")}`,
        description: `−${item.price} 🪙`,
      });

      setPurchased((prev) => new Set([...prev, item.id]));

      // Reset animations
      setTimeout(() => {
        setJustPurchased(null);
        setBalanceBounce(false);
      }, 1500);
    } else {
      try {
        (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred("error");
      } catch {}
      toast({ title: t("purchaseFailed"), variant: "destructive" });
    }
    setBuying(null);
  };

  if (!user || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <span className="text-muted-foreground">{t("loading")}</span>
      </div>
    );
  }

  if (isTelegram) {
    return (
      <div className="w-full mx-auto px-4 py-6 max-w-md">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">{t("shopTitle")}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{t("shopSubtitle")}</p>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20">
            <Coins className="w-4 h-4 text-primary" />
            <span className="font-display font-bold text-primary">{balance}</span>
          </div>
        </div>
        <div className="glass-card p-6 text-center space-y-4">
          <ShoppingBag className="w-12 h-12 text-primary mx-auto" />
          <div>
            <h2 className="font-display font-bold text-foreground mb-2">
              {lang === "uk" ? "Магазин працює через сайт" : "Магазин работает через сайт"}
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {lang === "uk"
                ? "Щоб переглядати курси та купувати матеріали, відкрийте KLAR у браузері."
                : "Чтобы просматривать курсы и покупать материалы, откройте KLAR в браузере."}
            </p>
          </div>
          <a
            href="https://klardeutsch.lovable.app/shop"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold transition-all hover:opacity-90 active:scale-95"
          >
            {lang === "uk" ? "Відкрити у браузері" : "Открыть в браузере"}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
      {/* Header with balance */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">{t("shopTitle")}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">{t("shopSubtitle")}</p>
        </div>
        <div
          ref={balanceRef}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 transition-all ${
            balanceBounce ? "animate-balance-bounce" : ""
          }`}
        >
          <Coins className="w-4 h-4 text-primary" />
          <span className="font-display font-bold text-primary">{balance}</span>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("shopEmpty")}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((item, idx) => {
            const owned = purchased.has(item.id);
            const canAfford = balance >= item.price;
            const wasJustPurchased = justPurchased === item.id;

            return (
              <div
                key={item.id}
                className={`glass-card p-4 animate-slide-up transition-all duration-500 ${
                  wasJustPurchased ? "animate-shimmer border-primary/40 glow-yellow" : ""
                }`}
                style={{ animationDelay: `${idx * 0.05}s` }}
              >
                <div className="flex items-start gap-3">
                  {/* Product image */}
                  {item.image_url && (
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                      <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0 flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-display font-semibold text-foreground text-sm">{item.title}</h3>
                      {item.description && (
                        <p className="text-xs text-muted-foreground mt-1">{item.description}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-primary font-display font-bold text-sm shrink-0">
                      <Coins className="w-3.5 h-3.5" />
                      {item.price}
                    </div>
                  </div>
                </div>

                {/* Revealed content after purchase */}
                {owned && item.content && (
                  <div className="mt-3">
                    {revealedContent === item.id ? (
                      <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-foreground animate-slide-up whitespace-pre-wrap">
                        {item.content}
                      </div>
                    ) : (
                      <button
                        onClick={() => setRevealedContent(item.id)}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        {t("showContent")}
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-3">
                  {owned ? (
                    <div className={`flex items-center gap-1.5 text-xs text-primary font-medium ${wasJustPurchased ? "animate-coin-pop" : ""}`}>
                      <Check className="w-3.5 h-3.5" />
                      {t("alreadyPurchased")}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleBuy(item)}
                      disabled={!canAfford || buying === item.id}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                        canAfford
                          ? "bg-primary text-primary-foreground hover:opacity-90 hover:scale-[1.02]"
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                      }`}
                    >
                      {buying === item.id ? (
                        <span className="animate-pulse">{t("loading")}</span>
                      ) : (
                        <>
                          {!canAfford && <Lock className="w-3.5 h-3.5" />}
                          {canAfford ? t("buyButton") : t("notEnoughCoins")}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Shop;
