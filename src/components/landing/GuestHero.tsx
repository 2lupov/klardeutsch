import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, MoveRight, Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import pandaExplorer from "@/assets/panda-explorer.png";
import { useTargetLanguage } from "@/contexts/TargetLanguageContext";


// ============================================================
// Klar.academy — Cinematic Editorial rebrand landing (guests)
// Palette: #0F0F23 / #1A1A3E / #6D5DFB / #F5A623
// Fonts:   Sora (display)  +  Manrope (body)
// ============================================================

// Countdown to end of the current promo (48h rolling)
function useCountdown() {
  const [end] = useState(() => {
    const stored = localStorage.getItem("klar_promo_end");
    if (stored) {
      const ts = parseInt(stored, 10);
      if (!isNaN(ts) && ts > Date.now()) return ts;
    }
    const ts = Date.now() + 1000 * 60 * 60 * 48;
    localStorage.setItem("klar_promo_end", String(ts));
    return ts;
  });
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const diff = Math.max(0, end - now);
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return { days: pad(days), hours: pad(hours), mins: pad(mins) };
}

const COURSES = [
  {
    level: "A1",
    title: "Початковий",
    desc: "База для тих, хто починає з абсолютного нуля.",
    price: "4 200 ₴",
    accent: false,
  },
  {
    level: "A2",
    title: "Базовий",
    desc: "Для простих розмов на побутові теми.",
    price: "4 500 ₴",
    accent: false,
  },
  {
    level: "B1",
    title: "Середній",
    desc: "Ключ до життя та роботи в Німеччині.",
    price: "5 100 ₴",
    accent: true,
  },
  {
    level: "B2",
    title: "Вище середнього",
    desc: "Складні теми та професійна лексика.",
    price: "5 800 ₴",
    accent: false,
  },
  {
    level: "C1",
    title: "Просунутий",
    desc: "Вільне володіння на рівні носія.",
    price: "6 500 ₴",
    accent: false,
  },
];

