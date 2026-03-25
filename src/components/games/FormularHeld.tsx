import { useState, useMemo } from "react";
import { ArrowLeft, RotateCcw, Trophy, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlatform } from "@/hooks/usePlatform";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

type FormField = {
  label: string;
  hintRu: string;
  hintUk: string;
  answer: string;
  alternatives?: string[];
};

type FormScenario = {
  title: string;
  descRu: string;
  descUk: string;
  emoji: string;
  fields: FormField[];
};

const scenarios: FormScenario[] = [
  {
    title: "Anmeldung",
    descRu: "Регистрация по месту жительства — первое, что нужно сделать в Германии",
    descUk: "Реєстрація за місцем проживання — перше, що потрібно зробити в Німеччині",
    emoji: "🏠",
    fields: [
      { label: "Familienname", hintRu: "Фамилия", hintUk: "Прізвище", answer: "Familienname", alternatives: ["Nachname"] },
      { label: "Vorname", hintRu: "Имя", hintUk: "Ім'я", answer: "Vorname" },
      { label: "Geburtsdatum", hintRu: "Дата рождения", hintUk: "Дата народження", answer: "Geburtsdatum" },
      { label: "Staatsangehörigkeit", hintRu: "Гражданство", hintUk: "Громадянство", answer: "Staatsangehörigkeit" },
      { label: "Neue Wohnung", hintRu: "Новый адрес", hintUk: "Нова адреса", answer: "Neue Wohnung", alternatives: ["Anschrift", "Adresse"] },
      { label: "Einzugsdatum", hintRu: "Дата заселения", hintUk: "Дата заселення", answer: "Einzugsdatum" },
    ],
  },
  {
    title: "Kündigung",
    descRu: "Расторжение договора — необходимый навык для жизни в Германии",
    descUk: "Розірвання договору — необхідна навичка для життя в Німеччині",
    emoji: "📄",
    fields: [
      { label: "Vertragsnummer", hintRu: "Номер договора", hintUk: "Номер договору", answer: "Vertragsnummer" },
      { label: "Kundennummer", hintRu: "Номер клиента", hintUk: "Номер клієнта", answer: "Kundennummer" },
      { label: "Kündigungsdatum", hintRu: "Дата расторжения", hintUk: "Дата розірвання", answer: "Kündigungsdatum" },
      { label: "Unterschrift", hintRu: "Подпись", hintUk: "Підпис", answer: "Unterschrift" },
    ],
  },
  {
    title: "Kontoeröffnung",
    descRu: "Открытие банковского счёта — без этого никуда",
    descUk: "Відкриття банківського рахунку — без цього нікуди",
    emoji: "🏦",
    fields: [
      { label: "Kontoinhaber", hintRu: "Владелец счёта", hintUk: "Власник рахунку", answer: "Kontoinhaber" },
      { label: "Meldebescheinigung", hintRu: "Справка о регистрации", hintUk: "Довідка про реєстрацію", answer: "Meldebescheinigung" },
      { label: "Personalausweis", hintRu: "Удостоверение личности", hintUk: "Посвідчення особи", answer: "Personalausweis", alternatives: ["Reisepass"] },
      { label: "Steueridentifikationsnummer", hintRu: "ИНН (налоговый номер)", hintUk: "ІПН (податковий номер)", answer: "Steueridentifikationsnummer", alternatives: ["Steuer-ID"] },
      { label: "IBAN", hintRu: "Номер банковского счёта", hintUk: "Номер банківського рахунку", answer: "IBAN" },
    ],
  },
  {
    title: "Arztbesuch",
    descRu: "Визит к врачу — важные слова для регистратуры",
    descUk: "Візит до лікаря — важливі слова для реєстратури",
    emoji: "🏥",
    fields: [
      { label: "Versichertenkarte", hintRu: "Страховая карта", hintUk: "Страхова картка", answer: "Versichertenkarte", alternatives: ["Gesundheitskarte"] },
      { label: "Krankenkasse", hintRu: "Больничная касса", hintUk: "Лікарняна каса", answer: "Krankenkasse" },
      { label: "Überweisung", hintRu: "Направление (от врача)", hintUk: "Направлення (від лікаря)", answer: "Überweisung" },
      { label: "Beschwerden", hintRu: "Жалобы (симптомы)", hintUk: "Скарги (симптоми)", answer: "Beschwerden", alternatives: ["Symptome"] },
      { label: "Rezept", hintRu: "Рецепт", hintUk: "Рецепт", answer: "Rezept" },
    ],
  },
];

// Game mode: match German terms to their meanings
interface Props { onBack: () => void; }

