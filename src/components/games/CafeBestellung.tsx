import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, Coffee, Volume2, Loader2, Star } from "lucide-react";
import { usePlatform } from "@/hooks/usePlatform";
import { useCoins } from "@/hooks/useCoins";
import { useXP } from "@/hooks/useXP";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";

/* ── types ── */

interface GameOption {
  text: string;
  type: "perfect" | "formal" | "rude";
  feedback: { ru: string; uk: string };
}

interface GameScenario {
  barista: string;
  hint: { ru: string; uk: string };
  options: GameOption[];
  timerSec: number;
}

/* ── hardcoded fallback ── */
const FALLBACK_SCENARIOS: GameScenario[] = [
  {
    barista: "Was darf's sein?",
    hint: { ru: "Бармен спросил, что вы хотите", uk: "Бармен запитав, що бажаєте" },
    options: [
      { text: "Einen Kaffee, bitte!", type: "perfect", feedback: { ru: "Идеально! Естественно и вежливо 👌", uk: "Ідеально! Природно і ввічливо 👌" } },
      { text: "Ich möchte gerne einen Kaffee bestellen.", type: "formal", feedback: { ru: "Слишком формально для кафе 🤓", uk: "Занадто формально для кафе 🤓" } },
      { text: "Kaffee. Schnell.", type: "rude", feedback: { ru: "Ого, это грубо! Так не говорят 😬", uk: "Ого, це грубо! Так не кажуть 😬" } },
    ],
    timerSec: 10,
  },
];

/* ── component ── */

