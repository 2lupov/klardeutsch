import { useState, useEffect, useCallback, useRef } from "react";
import { Progress } from "@/components/ui/progress";

const withScroll = async (fn: () => Promise<void>) => {
  const el = document.getElementById("admin-scroll");
  const scrollTop = el?.scrollTop ?? 0;
  await fn();
  requestAnimationFrame(() => { if (el) el.scrollTop = scrollTop; });
};
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, Wand2, Loader2, Trash2, Plus, ChevronDown, ChevronUp, Eye, EyeOff, 
  Save, Sparkles, GraduationCap, Edit3, ArrowLeft, X, FileText, Table, 
  MessageSquare, Lightbulb, Languages, CopyPlus, RotateCcw
} from "lucide-react";
import { toast } from "sonner";
import TheoryRenderer, { type TheoryBlock } from "@/components/course/TheoryRenderer";

type Level = "A1" | "A2" | "B1" | "B2" | "C1";

interface CourseLesson {
  title: string;
  theory: string;
  exercises: {
    vocab_cards?: Array<{ german: string; russian: string; ukrainian?: string; article?: string; example?: string }>;
    grammar_questions?: Array<{ question: string; options: string[]; correct_index: number; explanation?: string }>;
    exercises?: Array<{ type: string; sentence?: string; blank_index?: number; options?: string[]; correct?: string; question?: string; correct_index?: number; explanation?: string }>;
    reading?: { title: string; text: string; questions: Array<{ question: string; options: string[]; correct_index: number; explanation?: string }> };
    practice_dialog?: { dialog: Array<{ speaker: string; text_de: string; text_ru: string; text_ua?: string }> };
    cultural_notes?: Array<{ title: { ru: string; ua?: string }; content: { ru: string; ua?: string } }>;
  };
}


interface ExistingCourse {
  id: string;
  title: string;
  description: string | null;
  level: string;
  price: number;
  available: boolean;
  image_url: string | null;
  created_at: string;
  lessons_count?: number;
}

/* ══════════════════════════════════════════
   Theory Block Editor (same as before)
   ══════════════════════════════════════════ */

const BLOCK_TYPES: Array<{ type: TheoryBlock["type"]; emoji: string; label: string }> = [
  { type: "heading", emoji: "📌", label: "Заголовок" },
  { type: "text", emoji: "📝", label: "Текст" },
  { type: "rule", emoji: "💡", label: "Правило" },
  { type: "table", emoji: "📊", label: "Таблица" },
  { type: "example", emoji: "💬", label: "Пример" },
  { type: "comparison", emoji: "🔄", label: "Сравнение" },
  { type: "tip", emoji: "⚡", label: "Подсказка" },
  { type: "list", emoji: "📋", label: "Список" },
];

function createEmptyBlock(type: TheoryBlock["type"]): TheoryBlock {
  switch (type) {
    case "heading": return { type, content: "", emoji: "📖" };
    case "text": return { type, content: "" };
    case "rule": return { type, title: "", content: "", emoji: "📌" };
    case "table": return { type, headers: ["", ""], rows: [["", ""]] };
    case "example": return { type, de: "", ru: "", uk: "", highlight: [] };
    case "comparison": return { type, items: [{ de: "", ru: "", uk: "" }] };
    case "tip": return { type, variant: "info", title: "", content: "" };
    case "list": return { type, items_list: [""] };
    default: return { type, content: "" };
  }
}

const inputCls = "w-full px-2 py-1.5 rounded-lg bg-secondary text-foreground border border-border text-xs focus:border-primary focus:outline-none";
const smallInputCls = "px-2 py-1 rounded-lg bg-secondary text-foreground border border-border text-[10px] focus:border-primary focus:outline-none";

