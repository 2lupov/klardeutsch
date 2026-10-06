import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "./_ui";
import { Pen, X } from "lucide-react";

interface Row {
  id: string;
  user_id: string;
  essay: string;
  word_count: number;
  submitted_at: string;
  lesson: string;
  prompt: string;
  student: string;
}

/** Есе учнів з уроків Академії (тип writing_task). */
export default function AcademyEssays({ query }: { query: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<Row | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("course_lesson_progress")
        .select("id, user_id, user_answers, completed_at, lesson:course_lessons(title, content, lesson_type)")
        .not("user_answers", "is", null)
        .order("completed_at", { ascending: false })
        .limit(200);
      const list = ((data || []) as any[]).filter((r) => typeof r.user_answers?.essay === "string");
      if (!list.length) return setRows([]);
      const ids = [...new Set(list.map((r) => r.user_id))];
      const { data: profs } = await supabase.from("profiles").select("user_id, display_name, nickname").in("user_id", ids);
      const pm = new Map((profs || []).map((p: any) => [p.user_id, p.display_name || (p.nickname ? `@${p.nickname}` : "Учень")]));
      setRows(list.map((r) => ({
        id: r.id,
        user_id: r.user_id,
        essay: r.user_answers.essay,
        word_count: r.user_answers.word_count ?? 0,
        submitted_at: r.user_answers.submitted_at ?? r.completed_at,
        lesson: r.lesson?.title ?? "Урок",
        prompt: r.lesson?.content?.prompt ?? "",
        student: pm.get(r.user_id) ?? "Учень",
      })));
    })();
  }, []);

  const s = query.trim().toLowerCase();
  const shown = rows.filter((r) => !s || r.lesson.toLowerCase().includes(s) || r.student.toLowerCase().includes(s));
  if (!shown.length) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-700">Есе з Академії · {shown.length}</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {shown.map((r) => (
          <Card key={r.id} className="p-4">
            <button className="w-full text-left flex items-start gap-3" onClick={() => setOpen(r)}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 bg-indigo-600">
                <Pen className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-900 truncate">{r.lesson}</div>
                <div className="text-xs text-slate-500 truncate">{r.student} · {r.word_count} слів · {new Date(r.submitted_at).toLocaleString("uk-UA")}</div>
                <div className="text-xs text-slate-600 mt-1 line-clamp-2">{r.essay}</div>
              </div>
            </button>
          </Card>
        ))}
      </div>
      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={() => setOpen(null)}>
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="font-semibold text-slate-900">{open.lesson}</div>
                <div className="text-xs text-slate-500">{open.student} · {open.word_count} слів</div>
              </div>
              <button onClick={() => setOpen(null)}><X className="w-5 h-5 text-slate-500" /></button>
            </div>
            {open.prompt && <p className="text-sm text-slate-600 bg-slate-50 rounded-xl p-3 mb-3">{open.prompt}</p>}
            <p className="text-sm text-slate-900 whitespace-pre-wrap leading-relaxed">{open.essay}</p>
          </div>
        </div>
      )}
    </div>
  );
}
