import { CheckCircle2, Circle, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import type { Lang } from "@/i18n/translations";

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

interface ModuleRow {
  id: string;
  title: string;
  sort_order: number;
}

interface LessonRow {
  id: string;
  module_id: string | null;
  title: string;
  sort_order: number;
  lesson_type: string;
  estimated_minutes: number;
}

interface Props {
  modules: ModuleRow[];
  lessons: LessonRow[];
  completedIds: Set<string>;
  activeLessonId: string | null;
  onSelectLesson: (id: string) => void;
  lang: Lang;
}

const LearnSidebar = ({ modules, lessons, completedIds, activeLessonId, onSelectLesson, lang }: Props) => {
  const totalCompleted = lessons.filter((l) => completedIds.has(l.id)).length;
  const percent = lessons.length > 0 ? Math.round((totalCompleted / lessons.length) * 100) : 0;

  const getLessonsForModule = (moduleId: string) =>
    lessons.filter((l) => l.module_id === moduleId).sort((a, b) => a.sort_order - b.sort_order);

  // Lessons without module
  const orphanLessons = lessons.filter((l) => !l.module_id);

  return (
    <div className="p-4 space-y-4">
      {/* Progress header */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-display font-bold text-foreground">
            {lang === "uk" ? "Прогрес" : "Прогресс"}
          </span>
          <span className="text-muted-foreground">
            {totalCompleted}/{lessons.length} · {percent}%
          </span>
        </div>
        <Progress value={percent} className="h-2" />
      </div>

      {/* Modules */}
      {modules.map((mod) => {
        const modLessons = getLessonsForModule(mod.id);
        const modCompleted = modLessons.filter((l) => completedIds.has(l.id)).length;
        const allDone = modCompleted === modLessons.length && modLessons.length > 0;

        return (
          <div key={mod.id}>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`text-[11px] font-semibold ${allDone ? "text-primary" : "text-muted-foreground"}`}>
                {mod.title}
              </span>
              <span className="text-[10px] text-muted-foreground ml-auto">
                {modCompleted}/{modLessons.length}
              </span>
            </div>

            <div className="space-y-0.5">
              {modLessons.map((lesson) => {
                const isActive = lesson.id === activeLessonId;
                const isCompleted = completedIds.has(lesson.id);

                return (
                  <button
                    key={lesson.id}
                    onClick={() => onSelectLesson(lesson.id)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-xs ${
                      isActive
                        ? "bg-primary/15 border-l-[3px] border-primary text-foreground"
                        : isCompleted
                          ? "text-muted-foreground/70 hover:bg-muted/30"
                          : "text-foreground hover:bg-muted/30"
                    }`}
                  >
                    {/* Status icon */}
                    {isCompleted ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                    ) : isActive ? (
                      <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0" />
                    ) : (
                      <Circle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                    )}

                    {/* Type icon */}
                    <span className="text-sm shrink-0">{LESSON_TYPE_ICONS[lesson.lesson_type] || "📄"}</span>

                    {/* Title */}
                    <span className="truncate flex-1">{lesson.title}</span>

                    {/* Duration */}
                    <span className="text-[10px] text-muted-foreground shrink-0">{lesson.estimated_minutes}м</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Orphan lessons */}
      {orphanLessons.length > 0 && (
        <div className="space-y-0.5">
          {orphanLessons.map((lesson) => {
            const isActive = lesson.id === activeLessonId;
            const isCompleted = completedIds.has(lesson.id);
            return (
              <button
                key={lesson.id}
                onClick={() => onSelectLesson(lesson.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-all text-xs ${
                  isActive
                    ? "bg-primary/15 border-l-[3px] border-primary text-foreground"
                    : isCompleted
                      ? "text-muted-foreground/70 hover:bg-muted/30"
                      : "text-foreground hover:bg-muted/30"
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary shrink-0" />
                ) : isActive ? (
                  <ChevronRight className="w-3.5 h-3.5 text-primary shrink-0" />
                ) : (
                  <Circle className="w-3.5 h-3.5 text-muted-foreground/40 shrink-0" />
                )}
                <span className="text-sm shrink-0">{LESSON_TYPE_ICONS[lesson.lesson_type] || "📄"}</span>
                <span className="truncate flex-1">{lesson.title}</span>
                <span className="text-[10px] text-muted-foreground shrink-0">{lesson.estimated_minutes}м</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LearnSidebar;
