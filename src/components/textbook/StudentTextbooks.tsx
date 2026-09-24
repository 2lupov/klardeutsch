import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import TextbookWorkbook from "./TextbookWorkbook";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Check } from "lucide-react";

interface Book { id: string; current_page: number; book: { title: string; level: string | null } | null }
interface Hw { id: string; student_book_id: string; page_number: number; homework_note: string | null; homework_status: string }

/** Академія учня: закріплені підручники і домашні сторінки. */
export default function StudentTextbooks() {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [hw, setHw] = useState<Hw[]>([]);
  const [open, setOpen] = useState<{ id: string; page: number; hwId?: string } | null>(null);

  const load = async () => {
    if (!user) return;
    const { data } = await (supabase as any)
      .from("student_books")
      .select("id, current_page, book:book_files(title, level)")
      .eq("student_id", user.id);
    const list = (data || []) as Book[];
    setBooks(list);
    if (list.length) {
      const { data: h } = await (supabase as any)
        .from("student_book_pages")
        .select("id, student_book_id, page_number, homework_note, homework_status")
        .in("student_book_id", list.map((b) => b.id))
        .in("homework_status", ["assigned", "done"])
        .order("updated_at", { ascending: false });
      setHw((h || []) as Hw[]);
    }
  };
  useEffect(() => { load(); }, [user?.id]);

  const markDone = async (hwId: string) => {
    await (supabase as any).from("student_book_pages").update({ homework_status: "done" }).eq("id", hwId);
    if (user) await supabase.rpc("award_coins", { p_user_id: user.id, p_amount: 10, p_reason: "Домашка в підручнику" });
    toast.success("Домашку здано!");
    setOpen(null);
    load();
  };

  if (open) {
    return (
      <div className="space-y-3 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={() => { setOpen(null); load(); }}><ArrowLeft /> Назад до підручників</Button>
          {open.hwId && (
            <Button size="sm" onClick={() => { if (open.hwId) markDone(open.hwId); }}><Check /> Здати сторінку</Button>
          )}
        </div>
        <TextbookWorkbook studentBookId={open.id} page={open.page} onPageChange={(p) => setOpen({ ...open, page: p })} />
      </div>
    );
  }

  if (!books.length) {
    return <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">Викладач ще не закріпив за вами підручник.</div>;
  }

  const title = (id: string) => books.find((b) => b.id === id)?.book?.title || "Підручник";
  const todo = hw.filter((h) => h.homework_status === "assigned");

  return (
    <div className="space-y-5">
      {todo.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs uppercase tracking-widest text-primary font-bold">Домашка в підручнику</p>
          {todo.map((h) => (
            <button key={h.id} onClick={() => setOpen({ id: h.student_book_id, page: h.page_number, hwId: h.id })} className="w-full text-left rounded-2xl border border-primary/40 bg-primary/5 p-4 hover:bg-primary/10 transition">
              <p className="font-display font-bold">{title(h.student_book_id)} · стор. {h.page_number}</p>
              {h.homework_note && <p className="text-sm text-muted-foreground mt-1">{h.homework_note}</p>}
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {books.map((b) => (
          <button key={b.id} onClick={() => setOpen({ id: b.id, page: b.current_page || 1 })} className="text-left rounded-2xl border border-border bg-card p-5 hover:border-primary transition">
            <p className="text-3xl">📖</p>
            <p className="font-display font-bold mt-2">{b.book?.title}</p>
            <p className="text-xs text-muted-foreground mt-1">{b.book?.level ? `${b.book.level} · ` : ""}стор. {b.current_page || 1}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
