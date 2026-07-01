import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Gamepad2, BookOpen, GraduationCap, Sparkles, MessageSquare, Briefcase } from "lucide-react";
import pandaExplorer from "@/assets/panda-explorer.png";

const PERKS = [
  { icon: Gamepad2, title: "Мовні ігри", desc: "Тренуй словниковий запас у форматі мініігор" },
  { icon: BookOpen, title: "Розумний словник", desc: "Твої слова, приклади та повторення за SM-2" },
  { icon: GraduationCap, title: "Академія KLAR", desc: "Курси A1 → C1 з інтерактивними уроками" },
  { icon: Briefcase, title: "AI Менеджер", desc: "Допомога з листами, документами, перекладом" },
  { icon: MessageSquare, title: "Заняття з AI", desc: "Розмовна практика 24/7 з голосовим AI" },
  { icon: Sparkles, title: "AI Асистент", desc: "Пояснення граматики, помилок, теми на льоту" },
];

const Trial = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const level = params.get("level") || "A1";

  return (
    <div className="min-h-full w-full bg-[#0F0F23] text-[#F5F3EE] relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[900px] bg-[#6D5DFB]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-[#F5A623]/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
        {/* Back */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-[#F5F3EE]/60 hover:text-[#F5A623] text-sm mb-8 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Назад
        </button>

        {/* Hero */}
        <div className="grid lg:grid-cols-[1.15fr_1fr] gap-10 lg:gap-12 items-center mb-14 md:mb-20">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6"
          >
            <div className="inline-flex items-center gap-2 bg-[#F5A623]/10 border border-[#F5A623]/30 text-[#F5A623] px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-[0.2em]">
              <Sparkles className="w-3.5 h-3.5" /> 5 днів безкоштовно · курс {level}
            </div>
            <h1
              className="text-4xl md:text-6xl lg:text-7xl font-extrabold leading-[1.03] tracking-tight"
              style={{ fontFamily: "Sora, sans-serif" }}
            >
              Зареєструйся на <span className="text-[#6D5DFB]">KLAR</span> — <br className="hidden md:block" />
              і відчуй себе <span className="text-[#F5A623]">про</span>.
            </h1>
            <p className="text-lg md:text-xl text-[#F5F3EE]/60 max-w-xl leading-relaxed">
              5 днів повного доступу до всієї платформи. Без обмежень, без карти. Просто заходь і вчись так,
              як завжди хотів.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => navigate(`/auth?mode=signup&level=${level}`)}
                className="bg-[#6D5DFB] hover:bg-[#5a4ae0] text-white px-8 md:px-10 py-4 md:py-5 rounded-2xl font-bold text-base md:text-lg transition-all shadow-[0_10px_40px_-8px_rgba(109,93,251,0.6)] flex items-center gap-3 group active:scale-95"
              >
                Активувати 5 днів
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
              <button
                onClick={() => navigate("/auth")}
                className="text-[#F5F3EE]/70 hover:text-[#F5A623] px-4 py-3 text-sm font-semibold transition-colors"
              >
                Вже маю акаунт →
              </button>
            </div>

            <div className="flex flex-wrap gap-4 pt-3 text-sm text-[#F5F3EE]/50">
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#6D5DFB]" /> Без прив'язки карти</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#6D5DFB]" /> Скасувати в 1 клік</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-[#6D5DFB]" /> Повний функціонал</span>
            </div>
          </motion.div>

          {/* Panda */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.15 }}
            className="relative flex justify-center items-center"
          >
            <div className="absolute w-[110%] h-[110%] bg-[#6D5DFB]/20 rounded-full blur-3xl" />
            <div className="relative w-full aspect-square max-w-md">
              <div className="absolute inset-0 bg-gradient-to-br from-[#1A1A3E] to-[#0F0F23] rounded-[2.5rem] border border-white/5 overflow-hidden shadow-2xl">
                <motion.img
                  src={pandaExplorer}
                  alt="Panda Mascot"
                  className="absolute inset-0 w-full h-full object-contain p-4"
                  animate={{ y: [0, -14, 0] }}
                  transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
                />
                <div className="absolute bottom-5 left-5 right-5 bg-black/50 backdrop-blur-xl p-4 md:p-5 rounded-2xl border border-white/10">
                  <p
                    className="text-[#F5A623] font-bold italic text-sm md:text-base leading-snug"
                    style={{ fontFamily: "Sora, sans-serif" }}
                  >
                    "5 днів разом — і ти вже говориш вільніше. Обіцяю!"
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Perks grid */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 text-[#F5A623] mb-3">
            <div className="h-px w-8 bg-[#F5A623]" />
            <span className="uppercase tracking-[0.25em] font-bold text-[11px] md:text-xs">Що ти отримаєш</span>
            <div className="h-px w-8 bg-[#F5A623]" />
          </div>
          <h2
            className="text-3xl md:text-4xl font-extrabold tracking-tight"
            style={{ fontFamily: "Sora, sans-serif" }}
          >
            Повний доступ до <span className="text-[#6D5DFB]">всього KLAR</span>
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {PERKS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="group bg-[#1A1A3E] border border-white/5 hover:border-[#6D5DFB]/40 hover:-translate-y-1 rounded-2xl p-6 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-[#6D5DFB]/15 text-[#6D5DFB] flex items-center justify-center mb-4 group-hover:bg-[#6D5DFB] group-hover:text-white transition-colors">
                <p.icon className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold mb-1.5" style={{ fontFamily: "Sora, sans-serif" }}>
                {p.title}
              </h3>
              <p className="text-sm text-[#F5F3EE]/55 leading-relaxed">{p.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Final CTA */}
        <div className="text-center mt-14 md:mt-20">
          <button
            onClick={() => navigate(`/auth?mode=signup&level=${level}`)}
            className="bg-[#6D5DFB] hover:bg-[#5a4ae0] text-white px-10 py-5 rounded-2xl font-bold text-lg transition-all shadow-[0_10px_40px_-8px_rgba(109,93,251,0.6)] inline-flex items-center gap-3 group active:scale-95"
          >
            Спробувати 5 днів безкоштовно
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-xs text-[#F5F3EE]/40 mt-4 uppercase tracking-widest">
            Без карти · Без ризику · Скасувати в 1 клік
          </p>
        </div>
      </div>
    </div>
  );
};

export default Trial;
