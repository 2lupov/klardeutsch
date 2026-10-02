import { useEffect, useRef, useState } from "react";
import { Upload, Trash2, ArrowLeft, Pencil } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import HtmlSlides from "@/components/live/HtmlSlides";

type Doc = { id: string; title: string; html: string; created_at: string };
const db = supabase as any;

export default function HtmlDocs() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [open, setOpen] = useState<Doc | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    const { data, error } = await db.from("dutch_html_docs").select("*").order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setDocs(data ?? []);
  };
  useEffect(() => { load(); }, []);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length || !user) return;
    for (const f of Array.from(files)) {
      if (!/\.(html?|svg)$/i.test(f.name)) { toast.error(`${f.name}: тільки .html або .svg`); continue; }
      const { error } = await db.from("dutch_html_docs").insert({
        user_id: user.id, title: f.name.replace(/\.(html?|svg)$/i, ""), html: await f.text(),
      });
      if (error) toast.error(error.message); else toast.success(`${f.name} збережено`);
    }
    if (fileRef.current) fileRef.current.value = "";
    load();
  };

  const rename = async (d: Doc) => {
    const t = window.prompt("Назва", d.title);
    if (!t?.trim()) return;
    await db.from("dutch_html_docs").update({ title: t.trim() }).eq("id", d.id);
    load();
  };
  const remove = async (d: Doc) => {
    if (!window.confirm(`Видалити «${d.title}»?`)) return;
    await db.from("dutch_html_docs").delete().eq("id", d.id);
    load();
  };

  if (open) {
    return (
      <div className="flex flex-col gap-3 h-[calc(100dvh-180px)]">
        <button onClick={() => setOpen(null)} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground w-fit">
          <ArrowLeft className="h-4 w-4" /> {open.title}
        </button>
        <HtmlSlides html={open.html} className="flex-1 min-h-0" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <input ref={fileRef} type="file" accept=".html,.htm,.svg" multiple hidden onChange={(e) => onFiles(e.target.files)} />
      <button
        onClick={() => fileRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); onFiles(e.dataTransfer.files); }}
        className="w-full rounded-xl border-2 border-dashed border-border p-8 flex flex-col items-center gap-2 text-muted-foreground hover:border-primary hover:text-foreground transition"
      >
        <Upload className="h-6 w-6" />
        Завантажити .html / .svg (або перетягни сюди)
      </button>
      {docs.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground">Ще немає документів</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2">
          {docs.map((d) => (
            <div key={d.id} className="flex items-center gap-2 rounded-lg border border-border bg-card p-3">
              <button onClick={() => setOpen(d)} className="flex-1 text-left truncate font-medium hover:text-primary">{d.title}</button>
              <button onClick={() => rename(d)} className="p-1 text-muted-foreground hover:text-foreground"><Pencil className="h-4 w-4" /></button>
              <button onClick={() => remove(d)} className="p-1 text-muted-foreground hover:text-destructive"><Trash2 className="h-4 w-4" /></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
