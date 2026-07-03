import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Presentation,
  Dumbbell,
  Video,
  Headphones,
  BookOpen,
  MessagesSquare,
  ListChecks,
  Gamepad2,
  Search,
  Plus,
  Trash2,
} from "lucide-react";

type LibraryItem = {
  id: string;
  type: string;
  title: string;
  description: string | null;
  level: string | null;
  topic: string | null;
  target_language: string;
  tags: string[];
  source: string;
  is_published: boolean;
  owner_id: string | null;
  created_at: string;
};

const TYPES = [
  { key: "slide_deck", label: "Слайди", icon: Presentation, color: "bg-indigo-500/10 text-indigo-600" },
  { key: "exercise", label: "Вправа", icon: Dumbbell, color: "bg-orange-500/10 text-orange-600" },
  { key: "video", label: "Відео", icon: Video, color: "bg-rose-500/10 text-rose-600" },
  { key: "audio", label: "Аудіо", icon: Headphones, color: "bg-emerald-500/10 text-emerald-600" },
  { key: "reading", label: "Читання", icon: BookOpen, color: "bg-sky-500/10 text-sky-600" },
  { key: "dialogue", label: "Діалог", icon: MessagesSquare, color: "bg-fuchsia-500/10 text-fuchsia-600" },
  { key: "word_list", label: "Слова", icon: ListChecks, color: "bg-amber-500/10 text-amber-600" },
  { key: "game", label: "Гра", icon: Gamepad2, color: "bg-lime-500/10 text-lime-600" },
] as const;

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const LANGS = [
  { key: "de", label: "🇩🇪 DE" },
  { key: "en", label: "🇬🇧 EN" },
  { key: "uk", label: "🇺🇦 UK" },
  { key: "ru", label: "🇷🇺 RU" },
];

const typeMeta = (t: string) => TYPES.find((x) => x.key === t) ?? TYPES[0];

export default function TeachLibrary() {
  const [items, setItems] = useState<LibraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [type, setType] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [lang, setLang] = useState<string>("de");
  const [showNew, setShowNew] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("library_items")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast.error(error.message);
    setItems((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (lang && it.target_language !== lang) return false;
      if (type && it.type !== type) return false;
      if (level && it.level !== level) return false;
      if (q) {
        const s = q.toLowerCase();
        if (
          !it.title.toLowerCase().includes(s) &&
          !(it.description || "").toLowerCase().includes(s) &&
          !(it.topic || "").toLowerCase().includes(s)
        ) return false;
      }
      return true;
    });
  }, [items, q, type, level, lang]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    items.filter((it) => it.target_language === lang).forEach((it) => {
      m[it.type] = (m[it.type] || 0) + 1;
    });
    return m;
  }, [items, lang]);

  const deleteItem = async (id: string) => {
    if (!confirm("Видалити цей матеріал з бібліотеки?")) return;
    const { error } = await supabase.from("library_items").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Видалено");
    load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-display text-xl font-bold text-foreground">Бібліотека матеріалів</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Централізоване сховище школи: слайди, вправи, тексти, діалоги. Використовуй у своїх уроках.
          </p>
        </div>
        <Button onClick={() => setShowNew(true)} className="gap-2">
          <Plus className="w-4 h-4" /> Додати матеріал
        </Button>
      </div>

      {/* Language tabs */}
      <div className="flex gap-1 rounded-xl border border-border bg-card/50 p-1 w-max">
        {LANGS.map((l) => (
          <button
            key={l.key}
            onClick={() => setLang(l.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
              lang === l.key ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-border bg-card/60 p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Пошук за назвою, темою…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="border-0 bg-transparent focus-visible:ring-0 px-0"
          />
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setType(null)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
              !type ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            Усі типи
          </button>
          {TYPES.map((t) => (
            <button
              key={t.key}
              onClick={() => setType(type === t.key ? null : t.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition inline-flex items-center gap-1.5 ${
                type === t.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
              <span className="opacity-60">{counts[t.key] ?? 0}</span>
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setLevel(null)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
              !level ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground"
            }`}
          >
            Усі рівні
          </button>
          {LEVELS.map((lv) => (
            <button
              key={lv}
              onClick={() => setLevel(level === lv ? null : lv)}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition ${
                level === lv ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground"
              }`}
            >
              {lv}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-sm text-muted-foreground">Завантаження…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center">
          <p className="text-sm text-muted-foreground">Нічого не знайдено. Спробуй змінити фільтри або додати матеріал.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((it) => {
            const m = typeMeta(it.type);
            const Icon = m.icon;
            return (
              <div key={it.id} className="group rounded-2xl border border-border bg-card p-4 hover:shadow-md transition flex flex-col">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-semibold ${m.color}`}>
                    <Icon className="w-3.5 h-3.5" /> {m.label}
                  </div>
                  <div className="flex items-center gap-1">
                    {it.level && <Badge variant="outline" className="text-[10px]">{it.level}</Badge>}
                    <Badge variant="outline" className="text-[10px] uppercase">{it.target_language}</Badge>
                  </div>
                </div>
                <h3 className="font-display font-semibold text-sm text-foreground line-clamp-2 mb-1">{it.title}</h3>
                {it.topic && <p className="text-[11px] text-muted-foreground mb-1">Тема: {it.topic}</p>}
                {it.description && <p className="text-xs text-muted-foreground line-clamp-2">{it.description}</p>}
                <div className="mt-auto pt-3 flex items-center justify-between">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{it.source}</span>
                  <button
                    onClick={() => deleteItem(it.id)}
                    className="opacity-0 group-hover:opacity-100 transition text-muted-foreground hover:text-destructive"
                    title="Видалити"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNew && <NewItemDialog lang={lang} onClose={() => setShowNew(false)} onSaved={load} />}
    </div>
  );
}

function NewItemDialog({ lang, onClose, onSaved }: { lang: string; onClose: () => void; onSaved: () => void }) {
  const [type, setType] = useState<string>("exercise");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("A1");
  const [topic, setTopic] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!title.trim()) return toast.error("Введи назву");
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    const { error } = await supabase.from("library_items").insert({
      type, title: title.trim(), description: description.trim() || null,
      level, topic: topic.trim() || null, target_language: lang,
      source: "manual", is_published: true, owner_id: u.user?.id ?? null, payload: {},
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Додано");
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-bold mb-4">Новий матеріал</h3>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Тип</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {TYPES.map((t) => (
                <button key={t.key} onClick={() => setType(t.key)}
                  className={`px-2.5 py-1 rounded-lg text-xs border transition inline-flex items-center gap-1 ${
                    type === t.key ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
                  }`}>
                  <t.icon className="w-3 h-3" /> {t.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Назва</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Наприклад: Diktat: Sich vorstellen" />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Опис</label>
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Короткий опис" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground">Рівень</label>
              <div className="flex gap-1 mt-1">
                {LEVELS.map((lv) => (
                  <button key={lv} onClick={() => setLevel(lv)}
                    className={`flex-1 px-2 py-1 rounded-lg text-xs border ${
                      level === lv ? "bg-foreground text-background border-foreground" : "border-border text-muted-foreground"
                    }`}>{lv}</button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Тема</label>
              <Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Familie" />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" onClick={onClose}>Скасувати</Button>
          <Button onClick={save} disabled={saving}>{saving ? "Збереження…" : "Додати"}</Button>
        </div>
      </div>
    </div>
  );
}
