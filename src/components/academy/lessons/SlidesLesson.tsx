import { useState } from "react";
import { Presentation, CheckCircle2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import LessonSlidesViewer from "@/components/admin/LessonSlidesViewer";
import type { Lang } from "@/i18n/translations";

interface Props {
  lesson: {
    id: string;
    title: string;
    description: string | null;
    content: any;
  };
  onComplete: () => void;
  lang: Lang;
}

const SlidesLesson = ({ lesson, onComplete, lang }: Props) => {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);
  const slides = Array.isArray(lesson.content?.slides) ? lesson.content.slides : [];
  const hasSlides = slides.length > 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-xl font-bold text-foreground">{lesson.title}</h2>
        {lesson.description && (
          <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>
        )}
      </div>

      {hasSlides ? (
        <div className="rounded-2xl border border-border/30 bg-gradient-to-br from-primary/10 via-card/60 to-accent/10 p-8 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center">
            <Presentation className="w-8 h-8 text-primary" />
          </div>
          <div>
            <p className="font-display text-lg font-bold text-foreground">
              {lang === "uk" ? "Презентація уроку" : "Презентация урока"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {slides.length} {lang === "uk" ? "слайдів" : "слайдов"}
            </p>
          </div>
          <Button onClick={() => setOpen(true)} size="lg" className="font-display font-bold">
            <Presentation className="w-4 h-4 mr-2" />
            {lang === "uk" ? "Відкрити презентацію" : "Открыть презентацию"}
          </Button>
        </div>
      ) : (
        <div className="aspect-video rounded-xl border border-border/30 bg-muted/20 flex flex-col items-center justify-center gap-3">
          <BookOpen className="w-12 h-12 text-primary/20" />
          <p className="text-sm text-muted-foreground">
            {lang === "uk" ? "Презентація скоро буде доступна" : "Презентация скоро будет доступна"}
          </p>
        </div>
      )}

      <div className="flex justify-center">
        {done ? (
          <div className="flex items-center gap-2 text-primary text-sm font-semibold">
            <CheckCircle2 className="w-5 h-5" />
            {lang === "uk" ? "Завершено!" : "Завершено!"}
          </div>
        ) : (
          <Button
            onClick={() => { setDone(true); onComplete(); }}
            variant={hasSlides ? "outline" : "default"}
            className="font-display font-bold"
            size="lg"
          >
            {lang === "uk" ? "Завершити урок" : "Завершить урок"}
          </Button>
        )}
      </div>

      <LessonSlidesViewer
        open={open}
        onClose={() => setOpen(false)}
        slides={slides}
        lessonTitle={lesson.title}
      />
    </div>
  );
};

export default SlidesLesson;
