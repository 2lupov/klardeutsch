import { useState, useMemo } from "react";
import { ArrowLeft, Phone, PhoneOff, RotateCcw, Trophy, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlatform } from "@/hooks/usePlatform";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type DialogLine = {
  speaker: "other" | "you";
  text: string;
  options?: { text: string; correct: boolean; feedbackRu: string; feedbackUk: string }[];
};

type PhoneScenario = {
  title: string;
  descRu: string;
  descUk: string;
  emoji: string;
  callerName: string;
  lines: DialogLine[];
};

const scenarios: PhoneScenario[] = [
  {
    title: "Termin beim Arzt",
    descRu: "Запись к врачу по телефону",
    descUk: "Запис до лікаря по телефону",
    emoji: "🏥",
    callerName: "Praxis Dr. Müller",
    lines: [
      { speaker: "other", text: "Praxis Dr. Müller, guten Tag. Was kann ich für Sie tun?" },
      { speaker: "you", text: "", options: [
        { text: "Guten Tag, ich möchte bitte einen Termin vereinbaren.", correct: true, feedbackRu: "Отлично! Вежливая и правильная формулировка.", feedbackUk: "Чудово! Ввічливе і правильне формулювання." },
        { text: "Hallo, ich brauche Arzt.", correct: false, feedbackRu: "Грамматически неверно. Лучше: «Ich möchte einen Termin vereinbaren.»", feedbackUk: "Граматично невірно. Краще: «Ich möchte einen Termin vereinbaren.»" },
        { text: "Ja, Termin bitte schnell.", correct: false, feedbackRu: "Слишком грубо для немецкого телефонного этикета.", feedbackUk: "Занадто грубо для німецького телефонного етикету." },
      ]},
      { speaker: "other", text: "Natürlich. Waren Sie schon einmal bei uns?" },
      { speaker: "you", text: "", options: [
        { text: "Nein, ich bin ein neuer Patient.", correct: true, feedbackRu: "Правильно! Neuer Patient — стандартное выражение.", feedbackUk: "Правильно! Neuer Patient — стандартний вираз." },
        { text: "Ja, ich war schon da.", correct: true, feedbackRu: "Тоже правильно, если вы уже были у врача.", feedbackUk: "Теж правильно, якщо ви вже були у лікаря." },
        { text: "Ich weiß nicht.", correct: false, feedbackRu: "Странный ответ — вы должны знать, были ли у врача.", feedbackUk: "Дивна відповідь — ви повинні знати, чи були у лікаря." },
      ]},
      { speaker: "other", text: "Gut. Hätten Sie am Donnerstag um 10 Uhr Zeit?" },
      { speaker: "you", text: "", options: [
        { text: "Ja, das passt mir gut. Vielen Dank!", correct: true, feedbackRu: "Идеально! «Das passt mir» — ключевая фраза для подтверждения времени.", feedbackUk: "Ідеально! «Das passt mir» — ключова фраза для підтвердження часу." },
        { text: "Geht es auch am Freitag?", correct: true, feedbackRu: "Хороший вариант, если четверг не подходит.", feedbackUk: "Гарний варіант, якщо четвер не підходить." },
        { text: "Nein.", correct: false, feedbackRu: "Слишком коротко. Предложите альтернативу.", feedbackUk: "Занадто коротко. Запропонуйте альтернативу." },
      ]},
    ],
  },
  {
    title: "Vertrag kündigen",
    descRu: "Отмена договора по телефону",
    descUk: "Скасування договору по телефону",
    emoji: "📞",
    callerName: "Kundenservice",
    lines: [
      { speaker: "other", text: "Kundenservice, mein Name ist Schmidt. Wie kann ich Ihnen helfen?" },
      { speaker: "you", text: "", options: [
        { text: "Guten Tag, ich möchte meinen Vertrag kündigen.", correct: true, feedbackRu: "Прямо и вежливо — именно так и нужно.", feedbackUk: "Прямо і ввічливо — саме так і потрібно." },
        { text: "Ich will nicht mehr zahlen!", correct: false, feedbackRu: "Агрессивно. Лучше: «Ich möchte meinen Vertrag kündigen.»", feedbackUk: "Агресивно. Краще: «Ich möchte meinen Vertrag kündigen.»" },
        { text: "Kündigung machen bitte.", correct: false, feedbackRu: "Грамматически неверно. «Kündigung» не используется с «machen».", feedbackUk: "Граматично невірно. «Kündigung» не використовується з «machen»." },
      ]},
      { speaker: "other", text: "Das tut mir leid zu hören. Darf ich nach dem Grund fragen?" },
      { speaker: "you", text: "", options: [
        { text: "Ich bin mit dem Service nicht zufrieden.", correct: true, feedbackRu: "Стандартная формулировка для выражения неудовлетворённости.", feedbackUk: "Стандартне формулювання для вираження незадоволеності." },
        { text: "Ich ziehe um und brauche den Vertrag nicht mehr.", correct: true, feedbackRu: "Хорошая причина — переезд.", feedbackUk: "Гарна причина — переїзд." },
        { text: "Das geht Sie nichts an.", correct: false, feedbackRu: "Очень грубо! По закону вы не обязаны называть причину, но вежливее ответить.", feedbackUk: "Дуже грубо! За законом ви не зобов'язані називати причину, але ввічливіше відповісти." },
      ]},
      { speaker: "other", text: "Ich verstehe. Möchten Sie die Kündigung schriftlich bestätigen?" },
      { speaker: "you", text: "", options: [
        { text: "Ja, bitte schicken Sie mir die Bestätigung per E-Mail.", correct: true, feedbackRu: "Правильно! Всегда просите письменное подтверждение.", feedbackUk: "Правильно! Завжди просіть письмове підтвердження." },
        { text: "Nein, das reicht so.", correct: false, feedbackRu: "Осторожно! Без письменного подтверждения договор может продолжаться.", feedbackUk: "Обережно! Без письмового підтвердження договір може продовжуватися." },
        { text: "Ja, per Post an meine Adresse bitte.", correct: true, feedbackRu: "Тоже хороший вариант — почтой.", feedbackUk: "Теж гарний варіант — поштою." },
      ]},
    ],
  },
  {
    title: "Wohnung besichtigen",
    descRu: "Звонок по объявлению о квартире",
    descUk: "Дзвінок за оголошенням про квартиру",
    emoji: "🏠",
    callerName: "Vermieter Herr Weber",
    lines: [
      { speaker: "other", text: "Weber, hallo?" },
      { speaker: "you", text: "", options: [
        { text: "Guten Tag, Herr Weber. Ich rufe wegen der Wohnungsanzeige an.", correct: true, feedbackRu: "Идеально! «Wegen der Anzeige anrufen» — стандартный оборот.", feedbackUk: "Ідеально! «Wegen der Anzeige anrufen» — стандартний зворот." },
        { text: "Hallo, ist die Wohnung noch frei?", correct: true, feedbackRu: "Прямо к делу — тоже нормально.", feedbackUk: "Прямо до справи — теж нормально." },
        { text: "Ich will Wohnung.", correct: false, feedbackRu: "Грамматически неверно и грубо.", feedbackUk: "Граматично невірно та грубо." },
      ]},
      { speaker: "other", text: "Ja, die ist noch frei. Möchten Sie einen Besichtigungstermin?" },
      { speaker: "you", text: "", options: [
        { text: "Ja, sehr gern. Wann wäre es möglich?", correct: true, feedbackRu: "Вежливая форма Konjunktiv II — «Wann wäre es möglich?»", feedbackUk: "Ввічлива форма Konjunktiv II — «Wann wäre es möglich?»" },
        { text: "Ja, morgen!", correct: false, feedbackRu: "Слишком настойчиво. Лучше спросить, когда удобно.", feedbackUk: "Занадто наполегливо. Краще запитати, коли зручно." },
        { text: "Darf ich fragen, wie hoch die Miete ist?", correct: true, feedbackRu: "Хороший вопрос — уточнить цену перед просмотром.", feedbackUk: "Гарне питання — уточнити ціну перед переглядом." },
      ]},
    ],
  },
];