const CafeBestellung = ({ onBack }: { onBack: () => void }) => {
  const { isMobile } = usePlatform();
  const { lang } = useLanguage();
  const { awardCoins } = useCoins();
  const { awardXP } = useXP();
  const l = lang === "uk" ? "uk" : "ru";

  const [scenarios, setScenarios] = useState<GameScenario[]>([]);
  const [_scenariosLoaded, setScenariosLoaded] = useState(false);
  const [step, setStep] = useState(0);
  const [perfectCount, setPerfectCount] = useState(0);
  const [_totalAnswered, setTotalAnswered] = useState(0);
  const [feedback, setFeedback] = useState<{ text: string; type: "perfect" | "formal" | "rude" | "timeout" } | null>(null);
  const [gameOver, setGameOver] = useState(false);
  const [timer, setTimer] = useState(0);
  const [ttsLoading, setTtsLoading] = useState(false);
  const [baristaState, setBaristaState] = useState<"idle" | "speaking" | "wink" | "annoyed">("idle");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  /* ── load scenarios from DB ── */
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("cafe_scenarios")
        .select("*")
        .order("sort_order");
      if (data && data.length > 0) {
        const mapped: GameScenario[] = data.map((s: any) => ({
          barista: s.barista_line,
          hint: { ru: s.hint_ru, uk: s.hint_uk },
          options: (s.options as any[]).map((o: any) => ({
            text: o.text,
            type: o.type as "perfect" | "formal" | "rude",
            feedback: { ru: o.feedback_ru, uk: o.feedback_uk },
          })),
          timerSec: s.timer_sec,
        }));
        setScenarios(mapped);
      } else {
        setScenarios(FALLBACK_SCENARIOS);
      }
      setScenariosLoaded(true);
    };
    load();
  }, []);

  const scenario = scenarios[step] ?? null;


  /* ── TTS ── */
  const playBarista = useCallback(async (text: string) => {
    setTtsLoading(true);
    setBaristaState("speaking");
    try {
      const { fetchEdgeFunction } = await import("@/lib/auth-fetch");
      const response = await fetchEdgeFunction("elevenlabs-tts", {
        json: { text, voiceId: "JBFqnCBsd6RMkjVDRZzb" },
      });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => setBaristaState("idle");
      await audio.play();
    } catch {
      setBaristaState("idle");
    }
    setTtsLoading(false);
  }, []);

  /* ── start scenario ── */
  useEffect(() => {
    if (gameOver || !scenario) return;
    setFeedback(null);
    setTimer(scenario.timerSec);
    playBarista(scenario.barista);

    timerRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, gameOver]);

  const handleTimeout = () => {
    setFeedback({
      text: l === "uk" ? "Час вийшов! Бармен нетерпеливий... ⏰" : "Время вышло! Бармен нетерпелив... ⏰",
      type: "timeout",
    });
    setBaristaState("annoyed");
    setTotalAnswered((t) => t + 1);
    haptic("error");
  };

  /* ── answer ── */
  const handleAnswer = (optIndex: number) => {
    if (feedback || gameOver) return;
    if (timerRef.current) clearInterval(timerRef.current);

    const opt = scenario.options[optIndex];
    setTotalAnswered((t) => t + 1);

    if (opt.type === "perfect") {
      setPerfectCount((c) => c + 1);
      setBaristaState("wink");
      haptic("success");
    } else if (opt.type === "rude") {
      setBaristaState("annoyed");
      haptic("error");
    } else {
      setBaristaState("idle");
      haptic("warning");
    }

    setFeedback({ text: opt.feedback[l], type: opt.type });
  };

  /* ── next / end ── */
  const nextStep = () => {
    if (step + 1 >= scenarios.length) {
      setGameOver(true);
      // Awards
      if (perfectCount >= 3) {
        awardCoins(15, "cafe_game_bonus");
        awardXP(25);
      } else {
        awardCoins(5, "cafe_game");
        awardXP(10);
      }
    } else {
      setStep((s) => s + 1);
    }
  };

  const restart = () => {
    setStep(0);
    setPerfectCount(0);
    setTotalAnswered(0);
    setFeedback(null);
    setGameOver(false);
  };

  const haptic = (type: "success" | "error" | "warning") => {
    try {
      const tg = (window as any).Telegram?.WebApp;
      if (tg?.HapticFeedback) {
        tg.HapticFeedback.notificationOccurred(type);
      }
    } catch {}
    if (navigator.vibrate) {
      navigator.vibrate(type === "success" ? [50] : type === "error" ? [100, 30, 100] : [60]);
    }
  };

  /* ── barista face ── */
  const baristaEmoji = baristaState === "wink" ? "😉" : baristaState === "annoyed" ? "😤" : baristaState === "speaking" ? "🗣️" : "🧑‍🍳";

  /* ── timer progress ── */
  const timerPct = scenario ? (timer / scenario.timerSec) * 100 : 0;
  const timerColor = timerPct > 50 ? "bg-primary" : timerPct > 25 ? "bg-yellow-500" : "bg-destructive";

  /* ── GAME OVER screen ── */
  /* ── loading screen ── */
  if (scenarios.length === 0) {
    return (
      <div className="w-full mx-auto px-4 py-6 max-w-md flex flex-col items-center justify-center gap-4 min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Загрузка сценариев...</p>
      </div>
    );
  }

  if (gameOver) {
    const isGreat = perfectCount >= 3;
    return (
      <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6 text-sm">
          <ArrowLeft className="w-4 h-4" /> {l === "uk" ? "Назад" : "Назад"}
        </button>

        <div className="glass-card p-8 text-center space-y-6 animate-scale-in">
          <div className="text-6xl mb-2">{isGreat ? "☕" : "🫤"}</div>
          <h2 className="font-display text-2xl font-bold">
            {isGreat
              ? l === "uk" ? "Du bist kein Tourist mehr!" : "Du bist kein Tourist mehr!"
              : l === "uk" ? "Ще трохи практики..." : "Ещё немного практики..."}
          </h2>
          <p className="text-muted-foreground">
            {l === "uk"
              ? `Ідеальних відповідей: ${perfectCount} / ${scenarios.length}`
              : `Идеальных ответов: ${perfectCount} / ${scenarios.length}`}
          </p>

          <div className="flex items-center justify-center gap-6">
            <div className="text-center">
              <div className="text-xl font-bold text-primary">{isGreat ? "+25" : "+10"}</div>
              <div className="text-xs text-muted-foreground">XP</div>
            </div>
            <div className="text-center">
              <div className="text-xl font-bold text-primary">{isGreat ? "+15" : "+5"}</div>
              <div className="text-xs text-muted-foreground">{l === "uk" ? "монет" : "монет"}</div>
            </div>
            {isGreat && (
              <div className="text-center">
                <div className="text-xl">☕</div>
                <div className="text-xs text-muted-foreground">{l === "uk" ? "бонус кави" : "бонус кофе"}</div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button onClick={restart} className="flex-1 px-4 py-3 rounded-xl bg-secondary text-foreground font-semibold hover:bg-secondary/80 transition-colors">
              {l === "uk" ? "Ще раз" : "Ещё раз"}
            </button>
            <button onClick={onBack} className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow hover:opacity-90 transition-all">
              {l === "uk" ? "До ігор" : "К играм"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── GAME UI ── */
  return (
    <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"} flex flex-col gap-4`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors text-sm">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Coffee className="w-3.5 h-3.5 text-primary" />
          {step + 1}/{scenarios.length}
        </div>
        <div className="flex items-center gap-1">
          {Array.from({ length: scenarios.length }).map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-colors ${
                i < step ? "bg-primary" : i === step ? "bg-primary/50 animate-pulse" : "bg-muted"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Timer bar */}
      <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ease-linear ${timerColor}`}
          style={{ width: `${timerPct}%` }}
        />
      </div>

      {/* Barista */}
      <div className="glass-card p-6 text-center space-y-3 relative overflow-hidden">
        {/* ambient coffee glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-amber-900/10 to-transparent pointer-events-none" />

        <div className="relative">
          <div
            className={`text-6xl transition-transform duration-300 ${
              baristaState === "speaking" ? "animate-bounce" : baristaState === "wink" ? "scale-110" : ""
            }`}
          >
            {baristaEmoji}
          </div>

          <div className="mt-3 glass-card inline-block px-4 py-2 text-sm font-medium relative">
            {ttsLoading && (
              <Loader2 className="w-3.5 h-3.5 animate-spin inline mr-2 text-primary" />
            )}
            <span className="font-display">{scenario?.barista}</span>
            <button
              onClick={() => scenario && playBarista(scenario.barista)}
              className="ml-2 inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors"
              disabled={ttsLoading}
            >
              <Volume2 className="w-3 h-3 text-primary" />
            </button>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            {scenario?.hint[l]}
          </p>
        </div>
      </div>

      {/* Answer options */}
      <div className="space-y-2">
        {scenario?.options.map((opt, i) => {
          const showResult = !!feedback;
          let optStyle = "glass-card hover:border-primary/30";

          if (showResult) {
            if (opt.type === "perfect") optStyle = "border-emerald-500/50 bg-emerald-500/10";
            else if (opt.type === "rude") optStyle = "border-destructive/50 bg-destructive/10";
            else optStyle = "border-yellow-500/50 bg-yellow-500/10";
          }

          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={!!feedback}
              className={`w-full p-4 rounded-xl text-left transition-all text-sm font-medium border ${optStyle} ${
                !feedback ? "hover:scale-[1.01] active:scale-[0.99]" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold shrink-0">
                  {String.fromCharCode(65 + i)}
                </span>
                <span>{opt.text}</span>
                {showResult && opt.type === "perfect" && <Star className="w-4 h-4 text-primary fill-primary ml-auto shrink-0" />}
              </div>
            </button>
          );
        })}
      </div>

      {/* Feedback */}
      {feedback && (
        <div className={`glass-card p-4 text-center animate-scale-in ${
          feedback.type === "perfect" ? "border-emerald-500/30" :
          feedback.type === "rude" || feedback.type === "timeout" ? "border-destructive/30" :
          "border-yellow-500/30"
        }`}>
          <p className="text-sm font-medium">{feedback.text}</p>
          <button
            onClick={nextStep}
            className="mt-3 px-6 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold glow-yellow hover:opacity-90 transition-all"
          >
            {step + 1 >= scenarios.length
              ? l === "uk" ? "Результат" : "Результат"
              : l === "uk" ? "Далі" : "Далее"}
          </button>
        </div>
      )}
    </div>
  );
};

export default CafeBestellung;
