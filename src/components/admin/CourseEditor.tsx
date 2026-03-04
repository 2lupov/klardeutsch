import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, Wand2, Copy, Check, FileJson, Upload, Loader2, Trash2,
  Plus, ChevronDown, ChevronUp, Eye, EyeOff, Save, Sparkles, GraduationCap,
  Edit3, Image, ArrowLeft, X, FileText, Table, MessageSquare, Lightbulb, Languages
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

interface CourseData {
  course: { title: string; description: string; level: string };
  lessons: CourseLesson[];
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
   Theory Block Editor
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

const BlockEditor = ({ block, onChange, onRemove }: { block: TheoryBlock; onChange: (b: TheoryBlock) => void; onRemove: () => void }) => {
  const update = (patch: Partial<TheoryBlock>) => onChange({ ...block, ...patch } as TheoryBlock);

  return (
    <div className="p-3 rounded-xl bg-muted/30 border border-border/30 space-y-2 relative group">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-display font-bold text-muted-foreground uppercase tracking-wider">
          {BLOCK_TYPES.find(b => b.type === block.type)?.emoji} {BLOCK_TYPES.find(b => b.type === block.type)?.label}
        </span>
        <button onClick={onRemove} className="p-1 text-muted-foreground hover:text-destructive transition-colors opacity-0 group-hover:opacity-100">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {block.type === "heading" && (
        <div className="flex gap-2">
          <input value={block.emoji || ""} onChange={e => update({ emoji: e.target.value })} placeholder="📖" className="w-12 px-2 py-1.5 rounded bg-secondary text-foreground border border-border text-sm text-center" />
          <input value={block.content || ""} onChange={e => update({ content: e.target.value })} placeholder="Заголовок раздела" className="flex-1 px-2 py-1.5 rounded bg-secondary text-foreground border border-border text-sm" />
        </div>
      )}

      {block.type === "text" && (
        <textarea value={block.content || ""} onChange={e => update({ content: e.target.value })} placeholder="Текст параграфа..." rows={3} className="w-full px-2 py-1.5 rounded bg-secondary text-foreground border border-border text-xs resize-y" />
      )}

      {block.type === "rule" && (
        <>
          <div className="flex gap-2">
            <input value={block.emoji || ""} onChange={e => update({ emoji: e.target.value })} placeholder="📌" className="w-12 px-2 py-1.5 rounded bg-secondary text-foreground border border-border text-sm text-center" />
            <input value={block.title || ""} onChange={e => update({ title: e.target.value })} placeholder="Название правила" className="flex-1 px-2 py-1.5 rounded bg-secondary text-foreground border border-border text-sm" />
          </div>
          <textarea value={block.content || ""} onChange={e => update({ content: e.target.value })} placeholder="Описание правила..." rows={2} className="w-full px-2 py-1.5 rounded bg-secondary text-foreground border border-border text-xs resize-y" />
        </>
      )}

      {block.type === "table" && (
        <>
          <div className="flex gap-1 items-center">
            {block.headers?.map((h, i) => (
              <input key={i} value={h} onChange={e => { const newH = [...(block.headers || [])]; newH[i] = e.target.value; update({ headers: newH }); }} placeholder={`Колонка ${i + 1}`} className="flex-1 px-2 py-1 rounded bg-secondary text-foreground border border-border text-xs font-bold" />
            ))}
            <button onClick={() => update({ headers: [...(block.headers || []), ""], rows: (block.rows || []).map(r => [...r, ""]) })} className="p-1 text-primary"><Plus className="w-3 h-3" /></button>
          </div>
          {block.rows?.map((row, ri) => (
            <div key={ri} className="flex gap-1 items-center">
              {row.map((cell, ci) => (
                <input key={ci} value={cell} onChange={e => { const newR = [...(block.rows || [])]; newR[ri] = [...newR[ri]]; newR[ri][ci] = e.target.value; update({ rows: newR }); }} className="flex-1 px-2 py-1 rounded bg-secondary text-foreground border border-border text-xs" />
              ))}
              <button onClick={() => update({ rows: (block.rows || []).filter((_, i) => i !== ri) })} className="p-1 text-destructive/60"><X className="w-3 h-3" /></button>
            </div>
          ))}
          <button onClick={() => update({ rows: [...(block.rows || []), (block.headers || []).map(() => "")] })} className="text-[10px] text-primary flex items-center gap-1"><Plus className="w-3 h-3" /> Строка</button>
        </>
      )}

      {block.type === "example" && (
        <>
          <input value={block.de || ""} onChange={e => update({ de: e.target.value })} placeholder="Немецкий пример: Ich gehe nach Hause." className="w-full px-2 py-1.5 rounded bg-secondary text-foreground border border-border text-sm" />
          <div className="flex gap-2">
            <input value={block.ru || ""} onChange={e => update({ ru: e.target.value })} placeholder="🇷🇺 Перевод" className="flex-1 px-2 py-1.5 rounded bg-secondary text-foreground border border-border text-xs" />
            <input value={block.uk || ""} onChange={e => update({ uk: e.target.value })} placeholder="🇺🇦 Переклад" className="flex-1 px-2 py-1.5 rounded bg-secondary text-foreground border border-border text-xs" />
          </div>
          <input value={(block.highlight || []).join(", ")} onChange={e => update({ highlight: e.target.value.split(",").map(w => w.trim()).filter(Boolean) })} placeholder="Выделить слова (через запятую): gehe, Hause" className="w-full px-2 py-1.5 rounded bg-secondary text-foreground border border-border text-[10px]" />
        </>
      )}

      {block.type === "comparison" && (
        <>
          {block.items?.map((item, i) => (
            <div key={i} className="flex gap-1 items-center">
              <input value={item.de} onChange={e => { const n = [...(block.items || [])]; n[i] = { ...n[i], de: e.target.value }; update({ items: n }); }} placeholder="🇩🇪 DE" className="flex-1 px-2 py-1 rounded bg-secondary text-foreground border border-border text-xs" />
              <input value={item.ru || ""} onChange={e => { const n = [...(block.items || [])]; n[i] = { ...n[i], ru: e.target.value }; update({ items: n }); }} placeholder="🇷🇺 RU" className="flex-1 px-2 py-1 rounded bg-secondary text-foreground border border-border text-xs" />
              <input value={item.uk || ""} onChange={e => { const n = [...(block.items || [])]; n[i] = { ...n[i], uk: e.target.value }; update({ items: n }); }} placeholder="🇺🇦 UK" className="flex-1 px-2 py-1 rounded bg-secondary text-foreground border border-border text-xs" />
              <button onClick={() => update({ items: (block.items || []).filter((_, j) => j !== i) })} className="p-1 text-destructive/60"><X className="w-3 h-3" /></button>
            </div>
          ))}
          <button onClick={() => update({ items: [...(block.items || []), { de: "", ru: "", uk: "" }] })} className="text-[10px] text-primary flex items-center gap-1"><Plus className="w-3 h-3" /> Сравнение</button>
        </>
      )}

      {block.type === "tip" && (
        <>
          <div className="flex gap-2">
            <select value={block.variant || "info"} onChange={e => update({ variant: e.target.value as any })} className="px-2 py-1.5 rounded bg-secondary text-foreground border border-border text-xs">
              <option value="info">💡 Совет</option>
              <option value="warning">⚠️ Внимание</option>
              <option value="remember">📝 Запомни</option>
            </select>
            <input value={block.title || ""} onChange={e => update({ title: e.target.value })} placeholder="Заголовок (необяз.)" className="flex-1 px-2 py-1.5 rounded bg-secondary text-foreground border border-border text-xs" />
          </div>
          <textarea value={block.content || ""} onChange={e => update({ content: e.target.value })} placeholder="Содержание..." rows={2} className="w-full px-2 py-1.5 rounded bg-secondary text-foreground border border-border text-xs resize-y" />
        </>
      )}

      {block.type === "list" && (
        <>
          {block.items_list?.map((item, i) => (
            <div key={i} className="flex gap-1 items-center">
              <span className="text-primary text-xs">•</span>
              <input value={item} onChange={e => { const n = [...(block.items_list || [])]; n[i] = e.target.value; update({ items_list: n }); }} className="flex-1 px-2 py-1 rounded bg-secondary text-foreground border border-border text-xs" />
              <button onClick={() => update({ items_list: (block.items_list || []).filter((_, j) => j !== i) })} className="p-1 text-destructive/60"><X className="w-3 h-3" /></button>
            </div>
          ))}
          <button onClick={() => update({ items_list: [...(block.items_list || []), ""] })} className="text-[10px] text-primary flex items-center gap-1"><Plus className="w-3 h-3" /> Пункт</button>
        </>
      )}
    </div>
  );
};

const TheoryEditor = ({ value, onChange }: { value: string; onChange: (v: string) => void }) => {
  const [blocks, setBlocks] = useState<TheoryBlock[]>(() => {
    try { const p = JSON.parse(value); if (Array.isArray(p)) return p; } catch {}
    return value ? [{ type: "text" as const, content: value }] : [];
  });
  const [showPreview, setShowPreview] = useState(false);

  const sync = (newBlocks: TheoryBlock[]) => {
    setBlocks(newBlocks);
    onChange(JSON.stringify(newBlocks));
  };

  const addBlock = (type: TheoryBlock["type"]) => sync([...blocks, createEmptyBlock(type)]);
  const updateBlock = (i: number, b: TheoryBlock) => { const n = [...blocks]; n[i] = b; sync(n); };
  const removeBlock = (i: number) => sync(blocks.filter((_, j) => j !== i));
  const moveBlock = (i: number, dir: -1 | 1) => {
    const ni = i + dir;
    if (ni < 0 || ni >= blocks.length) return;
    const n = [...blocks]; [n[i], n[ni]] = [n[ni], n[i]]; sync(n);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground font-bold uppercase">Теория ({blocks.length} блоков)</span>
        <button onClick={() => setShowPreview(!showPreview)} className="text-[10px] text-primary flex items-center gap-1">
          {showPreview ? <Edit3 className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
          {showPreview ? "Редактор" : "Превью"}
        </button>
      </div>

      {showPreview ? (
        <div className="p-4 rounded-xl bg-secondary/50 border border-border/30">
          <TheoryRenderer theory={JSON.stringify(blocks)} lang="ru" />
        </div>
      ) : (
        <>
          {blocks.map((block, i) => (
            <div key={i} className="flex gap-1">
              <div className="flex flex-col gap-0.5 pt-3">
                <button onClick={() => moveBlock(i, -1)} className="p-0.5 text-muted-foreground hover:text-foreground"><ChevronUp className="w-3 h-3" /></button>
                <button onClick={() => moveBlock(i, 1)} className="p-0.5 text-muted-foreground hover:text-foreground"><ChevronDown className="w-3 h-3" /></button>
              </div>
              <div className="flex-1">
                <BlockEditor block={block} onChange={b => updateBlock(i, b)} onRemove={() => removeBlock(i)} />
              </div>
            </div>
          ))}

          {/* Add block buttons */}
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
   Lesson Detail Editor (inline editing)
   ══════════════════════════════════════════ */

const LessonEditor = ({ lesson, onChange }: { lesson: CourseLesson; onChange: (l: CourseLesson) => void }) => {
  const [tab, setTab] = useState<"theory" | "vocab" | "grammar" | "reading" | "dialog" | "culture">("theory");
  const ex = lesson.exercises || {};

  return (
    <div className="space-y-3 mt-3">
      {/* Tab nav */}
      <div className="flex gap-1 flex-wrap">
        {[
          { k: "theory", l: "📖 Теория" },
          { k: "vocab", l: `📚 Слова (${(ex.vocab_cards || []).length})` },
          { k: "grammar", l: `📝 Грамматика (${(ex.grammar_questions || []).length})` },
          { k: "reading", l: "📕 Чтение" },
          { k: "dialog", l: "💬 Диалог" },
          { k: "culture", l: "🌍 Культура" },
        ].map(t => (
          <button key={t.k} onClick={() => setTab(t.k as any)} className={`px-2 py-1 rounded-lg text-[10px] font-medium transition-colors ${tab === t.k ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-muted-foreground"}`}>{t.l}</button>
        ))}
      </div>

      {tab === "theory" && (
        <TheoryEditor value={lesson.theory || ""} onChange={v => onChange({ ...lesson, theory: v })} />
      )}

      {tab === "vocab" && (
        <div className="space-y-2">
          {(ex.vocab_cards || []).map((v, i) => (
            <div key={i} className="flex gap-1 items-center flex-wrap p-2 rounded-lg bg-muted/30 border border-border/20">
              <input value={v.article || ""} onChange={e => { const n = [...(ex.vocab_cards || [])]; n[i] = { ...n[i], article: e.target.value }; onChange({ ...lesson, exercises: { ...ex, vocab_cards: n } }); }} placeholder="der" className="w-10 px-1 py-1 rounded bg-secondary text-foreground border border-border text-[10px] text-center" />
              <input value={v.german} onChange={e => { const n = [...(ex.vocab_cards || [])]; n[i] = { ...n[i], german: e.target.value }; onChange({ ...lesson, exercises: { ...ex, vocab_cards: n } }); }} placeholder="Deutsch" className="flex-1 min-w-[80px] px-2 py-1 rounded bg-secondary text-foreground border border-border text-xs" />
              <input value={v.russian} onChange={e => { const n = [...(ex.vocab_cards || [])]; n[i] = { ...n[i], russian: e.target.value }; onChange({ ...lesson, exercises: { ...ex, vocab_cards: n } }); }} placeholder="Русский" className="flex-1 min-w-[80px] px-2 py-1 rounded bg-secondary text-foreground border border-border text-xs" />
              <input value={v.ukrainian || ""} onChange={e => { const n = [...(ex.vocab_cards || [])]; n[i] = { ...n[i], ukrainian: e.target.value }; onChange({ ...lesson, exercises: { ...ex, vocab_cards: n } }); }} placeholder="Українська" className="flex-1 min-w-[80px] px-2 py-1 rounded bg-secondary text-foreground border border-border text-xs" />
              <button onClick={() => onChange({ ...lesson, exercises: { ...ex, vocab_cards: (ex.vocab_cards || []).filter((_, j) => j !== i) } })} className="p-1 text-destructive/60"><X className="w-3 h-3" /></button>
            </div>
          ))}
          <button onClick={() => onChange({ ...lesson, exercises: { ...ex, vocab_cards: [...(ex.vocab_cards || []), { german: "", russian: "", ukrainian: "", article: "", example: "" }] } })} className="text-xs text-primary flex items-center gap-1"><Plus className="w-3 h-3" /> Слово</button>
        </div>
      )}

      {tab === "grammar" && (
        <div className="space-y-2">
          {(ex.grammar_questions || []).map((q, i) => (
            <div key={i} className="p-2 rounded-lg bg-muted/30 border border-border/20 space-y-1">
              <input value={q.question} onChange={e => { const n = [...(ex.grammar_questions || [])]; n[i] = { ...n[i], question: e.target.value }; onChange({ ...lesson, exercises: { ...ex, grammar_questions: n } }); }} placeholder="Вопрос с ___" className="w-full px-2 py-1 rounded bg-secondary text-foreground border border-border text-xs" />
              <div className="flex gap-1 flex-wrap">
                {q.options.map((o, oi) => (
                  <div key={oi} className="flex items-center gap-1">
                    <input type="radio" checked={q.correct_index === oi} onChange={() => { const n = [...(ex.grammar_questions || [])]; n[i] = { ...n[i], correct_index: oi }; onChange({ ...lesson, exercises: { ...ex, grammar_questions: n } }); }} className="accent-primary" />
                    <input value={o} onChange={e => { const n = [...(ex.grammar_questions || [])]; n[i] = { ...n[i], options: n[i].options.map((x, j) => j === oi ? e.target.value : x) }; onChange({ ...lesson, exercises: { ...ex, grammar_questions: n } }); }} className="w-20 px-1.5 py-0.5 rounded bg-secondary text-foreground border border-border text-[10px]" />
                  </div>
                ))}
              </div>
              <input value={q.explanation || ""} onChange={e => { const n = [...(ex.grammar_questions || [])]; n[i] = { ...n[i], explanation: e.target.value }; onChange({ ...lesson, exercises: { ...ex, grammar_questions: n } }); }} placeholder="Пояснение" className="w-full px-2 py-1 rounded bg-secondary text-foreground border border-border text-[10px]" />
              <button onClick={() => onChange({ ...lesson, exercises: { ...ex, grammar_questions: (ex.grammar_questions || []).filter((_, j) => j !== i) } })} className="text-[10px] text-destructive flex items-center gap-1"><Trash2 className="w-3 h-3" /> Удалить</button>
            </div>
          ))}
          <button onClick={() => onChange({ ...lesson, exercises: { ...ex, grammar_questions: [...(ex.grammar_questions || []), { question: "", options: ["", "", "", ""], correct_index: 0, explanation: "" }] } })} className="text-xs text-primary flex items-center gap-1"><Plus className="w-3 h-3" /> Вопрос</button>
        </div>
      )}

      {tab === "reading" && (
        <div className="space-y-2">
          <input value={ex.reading?.title || ""} onChange={e => onChange({ ...lesson, exercises: { ...ex, reading: { ...(ex.reading || { text: "", questions: [] }), title: e.target.value } } })} placeholder="Заголовок текста" className="w-full px-2 py-1.5 rounded bg-secondary text-foreground border border-border text-sm" />
          <textarea value={ex.reading?.text || ""} onChange={e => onChange({ ...lesson, exercises: { ...ex, reading: { ...(ex.reading || { title: "", questions: [] }), text: e.target.value } } })} placeholder="Текст для чтения..." rows={5} className="w-full px-2 py-1.5 rounded bg-secondary text-foreground border border-border text-xs resize-y" />
          <p className="text-[10px] text-muted-foreground">{ex.reading?.questions?.length || 0} вопросов к тексту</p>
        </div>
      )}

      {tab === "dialog" && (
        <div className="space-y-2">
          {(ex.practice_dialog?.dialog || []).map((line, i) => (
            <div key={i} className="flex gap-1 items-center p-2 rounded-lg bg-muted/30 border border-border/20">
              <select value={line.speaker} onChange={e => { const d = [...(ex.practice_dialog?.dialog || [])]; d[i] = { ...d[i], speaker: e.target.value }; onChange({ ...lesson, exercises: { ...ex, practice_dialog: { dialog: d } } }); }} className="w-10 px-1 py-1 rounded bg-secondary text-foreground border border-border text-[10px]">
                <option value="A">A</option>
                <option value="B">B</option>
              </select>
              <input value={line.text_de} onChange={e => { const d = [...(ex.practice_dialog?.dialog || [])]; d[i] = { ...d[i], text_de: e.target.value }; onChange({ ...lesson, exercises: { ...ex, practice_dialog: { dialog: d } } }); }} placeholder="DE" className="flex-1 px-2 py-1 rounded bg-secondary text-foreground border border-border text-xs" />
              <input value={line.text_ru} onChange={e => { const d = [...(ex.practice_dialog?.dialog || [])]; d[i] = { ...d[i], text_ru: e.target.value }; onChange({ ...lesson, exercises: { ...ex, practice_dialog: { dialog: d } } }); }} placeholder="RU" className="flex-1 px-2 py-1 rounded bg-secondary text-foreground border border-border text-xs" />
            </div>
          ))}
          <button onClick={() => { const d = [...(ex.practice_dialog?.dialog || []), { speaker: "A", text_de: "", text_ru: "", text_ua: "" }]; onChange({ ...lesson, exercises: { ...ex, practice_dialog: { dialog: d } } }); }} className="text-xs text-primary flex items-center gap-1"><Plus className="w-3 h-3" /> Реплика</button>
        </div>
      )}

      {tab === "culture" && (
        <div className="space-y-2">
          {(ex.cultural_notes || []).map((note, i) => (
            <div key={i} className="p-2 rounded-lg bg-muted/30 border border-border/20 space-y-1">
              <input value={note.title?.ru || ""} onChange={e => { const n = [...(ex.cultural_notes || [])]; n[i] = { ...n[i], title: { ...n[i].title, ru: e.target.value } }; onChange({ ...lesson, exercises: { ...ex, cultural_notes: n } }); }} placeholder="Заголовок" className="w-full px-2 py-1 rounded bg-secondary text-foreground border border-border text-xs" />
              <textarea value={note.content?.ru || ""} onChange={e => { const n = [...(ex.cultural_notes || [])]; n[i] = { ...n[i], content: { ...n[i].content, ru: e.target.value } }; onChange({ ...lesson, exercises: { ...ex, cultural_notes: n } }); }} placeholder="Контент..." rows={2} className="w-full px-2 py-1 rounded bg-secondary text-foreground border border-border text-[10px] resize-y" />
            </div>
          ))}
          <button onClick={() => onChange({ ...lesson, exercises: { ...ex, cultural_notes: [...(ex.cultural_notes || []), { title: { ru: "", ua: "" }, content: { ru: "", ua: "" } }] } })} className="text-xs text-primary flex items-center gap-1"><Plus className="w-3 h-3" /> Факт</button>
        </div>
      )}
    </div>
  );
};

/* ══════════════════════════════════════════
   Main CourseEditor
   ══════════════════════════════════════════ */

const CourseEditor = ({ level }: { level: Level }) => {
  const [step, setStep] = useState<"list" | "create" | "prompt" | "import" | "preview" | "edit">("list");
  const [courseName, setCourseName] = useState("");
  const [description, setDescription] = useState("");
  const [lessonsCount, setLessonsCount] = useState("5");
  const [topics, setTopics] = useState("");
  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [jsonInput, setJsonInput] = useState("");
  const [validating, setValidating] = useState(false);
  const [courseData, setCourseData] = useState<CourseData | null>(null);
  const [saving, setSaving] = useState(false);
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);
  const [existingCourses, setExistingCourses] = useState<ExistingCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);
  // For editing existing course
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [editLessons, setEditLessons] = useState<Array<{ id: string; title: string; theory: string; exercises: any; sort_order: number }>>([]);
  const [editCourse, setEditCourse] = useState<ExistingCourse | null>(null);
  const [loadingLessons, setLoadingLessons] = useState(false);
  const [savingEdit, setSavingEdit] = useState(false);

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
    const { data } = await supabase.from("course_lessons").select("*").eq("course_id", course.id).order("sort_order", { ascending: true });
    setEditLessons((data as any[]) || []);
    setLoadingLessons(false);
  };

  const saveEditedLesson = async (lesson: any) => {
    setSavingEdit(true);
    const { error } = await supabase.from("course_lessons").update({
      title: lesson.title,
      theory: lesson.theory,
      exercises: lesson.exercises,
    } as any).eq("id", lesson.id);
    if (error) toast.error("Ошибка: " + error.message);
    else toast.success("Урок сохранён");
    setSavingEdit(false);
  };

  const saveEditedCourse = async () => {
    if (!editCourse) return;
    await supabase.from("courses").update({
      title: editCourse.title,
      description: editCourse.description,
      level: editCourse.level,
      price: editCourse.price,
    } as any).eq("id", editCourse.id);
    toast.success("Курс обновлён");
    loadCourses();
  };

  const handleGeneratePrompt = async () => {
    if (!courseName.trim()) { toast.error("Введите название курса"); return; }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-course-prompt", {
        body: { action: "generate_prompt", courseName: courseName.trim(), level, lessonsCount: parseInt(lessonsCount) || 5, topics: topics.trim() ? topics.split(",").map(t => t.trim()) : [], description: description.trim() },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGeneratedPrompt(data.prompt);
      setStep("prompt");
      toast.success("Промпт сгенерирован!");
    } catch (err: any) { toast.error("Ошибка: " + err.message); }
    setGenerating(false);
  };

  const copyPrompt = async () => { await navigator.clipboard.writeText(generatedPrompt); setCopied(true); toast.success("Скопировано!"); setTimeout(() => setCopied(false), 2000); };

  const handleJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setJsonInput(await file.text()); toast.success(`Файл ${file.name} загружен`); } catch { toast.error("Не удалось прочитать файл"); }
  };

