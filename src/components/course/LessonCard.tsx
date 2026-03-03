import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import ClozeExercise from "./ClozeExercise";
import MCExercise from "./MCExercise";

interface LessonCardProps {
  lesson: {
    id: string;
    title: string;
    theory: string;
    exercises: any;
    sort_order: number;
  };
  index: number;
  lang: string;
  isExpanded: boolean;
  onToggle: () => void;
  onSectionOpen?: () => void;
  hideHeader?: boolean;
}

type SectionKey = "theory" | "vocab" | "cloze" | "mc" | "dialog" | "culture" | "grammar" | "reading";

interface SectionDef {
  key: SectionKey;
  emoji: string;
  label: string;
  sublabel: string;
  available: boolean;
  count?: number;
}

const LessonCard = ({ lesson, index, lang, isExpanded, onToggle, onSectionOpen, hideHeader }: LessonCardProps) => {
  const [activeSection, setActiveSection] = useState<SectionKey | null>(null);
  const [openedSections, setOpenedSections] = useState<Set<string>>(new Set());

  const ex = lesson.exercises || {};
  const vocab = ex.vocabulary || ex.vocab_cards || [];
  const exercises = ex.exercises || [];
  const dialog = ex.practice_dialog;
  const culturalNotes = ex.cultural_notes || [];
  const topicDesc = lang === "uk" ? ex.topic_description?.ua : ex.topic_description?.ru;

  const clozeExercises = exercises.filter((e: any) => e.type === "cloze");
  const mcExercises = exercises.filter((e: any) => e.type === "multiple_choice");

  const sections = ([
    { key: "theory" as SectionKey, emoji: "📖", label: lang === "uk" ? "Теорія" : "Теория", sublabel: lang === "uk" ? "Правила та пояснення" : "Правила и объяснения", available: !!lesson.theory },
    { key: "vocab" as SectionKey, emoji: "📚", label: lang === "uk" ? "Словник" : "Словарь", sublabel: lang === "uk" ? "Нові слова" : "Новые слова", available: vocab.length > 0, count: vocab.length },
    { key: "cloze" as SectionKey, emoji: "✍️", label: lang === "uk" ? "Пропуски" : "Пропуски", sublabel: lang === "uk" ? "Заповніть пропуски" : "Заполните пропуски", available: clozeExercises.length > 0, count: clozeExercises.length },
    { key: "mc" as SectionKey, emoji: "🧠", label: lang === "uk" ? "Тест" : "Тест", sublabel: lang === "uk" ? "Виберіть відповідь" : "Выберите ответ", available: mcExercises.length > 0, count: mcExercises.length },
    { key: "dialog" as SectionKey, emoji: "💬", label: lang === "uk" ? "Діалог" : "Диалог", sublabel: lang === "uk" ? "Практика розмови" : "Практика разговора", available: !!dialog },
    { key: "culture" as SectionKey, emoji: "🌍", label: lang === "uk" ? "Культура" : "Культура", sublabel: lang === "uk" ? "Цікаві факти" : "Интересные факты", available: culturalNotes.length > 0, count: culturalNotes.length },
    { key: "grammar" as SectionKey, emoji: "📝", label: lang === "uk" ? "Граматика" : "Грамматика", sublabel: lang === "uk" ? "Питання" : "Вопросы", available: ex.grammar_questions?.length > 0 && !exercises.length, count: ex.grammar_questions?.length },
    { key: "reading" as SectionKey, emoji: "📕", label: lang === "uk" ? "Читання" : "Чтение", sublabel: lang === "uk" ? "Текст для читання" : "Текст для чтения", available: !!ex.reading },
  ] as SectionDef[]).filter(s => s.available);

  const handleSectionSelect = (key: SectionKey) => {
    setActiveSection(key);
    if (!openedSections.has(key)) {
      setOpenedSections(prev => new Set(prev).add(key));
      onSectionOpen?.();
    }
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case "theory":
        return (
          <div className="p-4 rounded-xl bg-secondary/50 border border-border/30 animate-slide-up">
            <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{lesson.theory}</div>
          </div>
        );
      case "vocab":
        return (
          <div className="space-y-1.5 animate-slide-up">
            {vocab.map((v: any, i: number) => {
              const german = v.de || v.german || "";
              const translation = lang === "uk" ? (v.ua || v.ukrainian || v.ru || v.russian) : (v.ru || v.russian || "");
              const example = v.example_de || v.example || "";
              return (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-secondary/30 border border-border/20 hover:bg-secondary/50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className="font-bold text-foreground text-sm">{german}</span>
                      <span className="text-muted-foreground text-xs">— {translation}</span>
                    </div>
                    {example && <p className="text-[10px] text-muted-foreground mt-1 italic">💬 {example}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        );
      case "cloze":
        return (
          <div className="space-y-2.5 animate-slide-up">
            {clozeExercises.map((e: any, i: number) => <ClozeExercise key={i} ex={e} lang={lang} />)}
          </div>
        );
      case "mc":
        return (
          <div className="space-y-2.5 animate-slide-up">
            {mcExercises.map((e: any, i: number) => <MCExercise key={i} ex={e} lang={lang} />)}
          </div>
        );
      case "dialog":
        return dialog ? (
          <div className="space-y-2 p-3 rounded-xl bg-secondary/30 border border-border/20 animate-slide-up">
            {dialog.dialog?.map((line: any, i: number) => {
              const translation = lang === "uk" ? line.text_ua : line.text_ru;
              return (
                <div key={i} className={cn("flex gap-2.5", line.speaker === "B" && "flex-row-reverse text-right")}>
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                    line.speaker === "A" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                  )}>{line.speaker}</div>
                  <div className={cn(
                    "flex-1 p-2.5 rounded-xl text-xs",
                    line.speaker === "A" ? "bg-primary/5 border border-primary/10" : "bg-muted/30 border border-border/20"
                  )}>
                    <p className="font-medium text-foreground">{line.text_de}</p>
                    <p className="text-muted-foreground text-[10px] mt-0.5">{translation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : null;
      case "culture":
        return (
          <div className="space-y-2 animate-slide-up">
            {culturalNotes.map((note: any, i: number) => (
              <div key={i} className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                <p className="text-xs font-semibold text-foreground mb-1">🌍 {lang === "uk" ? note.title?.ua : note.title?.ru}</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{lang === "uk" ? note.content?.ua : note.content?.ru}</p>
              </div>
            ))}
          </div>
        );
      case "grammar":
        return (
          <div className="space-y-2.5 animate-slide-up">
            {ex.grammar_questions?.map((q: any, qi: number) => <MCExercise key={qi} ex={q} lang={lang} />)}
          </div>
        );
      case "reading":
        return ex.reading ? (
          <div className="p-3 rounded-xl bg-secondary/30 text-xs animate-slide-up">
            <p className="font-medium text-foreground mb-1">{ex.reading.title}</p>
            <p className="text-muted-foreground whitespace-pre-wrap">{ex.reading.text}</p>
          </div>
        ) : null;
      default:
        return null;
    }
  };

  // Content area
  const renderContent = () => {
    if (!isExpanded) return null;

    // Active section → show content with back button
    if (activeSection) {
      const currentSection = sections.find(s => s.key === activeSection);
      return (
        <div className="px-4 pb-4 animate-slide-up">
          <button
            onClick={() => setActiveSection(null)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-4 transition-colors group"
          >
            <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            {lang === "uk" ? "До секцій" : "К секциям"}
          </button>
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">{currentSection?.emoji}</span>
            <h3 className="font-display font-bold text-base text-foreground">{currentSection?.label}</h3>
          </div>
          {renderSectionContent()}
        </div>
      );
    }

    // Section grid (like LevelSelector)
    return (
      <div className="px-4 pb-4 animate-slide-up">
        {topicDesc && (
          <p className="text-xs text-muted-foreground italic mb-3">{topicDesc}</p>
        )}
        <div className="grid grid-cols-2 gap-2.5">
          {sections.map((section, i) => (
            <button
              key={section.key}
              onClick={() => handleSectionSelect(section.key)}
              className={cn(
                "glass-card p-4 flex flex-col items-center gap-2 transition-all hover:border-primary/50 hover:bg-primary/5 group relative overflow-hidden",
                openedSections.has(section.key) && "border-primary/20"
              )}
              style={{ animationDelay: `${i * 60}ms` }}
            >
              {/* Progress indicator for opened sections */}
              {openedSections.has(section.key) && (
                <div
                  className="absolute bottom-0 left-0 h-0.5 w-full"
                  style={{ background: "linear-gradient(90deg, hsl(var(--yellow-glow)), hsl(var(--yellow-soft)))" }}
                />
              )}
              <span className="text-2xl animate-float" style={{ animationDelay: `${i * 150}ms` }}>
                {section.emoji}
              </span>
              <div className="text-center">
                <h3 className="text-sm font-display font-bold text-primary group-hover:text-foreground transition-colors">
                  {section.label}
                </h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">{section.sublabel}</p>
                {section.count !== undefined && (
                  <p className="text-[10px] text-primary/70 mt-0.5 font-medium">{section.count} шт.</p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className={cn(
      "rounded-2xl border transition-all duration-300",
      isExpanded
        ? "border-primary/20 bg-card shadow-lg shadow-primary/5"
        : "border-border/30 bg-card/60 hover:bg-card/80 hover:border-border/50"
    )}>
      {/* Lesson header */}
      {!hideHeader && (
        <button onClick={onToggle} className="w-full flex items-center gap-3.5 p-4 text-left group">
          <div className={cn(
            "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 font-display font-bold text-sm transition-all",
            isExpanded
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
              : "bg-primary/10 text-primary group-hover:bg-primary/20"
          )}>
            {index + 1}
          </div>
          <span className="text-sm font-semibold text-foreground flex-1">{lesson.title}</span>
        </button>
      )}

      {renderContent()}
    </div>
  );
};

export default LessonCard;
