import { useEffect, useRef, useState } from "react";
import { Loader2, Upload, Trash2, Pencil, Presentation as PresIcon, ChevronLeft, ChevronRight, Eye, Sparkles, UserPlus, Check } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  listPresentations,
  uploadPresentation,
  deletePresentation,
  renamePresentation,
  slideUrls,
  type Presentation,
} from "@/lib/presentations";
import MiniCourseBuilder from "@/components/minicourse/MiniCourseBuilder";
import { assignMiniCourse, listMiniCourses, type MiniCourse } from "@/lib/minicourse";
import { listAssignableStudents, type AssignableStudent } from "@/lib/kit-from-book";

export default function PresentationsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Presentation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ p: Presentation; urls: string[]; page: number } | null>(null);
  const [courseFor, setCourseFor] = useState<Presentation | null>(null);
  const [courses, setCourses] = useState<MiniCourse[]>([]);
  const [students, setStudents] = useState<AssignableStudent[]>([]);
  const [giveFor, setGiveFor] = useState<string | null>(null);
  const [given, setGiven] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const loadCourses = () => listMiniCourses().then(setCourses).catch(() => {});


  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setItems(await listPresentations());
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    loadCourses();
    listAssignableStudents().then(setStudents).catch(() => {});
  }, []);

  const giveCourse = async (course: MiniCourse, studentId: string) => {
    if (!user) return;
    try {
      await assignMiniCourse(user.id, course, studentId);
      setGiven((s) => [...s, `${course.id}:${studentId}`]);
      toast.success("Курс у акаунті учня 🎉");
    } catch (e: any) {
      toast.error(e.message);
    }
  };


  const onFiles = async (files: FileList | null) => {
    if (!files?.length || !user) return;
    for (const file of Array.from(files)) {
      if (!/\.pdf$/i.test(file.name)) {
        toast.error(`${file.name}: підтримуємо PDF. Збережіть презентацію як PDF.`);
        continue;
      }
      try {
        setBusy("Готуємо слайди…");
        await uploadPresentation({
          ownerId: user.id,
          file,
          onProgress: (t) => setBusy(t),
        });
        toast.success(`${file.name} — додано 🐼`);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setBusy(null);
      }
    }
    load(true);
  };

  const openPreview = async (p: Presentation) => {
    try {
      const urls = await slideUrls(p.slide_paths);
      setPreview({ p, urls, page: 1 });
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-display font-black flex items-center gap-2">
            <PresIcon className="w-6 h-6 text-primary" /> Презентації
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Завантажуйте презентації у <strong>PDF</strong> — вони одразу доступні на живому уроці й показуються учню слайд за слайдом.
            Якщо у вас PowerPoint, збережіть його як PDF («Файл → Зберегти як → PDF»).
          </p>
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="application/pdf"
            multiple
            className="hidden"
            onChange={(e) => onFiles(e.target.files)}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={!!busy}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {busy || "Додати презентацію (PDF)"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Поки що немає презентацій. Додайте перший PDF — і показуйте його прямо на уроці.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {items.map((p) => (
            <div key={p.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
              <div className="font-bold leading-snug">{p.title}</div>
              <div className="text-xs text-muted-foreground">
                {p.page_count} слайд(ів) · {new Date(p.created_at).toLocaleDateString("uk-UA")}
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setCourseFor(p)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold"
                >
                  <Sparkles className="w-3.5 h-3.5" /> Зробити мінікурс (ШІ)
                </button>
                <button
                  onClick={() => openPreview(p)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-bold hover:border-primary/50"
                >
                  <Eye className="w-3.5 h-3.5" /> Подивитись
                </button>

                <button
                  onClick={async () => {
                    const title = window.prompt("Нова назва", p.title);
                    if (!title?.trim()) return;
                    await renamePresentation(p.id, title.trim());
                    load(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-bold hover:border-primary/50"
                >
                  <Pencil className="w-3.5 h-3.5" /> Перейменувати
                </button>
                <button
                  onClick={async () => {
                    if (!window.confirm(`Видалити «${p.title}»?`)) return;
                    await deletePresentation(p);
                    toast.success("Видалено");
                    load(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive text-xs font-bold hover:bg-destructive/5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Видалити
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {preview && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreview(null)}
        >
          <div className="max-w-5xl w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <img
              src={preview.urls[preview.page - 1]}
              alt={`Слайд ${preview.page}`}
              className="w-full rounded-xl bg-white"
            />
            <div className="flex items-center justify-center gap-3 text-white">
              <button
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
                onClick={() => setPreview((s) => (s ? { ...s, page: Math.max(1, s.page - 1) } : s))}
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div className="text-sm font-bold">
                {preview.page} / {preview.urls.length}
              </div>
              <button
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20"
                onClick={() =>
                  setPreview((s) => (s ? { ...s, page: Math.min(s.urls.length, s.page + 1) } : s))
                }
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
