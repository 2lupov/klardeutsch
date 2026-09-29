import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, NotebookPen, Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import MarkSheet from "@/components/live/MarkSheet";
import { plain } from "@/lib/rich-text";

export interface NoteRow {
  id: string;
  folder: string;
  title: string;
  body: string;
  level: string | null;
  created_at: string;
  source: any;
}

export const FOLDERS = ["Нотатки", "Читання", "Письма", "Граматика", "Слова"];

export async function fetchNotes(studentId: string) {
  const { data } = await (supabase as any).from("student_notes").select("*")
    .eq("student_id", studentId).order("created_at", { ascending: false });
  return (data || []) as NoteRow[];
}

/** «Нотатки» в Академії учня: власний зошит із папками; усе зберігається. */
export default function StudentNotes({ folder }: { folder?: string }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<NoteRow | null>(null);

  const load = async () => {
    if (!user) return;
    setNotes(await fetchNotes(user.id));
    setLoading(false);
  };
  useEffect(() => { load(); }, [user?.id]);

  const create = async () => {
    if (!user) return;
    const { data, error } = await (supabase as any).from("student_notes")
      .insert({ student_id: user.id, folder: folder || "Нотатки", title: `Нотатка · ${new Date().toLocaleDateString("uk-UA")}`, body: "" })
      .select("*").single();
    if (error) { toast.error("Не вдалося створити нотатку"); return; }
    setNotes((p) => [data as NoteRow, ...p]);
    setOpen(data as NoteRow);
  };

  if (open) return <NoteEditor note={open} onBack={() => { setOpen(null); load(); }} />;
  if (loading) return <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  const list = folder ? notes.filter((n) => n.folder === folder) : notes;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <NotebookPen className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold">{folder || "Нотатки"}</h2>
        <Button animated={false} size="sm" className="ml-auto" onClick={create}><Plus /> Нова</Button>
      </div>

      {list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Тут будуть твої нотатки з уроків 📝
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((n) => (
            <button key={n.id} onClick={() => setOpen(n)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left transition-colors hover:border-primary/50">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">📝</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-foreground">{n.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {n.folder} · {new Date(n.created_at).toLocaleDateString("uk-UA")} · {plain(n.body).slice(0, 60) || "порожня"}
                </span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function NoteEditor({ note, onBack }: { note: NoteRow; onBack: () => void }) {
  const [title, setTitle] = useState(note.title);
  const [body, setBody] = useState(note.body || "");
  const [folder, setFolder] = useState(note.folder);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    setSaved(false);
    const t = setTimeout(async () => {
      await (supabase as any).from("student_notes").update({ title, body, folder }).eq("id", note.id);
      setSaved(true);
    }, 700);
    return () => clearTimeout(t);
  }, [title, body, folder, note.id]);

  const remove = async () => {
    await (supabase as any).from("student_notes").delete().eq("id", note.id);
    toast.success("Нотатку видалено");
    onBack();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Button animated={false} size="sm" variant="ghost" onClick={onBack}><ArrowLeft /> Назад</Button>
        <span className="ml-auto text-xs text-muted-foreground">{saved ? "Збережено" : "Зберігаємо…"}</span>
        <Button animated={false} size="icon" variant="ghost" onClick={remove} title="Видалити"><Trash2 /></Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <Input value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 max-w-sm" placeholder="Назва" />
        <div className="flex flex-wrap gap-1">
          {FOLDERS.map((f) => (
            <Button key={f} animated={false} size="sm" variant={f === folder ? "default" : "outline"} className="h-9" onClick={() => setFolder(f)}>{f}</Button>
          ))}
        </div>
      </div>
      <MarkSheet className="min-h-[55vh]" value={body} onChange={setBody} placeholder="Пиши сюди…" />
    </div>
  );
}
