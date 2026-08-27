import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, SectionHeader, EmptyState } from "./_ui";
import { Search, Trophy, BookOpen, Swords, Coins, UserPlus, X, GraduationCap, Check, Plus, Copy } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAdminLang } from "../LanguageContext";

interface AdminUser {
  user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  total_xp: number;
  coin_balance: number;
  roles: string[];
  words_learned: number;
  lessons_completed: number;
  duels_played: number;
  duels_won: number;
  user_created_at: string;
}

interface CourseRow {
  id: string;
  title: string;
  level: string | null;
  target_language: string | null;
}

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

export default function StudentsPage() {
  const { createLang } = useAdminLang();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  // create student
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newStudent, setNewStudent] = useState({ display_name: "", nickname: "", password: "", age: "", note: "" });
  const [credentials, setCredentials] = useState<{ nickname: string; password: string; name: string } | null>(null);

  // per-student courses
  const [coursesFor, setCoursesFor] = useState<AdminUser | null>(null);

  const load = async () => {
    const { data, error } = await supabase.rpc("get_admin_users");
    if (!error) setUsers((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) =>
      (u.display_name || "").toLowerCase().includes(s) ||
      (u.email || "").toLowerCase().includes(s));
  }, [users, q]);

  const createStudent = async () => {
    if (!newStudent.display_name.trim()) {
      toast({ title: "Вкажіть ім'я учня", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { data, error } = await supabase.functions.invoke("teacher-create-student", {
      body: {
        display_name: newStudent.display_name.trim(),
        nickname: newStudent.nickname.trim() || undefined,
        password: newStudent.password.trim() || undefined,
        age: newStudent.age ? Number(newStudent.age) : undefined,
        note: newStudent.note.trim() || undefined,
      },
    });
    setCreating(false);
    if (error || (data as any)?.error) {
      toast({
        title: "Не вдалося створити учня",
        description: String((data as any)?.error || error?.message || ""),
        variant: "destructive",
      });
      return;
    }
    const res = data as any;
    setCredentials({
      name: newStudent.display_name.trim(),
      nickname: res.nickname || newStudent.nickname,
      password: res.password || newStudent.password,
    });
    setShowNew(false);
    setNewStudent({ display_name: "", nickname: "", password: "", age: "", note: "" });
    toast({ title: "Учня створено" });
    load();
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Учні"
        subtitle={`Всього: ${users.length}`}
        action={
          <button
            onClick={() => setShowNew(true)}
            className="px-4 py-2 rounded-xl text-white text-sm font-medium inline-flex items-center gap-2"
            style={{ background: "#4F46E5" }}
          >
            <UserPlus className="w-4 h-4" /> Створити учня
          </button>
        }
      />

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Пошук за іменем або email…"
          className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="p-4 animate-pulse h-24"><div /></Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="Немає учнів" description="Створіть першого учня або змініть запит" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((u) => (
            <Card key={u.user_id} className="p-4">
              <div className="flex items-start gap-3">
                {u.avatar_url ? (
                  <img src={u.avatar_url} className="w-11 h-11 rounded-full object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ background: "linear-gradient(135deg,#4F46E5,#7C3AED)" }}>
                    {(u.display_name || u.email || "U")[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 truncate">
                      {u.display_name || "Без імені"}
                    </h3>
                    {u.roles.map((r) => (
                      <span key={r} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: "#FEF3C7", color: "#92400E" }}>{r}</span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  <div className="mt-3 grid grid-cols-4 gap-1.5 text-[11px] text-slate-600">
                    <span className="flex items-center gap-1"><Trophy className="w-3 h-3 text-amber-500" />{u.total_xp}</span>
                    <span className="flex items-center gap-1"><Coins className="w-3 h-3 text-yellow-500" />{u.coin_balance}</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3 text-indigo-500" />{u.lessons_completed}</span>
                    <span className="flex items-center gap-1"><Swords className="w-3 h-3 text-red-500" />{u.duels_won}/{u.duels_played}</span>
                  </div>
                  <button
                    onClick={() => setCoursesFor(u)}
                    className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border border-slate-200 text-slate-700 hover:bg-slate-50"
                  >
                    <GraduationCap className="w-3.5 h-3.5" /> Курси учня
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Create student modal */}
      {showNew && (
        <Modal title="Новий учень" onClose={() => setShowNew(false)}>
          <div className="space-y-3">
            <Field label="Ім'я учня *">
              <input value={newStudent.display_name}
                onChange={(e) => setNewStudent({ ...newStudent, display_name: e.target.value })}
                placeholder="Наприклад: Олег Петренко" className={inputCls} />
            </Field>
            <Field label="Нікнейм для входу (латиниця, необов'язково)">
              <input value={newStudent.nickname}
                onChange={(e) => setNewStudent({ ...newStudent, nickname: e.target.value.toLowerCase() })}
                placeholder="oleg_p" className={inputCls} />
            </Field>
            <Field label="Пароль (порожньо — згенерується автоматично)">
              <input value={newStudent.password}
                onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                placeholder="klar2026" className={inputCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Вік (необов'язково)">
                <input type="number" value={newStudent.age}
                  onChange={(e) => setNewStudent({ ...newStudent, age: e.target.value })}
                  placeholder="12" className={inputCls} />
              </Field>
              <Field label="Нотатка">
                <input value={newStudent.note}
                  onChange={(e) => setNewStudent({ ...newStudent, note: e.target.value })}
                  placeholder="Готуємось до B1" className={inputCls} />
              </Field>
            </div>
            <button
              disabled={creating}
              onClick={createStudent}
              className="w-full px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
              style={{ background: "#4F46E5" }}
            >
              {creating ? "Створюємо…" : "Створити учня"}
            </button>
            <p className="text-[11px] text-slate-500">
              Учень входить на сторінці входу, обравши «Учень», за нікнеймом і паролем.
            </p>
          </div>
        </Modal>
      )}

      {/* Credentials modal */}
      {credentials && (
        <Modal title="Дані для входу учня" onClose={() => setCredentials(null)}>
          <div className="space-y-3">
            <p className="text-sm text-slate-600">Передайте ці дані учню — вони показуються один раз.</p>
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-sm space-y-1">
              <div><span className="text-slate-500">Ім'я:</span> <b>{credentials.name}</b></div>
              <div><span className="text-slate-500">Нікнейм:</span> <b>{credentials.nickname}</b></div>
              <div><span className="text-slate-500">Пароль:</span> <b>{credentials.password}</b></div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard?.writeText(`Нікнейм: ${credentials.nickname}\nПароль: ${credentials.password}`);
                toast({ title: "Скопійовано" });
              }}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 hover:bg-slate-50"
            >
              <Copy className="w-4 h-4" /> Скопіювати
            </button>
          </div>
        </Modal>
      )}

      {coursesFor && (
        <StudentCoursesModal
          student={coursesFor}
          createLang={createLang}
          onClose={() => setCoursesFor(null)}
        />
      )}
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-slate-500">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40">
      <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-900">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function StudentCoursesModal({
  student,
  createLang,
  onClose,
}: {
  student: AdminUser;
  createLang: string;
  onClose: () => void;
}) {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [granted, setGranted] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newCourse, setNewCourse] = useState({ title: "", level: "A1", description: "" });

  const load = async () => {
    const [{ data: cs }, { data: gp }] = await Promise.all([
      supabase.from("courses").select("id,title,level,target_language").order("created_at", { ascending: false }),
      supabase.from("course_purchases").select("course_id").eq("user_id", student.user_id),
    ]);
    setCourses((cs as any) || []);
    setGranted(((gp as any) || []).map((r: any) => r.course_id));
    setLoading(false);
  };

  useEffect(() => { load(); }, [student.user_id]);

  const toggleAccess = async (courseId: string) => {
    setBusy(true);
    if (granted.includes(courseId)) {
      const { error } = await supabase.from("course_purchases").delete()
        .eq("user_id", student.user_id).eq("course_id", courseId);
      if (error) toast({ title: "Помилка", description: error.message, variant: "destructive" });
      else setGranted((g) => g.filter((id) => id !== courseId));
    } else {
      const { error } = await supabase.from("course_purchases")
        .insert({ user_id: student.user_id, course_id: courseId } as any);
      if (error) toast({ title: "Помилка", description: error.message, variant: "destructive" });
      else setGranted((g) => [...g, courseId]);
    }
    setBusy(false);
  };

  const createPersonalCourse = async () => {
    if (!newCourse.title.trim()) return;
    setBusy(true);
    const { data, error } = await supabase.from("courses").insert({
      title: newCourse.title.trim(),
      description: newCourse.description.trim() || `Персональний курс для ${student.display_name || "учня"}`,
      level: newCourse.level,
      target_language: createLang === "all" ? "de" : createLang,
      price: 0,
      available: false,
    } as any).select().single();
    if (error || !data) {
      setBusy(false);
      toast({ title: "Помилка", description: error?.message || "", variant: "destructive" });
      return;
    }
    const { error: grantErr } = await supabase.from("course_purchases")
      .insert({ user_id: student.user_id, course_id: (data as any).id } as any);
    setBusy(false);
    if (grantErr) {
      toast({ title: "Курс створено, але доступ не видано", description: grantErr.message, variant: "destructive" });
    } else {
      toast({ title: "Персональний курс створено" });
    }
    setNewCourse({ title: "", level: "A1", description: "" });
    await load();
    window.dispatchEvent(new CustomEvent("admin-v2:open-builder", { detail: { courseId: (data as any).id } }));
    onClose();
  };

  return (
    <Modal title={`Курси · ${student.display_name || "Учень"}`} onClose={onClose}>
      <div className="space-y-5">
        <div className="rounded-xl border border-slate-200 p-4 space-y-3">
          <div className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Plus className="w-4 h-4" /> Новий персональний курс
          </div>
          <input value={newCourse.title} onChange={(e) => setNewCourse({ ...newCourse, title: e.target.value })}
            placeholder="Назва курсу" className={inputCls} />
          <div className="grid grid-cols-2 gap-3">
            <select value={newCourse.level} onChange={(e) => setNewCourse({ ...newCourse, level: e.target.value })}
              className={inputCls}>
              {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
            <input value={newCourse.description} onChange={(e) => setNewCourse({ ...newCourse, description: e.target.value })}
              placeholder="Опис (необов'язково)" className={inputCls} />
          </div>
          <button disabled={busy} onClick={createPersonalCourse}
            className="w-full px-4 py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60"
            style={{ background: "#4F46E5" }}>
            Створити і відкрити конструктор
          </button>
          <p className="text-[11px] text-slate-500">
            Курс створюється неопублікованим і одразу відкривається лише цьому учню.
          </p>
        </div>

        <div>
          <div className="text-sm font-semibold text-slate-900 mb-2">Доступ до курсів</div>
          {loading ? (
            <p className="text-sm text-slate-500">Завантаження…</p>
          ) : courses.length === 0 ? (
            <p className="text-sm text-slate-500">Курсів ще немає.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {courses.map((c) => {
                const on = granted.includes(c.id);
                return (
                  <button key={c.id} disabled={busy} onClick={() => toggleAccess(c.id)}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border text-left text-sm transition-colors ${
                      on ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:bg-slate-50"
                    }`}>
                    <span className="min-w-0">
                      <span className="block font-medium text-slate-900 truncate">{c.title}</span>
                      <span className="text-[11px] text-slate-500">{c.level} · {c.target_language}</span>
                    </span>
                    {on
                      ? <span className="text-[11px] font-semibold text-indigo-600 inline-flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Відкрито</span>
                      : <span className="text-[11px] text-slate-400">Відкрити</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
