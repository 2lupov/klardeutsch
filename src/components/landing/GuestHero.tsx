import { motion } from "framer-motion";
import { Sparkles, BookOpen, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

const GuestHero = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();

  return (
    <section className="w-full max-w-4xl mx-auto px-4 pt-6 pb-8">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-card to-accent/10 border border-border p-6 md:p-10 text-center"
      >
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.25),_transparent_60%)] pointer-events-none" />
        <div className="relative">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider bg-primary/15 text-primary px-3 py-1 rounded-full mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            {lang === "uk" ? "Німецька — ясно і просто" : "Немецкий — ясно и просто"}
          </span>
          <h1 className="font-display font-black text-3xl md:text-5xl text-foreground leading-tight mb-3">
            {lang === "uk"
              ? "Вчи німецьку з KlarDeutsch"
              : "Учи немецкий с KlarDeutsch"}
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto mb-6">
            {lang === "uk"
              ? "Спробуй безкоштовно — без реєстрації. Створи акаунт, щоб зберігати прогрес. Відкрий Premium для AI-асистента та курсів."
              : "Попробуй бесплатно — без регистрации. Создай аккаунт, чтобы сохранять прогресс. Открой Premium для AI-ассистента и курсов."}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center">
            <button
              onClick={() => {
                document.getElementById("levels-section")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-primary text-primary-foreground font-display font-bold text-sm hover:opacity-90 transition"
            >
              {lang === "uk" ? "Спробувати безкоштовно" : "Попробовать бесплатно"}
            </button>
            <button
              onClick={() => navigate("/auth")}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-card border border-border text-foreground font-display font-bold text-sm hover:bg-muted transition"
            >
              {lang === "uk" ? "Увійти" : "Войти"}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-8 text-left">
            <div className="rounded-2xl bg-card/70 border border-border p-4">
              <BookOpen className="w-5 h-5 text-primary mb-2" />
              <p className="font-display font-bold text-sm mb-0.5">
                {lang === "uk" ? "Гість" : "Гость"}
              </p>
              <p className="text-xs text-muted-foreground">
                {lang === "uk" ? "Перегляд рівнів і пробні вправи" : "Просмотр уровней и пробные упражнения"}
              </p>
            </div>
            <div className="rounded-2xl bg-card/70 border border-border p-4">
              <Sparkles className="w-5 h-5 text-primary mb-2" />
              <p className="font-display font-bold text-sm mb-0.5">
                {lang === "uk" ? "Безкоштовний акаунт" : "Бесплатный аккаунт"}
              </p>
              <p className="text-xs text-muted-foreground">
                {lang === "uk" ? "XP, монети, словник, чат, дуелі" : "XP, монеты, словарь, чат, дуэли"}
              </p>
            </div>
            <div className="rounded-2xl bg-gradient-to-br from-primary/15 to-accent/15 border border-primary/30 p-4">
              <Crown className="w-5 h-5 text-primary mb-2" />
              <p className="font-display font-bold text-sm mb-0.5 flex items-center gap-1.5">
                Premium
              </p>
              <p className="text-xs text-muted-foreground">
                {lang === "uk" ? "AI-асистент, курси, репетитор" : "AI-ассистент, курсы, репетитор"}
              </p>
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
};

export default GuestHero;
