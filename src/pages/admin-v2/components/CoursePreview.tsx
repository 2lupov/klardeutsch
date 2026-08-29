import { useMemo, useState } from "react";
import {
  X, BookOpen, Languages, PencilLine, FileText, MessagesSquare, Globe2,
  ChevronRight, Save, Loader2, CheckCircle2, AlertCircle,
} from "lucide-react";

export interface PreviewLesson {
  title: string;
  theory: string | any[];
  exercises: any;
  sort_order: number;
  topic?: string;
  lessonNo?: number;
}

type Tab = "theory" | "vocab" | "exercises" | "reading" | "dialog" | "culture";

const TABS: { key: Tab; label: string; Icon: any }[] = [
  { key: "theory", label: "Теорія", Icon: BookOpen },
  { key: "vocab", label: "Словник", Icon: Languages },
  { key: "exercises", label: "Вправи", Icon: PencilLine },
  { key: "reading", label: "Читання + тест", Icon: FileText },
  { key: "dialog", label: "Діалог", Icon: MessagesSquare },
  { key: "culture", label: "Культура", Icon: Globe2 },
];

const parseTheory = (theory: string | any[]): any[] => {
  if (Array.isArray(theory)) return theory;
  try {
    const p = JSON.parse(String(theory || "[]"));
    return Array.isArray(p) ? p : [];
  } catch {
    return [{ type: "text", content: String(theory || "") }];
  }
};