  const handleValidateAndPreview = async () => {
    if (!jsonInput.trim()) { toast.error("Вставьте JSON или загрузите файл"); return; }
    let clean = jsonInput.trim().replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    const jsonMatch = clean.match(/(\{[\s\S]*\})/);
    if (jsonMatch) clean = jsonMatch[1];
    try {
      const parsed = JSON.parse(clean) as CourseData;
      if (!parsed.course || !parsed.lessons?.length) { toast.error("Нет полей 'course' или 'lessons'"); return; }
      if (!parsed.course.level) parsed.course.level = level;
      setCourseData(parsed);
      setStep("preview");
      toast.success(`Курс "${parsed.course.title}" — ${parsed.lessons.length} уроков`);
      return;
    } catch (e: any) { toast.error(`Ошибка JSON: ${e.message}`); }

    setValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-course-prompt", { body: { action: "validate_json", jsonData: clean } });
      if (error) throw error;
      if (data?.valid === false) { toast.error("JSON невалидный: " + (data.error || "")); setValidating(false); return; }
      if (data?.course && data?.lessons) { setCourseData(data); setStep("preview"); toast.success(`Курс: ${data.lessons.length} уроков`); }
      else toast.error("Не удалось распознать");
    } catch (err: any) { toast.error("Ошибка: " + err.message); }
    setValidating(false);
  };

  const handleSaveCourse = async () => {
    if (!courseData) return;
    setSaving(true);
    try {
      const { data: courseRow, error: courseErr } = await supabase.from("courses").insert({
        title: courseData.course.title, description: courseData.course.description || null, level: courseData.course.level || level, available: false,
      } as any).select("id").single();
      if (courseErr) throw courseErr;
      const lessons = courseData.lessons.map((l, i) => ({
        course_id: (courseRow as any).id, title: l.title, theory: l.theory || "", exercises: l.exercises || {}, sort_order: i,
      }));
      const { error: lessonsErr } = await supabase.from("course_lessons").insert(lessons as any);
      if (lessonsErr) throw lessonsErr;
      toast.success(`✅ Курс сохранён с ${lessons.length} уроками!`);
      setCourseData(null); setJsonInput(""); setStep("list"); loadCourses();
    } catch (err: any) { toast.error("Ошибка: " + err.message); }
    setSaving(false);
  };

  const toggleCourseAvailability = async (id: string, current: boolean) => {
    await supabase.from("courses").update({ available: !current } as any).eq("id", id);
    toast.success(current ? "Курс скрыт" : "Курс опубликован");
    loadCourses();
  };

  const deleteCourse = async (id: string) => {
    if (!confirm("Удалить курс и все уроки?")) return;
    await supabase.from("course_lessons").delete().eq("course_id", id);
    await supabase.from("courses").delete().eq("id", id);
    toast.success("Курс удалён");
    loadCourses();
  };

  // ─── EDIT MODE ───
  if (step === "edit" && editCourse) {
    return (
      <div className="flex flex-col gap-3">
        <button onClick={() => { setStep("list"); setEditCourse(null); }} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors self-start">
          <ArrowLeft className="w-3.5 h-3.5" /> Назад к курсам
        </button>

        <div className="glass-card p-4 space-y-3">
          <h3 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
            <Edit3 className="w-4 h-4 text-primary" /> Редактирование курса
          </h3>
          <input value={editCourse.title} onChange={e => setEditCourse({ ...editCourse, title: e.target.value })} className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm" />
          <textarea value={editCourse.description || ""} onChange={e => setEditCourse({ ...editCourse, description: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-xs resize-y" />
          <div className="flex gap-2">
            <select value={editCourse.level} onChange={e => setEditCourse({ ...editCourse, level: e.target.value })} className="px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm">
              {["A1","A2","B1","B2","C1"].map(l => <option key={l}>{l}</option>)}
            </select>
            <input type="number" value={editCourse.price} onChange={e => setEditCourse({ ...editCourse, price: parseInt(e.target.value) || 0 })} className="w-24 px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm" />
            <button onClick={saveEditedCourse} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold"><Save className="w-3 h-3 inline mr-1" />Сохранить</button>
          </div>
        </div>

        {loadingLessons ? (
          <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          editLessons.map((lesson, i) => (
            <div key={lesson.id} className="glass-card p-3">
              <button onClick={() => setExpandedLesson(expandedLesson === i ? null : i)} className="w-full flex items-center justify-between text-left">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="text-sm font-semibold text-foreground">{lesson.title}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={(e) => { e.stopPropagation(); saveEditedLesson(lesson); }} className="p-1.5 rounded-lg bg-primary/10 text-primary hover:bg-primary/20" disabled={savingEdit}>
                    {savingEdit ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                  </button>
                  {expandedLesson === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>
              {expandedLesson === i && (
                <div className="mt-3">
                  <input value={lesson.title} onChange={e => { const n = [...editLessons]; n[i] = { ...n[i], title: e.target.value }; setEditLessons(n); }} className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm mb-3" />
                  <LessonEditor
                    lesson={{ title: lesson.title, theory: lesson.theory, exercises: lesson.exercises }}
                    onChange={l => { const n = [...editLessons]; n[i] = { ...n[i], title: l.title, theory: l.theory, exercises: l.exercises }; setEditLessons(n); }}
                  />
                </div>
              )}
            </div>
          ))
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
              <div key={c.id} className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-muted/30 border border-border/20">
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

      {/* Steps for new course */}
      <div className="flex gap-1">
        {(["list","create","prompt","import","preview"] as const).map((s, i) => (
          <button key={s} onClick={() => setStep(s)} className={`flex-1 py-1.5 rounded-lg text-[10px] font-display font-bold transition-all ${step === s ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-muted-foreground"}`}>
            {["📋","✨","📝","📥","👁️"][i]} {["Курсы","Создать","Промпт","Импорт","Превью"][i]}
          </button>
        ))}
      </div>

      {step === "create" && (
        <div className="glass-card p-4 flex flex-col gap-3">
          <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" /> Новый курс ({level})</h3>
          <input value={courseName} onChange={e => setCourseName(e.target.value)} placeholder="Название курса" className="w-full px-3 py-2.5 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Описание" rows={2} className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm resize-y focus:border-primary focus:outline-none" />
          <div className="flex gap-2">
            <div className="flex-1"><label className="text-[10px] text-muted-foreground block mb-1">Уроков</label><input type="number" value={lessonsCount} onChange={e => setLessonsCount(e.target.value)} min={1} max={30} className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" /></div>
          </div>
          <div><label className="text-[10px] text-muted-foreground block mb-1">Темы (через запятую)</label><input value={topics} onChange={e => setTopics(e.target.value)} placeholder="Приветствие, В отеле..." className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" /></div>
          <button onClick={handleGeneratePrompt} disabled={generating || !courseName.trim()} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-40">
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {generating ? "ИИ генерирует..." : "Создать промпт через ИИ"}
          </button>
        </div>
      )}

      {step === "prompt" && (
        <div className="glass-card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2"><Wand2 className="w-4 h-4 text-primary" /> Промпт</h3>
            <button onClick={copyPrompt} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied ? "✓" : "Копировать"}
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-xs text-foreground bg-secondary rounded-lg p-3 border border-border max-h-[400px] overflow-y-auto font-mono">{generatedPrompt}</pre>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs text-foreground">Скопируйте → вставьте в Claude → получите JSON → Импорт</p>
          </div>
          <button onClick={() => setStep("import")} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary border border-border text-foreground font-semibold hover:bg-muted">
            <FileJson className="w-4 h-4" /> К импорту
          </button>
        </div>
      )}

      {step === "import" && (
        <div className="glass-card p-4 flex flex-col gap-3">
          <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2"><FileJson className="w-4 h-4 text-primary" /> Импорт JSON</h3>
          <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 cursor-pointer transition-all">
            <Upload className="w-4 h-4" /> Загрузить .json файл
            <input type="file" accept=".json,.txt" className="hidden" onChange={handleJsonFile} />
          </label>
          <div className="text-center text-xs text-muted-foreground">или вставьте:</div>
          <textarea value={jsonInput} onChange={e => setJsonInput(e.target.value)} placeholder='{"course": {...}, "lessons": [...]}' rows={10} className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-xs font-mono resize-y focus:border-primary focus:outline-none" />
          <button onClick={handleValidateAndPreview} disabled={validating || !jsonInput.trim()} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-40">
            {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            {validating ? "Проверка..." : "Проверить и превью"}
          </button>
        </div>
      )}

      {step === "preview" && courseData && (
        <div className="flex flex-col gap-3">
          <div className="glass-card p-4">
            <h3 className="text-sm font-display font-semibold text-foreground mb-1">{courseData.course.title}</h3>
            <p className="text-xs text-muted-foreground">{courseData.course.description}</p>
            <div className="flex gap-2 mt-2">
              <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">{courseData.course.level}</span>
              <span className="text-xs text-muted-foreground">{courseData.lessons.length} уроков</span>
            </div>
          </div>
          {courseData.lessons.map((lesson, i) => (
            <div key={i} className="glass-card p-3">
              <button onClick={() => setExpandedLesson(expandedLesson === i ? null : i)} className="w-full flex items-center justify-between text-left">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="text-sm font-semibold text-foreground">{lesson.title}</span>
                </div>
                {expandedLesson === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              {expandedLesson === i && (
                <div className="mt-3">
                  <LessonEditor
                    lesson={lesson}
                    onChange={l => { const n = { ...courseData }; n.lessons = [...n.lessons]; n.lessons[i] = l; setCourseData(n); }}
                  />
                </div>
              )}
            </div>
          ))}
          <button onClick={handleSaveCourse} disabled={saving} className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow disabled:opacity-40">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Сохранение..." : "Сохранить курс"}
          </button>
        </div>
      )}
    </div>
  );
};

export default CourseEditor;
