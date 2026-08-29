import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, SectionHeader, EmptyState } from "./_ui";
import { Play, CheckCircle2, XCircle, Loader2, BookOpen, RotateCcw, Settings2, Eye } from "lucide-react";
import CoursePreview, { PreviewLesson } from "../components/CoursePreview";
import { toast } from "@/hooks/use-toast";
import { useAdminLang } from "../LanguageContext";

interface Course {
  id: string;
  title: string;
  level: string | null;
  target_language: string | null;
  total_lessons: number | null;
}

type BatchStatus = "pending" | "running" | "done" | "error";
interface Batch { start: number; topics: string[]; status: BatchStatus; message?: string; }

/** Стандартні теми — можна повністю замінити своїми */
const DEFAULT_TOPICS: Record<string, string[]> = {
  A1: ["Begrüßung und Vorstellung","Zahlen und Alphabet","Familie und Freunde","Farben und Formen","Essen und Trinken","Tagesablauf","Wetter","Kleidung","Wohnung und Haus","Wegbeschreibung"],
  A2: ["Reisen und Urlaub","Wohnungssuche","Vorstellungsgespräch","Medien und Internet","Kochen und Rezepte","Sport und Fitness","Bank und Geld","Auf der Post","Auf dem Markt","Nachbarn und Zusammenleben"],
  B1: ["Nachrichten und Medien","Arbeitsleben","Gesundheitssystem","Umwelt und Klima","Migration und Integration","Bildungssystem","Wirtschaft","Politik Grundlagen","Soziale Medien","Recht und Gesetze"],
  B2: ["Wissenschaftliches Schreiben","Debatte und Argumentation","Medienanalyse","Wirtschaft vertieft","Politischer Diskurs","Rechtssprache","Medizinisches Deutsch","Technisches Deutsch","Geschäftskommunikation","Forschungsmethoden"],
  C1: ["Rhetorik","Linguistik","Grammatik-Feinheiten","Idiomatische Ausdrücke","Regionale Dialekte","Akademische Präsentationen","Kritische Analyse","Diskursanalyse","Pragmatik","Soziolinguistik"],
};

const META_LANGS = [
  { code: "uk", label: "Українська" },
  { code: "ru", label: "Російська" },
  { code: "en", label: "Англійська" },
];

