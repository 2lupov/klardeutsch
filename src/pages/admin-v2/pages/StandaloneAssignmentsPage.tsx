import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, SectionHeader, EmptyState } from "./_ui";
import {
  Plus, X, Sparkles, Loader2, Trash2, Check, Search, CalendarDays, Award,
  BookOpen, PenLine, Mic, Puzzle, Headphones, Volume2, ClipboardList,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

/* ─────────── types ─────────── */

type ModuleKind = "reading" | "writing" | "speaking" | "grammar" | "listening";

interface TestQuestion {
  format?: "choice" | "gap";
  question: string;
  options?: string[];
  correct_index?: number;
  answer?: string;
  explanation?: string;
}

interface TaskModule {
  kind: ModuleKind;
  title?: string;
  text?: string;          // reading
  script?: string;        // listening (Hörtext)
  audio_path?: string;    // listening (ElevenLabs)
  audio_url?: string;     // teacher preview
  questions?: TestQuestion[];
  topic?: string;         // writing / speaking
  criteria?: string[];    // writing
  min_words?: number;     // writing
}

interface Assignment {
  id: string;
  student_id: string;
  title: string;
  instructions: string | null;
  payload: any;
  level: string | null;
  due_at: string | null;
  status: "assigned" | "in_progress" | "submitted" | "graded";
  created_at: string;
}

interface Submission {
  id: string;
  assignment_id: string;
  answers: any;
  text: string | null;
  audio_path: string | null;
  auto_score: number | null;
  ai_feedback: string | null;
  grade: number | null;
  teacher_feedback: string | null;
  submitted_at: string;
}

interface StudentRow {
  user_id: string;
  display_name: string | null;
  email: string | null;
}

/* ─────────── meta ─────────── */

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

const MODULES: { kind: ModuleKind; label: string; icon: any; hint: string; countable: boolean }[] = [
  { kind: "reading", label: "📖 Читання (Lesen)", icon: BookOpen, hint: "Текст + питання", countable: true },
  { kind: "listening", label: "🎧 Аудіювання (Hören)", icon: Headphones, hint: "Hörtext + ElevenLabs аудіо", countable: true },
  { kind: "grammar", label: "🧩 Граматика / лексика", icon: Puzzle, hint: "Тести та пропуски", countable: true },
  { kind: "writing", label: "✍️ Письмо (Schreiben)", icon: PenLine, hint: "Тема + критерії", countable: false },
  { kind: "speaking", label: "🗣 Говоріння (Sprechen)", icon: Mic, hint: "Аудіо-монолог учня", countable: true },
];

const MODULE_LABEL: Record<ModuleKind, string> = {
  reading: "📖 Читання",
  listening: "🎧 Аудіювання",
  grammar: "🧩 Граматика",
  writing: "✍️ Письмо",
  speaking: "🗣 Говоріння",
};

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  assigned: { label: "Нове", bg: "#E0E7FF", color: "#3730A3" },
  in_progress: { label: "В процесі", bg: "#FEF3C7", color: "#92400E" },
  submitted: { label: "Здано", bg: "#FFEDD5", color: "#9A3412" },
  graded: { label: "Перевірено", bg: "#D1FAE5", color: "#065F46" },
};

type CategoryKey = "test" | "homework" | "reading" | "course";

const CATEGORIES: { key: CategoryKey; label: string; bg: string; color: string }[] = [
  { key: "test", label: "📝 Тест", bg: "#EDE9FE", color: "#5B21B6" },
  { key: "homework", label: "🏠 Домашка", bg: "#FEF3C7", color: "#92400E" },
  { key: "reading", label: "📖 Читання", bg: "#DBEAFE", color: "#1E40AF" },
  { key: "course", label: "🎓 Курси", bg: "#D1FAE5", color: "#065F46" },
];

const catOf = (a?: { payload?: any } | null): CategoryKey => {
  const c = a?.payload?.category;
  return CATEGORIES.some((x) => x.key === c) ? c : "test";
};

const inputCls = "w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white";


/* ─────────── page ─────────── */

