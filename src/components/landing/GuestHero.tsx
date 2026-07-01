import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, MoveRight, Check, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import pandaExplorer from "@/assets/panda-explorer.png";
import { useTargetLanguage } from "@/contexts/TargetLanguageContext";

// ============================================================
// Klar.academy — Step-by-step guest landing
// Palette: #0F0F23 / #1A1A3E / #6D5DFB / #F5A623
// ============================================================

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
  { level: "A1", title: "Початковий", desc: "База для тих, хто починає з абсолютного нуля.", price: "4 200 ₴", accent: false },
  { level: "A2", title: "Базовий", desc: "Для простих розмов на побутові теми.", price: "4 500 ₴", accent: false },
  { level: "B1", title: "Середній", desc: "Ключ до життя та роботи за кордоном.", price: "5 100 ₴", accent: true },
  { level: "B2", title: "Вище середнього", desc: "Складні теми та професійна лексика.", price: "5 800 ₴", accent: false },
  { level: "C1", title: "Просунутий", desc: "Вільне володіння на рівні носія.", price: "6 500 ₴", accent: false },
];

const LANG_COPY: Record<string, { name: string; nameAcc: string; heroKicker: string; mascotQuote: string }> = {
  de: { name: "Німецька", nameAcc: "німецьку", heroKicker: "Твій шлях до Німеччини", mascotQuote: "Hallo! Я твій гід світом німецької. Разом ми пройдемо шлях від А1 до С1!" },
  en: { name: "Англійська", nameAcc: "англійську", heroKicker: "Твій ключ до світу", mascotQuote: "Hello! Я твій гід світом англійської. Разом ми дійдемо від A1 до C1!" },
  pl: { name: "Польська", nameAcc: "польську", heroKicker: "Твій шлях до Польщі", mascotQuote: "Cześć! Я твій гід світом польської. Разом ми дійдемо від A1 до C1!" },
  es: { name: "Іспанська", nameAcc: "іспанську", heroKicker: "Твій шлях до Іспанії", mascotQuote: "¡Hola! Я твій гід світом іспанської. Разом ми дійдемо від A1 до C1!" },
  fr: { name: "Французька", nameAcc: "французьку", heroKicker: "Твій шлях до Франції", mascotQuote: "Bonjour! Я твій гід світом французької. Разом ми дійдемо від A1 до C1!" },
};

const TOTAL_STEPS = 3;

