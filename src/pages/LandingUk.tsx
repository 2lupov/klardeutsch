import { useEffect } from "react";
import { motion } from "framer-motion";
import { Brain, Sparkles, Target, Zap, GraduationCap, BookOpen, Headphones, Swords, Star, ArrowRight, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import KlarLogo from "@/components/KlarLogo";

const features = [
  { icon: Target, title: "Ясність", desc: "Прості пояснення без зайвого. Кожен урок — конкретний результат від A1 до C1." },
  { icon: Brain, title: "AI-технології", desc: "Штучний інтелект аналізує ваші помилки та підказує, над чим працювати." },
  { icon: Zap, title: "5–10 хвилин на день", desc: "Картки, квізи та аудіювання у зручному темпі. Навчайся де завгодно." },
  { icon: Sparkles, title: "Мотивація", desc: "XP, досягнення, дуелі з друзями та магазин завдань — вчитися цікаво." },
];

const levels = ["A1 — Початківець", "A2 — Елементарний", "B1 — Середній", "B2 — Вище середнього", "C1 — Просунутий"];

const tools = [
  { icon: BookOpen, label: "Розумні картки" },
  { icon: Headphones, label: "Аудіювання" },
  { icon: GraduationCap, label: "Граматика" },
  { icon: Swords, label: "Дуелі з друзями" },
  { icon: Brain, label: "AI-розбір помилок" },
  { icon: Star, label: "Система XP" },
];

const testimonials = [
  { name: "Анна К.", text: "За 3 місяці з KLAR я склала Goethe A2! Картки та квізи — просто вогонь 🔥", avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Anna" },
  { name: "Дмитро П.", text: "Нарешті німецька не здається нудною. Система прогресу мотивує щодня.", avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Dmitry" },
  { name: "Олена В.", text: "AI-розбір помилок — це геніально! Все зрозуміло і без зайвого.", avatar: "https://api.dicebear.com/9.x/avataaars/svg?seed=Olena" },
];

const faq = [
  { q: "Чи безкоштовний KLAR?", a: "Так! Усі рівні (A1–C1), картки, квізи, аудіювання та AI-розбір помилок доступні безкоштовно." },
  { q: "Чим KLAR відрізняється від Duolingo?", a: "KLAR створений спеціально для україномовних. Пояснення вашою мовою, AI розбирає саме ваші помилки, а рівні відповідають Goethe-Institut." },
  { q: "Чи працює без інтернету?", a: "Так! Основні картки та інтерфейс кешуються. Для AI-функцій потрібен інтернет." },
  { q: "Як встановити на телефон?", a: "Відкрийте klardeutsch.org у браузері → натисніть «Додати на головний екран». Працює як звичайний застосунок." },
];

const LandingUk = () => {
  const navigate = useNavigate();

  useEffect(() => {
    document.title = "KLAR — Вивчай німецьку мову безкоштовно | Уроки A1–C1 онлайн";
    document.documentElement.lang = "uk";
    const setMeta = (name: string, content: string, attr = "name") => {
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    setMeta("description", "KLAR — безкоштовна онлайн-школа німецької мови для україномовних. Рівні A1–C1: розумні картки, квізи, аудіювання, граматика та AI-розбір помилок.");
    setMeta("keywords", "німецька мова, вивчати німецьку, німецька онлайн, A1 німецька, B1 німецька, картки німецька, граматика німецької, Deutsch lernen, німецька безкоштовно, уроки німецької, німецька для українців");
    return () => { document.documentElement.lang = "ru"; };
  }, []);

  return (
      <div className="min-h-[100dvh] bg-background text-foreground overflow-x-hidden">
        {/* Hero */}
        <section className="relative py-20 px-4 text-center overflow-hidden">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[400px] rounded-full" style={{ background: "radial-gradient(ellipse, hsl(var(--primary) / 0.1) 0%, transparent 70%)" }} />
          </div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative max-w-2xl mx-auto flex flex-col items-center gap-6">
            <KlarLogo progress={100} />
            
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-primary uppercase tracking-wider">Безкоштовно · A1–C1</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
              Вивчай <span className="text-primary">німецьку</span> мову
              <br />ясно і просто
            </h1>

            <p className="text-muted-foreground text-base sm:text-lg max-w-lg">
              Розумні картки, квізи, аудіювання та AI-розбір помилок — усе українською мовою. Від початківця до просунутого.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 mt-2">
              <button
                onClick={() => navigate("/auth")}
                className="px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-display font-bold text-lg shadow-lg hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center gap-2"
                style={{ boxShadow: "0 8px 32px hsl(var(--primary) / 0.3)" }}
              >
                Почати навчання <ArrowRight className="w-5 h-5" />
              </button>
              <button
                onClick={() => navigate("/method")}
                className="px-8 py-4 rounded-2xl border border-border text-foreground font-display font-semibold text-base hover:bg-muted transition-colors"
              >
                Дізнатися більше
              </button>
            </div>
          </motion.div>
        </section>

        {/* Features */}
        <section className="py-16 px-4 max-w-4xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-10">
            Чому <span className="text-primary">KLAR</span>?
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-5 flex gap-4 items-start"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-display font-semibold text-foreground mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Levels */}
        <section className="py-16 px-4 max-w-3xl mx-auto text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold mb-8">
            Рівні навчання
          </h2>
          <div className="flex flex-col gap-2">
            {levels.map((lvl, i) => (
              <motion.div
                key={lvl}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3 px-5 py-3 rounded-xl bg-muted/30 border border-border"
              >
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm font-medium text-foreground">{lvl}</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Tools */}
        <section className="py-16 px-4 max-w-4xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-10">
            Інструменти навчання
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {tools.map((t, i) => (
              <motion.div
                key={t.label}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06 }}
                className="glass-card p-4 flex flex-col items-center gap-2 text-center"
              >
                <t.icon className="w-6 h-6 text-primary" />
                <span className="text-xs font-semibold text-foreground">{t.label}</span>
              </motion.div>
            ))}
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 px-4 max-w-3xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-10">
            Відгуки учнів
          </h2>
          <div className="flex flex-col gap-4">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="glass-card p-4 flex gap-3 items-start"
              >
                <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full bg-muted" />
                <div>
                  <p className="text-sm text-foreground mb-1">"{t.text}"</p>
                  <p className="text-xs text-muted-foreground font-medium">{t.name}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 px-4 max-w-3xl mx-auto">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-center mb-10">
            Часті запитання
          </h2>
          <div className="flex flex-col gap-3">
            {faq.map((item, i) => (
              <details key={i} className="glass-card p-4 group">
                <summary className="font-display font-semibold text-sm text-foreground cursor-pointer list-none flex items-center justify-between">
                  {item.q}
                  <span className="text-muted-foreground group-open:rotate-45 transition-transform text-lg">+</span>
                </summary>
                <p className="text-sm text-muted-foreground mt-2">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="py-20 px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="max-w-md mx-auto flex flex-col items-center gap-4">
            <h2 className="font-display text-2xl font-bold">Готові почати?</h2>
            <p className="text-sm text-muted-foreground">Безкоштовно · Без реклами · Для україномовних</p>
            <button
              onClick={() => navigate("/auth")}
              className="px-10 py-4 rounded-2xl bg-primary text-primary-foreground font-display font-bold text-lg shadow-lg hover:bg-primary/90 active:scale-[0.98] transition-all"
              style={{ boxShadow: "0 8px 32px hsl(var(--primary) / 0.3)" }}
            >
              Почати навчання
            </button>
          </motion.div>
        </section>

        {/* Footer */}
        <footer className="py-8 px-4 border-t border-border text-center">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} KLAR · <a href="/privacy" className="hover:text-foreground transition-colors">Політика конфіденційності</a> · <a href="/terms" className="hover:text-foreground transition-colors">Оферта</a>
          </p>
        </footer>
      </div>
    </>
  );
};

export default LandingUk;
