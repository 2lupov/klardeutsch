import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, SectionHeader, EmptyState } from "./_ui";
import { BookOpen, Sparkles, Edit3, Trash2, Eye, EyeOff } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAdminLang, applyLangFilter, ADMIN_LANGS } from "../LanguageContext";

interface Course {
  id: string;
  title: string;
  description: string | null;
  level: string | null;
  available: boolean | null;
  target_language: string | null;
  total_lessons: number | null;
}

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

export default function CoursesPage() {
  const { lang, createLang, isAll, meta } = useAdminLang();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);

  const [form, setForm] = useState({
    title: "",
    description: "",
    level: "A1",
    target_language: createLang,
    price: 200,
  });

  // keep form language in sync with header selector
  useEffect(() => {
    setForm((f) => ({ ...f, target_language: createLang }));
  }, [createLang]);

  const load = async () => {
    setLoading(true);
    const base = supabase
      .from("courses")
      .select("id,title,description,level,available,target_language,total_lessons");
    const { data } =
      lang && lang !== "all"
        ? await base.eq("target_language", lang).order("created_at", { ascending: false })
        : await base.order("created_at", { ascending: false });
    setCourses((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [lang]);

  const openBuilder = (courseId: string) => {
    window.dispatchEvent(new CustomEvent("admin-v2:open-builder", { detail: { courseId } }));
  };

  const createCourse = async () => {
    if (!form.title.trim()) return;
    const { data, error } = await supabase.from("courses").insert({
      title: form.title,
      description: form.description || null,
      level: form.level,
      target_language: form.target_language,
      price: form.price,
      available: false,
    } as any).select().single();
    if (error) { toast({ title: "Помилка", description: error.message }); return; }
    toast({ title: "Курс створено" });
    setShowNew(false);
    setForm({ title: "", description: "", level: "A1", target_language: createLang, price: 200 });
    await load();
    if (data?.id) openBuilder(data.id);
  };

  const updateCourse = async () => {
    if (!editing) return;
    const { error } = await supabase.from("courses").update({
      title: editing.title,
      description: editing.description,
      level: editing.level,
    } as any).eq("id", editing.id);
    if (error) { toast({ title: "Помилка", description: error.message }); return; }
    toast({ title: "Оновлено" });
    setEditing(null);
    load();
  };

  const togglePublish = async (c: Course) => {
    const { error } = await supabase.from("courses").update({ available: !c.available } as any).eq("id", c.id);
    if (error) { toast({ title: "Помилка", description: error.message }); return; }
    load();
  };

  const removeCourse = async (id: string) => {
    if (!confirm("Видалити курс з усіма уроками?")) return;
    const { error } = await supabase.from("courses").delete().eq("id", id);
    if (error) { toast({ title: "Помилка", description: error.message }); return; }
    load();
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Курси"
        subtitle="Керуй структурою всіх курсів школи"
        action={
          <button
            onClick={() => setShowNew(true)}
            className="px-4 py-2 rounded-xl text-white text-sm font-medium"
            style={{ background: "#4F46E5" }}
          >
            + Новий курс
          </button>
        }
      />

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[0, 1, 2].map((i) => (
            <Card key={i} className="p-6 animate-pulse">
              <div className="h-4 w-2/3 bg-slate-100 rounded" />
              <div className="h-3 w-full bg-slate-100 rounded mt-3" />
            </Card>
          ))}
        </div>
      ) : courses.length === 0 ? (
        <EmptyState
          title="Ще немає курсів"
          description="Створи перший курс — далі AI Course Builder згенерує модулі й уроки."
          cta={{ label: "+ Новий курс", onClick: () => setShowNew(true) }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((c) => (
            <Card key={c.id} className="p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0"
                  style={{ background: "linear-gradient(135deg,#4F46E5,#7C3AED)" }}>
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ background: "#FEF3C7", color: "#92400E" }}>{c.level || "—"}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
                      style={{ background: "#EEF2FF", color: "#4338CA" }}>{c.target_language}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={c.available ? { background: "#DCFCE7", color: "#166534" } : { background: "#F1F5F9", color: "#64748B" }}>
                      {c.available ? "published" : "draft"}
                    </span>
                  </div>
                  <h3 className="mt-2 font-semibold text-slate-900 truncate">{c.title}</h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.description || "Без опису"}</p>
                  <p className="text-[11px] text-slate-400 mt-2">{c.total_lessons || 0} уроків</p>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1.5 flex-wrap">
                <button onClick={() => openBuilder(c.id)}
                  className="flex-1 min-w-[110px] px-3 py-1.5 rounded-lg text-xs font-medium text-white flex items-center justify-center gap-1"
                  style={{ background: "#4F46E5" }}>
                  <Sparkles className="w-3.5 h-3.5" /> AI Builder
                </button>
                <button onClick={() => setEditing(c)}
                  className="px-2 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100" title="Редагувати">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => togglePublish(c)}
                  className="px-2 py-1.5 rounded-lg text-slate-600 hover:bg-slate-100" title="Публікація">
                  {c.available ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
                <button onClick={() => removeCourse(c.id)}
                  className="px-2 py-1.5 rounded-lg text-red-500 hover:bg-red-50" title="Видалити">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {(showNew || editing) && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => { setShowNew(false); setEditing(null); }}>
          <div className="bg-white rounded-2xl p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-slate-900 mb-4">
              {editing ? "Редагувати курс" : "Новий курс"}
            </h3>
            <div className="space-y-3">
              <input
                placeholder="Назва"
                value={editing ? editing.title : form.title}
                onChange={(e) => editing ? setEditing({ ...editing, title: e.target.value }) : setForm({ ...form, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm"
              />
              <textarea
                placeholder="Опис"
                value={(editing ? editing.description : form.description) || ""}
                onChange={(e) => editing ? setEditing({ ...editing, description: e.target.value }) : setForm({ ...form, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm min-h-[80px]"
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={editing ? editing.level || "A1" : form.level}
                  onChange={(e) => editing ? setEditing({ ...editing, level: e.target.value }) : setForm({ ...form, level: e.target.value })}
                  className="px-3 py-2 rounded-lg border border-slate-200 text-sm">
                  {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
                {!editing && (
                  <select value={form.target_language}
                    onChange={(e) => setForm({ ...form, target_language: e.target.value })}
                    className="px-3 py-2 rounded-lg border border-slate-200 text-sm">
                    <option value="de">Deutsch</option>
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                  </select>
                )}
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button onClick={() => { setShowNew(false); setEditing(null); }}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-medium bg-slate-100 text-slate-700">
                Скасувати
              </button>
              <button onClick={editing ? updateCourse : createCourse}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-medium text-white"
                style={{ background: "#4F46E5" }}>
                {editing ? "Зберегти" : "Створити"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
