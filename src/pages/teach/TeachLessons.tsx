import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, LayoutList, ArrowRight, Trash2 } from "lucide-react";

type Lesson = {
  id: string;
  title: string;
  topic: string | null;
  level: string;
  status: string;
  created_at: string;
  student_id: string;
};

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

export default function TeachLessons() {
  const nav = useNavigate();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});

  const load = async () => {
    setLoading(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data, error } = await supabase
      .from("tutoring_lessons")
      .select("id,title,topic,level,status,created_at,student_id")
      .eq("teacher_id", u.user.id)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    const rows = (data as any) || [];
    setLessons(rows);
    if (rows.length) {
      const { data: bc } = await supabase
        .from("lesson_blocks")
        .select("lesson_id")
        .in("lesson_id", rows.map((r: Lesson) => r.id));
      const m: Record<string, number> = {};
      (bc || []).forEach((r: any) => { m[r.lesson_id] = (m[r.lesson_id] || 0) + 1; });
      setCounts(m);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm("Видалити урок з усіма блоками?")) return;
    const { error } = await supabase.from("tutoring_lessons").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Видалено");
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Мої уроки</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Створюй уроки та збирай їх у конструкторі з блоків бібліотеки.
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} className="gap-2"><Plus className="w-4 h-4" /> Новий урок</Button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Завантаження…</div>
      ) : lessons.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <LayoutList className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Ще немає уроків. Створи перший.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {lessons.map((l) => (
            <div key={l.id} className="group rounded-2xl border border-border bg-card p-4 hover:shadow-md transition">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="font-display font-bold text-foreground">{l.title}</h3>
                  {l.topic && <p className="text-xs text-muted-foreground mt-0.5">{l.topic}</p>}
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="outline" className="text-[10px]">{l.level}</Badge>
                  <button onClick={() => remove(l.id)} className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-muted-foreground">{counts[l.id] || 0} блоків</span>
                <Link to={`/teach/lesson/${l.id}/build`} className="text-xs font-semibold text-primary inline-flex items-center gap-1 hover:gap-2 transition-all">
                  Конструктор <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {showNew && (
        <NewLessonDialog
          onClose={() => setShowNew(false)}
          onCreated={(id) => nav(`/teach/lesson/${id}/build`)}
        />
      )}
    </div>
  );
}

function NewLessonDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [title, setTitle] = useState("");
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState("A1");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) return toast.error("Введи назву");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { setSaving(false); return; }
    // school-wide template: teacher = student = current user until assigned
    const { data, error } = await supabase
      .from("tutoring_lessons")
      .insert({
        title: title.trim(),
        topic: topic.trim() || null,
        level,
        teacher_id: u.user.id,
        student_id: u.user.id,
        status: "draft",
      })
      .select("id")
      .single();
    setSaving(false);
    if (error) return toast.error(error.message);
    onCreated((data as any).id);
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-bold mb-4">Новий урок</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Назва</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Напр.: Sich vorstellen — A1" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Тема</label>
            <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Familie" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Рівень</label>
            <div className="flex gap-1 mt-1">
              {LEVELS.map((lv) => (
                <button key={lv} onClick={() => setLevel(lv)}
                  className={`flex-1 px-2 py-1.5 rounded-lg text-xs border ${
                    level === lv ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground"
                  }`}>{lv}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" onClick={onClose}>Скасувати</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Створення…" : "Створити"}</Button>
        </div>
      </div>
    </div>
  );
}
