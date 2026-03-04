import { useState, useCallback, useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Volume2, Play, Pause, Check, X, Headphones, PenLine } from "lucide-react";

interface ListeningQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
}

interface Dictation {
  id: string;
  sentence: string;
}

interface ListeningText {
  id: string;
  title: string;
  text: string;
  questions: ListeningQuestion[];
  dictations: Dictation[];
}

interface ListeningExerciseProps {
  listenings: ListeningText[];
  onComplete: () => void;
}

type Mode = "choose" | "quiz" | "dictation";

const ListeningExercise = ({ listenings, onComplete }: ListeningExerciseProps) => {
  const { t } = useLanguage();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [mode, setMode] = useState<Mode>("choose");
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Quiz state
  const [qIdx, setQIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [_correctCount, setCorrectCount] = useState(0);

  // Dictation state
  const [dIdx, setDIdx] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [dictResult, setDictResult] = useState<"correct" | "wrong" | null>(null);
  const [_dictCorrectCount, setDictCorrectCount] = useState(0);

  const current = listenings[currentIdx];

  const playAudio = useCallback(async (text: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      
      // Detect if text is a dialogue (has A: / B: pattern)
      const isDialogue = /^[A-Z]:\s/m.test(text);
      const functionName = isDialogue ? "dialogue-tts" : "elevenlabs-tts";
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text, speed: 0.85 }),
        }
      );
      if (!response.ok) throw new Error("TTS failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onplay = () => setPlaying(true);
      audio.onended = () => setPlaying(false);
      audio.onpause = () => setPlaying(false);
      await audio.play();
    } catch (e) {
      console.error("TTS error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  const toggleAudio = useCallback((text: string) => {
    if (audioRef.current && playing) {
      audioRef.current.pause();
      return;
    }
    if (audioRef.current && !playing) {
      audioRef.current.play();
      return;
    }
    playAudio(text);
  }, [playing, playAudio]);

  const stopAudio = () => {
    audioRef.current?.pause();
    audioRef.current = null;
    setPlaying(false);
  };

  // Quiz handlers
  const handleQuizAnswer = (idx: number) => {
    if (selectedAnswer !== null) return;
    setSelectedAnswer(idx);
    if (idx === current.questions[qIdx]?.correctIndex) {
      setCorrectCount((c) => c + 1);
    }
  };

  const nextQuestion = () => {
    if (qIdx + 1 < current.questions.length) {
      setQIdx(qIdx + 1);
      setSelectedAnswer(null);
    } else {
      finishExercise();
    }
  };

  // Dictation handlers
  const checkDictation = () => {
    const expected = current.dictations[dIdx]?.sentence.trim().toLowerCase();
    const actual = userInput.trim().toLowerCase();
    // Simple comparison (ignore punctuation)
    const normalize = (s: string) => s.replace(/[.,!?;:'"]/g, "").replace(/\s+/g, " ");
    if (normalize(actual) === normalize(expected || "")) {
      setDictResult("correct");
      setDictCorrectCount((c) => c + 1);
    } else {
      setDictResult("wrong");
    }
  };

  const nextDictation = () => {
    if (dIdx + 1 < current.dictations.length) {
      setDIdx(dIdx + 1);
      setUserInput("");
      setDictResult(null);
    } else {
      finishExercise();
    }
  };

  const finishExercise = () => {
    stopAudio();
    if (currentIdx + 1 < listenings.length) {
      setCurrentIdx(currentIdx + 1);
      resetState();
    } else {
      onComplete();
    }
  };

  const resetState = () => {
    setMode("choose");
    setQIdx(0);
    setSelectedAnswer(null);
    setCorrectCount(0);
    setDIdx(0);
    setUserInput("");
    setDictResult(null);
    setDictCorrectCount(0);
  };

  if (!current) return null;

  // Mode selector
  if (mode === "choose") {
    return (
      <div className="flex flex-col gap-4 animate-slide-up w-full max-w-xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-foreground">{current.title}</h2>
          {listenings.length > 1 && (
            <span className="text-xs text-muted-foreground">{currentIdx + 1}/{listenings.length}</span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">{t("listenChooseMode")}</p>

        {/* Play full text */}
        <button
          onClick={() => toggleAudio(current.text)}
          disabled={loading}
          className="glass-card p-4 flex items-center gap-3 transition-all hover:border-primary/50 hover:bg-primary/5"
        >
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
            {loading ? (
              <span className="animate-pulse text-xs">...</span>
            ) : playing ? (
              <Pause className="w-5 h-5" />
            ) : (
              <Play className="w-5 h-5" />
            )}
          </div>
          <span className="font-display font-medium text-sm">{t("listenToText")}</span>
        </button>

        {/* Mode buttons */}
        <div className="grid grid-cols-2 gap-3">
          {current.questions.length > 0 && (
            <button
              onClick={() => setMode("quiz")}
              className="glass-card p-4 flex flex-col items-center gap-2 transition-all hover:border-primary/50 hover:bg-primary/5"
            >
              <Headphones className="w-6 h-6 text-primary" />
              <span className="font-display font-semibold text-sm">{t("listenQuiz")}</span>
              <span className="text-[10px] text-muted-foreground">{current.questions.length} {t("questions").toLowerCase()}</span>
            </button>
          )}
          {current.dictations.length > 0 && (
            <button
              onClick={() => setMode("dictation")}
              className="glass-card p-4 flex flex-col items-center gap-2 transition-all hover:border-primary/50 hover:bg-primary/5"
            >
              <PenLine className="w-6 h-6 text-primary" />
              <span className="font-display font-semibold text-sm">{t("listenDictation")}</span>
              <span className="text-[10px] text-muted-foreground">{current.dictations.length} {t("listenSentences")}</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // Quiz mode
  if (mode === "quiz") {
    const q = current.questions[qIdx];
    if (!q) return null;

    return (
      <div className="flex flex-col gap-4 animate-slide-up w-full max-w-xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-foreground">{current.title}</h2>
          <span className="text-xs text-muted-foreground">{qIdx + 1}/{current.questions.length}</span>
        </div>

        {/* Play button */}
        <button
          onClick={() => toggleAudio(current.text)}
          disabled={loading}
          className="glass-card p-3 flex items-center gap-3 transition-all hover:border-primary/50"
        >
          <Volume2 className={`w-5 h-5 ${playing ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
          <span className="text-sm text-muted-foreground">{playing ? t("listenPlaying") : t("listenAgain")}</span>
        </button>

        {/* Question */}
        <div className="glass-card p-4">
          <p className="font-display font-semibold text-sm mb-3">{q.question}</p>
          <div className="flex flex-col gap-2">
            {q.options.map((opt, idx) => {
              const isSelected = selectedAnswer === idx;
              const isCorrect = idx === q.correctIndex;
              const showResult = selectedAnswer !== null;

              let cls = "px-3 py-2.5 rounded-lg border text-sm text-left transition-all ";
              if (showResult && isCorrect) cls += "border-success/50 bg-success/10";
              else if (showResult && isSelected && !isCorrect) cls += "border-destructive/50 bg-destructive/10";
              else if (!showResult) cls += "border-border bg-secondary hover:border-primary/30";
              else cls += "border-border bg-secondary/50 text-muted-foreground";

              return (
                <button key={idx} onClick={() => handleQuizAnswer(idx)} className={cls} disabled={showResult}>
                  <div className="flex items-center gap-2">
                    {showResult && isCorrect && <Check className="w-3.5 h-3.5 text-success shrink-0" />}
                    {showResult && isSelected && !isCorrect && <X className="w-3.5 h-3.5 text-destructive shrink-0" />}
                    <span>{opt}</span>
                  </div>
                </button>
              );
            })}
          </div>
          {selectedAnswer !== null && q.explanation && (
            <p className="text-xs text-muted-foreground mt-2 animate-slide-up">{q.explanation}</p>
          )}
        </div>

        {selectedAnswer !== null && (
          <button onClick={nextQuestion} className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm transition-all hover:opacity-90">
            {qIdx + 1 < current.questions.length ? t("next") : t("continue")}
          </button>
        )}
      </div>
    );
  }

  // Dictation mode
  if (mode === "dictation") {
    const d = current.dictations[dIdx];
    if (!d) return null;

    return (
      <div className="flex flex-col gap-4 animate-slide-up w-full max-w-xl mx-auto">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-base font-bold text-foreground">{t("listenDictation")}</h2>
          <span className="text-xs text-muted-foreground">{dIdx + 1}/{current.dictations.length}</span>
        </div>

        {/* Play sentence */}
        <button
          onClick={() => toggleAudio(d.sentence)}
          disabled={loading}
          className="glass-card p-4 flex items-center justify-center gap-3 transition-all hover:border-primary/50"
        >
          <Volume2 className={`w-6 h-6 ${playing ? "text-primary animate-pulse" : "text-muted-foreground"}`} />
          <span className="font-display font-medium text-sm">{playing ? t("listenPlaying") : t("listenPlaySentence")}</span>
        </button>

        {/* Input */}
        <div className="glass-card p-4">
          <p className="text-xs text-muted-foreground mb-2">{t("listenTypeHeard")}</p>
          <textarea
            value={userInput}
            onChange={(e) => setUserInput(e.target.value)}
            disabled={dictResult !== null}
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none resize-none"
            placeholder={t("listenTypePlaceholder")}
          />

          {dictResult === null ? (
            <button
              onClick={checkDictation}
              disabled={!userInput.trim()}
              className="mt-3 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              {t("listenCheck")}
            </button>
          ) : (
            <div className="mt-3 animate-slide-up">
              {dictResult === "correct" ? (
                <div className="flex items-center gap-2 text-success text-sm font-medium">
                  <Check className="w-4 h-4" /> {t("listenCorrect")}
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2 text-destructive text-sm font-medium mb-1">
                    <X className="w-4 h-4" /> {t("listenWrong")}
                  </div>
                  <p className="text-xs text-muted-foreground">{t("listenAnswer")}: <span className="text-foreground font-medium">{d.sentence}</span></p>
                </div>
              )}
              <button onClick={nextDictation} className="mt-3 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
                {dIdx + 1 < current.dictations.length ? t("next") : t("continue")}
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
};

export default ListeningExercise;
