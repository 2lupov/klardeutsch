import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, SectionHeader } from "./_ui";
import { Camera, Loader2, Sparkles, Trash2, BookOpen, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAdminLang } from "../LanguageContext";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const MAX_PHOTOS = 12;

interface Photo {
  id: string;
  file: File;
  preview: string;
  dataUrl: string;
}

interface CourseOpt {
  id: string;
  title: string;
  level: string | null;
}

/** Downscale a photo so the AI request stays small and fast. */
const compress = (file: File): Promise<{ dataUrl: string; blob: Blob }> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1400;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("canvas"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.82);
        canvas.toBlob(
          (blob) => (blob ? resolve({ dataUrl, blob }) : reject(new Error("blob"))),
          "image/jpeg",
          0.82
        );
      };
      img.onerror = () => reject(new Error("image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("reader"));
    reader.readAsDataURL(file);
  });

export default function BookCoursePage() {
  const { lang } = useAdminLang();
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [level, setLevel] = useState("A1");
  const [lessonCount, setLessonCount] = useState(3);
  const [hint, setHint] = useState("");
  const [price, setPrice] = useState(0);
  const [courseId, setCourseId] = useState<string>("");
  const [courses, setCourses] = useState<CourseOpt[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ courseId: string; title: string | null; lessons: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      const base = supabase.from("courses").select("id,title,level");
      const { data } =
        lang && lang !== "all"
          ? await base.eq("target_language", lang).order("created_at", { ascending: false })
          : await base.order("created_at", { ascending: false });
      setCourses((data as any) || []);
    };
    load();
  }, [lang]);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_PHOTOS - photos.length;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, room);
    if (list.length === 0) {
      toast({ title: `Максимум ${MAX_PHOTOS} фото` });
      return;
    }
    setBusy("Обробляю фото...");
    try {
      const prepared: Photo[] = [];
      for (const file of list) {
        const { dataUrl } = await compress(file);
        prepared.push({ id: crypto.randomUUID(), file, preview: dataUrl, dataUrl });
      }
      setPhotos((p) => [...p, ...prepared]);
    } catch {
      toast({ title: "Не вдалося прочитати фото" });
    } finally {
      setBusy(null);
    }
  };

  const generate = async () => {
    if (photos.length === 0) {
      toast({ title: "Додай хоча б одне фото сторінки" });
      return;
    }
    setResult(null);
    try {
      // 1. Upload the page photos so they can be shown inside the lessons
      setBusy("Завантажую фото у сховище...");
      const folder = `book-${Date.now()}`;
      const paths: string[] = [];
      for (let i = 0; i < photos.length; i++) {
        const { blob } = await compress(photos[i].file);
        const path = `${folder}/page-${i + 1}.jpg`;
        const { error } = await supabase.storage
          .from("course-images")
          .upload(path, blob, { contentType: "image/jpeg", upsert: true });
        if (error) throw new Error("Сховище: " + error.message);
        paths.push(path);
      }

      // 2. Let the AI build the course from the pages
      setBusy("AI читає книгу і будує курс...");
      const { data, error } = await supabase.functions.invoke("generate-course-from-book", {
        body: {
          images: photos.map((p) => p.dataUrl),
          paths,
          level,
          lessonCount,
          hint,
          price,
          targetLanguage: lang && lang !== "all" ? lang : "de",
          courseId: courseId || undefined,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      setResult({
        courseId: (data as any).courseId,
        title: (data as any).courseTitle,
        lessons: (data as any).lessons || [],
      });
      toast({ title: `Готово — ${(data as any).lessonsCreated} уроків` });
    } catch (e: any) {
      toast({ title: "Помилка", description: e.message });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Курс із книги (фото)"
        subtitle="Завантаж фото сторінок енциклопедії чи підручника — AI зробить курс під ключ: теорія з картинками, словник, вправи й тести"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              addFiles(e.dataTransfer.files);
            }}
            onClick={() => inputRef.current?.click()}
            className="cursor-pointer rounded-xl border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/40 transition-colors p-6 text-center"
          >
            <Camera className="w-7 h-7 mx-auto text-slate-400" />
            <p className="mt-2 text-sm font-medium text-slate-700">Перетягни фото сторінок або натисни</p>
            <p className="text-xs text-slate-500 mt-1">JPG / PNG, до {MAX_PHOTOS} фото</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>

          {photos.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {photos.map((p, i) => (
                <div key={p.id} className="relative group rounded-lg overflow-hidden border border-slate-200">
                  <img src={p.preview} alt={`Сторінка ${i + 1}`} className="w-full h-20 object-cover" />
                  <button
                    onClick={() => setPhotos((list) => list.filter((x) => x.id !== p.id))}
                    className="absolute top-1 right-1 p-1 rounded-md bg-white/90 text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <span className="absolute bottom-1 left-1 text-[10px] px-1.5 rounded bg-black/60 text-white">
                    {i + 1}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Рівень</label>
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              >
                {LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Кількість уроків</label>
              <select
                value={lessonCount}
                onChange={(e) => setLessonCount(Number(e.target.value))}
                className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              >
                {[1, 2, 3, 4, 5, 6, 8].map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Додати до курсу</label>
            <select
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
              className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            >
              <option value="">➕ Створити новий курс</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.title} ({c.level})</option>
              ))}
            </select>
          </div>

          {!courseId && (
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Ціна, ₴</label>
              <input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Побажання до курсу</label>
            <textarea
              value={hint}
              onChange={(e) => setHint(e.target.value)}
              placeholder="Напр.: зроби акцент на лексиці про тварин, додай більше тестів"
              className="mt-2 w-full min-h-[80px] px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>

          <button
            onClick={generate}
            disabled={!!busy}
            className="w-full px-4 py-2.5 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "#4F46E5" }}
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {busy || "Створити курс із фото"}
          </button>
        </Card>

        <Card className="p-5 space-y-4">
          <SectionHeader title="Результат" subtitle="Курс з'явиться у розділі «Курси» (спочатку прихований)" />
          {!result ? (
            <div className="h-[300px] rounded-xl bg-slate-50 flex items-center justify-center text-sm text-slate-400 text-center px-6">
              Додай фото сторінок і натисни «Створити курс із фото»
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium text-emerald-700">
                <CheckCircle2 className="w-4 h-4" /> {result.title || "Курс створено"}
              </div>
              <ul className="space-y-1.5">
                {result.lessons.map((t, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-slate-700">
                    <BookOpen className="w-4 h-4 mt-0.5 text-indigo-500 shrink-0" />
                    {t}
                  </li>
                ))}
              </ul>
              <button
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("admin-v2:open-builder", { detail: { courseId: result.courseId } })
                  )
                }
                className="px-3 py-2 rounded-lg text-sm border border-slate-200 hover:bg-slate-50"
              >
                Відкрити в конструкторі →
              </button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