const FormularHeld = ({ onBack }: Props) => {
  const { lang } = useLanguage();
  const { isMobile } = usePlatform();
  const [scenarioIndex, setScenarioIndex] = useState<number | null>(null);
  const [fieldIndex, setFieldIndex] = useState(0);
  const [userInput, setUserInput] = useState("");
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showAnswer, setShowAnswer] = useState(false);

  const scenario = scenarioIndex !== null ? scenarios[scenarioIndex] : null;
  const field = scenario ? scenario.fields[fieldIndex] : null;

  const checkAnswer = () => {
    if (!field) return;
    const trimmed = userInput.trim();
    const correct = trimmed.toLowerCase() === field.answer.toLowerCase() ||
      (field.alternatives?.some(a => a.toLowerCase() === trimmed.toLowerCase()) ?? false);
    setResult(correct ? "correct" : "wrong");
    if (correct) setScore(s => s + 1);
    setShowAnswer(true);
  };

  const next = () => {
    if (!scenario) return;
    if (fieldIndex + 1 >= scenario.fields.length) {
      setFinished(true);
    } else {
      setFieldIndex(i => i + 1);
      setUserInput("");
      setResult(null);
      setShowAnswer(false);
    }
  };

  const reset = () => {
    setScenarioIndex(null);
    setFieldIndex(0);
    setScore(0);
    setFinished(false);
    setUserInput("");
    setResult(null);
    setShowAnswer(false);
  };

  // Scenario picker
  if (scenarioIndex === null) {
    return (
      <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4">
          <ArrowLeft className="w-4 h-4" /> {lang === "uk" ? "Назад" : "Назад"}
        </button>
        <h1 className="font-display text-xl font-bold text-foreground mb-1">📬 Formular-Held</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {lang === "uk" ? "Знаєш, як називаються поля у німецьких формулярах?" : "Знаешь, как называются поля в немецких формулярах?"}
        </p>
        <div className="space-y-3">
          {scenarios.map((s, i) => (
            <button key={i} onClick={() => { setScenarioIndex(i); setFieldIndex(0); setScore(0); setFinished(false); }}
              className="w-full glass-card p-5 flex items-center gap-4 text-left hover:border-primary/30 transition-all group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-muted/30 flex items-center justify-center text-2xl flex-shrink-0">
                {s.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">{s.title}</h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">{lang === "uk" ? s.descUk : s.descRu}</p>
              </div>
              <span className="text-xs text-muted-foreground">{s.fields.length} 📝</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Finished
  if (finished && scenario) {
    return (
      <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
        <div className="glass-card p-8 text-center space-y-4">
          <Trophy className="w-12 h-12 text-primary mx-auto" />
          <h2 className="font-display text-xl font-bold text-foreground">{scenario.title}</h2>
          <p className="text-3xl font-display font-bold text-gradient">{score}/{scenario.fields.length}</p>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={reset}>{lang === "uk" ? "Інший формуляр" : "Другой формуляр"}</Button>
            <Button onClick={() => { setFieldIndex(0); setScore(0); setFinished(false); setUserInput(""); setResult(null); setShowAnswer(false); }}>
              <RotateCcw className="w-4 h-4 mr-1" /> {lang === "uk" ? "Ще раз" : "Ещё раз"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!scenario || !field) return null;

  return (
    <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
      <div className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> {lang === "uk" ? "Назад" : "Назад"}
        </button>
        <span className="text-xs text-muted-foreground font-display">
          {scenario.emoji} {scenario.title} · {fieldIndex + 1}/{scenario.fields.length}
        </span>
      </div>

      {/* Progress */}
      <div className="w-full h-1.5 bg-muted rounded-full mb-6">
        <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(fieldIndex / scenario.fields.length) * 100}%` }} />
      </div>

      <div className="glass-card p-6 mb-4 text-center space-y-4">
        <p className="text-xs text-muted-foreground uppercase tracking-wide">
          {lang === "uk" ? "Як це називається німецькою?" : "Как это называется по-немецки?"}
        </p>
        <p className="text-lg font-display font-bold text-foreground">
          {lang === "uk" ? field.hintUk : field.hintRu}
        </p>

        <input
          value={userInput}
          onChange={e => setUserInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !result && checkAnswer()}
          placeholder={lang === "uk" ? "Введи німецьке слово..." : "Введи немецкое слово..."}
          disabled={!!result}
          className={cn(
            "w-full px-4 py-3 rounded-xl border text-center text-sm font-display font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 bg-background",
            result === "correct" ? "border-primary/50 text-primary" :
            result === "wrong" ? "border-destructive/50 text-destructive" :
            "border-border text-foreground"
          )}
          autoFocus
        />

        {showAnswer && (
          <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
            className={cn("flex items-center justify-center gap-2 text-sm", result === "correct" ? "text-primary" : "text-destructive")}>
            {result === "correct" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            <span className="font-display font-semibold">{field.answer}</span>
            {field.alternatives && <span className="text-xs text-muted-foreground">({field.alternatives.join(", ")})</span>}
          </motion.div>
        )}
      </div>

      {!result ? (
        <Button className="w-full" onClick={checkAnswer} disabled={!userInput.trim()}>
          {lang === "uk" ? "Перевірити" : "Проверить"}
        </Button>
      ) : (
        <Button className="w-full" onClick={next}>
          {lang === "uk" ? "Далі" : "Дальше"} <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      )}
    </div>
  );
};

export default FormularHeld;
