import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, Gamepad2, BookOpen, GraduationCap, Sparkles, MessageSquare, Briefcase, Plane } from "lucide-react";
import pandaPilot from "@/assets/panda-pilot.png";

const PERKS = [
  { icon: Gamepad2, title: "Мовні ігри", desc: "Тренуй словниковий запас у форматі мініігор", gate: "A1" },
  { icon: BookOpen, title: "Розумний словник", desc: "Твої слова, приклади та повторення за SM-2", gate: "A2" },
  { icon: GraduationCap, title: "Академія KLAR", desc: "Курси A1 → C1 з інтерактивними уроками", gate: "B1" },
  { icon: Briefcase, title: "AI Менеджер", desc: "Допомога з листами, документами, перекладом", gate: "B2" },
  { icon: MessageSquare, title: "Заняття з AI", desc: "Розмовна практика 24/7 з голосовим AI", gate: "C1" },
  { icon: Sparkles, title: "AI Асистент", desc: "Пояснення граматики, помилок, теми на льоту", gate: "C2" },
];

const Trial = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const level = params.get("level") || "A1";
  const today = new Date().toLocaleDateString("uk-UA", { day: "2-digit", month: "short" });

  return (
    <div
      className="min-h-full w-full relative overflow-hidden"
      style={{
        backgroundColor: "#F4EEE1",
        backgroundImage:
          "radial-gradient(circle at 15% 20%, rgba(15,23,42,0.05) 1px, transparent 1px), radial-gradient(circle at 85% 70%, rgba(234,88,12,0.06) 1px, transparent 1px)",
        backgroundSize: "28px 28px, 32px 32px",
        color: "#0F172A",
      }}
    >
      <div className="relative max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-10">
        {/* Top bar — airport style */}
        <div className="flex items-center justify-between mb-6 md:mb-10">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-[#0F172A]/60 hover:text-[#EA580C] text-sm font-mono uppercase tracking-widest transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Назад
          </button>
          <div className="hidden md:flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.3em] text-[#0F172A]/50">
            <span>Gate KLAR</span>
            <span className="w-1 h-1 rounded-full bg-[#EA580C] animate-pulse" />
            <span>Boarding open</span>
          </div>
        </div>

        {/* Boarding pass */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative bg-white rounded-[2rem] shadow-[0_40px_80px_-30px_rgba(15,23,42,0.35)] overflow-hidden border border-[#0F172A]/5"
        >
          {/* Perforation */}
          <div className="hidden lg:block absolute top-0 bottom-0 right-[38%] w-px border-l-2 border-dashed border-[#0F172A]/15" />
          <div className="hidden lg:block absolute -top-3 right-[38%] -translate-x-1/2 w-6 h-6 rounded-full bg-[#F4EEE1]" />
          <div className="hidden lg:block absolute -bottom-3 right-[38%] -translate-x-1/2 w-6 h-6 rounded-full bg-[#F4EEE1]" />

          <div className="grid lg:grid-cols-[1fr_38%]">
            {/* LEFT — main ticket */}
            <div className="p-6 md:p-10 lg:p-12">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-9 h-9 rounded-full bg-[#0F172A] flex items-center justify-center">
                  <Plane className="w-4 h-4 text-[#F97316]" />
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#0F172A]/60">
                  KLAR Airlines · Boarding Pass
                </div>
              </div>

              <div className="flex items-end gap-6 md:gap-10 mb-8">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[#0F172A]/45 mb-1">From</div>
                  <div className="text-4xl md:text-5xl font-black tracking-tight" style={{ fontFamily: "Sora, sans-serif" }}>
                    YOU
                  </div>
                  <div className="text-xs text-[#0F172A]/50">Beginner Terminal</div>
                </div>
                <div className="flex-1 flex items-center gap-2 pb-3">
                  <div className="flex-1 border-t-2 border-dashed border-[#0F172A]/25" />
                  <Plane className="w-5 h-5 text-[#EA580C] -rotate-12" />
                  <div className="flex-1 border-t-2 border-dashed border-[#0F172A]/25" />
                </div>
                <div className="text-right">
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[#0F172A]/45 mb-1">To</div>
                  <div className="text-4xl md:text-5xl font-black tracking-tight text-[#EA580C]" style={{ fontFamily: "Sora, sans-serif" }}>
                    PRO
                  </div>
                  <div className="text-xs text-[#0F172A]/50">Fluent City</div>
                </div>
              </div>

              <h1
                className="text-3xl md:text-5xl font-black leading-[1.05] tracking-tight mb-4"
                style={{ fontFamily: "Sora, sans-serif" }}
              >
                Твій квиток на <span className="text-[#EA580C]">5 днів</span> у KLAR-PRO.
              </h1>
              <p className="text-base md:text-lg text-[#0F172A]/65 max-w-xl leading-relaxed mb-8">
                Салон відкритий. Пристібай ремінь — і забирай усі інструменти платформи без обмежень.
                Ігри, словник, академія, AI-заняття та асистент — все на борту.
              </p>

              {/* Ticket meta grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8 pb-8 border-b border-dashed border-[#0F172A]/15">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[#0F172A]/45">Flight</div>
                  <div className="font-bold text-lg">KLR-{level}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[#0F172A]/45">Date</div>
                  <div className="font-bold text-lg">{today}</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[#0F172A]/45">Seat</div>
                  <div className="font-bold text-lg">1A · VIP</div>
                </div>
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-widest text-[#0F172A]/45">Class</div>
                  <div className="font-bold text-lg text-[#EA580C]">Full Access</div>
                </div>
              </div>

              {/* CTAs */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => navigate(`/auth?mode=signup&level=${level}`)}
                  className="bg-[#0F172A] hover:bg-[#EA580C] text-white px-8 md:px-10 py-4 md:py-5 rounded-full font-bold text-base md:text-lg transition-all shadow-[0_15px_40px_-12px_rgba(15,23,42,0.5)] flex items-center gap-3 group active:scale-95"
                >
                  <Plane className="w-5 h-5 -rotate-12" />
                  Забрати квиток
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button
                  onClick={() => navigate("/auth")}
                  className="text-[#0F172A]/70 hover:text-[#EA580C] px-4 py-3 text-sm font-semibold underline underline-offset-4 transition-colors"
                >
                  У мене вже є посадковий →
                </button>
              </div>

              <div className="flex flex-wrap gap-x-5 gap-y-2 pt-5 text-xs font-mono uppercase tracking-widest text-[#0F172A]/50">
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#EA580C]" /> Без карти</span>
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#EA580C]" /> Скасувати в 1 клік</span>
                <span className="flex items-center gap-1.5"><Check className="w-3.5 h-3.5 text-[#EA580C]" /> Повний функціонал</span>
              </div>
            </div>

            {/* RIGHT — stub with mascot */}
            <div className="relative bg-gradient-to-br from-[#0F172A] to-[#1E293B] p-6 md:p-10 flex flex-col items-center justify-between text-white overflow-hidden">
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: "repeating-linear-gradient(45deg, #fff 0 1px, transparent 1px 12px)",
              }} />
              <div className="relative w-full flex items-center justify-between">
                <div>
                  <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/50">Captain</div>
                  <div className="font-bold text-lg" style={{ fontFamily: "Sora, sans-serif" }}>Panda VIP</div>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-[0.3em] text-[#F97316]">1A</div>
              </div>

              <motion.img
                src={pandaPilot}
                alt="Panda Pilot Mascot"
                width={1024}
                height={1024}
                className="relative w-56 md:w-72 h-auto drop-shadow-[0_25px_35px_rgba(0,0,0,0.5)]"
                animate={{ y: [0, -10, 0], rotate: [-2, 2, -2] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              />

              <div className="relative w-full space-y-3">
                <div className="bg-white/10 backdrop-blur-sm border border-white/15 rounded-2xl p-4">
                  <p className="text-sm italic leading-snug text-white/90" style={{ fontFamily: "Sora, sans-serif" }}>
                    «Ласкаво просимо на борт! Мене звати Пан Панда — ваш капітан на наступні 5 днів. ✈️»
                  </p>
                </div>
                {/* Barcode */}
                <div className="flex items-end gap-[2px] h-10 justify-center">
                  {Array.from({ length: 44 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-[2px] bg-white"
                      style={{ height: `${30 + ((i * 37) % 70)}%`, opacity: (i % 3 === 0 ? 1 : 0.6) }}
                    />
                  ))}
                </div>
                <div className="text-center font-mono text-[10px] tracking-[0.4em] text-white/50">
                  KLR-{level}-2026-VIP
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Perks — luggage / passport stamps grid */}
        <div className="mt-16 md:mt-24">
          <div className="flex items-center gap-4 mb-8">
            <div className="font-mono text-[10px] md:text-xs uppercase tracking-[0.3em] text-[#EA580C] font-bold">
              Included on board
            </div>
            <div className="flex-1 h-px bg-[#0F172A]/15" />
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {PERKS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 20, rotate: i % 2 === 0 ? -1 : 1 }}
                animate={{ opacity: 1, y: 0, rotate: i % 2 === 0 ? -0.6 : 0.6 }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                whileHover={{ y: -4, rotate: 0 }}
                className="relative bg-white rounded-2xl p-6 border border-[#0F172A]/8 shadow-[0_10px_30px_-15px_rgba(15,23,42,0.2)]"
              >
                <div className="absolute top-4 right-4 font-mono text-[9px] uppercase tracking-widest text-[#EA580C]/70 border border-[#EA580C]/30 rounded-full px-2 py-0.5">
                  {p.gate}
                </div>
                <div className="w-11 h-11 rounded-xl bg-[#0F172A] text-[#F97316] flex items-center justify-center mb-4">
                  <p.icon className="w-5 h-5" />
                </div>
                <h3 className="text-lg font-black mb-1" style={{ fontFamily: "Sora, sans-serif" }}>
                  {p.title}
                </h3>
                <p className="text-sm text-[#0F172A]/60 leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center mt-16 md:mt-20">
          <button
            onClick={() => navigate(`/auth?mode=signup&level=${level}`)}
            className="bg-[#EA580C] hover:bg-[#0F172A] text-white px-10 py-5 rounded-full font-bold text-lg transition-all shadow-[0_15px_40px_-12px_rgba(234,88,12,0.6)] inline-flex items-center gap-3 group active:scale-95"
          >
            <Plane className="w-5 h-5 -rotate-12" />
            Пристібнутись і злітаємо
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
          <p className="text-[11px] font-mono uppercase tracking-[0.3em] text-[#0F172A]/45 mt-4">
            Free 5-day pass · No card · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
};

export default Trial;