export default function StandaloneAssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subs, setSubs] = useState<Record<string, Submission>>({});
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);
  const [review, setReview] = useState<Assignment | null>(null);


  const load = async () => {
    const [{ data: a }, { data: s }, { data: st }] = await Promise.all([
      supabase
        .from("student_assignments")
        .select("*")
        .eq("type", "modular")
        .order("created_at", { ascending: false }),
      supabase.from("student_submissions").select("*").order("submitted_at", { ascending: false }),
      supabase.rpc("get_admin_users"),
    ]);
    setAssignments((a as any) || []);
    const map: Record<string, Submission> = {};
    ((s as any) || []).forEach((row: Submission) => {
      if (!map[row.assignment_id]) map[row.assignment_id] = row;
    });
    setSubs(map);
    setStudents(
      ((st as any) || []).map((u: any) => ({
        user_id: u.user_id,
        display_name: u.display_name,
        email: u.email,
      })),
    );
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const nameOf = (id: string) => {
    const s = students.find((x) => x.user_id === id);
    return s?.display_name || s?.email || "Учень";
  };

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    return assignments.filter((a) => {
      if (cat !== "all" && catOf(a) !== cat) return false;
      if (!s) return true;
      return a.title.toLowerCase().includes(s) || nameOf(a.student_id).toLowerCase().includes(s);
    });
  }, [assignments, q, students, cat]);

  const remove = async (id: string) => {
    const { error } = await supabase.from("student_assignments").delete().eq("id", id);
    if (error) toast({ title: "Помилка", description: error.message, variant: "destructive" });
    else {
      setAssignments((list) => list.filter((a) => a.id !== id));
      toast({ title: "Завдання видалено" });
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Індивідуальні завдання та тести"
        subtitle={`Окремо від курсів · Всього: ${assignments.length}`}
        action={
          <button
            onClick={() => setShowNew(true)}
            className="px-4 py-2 rounded-xl text-white text-sm font-medium inline-flex items-center gap-2"
            style={{ background: "#4F46E5" }}
          >
            <Plus className="w-4 h-4" /> Створити
          </button>
        }
      />

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Пошук за назвою або учнем…"
          className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white"
        />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[{ key: "all" as const, label: "Усі" }, ...CATEGORIES].map((c) => {
          const count = c.key === "all" ? assignments.length : assignments.filter((a) => catOf(a) === c.key).length;
          const on = cat === c.key;
          return (
            <button
              key={c.key}
              onClick={() => setCat(c.key as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                on ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {c.label} <span className="opacity-60">{count}</span>
            </button>
          );
        })}
      </div>


      {loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => <Card key={i} className="p-4 animate-pulse h-20"><div /></Card>)}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          title="Ще немає індивідуальних завдань"
          description="Створіть завдання з модулями Lesen / Hören / Schreiben / Sprechen"
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((a) => {
            const sub = subs[a.id];
            const meta = STATUS_META[a.status] ?? STATUS_META.assigned;
            const mods: TaskModule[] = a.payload?.modules ?? [];
            return (
              <Card key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900">📌 {a.title}</h3>
                      <span
                        className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: meta.bg, color: meta.color }}
                      >
                        {meta.label}
                      </span>
                      {a.level && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {a.level}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-1 inline-flex items-center gap-2 flex-wrap">
                      <span>{nameOf(a.student_id)}</span>
                      {a.due_at && (
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" /> до {new Date(a.due_at).toLocaleDateString("uk-UA")}
                        </span>
                      )}
                      {sub?.auto_score != null && (
                        <span className="inline-flex items-center gap-1 text-indigo-600 font-semibold">
                          <Award className="w-3 h-3" /> {sub.auto_score}%
                        </span>
                      )}
                    </p>
                    <div className="flex gap-1.5 mt-2 flex-wrap">
                      {mods.map((m, i) => (
                        <span key={i} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {MODULE_LABEL[m.kind] ?? m.kind}
                          {m.questions?.length ? ` · ${m.questions.length}` : ""}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <button
                      onClick={() => setReview(a)}
                      disabled={!sub}
                      className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    >
                      {sub ? "Перевірити" : "Ще не здано"}
                    </button>
                    <button
                      onClick={() => window.open(`/task/${a.id}?preview=1`, "_blank")}
                      className="px-3 py-2 rounded-xl text-xs font-semibold border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                    >
                      👀 Перегляд
                    </button>
                    <button
                      onClick={() => setEditing(a)}
                      className="px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
                    >
                      ✏️ Редагувати
                    </button>

                    <button
                      onClick={() => remove(a.id)}
                      className="px-3 py-2 rounded-xl text-xs border border-slate-200 text-red-500 hover:bg-red-50 inline-flex justify-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showNew && (
        <BuilderModal
          students={students}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load(); }}
        />
      )}

      {editing && (
        <BuilderModal
          key={editing.id}
          editing={editing}
          students={students}
          onClose={() => setEditing(null)}
          onCreated={() => { setEditing(null); load(); }}
        />
      )}


      {review && subs[review.id] && (
        <ReviewModal
          assignment={review}
          submission={subs[review.id]}
          studentName={nameOf(review.student_id)}
          onClose={() => setReview(null)}
          onSaved={() => { setReview(null); load(); }}
        />
      )}
    </div>
  );
}

/* ─────────── shared bits ─────────── */

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
      <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

/* ─────────── builder ─────────── */

function BuilderModal({
  students, onClose, onCreated, editing, duplicating,
}: {
  students: StudentRow[];
  onClose: () => void;
  onCreated: () => void;
  editing?: Assignment | null;
  duplicating?: Assignment | null;
}) {
  const isEdit = !!editing;
  const src = editing ?? duplicating ?? null;
  const [studentIds, setStudentIds] = useState<string[]>(editing ? [editing.student_id] : []);
  const [title, setTitle] = useState(src ? (duplicating ? `${src.title} (копія)` : src.title) : "");
  const [instructions, setInstructions] = useState(src?.instructions ?? "");
  const [level, setLevel] = useState(src?.level ?? "A1");
  const [category, setCategory] = useState<CategoryKey>(catOf(src));
  const [dueAt, setDueAt] = useState(src?.due_at ? src.due_at.slice(0, 10) : "");

  const [prompt, setPrompt] = useState("");
  const [picked, setPicked] = useState<Record<string, { on: boolean; count: number; topic: string }>>({
    reading: { on: true, count: 4, topic: "" },
    listening: { on: false, count: 4, topic: "" },
    grammar: { on: true, count: 6, topic: "" },
    writing: { on: false, count: 1, topic: "" },
    speaking: { on: false, count: 3, topic: "" },
  });
  const [modules, setModules] = useState<TaskModule[]>(src?.payload?.modules ?? []);
  const [generating, setGenerating] = useState(false);
  const [ttsFor, setTtsFor] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const toggle = (kind: ModuleKind) =>
    setPicked((p) => ({ ...p, [kind]: { ...p[kind], on: !p[kind].on } }));

  const patchModule = (i: number, patch: Partial<TaskModule>) =>
    setModules((ms) => ms.map((m, idx) => (idx === i ? { ...m, ...patch } : m)));

  const addManual = (kind: ModuleKind) =>
    setModules((ms) => [
      ...ms,
      kind === "writing"
        ? { kind, title: "Письмо", topic: "", criteria: [""], min_words: 80 }
        : kind === "speaking"
          ? { kind, title: "Говоріння", topic: "", questions: [] }
          : {
              kind,
              title: MODULE_LABEL[kind],
              text: kind === "reading" ? "" : undefined,
              script: kind === "listening" ? "" : undefined,
              questions: [{ format: "choice", question: "", options: ["", "", "", ""], correct_index: 0, explanation: "" }],
            },
    ]);


  const generate = async () => {
    const chosen = (Object.keys(picked) as ModuleKind[])
      .filter((k) => picked[k].on)
      .map((k) => ({ kind: k, count: picked[k].count, topic: picked[k].topic || undefined }));
    if (chosen.length === 0) return toast({ title: "Оберіть модулі", variant: "destructive" });

    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("generate-standalone-assignment", {
      body: { prompt: prompt.trim(), level, modules: chosen },
    });
    setGenerating(false);
    if (error || (data as any)?.error) {
      toast({
        title: "AI не змогла створити завдання",
        description: String((data as any)?.error || error?.message || ""),
        variant: "destructive",
      });
      return;
    }
    const res = data as any;
    setModules(res.modules || []);
    if (!title.trim() && res.title) setTitle(res.title);
    if (!instructions.trim() && res.instructions) setInstructions(res.instructions);
    toast({ title: `Готово: ${res.modules?.length ?? 0} модулів` });
  };

  const generateAudio = async (i: number) => {
    const m = modules[i];
    if (!m?.script?.trim()) return toast({ title: "Спочатку додайте Hörtext", variant: "destructive" });
    setTtsFor(i);
    const { data, error } = await supabase.functions.invoke("assignment-tts", {
      body: { text: m.script.trim() },
    });
    setTtsFor(null);
    if (error || (data as any)?.error) {
      toast({
        title: "ElevenLabs помилка",
        description: String((data as any)?.error || error?.message || ""),
        variant: "destructive",
      });
      return;
    }
    patchModule(i, { audio_path: (data as any).path, audio_url: (data as any).url });
    toast({ title: "Аудіо створено" });
  };

  const save = async () => {
    if (!title.trim()) return toast({ title: "Вкажіть назву", variant: "destructive" });
    if (studentIds.length === 0) return toast({ title: "Оберіть учня", variant: "destructive" });
    if (modules.length === 0) return toast({ title: "Додайте хоча б один модуль", variant: "destructive" });

    setSaving(true);
    const { data: authData } = await supabase.auth.getUser();
    const teacherId = authData.user?.id;
    if (!teacherId) {
      setSaving(false);
      return toast({ title: "Сесія втрачена", variant: "destructive" });
    }

    if (isEdit && editing) {
      const { error } = await supabase
        .from("student_assignments")
        .update({
          title: title.trim(),
          instructions: instructions.trim() || null,
          level,
          due_at: dueAt ? new Date(dueAt).toISOString() : null,
          payload: { ...(editing.payload || {}), modules, category },
        } as any)
        .eq("id", editing.id);
      setSaving(false);
      if (error) return toast({ title: "Помилка", description: error.message, variant: "destructive" });
      toast({ title: "Зміни збережено" });
      onCreated();
      return;
    }

    const rows = studentIds.map((sid) => ({
      teacher_id: teacherId,
      student_id: sid,
      type: "modular",
      title: title.trim(),
      instructions: instructions.trim() || null,
      level,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      payload: { modules, category },
    }));

    const { error } = await supabase.from("student_assignments").insert(rows as any);
    setSaving(false);
    if (error) return toast({ title: "Помилка", description: error.message, variant: "destructive" });
    toast({ title: `Видано завдань: ${rows.length}` });
    onCreated();

  };

  return (
    <Modal title={isEdit ? "Редагування завдання" : duplicating ? "Копія завдання — оберіть учнів" : "Нове індивідуальне завдання"} onClose={onClose}>
      <div className="space-y-5">
        {/* students */}
        {!isEdit && (
        <Field label="Учні *">

          <div className="max-h-36 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
            {students.length === 0 ? (
              <p className="p-3 text-xs text-slate-500">Немає учнів. Створіть учня в розділі «Учні».</p>
            ) : (
              students.map((s) => {
                const on = studentIds.includes(s.user_id);
                return (
                  <button
                    key={s.user_id}
                    onClick={() => setStudentIds((ids) => (on ? ids.filter((i) => i !== s.user_id) : [...ids, s.user_id]))}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm text-left ${on ? "bg-indigo-50" : "hover:bg-slate-50"}`}
                  >
                    <span className="truncate">
                      <b className="text-slate-900">{s.display_name || "Без імені"}</b>{" "}
                      <span className="text-slate-400 text-xs">{s.email}</span>
                    </span>
                    {on && <Check className="w-4 h-4 text-indigo-600 shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </Field>
        )}


        <Field label="🗂 Категорія *">
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                  category === c.key
                    ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 text-slate-600 hover:bg-slate-50"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-1">
            <Field label="Рівень">
              <select value={level} onChange={(e) => setLevel(e.target.value)} className={inputCls}>
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </Field>
          </div>
          <div className="sm:col-span-2">
            <Field label="📌 Назва завдання *">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Напр.: Індивідуальний тест A2 — Reisen" className={inputCls} />
            </Field>
          </div>
        </div>


        <Field label="📅 Дедлайн">
          <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className={inputCls} />
        </Field>

        <Field label="📝 Домашнє завдання / вказівки для учня">
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={3}
            placeholder="Що саме зробити, які матеріали використати, на що звернути увагу"
            className={inputCls}
          />
        </Field>

        {/* module picker */}
        <div className="rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="text-sm font-semibold text-slate-900 inline-flex items-center gap-2">
            <Sparkles className="w-4 h-4" style={{ color: "#4F46E5" }} /> Конструктор модулів
          </div>
          <div className="space-y-2">
            {MODULES.map(({ kind, label, hint, countable }) => {
              const cfg = picked[kind];
              return (
                <div key={kind} className={`rounded-xl border p-3 ${cfg.on ? "border-indigo-300 bg-indigo-50/60" : "border-slate-200"}`}>
                  <div className="flex items-center justify-between gap-2">
                    <button onClick={() => toggle(kind)} className="flex items-center gap-2 text-left min-w-0">
                      <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${cfg.on ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300 text-transparent"}`}>
                        <Check className="w-3.5 h-3.5" />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold text-slate-900">{label}</span>
                        <span className="block text-[11px] text-slate-500">{hint}</span>
                      </span>
                    </button>
                    {cfg.on && countable && (
                      <input
                        type="number" min={1} max={20} value={cfg.count}
                        onChange={(e) => setPicked((p) => ({ ...p, [kind]: { ...p[kind], count: Number(e.target.value) } }))}
                        className="w-16 px-2 py-1.5 rounded-lg border border-slate-200 text-sm shrink-0"
                        title="Кількість завдань"
                      />
                    )}
                  </div>
                  {cfg.on && (
                    <input
                      value={cfg.topic}
                      onChange={(e) => setPicked((p) => ({ ...p, [kind]: { ...p[kind], topic: e.target.value } }))}
                      placeholder="Тема модуля (необов'язково)"
                      className={`${inputCls} mt-2`}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <Field label="AI-промпт (опис завдання своїми словами)">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              rows={2}
              placeholder="Напр.: тест для дорослого учня A2 про подорожі, багато Perfekt, легкий Hörtext про аеропорт"
              className={inputCls}
            />
          </Field>

          <button
            disabled={generating}
            onClick={generate}
            className="w-full px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2"
            style={{ background: "#4F46E5" }}
          >
            {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Генеруємо…</> : <>Згенерувати завдання через AI</>}
          </button>

          <div className="flex flex-wrap gap-1.5">
            {MODULES.map((m) => (
              <button
                key={m.kind}
                onClick={() => addManual(m.kind)}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50"
              >
                + {MODULE_LABEL[m.kind]} вручну
              </button>
            ))}
          </div>
        </div>

        {/* module editors */}
        {modules.map((m, i) => (
          <div key={i} className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-900">{MODULE_LABEL[m.kind] ?? m.kind}</span>
              <button onClick={() => setModules((ms) => ms.filter((_, idx) => idx !== i))} className="text-red-500">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <input value={m.title ?? ""} onChange={(e) => patchModule(i, { title: e.target.value })} placeholder="Заголовок модуля" className={inputCls} />

            {m.kind === "reading" && (
              <textarea value={m.text ?? ""} onChange={(e) => patchModule(i, { text: e.target.value })} rows={6} placeholder="Німецький текст для читання" className={inputCls} />
            )}

            {m.kind === "listening" && (
              <>
                <textarea value={m.script ?? ""} onChange={(e) => patchModule(i, { script: e.target.value, audio_path: undefined, audio_url: undefined })} rows={5} placeholder="Hörtext німецькою" className={inputCls} />
                <button
                  onClick={() => generateAudio(i)}
                  disabled={ttsFor === i}
                  className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold border border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 inline-flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {ttsFor === i ? <Loader2 className="w-4 h-4 animate-spin" /> : <Volume2 className="w-4 h-4" />}
                  Згенерувати аудіо через ElevenLabs
                </button>
                {m.audio_url && <audio controls src={m.audio_url} className="w-full" />}
              </>
            )}

            {(m.kind === "writing") && (
              <>
                <input value={m.topic ?? ""} onChange={(e) => patchModule(i, { topic: e.target.value })} placeholder="Тема письма" className={inputCls} />
                <textarea
                  value={(m.criteria ?? []).join("\n")}
                  onChange={(e) => patchModule(i, { criteria: e.target.value.split("\n") })}
                  rows={3}
                  placeholder="Критерії (по одному в рядку)"
                  className={inputCls}
                />
                <input
                  type="number" min={20} max={500} value={m.min_words ?? 80}
                  onChange={(e) => patchModule(i, { min_words: Number(e.target.value) })}
                  className={inputCls}
                />
              </>
            )}

            {m.kind === "speaking" && (
              <>
                <input value={m.topic ?? ""} onChange={(e) => patchModule(i, { topic: e.target.value })} placeholder="Тема монологу" className={inputCls} />
                <textarea
                  value={(m.questions ?? []).map((q) => (typeof q === "string" ? q : q.question)).join("\n")}
                  onChange={(e) => patchModule(i, { questions: e.target.value.split("\n").map((line) => ({ question: line })) })}
                  rows={3}
                  placeholder="Опорні питання (по одному в рядку)"
                  className={inputCls}
                />
              </>
            )}

            {(m.kind === "reading" || m.kind === "listening" || m.kind === "grammar") && (
              <div className="space-y-2">
                {(m.questions ?? []).map((qq, qi) => (
                  <div key={qi} className="rounded-xl border border-slate-200 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-semibold text-slate-500">
                        {qq.format === "gap" ? "Пропуск" : "Питання"} {qi + 1}
                      </span>
                      <button
                        onClick={() => patchModule(i, { questions: (m.questions ?? []).filter((_, x) => x !== qi) })}
                        className="text-red-500"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      value={qq.question ?? ""}
                      onChange={(e) =>
                        patchModule(i, {
                          questions: (m.questions ?? []).map((x, idx) => (idx === qi ? { ...x, question: e.target.value } : x)),
                        })
                      }
                      placeholder={qq.format === "gap" ? "Речення з ___" : "Текст питання"}
                      className={inputCls}
                    />
                    {qq.format === "gap" ? (
                      <input
                        value={qq.answer ?? ""}
                        onChange={(e) =>
                          patchModule(i, {
                            questions: (m.questions ?? []).map((x, idx) => (idx === qi ? { ...x, answer: e.target.value } : x)),
                          })
                        }
                        placeholder="Правильна відповідь"
                        className={inputCls}
                      />
                    ) : (
                      (qq.options ?? ["", "", "", ""]).map((opt, oi) => (
                        <div key={oi} className="flex items-center gap-2">
                          <button
                            onClick={() =>
                              patchModule(i, {
                                questions: (m.questions ?? []).map((x, idx) => (idx === qi ? { ...x, correct_index: oi } : x)),
                              })
                            }
                            className={`w-6 h-6 rounded-full border shrink-0 flex items-center justify-center ${
                              qq.correct_index === oi ? "bg-emerald-500 border-emerald-500 text-white" : "border-slate-300 text-transparent"
                            }`}
                            title="Правильна відповідь"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <input
                            value={opt}
                            onChange={(e) =>
                              patchModule(i, {
                                questions: (m.questions ?? []).map((x, idx) =>
                                  idx === qi
                                    ? { ...x, options: (x.options ?? ["", "", "", ""]).map((o, z) => (z === oi ? e.target.value : o)) }
                                    : x,
                                ),
                              })
                            }
                            placeholder={`Варіант ${oi + 1}`}
                            className={inputCls}
                          />
                        </div>
                      ))
                    )}
                  </div>
                ))}
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      patchModule(i, {
                        questions: [...(m.questions ?? []), { format: "choice", question: "", options: ["", "", "", ""], correct_index: 0 }],
                      })
                    }
                    className="flex-1 px-3 py-2 rounded-xl text-[11px] font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    + Питання
                  </button>
                  <button
                    onClick={() =>
                      patchModule(i, { questions: [...(m.questions ?? []), { format: "gap", question: "", answer: "" }] })
                    }
                    className="flex-1 px-3 py-2 rounded-xl text-[11px] font-semibold border border-slate-200 text-slate-600 hover:bg-slate-50"
                  >
                    + Пропуск
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}

        <button
          disabled={saving}
          onClick={save}
          className="w-full px-4 py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2"
          style={{ background: "#4F46E5" }}
        >
          <ClipboardList className="w-4 h-4" /> {saving ? "Зберігаємо…" : isEdit ? "Зберегти зміни" : "Видати завдання учню"}
        </button>
      </div>
    </Modal>
  );
}

/* ─────────── review ─────────── */

function ReviewModal({
  assignment, submission, studentName, onClose, onSaved,
}: {
  assignment: Assignment;
  submission: Submission;
  studentName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [grade, setGrade] = useState(submission.grade != null ? String(submission.grade) : "");
  const [feedback, setFeedback] = useState(submission.teacher_feedback ?? "");
  const [saving, setSaving] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!submission.audio_path) return;
      const { data } = await supabase.storage
        .from("student-submissions")
        .createSignedUrl(submission.audio_path, 3600);
      if (data?.signedUrl) setAudioUrl(data.signedUrl);
    })();
  }, [submission.id]);

  const modules: TaskModule[] = assignment.payload?.modules ?? [];
  const moduleAnswers: any[] = Array.isArray(submission.answers?.modules) ? submission.answers.modules : [];

  const norm = (v: unknown) => String(v ?? "").toLowerCase().trim();

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("student_submissions")
      .update({
        grade: grade === "" ? null : Number(grade),
        teacher_feedback: feedback.trim() || null,
        status: "graded",
        graded_at: new Date().toISOString(),
      } as any)
      .eq("id", submission.id);
    if (!error) {
      await supabase.from("student_assignments").update({ status: "graded" } as any).eq("id", assignment.id);
    }
    setSaving(false);
    if (error) toast({ title: "Помилка", description: error.message, variant: "destructive" });
    else { toast({ title: "Оцінку збережено" }); onSaved(); }
  };

  return (
    <Modal title={`Перевірка · ${studentName}`} onClose={onClose}>
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm">
          <div className="font-semibold text-slate-900">{assignment.title}</div>
          <p className="text-xs text-slate-500 mt-1">
            Здано: {new Date(submission.submitted_at).toLocaleString("uk-UA")}
            {submission.auto_score != null && ` · Тестова частина: ${submission.auto_score}%`}
          </p>
        </div>

        {modules.map((m, mi) => {
          const given = moduleAnswers[mi];
          return (
            <div key={mi} className="rounded-xl border border-slate-200 p-3 space-y-2">
              <div className="text-sm font-semibold text-slate-900">{MODULE_LABEL[m.kind] ?? m.kind}</div>
              {(m.questions ?? []).map((qq, qi) => {
                if (m.kind === "speaking") {
                  return <p key={qi} className="text-xs text-slate-600">• {qq.question}</p>;
                }
                const ans = Array.isArray(given) ? given[qi] : undefined;
                const ok = qq.format === "gap"
                  ? norm(ans) === norm(qq.answer)
                  : Number(ans) === Number(qq.correct_index);
                return (
                  <div key={qi} className={`rounded-lg border p-2 text-xs ${ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                    <div className="font-medium text-slate-900">{qi + 1}. {qq.question}</div>
                    <div className="text-slate-600 mt-0.5">
                      Учень: <b>{qq.format === "gap" ? (ans ?? "—") : (qq.options?.[Number(ans)] ?? "—")}</b>
                    </div>
                    {!ok && (
                      <div className="text-emerald-700">
                        Правильно: <b>{qq.format === "gap" ? qq.answer : qq.options?.[Number(qq.correct_index)]}</b>
                      </div>
                    )}
                  </div>
                );
              })}
              {m.kind === "writing" && submission.text && (
                <p className="text-sm text-slate-800 whitespace-pre-wrap bg-slate-50 rounded-lg p-2">{submission.text}</p>
              )}
              {m.kind === "speaking" && (audioUrl ? <audio controls src={audioUrl} className="w-full" /> : <p className="text-xs text-slate-400">Аудіо немає</p>)}
            </div>
          );
        })}

        {submission.ai_feedback && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
            <div className="text-xs font-semibold text-indigo-700 mb-1">AI-перевірка письма</div>
            <p className="text-sm text-slate-800 whitespace-pre-wrap">{submission.ai_feedback}</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Field label="Оцінка (1-12)">
            <input type="number" min={1} max={12} value={grade} onChange={(e) => setGrade(e.target.value)} className={inputCls} />
          </Field>
          <div className="col-span-2">
            <Field label="Комент за усну / письмову частину">
              <input value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Коментар для учня" className={inputCls} />
            </Field>
          </div>
        </div>

        <button
          disabled={saving}
          onClick={save}
          className="w-full px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
          style={{ background: "#4F46E5" }}
        >
          {saving ? "Зберігаємо…" : "Зберегти оцінку"}
        </button>
      </div>
    </Modal>
  );
}
