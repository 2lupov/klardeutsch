import { useState, useCallback, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { BookOpen, Headphones, Play, Pause, Check, X, ChevronRight, Sparkles } from "lucide-react";
import type { VocabCard } from "@/data/lessons";

type DemoStep = "cards" | "reading" | "listening" | "finished";

interface DemoProps {
  onBack: () => void;
  onSignup: () => void;
}

const DemoExperience = ({ onBack, onSignup }: DemoProps) => {
  const { t, lang } = useLanguage();
  const tr = (ru: string, uk: string) => (lang === "uk" ? uk : ru);

  const [step, setStep] = useState<DemoStep>("cards");
  const [loading, setLoading] = useState(true);

  // Card data
  const [cards, setCards] = useState<VocabCard[]>([]);
  const [cardIdx, setCardIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);

  // Reading data
  const [readingText, setReadingText] = useState<{ title: string; text: string; questions: any[] } | null>(null);
  const [readingShowQ, setReadingShowQ] = useState(false);
  const [readingQIdx, setReadingQIdx] = useState(0);
  const [readingAnswer, setReadingAnswer] = useState<number | null>(null);

  // Listening data
  const [listeningText, setListeningText] = useState<{ title: string; text: string; questions: any[] } | null>(null);
  const [listenQIdx, setListenQIdx] = useState(0);
  const [listenAnswer, setListenAnswer] = useState<number | null>(null);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Stats
  const [wordsLearned, setWordsLearned] = useState(0);
  const [correctAnswers, setCorrectAnswers] = useState(0);

  // Load all demo data on mount
  const [loaded, setLoaded] = useState(false);
  if (!loaded) {
    setLoaded(true);
    (async () => {
      const [{ data: vocabData }, { data: readData }, { data: listenData }] = await Promise.all([
        supabase.from("vocab_cards").select("*").eq("level", "A1").order("sort_order").limit(5),
        supabase.from("reading_texts").select("id, title, text").eq("level", "A1").limit(1).single(),
        supabase.from("listening_texts").select("id, title, text").eq("level", "A1").limit(1).single(),
      ]);

      const vocabCards: VocabCard[] = (vocabData ?? []).map((v: any) => ({
        id: v.id, german: v.german, russian: v.russian,
        example: v.example ?? undefined, article: v.article ?? undefined,
      }));
      setCards(vocabCards);

      if (readData) {
        const { data: rq } = await supabase
          .from("reading_questions").select("question, options, correct_index, explanation")
          .eq("reading_id", readData.id).order("sort_order").limit(3);
        setReadingText({ title: readData.title, text: readData.text, questions: rq ?? [] });
      }

      if (listenData) {
        const { data: lq } = await supabase
          .from("listening_questions").select("question, options, correct_index, explanation")
          .eq("listening_id", listenData.id).order("sort_order").limit(2);
        setListeningText({ title: listenData.title, text: listenData.text, questions: lq ?? [] });
      }

      setLoading(false);
    })();
  }

  const playTTS = useCallback(async (text: string) => {
    if (audioRef.current) { audioRef.current.pause(); audioRef.current = null; }
    setAudioLoading(true);
    try {
      const { fetchEdgeFunction } = await import("@/lib/auth-fetch");
      const response = await fetchEdgeFunction("elevenlabs-tts", {
        json: { text },
      });
      if (!response.ok) throw new Error();
      const blob = await response.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      audioRef.current = audio;
      audio.onplay = () => setAudioPlaying(true);
      audio.onended = () => setAudioPlaying(false);
      audio.onpause = () => setAudioPlaying(false);
      await audio.play();
    } catch { /* ignore */ } finally { setAudioLoading(false); }
  }, []);

  if (loading) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center">
        <span className="text-muted-foreground">{t("loading")}</span>
      </div>
    );
  }

  // Step indicator
  const steps: { key: DemoStep; emoji: string; label: string }[] = [
    { key: "cards", emoji: "📚", label: tr("Слова", "Слова") },
    { key: "reading", emoji: "📖", label: tr("Чтение", "Читання") },
    { key: "listening", emoji: "🎧", label: tr("Аудирование", "Аудіювання") },
  ];

  const currentStepIdx = steps.findIndex((s) => s.key === step);

  const StepIndicator = () => (
    <div className="flex items-center justify-center gap-1 mb-4">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-1">
          <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
            i === currentStepIdx
              ? "bg-primary/15 text-primary"
              : i < currentStepIdx
                ? "bg-primary/5 text-primary/50"
                : "bg-muted/30 text-muted-foreground/40"
          }`}>
            <span>{s.emoji}</span>
            <span className="hidden sm:inline">{s.label}</span>
          </div>
          {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/30" />}
        </div>
      ))}
    </div>
  );

  const BackButton = () => (
    <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors mb-3">
      {t("backToLogin")}
    </button>
  );

  // STEP 1: Flashcards (simplified)
  if (step === "cards") {
    const card = cards[cardIdx];
    if (!card) { setStep("reading"); return null; }

    return (
      <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
        <div className="flex-1 w-full max-w-md mx-auto px-4 py-5 flex flex-col">
          <BackButton />
          <StepIndicator />

          <div className="text-center mb-3">
            <p className="text-xs text-muted-foreground">{cardIdx + 1} / {cards.length}</p>
            <div className="w-full h-1 bg-muted/40 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${((cardIdx + 1) / cards.length) * 100}%` }} />
            </div>
          </div>

          {/* Card */}
          <div className="flex-1 flex items-center justify-center" onClick={() => setFlipped(!flipped)}>
            <div className={`w-full max-w-sm aspect-[3/4] cursor-pointer perspective-1000`}>
              <div className={`relative w-full h-full transition-transform duration-500 ${flipped ? "[transform:rotateY(180deg)]" : ""}`} style={{ transformStyle: "preserve-3d" }}>
                <div className="absolute inset-0 glass-card glow-yellow flex flex-col items-center justify-center p-8" style={{ backfaceVisibility: "hidden" }}>
                  {card.article && <span className="text-sm font-medium text-primary mb-2">{card.article}</span>}
                  <h2 className="text-3xl font-display font-bold text-foreground mb-4">{card.german}</h2>
                  <p className="text-sm text-muted-foreground">{t("tapToFlip")}</p>
                </div>
                <div className="absolute inset-0 glass-card flex flex-col items-center justify-center p-8 [transform:rotateY(180deg)]" style={{ backfaceVisibility: "hidden" }}>
                  <h2 className="text-2xl font-display font-bold text-primary mb-4">{card.russian}</h2>
                  {card.example && <p className="text-sm text-muted-foreground italic text-center">"{card.example}"</p>}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={() => {
              setFlipped(false);
              setWordsLearned((w) => w + 1);
              if (cardIdx + 1 >= cards.length) {
                setTimeout(() => setStep("reading"), 200);
              } else {
                setTimeout(() => setCardIdx(cardIdx + 1), 150);
              }
            }}
            className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow"
          >
            {cardIdx + 1 >= cards.length ? tr("Далее: Чтение →", "Далі: Читання →") : t("iLearned")}
          </button>
        </div>
      </div>
    );
  }

  // STEP 2: Reading
  if (step === "reading") {
    if (!readingText || readingText.questions.length === 0) { setStep("listening"); return null; }

    return (
      <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
        <div className="flex-1 w-full max-w-md mx-auto px-4 py-5 flex flex-col overflow-y-auto overscroll-none">
          <BackButton />
          <StepIndicator />

          {!readingShowQ ? (
            <div className="flex flex-col gap-4 animate-slide-up">
              <div className="glass-card p-5">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="w-5 h-5 text-primary" />
                  <h3 className="font-display text-base font-semibold">{readingText.title}</h3>
                </div>
                <p className="text-foreground/90 leading-relaxed text-sm">{readingText.text}</p>
              </div>
              <button
                onClick={() => setReadingShowQ(true)}
                className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow"
              >
                {t("goToQuestions")}
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-4 animate-slide-up">
              {(() => {
                const q = readingText.questions[readingQIdx];
                if (!q) return null;
                return (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">{t("question")} {readingQIdx + 1}/{readingText.questions.length}</span>
                    </div>
                    <div className="glass-card p-4">
                      <p className="font-display font-semibold text-sm mb-3">{q.question}</p>
                      <div className="flex flex-col gap-2">
                        {q.options.map((opt: string, idx: number) => {
                          const selected = readingAnswer === idx;
                          const correct = idx === q.correct_index;
                          const show = readingAnswer !== null;
                          let cls = "px-3 py-2.5 rounded-lg border text-sm text-left transition-all ";
                          if (show && correct) cls += "border-green-500/50 bg-green-500/10";
                          else if (show && selected && !correct) cls += "border-destructive/50 bg-destructive/10";
                          else if (!show) cls += "border-border bg-secondary hover:border-primary/30";
                          else cls += "border-border bg-secondary/50 text-muted-foreground";
                          return (
                            <button key={idx} disabled={show} onClick={() => {
                              setReadingAnswer(idx);
                              if (idx === q.correct_index) setCorrectAnswers((c) => c + 1);
                            }} className={cls}>
                              <div className="flex items-center gap-2">
                                {show && correct && <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                                {show && selected && !correct && <X className="w-3.5 h-3.5 text-destructive shrink-0" />}
                                <span>{opt}</span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                      {readingAnswer !== null && q.explanation && (
                        <p className="text-xs text-muted-foreground mt-2">{q.explanation}</p>
                      )}
                    </div>
                    {readingAnswer !== null && (
                      <button
                        onClick={() => {
                          if (readingQIdx + 1 < readingText.questions.length) {
                            setReadingQIdx(readingQIdx + 1);
                            setReadingAnswer(null);
                          } else {
                            setStep("listening");
                          }
                        }}
                        className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
                      >
                        {readingQIdx + 1 < readingText.questions.length ? t("next") : tr("Далее: Аудирование →", "Далі: Аудіювання →")}
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          )}
        </div>
      </div>
    );
  }

  // STEP 3: Listening
  if (step === "listening") {
    if (!listeningText || listeningText.questions.length === 0) { setStep("finished"); return null; }

    const q = listeningText.questions[listenQIdx];

    return (
      <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
        <div className="flex-1 w-full max-w-md mx-auto px-4 py-5 flex flex-col overflow-y-auto overscroll-none">
          <BackButton />
          <StepIndicator />

          <div className="flex flex-col gap-4 animate-slide-up">
            <div className="flex items-center gap-2">
              <Headphones className="w-5 h-5 text-primary" />
              <h3 className="font-display text-base font-semibold">{listeningText.title}</h3>
            </div>

            {/* Play button */}
            <button
              onClick={() => playTTS(listeningText.text)}
              disabled={audioLoading}
              className="glass-card p-4 flex items-center gap-3 transition-all hover:border-primary/50 hover:bg-primary/5"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                {audioLoading ? <span className="animate-pulse text-xs">...</span> : audioPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </div>
              <span className="font-display font-medium text-sm">{audioPlaying ? t("listenPlaying") : t("listenToText")}</span>
            </button>

            {q && (
              <>
                <div className="text-xs text-muted-foreground">{t("question")} {listenQIdx + 1}/{listeningText.questions.length}</div>
                <div className="glass-card p-4">
                  <p className="font-display font-semibold text-sm mb-3">{q.question}</p>
                  <div className="flex flex-col gap-2">
                    {q.options.map((opt: string, idx: number) => {
                      const selected = listenAnswer === idx;
                      const correct = idx === q.correct_index;
                      const show = listenAnswer !== null;
                      let cls = "px-3 py-2.5 rounded-lg border text-sm text-left transition-all ";
                      if (show && correct) cls += "border-green-500/50 bg-green-500/10";
                      else if (show && selected && !correct) cls += "border-destructive/50 bg-destructive/10";
                      else if (!show) cls += "border-border bg-secondary hover:border-primary/30";
                      else cls += "border-border bg-secondary/50 text-muted-foreground";
                      return (
                        <button key={idx} disabled={show} onClick={() => {
                          setListenAnswer(idx);
                          if (idx === q.correct_index) setCorrectAnswers((c) => c + 1);
                        }} className={cls}>
                          <div className="flex items-center gap-2">
                            {show && correct && <Check className="w-3.5 h-3.5 text-green-500 shrink-0" />}
                            {show && selected && !correct && <X className="w-3.5 h-3.5 text-destructive shrink-0" />}
                            <span>{opt}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {listenAnswer !== null && q.explanation && (
                    <p className="text-xs text-muted-foreground mt-2">{q.explanation}</p>
                  )}
                </div>
                {listenAnswer !== null && (
                  <button
                    onClick={() => {
                      audioRef.current?.pause();
                      if (listenQIdx + 1 < listeningText.questions.length) {
                        setListenQIdx(listenQIdx + 1);
                        setListenAnswer(null);
                      } else {
                        setStep("finished");
                      }
                    }}
                    className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm"
                  >
                    {listenQIdx + 1 < listeningText.questions.length ? t("next") : tr("Завершить демо", "Завершити демо")}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // FINISHED
  return (
    <div className="h-[100dvh] bg-background flex items-center justify-center px-4 overflow-hidden">
      <div className="w-full max-w-sm animate-slide-up text-center flex flex-col items-center gap-5">
        <div className="w-20 h-20 rounded-full flex items-center justify-center bg-primary/10 glow-yellow">
          <Sparkles className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-display font-bold">{t("demoFinished")}</h2>

        {/* Mini stats */}
        <div className="flex gap-4 justify-center">
          <div className="glass-card px-4 py-3 text-center">
            <p className="text-xl font-display font-bold text-gradient">{wordsLearned}</p>
            <p className="text-[10px] text-muted-foreground">{tr("слов", "слів")}</p>
          </div>
          <div className="glass-card px-4 py-3 text-center">
            <p className="text-xl font-display font-bold text-gradient">{correctAnswers}</p>
            <p className="text-[10px] text-muted-foreground">{tr("верно", "вірно")}</p>
          </div>
          <div className="glass-card px-4 py-3 text-center">
            <p className="text-xl font-display font-bold text-gradient">3</p>
            <p className="text-[10px] text-muted-foreground">{tr("навыка", "навички")}</p>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">{tr("Словарь, чтение и аудирование — всё в одном приложении", "Словник, читання й аудіювання — все в одному додатку")}</p>

        <button
          onClick={onSignup}
          className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow transition-all hover:opacity-90"
        >
          {t("startLearning")}
        </button>
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          {t("backToLogin")}
        </button>
      </div>
    </div>
  );
};

export default DemoExperience;
