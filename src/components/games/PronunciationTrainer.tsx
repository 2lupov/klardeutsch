import { useState, useCallback, useRef } from "react";
import { ArrowLeft, Volume2, Mic, MicOff, RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
import { usePlatform } from "@/hooks/usePlatform";

interface PronunciationTrainerProps {
  onBack: () => void;
}

// Phrases organized by level
const PHRASES: Record<string, { de: string; ru: string }[]> = {
  A1: [
    { de: "Guten Morgen", ru: "Доброе утро" },
    { de: "Wie heißt du?", ru: "Как тебя зовут?" },
    { de: "Ich komme aus Deutschland", ru: "Я из Германии" },
    { de: "Das Wetter ist schön", ru: "Погода хорошая" },
    { de: "Ich trinke Kaffee", ru: "Я пью кофе" },
    { de: "Wo ist der Bahnhof?", ru: "Где вокзал?" },
    { de: "Ich spreche ein bisschen Deutsch", ru: "Я немного говорю по-немецки" },
    { de: "Danke schön", ru: "Спасибо большое" },
    { de: "Entschuldigung", ru: "Извините" },
    { de: "Auf Wiedersehen", ru: "До свидания" },
    { de: "Wie geht es Ihnen?", ru: "Как у вас дела?" },
    { de: "Ich heiße Anna", ru: "Меня зовут Анна" },
  ],
  A2: [
    { de: "Können Sie mir bitte helfen?", ru: "Можете мне помочь?" },
    { de: "Ich möchte ein Zimmer reservieren", ru: "Я хотел бы забронировать номер" },
    { de: "Die Rechnung bitte", ru: "Счёт, пожалуйста" },
    { de: "Ich habe eine Frage", ru: "У меня есть вопрос" },
    { de: "Das verstehe ich nicht", ru: "Я этого не понимаю" },
    { de: "Sprechen Sie langsamer bitte", ru: "Говорите медленнее, пожалуйста" },
    { de: "Ich bin seit zwei Jahren in Deutschland", ru: "Я два года в Германии" },
    { de: "Wo kann ich das kaufen?", ru: "Где я могу это купить?" },
  ],
  B1: [
    { de: "Ich würde gerne einen Termin vereinbaren", ru: "Я хотел бы записаться на приём" },
    { de: "Meiner Meinung nach ist das richtig", ru: "По моему мнению, это правильно" },
    { de: "Es tut mir leid, dass ich zu spät komme", ru: "Извините, что опоздал" },
    { de: "Könnten Sie das bitte wiederholen?", ru: "Не могли бы вы повторить?" },
    { de: "Ich interessiere mich für deutsche Kultur", ru: "Я интересуюсь немецкой культурой" },
    { de: "Das hängt von verschiedenen Faktoren ab", ru: "Это зависит от разных факторов" },
  ],
  B2: [
    { de: "Einerseits stimme ich zu, andererseits habe ich Bedenken", ru: "С одной стороны согласен, с другой — сомневаюсь" },
    { de: "Die Gesellschaft muss sich mit diesem Problem auseinandersetzen", ru: "Общество должно разобраться с этой проблемой" },
    { de: "Es lässt sich nicht leugnen, dass die Technologie unser Leben verändert hat", ru: "Нельзя отрицать, что технологии изменили нашу жизнь" },
    { de: "Zusammenfassend lässt sich sagen", ru: "Подводя итог, можно сказать" },
  ],
};

const LEVELS = Object.keys(PHRASES);

// Normalize text for comparison
function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"„""–—-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Calculate similarity between two strings (Levenshtein-based)
function similarity(a: string, b: string): number {
  const an = normalize(a);
  const bn = normalize(b);
  if (an === bn) return 100;
  if (!an.length || !bn.length) return 0;

  const wordsA = an.split(" ");
  const wordsB = bn.split(" ");

  // Word-level matching
  let matched = 0;
  for (const wa of wordsA) {
    if (wordsB.some((wb) => wb === wa || levenshteinRatio(wa, wb) > 0.7)) {
      matched++;
    }
  }

  const ratio = matched / Math.max(wordsA.length, wordsB.length);
  return Math.round(ratio * 100);
}

function levenshteinRatio(a: string, b: string): number {
  const matrix: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    matrix[i] = [i];
    for (let j = 1; j <= b.length; j++) {
      if (i === 0) { matrix[i][j] = j; continue; }
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  const dist = matrix[a.length][b.length];
  return 1 - dist / Math.max(a.length, b.length);
}

// Check if Web Speech Recognition is available
function getSpeechRecognition(): any {
  const w = window as any;
  return w.SpeechRecognition || w.webkitSpeechRecognition || null;
}

const PronunciationTrainer = ({ onBack }: PronunciationTrainerProps) => {
  const { isMobile } = usePlatform();
  const [level, setLevel] = useState("A1");
  const [phraseIndex, setPhraseIndex] = useState(() => Math.floor(Math.random() * PHRASES.A1.length));
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognized, setRecognized] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const phrases = PHRASES[level];
  const current = phrases[phraseIndex % phrases.length];

  const nextPhrase = () => {
    let next: number;
    do { next = Math.floor(Math.random() * phrases.length); } while (next === phraseIndex && phrases.length > 1);
    setPhraseIndex(next);
    setRecognized("");
    setScore(null);
  };

  const playTTS = useCallback(async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({ text: current.de }),
        }
      );
      if (!response.ok) throw new Error("TTS failed");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => { setIsPlaying(false); URL.revokeObjectURL(url); };
      audio.onerror = () => { setIsPlaying(false); URL.revokeObjectURL(url); };
      await audio.play();
    } catch (e) {
      console.error("TTS error:", e);
      setIsPlaying(false);
    }
  }, [current.de, isPlaying]);

  const startListening = useCallback(() => {
    const SpeechRec = getSpeechRecognition();
    if (!SpeechRec) {
      setRecognized("⚠️ Ваш браузер не поддерживает распознавание речи. Используйте Chrome.");
      return;
    }

    const recognition = new SpeechRec() as any;
    recognition.lang = "de-DE";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.maxAlternatives = 3;

    recognition.onstart = () => setIsListening(true);

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      // Take best match from alternatives
      let bestText = "";
      let bestScore = 0;
      for (let i = 0; i < event.results[0].length; i++) {
        const alt = event.results[0][i].transcript;
        const s = similarity(current.de, alt);
        if (s > bestScore) {
          bestScore = s;
          bestText = alt;
        }
      }
      setRecognized(bestText);
      setScore(bestScore);
      setAttempts((a) => a + 1);
      setTotalScore((t) => t + bestScore);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error("Speech recognition error:", event.error);
      if (event.error === "not-allowed") {
        setRecognized("⚠️ Разрешите доступ к микрофону");
      } else if (event.error === "no-speech") {
        setRecognized("🔇 Речь не распознана. Попробуйте ещё раз.");
      }
      setIsListening(false);
    };

    recognition.onend = () => setIsListening(false);

    recognitionRef.current = recognition;
    recognition.start();
  }, [current.de]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const getScoreColor = (s: number) => {
    if (s >= 80) return "text-green-400";
    if (s >= 50) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreLabel = (s: number) => {
    if (s >= 90) return "Ausgezeichnet! 🌟";
    if (s >= 80) return "Sehr gut! 👏";
    if (s >= 60) return "Gut! 💪";
    if (s >= 40) return "Nicht schlecht 🤔";
    return "Versuch es nochmal 🔄";
  };

  const avgScore = attempts > 0 ? Math.round(totalScore / attempts) : 0;

  return (
    <div className={`w-full mx-auto px-4 py-6 flex flex-col gap-4 animate-slide-up ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
      <button
        onClick={onBack}
        className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors self-start"
      >
        <ArrowLeft className="w-4 h-4" />
        Назад
      </button>

      <div className="flex items-center justify-between">
        <h1 className="font-display text-lg font-bold text-foreground flex items-center gap-2">
          🗣 Произношение
        </h1>
        {attempts > 0 && (
          <span className="text-xs text-muted-foreground">
            Средний балл: <span className="font-bold text-foreground">{avgScore}%</span>
          </span>
        )}
      </div>

      {/* Level selector */}
      <div className="flex gap-2">
        {LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => { setLevel(l); setPhraseIndex(0); setRecognized(""); setScore(null); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-display font-bold transition-colors ${
              level === l
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:text-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Phrase card */}
      <div className="glass-card p-6 text-center">
        <p className="text-xs text-muted-foreground mb-2">{current.ru}</p>
        <p className="font-display text-xl font-bold text-foreground mb-4">{current.de}</p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={playTTS}
            disabled={isPlaying}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary/10 text-primary font-display font-bold text-sm hover:bg-primary/20 transition-colors disabled:opacity-50"
          >
            {isPlaying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
            Послушать
          </button>

          <button
            onClick={isListening ? stopListening : startListening}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-display font-bold text-sm transition-all ${
              isListening
                ? "bg-destructive text-destructive-foreground animate-pulse"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                Стоп
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Говорить
              </>
            )}
          </button>
        </div>
      </div>

      {/* Result */}
      {recognized && !recognized.startsWith("⚠️") && !recognized.startsWith("🔇") && (
        <div className="glass-card p-5 animate-slide-up">
          <div className="text-center">
            {/* Score circle */}
            {score !== null && (
              <div className="mb-3">
                <div className={`text-4xl font-display font-bold ${getScoreColor(score)}`}>
                  {score}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">{getScoreLabel(score)}</p>
              </div>
            )}

            {/* Comparison */}
            <div className="space-y-2 mt-4">
              <div className="flex items-center gap-2 justify-center text-sm">
                <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-muted-foreground">Эталон:</span>
                <span className="font-display font-bold text-foreground">{current.de}</span>
              </div>
              <div className="flex items-center gap-2 justify-center text-sm">
                <Mic className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <span className="text-muted-foreground">Вы:</span>
                <span className={`font-display font-bold ${score !== null && score >= 80 ? "text-foreground" : "text-muted-foreground"}`}>
                  {recognized}
                </span>
              </div>
            </div>

            {/* Word-by-word highlight */}
            {score !== null && score < 100 && (
              <div className="mt-3 flex flex-wrap gap-1 justify-center">
                {normalize(current.de).split(" ").map((word, i) => {
                  const recWords = normalize(recognized).split(" ");
                  const matched = recWords.some(
                    (rw) => rw === word || levenshteinRatio(rw, word) > 0.7
                  );
                  return (
                    <span
                      key={i}
                      className={`px-2 py-0.5 rounded text-xs font-display font-bold ${
                        matched ? "bg-primary/15 text-primary" : "bg-destructive/15 text-destructive"
                      }`}
                    >
                      {word}
                    </span>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Error messages */}
      {recognized && (recognized.startsWith("⚠️") || recognized.startsWith("🔇")) && (
        <div className="glass-card p-4 animate-slide-up">
          <p className="text-sm text-muted-foreground text-center">{recognized}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => { setRecognized(""); setScore(null); }}
          disabled={!recognized}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-foreground font-display font-bold text-sm hover:bg-muted/50 transition-colors disabled:opacity-30"
        >
          <Mic className="w-4 h-4" />
          Ещё раз
        </button>
        <button
          onClick={nextPhrase}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm hover:bg-primary/90 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Следующая
        </button>
      </div>

      {/* Tip */}
      <p className="text-[11px] text-muted-foreground/60 text-center">
        💡 Сначала послушай, потом нажми «Говорить» и произнеси фразу чётко
      </p>
    </div>
  );
};

export default PronunciationTrainer;
