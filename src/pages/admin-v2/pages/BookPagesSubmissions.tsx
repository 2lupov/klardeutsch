import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "./_ui";
import { BookOpen, X, RotateCcw } from "lucide-react";
import TextbookWorkbook from "@/components/textbook/TextbookWorkbook";
import { toast } from "@/hooks/use-toast";

interface Row {
  id: string;
  student_book_id: string;
  page_number: number;
  homework_note: string | null;
  homework_status: string;
  updated_at: string;
  title: string;
  student: string;
}

/** Сторінки підручників, задані учням як ДЗ (окремо від student_assignments). */
export default function BookPagesSubmissions({ nameOf, query }: { nameOf: (id: string) => string; query: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [open, setOpen] = useState<Row | null>(null);

  const load = async () => {
    const { data: sbs } = await (supabase as any).from("student_books").select("id, student_id, book:book_files(title)");
    const list = (sbs || []) as any[];
    if (!list.length) return setRows([]);
    const map = new Map(list.map((s) => [s.id, s]));
    const { data } = await (supabase as any)
      .from("student_book_pages")
      .select("id, student_book_id, page_number, homework_note, homework_status, updated_at")
      .in("student_book_id", list.map((s) => s.id))
      .in("homework_status", ["assigned", "done"])
      .order("updated_at", { ascending: false });
    setRows(((data || []) as any[]).map((p) => {
      const sb: any = map.get(p.student_book_id);
      return { ...p, title: sb?.book?.title || "Підручник", student: sb?.student_id || "" };
    }));
  };
  useEffect(() => { load(); }, []);

  const reopen = async (r: Row) => {
    const { error } = await (supabase as any).from("student_book_pages").update({ homework_status: "assigned" }).eq("id", r.id);
    if (error) return toast({ title: "Помилка", description: error.message, variant: "destructive" });
    toast({ title: "Повернуто учню на доопрацювання" });
    load();
  };

  const s = query.trim().toLowerCase();
  const shown = rows.filter((r) => !s || r.title.toLowerCase().includes(s) || nameOf(r.student).toLowerCase().includes(s));
  const done = shown.filter((r) => r.homework_status === "done");
  const todo = shown.filter((r) => r.homework_status === "assigned");
  if (!shown.length) return null;

  const item = (r: Row) => (
    <Card key={r.id} className="p-4">
      <button className="w-full text-left flex items-start gap-3" onClick={() => setOpen(r)}>
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0" style={{ background: "linear-gradient(135deg,#F59E0B,#D97706)" }}>
          <BookOpen className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate">{r.title} · стор. {r.page_number}</p>
          <p className="text-xs text-slate-500 truncate">{nameOf(r.student)}{r.homework_note ? ` · ${r.homework_note}` : ""}</p>
          <p className="text-[11px] text-slate-400 mt-1">{new Date(r.updated_at).toLocaleString("uk-UA")}</p>
        </div>
        <span className="text-[11px] font-semibold px-2 py-1 rounded-full shrink-0" style={r.homework_status === "done" ? { background: "#FEF3C7", color: "#92400E" } : { background: "#E0E7FF", color: "#3730A3" }}>
          {r.homework_status === "done" ? "Здано" : "Видано"}
        </span>
      </button>
    </Card>
  );

  return (
    <div className="space-y-3">
      <p className="text-xs uppercase tracking-widest font-bold text-slate-500">📕 Сторінки підручників · здано {done.length}</p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{[...done, ...todo].map(item)}</div>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3" onClick={() => setOpen(null)}>
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[92dvh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-2 p-3 border-b">
              <p className="font-semibold text-sm flex-1 truncate">{nameOf(open.student)} · {open.title} · стор. {open.page_number}</p>
              {open.homework_status === "done" && (
                <button onClick={() => { reopen(open); setOpen(null); }} className="text-xs px-3 py-1.5 rounded-lg border inline-flex items-center gap-1">
                  <RotateCcw className="w-3.5 h-3.5" /> На доопрацювання
                </button>
              )}
              <button onClick={() => setOpen(null)} className="p-1.5 rounded-lg hover:bg-slate-100"><X className="w-4 h-4" /></button>
            </div>
            <div className="flex-1 min-h-0 overflow-auto p-2">
              <TextbookWorkbook studentBookId={open.student_book_id} page={open.page_number} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
