import { useState } from "react";
import { CheckCircle2, XCircle, Volume2, Eye, EyeOff, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { Lang } from "@/i18n/translations";

interface VocabWord {
  word: string;
  article?: string | null;
  translation: string;
  example?: string;
}

interface Question {
  question: string;
  options?: string[];
  correct?: number;
  type?: "open" | "mc";
}

interface ReadingContent {
  title?: string;
  level?: string;
  text?: string;
  vocabulary?: VocabWord[];
  questions?: Question[];
  translation_hidden?: boolean;
}

interface Props {
  lesson: { id: string; title: string; content: any };
  onComplete: (score: number) => void;
  lang: Lang;
}

const ReadingLesson = ({ lesson, onComplete, lang }: Props) => {
  const c = (lesson.content as ReadingContent) || {};
  const questions = c.questions ?? [];
  const vocab = c.vocabulary ?? [];
  const vocabWords = new Set(vocab.map(v => v.word.toLowerCase()));

  const [showTranslation, setShowTranslation] = useState(false);
  const [hoveredWord, setHoveredWord] = useState<VocabWord | null>(null);
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<(number | string | null)[]>(Array(questions.length).fill(null));
  const [showResults, setShowResults] = useState<boolean[]>(Array(questions.length).fill(false));
  const [correctCount, setCorrectCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [completed, setCompleted] = useState(false);

  // Render text with clickable vocabulary words
  const renderText = () => {
    if (!c.text) return null;
    const words = c.text.split(/(\s+)/);
    return words.map((word, i) => {
      const clean = word.replace(/[.,!?;:"""()]/g, "").toLowerCase();
      const vocabMatch = vocab.find(v => v.word.toLowerCase() === clean);
      if (vocabMatch) {
        return (
          <span
            key={i}
            className="underline decoration-dotted decoration-primary/50 cursor-pointer hover:text-primary transition-colors relative"
            onMouseEnter={() => setHoveredWord(vocabMatch)}
            onMouseLeave={() => setHoveredWord(null)}
          >
            {word}
          </span>
        );
      }
      return <span key={i}>{word}</span>;
    });
  };

  const handleMCAnswer = (optIdx: number) => {
    if (showResults[currentQ]) return;
    const newAnswers = [...answers];
    newAnswers[currentQ] = optIdx;
    setAnswers(newAnswers);
    const newResults = [...showResults];
    newResults[currentQ] = true;
    setShowResults(newResults);
    if (optIdx === questions[currentQ].correct) setCorrectCount(p => p + 1);
  };

  const handleOpenAnswer = (text: string) => {
    const newAnswers = [...answers];
    newAnswers[currentQ] = text;
    setAnswers(newAnswers);
  };

  const handleSubmitOpen = () => {
    const newResults = [...showResults];
    newResults[currentQ] = true;
    setShowResults(newResults);
    setCorrectCount(p => p + 1); // Open questions count as correct when answered
  };

  const handleNext = () => {
    if (currentQ < questions.length - 1) {
      setCurrentQ(p => p + 1);
    } else {
      setFinished(true);
    }
  };

  const q = questions[currentQ];
  const isOpen = q?.type === "open" || (!q?.options && q?.type !== "mc");

  return (
    <div className="space-y-6">
      <h2 className="font-display text-xl font-bold text-foreground">{c.title || lesson.title}</h2>
      {c.level && <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-bold">{c.level}</span>}

      {/* Text */}
      <div className="relative p-4 rounded-xl border border-border/30 bg-card/40">
        <div className="flex items-center justify-between mb-3">
          <button className="p-2 rounded-full bg-primary/10 hover:bg-primary/20 transition-colors">
            <Volume2 className="w-4 h-4 text-primary" />
          </button>
          <button onClick={() => setShowTranslation(!showTranslation)}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
            {showTranslation ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showTranslation ? (lang === "uk" ? "Приховати переклад" : "Скрыть перевод") : (lang === "uk" ? "Показати переклад" : "Показать перевод")}
          </button>
        </div>

        <p className="text-sm text-foreground leading-[1.8]">{renderText()}</p>

        {showTranslation && (
          <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border/20 italic leading-[1.8]">
            {/* Translation would be in content */}
            {lang === "uk" ? "Переклад тексту..." : "Перевод текста..."}
          </p>
        )}

        {/* Vocab popup */}
        {hoveredWord && (
          <div className="absolute z-10 p-3 rounded-lg border border-primary/30 bg-card shadow-lg text-xs max-w-xs"
            style={{ bottom: "100%", left: "50%", transform: "translateX(-50%)" }}>
            <p className="font-bold text-foreground">{hoveredWord.article ? `${hoveredWord.article} ` : ""}{hoveredWord.word}</p>
            <p className="text-muted-foreground">{hoveredWord.translation}</p>
            {hoveredWord.example && <p className="text-muted-foreground/70 mt-1 italic">{hoveredWord.example}</p>}
          </div>
        )}
      </div>

      {/* Questions */}
      {questions.length > 0 && !finished && (
        <div className="space-y-4 pt-4 border-t border-border/20">
          <p className="text-xs text-muted-foreground">
            {lang === "uk" ? "Питання" : "Вопрос"} {currentQ + 1}/{questions.length}
          </p>
          <div className="p-4 rounded-xl border border-border/30 bg-card/40 space-y-3">
            <p className="text-sm font-semibold">{q.question}</p>

            {isOpen ? (
              <>
                <Textarea
                  value={(answers[currentQ] as string) || ""}
                  onChange={e => handleOpenAnswer(e.target.value)}
                  placeholder={lang === "uk" ? "Ваша відповідь..." : "Ваш ответ..."}
                  rows={3}
                  disabled={showResults[currentQ]}
                  className="text-sm"
                />
                {!showResults[currentQ] && (
                  <Button size="sm" onClick={handleSubmitOpen}
                    disabled={!answers[currentQ] || (answers[currentQ] as string).trim().length < 2}>
                    {lang === "uk" ? "Відповісти" : "Ответить"}
                  </Button>
                )}
              </>
            ) : (
              <div className="space-y-2">
                {q.options?.map((opt, i) => {
                  let cls = "border-border/30 bg-card/60 hover:bg-muted/30";
                  if (showResults[currentQ] && i === answers[currentQ] && i === q.correct) cls = "border-primary/50 bg-primary/10";
                  else if (showResults[currentQ] && i === answers[currentQ]) cls = "border-destructive/50 bg-destructive/10";
                  else if (showResults[currentQ] && i === q.correct) cls = "border-primary/30 bg-primary/5";
                  return (
                    <button key={i} onClick={() => handleMCAnswer(i)} disabled={showResults[currentQ]}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition-all ${cls}`}>
                      <span className="flex-1">{opt}</span>
                      {showResults[currentQ] && i === q.correct && <CheckCircle2 className="w-4 h-4 text-primary" />}
                      {showResults[currentQ] && i === answers[currentQ] && i !== q.correct && <XCircle className="w-4 h-4 text-destructive" />}
                    </button>
                  );
                })}
              </div>
            )}

            {showResults[currentQ] && (
              <Button size="sm" onClick={handleNext} className="font-display font-bold">
                {currentQ < questions.length - 1 ? "→" : (lang === "uk" ? "Завершити" : "Завершить")}
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Finished */}
      {finished && !completed && (
        <div className="flex flex-col items-center gap-3 pt-4">
          <p className="text-sm text-muted-foreground">
            {correctCount}/{questions.length} {lang === "uk" ? "правильних" : "правильных"}
          </p>
          <Button onClick={() => { setCompleted(true); onComplete(Math.round((correctCount / Math.max(1, questions.length)) * 100)); }} className="font-display font-bold" size="lg">
            {lang === "uk" ? "Урок завершено ✓" : "Урок завершён ✓"}
          </Button>
        </div>
      )}

      {questions.length === 0 && !completed && (
        <div className="flex justify-center">
          <Button onClick={() => { setCompleted(true); onComplete(100); }} className="font-display font-bold" size="lg">
            {lang === "uk" ? "Прочитано ✓" : "Прочитано ✓"}
          </Button>
        </div>
      )}

      {completed && (
        <div className="flex items-center justify-center gap-2 text-primary text-sm font-semibold">
          <CheckCircle2 className="w-5 h-5" /> {lang === "uk" ? "Завершено!" : "Завершено!"}
        </div>
      )}
    </div>
  );
};

export default ReadingLesson;
