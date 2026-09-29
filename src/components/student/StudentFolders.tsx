import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, FolderOpen, Loader2, PenLine } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { plain } from "@/lib/rich-text";
import { fetchNotes, NoteEditor, type NoteRow } from "@/components/student/StudentNotes";

interface Task { id: string; type: string; title: string; level: string | null; created_at: string; payload: any }

/** «Мої папки»: особистий архів учня — тексти, листи й нотатки з уроків. */
export default function StudentFolders({ onOpenTab }: { onOpenTab?: (tab: "reading" | "writing") => void }) {
  const { user } = useAuth();
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState<string | null>(null);
  const [note, setNote] = useState<NoteRow | null>(null);

  const load = async () => {
    if (!user) return;
    const [n, t] = await Promise.all([
      fetchNotes(user.id),
      supabase.from("student_assignments").select("id, type, title, level, created_at, payload")
        .eq("student_id", user.id).in("type", ["reading", "writing"]).order("created_at", { ascending: false }),
    ]);
    setNotes(n);
    setTasks(((t.data as any) || []) as Task[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [user?.id]);

  const folders = useMemo(() => {
    const names = new Set<string>(["Читання", "Письма", "Нотатки"]);
    notes.forEach((n) => names.add(n.folder));
    return [...names].map((name) => ({
      name,
      count: notes.filter((n) => n.folder === name).length
        + (name === "Читання" ? tasks.filter((t) => t.type === "reading").length : 0)
        + (name === "Письма" ? tasks.filter((t) => t.type === "writing").length : 0),
    }));
  }, [notes, tasks]);

  if (note) return <NoteEditor note={note} onBack={() => { setNote(null); load(); }} />;
  if (loading) return <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (folder) {
    const items = notes.filter((n) => n.folder === folder);
    const related = folder === "Читання" ? tasks.filter((t) => t.type === "reading")
      : folder === "Письма" ? tasks.filter((t) => t.type === "writing") : [];
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Button animated={false} size="sm" variant="ghost" onClick={() => setFolder(null)}><ArrowLeft /> Папки</Button>
          <span className="font-display text-lg font-bold">{folder}</span>
        </div>
        {items.length === 0 && related.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Папка поки порожня.
          </div>
        )}
        <div className="space-y-2">
          {items.map((n) => (
            <button key={n.id} onClick={() => setNote(n)}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left hover:border-primary/50">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">📝</span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-foreground">{n.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  {new Date(n.created_at).toLocaleDateString("uk-UA")} · {plain(n.body).slice(0, 60) || "порожня"}
                </span>
              </span>
            </button>
          ))}
          {related.map((t) => (
            <button key={t.id} onClick={() => onOpenTab?.(t.type === "reading" ? "reading" : "writing")}
              className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card p-4 text-left hover:border-primary/50">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/15 text-primary">
                {t.type === "reading" ? <BookOpen className="h-5 w-5" /> : <PenLine className="h-5 w-5" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate font-semibold text-foreground">{t.payload?.topic?.title_de || t.title}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  завдання · {new Date(t.created_at).toLocaleDateString("uk-UA")}
                </span>
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <FolderOpen className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold">Мої папки</h2>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {folders.map((f) => (
          <button key={f.name} onClick={() => setFolder(f.name)}
            className="rounded-2xl border border-border bg-card p-5 text-left transition-colors hover:border-primary/50">
            <FolderOpen className="mb-3 h-7 w-7 text-primary" />
            <p className="font-display font-bold text-foreground">{f.name}</p>
            <p className="text-xs text-muted-foreground">{f.count} {f.count === 1 ? "матеріал" : "матеріалів"}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