const GuestHero = () => {
  const navigate = useNavigate();
  const { days, hours, mins } = useCountdown();
  const { targetLang, setTargetLang, languages } = useTargetLanguage();
  const copy = LANG_COPY[targetLang] ?? LANG_COPY.de;
  const [step, setStep] = useState(1);

  const goNext = () => setStep((s) => Math.min(TOTAL_STEPS, s + 1));
  const goBack = () => setStep((s) => Math.max(1, s - 1));

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [step]);

  return (
    <div
      className="w-full min-h-[100dvh] bg-[#0F0F23] text-[#F5F3EE] font-[Manrope,sans-serif] -mt-4"
      style={{ fontFamily: "Manrope, system-ui, sans-serif" }}
    >
      {/* Promo banner */}
      <div className="sticky top-0 z-20 w-full bg-gradient-to-r from-[#6D5DFB] via-[#4F46E5] to-[#F5A623] py-2.5 pl-16 pr-16 md:pl-4 md:pr-4 shadow-2xl shadow-[#6D5DFB]/20">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-center md:justify-between gap-2 md:gap-3 text-center md:text-left">
          <div className="flex items-center justify-center gap-2 md:gap-3 min-w-0 flex-wrap">
            <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest whitespace-nowrap">
              Акція
            </span>
            <p className="font-semibold text-xs md:text-sm md:truncate">
              День народження Klar — знижка -30%!
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 md:gap-6">
            <div className="flex gap-2 text-center">
              {[{ v: days, l: "дні" }, { v: hours, l: "год" }, { v: mins, l: "хв" }].map((seg, i) => (
                <div key={seg.l} className="flex items-center gap-2">
                  <div className="flex flex-col leading-none">
                    <span className="text-base md:text-lg font-extrabold tabular-nums" style={{ fontFamily: "Sora, sans-serif" }}>{seg.v}</span>
                    <span className="text-[9px] uppercase opacity-80 mt-0.5">{seg.l}</span>
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


      {/* Stepper header */}
      <div className="max-w-3xl mx-auto px-4 md:px-6 pt-4 md:pt-12">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={goBack}
            disabled={step === 1}
            className="flex items-center gap-1.5 text-xs md:text-sm text-[#F5F3EE]/60 hover:text-[#F5A623] disabled:opacity-0 disabled:pointer-events-none transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Назад
          </button>
          <span className="text-[10px] md:text-xs uppercase tracking-[0.25em] font-bold text-[#F5F3EE]/50">
            Крок {step}
          </span>
          <div className="w-[60px]" />
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-500 ${
                i < step ? "bg-[#6D5DFB]" : "bg-[#1A1A3E]"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Steps */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-5 md:py-16">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.section
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
              className="space-y-5 md:space-y-8"
            >
              <div className="text-center space-y-2 md:space-y-3">
                <div className="inline-flex items-center gap-3 text-[#F5A623]">
                  <div className="h-px w-8 bg-[#F5A623]" />
                  <span className="uppercase tracking-[0.25em] font-bold text-[10px] md:text-xs">Обери мову</span>
                  <div className="h-px w-8 bg-[#F5A623]" />
                </div>
                <h2 className="text-2xl md:text-5xl font-extrabold tracking-tight leading-tight" style={{ fontFamily: "Sora, sans-serif" }}>
                  Яку мову ти хочеш <span className="text-[#6D5DFB]">вивчати?</span>
                </h2>
                <p className="text-[#F5F3EE]/60 text-xs md:text-base max-w-md mx-auto">
                  Обери мову — і ми покажемо курси та демо саме для неї.
                </p>
              </div>


              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 max-w-4xl mx-auto">
                {languages.map((l) => {
                  const active = l.code === targetLang;
                  const disabled = !l.is_active;
                  return (
                    <button
                      key={l.code}
                      disabled={disabled}
                      onClick={() => setTargetLang(l.code)}
                      className={`relative rounded-2xl p-5 md:p-6 flex flex-col items-center gap-2 md:gap-3 transition-all border ${
                        disabled
                          ? "bg-[#1A1A3E]/40 border-white/5 opacity-50 cursor-not-allowed"
                          : active
                          ? "bg-[#6D5DFB] border-[#6D5DFB] shadow-[0_15px_40px_-10px_rgba(109,93,251,0.6)] -translate-y-1"
                          : "bg-[#1A1A3E] border-white/5 hover:border-[#6D5DFB]/40 hover:-translate-y-1"
                      }`}
                    >
                      {active && (
                        <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white text-[#6D5DFB] flex items-center justify-center">
                          <Check className="w-3.5 h-3.5" strokeWidth={3} />
                        </div>
                      )}
                      <span className="text-4xl md:text-5xl leading-none">{l.flag_emoji}</span>
                      <span className={`font-bold text-sm md:text-base ${active ? "text-white" : ""}`} style={{ fontFamily: "Sora, sans-serif" }}>
                        {l.name_uk}
                      </span>
                      {disabled && (
                        <span className="text-[9px] uppercase tracking-widest text-[#F5A623] font-bold">Скоро</span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex justify-center pt-4">
                <button
                  onClick={goNext}
                  className="bg-[#6D5DFB] hover:bg-[#5a4ae0] text-white px-10 py-4 rounded-2xl font-bold text-base md:text-lg transition-all shadow-[0_10px_40px_-8px_rgba(109,93,251,0.6)] flex items-center gap-3 group active:scale-95"
                >
                  Далі
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </motion.section>
          )}

          {step === 2 && (
            <motion.section
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
              className="grid lg:grid-cols-2 gap-10 lg:gap-12 items-center"
            >
              <div className="space-y-7 md:space-y-8 relative z-10">
                <div className="relative">
                  <div className="flex items-center gap-3 text-[#F5A623] mb-5">
                    <div className="h-px w-10 bg-[#F5A623]" />
                    <span className="uppercase tracking-[0.25em] font-bold text-[11px] md:text-xs">{copy.heroKicker}</span>
                  </div>
                  <h1 className="text-5xl md:text-7xl lg:text-8xl font-extrabold leading-[1.02] tracking-tight" style={{ fontFamily: "Sora, sans-serif" }}>
                    {copy.name} мова <br className="hidden sm:block" />
                    <span className="text-[#6D5DFB]">без кордонів.</span>
                  </h1>
                  {/* Floating CTA in the whitespace between the wrapped headline lines */}
                  <button
                    onClick={goNext}
                    className="hidden lg:flex absolute right-0 top-[38%] bg-[#6D5DFB] hover:bg-[#5a4ae0] text-white px-7 py-4 rounded-2xl font-bold text-base transition-all shadow-[0_10px_40px_-8px_rgba(109,93,251,0.6)] items-center gap-3 group active:scale-95"
                  >
                    Показати курси
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>
                <p className="text-lg md:text-xl text-[#F5F3EE]/60 max-w-lg leading-relaxed">
                  Від початківця до вільного спілкування. Авторська методика, що знімає мовний бар'єр за 3 місяці.
                </p>
                <button
                  onClick={goNext}
                  className="lg:hidden bg-[#6D5DFB] hover:bg-[#5a4ae0] text-white px-8 py-4 rounded-2xl font-bold text-base transition-all shadow-[0_10px_40px_-8px_rgba(109,93,251,0.6)] flex items-center gap-3 group active:scale-95"
                >
                  Показати курси
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>


              <div className="relative flex justify-center items-center">
                <div className="absolute w-[110%] h-[110%] bg-[#6D5DFB]/15 rounded-full blur-3xl" />
                <div className="relative w-full aspect-square max-w-lg">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A3E] to-[#0F0F23] rounded-3xl border border-white/5 overflow-hidden shadow-2xl">
                    <motion.img
                      src={pandaExplorer}
                      alt={`Panda Explorer — гід у світі ${copy.nameAcc}`}
                      className="absolute inset-0 w-full h-full object-contain p-4"
                      animate={{ y: [0, -12, 0] }}
                      transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                    />
                    <div className="absolute bottom-5 left-5 right-5 bg-black/50 backdrop-blur-xl p-4 md:p-5 rounded-2xl border border-white/10">
                      <p className="text-[#F5A623] font-bold italic text-sm md:text-base leading-snug" style={{ fontFamily: "Sora, sans-serif" }}>
                        "{copy.mascotQuote}"
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </motion.section>
          )}

          {step === 3 && (
            <motion.section
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.35 }}
              className="space-y-10 md:space-y-14"
            >
              <div className="text-center space-y-3">
                <div className="inline-flex items-center gap-3 text-[#F5A623]">
                  <div className="h-px w-8 bg-[#F5A623]" />
                  <span className="uppercase tracking-[0.25em] font-bold text-[11px] md:text-xs">Обери свій рівень</span>
                  <div className="h-px w-8 bg-[#F5A623]" />
                </div>
                <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight" style={{ fontFamily: "Sora, sans-serif" }}>
                  Наші <span className="text-[#6D5DFB]">курси</span>
                </h2>
                <p className="text-[#F5F3EE]/60 text-sm md:text-base max-w-md mx-auto">
                  Оберіть свій рівень та розпочніть навчання вже сьогодні.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5 md:gap-6">
                {COURSES.map((c, i) => (
                  <motion.div
                    key={c.level}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.08 }}
                    onClick={() => navigate(`/trial?level=${c.level}`)}

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
                        c.accent ? "bg-white text-[#6D5DFB]" : "bg-[#6D5DFB]/20 text-[#6D5DFB] group-hover:bg-[#6D5DFB] group-hover:text-white"
                      }`}
                      style={{ fontFamily: "Sora, sans-serif" }}
                    >
                      {c.level}
                    </div>
                    <div className="space-y-2">
                      <h3 className={`text-lg md:text-xl font-bold ${c.accent ? "text-white" : ""}`}>{c.title}</h3>
                      <p className={`text-sm leading-relaxed ${c.accent ? "text-white/80" : "text-[#F5F3EE]/50"}`}>{c.desc}</p>
                    </div>
                    <div className={`pt-4 border-t flex items-center justify-between ${c.accent ? "border-white/20" : "border-white/5"}`}>
                      <span className={`font-bold ${c.accent ? "text-white" : "text-[#F5A623]"}`}>{c.price}</span>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                        c.accent ? "bg-white text-[#6D5DFB]" : "border border-white/10 group-hover:border-[#F5A623] text-[#F5F3EE]"
                      }`}>
                        <MoveRight className="w-4 h-4" />
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              <div className="text-center pt-4">
                <button
                  onClick={() => navigate("/auth")}
                  className="text-[#F5F3EE]/60 hover:text-[#F5A623] text-sm font-semibold uppercase tracking-widest transition-colors"
                >
                  ↓ Або спробуй платформу безкоштовно
                </button>
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GuestHero;
