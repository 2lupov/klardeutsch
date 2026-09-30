import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft, BookMarked, BookOpen, FolderOpen, FolderPlus, Loader2, PenLine, Pencil, Plus, Trash2, X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { plain } from "@/lib/rich-text";
import { fetchNotes, NoteEditor, type NoteRow } from "@/components/student/StudentNotes";
import BookPagePicker from "@/components/student/BookPagePicker";
import { signedPageUrls } from "@/lib/books";
import {
  addFolderPages, createStudentFolder, deleteStudentFolder, listFolderPages, listStudentFolders,
  removeFolderPage, renameStudentFolder, type StudentFolder, type StudentFolderPage,
} from "@/lib/studentFolders";

interface Task { id: string; type: string; title: string; level: string | null; created_at: string; payload: any }

const BUILT_IN = ["Читання", "Письма", "Нотатки"];

/** «Мої папки»: власні папки з довільними назвами — нотатки, сторінки підручників, матеріали уроків. */
export default function StudentFolders({
  onOpenTab, studentId, teacherId,
}: {
  onOpenTab?: (tab: "reading" | "writing") => void;
  studentId?: string;
  teacherId?: string | null;
}) {
  const { user } = useAuth();
  const sid = studentId ?? user?.id ?? "";
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [custom, setCustom] = useState<StudentFolder[]>([]);
  const [pages, setPages] = useState<StudentFolderPage[]>([]);
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [folder, setFolder] = useState<string | null>(null);
  const [note, setNote] = useState<NoteRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [renaming, setRenaming] = useState<StudentFolder | null>(null);
  const [picker, setPicker] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);

  const load = async () => {
    if (!sid) return;
    const [n, t, f, p] = await Promise.all([
      fetchNotes(sid),
      supabase.from("student_assignments").select("id, type, title, level, created_at, payload")
        .eq("student_id", sid).in("type", ["reading", "writing"]).order("created_at", { ascending: false }),
      listStudentFolders(sid).catch(() => []),
      listFolderPages(sid).catch(() => []),
    ]);
    setNotes(n);
    setTasks(((t.data as any) || []) as Task[]);
    setCustom(f);
    setPages(p);
    if (p.length) setUrls(await signedPageUrls(p.map((x) => x.image_path)));
    setLoading(false);
  };
  useEffect(() => { load(); }, [sid]);

  const customNames = useMemo(() => custom.map((f) => f.name), [custom]);

  const folders = useMemo(() => {
    const names = new Set<string>([...BUILT_IN, ...customNames]);
    notes.forEach((n) => names.add(n.folder));
    return [...names].map((name) => {
      const own = custom.find((f) => f.name === name) ?? null;
      return {
        name,
        own,
        emoji: own?.emoji || "📁",
        count: notes.filter((n) => n.folder === name).length
          + (own ? pages.filter((p) => p.folder_id === own.id).length : 0)
          + (name === "Читання" ? tasks.filter((t) => t.type === "reading").length : 0)
          + (name === "Письма" ? tasks.filter((t) => t.type === "writing").length : 0),
      };
    });
  }, [notes, tasks, custom, customNames, pages]);

  const addFolder = async () => {
    const name = newName.trim();
    if (!name) return;
    if (folders.some((f) => f.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Папка з такою назвою вже є");
      return;
    }
    try {
      await createStudentFolder(sid, name, { teacherId: teacherId ?? null });
      setNewName("");
      setCreating(false);
      await load();
      toast.success("Папку створено");
    } catch {
      toast.error("Не вдалося створити папку");
    }
  };

  const createNote = async (folderName: string) => {
    const { data, error } = await (supabase as any).from("student_notes")
      .insert({ student_id: sid, teacher_id: teacherId ?? null, folder: folderName, title: `Нотатка · ${new Date().toLocaleDateString("uk-UA")}`, body: "" })
      .select("*").single();
    if (error) { toast.error("Не вдалося створити нотатку"); return; }
    setNotes((p) => [data as NoteRow, ...p]);
    setNote(data as NoteRow);
  };

  if (note) return <NoteEditor note={note} extraFolders={customNames} onBack={() => { setNote(null); load(); }} />;
  if (loading) return <div className="grid place-items-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  if (folder) {
    const current = folders.find((f) => f.name === folder);
    const own = current?.own ?? null;
    const items = notes.filter((n) => n.folder === folder);
    const folderPages = own ? pages.filter((p) => p.folder_id === own.id) : [];
    const related = folder === "Читання" ? tasks.filter((t) => t.type === "reading")
      : folder === "Письма" ? tasks.filter((t) => t.type === "writing") : [];

    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button animated={false} size="sm" variant="ghost" onClick={() => setFolder(null)}><ArrowLeft /> Папки</Button>
          <span className="font-display text-lg font-bold">{current?.emoji} {folder}</span>
          <div className="ml-auto flex flex-wrap gap-2">
            <Button animated={false} size="sm" variant="outline" onClick={() => createNote(folder)}><Plus /> Нотатка</Button>
            {own && (
              <Button animated={false} size="sm" variant="outline" onClick={() => setPicker(true)}>
                <BookMarked /> Сторінка з книги
              </Button>
            )}
          </div>
        </div>

        {items.length === 0 && related.length === 0 && folderPages.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Папка поки порожня — додай нотатку або сторінку з підручника.
          </div>
        )}

        {folderPages.length > 0 && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {folderPages.map((p) => (
              <div key={p.id} className="group relative overflow-hidden rounded-2xl border border-border bg-card">
                <button className="block w-full" onClick={() => setZoom(urls[p.image_path] || null)}>
                  {urls[p.image_path] ? (
                    <img src={urls[p.image_path]} alt={`Сторінка ${p.page_number}`} className="aspect-[3/4] w-full object-cover" />
                  ) : (
                    <div className="grid aspect-[3/4] w-full place-items-center text-xs text-muted-foreground">…</div>
                  )}
                </button>
                <div className="flex items-center gap-1 px-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                    {p.book_title} · с. {p.page_number}
                  </span>
                  <button
                    className="text-muted-foreground hover:text-destructive"
                    title="Прибрати з папки"
                    onClick={async () => { await removeFolderPage(p.id); setPages((prev) => prev.filter((x) => x.id !== p.id)); }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
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

        {own && (
          <BookPagePicker
            open={picker}
            onOpenChange={setPicker}
            onPick={async (picked) => {
              try {
                await addFolderPages(sid, own.id, picked.map(({ book, page }) => ({
                  book_id: book.id, book_title: book.title, page_number: page.page_number, image_path: page.image_path,
                })), teacherId ?? null);
                await load();
                toast.success(`Додано сторінок: ${picked.length}`);
              } catch {
                toast.error("Не вдалося додати сторінки");
              }
            }}
          />
        )}

        {zoom && (
          <div className="fixed inset-0 z-50 grid place-items-center bg-background/90 p-4" onClick={() => setZoom(null)}>
            <button className="absolute right-4 top-4 rounded-full border border-border bg-card p-2"><X className="h-4 w-4" /></button>
            <img src={zoom} alt="Сторінка" className="max-h-[92vh] max-w-full rounded-xl object-contain" />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <FolderOpen className="h-5 w-5 text-primary" />
        <h2 className="font-display text-xl font-bold">Мої папки</h2>
        <Button animated={false} size="sm" className="ml-auto" onClick={() => setCreating((v) => !v)}>
          <FolderPlus /> Нова папка
        </Button>
      </div>

      {creating && (
        <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3">
          <Input
            autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") addFolder(); }}
            placeholder="Назва папки, напр. «Prüfung B1» або «Мої слова»"
            className="h-10 max-w-sm"
          />
          <Button animated={false} onClick={addFolder}>Створити</Button>
          <Button animated={false} variant="ghost" onClick={() => { setCreating(false); setNewName(""); }}>Скасувати</Button>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {folders.map((f) => (
          <div key={f.name} className="group relative rounded-2xl border border-border bg-card transition-colors hover:border-primary/50">
            <button onClick={() => setFolder(f.name)} className="block w-full p-5 text-left">
              <span className="mb-3 block text-2xl">{f.emoji}</span>
              <p className="font-display font-bold text-foreground">{f.name}</p>
              <p className="text-xs text-muted-foreground">{f.count} {f.count === 1 ? "матеріал" : "матеріалів"}</p>
            </button>
            {f.own && (
              <div className="absolute right-2 top-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  className="rounded-lg border border-border bg-background p-1.5 text-muted-foreground hover:text-foreground"
                  title="Перейменувати"
                  onClick={() => { setRenaming(f.own); setNewName(f.name); }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  className="rounded-lg border border-border bg-background p-1.5 text-muted-foreground hover:text-destructive"
                  title="Видалити папку"
                  onClick={async () => {
                    if (!confirm(`Видалити папку «${f.name}»? Нотатки залишаться.`)) return;
                    await deleteStudentFolder(f.own!.id);
                    await load();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {renaming && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-background/80 p-4">
          <div className="w-full max-w-sm space-y-3 rounded-2xl border border-border bg-card p-5">
            <p className="font-display font-bold">Нова назва папки</p>
            <Input autoFocus value={newName} onChange={(e) => setNewName(e.target.value)} className="h-10" />
            <div className="flex gap-2">
              <Button
                animated={false}
                onClick={async () => {
                  if (!newName.trim()) return;
                  await renameStudentFolder(renaming.id, newName);
                  setRenaming(null); setNewName("");
                  await load();
                }}
              >
                Зберегти
              </Button>
              <Button animated={false} variant="ghost" onClick={() => { setRenaming(null); setNewName(""); }}>Скасувати</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
