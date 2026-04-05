import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Zap, BookOpen, Gamepad2, Bot, Check, X, Sparkles, GraduationCap, Brain, Infinity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";
import type { SubscriptionPlan } from "@/hooks/useSubscription";

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

  const handleCheckout = async (plan: string) => {
    if (!session?.access_token) return;
    setLoadingPlan(plan);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { interval: selectedInterval, plan },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e) {
      toast({ title: lang === "uk" ? "Помилка" : "Ошибка", variant: "destructive" });
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
      priceMonthly: "€4.99",
      priceYearly: "€39.99",
      priceYearlyMonthly: "€3.33",
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
      priceMonthly: "€5.99",
      priceYearly: "€49.99",
      priceYearlyMonthly: "€4.17",
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
      priceMonthly: "€9.99",
      priceYearly: "€84.99",
      priceYearlyMonthly: "€7.08",
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
          <div className="relative p-6 pb-4 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent">
            <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <Crown className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-display font-bold text-foreground">KLAR Premium</h2>
                <p className="text-xs text-muted-foreground">
                  {lang === "uk" ? "Обери план, який підходить тобі" : "Выбери план, который подходит тебе"}
                </p>
              </div>
            </div>
            {type && (
              <p className="text-sm text-primary font-medium">
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
                  className={`relative rounded-xl border p-4 flex flex-col transition-all ${
                    isHighlighted
                      ? "border-primary bg-primary/5 shadow-lg shadow-primary/10"
                      : "border-border/30 bg-card"
                  }`}
                >
                  {p.popular && (
                    <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-[10px] px-3 py-0.5 rounded-full font-bold whitespace-nowrap">
                      {lang === "uk" ? "Найвигідніше" : "Лучшая цена"}
                    </span>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isHighlighted ? "bg-primary/20" : "bg-muted/50"}`}>
                      <p.icon className={`w-4 h-4 ${isHighlighted ? "text-primary" : "text-muted-foreground"}`} />
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
                        <Check className="w-3.5 h-3.5 text-primary flex-shrink-0" />
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
                        ? "bg-primary hover:bg-primary/90"
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
              ? "Скасувати можна будь-коли. Оплата через Stripe."
              : "Отменить можно в любое время. Оплата через Stripe."}
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PremiumPaywall;