interface Props { onBack: () => void; }

const TelefonTrainer = ({ onBack }: Props) => {
  const { lang } = useLanguage();
  const { isMobile } = usePlatform();
  const [scenarioIndex, setScenarioIndex] = useState<number | null>(null);
  const [lineIndex, setLineIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [finished, setFinished] = useState(false);
  const [visibleLines, setVisibleLines] = useState<number[]>([0]);

  const scenario = scenarioIndex !== null ? scenarios[scenarioIndex] : null;

  const startScenario = (idx: number) => {
    setScenarioIndex(idx);
    setLineIndex(0);
    setSelectedOption(null);
    setScore(0);
    setTotalQuestions(0);
    setFinished(false);
    setVisibleLines([0]);
  };

  const handleOptionSelect = (optIdx: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(optIdx);
    const line = scenario?.lines[lineIndex];
    if (line?.options?.[optIdx]?.correct) setScore(s => s + 1);
    setTotalQuestions(t => t + 1);
  };

  const advance = () => {
    if (!scenario) return;
    const nextLineIdx = lineIndex + 1;
    if (nextLineIdx >= scenario.lines.length) {
      setFinished(true);
      return;
    }
    setLineIndex(nextLineIdx);
    setSelectedOption(null);
    setVisibleLines(prev => [...prev, nextLineIdx]);
    // Auto-advance non-interactive lines
    const nextLine = scenario.lines[nextLineIdx];
    if (nextLine.speaker === "other" && nextLineIdx + 1 < scenario.lines.length) {
      setTimeout(() => {
        setLineIndex(nextLineIdx + 1);
        setVisibleLines(prev => [...prev, nextLineIdx + 1]);
      }, 1200);
    }
  };

  // Scenario picker
  if (scenarioIndex === null) {
    return (
      <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> {lang === "uk" ? "Назад" : "Назад"}
        </button>
        <h1 className="font-display text-xl font-bold text-foreground mb-1">📞 Telefon-Trainer</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {lang === "uk" ? "Практикуй телефонні розмови для реальних ситуацій" : "Практикуй телефонные разговоры для реальных ситуаций"}
        </p>
        <div className="space-y-3">
          {scenarios.map((s, i) => (
            <button key={i} onClick={() => startScenario(i)}
              className="w-full glass-card p-5 flex items-center gap-4 text-left hover:border-primary/30 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-muted/30 flex items-center justify-center text-2xl flex-shrink-0">
                {s.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">{s.title}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{lang === "uk" ? s.descUk : s.descRu}</p>
              </div>
              <Phone className="w-4 h-4 text-muted-foreground group-hover:text-primary flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!scenario) return null;

  // Finished
  if (finished) {
    return (
      <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
        <div className="glass-card p-8 text-center space-y-4">
          <PhoneOff className="w-12 h-12 text-primary mx-auto" />
          <h2 className="font-display text-lg font-bold text-foreground">
            {lang === "uk" ? "Розмову завершено!" : "Разговор завершён!"}
          </h2>
          <p className="text-3xl font-display font-bold text-gradient">{score}/{totalQuestions}</p>
          <p className="text-sm text-muted-foreground">
            {score === totalQuestions ? "🔥 " + (lang === "uk" ? "Ідеально!" : "Идеально!") : lang === "uk" ? "Непогано, але є над чим працювати" : "Неплохо, но есть над чем работать"}
          </p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setScenarioIndex(null)}>
              {lang === "uk" ? "Інший сценарій" : "Другой сценарий"}
            </Button>
            <Button onClick={() => startScenario(scenarioIndex)}>
              <RotateCcw className="w-4 h-4 mr-1" /> {lang === "uk" ? "Ще раз" : "Ещё раз"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const currentLine = scenario.lines[lineIndex];

  return (
    <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> {lang === "uk" ? "Назад" : "Назад"}
        </button>
        <div className="flex items-center gap-2">
          <Phone className="w-3.5 h-3.5 text-primary animate-pulse" />
          <span className="text-xs text-muted-foreground font-display">{scenario.callerName}</span>
        </div>
      </div>

      {/* Chat-style dialog */}
      <div className="space-y-3 mb-6">
        <AnimatePresence>
          {visibleLines.map(idx => {
            const line = scenario.lines[idx];
            if (!line) return null;
            if (line.speaker === "other") {
              return (
                <motion.div key={`line-${idx}`} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  className="flex gap-2 items-start max-w-[85%]">
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs flex-shrink-0">📞</div>
                  <div className="glass-card p-3 rounded-tl-sm">
                    <p className="text-sm text-foreground">{line.text}</p>
                  </div>
                </motion.div>
              );
            }
            // "you" line with selected answer
            if (idx < lineIndex || (idx === lineIndex && selectedOption !== null)) {
              const opt = line.options?.[selectedOption ?? 0];
              return (
                <motion.div key={`line-${idx}`} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
                  className="flex gap-2 items-start justify-end max-w-[85%] ml-auto">
                  <div className={cn("p-3 rounded-tr-sm rounded-xl", opt?.correct ? "bg-primary/10 border border-primary/20" : "bg-destructive/10 border border-destructive/20")}>
                    <p className="text-sm text-foreground">{opt?.text}</p>
                  </div>
                </motion.div>
              );
            }
            return null;
          })}
        </AnimatePresence>
      </div>

      {/* Options for current line */}
      {currentLine?.options && selectedOption === null && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="space-y-2 mb-4">
          <p className="text-xs text-muted-foreground text-center mb-2">
            {lang === "uk" ? "Обери відповідь:" : "Выбери ответ:"}
          </p>
          {currentLine.options.map((opt, i) => (
            <button key={i} onClick={() => handleOptionSelect(i)}
              className="w-full glass-card p-3 text-left text-sm text-foreground hover:border-primary/30 transition-all">
              {opt.text}
            </button>
          ))}
        </motion.div>
      )}

      {/* Feedback after selection */}
      {selectedOption !== null && currentLine?.options && (
        <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
          className="space-y-3">
          <div className={cn("glass-card p-3 text-sm",
            currentLine.options[selectedOption].correct ? "border-primary/30" : "border-destructive/30"
          )}>
            <p className="text-xs text-muted-foreground">
              {lang === "uk" ? currentLine.options[selectedOption].feedbackUk : currentLine.options[selectedOption].feedbackRu}
            </p>
          </div>
          <Button className="w-full" onClick={advance}>
            {lang === "uk" ? "Продовжити" : "Продолжить"} <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </motion.div>
      )}
    </div>
  );
};

export default TelefonTrainer;
