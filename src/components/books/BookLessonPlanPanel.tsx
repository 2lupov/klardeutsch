import { useState } from "react";
import { Loader2, Sparkles, Send, ListChecks } from "lucide-react";
import { toast } from "sonner";
import {
  generateBookLessonPlan, STAGE_META,
  type Book, type BookLektion, type BookLessonPlan,
} from "@/lib/books";

export default function BookLessonPlanPanel({
  book, lektionen, onIssue,
}: {
  book: Book;
  lektionen: BookLektion[];
  onIssue: (plan: BookLessonPlan) => void;
}) {
  const [lektionId, setLektionId] = useState("");
  const [minutes, setMinutes] = useState(60);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState<BookLessonPlan | null>(null);

  const generate = async () => {
    setBusy(true);
    setPlan(null);
    try {
      const res = await generateBookLessonPlan({
        bookId: book.id,
        lektionId: lektionId || null,
        minutes,
        notes,
      });
      setPlan(res);
      toast.success(`План уроку готовий: ${res.stages.length} етапів`);
    } catch (e: any) {
      toast.error(e?.message ?? "Не вдалося скласти план");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900 p-4">
      <div className="flex items-center gap-2">
        <ListChecks className="w-4 h-4 text-amber-500" />
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">План уроку з підручника</h3>
      </div>
      <p className="mt-1 text-xs text-slate-500">
        ІІ складає повний урок: теорія → вправи → аудіо → завдання → домашка. Потім видаєте його учневі одним натисканням.
      </p>

      <div className="mt-3 grid gap-3 md:grid-cols-3">
        <label className="text-xs text-slate-500 space-y-1">
          <span>Розділ</span>
          <select
            value={lektionId}
            onChange={(e) => setLektionId(e.target.value)}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
          >
            <option value="">Уся книга</option>
            {lektionen.map((l) => (
              <option key={l.id} value={l.id}>
                Lektion {l.number}{l.title ? ` — ${l.title}` : ""}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-slate-500 space-y-1">
          <span>Тривалість, хв</span>
          <input
            type="number"
            min={30}
            max={180}
            step={5}
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
          />
        </label>
        <label className="text-xs text-slate-500 space-y-1">
          <span>Побажання</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="напр. більше говоріння"
            className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100"
          />
        </label>
      </div>

      <button
        onClick={generate}
        disabled={busy}
        className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 dark:bg-amber-400 dark:text-slate-900 text-white text-sm font-semibold disabled:opacity-60"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
        Скласти план уроку
      </button>

      {plan && (
        <div className="mt-4 rounded-2xl border border-slate-200 dark:border-slate-700 p-3">
          <p className="text-sm font-bold text-slate-900 dark:text-slate-100">{plan.title}</p>
          {plan.summary && <p className="mt-1 text-xs text-slate-500">{plan.summary}</p>}
          {plan.goals.length > 0 && (
            <ul className="mt-2 space-y-0.5 text-xs text-slate-600 dark:text-slate-300">
              {plan.goals.map((g, i) => <li key={i}>• {g}</li>)}
            </ul>
          )}

          <div className="mt-3 space-y-2">
            {plan.stages.map((s, i) => {
              const meta = STAGE_META[s.type] ?? { label: "Етап", icon: "•" };
              return (
                <div key={i} className="rounded-xl bg-slate-50 dark:bg-slate-800 p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span>{meta.icon}</span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">{s.title}</span>
                    <span className="text-slate-400">{meta.label} · {s.minutes} хв</span>
                    {s.task_ids.length > 0 && <span className="text-slate-400">· блоків: {s.task_ids.length}</span>}
                    {s.audio_ids.length > 0 && <span className="text-slate-400">· аудіо: {s.audio_ids.length}</span>}
                  </div>
                  {s.student_text && <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{s.student_text}</p>}
                  {s.teacher_note && (
                    <p className="mt-1 text-[11px] text-amber-600 dark:text-amber-400">Викладачу: {s.teacher_note}</p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-3 rounded-xl border border-amber-200 dark:border-amber-500/40 bg-amber-50 dark:bg-amber-500/10 p-3">
            <p className="text-xs font-bold text-amber-700 dark:text-amber-300">Домашка</p>
            {plan.homework.instructions && (
              <p className="mt-1 text-xs text-slate-700 dark:text-slate-200">{plan.homework.instructions}</p>
            )}
            <p className="mt-1 text-[11px] text-slate-500">
              вправ: {plan.homework.task_ids.length}{plan.homework.audio_ids.length ? ` · аудіо: ${plan.homework.audio_ids.length}` : ""}
            </p>
          </div>

          <button
            onClick={() => onIssue(plan)}
            className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-semibold"
          >
            <Send className="w-4 h-4" /> Видати учневі
          </button>
        </div>
      )}
    </div>
  );
}
