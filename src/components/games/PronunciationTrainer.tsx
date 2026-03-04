import { useState, useCallback, useRef } from "react";
import { ArrowLeft, Volume2, Mic, MicOff, RefreshCw, Loader2, CheckCircle2 } from "lucide-react";
import { usePlatform } from "@/hooks/usePlatform";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"„""–—-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a: string, b: string): number {
  const an = normalize(a);
  const bn = normalize(b);
  if (an === bn) return 100;
  if (!an.length || !bn.length) return 0;

  const wordsA = an.split(" ");
  const wordsB = bn.split(" ");

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

const PronunciationTrainer = ({ onBack }: PronunciationTrainerProps) => {
  const { isMobile } = usePlatform();
  const [level, setLevel] = useState("A1");
  const [phraseIndex, setPhraseIndex] = useState(() => Math.floor(Math.random() * PHRASES.A1.length));
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recognized, setRecognized] = useState("");
  const [score, setScore] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [totalScore, setTotalScore] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const currentPhraseRef = useRef("");

  const phrases = PHRASES[level];
  const current = phrases[phraseIndex % phrases.length];
  
  // Keep ref in sync so callbacks don't go stale
  currentPhraseRef.current = current.de;

  const nextPhrase = () => {
    let next: number;
    do { next = Math.floor(Math.random() * phrases.length); } while (next === phraseIndex && phrases.length > 1);
    setPhraseIndex(next);
    setRecognized("");
    setScore(null);
  };

  const getAccessToken = useCallback(async () => {
    const { data } = await supabase.auth.getSession();
    return data.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  }, []);

  const playTTS = useCallback(async () => {
    if (isPlaying) return;
    setIsPlaying(true);
    try {
      const token = await getAccessToken();
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-tts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${token}`,
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
  }, [current.de, isPlaying, getAccessToken]);

  const transcribeAudio = async (audioBlob: Blob) => {
    setIsTranscribing(true);
    try {
      const token = await getAccessToken();
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/elevenlabs-transcribe`,
        {
          method: "POST",
          headers: {
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) throw new Error("Transcription failed");

      const data = await response.json();
      const text = data.text?.trim() || "";

      if (!text) {
        setRecognized("🔇 Речь не распознана. Попробуйте ещё раз.");
        return;
      }

      const phraseToCompare = currentPhraseRef.current;
      const s = similarity(phraseToCompare, text);
      setRecognized(text);
      setScore(s);
      setAttempts((a) => a + 1);
      setTotalScore((t) => t + s);
    } catch (e) {
      console.error("Transcription error:", e);
      toast.error("Ошибка распознавания речи");
      setRecognized("⚠️ Ошибка распознавания. Попробуйте ещё раз.");
    } finally {
      setIsTranscribing(false);
    }
  };

  const startListening = async () => {
    // Stop any existing recording first
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: true, 
          noiseSuppression: true,
          autoGainControl: true 
        } 
      });
      streamRef.current = stream;
      chunksRef.current = [];

      // Pick a supported mimeType
      let mimeType = "audio/webm";
      if (MediaRecorder.isTypeSupported("audio/webm;codecs=opus")) {
        mimeType = "audio/webm;codecs=opus";
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Stop all tracks
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        
        const audioBlob = new Blob(chunksRef.current, { type: mimeType });
        console.log("Recording stopped, blob size:", audioBlob.size, "chunks:", chunksRef.current.length);
        
        if (audioBlob.size > 0 && chunksRef.current.length > 0) {
          transcribeAudio(audioBlob);
        } else {
          setRecognized("🔇 Запись слишком короткая. Говорите дольше.");
        }
        setIsListening(false);
      };

      mediaRecorderRef.current = mediaRecorder;
      // Use timeslice of 500ms to collect chunks periodically
      mediaRecorder.start(500);
      setIsListening(true);
      console.log("Recording started, state:", mediaRecorder.state);
    } catch (e) {
      console.error("Mic error:", e);
      setRecognized("⚠️ Разрешите доступ к микрофону в настройках браузера");
      setIsListening(false);
    }
  };

  const stopListening = () => {
    console.log("Stopping recording, state:", mediaRecorderRef.current?.state);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.stop();
    } else {
      setIsListening(false);
    }
  };

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
  const isBusy = isListening || isTranscribing;

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

          <div className="relative">
            {/* Pulsing ring when recording */}
            {isListening && (
              <>
                <span className="absolute inset-0 rounded-xl bg-destructive/30 animate-ping" />
                <span className="absolute -inset-1 rounded-2xl border-2 border-destructive/40 animate-pulse" />
              </>
            )}
            <button
              onClick={isListening ? stopListening : startListening}
              disabled={isTranscribing}
              className={`relative z-10 flex items-center gap-2 px-5 py-3 rounded-xl font-display font-bold text-sm transition-all ${
                isListening
                  ? "bg-destructive text-destructive-foreground shadow-[0_0_20px_hsl(0_72%_51%/0.4)]"
                  : isTranscribing
                  ? "bg-muted text-muted-foreground"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-[0_0_16px_hsl(45_92%_52%/0.3)]"
              }`}
            >
              {isTranscribing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Анализ...
                </>
              ) : isListening ? (
                <>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive-foreground/60" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive-foreground" />
                  </span>
                  Остановить запись
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
      </div>

      {/* Result */}
      {recognized && !recognized.startsWith("⚠️") && !recognized.startsWith("🔇") && (
        <div className="glass-card p-5 animate-slide-up">
          <div className="text-center">
            {score !== null && (
              <div className="mb-3">
                <div className={`text-4xl font-display font-bold ${getScoreColor(score)}`}>
                  {score}%
                </div>
                <p className="text-sm text-muted-foreground mt-1">{getScoreLabel(score)}</p>
              </div>
            )}

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

      {recognized && (recognized.startsWith("⚠️") || recognized.startsWith("🔇")) && (
        <div className="glass-card p-4 animate-slide-up">
          <p className="text-sm text-muted-foreground text-center">{recognized}</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => { setRecognized(""); setScore(null); }}
          disabled={!recognized || isBusy}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border text-foreground font-display font-bold text-sm hover:bg-muted/50 transition-colors disabled:opacity-30"
        >
          <Mic className="w-4 h-4" />
          Ещё раз
        </button>
        <button
          onClick={nextPhrase}
          disabled={isBusy}
          className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <RefreshCw className="w-4 h-4" />
          Следующая
        </button>
      </div>

      <p className="text-[11px] text-muted-foreground/60 text-center">
        💡 Нажми «Говорить», произнеси фразу чётко и нажми «Стоп»
      </p>
    </div>
  );
};

export default PronunciationTrainer;
