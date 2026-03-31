import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Lock } from "lucide-react";
import type { Lang } from "@/i18n/translations";

interface ModuleRow {
  id: string;
  title: string;
  description: string | null;
  sort_order: number;
  is_free_preview: boolean;
}

interface LessonRow {
  id: string;
  module_id: string | null;
  title: string;
  description: string | null;
  sort_order: number;
  lesson_type: string;
  estimated_minutes: number;
  is_free_preview: boolean;
}

const LESSON_TYPE_ICONS: Record<string, string> = {
  video: "🎬",
  video_quiz: "📝",
  ai_tutor: "🤖",
  teacher_chat: "💬",
  writing: "✍️",
  speaking: "🎙️",
  notebook: "📓",
  exam: "🏆",
};

interface Props {
  modules: ModuleRow[];
  lessons: LessonRow[];
  isPurchased: boolean;
  lang: Lang;
}

const CurriculumAccordion = ({ modules, lessons, isPurchased, lang }: Props) => {
  const getLessonsForModule = (moduleId: string) =>
    lessons.filter((l) => l.module_id === moduleId).sort((a, b) => a.sort_order - b.sort_order);

  const totalMinutes = lessons.reduce((s, l) => s + (l.estimated_minutes || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display font-bold text-sm text-foreground">
          {lang === "uk" ? "Програма курсу" : "Программа курса"}
        </h3>
        <span className="text-[11px] text-muted-foreground">
          {modules.length} {lang === "uk" ? "модулів" : "модулей"} · {lessons.length} {lang === "uk" ? "уроків" : "уроков"} · ~{Math.round(totalMinutes / 60)}{lang === "uk" ? " год" : " ч"}
        </span>
      </div>

      <Accordion type="multiple" defaultValue={modules.length > 0 ? [modules[0].id] : []} className="space-y-2">
        {modules.map((mod, mi) => {
          const modLessons = getLessonsForModule(mod.id);
          const isAccessible = isPurchased || mod.is_free_preview;

          return (
            <AccordionItem
              key={mod.id}
              value={mod.id}
              className="rounded-xl border border-border/30 bg-card/40 backdrop-blur-sm overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/20 transition-colors">
                <div className="flex items-center gap-3 text-left">
                  <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 font-display font-bold text-xs">
                    {mi + 1}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{mod.title}</p>
                    {mod.description && (
                      <p className="text-[11px] text-muted-foreground mt-0.5">{mod.description}</p>
                    )}
                  </div>
                  {mod.is_free_preview && !isPurchased && (
                    <span className="ml-auto mr-2 px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-semibold shrink-0">
                      FREE
                    </span>
                  )}
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-3">
                <div className="space-y-1 pt-1">
                  {modLessons.map((lesson) => {
                    const accessible = isPurchased || lesson.is_free_preview || mod.is_free_preview;
                    return (
                      <div
                        key={lesson.id}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                          accessible ? "hover:bg-muted/30" : "opacity-50"
                        }`}
                      >
                        <span className="text-base w-6 text-center shrink-0">
                          {LESSON_TYPE_ICONS[lesson.lesson_type] || "📄"}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-foreground truncate">{lesson.title}</p>
                          {lesson.description && (
                            <p className="text-[10px] text-muted-foreground truncate">{lesson.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[10px] text-muted-foreground">{lesson.estimated_minutes} мин</span>
                          {!accessible && <Lock className="w-3 h-3 text-muted-foreground" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
};

export default CurriculumAccordion;
