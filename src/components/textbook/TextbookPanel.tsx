import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { listLibraryBooks, type LibraryBook } from "@/lib/book-library";
import TextbookWorkbook from "./TextbookWorkbook";

interface Row { id: string; book_file_id: string; current_page: number; book: { title: string } | null }

/** Вкладка «Підручник» у вчителя: закріплена за учнем книга + нотатки на сторінках. */
export default function TextbookPanel({
  teacherId,
  studentId,
  current,
  onTransfer,
}: {
  teacherId: string;
  studentId: string;
  current: { student_book_id: string; page: number } | null;
  onTransfer: (studentBookId: string, page: number) => void;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [library, setLibrary] = useState<LibraryBook[]>([]);
  const [activeId, setActiveId] = useState<string | null>(current?.student_book_id ?? null);
  const [page, setPage] = useState(current?.page ?? 1);
  const [addId, setAddId] = useState("");
  const [hwNote, setHwNote] = useState("");

  const load = async () => {
    const { data } = await (supabase as any)
      .from("student_books")
      .select("id, book_file_id, current_page, book:book_files(title)")
      .eq("student_id", studentId)
      .order("created_at", { ascending: false });
    const list = (data || []) as Row[];
    setRows(list);
    if (!activeId && list[0]) { setActiveId(list[0].id); setPage(list[0].current_page || 1); }
  };

  useEffect(() => { load(); listLibraryBooks().then(setLibrary).catch(() => {}); }, [studentId]);

  const attach = async () => {
    if (!addId) return;
    const { data, error } = await (supabase as any)
      .from("student_books")
      .upsert({ teacher_id: teacherId, student_id: studentId, book_file_id: addId }, { onConflict: "student_id,book_file_id" })
      .select("id")
      .single();
    if (error) { toast({ title: "Не вдалося", description: error.message, variant: "destructive" }); return; }
    toast({ title: "Підручник закріплено за учнем", description: "Він також зʼявився в його Академії." });
    setAddId("");
    setActiveId(data.id);
    setPage(1);
    load();
  };

  const giveHomework = async () => {
    if (!activeId) return;
    const { error } = await (supabase as any)
      .from("student_book_pages")
      .upsert({ student_book_id: activeId, page_number: page, homework_status: "assigned", homework_note: hwNote.trim() || null }, { onConflict: "student_book_id,page_number" });
    if (error) { toast({ title: "Помилка", description: error.message, variant: "destructive" }); return; }
    toast({ title: `Сторінку ${page} задано як домашку` });
    setHwNote("");
  };

  const followStudent = current?.student_book_id === activeId;
  const changePage = (p: number) => {
    setPage(p);
    if (followStudent && activeId) onTransfer(activeId, p);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {rows.map((r) => (
          <button
            key={r.id}
            onClick={() => { setActiveId(r.id); setPage(r.current_page || 1); }}
            className={`px-3 py-2 rounded-xl text-sm border ${r.id === activeId ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 text-slate-700"}`}
          >
            📖 {r.book?.title || "Книга"}
          </button>
        ))}
        <select value={addId} onChange={(e) => setAddId(e.target.value)} className="h-9 rounded-xl border border-slate-200 px-2 text-sm">
          <option value="">+ Закріпити книгу з бібліотеки…</option>
          {library.filter((b) => !rows.some((r) => r.book_file_id === b.id)).map((b) => (
            <option key={b.id} value={b.id}>{b.title}{b.level ? ` · ${b.level}` : ""}</option>
          ))}
        </select>
        {addId && <button onClick={attach} className="h-9 px-3 rounded-xl bg-indigo-600 text-white text-sm">Закріпити</button>}
      </div>

      {!activeId ? (
        <p className="text-sm text-slate-500">Закріпіть за учнем книгу з бібліотеки — вона завжди буде тут і в його Академії.</p>
      ) : (
        <>
          <TextbookWorkbook key={activeId} studentBookId={activeId} page={page} onPageChange={changePage} syncPage />
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => onTransfer(activeId, page)} className="px-4 py-2 rounded-xl text-white text-sm font-medium" style={{ background: "#0F172A" }}>
              Перенести учня сюди (стор. {page})
            </button>
            {followStudent && <span className="text-xs text-emerald-600">Учень гортає разом з вами</span>}
            <input value={hwNote} onChange={(e) => setHwNote(e.target.value)} placeholder="Що зробити (напр. впр. 3, 4)" className="h-9 flex-1 min-w-[200px] rounded-xl border border-slate-200 px-3 text-sm" />
            <button onClick={giveHomework} className="px-4 py-2 rounded-xl bg-amber-400 text-slate-900 text-sm font-medium">Дати стор. {page} як домашку</button>
          </div>
        </>
      )}
    </div>
  );
}
