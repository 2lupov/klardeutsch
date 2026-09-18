import { useEffect, useState } from "react";
import { Loader2, Sparkles, X, UserPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import StudentBlocks from "@/components/blocks/StudentBlocks";
import { kitBlocksToLessonBlocks } from "@/lib/lesson-kits";
import { listAssignableStudents, type AssignableStudent } from "@/lib/kit-from-book";
import { assignMiniCourse, createMiniCourseFromPresentation, type MiniCourse } from "@/lib/minicourse";
import type { Presentation } from "@/lib/presentations";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

interface Props {
  presentation: Presentation;
  onClose: () => void;
}

/** Модалка: презентація → мінікурс із темами → видача учню. */
export default function MiniCourseBuilder({ presentation, onClose }: Props) {
  const { user } = useAuth();
  const [level, setLevel] = useState("B1");
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(Math.min(presentation.page_count, 12));
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [course, setCourse] = useState<MiniCourse | null>(null);
  const [active, setActive] = useState(0);
  const [students, setStudents] = useState<AssignableStudent[]>([]);
  const [given, setGiven] = useState<string[]>([]);

  useEffect(() => {
    listAssignableStudents().then(setStudents).catch(() => {});
  }, []);

  const generate = async () => {
    setBusy("ШІ читає слайди й ділить на теми…");
    try {
      const c = await createMiniCourseFromPresentation({
        presentationId: presentation.id,
        title: presentation.title,
        level,
        from,
        to,
        notes,
      });
      setCourse(c);
      setActive(0);
      toast.success(`Готово: ${c.sections.length} тем 🐼`);
    } catch (e: any) {
      toast.error(e.message ?? "Не вдалося зробити курс");
    } finally {
      setBusy(null);
    }
  };

  const give = async (studentId: string) => {
    if (!user || !course) return;
    try {
      await assignMiniCourse(user.id, course, studentId);
      setGiven((s) => [...s, studentId]);
      toast.success("Курс у акаунті учня 🎉");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const section = course?.sections[active];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 p-3 overflow-y-auto">
      <div className="w-full max-w-4xl my-6 rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-display font-black flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" /> Мінікурс із презентації
            </h2>
            <p className="text-xs text-muted-foreground mt-1">{presentation.title} · {presentation.page_count} слайд(ів)</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-muted">
            <X className="w-4 h-4" />
          </button>
        </div>

        {!course && (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="text-xs font-bold space-y-1 block">
                Слайди з
                <input
                  type="number"
                  min={1}
                  max={presentation.page_count}
                  value={from}
                  onChange={(e) => setFrom(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-bold space-y-1 block">
                до
                <input
                  type="number"
                  min={1}
                  max={presentation.page_count}
                  value={to}
                  onChange={(e) => setTo(Number(e.target.value))}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
                />
              </label>
              <div className="text-xs font-bold space-y-1">
                Рівень
                <div className="flex flex-wrap gap-1.5">
                  {LEVELS.map((l) => (
                    <button
                      key={l}
                      onClick={() => setLevel(l)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-bold ${
                        level === l ? "border-primary bg-primary/10 text-primary" : "border-border"
                      }`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <label className="text-xs font-bold space-y-1 block">
              Побажання (необовʼязково)
              <textarea
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Напр.: більше завдань на Genitiv, простіші приклади"
                className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-normal"
              />
            </label>
            <button
              onClick={generate}
              disabled={!!busy}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {busy || "Створити мінікурс"}
            </button>
          </div>
        )}

        {course && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {course.sections.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setActive(i)}
                  className={`px-3 py-2 rounded-xl border text-xs font-bold ${
                    i === active ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/40"
                  }`}
                >
                  <span className="mr-1">{s.emoji}</span>
                  {s.title}
                </button>
              ))}
            </div>

            {section && (
              <div className="rounded-2xl border border-border bg-background p-3 max-h-[50vh] overflow-y-auto">
                {section.summary && <p className="mb-3 text-xs text-muted-foreground">{section.summary}</p>}
                <StudentBlocks
                  blocks={kitBlocksToLessonBlocks(section.blocks, `pv-${section.id}`)}
                  persist={false}
                  readOnly
                  showActions={false}
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="text-xs font-bold flex items-center gap-1.5">
                <UserPlus className="w-3.5 h-3.5" /> Додати курс учню в акаунт
              </div>
              <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                {students.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => give(s.id)}
                    className={`px-3 py-1.5 rounded-lg border text-xs font-bold ${
                      given.includes(s.id) ? "border-emerald-500 text-emerald-600" : "border-border hover:border-primary/50"
                    }`}
                  >
                    {given.includes(s.id) && <Check className="w-3 h-3 inline mr-1" />}
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
