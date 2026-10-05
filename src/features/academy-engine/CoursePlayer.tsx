import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import BackButton from "@/components/BackButton";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import ExerciseView from "./ExerciseView";
import { CATALOG, loadCourse, saveAttempt } from "./store";
import { pick, type CourseContent, type Lang, type StageType } from "./types";

const STAGE: Record<Lang, Record<StageType, string>> = {
  uk: { repetition: "Повторення", input: "Вхід", practice: "Контрольована практика", task: "Задача", feedback: "Зворотний зв'язок" },
  ru: { repetition: "Повторение", input: "Вход", practice: "Контролируемая практика", task: "Задача", feedback: "Обратная связь" },
};
const T = {
  uk: { missing: "Курс ще готується.", lesson: "Урок", err: "Не вдалося зберегти спробу" },
  ru: { missing: "Курс ещё готовится.", lesson: "Урок", err: "Не удалось сохранить попытку" },
};

export default function CoursePlayer() {
  const { code = "" } = useParams();
  const { lang: l } = useLanguage();
  const lang: Lang = l === "uk" ? "uk" : "ru";
  const { user } = useAuth();
  const meta = CATALOG.find((c) => c.code === code);
  const [course, setCourse] = useState<CourseContent | null | undefined>(undefined);
  const [li, setLi] = useState(0);

  useEffect(() => { loadCourse(code).then(setCourse); }, [code]);

  if (course === undefined) return null;
  const lesson = course?.lessons[li];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-16 pt-4 md:px-6">
      <BackButton to="/academy" />
      <p className="mt-4 text-xs font-semibold uppercase tracking-wider text-primary">{code}</p>
      <h1 className="font-display text-2xl font-bold text-foreground">{meta?.title}</h1>
      {course && <p className="mt-1 text-sm text-muted-foreground">{pick(course.canDo, lang)}</p>}

      {!course || !lesson ? <p className="mt-8 text-muted-foreground">{T[lang].missing}</p> : (
        <>
          <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto">
            {course.lessons.map((ls, i) => (
              <button key={ls.id} onClick={() => setLi(i)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-sm ${i === li ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>
                {T[lang].lesson} {i + 1}
              </button>
            ))}
          </div>
          <h2 className="mt-5 font-display text-xl font-semibold text-foreground">{pick(lesson.title, lang)}</h2>
          <div key={lesson.id} className="mt-4 space-y-8">
            {lesson.stages.map((st, si) => (
              <section key={si} className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">{si + 1}. {STAGE[lang][st.type]}</h3>
                {st.explanation && <p className="text-sm text-foreground/90">{pick(st.explanation, lang)}</p>}
                {st.exercises.map((ex) => (
                  <ExerciseView key={ex.id} ex={ex} lang={lang}
                    onVoiceSubmit={async ({ rubric, withSupport }) => {
                      if (!user) return;
                      try {
                        await saveAttempt({
                          userId: user.id, courseCode: code, canDoKey: course.canDo.key, lessonId: lesson.id, exerciseId: ex.id,
                          withSupport, newSituation: ex.type === "VoiceAnswer" && !!ex.newSituation, rubric,
                        });
                      } catch { toast.error(T[lang].err); throw new Error("save"); }
                    }} />
                ))}
              </section>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
