import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, SectionHeader, EmptyState } from "./_ui";
import {
  ClipboardList, Plus, X, Sparkles, Loader2, Trash2, Check, Search,
  FileText, Mic, PenLine, ListChecks, Award, BookOpen, GraduationCap,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import StudentBlocks from "@/components/blocks/StudentBlocks";
import { kitBlocksToLessonBlocks } from "@/lib/lesson-kits";
import { useAdminLang } from "../LanguageContext";

type AssignmentType = "test" | "homework" | "writing" | "reading" | "grammar" | "audio";

interface Question {
  question: string;
  options: string[];
  correct_index: number;
  explanation?: string;
}

interface Assignment {
  id: string;
  student_id: string;
  type: AssignmentType;
  title: string;
  instructions: string | null;
  payload: any;
  level: string | null;
  due_at: string | null;
  status: "assigned" | "submitted" | "graded";
  created_at: string;
}

interface Submission {
  id: string;
  assignment_id: string;
  student_id: string;
  answers: any;
  text: string | null;
  files: any;
  audio_path: string | null;
  auto_score: number | null;
  ai_feedback: string | null;
  grade: number | null;
  teacher_feedback: string | null;
  status: string;
  submitted_at: string;
}

interface StudentRow {
  user_id: string;
  display_name: string | null;
  email: string | null;
}

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

const TYPES: { key: AssignmentType; label: string; icon: any; hint: string }[] = [
  { key: "test", label: "Тест", icon: ListChecks, hint: "Питання з варіантами, авто-перевірка" },
  { key: "homework", label: "Домашка", icon: FileText, hint: "Текст + фото/файли від учня" },
  { key: "writing", label: "Письмо (AI)", icon: PenLine, hint: "AI дає оцінку та фідбек" },
  { key: "reading", label: "Читання (AI)", icon: BookOpen, hint: "Текст за рівнем і кількістю слів" },
  { key: "grammar", label: "Граматика", icon: GraduationCap, hint: "Повний урок граматики з живого класу" },
  { key: "audio", label: "Аудіо / вимова", icon: Mic, hint: "Учень записує голос" },
];

const READING_SIZES = [50, 100, 150, 200, 300];

const inputCls =
  "w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white";

const STATUS_META: Record<string, { label: string; bg: string; color: string }> = {
  assigned: { label: "Видано", bg: "#E0E7FF", color: "#3730A3" },
  submitted: { label: "Здано", bg: "#FEF3C7", color: "#92400E" },
  graded: { label: "Перевірено", bg: "#D1FAE5", color: "#065F46" },
};

export default function AssignmentsPage() {
  const { createLang } = useAdminLang();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [subs, setSubs] = useState<Record<string, Submission>>({});
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [review, setReview] = useState<Assignment | null>(null);

  const load = async () => {
    const [{ data: a }, { data: s }, { data: st }] = await Promise.all([
      supabase.from("student_assignments").select("*").order("created_at", { ascending: false }),
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
    if (!s) return assignments;
    return assignments.filter(
      (a) => a.title.toLowerCase().includes(s) || nameOf(a.student_id).toLowerCase().includes(s),
    );
  }, [assignments, q, students]);

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
        title="Завдання учнів"
        subtitle={`Всього: ${assignments.length} · Здано: ${Object.keys(subs).length}`}
        action={
          <button
            onClick={() => setShowNew(true)}
            className="px-4 py-2 rounded-xl text-white text-sm font-medium inline-flex items-center gap-2"
            style={{ background: "#4F46E5" }}
          >
            <Plus className="w-4 h-4" /> Нове завдання
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

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="p-4 animate-pulse h-24"><div /></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="Немає завдань" description="Створіть перше завдання для учня" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((a) => {
            const sub = subs[a.id];
            const meta = STATUS_META[a.status] ?? STATUS_META.assigned;
            const TypeIcon = TYPES.find((t) => t.key === a.type)?.icon ?? ClipboardList;
            return (
              <Card key={a.id} className="p-4">
                <div className="flex items-start gap-3">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                    style={{ background: "linear-gradient(135deg,#4F46E5,#7C3AED)" }}
                  >
                    <TypeIcon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-slate-900 truncate">{a.title}</h3>
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
                    <p className="text-xs text-slate-500 truncate">
                      {nameOf(a.student_id)}
                      {a.due_at ? ` · до ${new Date(a.due_at).toLocaleDateString("uk-UA")}` : ""}
                    </p>
                    {sub?.auto_score != null && (
                      <p className="text-xs mt-1 font-semibold text-indigo-600 inline-flex items-center gap-1">
                        <Award className="w-3.5 h-3.5" /> {sub.auto_score}%
                      </p>
                    )}
                    <div className="mt-3 flex gap-2">
                      <button
                        onClick={() => setReview(a)}
                        disabled={!sub}
                        className="flex-1 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                      >
                        {sub ? "Перевірити" : "Ще не здано"}
                      </button>
                      <button
                        onClick={() => window.open(`/task/${a.id}?preview=1`, "_blank")}
                        className="px-3 py-2 rounded-xl text-xs font-semibold border border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                        title="Переглянути очима учня"
                      >
                        👀 Перегляд
                      </button>
                      <button
                        onClick={() => remove(a.id)}
                        className="px-3 py-2 rounded-xl text-xs border border-slate-200 text-red-500 hover:bg-red-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {showNew && (
        <NewAssignmentModal
          students={students}
          createLang={createLang}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load(); }}
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

function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
      <div className={`w-full ${wide ? "max-w-2xl" : "max-w-md"} bg-white rounded-2xl border border-slate-200 shadow-xl max-h-[88vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white">
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

function NewAssignmentModal({
  students, createLang, onClose, onCreated,
}: {
  students: StudentRow[];
  createLang: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [type, setType] = useState<AssignmentType>("test");
  const [studentIds, setStudentIds] = useState<string[]>([]);
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [level, setLevel] = useState("A1");
  const [dueAt, setDueAt] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [aiTopic, setAiTopic] = useState("");
  const [aiCount, setAiCount] = useState(10);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [writingTopic, setWritingTopic] = useState<any>(null);
  const [readingTopic, setReadingTopic] = useState<any>(null);
  const [readingWords, setReadingWords] = useState(100);

  const genReading = async () => {
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("generate-reading-text", {
      body: { level, words: readingWords, topic: aiTopic.trim() || undefined },
    });
    setGenerating(false);
    if (error || (data as any)?.error) return toast({ title: "Не вдалося згенерувати текст", description: String((data as any)?.error || error?.message || ""), variant: "destructive" });
    const t = (data as any).topic;
    setReadingTopic(t);
    setTitle(`Читання: ${t.title_de ?? ""}`.trim());
    if (!instructions.trim()) setInstructions("Прочитай текст, познач граматичні конструкції та запиши нотатки.");
  };

  const genWriting = async () => {
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("generate-writing-topic", { body: { level, avoid: writingTopic?.title_de ?? "" } });
    setGenerating(false);
    if (error || (data as any)?.error) return toast({ title: "Не вдалося згенерувати тему", description: String((data as any)?.error || error?.message || ""), variant: "destructive" });
    const t = (data as any).topic;
    setWritingTopic({ ...t, level });
    setTitle(`Письмо: ${t.title_de ?? ""}`.trim());
    setInstructions([t.task_de, t.min_words ? `(${t.min_words} Wörter)` : ""].filter(Boolean).join(" "));
  };

  const generate = async () => {
    if (!aiTopic.trim()) {
      toast({ title: "Вкажіть тему для AI", variant: "destructive" });
      return;
    }
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("generate-student-test", {
      body: {
        topic: aiTopic.trim(),
        level,
        count: aiCount,
        language: createLang === "all" ? "de" : createLang,
        extra: instructions.trim() || undefined,
      },
    });
    setGenerating(false);
    if (error || (data as any)?.error) {
      toast({
        title: "AI не змогла створити тест",
        description: String((data as any)?.error || error?.message || ""),
        variant: "destructive",
      });
      return;
    }
    const res = data as any;
    setQuestions(res.questions || []);
    if (!title.trim() && res.title) setTitle(res.title);
    toast({ title: `Створено ${res.questions?.length ?? 0} питань` });
  };

  const addQuestion = () =>
    setQuestions((qs) => [...qs, { question: "", options: ["", "", "", ""], correct_index: 0, explanation: "" }]);

  const updateQuestion = (i: number, patch: Partial<Question>) =>
    setQuestions((qs) => qs.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));

  const save = async () => {
    if (!title.trim()) return toast({ title: "Вкажіть назву завдання", variant: "destructive" });
    if (studentIds.length === 0) return toast({ title: "Оберіть хоча б одного учня", variant: "destructive" });
    if (type === "test" && questions.length === 0)
      return toast({ title: "Додайте питання до тесту", variant: "destructive" });
    if (type === "reading" && !readingTopic)
      return toast({ title: "Згенеруйте текст для читання", variant: "destructive" });

    setSaving(true);
    const { data: authData } = await supabase.auth.getUser();
    const teacherId = authData.user?.id;
    if (!teacherId) {
      setSaving(false);
      return toast({ title: "Сесія втрачена", variant: "destructive" });
    }

    const rows = studentIds.map((sid) => ({
      teacher_id: teacherId,
      student_id: sid,
      type,
      title: title.trim(),
      instructions: instructions.trim() || null,
      level,
      due_at: dueAt ? new Date(dueAt).toISOString() : null,
      payload:
        type === "test" ? { questions }
        : type === "writing" && writingTopic ? { topic: writingTopic }
        : type === "reading" && readingTopic ? { topic: readingTopic }
        : {},
    }));

    const { error } = await supabase.from("student_assignments").insert(rows as any);
    setSaving(false);
    if (error) {
      toast({ title: "Помилка", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Видано завдань: ${rows.length}` });
    onCreated();
  };

  return (
    <Modal title="Нове завдання" onClose={onClose} wide>
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {TYPES.map(({ key, label, icon: Icon, hint }) => (
            <button
              key={key}
              onClick={() => setType(key)}
              title={hint}
              className={`p-3 rounded-xl border text-left transition-colors ${
                type === key ? "border-indigo-400 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"
              }`}
            >
              <Icon className="w-4 h-4 mb-1" style={{ color: "#4F46E5" }} />
              <div className="text-xs font-semibold text-slate-900">{label}</div>
            </button>
          ))}
        </div>

        <Field label="Учні *">
          <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
            {students.length === 0 ? (
              <p className="p-3 text-xs text-slate-500">Немає учнів. Створіть учня у розділі «Учні».</p>
            ) : (
              students.map((s) => {
                const on = studentIds.includes(s.user_id);
                return (
                  <button
                    key={s.user_id}
                    onClick={() =>
                      setStudentIds((ids) => (on ? ids.filter((i) => i !== s.user_id) : [...ids, s.user_id]))
                    }
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

        <Field label="Назва *">
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Наприклад: Тест Präpositionen" className={inputCls} />
        </Field>

        <Field label="Інструкція / завдання для учня">
          <textarea
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            rows={3}
            placeholder={type === "writing" ? "Напиши лист другу про свої вихідні (80-100 слів)" : "Опис завдання"}
            className={inputCls}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Рівень">
            <select value={level} onChange={(e) => setLevel(e.target.value)} className={inputCls}>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
          <Field label="Дедлайн (необов'язково)">
            <input type="date" value={dueAt} onChange={(e) => setDueAt(e.target.value)} className={inputCls} />
          </Field>
        </div>

        {type === "reading" && (
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: "#4F46E5" }} /> Текст для читання ({level})
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input value={aiTopic} onChange={(e) => setAiTopic(e.target.value)}
                placeholder="Тема (напр. Wohnung, Arbeit) — необов'язково" className={`${inputCls} sm:col-span-2`} />
              <select value={readingWords} onChange={(e) => setReadingWords(Number(e.target.value))} className={inputCls}>
                {READING_SIZES.map((w) => <option key={w} value={w}>{w} слів</option>)}
              </select>
            </div>
            <button disabled={generating} onClick={genReading}
              className="w-full px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2"
              style={{ background: "#4F46E5" }}>
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Генеруємо…</> : readingTopic ? "Інший текст" : "Згенерувати текст"}
            </button>
            {readingTopic && (
              <div className="text-sm space-y-2 text-slate-700">
                <p className="font-bold text-slate-900">{readingTopic.title_de} · {readingTopic.word_count ?? readingWords} слів</p>
                {readingTopic.summary_uk && <p>{readingTopic.summary_uk}</p>}
                <p className="whitespace-pre-wrap text-xs text-slate-600 max-h-40 overflow-auto">{readingTopic.text_de}</p>
              </div>
            )}
            <p className="text-xs text-slate-500">Учень читає текст у розділі «Читання», підкреслює конструкції та веде нотатки.</p>
          </div>
        )}

        {type === "writing" && (
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: "#4F46E5" }} /> Тема листа від ШІ (рівень {level})
            </div>
            <button disabled={generating} onClick={genWriting}
              className="w-full px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2"
              style={{ background: "#4F46E5" }}>
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Генеруємо…</> : writingTopic ? "Інша тема" : "Згенерувати тему"}
            </button>
            {writingTopic && (
              <div className="text-sm space-y-2 text-slate-700">
                <p className="font-bold text-slate-900">{writingTopic.title_de}</p>
                {writingTopic.situation_uk && <p>{writingTopic.situation_uk}</p>}
                {!!writingTopic.points?.length && <ul className="list-disc pl-5">{writingTopic.points.map((p: string, i: number) => <li key={i}>{p}</li>)}</ul>}
                {!!writingTopic.redemittel?.length && <p className="text-xs text-slate-500">Фрази: {writingTopic.redemittel.join(" · ")}</p>}
              </div>
            )}
            <p className="text-xs text-slate-500">Учень побачить лист у розділі «Письмо» в Академії.</p>
          </div>
        )}

        {type === "test" && (
          <div className="rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-4 h-4" style={{ color: "#4F46E5" }} /> AI-генерація питань
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
                placeholder="Тема (напр. Perfekt, їжа)"
                className={`${inputCls} sm:col-span-2`}
              />
              <input
                type="number" min={1} max={25}
                value={aiCount}
                onChange={(e) => setAiCount(Number(e.target.value))}
                className={inputCls}
              />
            </div>
            <button
              disabled={generating}
              onClick={generate}
              className="w-full px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2"
              style={{ background: "#4F46E5" }}
            >
              {generating ? <><Loader2 className="w-4 h-4 animate-spin" /> Генеруємо…</> : <>Згенерувати тест</>}
            </button>

            <div className="space-y-3">
              {questions.map((qq, i) => (
                <div key={i} className="rounded-xl border border-slate-200 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">Питання {i + 1}</span>
                    <button
                      onClick={() => setQuestions((qs) => qs.filter((_, idx) => idx !== i))}
                      className="text-red-500 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <input
                    value={qq.question}
                    onChange={(e) => updateQuestion(i, { question: e.target.value })}
                    placeholder="Текст питання"
                    className={inputCls}
                  />
                  {qq.options.map((opt, oi) => (
                    <div key={oi} className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuestion(i, { correct_index: oi })}
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
                          updateQuestion(i, {
                            options: qq.options.map((o, idx) => (idx === oi ? e.target.value : o)),
                          })
                        }
                        placeholder={`Варіант ${oi + 1}`}
                        className={inputCls}
                      />
                    </div>
                  ))}
                  <input
                    value={qq.explanation ?? ""}
                    onChange={(e) => updateQuestion(i, { explanation: e.target.value })}
                    placeholder="Пояснення (українською)"
                    className={inputCls}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={addQuestion}
              className="w-full px-4 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50 inline-flex items-center justify-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" /> Додати питання вручну
            </button>
          </div>
        )}

        <button
          disabled={saving}
          onClick={save}
          className="w-full px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
          style={{ background: "#4F46E5" }}
        >
          {saving ? "Зберігаємо…" : "Видати завдання"}
        </button>
      </div>
    </Modal>
  );
}

function ReviewModal({
  assignment, submission, studentName, onClose, onSaved,
}: {
  assignment: Assignment;
  submission: Submission;
  studentName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [grade, setGrade] = useState<string>(submission.grade != null ? String(submission.grade) : "");
  const [feedback, setFeedback] = useState(submission.teacher_feedback ?? "");
  const [saving, setSaving] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [fileUrls, setFileUrls] = useState<Array<{ name: string; url: string }>>([]);

  useEffect(() => {
    let revoke: string[] = [];
    (async () => {
      if (submission.audio_path) {
        const { data } = await supabase.storage
          .from("student-submissions")
          .createSignedUrl(submission.audio_path, 3600);
        if (data?.signedUrl) setAudioUrl(data.signedUrl);
      }
      const files = Array.isArray(submission.files) ? submission.files : [];
      const urls: Array<{ name: string; url: string }> = [];
      for (const f of files) {
        const { data } = await supabase.storage
          .from("student-submissions")
          .createSignedUrl((f as any).path, 3600);
        if (data?.signedUrl) urls.push({ name: (f as any).name ?? "файл", url: data.signedUrl });
      }
      setFileUrls(urls);
    })();
    return () => { revoke.forEach((u) => URL.revokeObjectURL(u)); };
  }, [submission.id]);

  const questions: Question[] = (assignment.payload?.questions ?? []) as Question[];
  const answers: number[] = Array.isArray(submission.answers) ? submission.answers : [];

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
    <Modal title={`Перевірка · ${studentName}`} onClose={onClose} wide>
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm">
          <div className="font-semibold text-slate-900">{assignment.title}</div>
          {assignment.instructions && <p className="text-slate-600 mt-1 whitespace-pre-wrap">{assignment.instructions}</p>}
          <p className="text-xs text-slate-500 mt-2">
            Здано: {new Date(submission.submitted_at).toLocaleString("uk-UA")}
          </p>
        </div>

        <BlocksAnswersReview assignment={assignment} submission={submission} />

        {assignment.type === "test" && (
          <div className="space-y-2">
            <div className="text-sm font-semibold text-slate-900">
              Авто-результат: {submission.auto_score ?? 0}%
            </div>
            {questions.map((qq, i) => {
              const ok = Number(answers[i]) === Number(qq.correct_index);
              return (
                <div key={i} className={`rounded-xl border p-3 text-sm ${ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}`}>
                  <div className="font-medium text-slate-900">{i + 1}. {qq.question}</div>
                  <div className="text-xs text-slate-600 mt-1">
                    Відповідь учня: <b>{qq.options?.[answers[i]] ?? "—"}</b>
                  </div>
                  {!ok && (
                    <div className="text-xs text-emerald-700 mt-0.5">
                      Правильно: <b>{qq.options?.[qq.correct_index]}</b>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {submission.text && (
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="text-xs font-semibold text-slate-500 mb-1">Відповідь учня</div>
            <p className="text-sm text-slate-800 whitespace-pre-wrap">{submission.text}</p>
          </div>
        )}

        {submission.ai_feedback && (
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-3">
            <div className="text-xs font-semibold text-indigo-700 mb-1">AI-перевірка</div>
            <p className="text-sm text-slate-800 whitespace-pre-wrap">{submission.ai_feedback}</p>
          </div>
        )}

        {audioUrl && (
          <div className="rounded-xl border border-slate-200 p-3">
            <div className="text-xs font-semibold text-slate-500 mb-2">Аудіо-запис</div>
            <audio controls src={audioUrl} className="w-full" />
          </div>
        )}

        {fileUrls.length > 0 && (
          <div className="rounded-xl border border-slate-200 p-3 space-y-1">
            <div className="text-xs font-semibold text-slate-500 mb-1">Файли</div>
            {fileUrls.map((f) => (
              <a key={f.url} href={f.url} target="_blank" rel="noreferrer" className="block text-sm text-indigo-600 hover:underline truncate">
                📎 {f.name}
              </a>
            ))}
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
          <Field label="Оцінка (1-12)">
            <input type="number" min={1} max={12} value={grade} onChange={(e) => setGrade(e.target.value)} className={inputCls} />
          </Field>
          <div className="col-span-2">
            <Field label="Ваш фідбек">
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

/** Shows exactly what the student chose in block-based homework / mini-courses, with right/wrong marks. */
function BlocksAnswersReview({ assignment, submission }: { assignment: Assignment; submission: Submission }) {
  const p: any = assignment.payload ?? {};
  const ans: any = submission.answers ?? {};
  const sections: any[] = Array.isArray(p.sections) && p.sections.length
    ? p.sections
    : Array.isArray(p.blocks) && p.blocks.length ? [{ id: "main", title: assignment.title, blocks: p.blocks }] : [];
  if (!sections.length || Array.isArray(ans)) return null;
  const valuesFor = (sid: string) => ans.sections?.[sid]?.values ?? (sections.length === 1 ? ans.values : undefined);
  const hasAny = sections.some((s) => valuesFor(s.id));
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-slate-900">
        Відповіді учня {submission.auto_score != null && `· ${submission.auto_score}%`}
      </div>
      {!hasAny && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
          Це завдання здане до оновлення — збережено лише бал ({ans.score ?? "?"}/{ans.max ?? "?"}), без окремих відповідей.
        </p>
      )}
      {hasAny && sections.map((s) => {
        const v = valuesFor(s.id);
        const r = ans.sections?.[s.id];
        return (
          <div key={s.id} className="rounded-xl border border-slate-200 bg-background text-foreground p-3">
            <div className="text-xs font-semibold mb-2">{s.title} {r && `· ${r.score}/${r.max}`}</div>
            {v ? (
              <StudentBlocks
                blocks={kitBlocksToLessonBlocks((s.blocks ?? []).filter((b: any) => b.visible_to_student !== false), s.id)}
                persist={false} readOnly showActions={false} editorial review initialValues={v}
              />
            ) : <p className="text-xs text-muted-foreground">Немає відповідей</p>}
          </div>
        );
      })}
    </div>
  );
}
