import { useState } from "react";
import { ArrowLeft, CheckCircle2, XCircle, FileText, Mail, Phone, Home, ChevronRight, RotateCcw, Star } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { usePlatform } from "@/hooks/usePlatform";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type Scenario = {
  id: string;
  icon: string;
  titleRu: string;
  titleUk: string;
  descRu: string;
  descUk: string;
  difficulty: "A2" | "B1" | "B2";
  steps: ScenarioStep[];
};

type ScenarioStep = {
  type: "document" | "letter" | "dialogue" | "form";
  titleRu: string;
  titleUk: string;
  germanText: string;
  explanationRu: string;
  explanationUk: string;
  questions: StepQuestion[];
};

type StepQuestion = {
  questionRu: string;
  questionUk: string;
  type: "fill" | "choice";
  correctAnswer: string;
  options?: string[];
  hintRu?: string;
  hintUk?: string;
};

const scenarios: Scenario[] = [
  {
    id: "anmeldung",
    icon: "🏠",
    titleRu: "Anmeldung: Регистрация по месту жительства",
    titleUk: "Anmeldung: Реєстрація за місцем проживання",
    descRu: "Заполни анкету для прописки — первое, что нужно сделать в Германии",
    descUk: "Заповни анкету для реєстрації — перше, що потрібно зробити в Німеччині",
    difficulty: "A2",
    steps: [
      {
        type: "form",
        titleRu: "Анкета Anmeldung",
        titleUk: "Анкета Anmeldung",
        germanText: `ANMELDEFORMULAR
Bürgeramt Berlin-Mitte

Familienname: ___________
Vorname: ___________
Geburtsdatum: ___________
Staatsangehörigkeit: ___________
Neue Anschrift: ___________
Einzugsdatum: ___________

Unterschrift: ___________`,
        explanationRu: "Это стандартная форма регистрации. Familienname — фамилия, Vorname — имя, Geburtsdatum — дата рождения, Staatsangehörigkeit — гражданство, Neue Anschrift — новый адрес, Einzugsdatum — дата заселения.",
        explanationUk: "Це стандартна форма реєстрації. Familienname — прізвище, Vorname — ім'я, Geburtsdatum — дата народження, Staatsangehörigkeit — громадянство, Neue Anschrift — нова адреса, Einzugsdatum — дата заселення.",
        questions: [
          {
            questionRu: "Что означает «Familienname»?",
            questionUk: "Що означає «Familienname»?",
            type: "choice",
            correctAnswer: "Фамилия",
            options: ["Имя", "Фамилия", "Отчество", "Семейное положение"],
          },
          {
            questionRu: "Как по-немецки «дата рождения»?",
            questionUk: "Як німецькою «дата народження»?",
            type: "fill",
            correctAnswer: "Geburtsdatum",
            hintRu: "Geburt (рождение) + Datum (дата)",
            hintUk: "Geburt (народження) + Datum (дата)",
          },
          {
            questionRu: "Что такое «Einzugsdatum»?",
            questionUk: "Що таке «Einzugsdatum»?",
            type: "choice",
            correctAnswer: "Дата заселения",
            options: ["Дата рождения", "Дата заселения", "Дата выселения", "Дата подписания"],
          },
        ],
      },
      {
        type: "dialogue",
        titleRu: "В Bürgeramt",
        titleUk: "У Bürgeramt",
        germanText: `Beamter: Guten Tag. Haben Sie einen Termin?
Sie: Ja, um 10 Uhr. Mein Name ist _________.
Beamter: Haben Sie Ihren Mietvertrag dabei?
Sie: Ja, hier bitte.
Beamter: Und den Personalausweis oder Reisepass?
Sie: Hier ist mein _________.
Beamter: Danke. Füllen Sie bitte dieses Formular aus.`,
        explanationRu: "Termin — запись/встреча по времени, Mietvertrag — договор аренды, Personalausweis — удостоверение личности, Reisepass — загранпаспорт.",
        explanationUk: "Termin — запис/зустріч за часом, Mietvertrag — договір оренди, Personalausweis — посвідчення особи, Reisepass — закордонний паспорт.",
        questions: [
          {
            questionRu: "Что обязательно нужно принести в Bürgeramt?",
            questionUk: "Що обов'язково потрібно принести в Bürgeramt?",
            type: "choice",
            correctAnswer: "Mietvertrag",
            options: ["Führerschein", "Mietvertrag", "Geburtsurkunde", "Schulzeugnis"],
          },
          {
            questionRu: "Как по-немецки «загранпаспорт»?",
            questionUk: "Як німецькою «закордонний паспорт»?",
            type: "fill",
            correctAnswer: "Reisepass",
            hintRu: "Reise (путешествие) + Pass (паспорт)",
            hintUk: "Reise (подорож) + Pass (паспорт)",
          },
        ],
      },
    ],
  },
  {
    id: "kuendigung",
    icon: "✉️",
    titleRu: "Kündigung: Расторжение договора",
    titleUk: "Kündigung: Розірвання договору",
    descRu: "Напиши правильное заявление о расторжении договора",
    descUk: "Напиши правильну заяву про розірвання договору",
    difficulty: "B1",
    steps: [
      {
        type: "letter",
        titleRu: "Шаблон Kündigung",
        titleUk: "Шаблон Kündigung",
        germanText: `Max Mustermann
Musterstraße 1
10115 Berlin

An: Vodafone GmbH
Kundenservice
40099 Düsseldorf

Berlin, den 15. März 2026

Betreff: Kündigung meines Vertrags

Sehr geehrte Damen und Herren,

hiermit kündige ich meinen Vertrag mit der Kundennummer 123456789 
fristgerecht zum nächstmöglichen Zeitpunkt.

Bitte senden Sie mir eine schriftliche Bestätigung der Kündigung.

Mit freundlichen Grüßen
Max Mustermann`,
        explanationRu: "«Hiermit kündige ich» — стандартная формула расторжения. «Fristgerecht» — в установленный срок. «Nächstmöglicher Zeitpunkt» — ближайший возможный момент. «Bestätigung» — подтверждение.",
        explanationUk: "«Hiermit kündige ich» — стандартна формула розірвання. «Fristgerecht» — у встановлений термін. «Nächstmöglicher Zeitpunkt» — найближчий можливий момент. «Bestätigung» — підтвердження.",
        questions: [
          {
            questionRu: "Какая стандартная формула для расторжения договора?",
            questionUk: "Яка стандартна формула для розірвання договору?",
            type: "choice",
            correctAnswer: "Hiermit kündige ich meinen Vertrag",
            options: [
              "Ich möchte nicht mehr bezahlen",
              "Hiermit kündige ich meinen Vertrag",
              "Bitte löschen Sie mein Konto",
              "Ich brauche das nicht mehr",
            ],
          },
          {
            questionRu: "Что значит «fristgerecht»?",
            questionUk: "Що означає «fristgerecht»?",
            type: "choice",
            correctAnswer: "В установленный срок",
            options: ["Немедленно", "В установленный срок", "Через год", "Без уведомления"],
          },
          {
            questionRu: "Как попросить подтверждение?",
            questionUk: "Як попросити підтвердження?",
            type: "fill",
            correctAnswer: "Bestätigung",
            hintRu: "Bestätigung = подтверждение",
            hintUk: "Bestätigung = підтвердження",
          },
        ],
      },
    ],
  },
  {
    id: "finanzamt",
    icon: "📋",
    titleRu: "Письмо от Finanzamt",
    titleUk: "Лист від Finanzamt",
    descRu: "Разбери настоящее письмо от налоговой — не паникуй!",
    descUk: "Розбери справжнього листа від податкової — не панікуй!",
    difficulty: "B2",
    steps: [
      {
        type: "document",
        titleRu: "Письмо от Finanzamt",
        titleUk: "Лист від Finanzamt",
        germanText: `Finanzamt Berlin-Mitte
Steuernummer: 13/123/45678

Sehr geehrter Herr Mustermann,

Sie werden hiermit aufgefordert, Ihre Einkommensteuererklärung 
für das Kalenderjahr 2025 bis zum 31. Juli 2026 abzugeben.

Sollten Sie dieser Aufforderung nicht fristgerecht nachkommen, 
kann ein Verspätungszuschlag festgesetzt werden.

Bei Fragen wenden Sie sich bitte an Ihren zuständigen 
Sachbearbeiter (Durchwahl: 030 9024-XXXX).

Mit freundlichen Grüßen
Finanzamt Berlin-Mitte`,
        explanationRu: "Steuernummer — налоговый номер. Einkommensteuererklärung — декларация о доходах. Verspätungszuschlag — штраф за просрочку. Sachbearbeiter — ответственный сотрудник. Durchwahl — добавочный номер.",
        explanationUk: "Steuernummer — податковий номер. Einkommensteuererklärung — декларація про доходи. Verspätungszuschlag — штраф за прострочку. Sachbearbeiter — відповідальний працівник. Durchwahl — додатковий номер.",
        questions: [
          {
            questionRu: "Что требует Finanzamt в этом письме?",
            questionUk: "Що вимагає Finanzamt у цьому листі?",
            type: "choice",
            correctAnswer: "Подать налоговую декларацию",
            options: ["Заплатить штраф", "Подать налоговую декларацию", "Явиться лично", "Оплатить задолженность"],
          },
          {
            questionRu: "До какой даты нужно подать декларацию?",
            questionUk: "До якої дати потрібно подати декларацію?",
            type: "fill",
            correctAnswer: "31. Juli 2026",
            hintRu: "Найди дату в тексте",
            hintUk: "Знайди дату в тексті",
          },
          {
            questionRu: "Что такое «Verspätungszuschlag»?",
            questionUk: "Що таке «Verspätungszuschlag»?",
            type: "choice",
            correctAnswer: "Штраф за просрочку",
            options: ["Налоговый вычет", "Штраф за просрочку", "Скидка за раннюю подачу", "Дополнительный налог"],
          },
        ],
      },
    ],
  },
  {
    id: "hausverwaltung",
    icon: "🔧",
    titleRu: "Письмо в Hausverwaltung",
    titleUk: "Лист до Hausverwaltung",
    descRu: "Напиши жалобу управляющей компании — отопление не работает!",
    descUk: "Напиши скаргу управляючій компанії — опалення не працює!",
    difficulty: "B1",
    steps: [
      {
        type: "letter",
        titleRu: "Заявка на ремонт",
        titleUk: "Заявка на ремонт",
        germanText: `Sehr geehrte Damen und Herren,

ich bin Mieter der Wohnung in der Musterstraße 5, 3. OG links.

Seit dem 10. März funktioniert die Heizung in meinem 
Wohnzimmer nicht mehr. Die Raumtemperatur beträgt nur noch 
14 Grad. Ich bitte Sie, einen Handwerker so schnell wie 
möglich zu schicken.

Gemäß § 535 BGB sind Sie als Vermieter verpflichtet, die 
Mietsache in einem gebrauchsfähigen Zustand zu erhalten.

Sollte die Reparatur nicht innerhalb von 7 Tagen erfolgen, 
behalte ich mir eine Mietminderung vor.

Mit freundlichen Grüßen`,
        explanationRu: "Mieter — арендатор. OG (Obergeschoss) — этаж. Heizung — отопление. Handwerker — мастер/ремонтник. Mietminderung — снижение арендной платы. Vermieter — арендодатель.",
        explanationUk: "Mieter — орендар. OG (Obergeschoss) — поверх. Heizung — опалення. Handwerker — майстер. Mietminderung — зниження орендної плати. Vermieter — орендодавець.",
        questions: [
          {
            questionRu: "Как по-немецки «отопление»?",
            questionUk: "Як німецькою «опалення»?",
            type: "fill",
            correctAnswer: "Heizung",
            hintRu: "Heiz... (от heizen — отапливать)",
            hintUk: "Heiz... (від heizen — опалювати)",
          },
          {
            questionRu: "Что такое «Mietminderung»?",
            questionUk: "Що таке «Mietminderung»?",
            type: "choice",
            correctAnswer: "Снижение арендной платы",
            options: ["Повышение аренды", "Снижение арендной платы", "Расторжение договора", "Депозит"],
          },
          {
            questionRu: "Кого нужно вызвать для ремонта?",
            questionUk: "Кого потрібно викликати для ремонту?",
            type: "choice",
            correctAnswer: "Handwerker",
            options: ["Polizist", "Handwerker", "Nachbar", "Hausmeister"],
          },
        ],
      },
    ],
  },
];

