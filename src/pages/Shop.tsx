import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCoins } from "@/hooks/useCoins";
import { usePlatform } from "@/hooks/usePlatform";
import { supabase } from "@/integrations/supabase/client";
import { Coins, ShoppingBag, Check, Lock, Sparkles, GraduationCap, BookOpen, ChevronRight } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface ShopItem {
  id: string;
  title: string;
  description: string | null;
  price: number;
  price_eur: number | null;
  payment_link: string | null;
  image_url: string | null;
  available: boolean;
  item_type: string;
  content: string | null;
}

interface ShopCourse {
  id: string;
  title: string;
  description: string | null;
  price: number;
  level: string;
  image_url: string | null;
  lessons_count: number;
}

const Shop = () => {
  const { user } = useAuth();
  const { lang, t } = useLanguage();
  const { isMobile, isTelegram } = usePlatform();
  const { balance, purchaseItem, refetch } = useCoins();
  const navigate = useNavigate();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [courses, setCourses] = useState<ShopCourse[]>([]);
  const [purchased, setPurchased] = useState<Set<string>>(new Set());
  const [purchasedCourses, setPurchasedCourses] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [revealedContent, setRevealedContent] = useState<string | null>(null);
  const [justPurchased, setJustPurchased] = useState<string | null>(null);
  const [balanceBounce, setBalanceBounce] = useState(false);
  const balanceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: shopData }, { data: purchaseData }, { data: coursesData }, { data: coursePurchaseData }] = await Promise.all([
        supabase.from("shop_items").select("*").eq("available", true).order("created_at"),
        supabase.from("purchases").select("item_id").eq("user_id", user.id),
        supabase.from("courses").select("*").eq("available", true).order("created_at"),
        supabase.from("course_purchases").select("course_id").eq("user_id", user.id),
      ]);
      setItems((shopData as ShopItem[]) ?? []);
      setPurchased(new Set((purchaseData ?? []).map((p: any) => p.item_id)));
      
      // Load lesson counts for courses
      if (coursesData && coursesData.length > 0) {
        const coursesWithCount = await Promise.all(
          (coursesData as any[]).map(async (c) => {
            const { count } = await supabase
              .from("course_lessons")
              .select("*", { count: "exact", head: true })
              .eq("course_id", c.id);
            return { ...c, lessons_count: count || 0 } as ShopCourse;
          })
        );
        setCourses(coursesWithCount);
      }
      
      setPurchasedCourses(new Set((coursePurchaseData ?? []).map((p: any) => p.course_id)));
      setLoading(false);
    };
    load();
  }, [user]);

  const handleBuyItem = async (item: ShopItem) => {
    if (purchased.has(item.id) || balance < item.price) return;
    setBuying(item.id);

    const { data } = await supabase.rpc("purchase_item", { p_user_id: user!.id, p_item_id: item.id });
    if (data) {
      setJustPurchased(item.id);
      setBalanceBounce(true);
      try { (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success"); } catch {}
      toast({ title: `🎉 ${t("purchaseSuccess")}`, description: `−${item.price} 🪙` });
      setPurchased((prev) => new Set([...prev, item.id]));
      refetch();
      setTimeout(() => { setJustPurchased(null); setBalanceBounce(false); }, 1500);
    } else {
      try { (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred("error"); } catch {}
      toast({ title: t("purchaseFailed"), variant: "destructive" });
    }
    setBuying(null);
  };

  const handleBuyCourse = async (course: ShopCourse) => {
    if (purchasedCourses.has(course.id) || balance < course.price) return;
    setBuying(course.id);

    const { data } = await supabase.rpc("purchase_course", { p_user_id: user!.id, p_course_id: course.id });
    if (data) {
      setJustPurchased(course.id);
      setBalanceBounce(true);
      try { (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred("success"); } catch {}
      toast({ title: `🎉 ${lang === "uk" ? "Курс куплено!" : "Курс куплен!"}`, description: `−${course.price} 🪙` });
      setPurchasedCourses((prev) => new Set([...prev, course.id]));
      refetch();
      setTimeout(() => { setJustPurchased(null); setBalanceBounce(false); }, 1500);
    } else {
      try { (window as any).Telegram?.WebApp?.HapticFeedback?.notificationOccurred("error"); } catch {}
      toast({ title: lang === "uk" ? "Не вдалося купити" : "Не удалось купить", variant: "destructive" });
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

  const levelColors: Record<string, string> = {
    A1: "bg-emerald-500/20 text-emerald-400",
    A2: "bg-sky-500/20 text-sky-400",
    B1: "bg-amber-500/20 text-amber-400",
    B2: "bg-orange-500/20 text-orange-400",
    C1: "bg-rose-500/20 text-rose-400",
  };

  return (
    <div className={`w-full mx-auto px-4 py-6 overflow-x-hidden ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
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

      {/* Courses Section */}
      {courses.length > 0 && (
        <div className="mb-6">
          <h2 className="font-display font-bold text-foreground text-sm flex items-center gap-2 mb-3">
            <GraduationCap className="w-4 h-4 text-primary" />
            {lang === "uk" ? "Курси" : "Курсы"}
          </h2>
          <div className="grid gap-3">
            {courses.map((course, idx) => {
              const owned = purchasedCourses.has(course.id);
              const canAfford = balance >= course.price;
              const wasJustPurchased = justPurchased === course.id;

              return (
                <div
                  key={course.id}
                  className={`glass-card p-4 animate-slide-up transition-all duration-500 ${
                    wasJustPurchased ? "animate-shimmer border-primary/40 glow-yellow" : ""
                  }`}
                  style={{ animationDelay: `${idx * 0.05}s` }}
                >
                  <div className="flex items-start gap-3">
                    {course.image_url ? (
                      <div className="w-16 h-16 rounded-lg overflow-hidden bg-secondary flex-shrink-0">
                        <img src={course.image_url} alt={course.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <BookOpen className="w-7 h-7 text-primary" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${levelColors[course.level] || "bg-muted text-muted-foreground"}`}>
                          {course.level}
                        </span>
                        <h3 className="font-display font-semibold text-foreground text-sm truncate">{course.title}</h3>
                      </div>
                      {course.description && (
                        <p className="text-xs text-muted-foreground line-clamp-2">{course.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground">
                        <span>{course.lessons_count} {lang === "uk" ? "уроків" : "уроков"}</span>
                        <span className="flex items-center gap-0.5 text-primary font-bold text-xs">
                          <Coins className="w-3 h-3" />
                          {course.price}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3">
                    {owned ? (
                      <button
                        onClick={() => navigate(`/course/${course.id}`)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-all active:scale-95"
                      >
                        <BookOpen className="w-3.5 h-3.5" />
                        {lang === "uk" ? "Відкрити курс" : "Открыть курс"}
                        <ChevronRight className="w-3.5 h-3.5 ml-auto" />
                      </button>
                    ) : (
                      <button
                        onClick={() => handleBuyCourse(course)}
                        disabled={!canAfford || buying === course.id}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                          canAfford
                            ? "bg-primary text-primary-foreground hover:opacity-90 hover:scale-[1.02]"
                            : "bg-muted text-muted-foreground cursor-not-allowed"
                        }`}
                      >
                        {buying === course.id ? (
                          <span className="animate-pulse">{t("loading")}</span>
                        ) : (
                          <>
                            {!canAfford && <Lock className="w-3.5 h-3.5" />}
                            {canAfford ? (lang === "uk" ? "Купити курс" : "Купить курс") : t("notEnoughCoins")}
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Regular Items Section */}
      {items.length > 0 && (
        <div>
          {courses.length > 0 && (
            <h2 className="font-display font-bold text-foreground text-sm flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-primary" />
              {lang === "uk" ? "Матеріали" : "Материалы"}
            </h2>
          )}
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
                        onClick={() => handleBuyItem(item)}
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
        </div>
      )}

      {items.length === 0 && courses.length === 0 && (
        <div className="glass-card p-8 text-center">
          <ShoppingBag className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t("shopEmpty")}</p>
        </div>
      )}
    </div>
  );
};

export default Shop;
