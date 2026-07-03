import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  DndContext, PointerSensor, useSensor, useSensors, closestCenter, type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft, GripVertical, Trash2, Plus, Sparkles, Search,
  Presentation, Dumbbell, Video, Headphones, BookOpen, MessagesSquare, ListChecks, Gamepad2, Eye,
} from "lucide-react";

type Lesson = { id: string; title: string; topic: string | null; level: string; status: string };
type LibraryItem = {
  id: string; type: string; title: string; description: string | null;
  level: string | null; topic: string | null; target_language: string;
};
type Block = {
  id: string; lesson_id: string; library_item_id: string | null;
  inline_payload: any; block_type: string; title: string | null;
  sort_order: number; duration_min: number | null; settings: any;
};

const TYPE_META: Record<string, { label: string; icon: any; color: string }> = {
  slide_deck: { label: "Слайди", icon: Presentation, color: "bg-indigo-500/10 text-indigo-600" },
  exercise: { label: "Вправа", icon: Dumbbell, color: "bg-orange-500/10 text-orange-600" },
  video: { label: "Відео", icon: Video, color: "bg-rose-500/10 text-rose-600" },
  audio: { label: "Аудіо", icon: Headphones, color: "bg-emerald-500/10 text-emerald-600" },
  reading: { label: "Читання", icon: BookOpen, color: "bg-sky-500/10 text-sky-600" },
  dialogue: { label: "Діалог", icon: MessagesSquare, color: "bg-fuchsia-500/10 text-fuchsia-600" },
  word_list: { label: "Слова", icon: ListChecks, color: "bg-amber-500/10 text-amber-600" },
  game: { label: "Гра", icon: Gamepad2, color: "bg-lime-500/10 text-lime-600" },
  text: { label: "Текст", icon: BookOpen, color: "bg-slate-500/10 text-slate-600" },
};

const meta = (t: string) => TYPE_META[t] ?? TYPE_META.text;