export default function CourseBuilderPage() {
  const { lang, meta, isAll } = useAdminLang();
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [running, setRunning] = useState(false);
  const [existingLessons, setExistingLessons] = useState(0);

  // ── налаштування генерації (зберігаються локально під кожен курс)
  const [topicsText, setTopicsText] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [metaLanguage, setMetaLanguage] = useState("uk");
  const [batchSize, setBatchSize] = useState(2);
  const [startFrom, setStartFrom] = useState(0);

  // ── попередній перегляд
  const [previewing, setPreviewing] = useState(false);
  const [previewLessons, setPreviewLessons] = useState<PreviewLesson[] | null>(null);
  const [previewFailed, setPreviewFailed] = useState<{ topic: string; reason: string }[]>([]);
  const [savingPreview, setSavingPreview] = useState(false);

  const selected = courses.find((c) => c.id === selectedId);
  const topics = topicsText.split("\n").map((t) => t.trim()).filter(Boolean);

  const loadCourses = async () => {
    const base = supabase
      .from("courses")
      .select("id,title,level,target_language,total_lessons");
    const { data } =
      lang && lang !== "all"
        ? await base.eq("target_language", lang).order("created_at", { ascending: false })
        : await base.order("created_at", { ascending: false });
    setCourses((data as any) || []);
  };

  const loadLessonCount = async (courseId: string) => {
    const { count } = await supabase
      .from("course_lessons")
      .select("*", { count: "exact", head: true })
      .eq("course_id", courseId);
    setExistingLessons(count || 0);
    setStartFrom(count || 0);
  };

  useEffect(() => { loadCourses(); }, [lang]);

  useEffect(() => {
    const h = (e: any) => setSelectedId(e.detail?.courseId);
    window.addEventListener("admin-v2:open-builder", h);
    return () => window.removeEventListener("admin-v2:open-builder", h);
  }, []);

  // Підтягуємо збережені налаштування або дефолтні теми рівня
  useEffect(() => {
    if (!selectedId) return;
    loadLessonCount(selectedId);
    const course = courses.find((c) => c.id === selectedId);
    const saved = localStorage.getItem(`klar-builder-${selectedId}`);
    if (saved) {
      try {
        const s = JSON.parse(saved);
        setTopicsText(s.topicsText ?? "");
        setCustomPrompt(s.customPrompt ?? "");
        setMetaLanguage(s.metaLanguage ?? "uk");
        setBatchSize(s.batchSize ?? 2);
        return;
      } catch {}
    }
    setTopicsText((DEFAULT_TOPICS[course?.level || "A1"] || []).join("\n"));
    setCustomPrompt("");
    setMetaLanguage("uk");
    setBatchSize(2);
  }, [selectedId, courses.length]);

  const saveSettings = () => {
    if (!selectedId) return;
    localStorage.setItem(
      `klar-builder-${selectedId}`,
      JSON.stringify({ topicsText, customPrompt, metaLanguage, batchSize })
    );
    toast({ title: "Налаштування збережено" });
  };

  const buildBatches = (list: string[]): Batch[] => {
    const arr: Batch[] = [];
    for (let i = 0; i < list.length; i += batchSize) {
      arr.push({ start: startFrom + i, topics: list.slice(i, i + batchSize), status: "pending" });
    }
    return arr;
  };

  const runBatch = async (b: Batch) => {
    if (!selected) return false;
    setBatches((prev) => prev.map((x) => x.start === b.start ? { ...x, status: "running", message: undefined } : x));
    try {
      const { data, error } = await supabase.functions.invoke("generate-full-course", {
        body: {
          courseId: selected.id,
          level: selected.level || "A1",
          batchStart: b.start,
          batchSize: b.topics.length,
          topics: b.topics,
          customPrompt: customPrompt || undefined,
          targetLanguage: selected.target_language || "de",
          metaLanguage,
        },
      });
      if (error || (data as any)?.error) throw new Error(error?.message || (data as any).error);
      const failed = (data as any).failed?.length || 0;
      setBatches((prev) => prev.map((x) => x.start === b.start
        ? {
            ...x,
            status: failed ? "error" : "done",
            message: failed
              ? `${(data as any).lessonsGenerated} ок, ${failed} не вдалось`
              : `${(data as any).lessonsGenerated} уроків`,
          }
        : x));
      return !failed;
    } catch (e: any) {
      setBatches((prev) => prev.map((x) => x.start === b.start
        ? { ...x, status: "error", message: e.message } : x));
      return false;
    }
  };

  const runGeneration = async () => {
    if (!selected) return;
    if (topics.length === 0) {
      toast({ title: "Додай хоча б одну тему уроку" });
      return;
    }
    const list = buildBatches(topics);
    setBatches(list);
    setRunning(true);
    for (const b of list) await runBatch(b);
    setRunning(false);
    await loadLessonCount(selected.id);
    await loadCourses();
    toast({ title: "Генерацію завершено" });
  };

  const runPreview = async () => {
    if (!selected) return;
    if (topics.length === 0) {
      toast({ title: "Додай хоча б одну тему уроку" });
      return;
    }
    setPreviewing(true);
    setPreviewFailed([]);
    const collected: PreviewLesson[] = [];
    const problems: { topic: string; reason: string }[] = [];
    try {
      for (const b of buildBatches(topics)) {
        const { data, error } = await supabase.functions.invoke("generate-full-course", {
          body: {
            courseId: selected.id,
            level: selected.level || "A1",
            batchStart: b.start,
            batchSize: b.topics.length,
            topics: b.topics,
            customPrompt: customPrompt || undefined,
            targetLanguage: selected.target_language || "de",
            metaLanguage,
            preview: true,
          },
        });
        if (error || (data as any)?.error) {
          problems.push({ topic: b.topics.join(", "), reason: error?.message || (data as any)?.error });
          continue;
        }
        collected.push(...(((data as any).lessons || []) as PreviewLesson[]));
        problems.push(...(((data as any).failed || []) as any[]));
      }
    } finally {
      setPreviewing(false);
    }
    if (collected.length === 0) {
      toast({ title: "AI не створив жодного уроку", description: problems[0]?.reason || "", variant: "destructive" });
      return;
    }
    setPreviewFailed(problems);
    setPreviewLessons(collected);
  };

  const savePreview = async (list: PreviewLesson[]) => {
    if (!selected) return;
    setSavingPreview(true);
    const { data, error } = await supabase.functions.invoke("generate-full-course", {
      body: { courseId: selected.id, lessons: list, batchStart: startFrom },
    });
    setSavingPreview(false);
    if (error || (data as any)?.error) {
      toast({ title: "Не вдалося зберегти", description: String((data as any)?.error || error?.message || ""), variant: "destructive" });
      return;
    }
    setPreviewLessons(null);
    await loadLessonCount(selected.id);
    await loadCourses();
    toast({ title: `Збережено ${(data as any).saved} уроків` });
  };

  const retryFailed = async () => {
    const bad = batches.filter((b) => b.status === "error");
    if (bad.length === 0) return;
    setRunning(true);
    for (const b of bad) await runBatch(b);
    setRunning(false);
    if (selected) await loadLessonCount(selected.id);
  };

  const doneCount = batches.filter((b) => b.status === "done").length;
  const errorCount = batches.filter((b) => b.status === "error").length;
  const progress = batches.length ? (doneCount / batches.length) * 100 : 0;


  if (!selectedId) {
    return (
      <div className="space-y-6">
        <SectionHeader
          title={`AI Course Builder · ${meta.flag} ${meta.label}`}
          subtitle={isAll ? "Обери курс — AI згенерує повний контент (усі мови)" : `Курси для мови: ${meta.label}`}
        />
        {courses.length === 0 ? (
          <EmptyState title="Немає курсів" description="Спочатку створи курс у вкладці Courses." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((c) => (
              <button key={c.id} onClick={() => setSelectedId(c.id)}
                className="text-left">
                <Card className="p-5 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                      style={{ background: "linear-gradient(135deg,#4F46E5,#7C3AED)" }}>
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{ background: "#FEF3C7", color: "#92400E" }}>{c.level}</span>
                        <span className="text-[10px] text-slate-500">{c.total_lessons || 0} уроків</span>
                      </div>
                      <h3 className="mt-2 font-semibold text-slate-900 truncate">{c.title}</h3>
                    </div>
                  </div>
                </Card>
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <SectionHeader
        title={selected?.title || "Course"}
        subtitle={`Рівень ${selected?.level} • ${existingLessons} існуючих уроків`}
        action={
          <button onClick={() => setSelectedId(null)}
            className="px-3 py-1.5 rounded-lg text-sm text-slate-600 hover:bg-slate-100">
            ← До списку
          </button>
        }
      />

      <Card className="p-6 space-y-5">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white shrink-0"
            style={{ background: "linear-gradient(135deg,#4F46E5,#7C3AED)" }}>
            <Settings2 className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-900">Налаштування генератора</h3>
            <p className="text-sm text-slate-500 mt-1">
              Теми уроків і твій власний промпт — саме за ними AI будує курс. Один урок = один запит до AI (щоб не обривався JSON).
            </p>
          </div>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Твій промпт (ціль курсу, стиль, правила) — головний пріоритет для AI
          </label>
          <textarea
            value={customPrompt}
            onChange={(e) => setCustomPrompt(e.target.value)}
            placeholder={"Напр.: курс для дорослих, які переїжджають до Німеччини. Пояснення українською, багато розмовних фраз, мінімум теорії, у кожному уроці 3 діалоги з побуту, гумор і приклади з життя."}
            className="mt-2 w-full min-h-[110px] px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">
            Теми уроків — по одній на рядок ({topics.length})
          </label>
          <textarea
            value={topicsText}
            onChange={(e) => setTopicsText(e.target.value)}
            className="mt-2 w-full min-h-[160px] px-3 py-2 rounded-xl border border-slate-200 text-sm font-mono"
          />
          <button
            onClick={() => setTopicsText((DEFAULT_TOPICS[selected?.level || "A1"] || []).join("\n"))}
            className="mt-2 text-xs text-indigo-600 hover:underline"
          >
            Підставити стандартні теми рівня {selected?.level}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Мова пояснень</label>
            <select
              value={metaLanguage}
              onChange={(e) => setMetaLanguage(e.target.value)}
              className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            >
              {META_LANGS.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Уроків за один запуск батчу</label>
            <select
              value={batchSize}
              onChange={(e) => setBatchSize(Number(e.target.value))}
              className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            >
              {[1, 2, 3, 5].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Нумерація з уроку №</label>
            <input
              type="number"
              min={0}
              value={startFrom}
              onChange={(e) => setStartFrom(Math.max(0, Number(e.target.value)))}
              className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>
        </div>

        {existingLessons > 0 && (
          <p className="text-xs text-amber-600">
            ⚠️ У курсі вже {existingLessons} уроків — нові додаються після них.
          </p>
        )}

        <div className="flex flex-wrap gap-2">
          <button
            onClick={runGeneration}
            disabled={running}
            className="px-4 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50"
            style={{ background: "#4F46E5" }}>
            {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {running ? "Генерація..." : `Згенерувати ${topics.length} уроків`}
          </button>
          <button
            onClick={runPreview}
            disabled={running || previewing}
            className="px-4 py-2 rounded-xl text-sm font-medium border border-indigo-200 text-indigo-600 hover:bg-indigo-50 flex items-center gap-2 disabled:opacity-50">
            {previewing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            {previewing ? "Генеруємо перегляд..." : "Попередній перегляд"}
          </button>
          <button
            onClick={saveSettings}
            className="px-4 py-2 rounded-xl text-sm border border-slate-200 hover:bg-slate-50">
            Зберегти налаштування
          </button>
          {errorCount > 0 && !running && (
            <button
              onClick={retryFailed}
              className="px-4 py-2 rounded-xl text-sm border border-red-200 text-red-600 hover:bg-red-50 flex items-center gap-2">
              <RotateCcw className="w-4 h-4" /> Повторити невдалі ({errorCount})
            </button>
          )}
        </div>
      </Card>

      {previewLessons && (
        <CoursePreview
          lessons={previewLessons}
          courseTitle={selected?.title || "Курс"}
          failed={previewFailed}
          saving={savingPreview}
          onSave={savePreview}
          onClose={() => setPreviewLessons(null)}
        />
      )}

      <Card className="p-6">
        <SectionHeader title="Що саме створюється" subtitle="Огляд AI-контенту та ручних елементів" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          {[
            { icon: "📖", title: "Теорія (8–15 блоків)", desc: "Gemini 2.5 Flash → generate-full-course. Markdown + правила, приклади, таблиці відмінків, підказки.", who: "AI" },
            { icon: "📚", title: "Словник (10–15 слів)", desc: "DE + переклад RU/UA, артикль, приклад речення. Догенерація через generate-lesson-section.", who: "AI" },
            { icon: "✏️", title: "Вправи (6–8 шт)", desc: "Fill-in-blank, вибір з варіантів, порядок слів, переклад. Fuzzy matching ~15%.", who: "AI" },
            { icon: "📝", title: "Граматика (квіз)", desc: "Питання з 4 варіантами + пояснення. Прив'язана до теми уроку.", who: "AI" },
            { icon: "📕", title: "Читання", desc: "Короткий текст рівня + питання на розуміння з поясненнями.", who: "AI" },
            { icon: "💬", title: "Діалог для практики", desc: "A↔B репліки трьома мовами (DE/RU/UA) для говоріння та рольових ігор.", who: "AI" },
            { icon: "🌍", title: "Культурні нотатки", desc: "Факти про німецькомовні країни, локалізовані RU/UA.", who: "AI" },
            { icon: "🎬", title: "Відео-теорія", desc: "YouTube / Vimeo / MP4 + субтитри. Додаєш вручну в редакторі уроку.", who: "Ти" },
            { icon: "🤖", title: "AI-тьютор в уроці", desc: "Окремий тип уроку 'ai_tutor' — учень веде діалог. Логи → analyze-lesson-dialogue.", who: "AI" },
            { icon: "🏆", title: "Іспит + сертифікат", desc: "Тип 'exam'. При >70% видається сертифікат через issue_certificate.", who: "AI/Auto" },
          ].map((r) => (
            <div key={r.title} className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex gap-3">
              <div className="text-2xl leading-none">{r.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900 text-sm">{r.title}</span>
                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${r.who === "Ти" ? "bg-amber-100 text-amber-700" : "bg-indigo-100 text-indigo-700"}`}>{r.who}</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{r.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 rounded-xl bg-indigo-50 border border-indigo-100 text-xs text-indigo-900">
          <b>Двигун:</b> Gemini 2.5 Flash через Lovable AI Gateway. <b>Мова уроку:</b> залежить від target_language курсу. <b>Батчі:</b> 5 уроків × 5 запитів = стабільний rate-limit.
        </div>
      </Card>

      {batches.length > 0 && (
        <Card className="p-6">
          <SectionHeader title="Прогрес" subtitle={`${doneCount} / ${batches.length} батчів`} />
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-4">
            <div className="h-full transition-all" style={{ width: `${progress}%`, background: "#4F46E5" }} />
          </div>
          <div className="space-y-2">
            {batches.map((b) => (
              <div key={b.start} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-slate-50">
                <div className="w-5 h-5 shrink-0">
                  {b.status === "done" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                  {b.status === "error" && <XCircle className="w-5 h-5 text-red-500" />}
                  {b.status === "running" && <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />}
                  {b.status === "pending" && <div className="w-3 h-3 mt-1 ml-1 rounded-full bg-slate-300" />}
                </div>
                <div className="flex-1 text-sm">
                  <span className="text-slate-700 font-medium">
                    Уроки {b.start + 1}—{b.start + b.topics.length}
                  </span>
                  {b.message && (
                    <span className={`ml-2 text-xs ${b.status === "error" ? "text-red-500" : "text-slate-500"}`}>
                      {b.message}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
