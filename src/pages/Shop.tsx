import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCoins } from "@/hooks/useCoins";
import { usePlatform } from "@/hooks/usePlatform";
import { supabase } from "@/integrations/supabase/client";
import { Coins, ShoppingBag, Check, Lock } from "lucide-react";
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
  const { t } = useLanguage();
  const { isMobile } = usePlatform();
  const { balance, purchaseItem } = useCoins();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [purchased, setPurchased] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [revealedContent, setRevealedContent] = useState<string | null>(null);

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
      setPurchased((prev) => new Set([...prev, item.id]));
      toast({ title: t("purchaseSuccess") });
    } else {
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

  return (
    <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
      {/* Header with balance */}
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

      {items.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("shopEmpty")}</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {items.map((item) => {
            const owned = purchased.has(item.id);
            const canAfford = balance >= item.price;

            return (
              <div key={item.id} className="glass-card p-4 animate-slide-up">
                <div className="flex items-start justify-between gap-3">
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
                        className="text-xs text-primary hover:underline"
                      >
                        {t("showContent")}
                      </button>
                    )}
                  </div>
                )}

                <div className="mt-3">
                  {owned ? (
                    <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
                      <Check className="w-3.5 h-3.5" />
                      {t("alreadyPurchased")}
                    </div>
                  ) : (
                    <button
                      onClick={() => handleBuy(item)}
                      disabled={!canAfford || buying === item.id}
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                        canAfford
                          ? "bg-primary text-primary-foreground hover:opacity-90"
                          : "bg-muted text-muted-foreground cursor-not-allowed"
                      }`}
                    >
                      {!canAfford && <Lock className="w-3.5 h-3.5" />}
                      {buying === item.id ? t("loading") : canAfford ? t("buyButton") : t("notEnoughCoins")}
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