export default function TeachLessonBuilder() {
  const { id } = useParams<{ id: string }>();
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [library, setLibrary] = useState<LibraryItem[]>([]);
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiOpen, setAiOpen] = useState(false);
  const [preview, setPreview] = useState<Block | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const load = async () => {
    if (!id) return;
    setLoading(true);
    const [{ data: l }, { data: b }, { data: lib }] = await Promise.all([
      supabase.from("tutoring_lessons").select("id,title,topic,level,status").eq("id", id).maybeSingle(),
      supabase.from("lesson_blocks").select("*").eq("lesson_id", id).order("sort_order"),
      supabase.from("library_items").select("id,type,title,description,level,topic,target_language").eq("is_published", true).order("created_at", { ascending: false }).limit(300),
    ]);
    setLesson((l as any) || null);
    setBlocks((b as any) || []);
    setLibrary((lib as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const filteredLib = useMemo(() => library.filter((it) => {
    if (typeFilter && it.type !== typeFilter) return false;
    if (q) {
      const s = q.toLowerCase();
      if (!it.title.toLowerCase().includes(s) && !(it.topic || "").toLowerCase().includes(s)) return false;
    }
    return true;
  }), [library, q, typeFilter]);

  const addFromLibrary = async (it: LibraryItem) => {
    if (!id) return;
    const { data: u } = await supabase.auth.getUser();
    const sort = blocks.length ? Math.max(...blocks.map((b) => b.sort_order)) + 1 : 0;
    const { data, error } = await supabase.from("lesson_blocks").insert({
      lesson_id: id, library_item_id: it.id, block_type: it.type, title: it.title,
      sort_order: sort, created_by: u.user?.id, settings: {},
    }).select("*").single();
    if (error) return toast.error(error.message);
    setBlocks((prev) => [...prev, data as any]);
    toast.success("Блок додано");
  };

  const addInline = async (block_type: string, title: string, payload: any) => {
    if (!id) return;
    const { data: u } = await supabase.auth.getUser();
    const sort = blocks.length ? Math.max(...blocks.map((b) => b.sort_order)) + 1 : 0;
    const { data, error } = await supabase.from("lesson_blocks").insert({
      lesson_id: id, block_type, title, inline_payload: payload,
      sort_order: sort, created_by: u.user?.id, settings: {},
    }).select("*").single();
    if (error) return toast.error(error.message);
    setBlocks((prev) => [...prev, data as any]);
  };

  const removeBlock = async (bid: string) => {
    const { error } = await supabase.from("lesson_blocks").delete().eq("id", bid);
    if (error) return toast.error(error.message);
    setBlocks((prev) => prev.filter((b) => b.id !== bid));
  };

  const onDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIdx = blocks.findIndex((b) => b.id === active.id);
    const newIdx = blocks.findIndex((b) => b.id === over.id);
    if (oldIdx < 0 || newIdx < 0) return;
    const reordered = arrayMove(blocks, oldIdx, newIdx).map((b, i) => ({ ...b, sort_order: i }));
    setBlocks(reordered);
    // persist
    await Promise.all(reordered.map((b) => supabase.from("lesson_blocks").update({ sort_order: b.sort_order }).eq("id", b.id)));
  };

  if (loading) return <div className="text-sm text-muted-foreground">Завантаження…</div>;
  if (!lesson) return <div className="text-sm text-muted-foreground">Урок не знайдено. <Link to="/teach/lessons" className="text-primary">До списку</Link></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-start gap-3">
          <Link to="/teach/lessons" className="mt-1 text-muted-foreground hover:text-foreground"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">{lesson.title}</h2>
            <div className="flex items-center gap-2 mt-1">
              {lesson.topic && <span className="text-xs text-muted-foreground">{lesson.topic}</span>}
              <Badge variant="outline" className="text-[10px]">{lesson.level}</Badge>
              <span className="text-xs text-muted-foreground">{blocks.length} блоків</span>
            </div>
          </div>
        </div>
        <Button onClick={() => setAiOpen(true)} className="gap-2">
          <Sparkles className="w-4 h-4" /> AI-блок
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4">
        {/* Library sidebar */}
        <aside className="rounded-2xl border border-border bg-card/60 p-3 space-y-3 lg:sticky lg:top-4 h-max max-h-[calc(100dvh-120px)] overflow-hidden flex flex-col">
          <div className="flex items-center gap-2 border border-border rounded-lg px-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Пошук у бібліотеці…" className="border-0 focus-visible:ring-0 px-0" />
          </div>
          <div className="flex flex-wrap gap-1">
            <button onClick={() => setTypeFilter(null)} className={`px-2 py-1 rounded-md text-[11px] border ${!typeFilter ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>Усі</button>
            {Object.entries(TYPE_META).slice(0, 8).map(([k, v]) => (
              <button key={k} onClick={() => setTypeFilter(typeFilter === k ? null : k)}
                className={`px-2 py-1 rounded-md text-[11px] border inline-flex items-center gap-1 ${typeFilter === k ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                <v.icon className="w-3 h-3" />{v.label}
              </button>
            ))}
          </div>
          <div className="overflow-y-auto -mx-1 px-1 space-y-1.5 flex-1">
            {filteredLib.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">Нічого не знайдено</p>
            ) : filteredLib.map((it) => {
              const m = meta(it.type); const Icon = m.icon;
              return (
                <button key={it.id} onClick={() => addFromLibrary(it)}
                  className="w-full text-left rounded-xl border border-border bg-background p-2.5 hover:border-primary/50 hover:bg-primary/5 transition group">
                  <div className="flex items-start gap-2">
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${m.color}`}>
                      <Icon className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-foreground line-clamp-1">{it.title}</div>
                      <div className="flex items-center gap-1 mt-0.5">
                        {it.level && <span className="text-[9px] font-semibold text-muted-foreground">{it.level}</span>}
                        {it.topic && <span className="text-[9px] text-muted-foreground line-clamp-1">· {it.topic}</span>}
                      </div>
                    </div>
                    <Plus className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition" />
                  </div>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Canvas */}
        <section className="rounded-2xl border border-border bg-card/40 p-4 min-h-[400px]">
          {blocks.length === 0 ? (
            <div className="border-2 border-dashed border-border rounded-2xl p-16 text-center">
              <p className="text-sm text-muted-foreground">Порожньо. Перетягни матеріал з бібліотеки або згенеруй AI-блок.</p>
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
              <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                <ol className="space-y-2">
                  {blocks.map((b, i) => (
                    <SortableBlock key={b.id} block={b} index={i}
                      onRemove={() => removeBlock(b.id)}
                      onPreview={() => setPreview(b)} />
                  ))}
                </ol>
              </SortableContext>
            </DndContext>
          )}
        </section>
      </div>

      {aiOpen && (
        <AIBlockDialog
          lesson={lesson}
          existingTitles={blocks.map((b) => b.title || "")}
          onClose={() => setAiOpen(false)}
          onCreate={async (payload) => { await addInline(payload.block_type, payload.title, payload); setAiOpen(false); }}
        />
      )}

      {preview && (
        <PreviewDialog block={preview} onClose={() => setPreview(null)} />
      )}
    </div>
  );
}

function SortableBlock({ block, index, onRemove, onPreview }: { block: Block; index: number; onRemove: () => void; onPreview: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 };
  const m = meta(block.block_type); const Icon = m.icon;
  return (
    <li ref={setNodeRef} style={style} className="group flex items-center gap-2 rounded-xl border border-border bg-card p-3">
      <button {...attributes} {...listeners} className="text-muted-foreground hover:text-foreground cursor-grab active:cursor-grabbing">
        <GripVertical className="w-4 h-4" />
      </button>
      <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-[11px] font-bold text-muted-foreground shrink-0">{index + 1}</div>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${m.color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground line-clamp-1">{block.title || m.label}</div>
        <div className="text-[11px] text-muted-foreground">
          {m.label}{block.library_item_id ? " · з бібліотеки" : " · власний"}
        </div>
      </div>
      <button onClick={onPreview} className="text-muted-foreground hover:text-foreground transition p-1.5" title="Прев'ю">
        <Eye className="w-4 h-4" />
      </button>
      <button onClick={onRemove} className="text-muted-foreground hover:text-destructive transition p-1.5" title="Видалити">
        <Trash2 className="w-4 h-4" />
      </button>
    </li>
  );
}

function AIBlockDialog({
  lesson, existingTitles, onClose, onCreate,
}: {
  lesson: Lesson; existingTitles: string[]; onClose: () => void;
  onCreate: (payload: any) => Promise<void>;
}) {
  const [type, setType] = useState("exercise");
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);

  const gen = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-lesson-block", {
        body: {
          lesson: { title: lesson.title, topic: lesson.topic, level: lesson.level },
          existing_titles: existingTitles.filter(Boolean),
          block_type: type,
          user_prompt: prompt.trim() || null,
        },
      });
      if (error) throw error;
      if (!data?.block) throw new Error("Порожня відповідь AI");
      await onCreate({ ...data.block, block_type: data.block.block_type || type });
      toast.success("AI-блок додано");
    } catch (e: any) {
      toast.error(e.message || "Помилка");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-display text-lg font-bold">AI-блок для уроку</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">Тип блоку</label>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {Object.entries(TYPE_META).slice(0, 8).map(([k, v]) => (
                <button key={k} onClick={() => setType(k)}
                  className={`px-2.5 py-1 rounded-lg text-xs border inline-flex items-center gap-1 ${type === k ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"}`}>
                  <v.icon className="w-3 h-3" />{v.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground">Уточнення (необов'язково)</label>
            <Input value={prompt} onChange={(e) => setPrompt(e.target.value)}
              placeholder="Напр.: короткий діалог у кав'ярні, 8 реплік" />
          </div>
          <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
            Контекст уроку: <b>{lesson.title}</b> · рівень {lesson.level}{lesson.topic ? ` · ${lesson.topic}` : ""}.
            AI врахує вже наявні {existingTitles.length} блоків, щоб не повторюватись.
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5">
          <Button variant="ghost" onClick={onClose} disabled={loading}>Скасувати</Button>
          <Button onClick={gen} disabled={loading} className="gap-2">
            <Sparkles className="w-4 h-4" />{loading ? "Генерація…" : "Згенерувати"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function PreviewDialog({ block, onClose }: { block: Block; onClose: () => void }) {
  const payload = block.inline_payload;
  return (
    <div className="fixed inset-0 z-[100] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4" onClick={onClose}>
      <div className="w-full max-w-2xl max-h-[80dvh] overflow-auto rounded-2xl border border-border bg-card p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h3 className="font-display text-lg font-bold mb-2">{block.title || meta(block.block_type).label}</h3>
        <p className="text-xs text-muted-foreground mb-4">{meta(block.block_type).label}{block.library_item_id ? " · з бібліотеки" : " · власний"}</p>
        {payload ? (
          <pre className="text-xs bg-muted/40 rounded-lg p-3 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(payload, null, 2)}</pre>
        ) : (
          <p className="text-sm text-muted-foreground">Матеріал підключено з бібліотеки. Відкриється у класі під час уроку.</p>
        )}
        <div className="flex justify-end mt-4">
          <Button variant="ghost" onClick={onClose}>Закрити</Button>
        </div>
      </div>
    </div>
  );
}