const LebenInDeutschland = ({ onBack }: { onBack: () => void }) => {
  const { t, lang } = useLanguage();
  const { isMobile } = usePlatform();
  const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showResult, setShowResult] = useState<boolean | null>(null);
  const [inputValue, setInputValue] = useState("");
  const [score, setScore] = useState(0);
  const [totalAnswered, setTotalAnswered] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);
  const [completed, setCompleted] = useState(false);

  const isRu = language "ru";

  const resetGame = () => {
    setSelectedScenario(null);
    setCurrentStep(0);
    setCurrentQuestion(0);
    setAnswers({});
    setShowResult(null);
    setInputValue("");
    setScore(0);
    setTotalAnswered(0);
    setShowExplanation(false);
    setCompleted(false);
  };

  const handleAnswer = (answer: string) => {
    if (showResult !== null) return;
    const step = selectedScenario!.steps[currentStep];
    const question = step.questions[currentQuestion];
    const isCorrect = answer.trim().toLowerCase() === question.correctAnswer.toLowerCase();
    
    setShowResult(isCorrect);
    setTotalAnswered((p) => p + 1);
    if (isCorrect) setScore((p) => p + 1);
  };

  const nextQuestion = () => {
    const step = selectedScenario!.steps[currentStep];
    if (currentQuestion + 1 < step.questions.length) {
      setCurrentQuestion((q) => q + 1);
      setShowResult(null);
      setInputValue("");
    } else if (currentStep + 1 < selectedScenario!.steps.length) {
      setCurrentStep((s) => s + 1);
      setCurrentQuestion(0);
      setShowResult(null);
      setInputValue("");
      setShowExplanation(false);
    } else {
      setCompleted(true);
    }
  };

  // ── Scenario list ──
  if (!selectedScenario) {
    return (
      <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("back")}
        </button>

        <h1 className="font-display text-xl font-bold text-foreground mb-1 flex items-center gap-2">
          🏛 {isRu ? "Жизнь в Германии" : "Життя в Німеччині"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {isRu
            ? "Реальные документы, письма и ситуации — то, что нужно каждый день"
            : "Реальні документи, листи та ситуації — те, що потрібно щодня"}
        </p>

        <div className="space-y-3">
          {scenarios.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedScenario(s)}
              className="w-full glass-card p-5 flex items-center gap-4 text-left hover:border-primary/30 transition-all group"
            >
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center text-2xl flex-shrink-0">
                {s.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <h3 className="font-display text-sm font-bold text-foreground group-hover:text-primary transition-colors">
                    {isRu ? s.titleRu : s.titleUk}
                  </h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                    {s.difficulty}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {isRu ? s.descRu : s.descUk}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Completed ──
  if (completed) {
    const pct = Math.round((score / totalAnswered) * 100);
    return (
      <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
        <div className="glass-card p-8 text-center space-y-4">
          <div className="text-5xl mb-2">{pct >= 80 ? "🎉" : pct >= 50 ? "👍" : "📚"}</div>
          <h2 className="font-display text-xl font-bold text-foreground">
            {isRu ? "Сценарий пройден!" : "Сценарій пройдено!"}
          </h2>
          <p className="text-3xl font-bold text-primary">
            {score}/{totalAnswered}
          </p>
          <p className="text-sm text-muted-foreground">
            {pct >= 80
              ? isRu ? "Отлично! Ты готов к жизни в Германии 🇩🇪" : "Чудово! Ти готовий до життя в Німеччині 🇩🇪"
              : isRu ? "Повтори сценарий, чтобы запомнить лучше" : "Повтори сценарій, щоб запам'ятати краще"}
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="outline" onClick={resetGame} className="gap-2">
              <RotateCcw className="w-4 h-4" />
              {isRu ? "К списку" : "До списку"}
            </Button>
            <Button onClick={() => { setCompleted(false); setCurrentStep(0); setCurrentQuestion(0); setShowResult(null); setInputValue(""); setScore(0); setTotalAnswered(0); setShowExplanation(false); }} className="gap-2">
              <Star className="w-4 h-4" />
              {isRu ? "Ещё раз" : "Ще раз"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Active scenario ──
  const step = selectedScenario.steps[currentStep];
  const question = step.questions[currentQuestion];

  return (
    <div className={`w-full mx-auto px-4 py-6 ${isMobile ? "max-w-md" : "max-w-2xl"}`}>
      <button
        onClick={resetGame}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("back")}
      </button>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-base font-bold text-foreground flex items-center gap-2">
          {selectedScenario.icon} {isRu ? step.titleRu : step.titleUk}
        </h2>
        <span className="text-xs text-muted-foreground">
          {currentStep + 1}/{selectedScenario.steps.length} • {currentQuestion + 1}/{step.questions.length}
        </span>
      </div>

      {/* Progress */}
      <div className="w-full h-1.5 rounded-full bg-muted mb-5">
        <div
          className="h-full rounded-full bg-primary transition-all duration-300"
          style={{
            width: `${((currentStep * step.questions.length + currentQuestion) / (selectedScenario.steps.reduce((a, s) => a + s.questions.length, 0))) * 100}%`,
          }}
        />
      </div>

      {/* German document */}
      <div className="glass-card p-4 mb-4 border-l-4 border-primary/40">
        <div className="flex items-center gap-2 mb-2">
          <FileText className="w-4 h-4 text-primary" />
          <span className="text-xs font-medium text-primary uppercase tracking-wide">
            {step.type === "form" ? "Formular" : step.type === "letter" ? "Brief" : step.type === "dialogue" ? "Dialog" : "Dokument"}
          </span>
        </div>
        <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed">
          {step.germanText}
        </pre>
      </div>

      {/* Explanation toggle */}
      <button
        onClick={() => setShowExplanation(!showExplanation)}
        className="text-xs text-primary hover:underline mb-4 flex items-center gap-1"
      >
        💡 {isRu ? (showExplanation ? "Скрыть подсказку" : "Показать перевод/объяснение") : (showExplanation ? "Сховати підказку" : "Показати переклад/пояснення")}
      </button>

      {showExplanation && (
        <div className="glass-card p-3 mb-4 bg-accent/5 border-accent/20">
          <p className="text-xs text-muted-foreground leading-relaxed">
            {isRu ? step.explanationRu : step.explanationUk}
          </p>
        </div>
      )}

      {/* Question */}
      <div className="glass-card p-5 space-y-4">
        <p className="text-sm font-medium text-foreground">
          {isRu ? question.questionRu : question.questionUk}
        </p>

        {question.type === "choice" ? (
          <div className="space-y-2">
            {question.options!.map((opt) => {
              const isCorrectOpt = opt === question.correctAnswer;
              const isSelected = showResult !== null && opt === question.correctAnswer;
              return (
                <button
                  key={opt}
                  onClick={() => handleAnswer(opt)}
                  disabled={showResult !== null}
                  className={cn(
                    "w-full p-3 rounded-xl text-sm text-left transition-all border",
                    showResult === null
                      ? "border-border hover:border-primary/40 hover:bg-primary/5"
                      : isCorrectOpt
                      ? "border-green-500/50 bg-green-500/10 text-green-700 dark:text-green-400"
                      : "border-border opacity-50"
                  )}
                >
                  {opt}
                  {showResult !== null && isCorrectOpt && (
                    <CheckCircle2 className="w-4 h-4 inline ml-2 text-green-500" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder={isRu ? "Введите ответ..." : "Введіть відповідь..."}
              disabled={showResult !== null}
              onKeyDown={(e) => e.key === "Enter" && inputValue.trim() && handleAnswer(inputValue)}
              className="text-sm"
            />
            {question.hintRu && showResult === null && (
              <p className="text-[11px] text-muted-foreground">
                💡 {isRu ? question.hintRu : question.hintUk}
              </p>
            )}
            {showResult === null && (
              <Button
                size="sm"
                onClick={() => handleAnswer(inputValue)}
                disabled={!inputValue.trim()}
                className="w-full"
              >
                {isRu ? "Проверить" : "Перевірити"}
              </Button>
            )}
          </div>
        )}

        {/* Result feedback */}
        {showResult !== null && (
          <div className={cn(
            "flex items-center gap-2 p-3 rounded-xl text-sm",
            showResult ? "bg-green-500/10 text-green-700 dark:text-green-400" : "bg-destructive/10 text-destructive"
          )}>
            {showResult ? (
              <>
                <CheckCircle2 className="w-5 h-5" />
                {isRu ? "Правильно!" : "Правильно!"}
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5" />
                {isRu ? `Ответ: ${question.correctAnswer}` : `Відповідь: ${question.correctAnswer}`}
              </>
            )}
          </div>
        )}

        {showResult !== null && (
          <Button onClick={nextQuestion} className="w-full">
            {isRu ? "Далее →" : "Далі →"}
          </Button>
        )}
      </div>
    </div>
  );
};

export default LebenInDeutschland;