export default function CoursePreview({
  lessons,
  courseTitle,
  failed,
  saving,
  onSave,
  onClose,
}: {
  lessons: PreviewLesson[];
  courseTitle: string;
  failed?: { topic: string; reason: string }[];
  saving?: boolean;
  onSave: (lessons: PreviewLesson[]) => void;
  onClose: () => void;
}) {
  const [active, setActive] = useState(0);
  const [tab, setTab] = useState<Tab>("theory");
  const [excluded, setExcluded] = useState<number[]>([]);

  const lesson = lessons[active];
  const ex = lesson?.exercises || {};
  const theory = useMemo(() => parseTheory(lesson?.theory), [lesson]);
  const keep = lessons.filter((_, i) => !excluded.includes(i));

  const stats = (l: PreviewLesson) => {
    const e = l.exercises || {};
    return {
      theory: parseTheory(l.theory).length,
      vocab: e.vocabulary?.length || 0,
      exercises: e.exercises?.length || 0,
      questions: e.reading?.questions?.length || 0,
      dialog: e.practice_dialog?.dialog?.length || 0,
    };
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-900/50">
      <div className="w-full max-w-6xl h-[92vh] bg-white rounded-2xl border border-slate-200 shadow-2xl flex flex-col overflow-hidden">
        {/* header */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-slate-100">
          <div className="min-w-0">
            <h3 className="font-semibold text-slate-900 truncate">Попередній перегляд · {courseTitle}</h3>
            <p className="text-xs text-slate-500">
              {lessons.length} уроків згенеровано · до збереження — {keep.length}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              disabled={saving || keep.length === 0}
              onClick={() => onSave(keep)}
              className="px-4 py-2 rounded-xl text-white text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-60"
              style={{ background: "#4F46E5" }}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Зберегти в курс ({keep.length})
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 flex flex-col md:flex-row">
          {/* lessons list */}
          <div className="md:w-72 shrink-0 border-b md:border-b-0 md:border-r border-slate-100 overflow-y-auto max-h-40 md:max-h-none">
            {lessons.map((l, i) => {
              const s = stats(l);
              const off = excluded.includes(i);
              return (
                <div
                  key={i}
                  className={`px-4 py-3 border-b border-slate-50 cursor-pointer ${
                    i === active ? "bg-indigo-50" : "hover:bg-slate-50"
                  } ${off ? "opacity-45" : ""}`}
                  onClick={() => setActive(i)}
                >
                  <div className="flex items-start gap-2">
                    <span className="text-[10px] font-bold text-slate-400 mt-0.5">
                      #{(l.sort_order ?? i) + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium text-slate-900 line-clamp-2">{l.title}</div>
                      <div className="mt-1 text-[10px] text-slate-500">
                        {s.theory} блоків · {s.vocab} слів · {s.exercises} вправ · {s.questions} питань
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setExcluded((p) => (off ? p.filter((x) => x !== i) : [...p, i]));
                        }}
                        className={`mt-1.5 text-[10px] font-semibold ${off ? "text-indigo-600" : "text-slate-400 hover:text-red-500"}`}
                      >
                        {off ? "Повернути" : "Не зберігати"}
                      </button>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                  </div>
                </div>
              );
            })}
            {!!failed?.length && (
              <div className="p-4 text-xs text-red-600 space-y-1">
                <div className="font-semibold inline-flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" /> Не згенерувалось ({failed.length})
                </div>
                {failed.map((f) => <div key={f.topic}>• {f.topic}</div>)}
              </div>
            )}
          </div>

          {/* content */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex gap-1 px-3 py-2 border-b border-slate-100 overflow-x-auto">
              {TABS.map(({ key, label, Icon }) => (
                <button
                  key={key}
                  onClick={() => setTab(key)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap ${
                    tab === key ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-3 text-sm">
              {!lesson ? null : tab === "theory" ? (
                theory.length === 0 ? <Empty text="Теорії немає" /> : theory.map((b: any, i: number) => (
                  <TheoryBlock key={i} block={b} />
                ))
              ) : tab === "vocab" ? (
                (ex.vocabulary?.length ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ex.vocabulary.map((w: any, i: number) => (
                      <div key={i} className="rounded-xl border border-slate-200 p-3">
                        <div className="font-semibold text-slate-900">
                          {w.article ? <span className="text-indigo-600">{w.article} </span> : null}
                          {w.german || w.word}
                        </div>
                        <div className="text-xs text-slate-600">{w.ukrainian || w.russian}</div>
                        {w.example && <div className="mt-1 text-xs text-slate-400 italic">{w.example}</div>}
                      </div>
                    ))}
                  </div>
                ) : <Empty text="Словника немає" />)
              ) : tab === "exercises" ? (
                (ex.exercises?.length ? ex.exercises.map((q: any, i: number) => (
                  <div key={i} className="rounded-xl border border-slate-200 p-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 uppercase">
                        {q.type || "mc"}
                      </span>
                      <span className="text-[10px] text-slate-400">Вправа {i + 1}</span>
                    </div>
                    <p className="mt-2 font-medium text-slate-900">{q.question || q.sentence}</p>
                    <div className="mt-2 space-y-1">
                      {(q.options || []).map((o: string, oi: number) => {
                        const ok = q.correct != null ? o === q.correct : oi === q.correct_index;
                        return (
                          <div
                            key={oi}
                            className={`px-2.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5 w-full ${
                              ok ? "bg-green-50 text-green-700 font-semibold" : "bg-slate-50 text-slate-600"
                            }`}
                          >
                            {ok && <CheckCircle2 className="w-3.5 h-3.5" />} {o}
                          </div>
                        );
                      })}
                    </div>
                    {q.explanation && <p className="mt-2 text-xs text-slate-500">💡 {q.explanation}</p>}
                  </div>
                )) : <Empty text="Вправ немає" />)
              ) : tab === "reading" ? (
                ex.reading?.text ? (
                  <>
                    <div className="rounded-xl border border-slate-200 p-4">
                      <div className="font-semibold text-slate-900">{ex.reading.title}</div>
                      <p className="mt-2 text-slate-700 whitespace-pre-wrap leading-relaxed">{ex.reading.text}</p>
                    </div>
                    {(ex.reading.questions || []).map((q: any, i: number) => (
                      <div key={i} className="rounded-xl border border-slate-200 p-3">
                        <p className="font-medium text-slate-900">{i + 1}. {q.question}</p>
                        <div className="mt-2 space-y-1">
                          {(q.options || []).map((o: string, oi: number) => (
                            <div key={oi} className={`px-2.5 py-1.5 rounded-lg text-xs ${
                              oi === q.correct_index ? "bg-green-50 text-green-700 font-semibold" : "bg-slate-50 text-slate-600"
                            }`}>{o}</div>
                          ))}
                        </div>
                        {q.explanation && <p className="mt-2 text-xs text-slate-500">💡 {q.explanation}</p>}
                      </div>
                    ))}
                  </>
                ) : <Empty text="Тексту для читання немає" />
              ) : tab === "dialog" ? (
                (ex.practice_dialog?.dialog?.length ? ex.practice_dialog.dialog.map((d: any, i: number) => (
                  <div key={i} className={`max-w-[85%] rounded-2xl px-3 py-2 ${
                    d.speaker === "A" ? "bg-indigo-50" : "bg-slate-100 ml-auto"
                  }`}>
                    <div className="text-[10px] font-bold text-slate-400">{d.speaker}</div>
                    <div className="font-medium text-slate-900">{d.text_de}</div>
                    <div className="text-xs text-slate-500">{d.text_ua || d.text_ru}</div>
                  </div>
                )) : <Empty text="Діалогу немає" />)
              ) : (
                (ex.cultural_notes?.length ? ex.cultural_notes.map((n: any, i: number) => (
                  <div key={i} className="rounded-xl border border-amber-200 bg-amber-50/60 p-3">
                    <div className="font-semibold text-slate-900">{n.title?.ua || n.title?.ru || n.title}</div>
                    <p className="mt-1 text-slate-700">{n.content?.ua || n.content?.ru || n.content}</p>
                  </div>
                )) : <Empty text="Культурних нотаток немає" />)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Empty = ({ text }: { text: string }) => (
  <p className="text-sm text-slate-400">{text}</p>
);

function TheoryBlock({ block }: { block: any }) {
  switch (block?.type) {
    case "heading":
      return <h4 className="font-bold text-slate-900 text-base pt-2">{block.emoji} {block.content}</h4>;
    case "rule":
      return (
        <div className="rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
          <div className="font-semibold text-indigo-900">{block.emoji || "📌"} {block.title}</div>
          <p className="mt-1 text-slate-700 whitespace-pre-wrap">{block.content}</p>
        </div>
      );
    case "table":
      return (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full text-xs">
            <thead className="bg-slate-50">
              <tr>{(block.headers || []).map((h: string, i: number) => (
                <th key={i} className="text-left px-3 py-2 font-semibold text-slate-600">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {(block.rows || []).map((r: string[], i: number) => (
                <tr key={i} className="border-t border-slate-100">
                  {r.map((c, ci) => <td key={ci} className="px-3 py-2 text-slate-700">{c}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case "example":
      return (
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
          <div className="font-medium text-slate-900">{block.de}</div>
          <div className="text-xs text-slate-500">{block.uk || block.ru}</div>
        </div>
      );
    case "comparison":
      return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {(block.items || []).map((it: any, i: number) => (
            <div key={i} className="rounded-xl border border-slate-200 p-3">
              <div className="font-medium text-slate-900">{it.de}</div>
              <div className="text-xs text-slate-500">{it.uk || it.ru}</div>
            </div>
          ))}
        </div>
      );
    case "tip":
      return (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3">
          <div className="font-semibold text-emerald-900">💡 {block.title}</div>
          <p className="mt-1 text-slate-700">{block.content}</p>
        </div>
      );
    case "list":
      return (
        <ul className="list-disc pl-5 space-y-1 text-slate-700">
          {(block.items_list || block.items || []).map((it: any, i: number) => (
            <li key={i}>{typeof it === "string" ? it : JSON.stringify(it)}</li>
          ))}
        </ul>
      );
    default:
      return <p className="text-slate-700 whitespace-pre-wrap">{block?.content}</p>;
  }
}
