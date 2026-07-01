import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Zap, BookOpen, Gamepad2, Bot, Check, X, Sparkles, GraduationCap, Brain, Infinity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import type { SubscriptionPlan } from "@/hooks/useSubscription";
import pandaExplorer from "@/assets/panda-explorer.png";

interface Props {
  open: boolean;
  onClose: () => void;
  type?: "lesson" | "game" | "ai";
  highlightPlan?: "school" | "assistant" | "allinone";
}

const PremiumPaywall = ({ open, onClose, type, highlightPlan }: Props) => {
  const { session } = useAuth();
  const { lang } = useLanguage();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [selectedInterval, setSelectedInterval] = useState<"monthly" | "yearly">("monthly");

  const PRICES_UAH: Record<string, { monthly: number; yearly: number }> = {
    school: { monthly: 219, yearly: 1749 },
    assistant: { monthly: 269, yearly: 2199 },
    allinone: { monthly: 449, yearly: 3749 },
  };
  const PLAN_NAMES: Record<string, string> = {
    school: "KLAR Школа",
    assistant: "KLAR Асистент",
    allinone: "KLAR All-in-One",
  };

  const handleCheckout = async (plan: string) => {
    setLoadingPlan(plan);
    try {
      const uah = PRICES_UAH[plan]?.[selectedInterval] ?? 0;
      const amount = Math.round(uah * 100); // копійки
      const periodLabel = selectedInterval === "monthly" ? (lang === "uk" ? "місяць" : "месяц") : (lang === "uk" ? "рік" : "год");
      const description = `${PLAN_NAMES[plan]} — ${periodLabel}`;

      const { data, error } = await supabase.functions.invoke("mono-create-invoice", {
        headers: session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {},
        body: {
          amount,
          ccy: 980,
          paymentType: "debit",
          description,
          reference: `sub_${plan}_${selectedInterval}_${Date.now()}`,
        },
      });
      if (error) throw error;
      if (data?.pageUrl) {
        window.location.href = data.pageUrl;
      } else {
        throw new Error(data?.error || "No payment URL returned");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: lang === "uk" ? "Помилка оплати" : "Ошибка оплаты", description: msg, variant: "destructive" });
    } finally {
      setLoadingPlan(null);
    }
  };

  const limitMessages: Record<string, Record<string, string>> = {
    lesson: {
      uk: "Ви використали всі безкоштовні уроки на сьогодні",
      ru: "Вы использовали все бесплатные уроки на сегодня",
    },
    game: {
      uk: "Ви використали безкоштовну гру на сьогодні",
      ru: "Вы использовали бесплатную игру на сегодня",
    },
    ai: {
      uk: "Ви використали безкоштовні AI-запити на сьогодні",
      ru: "Вы использовали бесплатные AI-запросы на сегодня",
    },
  };

  const plans = [
    {
      id: "school" as const,
      name: lang === "uk" ? "Школа" : "Школа",
      icon: GraduationCap,
      priceMonthly: "₴219",
      priceYearly: "₴1749",
      priceYearlyMonthly: "₴149",
      features: [
        { icon: BookOpen, text: lang === "uk" ? "Безліміт уроків" : "Безлимит уроков" },
        { icon: Gamepad2, text: lang === "uk" ? "Безліміт ігор" : "Безлимит игр" },
        { icon: Zap, text: lang === "uk" ? "2× монети за активність" : "2× монеты за активность" },
      ],
    },
    {
      id: "assistant" as const,
      name: lang === "uk" ? "Асистент" : "Ассистент",
      icon: Brain,
      priceMonthly: "₴269",
      priceYearly: "₴2199",
      priceYearlyMonthly: "₴189",
      features: [
        { icon: Bot, text: lang === "uk" ? "AI-чат тьютор" : "AI-чат тьютор" },
        { icon: BookOpen, text: lang === "uk" ? "Розумний словник" : "Умный словарь" },
        { icon: Sparkles, text: lang === "uk" ? "Аналіз файлів і книг" : "Анализ файлов и книг" },
      ],
    },
    {
      id: "allinone" as const,
      name: "All-in-One",
      icon: Infinity,
      priceMonthly: "₴449",
      priceYearly: "₴3749",
      priceYearlyMonthly: "₴319",
      popular: true,
      features: [
        { icon: GraduationCap, text: lang === "uk" ? "Все з Школи" : "Всё из Школы" },
        { icon: Brain, text: lang === "uk" ? "Все з Асистента" : "Всё из Ассистента" },
        { icon: Crown, text: lang === "uk" ? "Ексклюзивний контент" : "Эксклюзивный контент" },
      ],
    },
  ];

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="w-full max-w-2xl rounded-2xl bg-card border border-border/30 overflow-hidden max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-6 pb-5 overflow-hidden bg-gradient-to-br from-primary/25 via-card to-accent/20">
            <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-accent/30 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-14 -left-10 w-40 h-40 rounded-full bg-primary/30 blur-3xl pointer-events-none" />
            <button onClick={onClose} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-background/40 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground transition">
              <X className="w-4 h-4" />
            </button>
            <div className="relative flex items-center gap-4">
              <img src={pandaExplorer} alt="" className="w-20 h-20 object-contain drop-shadow-[0_10px_30px_hsl(var(--accent)/0.4)] animate-float shrink-0" />
              <div className="min-w-0">
                <span className="inline-block text-[10px] font-bold uppercase tracking-[0.2em] text-accent mb-1">
                  {lang === "uk" ? "Преміум" : "Премиум"}
                </span>
                <h2 className="text-2xl font-display font-bold text-foreground leading-tight">KLAR Premium</h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {lang === "uk" ? "Обери план, який підходить тобі" : "Выбери план, который подходит тебе"}
                </p>
              </div>
            </div>
            {type && (
              <p className="relative mt-3 text-sm text-accent font-medium">
                {limitMessages[type]?.[lang] ?? ""}
              </p>
            )}
          </div>

          {/* Interval toggle */}
          <div className="flex justify-center px-6 pt-4">
            <div className="flex bg-muted/50 rounded-xl p-1 gap-1">
              <button
                onClick={() => setSelectedInterval("monthly")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  selectedInterval === "monthly"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang === "uk" ? "Щомісяця" : "Ежемесячно"}
              </button>
              <button
                onClick={() => setSelectedInterval("yearly")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all relative ${
                  selectedInterval === "yearly"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang === "uk" ? "Щорічно" : "Ежегодно"}
                <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[9px] px-1.5 py-0.5 rounded-full font-bold">
                  -30%
                </span>
              </button>
            </div>
          </div>

          {/* Plans grid */}
          <div className="px-6 py-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {plans.map((p) => {
              const isHighlighted = highlightPlan === p.id || (!highlightPlan && p.popular);
              return (
                <div
                  key={p.id}
                  className={`relative rounded-2xl border p-4 flex flex-col transition-all ${
                    isHighlighted
                      ? "border-accent/60 bg-accent/5 shadow-xl shadow-accent/20 scale-[1.02]"
                      : "border-border/40 bg-card/60 hover:border-border"
                  }`}
                >
                  {p.popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-accent text-accent-foreground text-[10px] px-3 py-0.5 rounded-full font-bold whitespace-nowrap shadow-lg shadow-accent/30">
                      {lang === "uk" ? "Найвигідніше" : "Лучшая цена"}
                    </span>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isHighlighted ? "bg-accent/20" : "bg-muted/50"}`}>
                      <p.icon className={`w-4 h-4 ${isHighlighted ? "text-accent" : "text-muted-foreground"}`} />
                    </div>
                    <h3 className="font-display font-bold text-sm text-foreground">{p.name}</h3>
                  </div>

                  <div className="mb-3">
                    <span className="text-2xl font-display font-bold text-foreground">
                      {selectedInterval === "monthly" ? p.priceMonthly : p.priceYearlyMonthly}
                    </span>
                    <span className="text-xs text-muted-foreground">/{lang === "uk" ? "міс" : "мес"}</span>
                    {selectedInterval === "yearly" && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {p.priceYearly}/{lang === "uk" ? "рік" : "год"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2 mb-4 flex-1">
                    {p.features.map((f, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Check className={`w-3.5 h-3.5 flex-shrink-0 ${isHighlighted ? "text-accent" : "text-primary"}`} />
                        <span className="text-xs text-foreground/80">{f.text}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    onClick={() => handleCheckout(p.id)}
                    disabled={!!loadingPlan}
                    size="sm"
                    className={`w-full text-xs font-display font-bold ${
                      isHighlighted
                        ? "bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/25"
                        : "bg-foreground/10 hover:bg-foreground/20 text-foreground"
                    }`}
                  >
                    {loadingPlan === p.id ? (
                      <span className="animate-pulse">{lang === "uk" ? "Завантаження..." : "Загрузка..."}</span>
                    ) : (
                      lang === "uk" ? "Обрати" : "Выбрать"
                    )}
                  </Button>
                </div>
              );
            })}
          </div>

          <p className="text-[10px] text-center text-muted-foreground pb-4 px-6">
            {lang === "uk"
              ? "Оплата через Monobank. Скасувати можна будь-коли."
              : "Оплата через Monobank. Отменить можно в любое время."}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PremiumPaywall;
