import { motion } from "framer-motion";
import { Flame, Coins, Sparkles, TrendingUp, BookOpen, Gamepad2, GraduationCap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import LivePanda from "@/components/LivePanda";
import { useXP } from "@/hooks/useXP";
import { useCoins } from "@/hooks/useCoins";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import LevelSelector from "@/components/LevelSelector";
import SRSWidget from "@/components/SRSWidget";
import DailyChallenge from "@/components/DailyChallenge";
import type { Level } from "@/data/lessons";

interface Props {
  displayName: string | null;
  onSelectLevel: (l: Level) => void;
}

/**
 * Cinematic Editorial home dashboard for authenticated users.
 * Palette: #0F0F23 · #1A1A3E · #6D5DFB · #F5A623
 * Fonts:   Sora display + Manrope body
 */
const HomeDashboard = ({ displayName, onSelectLevel }: Props) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { totalXP } = useXP();
  const { balance: coins } = useCoins();
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("daily_bonus")
        .select("streak")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data && typeof data.streak === "number") {
        setStreak(data.streak);
      }
    })();
  }, [user]);

  const hour = new Date().getHours();
  const greet = hour < 6 ? "Guten Morgen" : hour < 12 ? "Guten Morgen" : hour < 18 ? "Guten Tag" : "Guten Abend";

  const stats = [
    { icon: TrendingUp, label: "XP", value: totalXP, color: "text-[hsl(var(--primary))]" },
    { icon: Coins, label: "Монет", value: coins, color: "text-[hsl(var(--accent))]" },
    { icon: Flame, label: "Стрік", value: `${streak} дн.`, color: "text-orange-400" },
  ];

  return (
    <div className="w-full min-h-full bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 md:px-6 pt-6 pb-24 space-y-8 md:space-y-10">
        {/* ─────────── HERO PANEL ─────────── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative overflow-hidden rounded-[2rem] border border-white/5 bg-gradient-hero shadow-card-elevated"
        >
          <div className="absolute -top-20 -right-20 w-80 h-80 bg-primary/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-16 w-72 h-72 bg-accent/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative grid md:grid-cols-[1.4fr_1fr] gap-6 p-6 md:p-10 items-center">
            <div className="space-y-5 md:space-y-6 min-w-0">
              <h1 className="font-display font-extrabold leading-[1.02] tracking-tight text-3xl sm:text-4xl md:text-5xl">
                Привіт{displayName ? `, ${displayName.split(" ")[0]}` : ""}.{" "}
                <span className="text-primary">Продовжимо?</span>
              </h1>
              <p className="text-foreground/60 max-w-md text-sm md:text-base leading-relaxed">
                Один урок сьогодні — крок ближче до вільної німецької.
                Обери рівень і почни там, де зупинився.
              </p>

              {/* Stats row */}
              <div className="flex flex-wrap gap-2 md:gap-3">
                {stats.map((s) => (
                  <div
                    key={s.label}
                    className="flex items-center gap-2 px-3 md:px-4 py-2 md:py-2.5 rounded-2xl bg-white/[0.04] border border-white/10 backdrop-blur-sm"
                  >
                    <s.icon className={`w-4 h-4 ${s.color}`} />
                    <span className="font-display font-bold text-sm md:text-base tabular-nums">
                      {s.value}
                    </span>
                    <span className="text-[10px] md:text-xs uppercase tracking-widest text-foreground/50">
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-3 pt-1">
                <button
                  onClick={() => navigate("/academy")}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-3 rounded-2xl font-bold text-sm md:text-base shadow-primary-glow flex items-center gap-2 transition-transform active:scale-95"
                >
                  <Sparkles className="w-4 h-4" />
                  Академія
                </button>
                <button
                  onClick={() => navigate("/assistant")}
                  className="bg-white/[0.04] border border-white/10 hover:border-primary/40 hover:bg-white/[0.06] text-foreground px-6 py-3 rounded-2xl font-bold text-sm md:text-base transition-colors"
                >
                  AI-асистент
                </button>
              </div>
            </div>

            {/* Mascot */}
            <div className="relative hidden md:flex justify-center items-center">
              <div className="absolute w-72 h-72 bg-primary/15 rounded-full blur-3xl" />
              <LivePanda className="relative h-72 w-auto object-contain drop-shadow-[0_20px_40px_rgba(109,93,251,0.35)]" />
              <motion.div
                initial={{ rotate: 8 }}
                animate={{ rotate: [8, 14, 8] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-2 right-8 w-16 h-16 bg-accent rounded-2xl flex items-center justify-center shadow-accent-glow"
              >
                <Sparkles className="w-7 h-7 text-white" />
              </motion.div>
            </div>
          </div>
        </motion.section>

        {/* ─────────── LEVELS ─────────── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-5"
        >


          <div className="rounded-[1.5rem] bg-card/60 border border-white/5 p-4 md:p-6">
            <LevelSelector onSelect={onSelectLevel} />
          </div>
        </motion.section>

        {/* ─────────── DAILY / SRS ─────────── */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="grid md:grid-cols-2 gap-4"
        >
          <div className="rounded-[1.5rem] bg-card/60 border border-white/5 p-4 md:p-5 flex flex-col gap-3">
            <SRSWidget />
            <div className="grid grid-cols-3 gap-2 mt-auto">
              {[
                { icon: BookOpen, label: "Словник", to: "/dictionary" },
                { icon: Gamepad2, label: "Ігри", to: "/games" },
                { icon: GraduationCap, label: "Академія", to: "/academy" },
              ].map(({ icon: Icon, label, to }) => (
                <button
                  key={to}
                  onClick={() => navigate(to)}
                  className="group flex flex-col items-center justify-center gap-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 hover:border-primary/30 transition p-3"
                >
                  <Icon className="w-5 h-5 text-primary group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-medium text-foreground/80">{label}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-[1.5rem] bg-card/60 border border-white/5 p-4 md:p-5">
            <DailyChallenge />
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default HomeDashboard;
