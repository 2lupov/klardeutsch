import { useState } from "react";
import { ChevronDown, BookOpen, Languages, PenLine, ListChecks, MessageCircle, Globe } from "lucide-react";
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
}

const SectionButton = ({ icon: Icon, label, count, isOpen, onClick, color }: {
  icon: any; label: string; count?: number; isOpen: boolean; onClick: () => void; color: string;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all",
      isOpen
        ? `bg-${color}/10 text-foreground border border-${color}/20`
        : "text-muted-foreground hover:text-foreground hover:bg-secondary/80"
    )}
  >
    <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center shrink-0", `bg-${color}/15`)}>
      <Icon className={cn("w-3.5 h-3.5", `text-${color}`)} />
    </div>
    <span className="flex-1 text-left">{label}</span>
    {count !== undefined && (
      <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-full">{count}</span>
    )}
    <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
  </button>
);

const LessonCard = ({ lesson, index, lang, isExpanded, onToggle }: LessonCardProps) => {
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const toggleSection = (key: string) => setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));

  const ex = lesson.exercises || {};
  const vocab = ex.vocabulary || ex.vocab_cards || [];
  const exercises = ex.exercises || [];
  const dialog = ex.practice_dialog;
  const culturalNotes = ex.cultural_notes || [];
  const topicDesc = lang === "uk" ? ex.topic_description?.ua : ex.topic_description?.ru;

  const clozeExercises = exercises.filter((e: any) => e.type === "cloze");
  const mcExercises = exercises.filter((e: any) => e.type === "multiple_choice");

  const sk = (name: string) => `${lesson.id}-${name}`;

  return (
    <div className={cn(
      "rounded-2xl border transition-all duration-300",
      isExpanded
        ? "border-primary/20 bg-card shadow-lg shadow-primary/5"
        : "border-border/30 bg-card/60 hover:bg-card/80 hover:border-border/50"
    )}>
      {/* Lesson header */}
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
        <ChevronDown className={cn(
          "w-4 h-4 text-muted-foreground transition-transform duration-300",
          isExpanded && "rotate-180"
        )} />
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="px-4 pb-4 space-y-2 animate-slide-up">
          {topicDesc && (
            <p className="text-xs text-muted-foreground italic px-1 pb-1">{topicDesc}</p>
          )}

          {/* Theory */}
          {lesson.theory && (
            <>
              <SectionButton
                icon={BookOpen} label={lang === "uk" ? "Теорія" : "Теория"}
                isOpen={!!expandedSections[sk("theory")]} onClick={() => toggleSection(sk("theory"))}
                color="primary"
              />
              {expandedSections[sk("theory")] && (
                <div className="p-4 rounded-xl bg-secondary/50 border border-border/30 animate-slide-up">
                  <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed">{lesson.theory}</div>
                </div>
              )}
            </>
          )}

          {/* Vocabulary */}
          {vocab.length > 0 && (
            <>
              <SectionButton
                icon={Languages}
                label={lang === "uk" ? "Словник" : "Словарь"}
                count={vocab.length}
                isOpen={!!expandedSections[sk("vocab")]}
                onClick={() => toggleSection(sk("vocab"))}
                color="primary"
              />
              {expandedSections[sk("vocab")] && (
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
                          {example && (
                            <p className="text-[10px] text-muted-foreground mt-1 italic leading-relaxed">💬 {example}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Cloze exercises */}
          {clozeExercises.length > 0 && (
            <>
              <SectionButton
                icon={PenLine}
                label={lang === "uk" ? "Заповніть пропуски" : "Заполните пропуски"}
                count={clozeExercises.length}
                isOpen={!!expandedSections[sk("cloze")]}
                onClick={() => toggleSection(sk("cloze"))}
                color="primary"
              />
              {expandedSections[sk("cloze")] && (
                <div className="space-y-2.5 animate-slide-up">
                  {clozeExercises.map((e: any, i: number) => (
                    <ClozeExercise key={i} ex={e} lang={lang} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Multiple choice */}
          {mcExercises.length > 0 && (
            <>
              <SectionButton
                icon={ListChecks}
                label={lang === "uk" ? "Виберіть відповідь" : "Выберите ответ"}
                count={mcExercises.length}
                isOpen={!!expandedSections[sk("mc")]}
                onClick={() => toggleSection(sk("mc"))}
                color="primary"
              />
              {expandedSections[sk("mc")] && (
                <div className="space-y-2.5 animate-slide-up">
                  {mcExercises.map((e: any, i: number) => (
                    <MCExercise key={i} ex={e} lang={lang} />
                  ))}
                </div>
              )}
            </>
          )}

          {/* Legacy grammar */}
          {ex.grammar_questions?.length > 0 && !exercises.length && (
            <div className="space-y-2.5">
              <span className="text-xs text-muted-foreground font-bold px-1">
                📝 {lang === "uk" ? "ГРАМАТИКА" : "ГРАММАТИКА"}
              </span>
              {ex.grammar_questions.map((q: any, qi: number) => (
                <MCExercise key={qi} ex={q} lang={lang} />
              ))}
            </div>
          )}

          {/* Dialog */}
          {dialog && (
            <>
              <SectionButton
                icon={MessageCircle}
                label={`${lang === "uk" ? "Діалог" : "Диалог"}: ${lang === "uk" ? dialog.title?.ua : dialog.title?.ru}`}
                isOpen={!!expandedSections[sk("dialog")]}
                onClick={() => toggleSection(sk("dialog"))}
                color="primary"
              />
              {expandedSections[sk("dialog")] && (
                <div className="space-y-2 p-3 rounded-xl bg-secondary/30 border border-border/20 animate-slide-up">
                  {dialog.dialog?.map((line: any, i: number) => {
                    const translation = lang === "uk" ? line.text_ua : line.text_ru;
                    return (
                      <div key={i} className={cn("flex gap-2.5", line.speaker === "B" && "flex-row-reverse text-right")}>
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0",
                          line.speaker === "A" ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"
                        )}>
                          {line.speaker}
                        </div>
                        <div className={cn(
                          "flex-1 p-2.5 rounded-xl text-xs",
                          line.speaker === "A"
                            ? "bg-primary/5 border border-primary/10"
                            : "bg-muted/30 border border-border/20"
                        )}>
                          <p className="font-medium text-foreground">{line.text_de}</p>
                          <p className="text-muted-foreground text-[10px] mt-0.5">{translation}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* Cultural notes */}
          {culturalNotes.length > 0 && (
            <>
              <SectionButton
                icon={Globe}
                label={lang === "uk" ? "Культура" : "Культура"}
                count={culturalNotes.length}
                isOpen={!!expandedSections[sk("culture")]}
                onClick={() => toggleSection(sk("culture"))}
                color="primary"
              />
              {expandedSections[sk("culture")] && (
                <div className="space-y-2 animate-slide-up">
                  {culturalNotes.map((note: any, i: number) => (
                    <div key={i} className="p-3 rounded-xl bg-primary/5 border border-primary/10">
                      <p className="text-xs font-semibold text-foreground mb-1">
                        🌍 {lang === "uk" ? note.title?.ua : note.title?.ru}
                      </p>
                      <p className="text-[11px] text-muted-foreground leading-relaxed">
                        {lang === "uk" ? note.content?.ua : note.content?.ru}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Legacy reading */}
          {ex.reading && (
            <div className="space-y-1.5">
              <span className="text-xs text-muted-foreground font-bold px-1">
                📚 {lang === "uk" ? "ЧИТАННЯ" : "ЧТЕНИЕ"}
              </span>
              <div className="p-3 rounded-xl bg-secondary/30 text-xs">
                <p className="font-medium text-foreground mb-1">{ex.reading.title}</p>
                <p className="text-muted-foreground whitespace-pre-wrap">{ex.reading.text}</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LessonCard;
