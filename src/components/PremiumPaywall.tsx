import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Zap, BookOpen, Gamepad2, Bot, Check, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "@/hooks/use-toast";

interface Props {
  open: boolean;
  onClose: () => void;
  type?: "lesson" | "game" | "ai";
}

const PremiumPaywall = ({ open, onClose, type }: Props) => {
  const { session } = useAuth();
  const { lang } = useLanguage();
  const [loadingInterval, setLoadingInterval] = useState<string | null>(null);

  const handleCheckout = async (interval: "monthly" | "yearly") => {
    if (!session?.access_token) return;
    setLoadingInterval(interval);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        headers: { Authorization: `Bearer ${session.access_token}` },
        body: { interval },
      });
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (e) {
      toast({ title: lang === "uk" ? "Помилка" : "Ошибка", variant: "destructive" });
    } finally {
      setLoadingInterval(null);
    }
  };

  const features = [
    { icon: BookOpen, text: lang === "uk" ? "Безліміт уроків" : "Безлимит уроков" },
    { icon: Gamepad2, text: lang === "uk" ? "Безліміт ігор" : "Безлимит игр" },
    { icon: Bot, text: lang === "uk" ? "AI без обмежень" : "AI без ограничений" },
    { icon: Zap, text: lang === "uk" ? "2× монети за активність" : "2× монеты за активность" },
    { icon: Sparkles, text: lang === "uk" ? "Ексклюзивний контент" : "Эксклюзивный контент" },
  ];

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
          className="w-full max-w-sm rounded-2xl bg-card border border-border/30 overflow-hidden"
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
                  {lang === "uk" ? "Розблокуй повний доступ" : "Разблокируй полный доступ"}
                </p>
              </div>
            </div>
            {type && (
              <p className="text-sm text-primary font-medium">
                {limitMessages[type]?.[lang] ?? ""}
              </p>
            )}
          </div>

          {/* Features */}
          <div className="px-6 py-4 space-y-2.5">
            {features.map((f, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-sm text-foreground">{f.text}</span>
                <Check className="w-4 h-4 text-primary ml-auto flex-shrink-0" />
              </div>
            ))}
          </div>

          {/* Pricing */}
          <div className="px-6 pb-6 space-y-3">
            <Button
              onClick={() => handleCheckout("yearly")}
              disabled={!!loadingInterval}
              className="w-full h-14 text-base font-display font-bold bg-primary hover:bg-primary/90 relative"
            >
              {loadingInterval === "yearly" ? (
                <span className="animate-pulse">{lang === "uk" ? "Завантаження..." : "Загрузка..."}</span>
              ) : (
                <div className="flex flex-col items-center">
                  <span>€39.99 / {lang === "uk" ? "рік" : "год"}</span>
                  <span className="text-[10px] font-normal opacity-80">
                    €3.33/{lang === "uk" ? "міс" : "мес"} · {lang === "uk" ? "економія 33%" : "экономия 33%"}
                  </span>
                </div>
              )}
              <span className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground text-[10px] px-2 py-0.5 rounded-full font-bold">
                -33%
              </span>
            </Button>

            <Button
              onClick={() => handleCheckout("monthly")}
              disabled={!!loadingInterval}
              variant="outline"
              className="w-full h-12 text-sm font-display font-semibold"
            >
              {loadingInterval === "monthly" ? (
                <span className="animate-pulse">{lang === "uk" ? "Завантаження..." : "Загрузка..."}</span>
              ) : (
                `€4.99 / ${lang === "uk" ? "місяць" : "месяц"}`
              )}
            </Button>

            <p className="text-[10px] text-center text-muted-foreground">
              {lang === "uk"
                ? "Скасувати можна будь-коли. Оплата через Stripe."
                : "Отменить можно в любое время. Оплата через Stripe."}
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PremiumPaywall;