const GuestHero = () => {
  const navigate = useNavigate();
  const { days, hours, mins } = useCountdown();

  return (
    <div
      className="w-full bg-[#0F0F23] text-[#F5F3EE] font-[Manrope,sans-serif] -mt-4"
      style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
    >
      {/* ══════════════ Sticky Promo Banner ══════════════ */}
      <div className="sticky top-0 z-20 w-full bg-gradient-to-r from-[#6D5DFB] via-[#4F46E5] to-[#F5A623] py-2.5 pl-16 md:pl-4 pr-4 shadow-2xl shadow-[#6D5DFB]/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
              Акція
            </span>
            <p className="font-semibold text-xs md:text-sm truncate">
              День народження Klar — знижка -30% на всі рівні!
            </p>
          </div>
          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex gap-2 text-center">
              {[
                { v: days, l: "дні" },
                { v: hours, l: "год" },
                { v: mins, l: "хв" },
              ].map((seg, i) => (
                <div key={seg.l} className="flex items-center gap-2">
                  <div className="flex flex-col leading-none">
                    <span
                      className="text-base md:text-lg font-extrabold tabular-nums"
                      style={{ fontFamily: "Sora, sans-serif" }}
                    >
                      {seg.v}
                    </span>
                    <span className="text-[9px] uppercase opacity-80 mt-0.5">
                      {seg.l}
                    </span>
                  </div>
                  {i < 2 && <span className="text-base font-bold opacity-70">:</span>}
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate("/auth")}
              className="bg-white text-[#0F0F23] px-4 md:px-6 py-1.5 md:py-2 rounded-full font-bold text-xs md:text-sm hover:scale-105 active:scale-95 transition-transform shadow-lg whitespace-nowrap"
            >
              Забрати
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════ Main content ══════════════ */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 md:py-20 space-y-20 md:space-y-32">
        {/* ───── HERO ───── */}
        <section className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-7 md:space-y-8 relative z-10"
          >
            <div>
              <div className="flex items-center gap-3 text-[#F5A623] mb-5">
                <div className="h-px w-10 bg-[#F5A623]" />
                <span className="uppercase tracking-[0.25em] font-bold text-[11px] md:text-xs">
                  Твій шлях до Німеччини
                </span>
              </div>
              <h1
                className="text-5xl md:text-7xl lg:text-8xl font-extrabold leading-[1.02] tracking-tight"
                style={{ fontFamily: "Sora, sans-serif" }}
              >
                Німецька мова{" "}
                <br className="hidden sm:block" />
                <span className="text-[#6D5DFB]">без кордонів.</span>
              </h1>
            </div>
            <p className="text-lg md:text-xl text-[#F5F3EE]/60 max-w-lg leading-relaxed">
              Від початківця до вільного спілкування. Авторська методика, що
              знімає мовний бар'єр за 3 місяці.
            </p>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() =>
                  document
                    .getElementById("courses-section")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="bg-[#6D5DFB] hover:bg-[#5a4ae0] text-white px-8 md:px-10 py-4 md:py-5 rounded-2xl font-bold text-base md:text-lg transition-all shadow-[0_10px_40px_-8px_rgba(109,93,251,0.6)] flex items-center gap-3 group active:scale-95"
              >
                Обрати свій курс
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() =>
                  document
                    .getElementById("levels-section")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="bg-transparent border border-white/10 hover:border-[#6D5DFB]/40 hover:bg-white/[0.02] text-white px-8 md:px-10 py-4 md:py-5 rounded-2xl font-bold text-base md:text-lg transition-all"
              >
                Спробувати безкоштовно
              </button>
            </div>
          </motion.div>

          {/* Mascot */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative flex justify-center items-center"
          >
            <div className="absolute w-[110%] h-[110%] bg-[#6D5DFB]/15 rounded-full blur-3xl" />
            <div className="relative w-full aspect-square max-w-lg">
              <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A3E] to-[#0F0F23] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                <motion.img
                  src={pandaExplorer}
                  alt="Panda Explorer — ваш гід у світі німецької"
                  className="absolute inset-0 w-full h-full object-contain p-4"
                  animate={{ y: [0, -12, 0] }}
                  transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
                <div className="absolute bottom-5 left-5 right-5 bg-black/50 backdrop-blur-xl p-4 md:p-5 rounded-2xl border border-white/10">
                  <p
                    className="text-[#F5A623] font-bold italic text-sm md:text-base leading-snug"
                    style={{ fontFamily: "Sora, sans-serif" }}
                  >
                    "Hallo! Я твій гід світом німецької. Разом ми пройдемо шлях
                    від А1 до С1!"
                  </p>
                </div>
              </div>
              {/* Backpack badge */}
              <motion.div
                initial={{ rotate: 0 }}
                animate={{ rotate: [8, 16, 8] }}
                transition={{
                  duration: 4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="absolute -top-4 -right-4 w-20 h-20 md:w-24 md:h-24 bg-[#F5A623] rounded-2xl flex items-center justify-center shadow-xl"
              >
                <svg
                  className="w-8 h-8 md:w-10 md:h-10 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
                  />
                </svg>
              </motion.div>
            </div>
          </motion.div>
        </section>

        {/* ───── COURSES ───── */}
        <section id="courses-section" className="space-y-12 md:space-y-16">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-4">
              <h2
                className="text-4xl md:text-5xl font-extrabold uppercase tracking-tight"
                style={{ fontFamily: "Sora, sans-serif" }}
              >
                Наші курси
              </h2>
              <p className="text-[#F5F3EE]/50 max-w-md text-sm md:text-base">
                Оберіть свій рівень та розпочніть навчання вже сьогодні з
                доступом до платформи 24/7.
              </p>
            </div>
            <div className="flex gap-2">
              <div className="h-3 w-12 bg-[#6D5DFB] rounded-full" />
              <div className="h-3 w-3 bg-[#1A1A3E] rounded-full" />
              <div className="h-3 w-3 bg-[#1A1A3E] rounded-full" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 md:gap-6">
            {COURSES.map((c, i) => (
              <motion.div
                key={c.level}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                onClick={() => navigate("/auth")}
                className={`group cursor-pointer rounded-[2rem] p-7 md:p-8 space-y-6 transition-all hover:-translate-y-2 relative overflow-hidden ${
                  c.accent
                    ? "bg-[#6D5DFB] shadow-[0_20px_50px_-12px_rgba(109,93,251,0.5)]"
                    : "bg-[#1A1A3E] border border-white/5 hover:bg-[#252554]"
                }`}
              >
                {c.accent && (
                  <div className="absolute -right-6 top-4 bg-white/15 backdrop-blur-md px-6 py-1 rotate-12 text-[10px] font-bold uppercase tracking-widest text-white">
                    Популярно
                  </div>
                )}
                <div
                  className={`w-14 h-14 md:w-16 md:h-16 rounded-2xl flex items-center justify-center font-extrabold text-xl md:text-2xl transition-colors ${
                    c.accent
                      ? "bg-white text-[#6D5DFB]"
                      : "bg-[#6D5DFB]/20 text-[#6D5DFB] group-hover:bg-[#6D5DFB] group-hover:text-white"
                  }`}
                  style={{ fontFamily: "Sora, sans-serif" }}
                >
                  {c.level}
                </div>
                <div className="space-y-2">
                  <h3
                    className={`text-lg md:text-xl font-bold ${
                      c.accent ? "text-white" : ""
                    }`}
                  >
                    {c.title}
                  </h3>
                  <p
                    className={`text-sm leading-relaxed ${
                      c.accent ? "text-white/80" : "text-[#F5F3EE]/50"
                    }`}
                  >
                    {c.desc}
                  </p>
                </div>
                <div
                  className={`pt-4 border-t flex items-center justify-between ${
                    c.accent ? "border-white/20" : "border-white/5"
                  }`}
                >
                  <span
                    className={`font-bold ${
                      c.accent ? "text-white" : "text-[#F5A623]"
                    }`}
                  >
                    {c.price}
                  </span>
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                      c.accent
                        ? "bg-white text-[#6D5DFB]"
                        : "border border-white/10 group-hover:border-[#F5A623] text-[#F5F3EE]"
                    }`}
                  >
                    <MoveRight className="w-4 h-4" />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="text-center pt-4">
            <button
              onClick={() =>
                document
                  .getElementById("levels-section")
                  ?.scrollIntoView({ behavior: "smooth" })
              }
              className="text-[#F5F3EE]/50 hover:text-[#F5A623] text-sm font-semibold uppercase tracking-widest transition-colors"
            >
              ↓ Або спробуй платформу безкоштовно
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};

export default GuestHero;