const BlockEditor = ({ block, onChange, onRemove, onDuplicate, onSplit, isCollapsed, onToggleCollapse }: { 
  block: TheoryBlock; onChange: (b: TheoryBlock) => void; onRemove: () => void; 
  onDuplicate: () => void; onSplit?: () => void; isCollapsed: boolean; onToggleCollapse: () => void;
}) => {
  const update = (patch: Partial<TheoryBlock>) => onChange({ ...block, ...patch } as TheoryBlock);
  const bt = BLOCK_TYPES.find(b => b.type === block.type);
  const preview = block.content || block.title || block.de || (block.items_list?.[0]) || (block.headers?.join(" | ")) || "";

  return (
    <div className="p-3 rounded-xl bg-muted/30 border border-border/30 space-y-2 relative group">
      <div className="flex items-center justify-between">
        <button onClick={onToggleCollapse} className="flex items-center gap-1.5 text-left flex-1 min-w-0">
          <span className="text-[10px] font-display font-bold text-muted-foreground uppercase tracking-wider shrink-0">
            {bt?.emoji} {bt?.label}
          </span>
          {isCollapsed && preview && (
            <span className="text-[10px] text-muted-foreground/60 truncate">{preview.slice(0, 50)}{preview.length > 50 ? "…" : ""}</span>
          )}
          {isCollapsed ? <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0" /> : <ChevronUp className="w-3 h-3 text-muted-foreground shrink-0" />}
        </button>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={onDuplicate} title="Дублировать" className="p-1 text-muted-foreground hover:text-primary transition-colors"><CopyPlus className="w-3.5 h-3.5" /></button>
          {onSplit && <button onClick={onSplit} title="Разделить" className="p-1 text-muted-foreground hover:text-primary transition-colors"><FileText className="w-3.5 h-3.5" /></button>}
          <button onClick={onRemove} className="p-1 text-muted-foreground hover:text-destructive transition-colors"><X className="w-3.5 h-3.5" /></button>
        </div>
      </div>

      {isCollapsed ? null : (<>


      {block.type === "heading" && (
        <div className="flex gap-2">
          <input value={block.emoji || ""} onChange={e => update({ emoji: e.target.value })} placeholder="📖" className="w-12 px-2 py-1.5 rounded-lg bg-secondary text-foreground border border-border text-sm text-center" />
          <input value={block.content || ""} onChange={e => update({ content: e.target.value })} placeholder="Заголовок раздела" className={`flex-1 ${inputCls}`} />
        </div>
      )}

      {block.type === "text" && (
        <textarea value={block.content || ""} onChange={e => update({ content: e.target.value })} placeholder="Текст параграфа..." rows={3} className={`${inputCls} resize-y`} />
      )}

      {block.type === "rule" && (
        <>
          <div className="flex gap-2">
            <input value={block.emoji || ""} onChange={e => update({ emoji: e.target.value })} placeholder="📌" className="w-12 px-2 py-1.5 rounded-lg bg-secondary text-foreground border border-border text-sm text-center" />
            <input value={block.title || ""} onChange={e => update({ title: e.target.value })} placeholder="Название правила" className={`flex-1 ${inputCls}`} />
          </div>
          <textarea value={block.content || ""} onChange={e => update({ content: e.target.value })} placeholder="Описание правила..." rows={2} className={`${inputCls} resize-y`} />
        </>
      )}

      {block.type === "table" && (
        <>
          <div className="flex gap-1 items-center">
            {block.headers?.map((h, i) => (
              <input key={i} value={h} onChange={e => { const newH = [...(block.headers || [])]; newH[i] = e.target.value; update({ headers: newH }); }} placeholder={`Колонка ${i + 1}`} className={`flex-1 ${smallInputCls} font-bold`} />
            ))}
            <button onClick={() => update({ headers: [...(block.headers || []), ""], rows: (block.rows || []).map(r => [...r, ""]) })} className="p-1 text-primary"><Plus className="w-3 h-3" /></button>
          </div>
          {block.rows?.map((row, ri) => (
            <div key={ri} className="flex gap-1 items-center">
              {row.map((cell, ci) => (
                <input key={ci} value={cell} onChange={e => { const newR = [...(block.rows || [])]; newR[ri] = [...newR[ri]]; newR[ri][ci] = e.target.value; update({ rows: newR }); }} className={`flex-1 ${smallInputCls}`} />
              ))}
              <button onClick={() => update({ rows: (block.rows || []).filter((_, i) => i !== ri) })} className="p-1 text-destructive/60"><X className="w-3 h-3" /></button>
            </div>
          ))}
          <button onClick={() => update({ rows: [...(block.rows || []), (block.headers || []).map(() => "")] })} className="text-[10px] text-primary flex items-center gap-1"><Plus className="w-3 h-3" /> Строка</button>
        </>
      )}

      {block.type === "example" && (
        <>
          <input value={block.de || ""} onChange={e => update({ de: e.target.value })} placeholder="Немецкий: Ich gehe nach Hause." className={inputCls} />
          <div className="flex gap-2">
            <input value={block.ru || ""} onChange={e => update({ ru: e.target.value })} placeholder="🇷🇺 Перевод" className={`flex-1 ${smallInputCls}`} />
            <input value={block.uk || ""} onChange={e => update({ uk: e.target.value })} placeholder="🇺🇦 Переклад" className={`flex-1 ${smallInputCls}`} />
          </div>
          <input value={(block.highlight || []).join(", ")} onChange={e => update({ highlight: e.target.value.split(",").map(w => w.trim()).filter(Boolean) })} placeholder="Выделить слова (через запятую)" className={smallInputCls} />
        </>
      )}

      {block.type === "comparison" && (
        <>
          {block.items?.map((item, i) => (
            <div key={i} className="flex gap-1 items-center">
              <input value={item.de} onChange={e => { const n = [...(block.items || [])]; n[i] = { ...n[i], de: e.target.value }; update({ items: n }); }} placeholder="🇩🇪 DE" className={`flex-1 ${smallInputCls}`} />
              <input value={item.ru || ""} onChange={e => { const n = [...(block.items || [])]; n[i] = { ...n[i], ru: e.target.value }; update({ items: n }); }} placeholder="🇷🇺 RU" className={`flex-1 ${smallInputCls}`} />
              <input value={item.uk || ""} onChange={e => { const n = [...(block.items || [])]; n[i] = { ...n[i], uk: e.target.value }; update({ items: n }); }} placeholder="🇺🇦 UK" className={`flex-1 ${smallInputCls}`} />
              <button onClick={() => update({ items: (block.items || []).filter((_, j) => j !== i) })} className="p-1 text-destructive/60"><X className="w-3 h-3" /></button>
            </div>
          ))}
          <button onClick={() => update({ items: [...(block.items || []), { de: "", ru: "", uk: "" }] })} className="text-[10px] text-primary flex items-center gap-1"><Plus className="w-3 h-3" /> Сравнение</button>
        </>
      )}

      {block.type === "tip" && (
        <>
          <div className="flex gap-2">
            <select value={block.variant || "info"} onChange={e => update({ variant: e.target.value as any })} className={`${smallInputCls} w-auto`}>
              <option value="info">💡 Совет</option>
              <option value="warning">⚠️ Внимание</option>
              <option value="remember">📝 Запомни</option>
            </select>
            <input value={block.title || ""} onChange={e => update({ title: e.target.value })} placeholder="Заголовок (необяз.)" className={`flex-1 ${smallInputCls}`} />
          </div>
          <textarea value={block.content || ""} onChange={e => update({ content: e.target.value })} placeholder="Содержание..." rows={2} className={`${inputCls} resize-y`} />
        </>
      )}

      {block.type === "list" && (
        <>
          {block.items_list?.map((item, i) => (
            <div key={i} className="flex gap-1 items-center">
              <span className="text-primary text-xs">•</span>
              <input value={item} onChange={e => { const n = [...(block.items_list || [])]; n[i] = e.target.value; update({ items_list: n }); }} className={`flex-1 ${smallInputCls}`} />
              <button onClick={() => update({ items_list: (block.items_list || []).filter((_, j) => j !== i) })} className="p-1 text-destructive/60"><X className="w-3 h-3" /></button>
            </div>
          ))}
          <button onClick={() => update({ items_list: [...(block.items_list || []), ""] })} className="text-[10px] text-primary flex items-center gap-1"><Plus className="w-3 h-3" /> Пункт</button>
        </>
      )}
      </>)}
    </div>
  );
};

const TheoryEditor = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [blocks, setBlocks] = useState<TheoryBlock[]>(() => {
    try { const p = JSON.parse(value); if (Array.isArray(p)) return p; } catch {}
    return value ? [{ type: "text" as const, content: value }] : [];
  });
  const [showPreview, setShowPreview] = useState(false);
  const [collapsedBlocks, setCollapsedBlocks] = useState<Set<number>>(new Set());

  const sync = (newBlocks: TheoryBlock[]) => { setBlocks(newBlocks); onChange(JSON.stringify(newBlocks)); };
  const addBlock = (type: TheoryBlock["type"]) => sync([...blocks, createEmptyBlock(type)]);
  const insertBlock = (afterIndex: number, type: TheoryBlock["type"]) => {
    const n = [...blocks]; n.splice(afterIndex + 1, 0, createEmptyBlock(type)); sync(n);
  };
  const updateBlock = (i: number, b: TheoryBlock) => { const n = [...blocks]; n[i] = b; sync(n); };
  const removeBlock = (i: number) => sync(blocks.filter((_, j) => j !== i));
  const duplicateBlock = (i: number) => { const n = [...blocks]; n.splice(i + 1, 0, { ...JSON.parse(JSON.stringify(blocks[i])) }); sync(n); };
  const splitBlock = (i: number) => {
    const block = blocks[i];
    if (block.type !== "text" || !block.content) return;
    const lines = block.content.split("\n").filter(Boolean);
    if (lines.length <= 1) return;
    const mid = Math.ceil(lines.length / 2);
    const n = [...blocks];
    n.splice(i, 1, { type: "text", content: lines.slice(0, mid).join("\n") }, { type: "text", content: lines.slice(mid).join("\n") });
    sync(n);
  };
  const moveBlock = (i: number, dir: -1 | 1) => {
    const ni = i + dir;
    if (ni < 0 || ni >= blocks.length) return;
    const n = [...blocks]; [n[i], n[ni]] = [n[ni], n[i]]; sync(n);
  };
  const toggleCollapse = (i: number) => {
    setCollapsedBlocks(prev => { const s = new Set(prev); s.has(i) ? s.delete(i) : s.add(i); return s; });
  };
  const collapseAll = () => setCollapsedBlocks(new Set(blocks.map((_, i) => i)));
  const expandAll = () => setCollapsedBlocks(new Set());

  const [insertMenuAt, setInsertMenuAt] = useState<number | null>(null);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-bold uppercase">Теория ({blocks.length} блоков)</span>
        <div className="flex items-center gap-2">
          {blocks.length > 1 && (
            <button onClick={collapsedBlocks.size === blocks.length ? expandAll : collapseAll} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1">
              {collapsedBlocks.size === blocks.length ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
              {collapsedBlocks.size === blocks.length ? "Развернуть" : "Свернуть"}
            </button>
          )}
          <button onClick={() => setShowPreview(!showPreview)} className="text-[10px] text-primary flex items-center gap-1">
            {showPreview ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
            {showPreview ? "Редактор" : "Превью"}
          </button>
        </div>
      </div>

      {showPreview ? (
        <div className="p-4 rounded-xl bg-secondary/50 border border-border/30">
          <TheoryRenderer theory={JSON.stringify(blocks)} lang="ru" />
        </div>
      ) : (
        <>
          {blocks.map((block, i) => (
            <div key={i}>
              <div className="flex gap-1">
                <div className="flex flex-col gap-0.5 pt-3">
                  <button onClick={() => moveBlock(i, -1)} disabled={i === 0} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronUp className="w-3 h-3" /></button>
                  <button onClick={() => moveBlock(i, 1)} disabled={i === blocks.length - 1} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronDown className="w-3 h-3" /></button>
                </div>
                <div className="flex-1">
                  <BlockEditor
                    block={block}
                    onChange={b => updateBlock(i, b)}
                    onRemove={() => removeBlock(i)}
                    onDuplicate={() => duplicateBlock(i)}
                    onSplit={block.type === "text" ? () => splitBlock(i) : undefined}
                    isCollapsed={collapsedBlocks.has(i)}
                    onToggleCollapse={() => toggleCollapse(i)}
                  />
                </div>
              </div>
              {/* Insert between blocks */}
              <div className="flex justify-center py-0.5 group/insert">
                {insertMenuAt === i ? (
                  <div className="flex flex-wrap gap-1 p-1.5 rounded-lg bg-secondary border border-border animate-slide-up">
                    {BLOCK_TYPES.map(bt => (
                      <button key={bt.type} onClick={() => { insertBlock(i, bt.type); setInsertMenuAt(null); }} className="px-1.5 py-0.5 rounded bg-background border border-border/50 text-[9px] text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                        {bt.emoji}
                      </button>
                    ))}
                    <button onClick={() => setInsertMenuAt(null)} className="px-1.5 py-0.5 text-[9px] text-muted-foreground hover:text-destructive"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <button onClick={() => setInsertMenuAt(i)} className="opacity-0 group-hover/insert:opacity-100 transition-opacity p-0.5 text-muted-foreground hover:text-primary">
                    <Plus className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
          <div className="flex flex-wrap gap-1">
            {BLOCK_TYPES.map(bt => (
              <button key={bt.type} onClick={() => addBlock(bt.type)} className="px-2 py-1 rounded-lg bg-secondary border border-border text-[10px] text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors">
                {bt.emoji} {bt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
};
/* ══════════════════════════════════════════
   Exercises Editor (fill-in-the-blank + MC)
   ══════════════════════════════════════════ */

const ExercisesEditor = ({ exercises, onChange }: { exercises: CourseLesson["exercises"]["exercises"]; onChange: (ex: CourseLesson["exercises"]["exercises"]) => void }) => {
  const items = exercises || [];

  const addCloze = () => onChange([...items, { type: "cloze", sentence: "", blank_index: 0, options: ["", "", "", ""], correct: "" }]);
  const addMC = () => onChange([...items, { type: "mc", question: "", options: ["", "", "", ""], correct_index: 0, explanation: "" }]);

  return (
    <div className="space-y-2">
      {items.map((ex, i) => (
        <div key={i} className="p-3 rounded-xl bg-muted/30 border border-border/20 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-muted-foreground uppercase">
              {ex.type === "cloze" ? "✏️ Заполни пропуск" : "❓ Выбери ответ"} #{i + 1}
            </span>
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="p-1 text-destructive/60 hover:text-destructive"><X className="w-3 h-3" /></button>
          </div>

          {ex.type === "cloze" ? (
            <>
              <input value={ex.sentence || ""} onChange={e => { const n = [...items]; n[i] = { ...n[i], sentence: e.target.value }; onChange(n); }} placeholder="Предложение с ___ (пропуск)" className={inputCls} />
              <input value={ex.correct || ""} onChange={e => { const n = [...items]; n[i] = { ...n[i], correct: e.target.value }; onChange(n); }} placeholder="Правильный ответ" className={inputCls} />
              <div className="flex gap-1 flex-wrap">
                {(ex.options || []).map((o, oi) => (
                  <input key={oi} value={o} onChange={e => { const n = [...items]; n[i] = { ...n[i], options: (n[i].options || []).map((x, j) => j === oi ? e.target.value : x) }; onChange(n); }} placeholder={`Вариант ${oi + 1}`} className={`w-24 ${smallInputCls}`} />
                ))}
              </div>
            </>
          ) : (
            <>
              <input value={ex.question || ""} onChange={e => { const n = [...items]; n[i] = { ...n[i], question: e.target.value }; onChange(n); }} placeholder="Вопрос" className={inputCls} />
              <div className="flex gap-1 flex-wrap">
                {(ex.options || []).map((o, oi) => (
                  <div key={oi} className="flex items-center gap-1">
                    <input type="radio" checked={ex.correct_index === oi} onChange={() => { const n = [...items]; n[i] = { ...n[i], correct_index: oi }; onChange(n); }} className="accent-primary" />
                    <input value={o} onChange={e => { const n = [...items]; n[i] = { ...n[i], options: (n[i].options || []).map((x, j) => j === oi ? e.target.value : x) }; onChange(n); }} className={`w-24 ${smallInputCls}`} />
                  </div>
                ))}
              </div>
              <input value={ex.explanation || ""} onChange={e => { const n = [...items]; n[i] = { ...n[i], explanation: e.target.value }; onChange(n); }} placeholder="Пояснение (необяз.)" className={smallInputCls} />
            </>
          )}
        </div>
      ))}

      <div className="flex gap-2">
        <button onClick={addCloze} className="flex-1 py-2 rounded-xl bg-secondary border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 flex items-center justify-center gap-1.5 transition-colors">
          <Plus className="w-3 h-3" /> ✏️ Пропуск
        </button>
        <button onClick={addMC} className="flex-1 py-2 rounded-xl bg-secondary border border-border text-xs text-muted-foreground hover:text-foreground hover:border-primary/30 flex items-center justify-center gap-1.5 transition-colors">
          <Plus className="w-3 h-3" /> ❓ Тест
        </button>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════
   Lesson Detail Editor (with all tabs)
   ══════════════════════════════════════════ */

const LessonEditor = ({ lesson, onChange, level }: { lesson: CourseLesson; onChange: (l: CourseLesson) => void; level?: string }) => {
  const [tab, setTab] = useState<"theory" | "vocab" | "exercises" | "grammar" | "reading" | "dialog" | "culture">("theory");
  const [generating, setGenerating] = useState<string | null>(null);
  const ex = lesson.exercises || {};

  const handleAIGenerate = async (section: string) => {
    if (!level) { toast.error("Уровень курса не определён"); return; }
    setGenerating(section);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { toast.error("Нет сессии"); return; }

      const existingMap: Record<string, any> = {
        vocab: ex.vocab_cards,
        exercises: ex.exercises,
        grammar: ex.grammar_questions,
      };

      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-lesson-section`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          section,
          level,
          lesson_title: lesson.title,
          lesson_theory: lesson.theory,
          existing_content: existingMap[section] || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        toast.error(err.error || "Ошибка генерации");
        return;
      }

      const { result } = await res.json();

      // Merge generated content with existing
      const newEx = { ...ex };
      if (section === "vocab" && result.vocab_cards) {
        newEx.vocab_cards = [...(ex.vocab_cards || []), ...result.vocab_cards];
      } else if (section === "exercises" && result.exercises) {
        newEx.exercises = [...(ex.exercises || []), ...result.exercises];
      } else if (section === "grammar" && result.grammar_questions) {
        newEx.grammar_questions = [...(ex.grammar_questions || []), ...result.grammar_questions];
      } else if (section === "reading" && result.reading) {
        newEx.reading = result.reading;
      } else if (section === "dialog" && result.dialog) {
        newEx.practice_dialog = { dialog: result.dialog };
      } else if (section === "culture" && result.cultural_notes) {
        newEx.cultural_notes = [...(ex.cultural_notes || []), ...result.cultural_notes];
      }

      onChange({ ...lesson, exercises: newEx });
      toast.success("✨ Контент сгенерирован!");
    } catch (e: any) {
      toast.error(e.message || "Ошибка");
    } finally {
      setGenerating(null);
    }
  };

  const aiBtn = (section: string, label: string) => (
    <button
      onClick={() => handleAIGenerate(section)}
      disabled={!!generating}
      className="w-full py-2 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/30 text-xs font-semibold text-primary flex items-center justify-center gap-1.5 hover:from-primary/30 hover:to-accent/30 transition-all disabled:opacity-40"
    >
      {generating === section ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
      {generating === section ? "Генерация..." : label}
    </button>
  );

  const tabs = [
    { k: "theory", l: "📖 Теория", count: null },
    { k: "vocab", l: "📚 Слова", count: (ex.vocab_cards || []).length },
    { k: "exercises", l: "✏️ Упражнения", count: (ex.exercises || []).length },
    { k: "grammar", l: "📝 Грамматика", count: (ex.grammar_questions || []).length },
    { k: "reading", l: "📕 Чтение", count: ex.reading ? 1 : 0 },
    { k: "dialog", l: "💬 Диалог", count: (ex.practice_dialog?.dialog || []).length },
    { k: "culture", l: "🌍 Культура", count: (ex.cultural_notes || []).length },
  ];

  return (
    <div className="space-y-3 mt-3">
      <div className="flex gap-1 flex-wrap">
        {tabs.map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${tab === t.k ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-muted-foreground hover:text-foreground"}`}>
            {t.l}{t.count !== null ? ` (${t.count})` : ""}
          </button>
        ))}
      </div>

      {tab === "theory" && (
        <TheoryEditor value={lesson.theory || ""} onChange={v => onChange({ ...lesson, theory: v })} />
      )}

      {tab === "vocab" && (
        <div className="space-y-2">
          {(ex.vocab_cards || []).map((v, i) => (
            <div key={i} className="flex gap-1 items-center flex-wrap p-2 rounded-xl bg-muted/30 border border-border/20">
              <input value={v.article || ""} onChange={e => { const n = [...(ex.vocab_cards || [])]; n[i] = { ...n[i], article: e.target.value }; onChange({ ...lesson, exercises: { ...ex, vocab_cards: n } }); }} placeholder="der" className={`w-10 text-center ${smallInputCls}`} />
              <input value={v.german} onChange={e => { const n = [...(ex.vocab_cards || [])]; n[i] = { ...n[i], german: e.target.value }; onChange({ ...lesson, exercises: { ...ex, vocab_cards: n } }); }} placeholder="🇩🇪 Deutsch" className={`flex-1 min-w-[70px] ${smallInputCls}`} />
              <input value={v.russian} onChange={e => { const n = [...(ex.vocab_cards || [])]; n[i] = { ...n[i], russian: e.target.value }; onChange({ ...lesson, exercises: { ...ex, vocab_cards: n } }); }} placeholder="🇷🇺 Русский" className={`flex-1 min-w-[70px] ${smallInputCls}`} />
              <input value={v.ukrainian || ""} onChange={e => { const n = [...(ex.vocab_cards || [])]; n[i] = { ...n[i], ukrainian: e.target.value }; onChange({ ...lesson, exercises: { ...ex, vocab_cards: n } }); }} placeholder="🇺🇦 Українська" className={`flex-1 min-w-[70px] ${smallInputCls}`} />
              <input value={v.example || ""} onChange={e => { const n = [...(ex.vocab_cards || [])]; n[i] = { ...n[i], example: e.target.value }; onChange({ ...lesson, exercises: { ...ex, vocab_cards: n } }); }} placeholder="Пример" className={`w-full mt-1 ${smallInputCls}`} />
              <button onClick={() => onChange({ ...lesson, exercises: { ...ex, vocab_cards: (ex.vocab_cards || []).filter((_, j) => j !== i) } })} className="p-1 text-destructive/60"><X className="w-3 h-3" /></button>
            </div>
          ))}
          <button onClick={() => onChange({ ...lesson, exercises: { ...ex, vocab_cards: [...(ex.vocab_cards || []), { german: "", russian: "", ukrainian: "", article: "", example: "" }] } })} className="w-full py-2 rounded-xl bg-secondary border border-border text-xs text-primary flex items-center justify-center gap-1.5 hover:border-primary/30 transition-colors">
            <Plus className="w-3 h-3" /> Добавить слово
          </button>
          {level && aiBtn("vocab", "🤖 Догенерировать слова через ИИ")}
        </div>
      )}

      {tab === "exercises" && (
        <div className="space-y-2">
          <ExercisesEditor
            exercises={ex.exercises}
            onChange={exercises => onChange({ ...lesson, exercises: { ...ex, exercises } })}
          />
          {level && aiBtn("exercises", "🤖 Догенерировать упражнения через ИИ")}
        </div>
      )}

      {tab === "grammar" && (
        <div className="space-y-2">
          {(ex.grammar_questions || []).map((q, i) => (
            <div key={i} className="p-3 rounded-xl bg-muted/30 border border-border/20 space-y-1.5">
              <input value={q.question} onChange={e => { const n = [...(ex.grammar_questions || [])]; n[i] = { ...n[i], question: e.target.value }; onChange({ ...lesson, exercises: { ...ex, grammar_questions: n } }); }} placeholder="Вопрос с ___" className={inputCls} />
              <div className="flex gap-1 flex-wrap">
                {q.options.map((o, oi) => (
                  <div key={oi} className="flex items-center gap-1">
                    <input type="radio" checked={q.correct_index === oi} onChange={() => { const n = [...(ex.grammar_questions || [])]; n[i] = { ...n[i], correct_index: oi }; onChange({ ...lesson, exercises: { ...ex, grammar_questions: n } }); }} className="accent-primary" />
                    <input value={o} onChange={e => { const n = [...(ex.grammar_questions || [])]; n[i] = { ...n[i], options: n[i].options.map((x, j) => j === oi ? e.target.value : x) }; onChange({ ...lesson, exercises: { ...ex, grammar_questions: n } }); }} className={`w-24 ${smallInputCls}`} />
                  </div>
                ))}
              </div>
              <input value={q.explanation || ""} onChange={e => { const n = [...(ex.grammar_questions || [])]; n[i] = { ...n[i], explanation: e.target.value }; onChange({ ...lesson, exercises: { ...ex, grammar_questions: n } }); }} placeholder="Пояснение" className={smallInputCls} />
              <button onClick={() => onChange({ ...lesson, exercises: { ...ex, grammar_questions: (ex.grammar_questions || []).filter((_, j) => j !== i) } })} className="text-[10px] text-destructive flex items-center gap-1"><Trash2 className="w-3 h-3" /> Удалить</button>
            </div>
          ))}
          <button onClick={() => onChange({ ...lesson, exercises: { ...ex, grammar_questions: [...(ex.grammar_questions || []), { question: "", options: ["", "", "", ""], correct_index: 0, explanation: "" }] } })} className="w-full py-2 rounded-xl bg-secondary border border-border text-xs text-primary flex items-center justify-center gap-1.5 hover:border-primary/30 transition-colors">
            <Plus className="w-3 h-3" /> Вопрос по грамматике
          </button>
          {level && aiBtn("grammar", "🤖 Догенерировать грамматику через ИИ")}
        </div>
      )}

      {tab === "reading" && (
        <div className="space-y-2">
          <input value={ex.reading?.title || ""} onChange={e => onChange({ ...lesson, exercises: { ...ex, reading: { ...(ex.reading || { text: "", questions: [] }), title: e.target.value } } })} placeholder="Заголовок текста" className={inputCls} />
          <textarea value={ex.reading?.text || ""} onChange={e => onChange({ ...lesson, exercises: { ...ex, reading: { ...(ex.reading || { title: "", questions: [] }), text: e.target.value } } })} placeholder="Текст для чтения..." rows={5} className={`${inputCls} resize-y`} />
          
          <p className="text-[10px] text-muted-foreground font-bold uppercase mt-2">Вопросы к тексту ({ex.reading?.questions?.length || 0})</p>
          {(ex.reading?.questions || []).map((q, qi) => (
            <div key={qi} className="p-2 rounded-xl bg-muted/20 border border-border/20 space-y-1">
              <input value={q.question} onChange={e => {
                const qs = [...(ex.reading?.questions || [])];
                qs[qi] = { ...qs[qi], question: e.target.value };
                onChange({ ...lesson, exercises: { ...ex, reading: { ...(ex.reading || { title: "", text: "" }), questions: qs } } });
              }} placeholder="Вопрос" className={inputCls} />
              <div className="flex gap-1 flex-wrap">
                {q.options.map((o, oi) => (
                  <div key={oi} className="flex items-center gap-1">
                    <input type="radio" checked={q.correct_index === oi} onChange={() => {
                      const qs = [...(ex.reading?.questions || [])];
                      qs[qi] = { ...qs[qi], correct_index: oi };
                      onChange({ ...lesson, exercises: { ...ex, reading: { ...(ex.reading || { title: "", text: "" }), questions: qs } } });
                    }} className="accent-primary" />
                    <input value={o} onChange={e => {
                      const qs = [...(ex.reading?.questions || [])];
                      qs[qi] = { ...qs[qi], options: qs[qi].options.map((x, j) => j === oi ? e.target.value : x) };
                      onChange({ ...lesson, exercises: { ...ex, reading: { ...(ex.reading || { title: "", text: "" }), questions: qs } } });
                    }} className={`w-24 ${smallInputCls}`} />
                  </div>
                ))}
              </div>
              <button onClick={() => {
                const qs = (ex.reading?.questions || []).filter((_, j) => j !== qi);
                onChange({ ...lesson, exercises: { ...ex, reading: { ...(ex.reading || { title: "", text: "" }), questions: qs } } });
              }} className="text-[10px] text-destructive flex items-center gap-1"><X className="w-3 h-3" /> Удалить</button>
            </div>
          ))}
          <button onClick={() => {
            const qs = [...(ex.reading?.questions || []), { question: "", options: ["", "", "", ""], correct_index: 0, explanation: "" }];
            onChange({ ...lesson, exercises: { ...ex, reading: { ...(ex.reading || { title: "", text: "" }), questions: qs } } });
          }} className="text-xs text-primary flex items-center gap-1"><Plus className="w-3 h-3" /> Вопрос к тексту</button>
          {level && aiBtn("reading", "🤖 Сгенерировать текст через ИИ")}
        </div>
      )}

      {tab === "dialog" && (
        <div className="space-y-2">
          {(ex.practice_dialog?.dialog || []).map((line, i) => (
            <div key={i} className="flex gap-1 items-center p-2 rounded-xl bg-muted/30 border border-border/20">
              <select value={line.speaker} onChange={e => { const d = [...(ex.practice_dialog?.dialog || [])]; d[i] = { ...d[i], speaker: e.target.value }; onChange({ ...lesson, exercises: { ...ex, practice_dialog: { dialog: d } } }); }} className={`w-12 ${smallInputCls}`}>
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
              <input value={line.text_de} onChange={e => { const d = [...(ex.practice_dialog?.dialog || [])]; d[i] = { ...d[i], text_de: e.target.value }; onChange({ ...lesson, exercises: { ...ex, practice_dialog: { dialog: d } } }); }} placeholder="🇩🇪 DE" className={`flex-1 ${smallInputCls}`} />
              <input value={line.text_ru} onChange={e => { const d = [...(ex.practice_dialog?.dialog || [])]; d[i] = { ...d[i], text_ru: e.target.value }; onChange({ ...lesson, exercises: { ...ex, practice_dialog: { dialog: d } } }); }} placeholder="🇷🇺 RU" className={`flex-1 ${smallInputCls}`} />
              <input value={line.text_ua || ""} onChange={e => { const d = [...(ex.practice_dialog?.dialog || [])]; d[i] = { ...d[i], text_ua: e.target.value }; onChange({ ...lesson, exercises: { ...ex, practice_dialog: { dialog: d } } }); }} placeholder="🇺🇦 UK" className={`flex-1 ${smallInputCls}`} />
              <button onClick={() => { const d = (ex.practice_dialog?.dialog || []).filter((_, j) => j !== i); onChange({ ...lesson, exercises: { ...ex, practice_dialog: { dialog: d } } }); }} className="p-1 text-destructive/60"><X className="w-3 h-3" /></button>
            </div>
          ))}
          <button onClick={() => { const d = [...(ex.practice_dialog?.dialog || []), { speaker: "A", text_de: "", text_ru: "", text_ua: "" }]; onChange({ ...lesson, exercises: { ...ex, practice_dialog: { dialog: d } } }); }} className="w-full py-2 rounded-xl bg-secondary border border-border text-xs text-primary flex items-center justify-center gap-1.5 hover:border-primary/30 transition-colors">
            <Plus className="w-3 h-3" /> Реплика
          </button>
          {level && aiBtn("dialog", "🤖 Сгенерировать диалог через ИИ")}
        </div>
      )}

      {tab === "culture" && (
        <div className="space-y-2">
          {(ex.cultural_notes || []).map((note, i) => (
            <div key={i} className="p-3 rounded-xl bg-muted/30 border border-border/20 space-y-1.5">
              <input value={note.title?.ru || ""} onChange={e => { const n = [...(ex.cultural_notes || [])]; n[i] = { ...n[i], title: { ...n[i].title, ru: e.target.value } }; onChange({ ...lesson, exercises: { ...ex, cultural_notes: n } }); }} placeholder="🇷🇺 Заголовок" className={inputCls} />
              <input value={note.title?.ua || ""} onChange={e => { const n = [...(ex.cultural_notes || [])]; n[i] = { ...n[i], title: { ...n[i].title, ua: e.target.value } }; onChange({ ...lesson, exercises: { ...ex, cultural_notes: n } }); }} placeholder="🇺🇦 Заголовок" className={inputCls} />
              <textarea value={note.content?.ru || ""} onChange={e => { const n = [...(ex.cultural_notes || [])]; n[i] = { ...n[i], content: { ...n[i].content, ru: e.target.value } }; onChange({ ...lesson, exercises: { ...ex, cultural_notes: n } }); }} placeholder="🇷🇺 Контент..." rows={2} className={`${inputCls} resize-y`} />
              <textarea value={note.content?.ua || ""} onChange={e => { const n = [...(ex.cultural_notes || [])]; n[i] = { ...n[i], content: { ...n[i].content, ua: e.target.value } }; onChange({ ...lesson, exercises: { ...ex, cultural_notes: n } }); }} placeholder="🇺🇦 Контент..." rows={2} className={`${inputCls} resize-y`} />
              <button onClick={() => onChange({ ...lesson, exercises: { ...ex, cultural_notes: (ex.cultural_notes || []).filter((_, j) => j !== i) } })} className="text-[10px] text-destructive flex items-center gap-1"><Trash2 className="w-3 h-3" /> Удалить</button>
            </div>
          ))}
          <button onClick={() => onChange({ ...lesson, exercises: { ...ex, cultural_notes: [...(ex.cultural_notes || []), { title: { ru: "", ua: "" }, content: { ru: "", ua: "" } }] } })} className="w-full py-2 rounded-xl bg-secondary border border-border text-xs text-primary flex items-center justify-center gap-1.5 hover:border-primary/30 transition-colors">
            <Plus className="w-3 h-3" /> Культурный факт
          </button>
          {level && aiBtn("culture", "🤖 Сгенерировать культурные заметки через ИИ")}
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════
   Main CourseEditor
   ══════════════════════════════════════════ */

const CourseEditor = ({ level }: { level: Level }) => {
  const [step, setStep] = useState<"list" | "create" | "edit">("list");
  const [courseName, setCourseName] = useState("");
  const [description, setDescription] = useState("");
  const [lessonsCount, setLessonsCount] = useState("25");
  const [existingCourses, setExistingCourses] = useState<ExistingCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editLessons, setEditLessons] = useState<Array<{ id: string; title: string; theory: string; exercises: any; sort_order: number; lesson_type?: string; description?: string | null; estimated_minutes?: number; xp_reward?: number; coins_reward?: number; content?: any }>>([]);
  const [editCourse, setEditCourse] = useState<ExistingCourse | null>(null);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);
  const [savingNewLesson, setSavingNewLesson] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [genProgress, setGenProgress] = useState(0);
  const [genTotal, setGenTotal] = useState(0);
  const [genLog, setGenLog] = useState<string[]>([]);
  const genAbortRef = useRef(false);
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
  const [creatingCourse, setCreatingCourse] = useState(false);

  // Create course and auto-generate lessons
  const handleCreateAndGenerate = async () => {
    if (!courseName.trim()) { toast.error("Введите название курса"); return; }
    
    const count = parseInt(lessonsCount) || 25;
    if (!confirm(`Создать курс "${courseName}" и сгенерировать ${count} уроков? Это займёт несколько минут.`)) return;
    
    setCreatingCourse(true);
    
    try {
      // Create the course first
      const { data: courseRow, error: courseErr } = await supabase.from("courses").insert({
        title: courseName.trim(),
        description: description.trim() || null,
        level,
        available: false,
        price: level === "A1" ? 150 : level === "A2" ? 250 : level === "B1" ? 400 : level === "B2" ? 500 : 650,
      } as any).select("*").single();
      
      if (courseErr) throw courseErr;
      
      toast.success(`Курс создан! Начинаем генерацию ${count} уроков...`);
      
      // Open edit mode and start generation
      setEditCourse(courseRow as ExistingCourse);
      setEditingCourseId((courseRow as any).id);
      setEditLessons([]);
      setStep("edit");
      
      // Start auto-generation
      await generateAllLessons(courseRow as ExistingCourse, 0, count);
      
      // Reset form
      setCourseName("");
      setDescription("");
      setLessonsCount("25");
      
    } catch (err: any) {
      toast.error("Ошибка создания курса: " + err.message);
    }
    
    setCreatingCourse(false);
  };

  const generateAllLessons = async (course: ExistingCourse, existingCount = 0, targetCount = 25) => {
    const remaining = targetCount - existingCount;
    if (remaining <= 0) { toast.info("Все уроки уже созданы!"); return; }
    
    setGenerating(true);
    genAbortRef.current = false;
    setGenTotal(remaining);
    setGenProgress(0);
    setGenLog([existingCount > 0 ? `📚 Уже есть ${existingCount} уроков, догенерируем ещё ${remaining}...` : `⏳ Начинаем генерацию ${remaining} уроков...`]);

    let retries = 0;
    for (let i = 0; i < remaining; i++) {
      if (genAbortRef.current) { setGenLog(prev => [...prev, `🛑 Остановлено пользователем`]); break; }
      const lessonNum = existingCount + i;
      setGenLog(prev => [...prev, `⏳ Урок ${lessonNum + 1}/${targetCount}...`]);
      
      try {
        const { data, error } = await supabase.functions.invoke("generate-full-course", {
          body: { courseId: course.id, level: course.level, batchStart: lessonNum, batchSize: 1 },
        });
        if (error) {
          const errMsg = data?.error || error?.message || "Unknown error";
          throw new Error(errMsg);
        }
        if (data?.error) throw new Error(data.error);
        
        retries = 0;
        setGenProgress(i + 1);
        const stats = data?.stats?.[0];
        const info = stats ? ` (${stats.vocab} слов, ${stats.exercises} упр.)` : "";
        setGenLog(prev => [...prev, `✅ Урок ${lessonNum + 1} готов!${info}`]);
      } catch (err: any) {
        if (err.message?.includes("Rate limit") && retries < 3) {
          retries++;
          setGenLog(prev => [...prev, `⏳ Rate limit — ждём 60 сек (попытка ${retries}/3)...`]);
          await new Promise(r => setTimeout(r, 60000));
          i--; // retry same lesson
          continue;
        }
        setGenLog(prev => [...prev, `❌ Ошибка урока ${lessonNum + 1}: ${err.message}`]);
        if (retries >= 3) { setGenLog(prev => [...prev, `🛑 Слишком много ошибок, остановка`]); break; }
        setGenLog(prev => [...prev, `⏭️ Пропускаем, продолжаем...`]);
        continue;
      }
      
      // Small delay between lessons
      if (i < remaining - 1) {
        await new Promise(r => setTimeout(r, 2000));
      }
    }
    
    setGenerating(false);
    toast.success("Генерация завершена! 🎉");
    
    // Reload lessons
    if (editingCourseId === course.id || editingCourseId === null) {
      const { data } = await supabase.from("course_lessons").select("*").eq("course_id", course.id).order("sort_order", { ascending: true });
      setEditLessons((data as any[]) || []);
    }
    withScroll(loadCourses);
  };

  const loadCourses = useCallback(async () => {
    setLoadingCourses(true);
    const { data } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
    if (data) {
      const coursesWithCount = await Promise.all(
        (data as any[]).map(async (c) => {
          const { count } = await supabase.from("course_lessons").select("*", { count: "exact", head: true }).eq("course_id", c.id);
          return { ...c, lessons_count: count || 0 };
        })
      );
      setExistingCourses(coursesWithCount);
    }
    setLoadingCourses(false);
  }, []);

  useEffect(() => { loadCourses(); }, [loadCourses]);

  const openEditCourse = async (course: ExistingCourse) => {
    setEditCourse(course);
    setEditingCourseId(course.id);
    setLoadingLessons(true);
    setStep("edit");
    setExpandedLesson(null);
    const { data } = await supabase.from("course_lessons").select("*").eq("course_id", course.id).order("sort_order", { ascending: true });
    setEditLessons((data as any[]) || []);
    setLoadingLessons(false);
  };

  const saveEditedLesson = async (lesson: any) => {
    setSavingEdit(true);
    const { error } = await supabase.from("course_lessons").update({
      title: lesson.title, theory: lesson.theory, exercises: lesson.exercises, sort_order: lesson.sort_order,
      lesson_type: lesson.lesson_type || "article",
      description: lesson.description || null,
      estimated_minutes: lesson.estimated_minutes || 10,
      xp_reward: lesson.xp_reward || 20,
      coins_reward: lesson.coins_reward || 10,
      content: lesson.content || null,
    } as any).eq("id", lesson.id);
    if (error) toast.error("Ошибка: " + error.message);
    else toast.success("Урок сохранён ✅");
    setSavingEdit(false);
  };

  const saveEditedCourse = async () => {
    if (!editCourse) return;
    await supabase.from("courses").update({
      title: editCourse.title, description: editCourse.description, level: editCourse.level, price: editCourse.price,
    } as any).eq("id", editCourse.id);
    toast.success("Курс обновлён ✅");
    withScroll(loadCourses);
  };

  const addNewLesson = async () => {
    if (!editingCourseId) return;
    setSavingNewLesson(true);
    const nextOrder = editLessons.length > 0 ? Math.max(...editLessons.map(l => l.sort_order)) + 1 : 0;
    const { data, error } = await supabase.from("course_lessons").insert({
      course_id: editingCourseId,
      title: `Урок ${editLessons.length + 1}`,
      theory: "[]",
      exercises: {},
      sort_order: nextOrder,
    } as any).select("*").single();
    if (error) { toast.error("Ошибка: " + error.message); setSavingNewLesson(false); return; }
    setEditLessons([...editLessons, data as any]);
    setExpandedLesson(editLessons.length);
    toast.success("Новый урок создан! 🎉");
    setSavingNewLesson(false);
  };

  const deleteLesson = async (lessonId: string, index: number) => {
    if (!confirm("Удалить этот урок?")) return;
    await supabase.from("course_lessons").delete().eq("id", lessonId);
    setEditLessons(editLessons.filter((_, i) => i !== index));
    if (expandedLesson === index) setExpandedLesson(null);
    toast.success("Урок удалён");
  };

  const duplicateLesson = async (lesson: any) => {
    if (!editingCourseId) return;
    const nextOrder = editLessons.length > 0 ? Math.max(...editLessons.map(l => l.sort_order)) + 1 : 0;
    const { data, error } = await supabase.from("course_lessons").insert({
      course_id: editingCourseId,
      title: lesson.title + " (копия)",
      theory: lesson.theory,
      exercises: lesson.exercises,
      sort_order: nextOrder,
    } as any).select("*").single();
    if (error) { toast.error("Ошибка: " + error.message); return; }
    setEditLessons([...editLessons, data as any]);
    toast.success("Урок скопирован! 📋");
  };

  const moveLesson = async (index: number, dir: -1 | 1) => {
    const ni = index + dir;
    if (ni < 0 || ni >= editLessons.length) return;
    const newLessons = [...editLessons];
    [newLessons[index], newLessons[ni]] = [newLessons[ni], newLessons[index]];
    newLessons.forEach((l, i) => l.sort_order = i);
    setEditLessons(newLessons);
    if (expandedLesson === index) setExpandedLesson(ni);
    else if (expandedLesson === ni) setExpandedLesson(index);
    await Promise.all(newLessons.map((l, i) =>
      supabase.from("course_lessons").update({ sort_order: i } as any).eq("id", l.id)
    ));
  };

  const saveAllLessons = async () => {
    setSavingEdit(true);
    let ok = 0;
    for (const lesson of editLessons) {
      const { error } = await supabase.from("course_lessons").update({
        title: lesson.title, theory: lesson.theory, exercises: lesson.exercises, sort_order: lesson.sort_order,
        lesson_type: lesson.lesson_type || "article",
        description: lesson.description || null,
        estimated_minutes: lesson.estimated_minutes || 10,
        xp_reward: lesson.xp_reward || 20,
        coins_reward: lesson.coins_reward || 10,
        content: lesson.content || null,
      } as any).eq("id", lesson.id);
      if (!error) ok++;
    }
    toast.success(`Сохранено ${ok}/${editLessons.length} уроков ✅`);
    setSavingEdit(false);
  };

  const toggleCourseAvailability = async (id: string, current: boolean) => {
    await supabase.from("courses").update({ available: !current } as any).eq("id", id);
    toast.success(current ? "Курс скрыт" : "Курс опубликован");
    withScroll(loadCourses);
  };

  const deleteCourse = async (id: string) => {
    if (!confirm("Удалить курс и все уроки?")) return;
    await supabase.from("course_lessons").delete().eq("course_id", id);
    await supabase.from("courses").delete().eq("id", id);
    toast.success("Курс удалён");
    withScroll(loadCourses);
  };

  // ─── EDIT MODE ───
  if (step === "edit" && editCourse) {
    return (
      <div className="flex flex-col gap-3">
        <button onClick={() => { setStep("list"); setEditCourse(null); loadCourses(); }} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors self-start">
          <ArrowLeft className="w-3.5 h-3.5" /> Назад к курсам
        </button>

        {/* Course meta */}
        <div className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-primary" /> Настройки курса
          </h3>
          <input value={editCourse.title} onChange={e => setEditCourse({ ...editCourse, title: e.target.value })} placeholder="Название курса" className="w-full px-3 py-2 rounded-xl bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
          <textarea value={editCourse.description || ""} onChange={e => setEditCourse({ ...editCourse, description: e.target.value })} placeholder="Описание курса" rows={2} className="w-full px-3 py-2 rounded-xl bg-secondary text-foreground border border-border text-xs resize-y focus:border-primary focus:outline-none" />
          <div className="flex gap-2 items-end">
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">Уровень</label>
              <select value={editCourse.level} onChange={e => setEditCourse({ ...editCourse, level: e.target.value })} className="px-3 py-2 rounded-xl bg-secondary text-foreground border border-border text-sm">
                {["A1","A2","B1","B2","C1"].map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground block mb-1">Цена 🪙</label>
              <input type="number" value={editCourse.price} onChange={e => setEditCourse({ ...editCourse, price: parseInt(e.target.value) || 0 })} className="w-24 px-3 py-2 rounded-xl bg-secondary text-foreground border border-border text-sm" />
            </div>
            <button onClick={saveEditedCourse} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:bg-primary/90 transition-colors">
              <Save className="w-3 h-3" /> Сохранить
            </button>
          </div>
        </div>

        {/* Lessons header + actions */}
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-display font-semibold text-foreground">
            📖 Уроки ({editLessons.length})
          </h3>
          <div className="flex gap-2">
            <button onClick={saveAllLessons} disabled={savingEdit} className="px-3 py-1.5 rounded-xl bg-primary/10 text-primary text-[10px] font-bold flex items-center gap-1 hover:bg-primary/20 disabled:opacity-40 transition-colors">
              {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
              Сохранить все
            </button>
            <button onClick={addNewLesson} disabled={savingNewLesson} className="px-3 py-1.5 rounded-xl bg-primary text-primary-foreground text-[10px] font-bold flex items-center gap-1 hover:bg-primary/90 disabled:opacity-40 transition-colors">
              {savingNewLesson ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
              Новый урок
            </button>
          </div>
        </div>

        {/* Auto-generate lessons */}
        {editCourse && editLessons.length < 25 && !generating && (
          <button onClick={() => generateAllLessons(editCourse, editLessons.length)} className="w-full py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground text-sm font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity">
            <Sparkles className="w-4 h-4" /> {editLessons.length === 0 ? `Авто-генерация 25 уроков (${editCourse.level})` : `Догенерировать до 25 уроков (есть ${editLessons.length})`}
          </button>
        )}

        {generating && (
          <div className="glass-card p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-foreground flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" /> Генерация уроков...
              </span>
              <span className="text-xs text-muted-foreground">{genProgress}/{genTotal}</span>
            </div>
            <Progress value={(genProgress / Math.max(genTotal, 1)) * 100} className="h-2" />
            <div className="max-h-32 overflow-y-auto space-y-0.5">
              {genLog.map((line, i) => (
                <p key={i} className="text-[10px] text-muted-foreground">{line}</p>
              ))}
            </div>
            <button onClick={() => { genAbortRef.current = true; }} className="text-[10px] text-destructive hover:underline">Остановить</button>
          </div>
        )}

        {loadingLessons ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : editLessons.length === 0 && !generating ? (
          <div className="glass-card p-8 text-center">
            <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground mb-3">В этом курсе пока нет уроков</p>
            <button onClick={addNewLesson} disabled={savingNewLesson} className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold flex items-center gap-2 mx-auto hover:bg-primary/90 transition-colors">
              <Plus className="w-4 h-4" /> Создать первый урок
            </button>
          </div>
        ) : (
          editLessons.map((lesson, i) => (
            <div key={lesson.id} className="glass-card p-3">
              <div className="flex items-center gap-2">
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button onClick={() => moveLesson(i, -1)} disabled={i === 0} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronUp className="w-3 h-3" /></button>
                  <button onClick={() => moveLesson(i, 1)} disabled={i === editLessons.length - 1} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronDown className="w-3 h-3" /></button>
                </div>

                <button onClick={() => setExpandedLesson(expandedLesson === i ? null : i)} className="flex-1 flex items-center gap-2 text-left min-w-0">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="text-xs shrink-0">{{"article":"📄","grammar":"📐","reading":"📖","dialogue_text":"💬","word_list":"📋","quiz":"📝","ai_tutor":"🤖","writing":"✍️","speaking":"🎙️","notebook":"📓","video":"🎬","video_quiz":"🎬📝","exam":"🏆"}[lesson.lesson_type || "article"] || "📄"}</span>
                  <span className="text-sm font-semibold text-foreground truncate">{lesson.title}</span>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={(e) => { e.stopPropagation(); saveEditedLesson(lesson); }} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors" disabled={savingEdit} title="Сохранить">
                    {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); duplicateLesson(lesson); }} className="p-1.5 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Дублировать">
                    <CopyPlus className="w-3 h-3" />
                  </button>
                  <button onClick={(e) => { e.stopPropagation(); deleteLesson(lesson.id, i); }} className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors" title="Удалить">
                    <Trash2 className="w-3 h-3" />
                  </button>
                  {expandedLesson === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </div>

              {expandedLesson === i && (
                <div className="mt-3 border-t border-border/20 pt-3 space-y-3">
                  <input value={lesson.title} onChange={e => { const n = [...editLessons]; n[i] = { ...n[i], title: e.target.value }; setEditLessons(n); }} placeholder="Название урока" className="w-full px-3 py-2 rounded-xl bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
                  
                  {/* Lesson type selector */}
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Тип урока</label>
                    <select 
                      value={lesson.lesson_type || "article"} 
                      onChange={e => { const n = [...editLessons]; n[i] = { ...n[i], lesson_type: e.target.value }; setEditLessons(n); }}
                      className="w-full px-3 py-2 rounded-xl bg-secondary text-foreground border border-border text-xs focus:border-primary focus:outline-none"
                    >
                      <option value="article">📄 Статья / теория</option>
                      <option value="grammar">📐 Грамматика</option>
                      <option value="reading">📖 Чтение</option>
                      <option value="dialogue_text">💬 Диалог</option>
                      <option value="word_list">📋 Слова темы</option>
                      <option value="quiz">📝 Квиз</option>
                      <option value="ai_tutor">🤖 AI-тьютор</option>
                      <option value="writing">✍️ Письмо</option>
                      <option value="speaking">🎙️ Говорение</option>
                      <option value="notebook">📓 Тетрадь</option>
                      <option value="video">🎬 Видео</option>
                      <option value="video_quiz">🎬📝 Квиз по видео</option>
                      <option value="exam">🏆 Экзамен</option>
                    </select>
                  </div>

                  {/* Description */}
                  <input value={lesson.description || ""} onChange={e => { const n = [...editLessons]; n[i] = { ...n[i], description: e.target.value }; setEditLessons(n); }} placeholder="Описание урока (опционально)" className="w-full px-3 py-2 rounded-xl bg-secondary text-foreground border border-border text-xs focus:border-primary focus:outline-none" />

                  {/* Estimated minutes */}
                  <div className="flex gap-2">
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">Минут</label>
                      <input type="number" value={lesson.estimated_minutes || 10} onChange={e => { const n = [...editLessons]; n[i] = { ...n[i], estimated_minutes: parseInt(e.target.value) || 10 }; setEditLessons(n); }} className="w-20 px-2 py-1.5 rounded-lg bg-secondary text-foreground border border-border text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">XP</label>
                      <input type="number" value={lesson.xp_reward || 20} onChange={e => { const n = [...editLessons]; n[i] = { ...n[i], xp_reward: parseInt(e.target.value) || 20 }; setEditLessons(n); }} className="w-20 px-2 py-1.5 rounded-lg bg-secondary text-foreground border border-border text-xs" />
                    </div>
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">Монеты</label>
                      <input type="number" value={lesson.coins_reward || 10} onChange={e => { const n = [...editLessons]; n[i] = { ...n[i], coins_reward: parseInt(e.target.value) || 10 }; setEditLessons(n); }} className="w-20 px-2 py-1.5 rounded-lg bg-secondary text-foreground border border-border text-xs" />
                    </div>
                  </div>

                  {/* Content JSON editor for new types */}
                  {["article", "grammar", "reading", "dialogue_text", "word_list", "quiz", "video", "ai_tutor"].includes(lesson.lesson_type || "") && (
                    <div>
                      <label className="text-[10px] text-muted-foreground block mb-1">Content (JSON)</label>
                      <textarea 
                        value={typeof lesson.content === "string" ? lesson.content : JSON.stringify(lesson.content || {}, null, 2)} 
                        onChange={e => { 
                          const n = [...editLessons]; 
                          try { n[i] = { ...n[i], content: JSON.parse(e.target.value) }; } 
                          catch { n[i] = { ...n[i], content: e.target.value }; }
                          setEditLessons(n); 
                        }} 
                        rows={8} 
                        className="w-full px-3 py-2 rounded-xl bg-secondary text-foreground border border-border text-[10px] font-mono resize-y focus:border-primary focus:outline-none" 
                      />
                    </div>
                  )}

                  <LessonEditor
                    lesson={{ title: lesson.title, theory: lesson.theory, exercises: lesson.exercises }}
                    onChange={l => { const n = [...editLessons]; n[i] = { ...n[i], title: l.title, theory: l.theory, exercises: l.exercises }; setEditLessons(n); }}
                    level={editCourse?.level}
                  />
                </div>
              )}
            </div>
          ))
        )}

        {editLessons.length > 0 && (
          <button onClick={addNewLesson} disabled={savingNewLesson} className="w-full py-3 rounded-xl border-2 border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/30 text-sm font-medium flex items-center justify-center gap-2 transition-colors">
            {savingNewLesson ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Добавить урок
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Existing courses */}
      <section className="glass-card p-4 flex flex-col gap-3">
        <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-primary" /> Курсы <span className="ml-auto text-xs text-muted-foreground font-normal">{existingCourses.length}</span>
        </h3>
        {loadingCourses ? <p className="text-xs text-muted-foreground">Загрузка...</p> : existingCourses.length === 0 ? <p className="text-xs text-muted-foreground">Курсов нет</p> : (
          <div className="space-y-2">
            {existingCourses.map(c => (
              <div key={c.id} className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/20 hover:border-primary/20 transition-colors">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openEditCourse(c)}>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary">{c.level}</span>
                    <span className="text-sm font-semibold text-foreground truncate">{c.title}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{c.lessons_count} уроков • {c.price} 🪙</div>
                </div>
                <button onClick={() => openEditCourse(c)} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20"><Edit3 className="w-3.5 h-3.5" /></button>
                <button onClick={() => toggleCourseAvailability(c.id, c.available)} className={`p-1.5 rounded-lg ${c.available ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                  {c.available ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => deleteCourse(c.id)} className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Simple tabs: list / create */}
      <div className="flex gap-1">
        {(["list", "create"] as const).map((s, i) => (
          <button key={s} onClick={() => setStep(s)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-display font-bold transition-all ${step === s ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-muted-foreground"}`}>
            {["📋", "✨"][i]} {["Курсы", "Создать"][i]}
          </button>
        ))}
      </div>

      {step === "create" && (
        <div className="glass-card p-4 flex flex-col gap-3">
          <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" /> Новый курс ({level})
          </h3>
          <p className="text-xs text-muted-foreground">
            ИИ автоматически создаст курс и сгенерирует все уроки с теорией, упражнениями, словарём и диалогами
          </p>
          <input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="Название курса" className="w-full px-3 py-2.5 rounded-xl bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Описание (опционально)" rows={2} className="w-full px-3 py-2 rounded-xl bg-secondary text-foreground border border-border text-sm resize-y focus:border-primary focus:outline-none" />
          <div>
            <label className="text-[10px] text-muted-foreground block mb-1">Количество уроков</label>
            <input type="number" value={lessonsCount} onChange={e => setLessonsCount(e.target.value)} min={1} max={30} className="w-full px-3 py-2 rounded-xl bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
          </div>
          <button onClick={handleCreateAndGenerate} disabled={creatingCourse || !courseName.trim()} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold disabled:opacity-40">
            {creatingCourse ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {creatingCourse ? "Создаю курс..." : "Создать и сгенерировать через ИИ"}
          </button>
        </div>
      )}
    </div>
  );
};

export default CourseEditor;
