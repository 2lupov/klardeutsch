import { useState } from "react";
import { FolderDown, Loader2, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { plain } from "@/lib/rich-text";
import { createFolder, createItem, fetchFolders } from "@/lib/materials";
import MarkSheet from "@/components/live/MarkSheet";
import { useLiveReading } from "@/components/live/useLiveReading";

/** «Нотатки» живого уроку: спільний зошит викладача й учня. */
export default function LiveNotes({
  classId, role, studentId, teacherId, className,
}: { classId: string; role: "teacher" | "student"; studentId?: string; teacherId?: string; className?: string }) {
  const { notes, remote, push, onRemote } = useLiveReading(classId);
  const [busy, setBusy] = useState(false);

  const saveToFolder = async () => {
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const ownerId = teacherId || u.user!.id;
      const date = new Date().toLocaleDateString("uk-UA");
      const title = `Нотатки з уроку · ${date}`;
      const folders = await fetchFolders();
      const id = folders.find((f) => f.name === "Нотатки")?.id
        ?? (await createFolder({ ownerId, name: "Нотатки", category: "theory", level: null, description: "Нотатки з живих уроків" })).id;
      await createItem({ folderId: id, ownerId, kind: "text", title, level: null, tags: ["нотатки", date],
        content: { body: plain(notes), html: notes, date: new Date().toISOString() } });
      if (studentId) {
        await (supabase as any).from("student_notes").insert({
          student_id: studentId, teacher_id: ownerId, folder: "Нотатки", title, body: notes,
          source: { kind: "live_notes", class_id: classId },
        });
      }
      toast.success(`Збережено: ${title}`);
    } catch (e: any) {
      toast.error(e?.message || "Не вдалося зберегти");
    } finally { setBusy(false); }
  };

  return (
    <div className={cn("flex min-h-0 flex-col gap-2", className)}>
      <div className="flex shrink-0 items-center gap-2 px-1 text-primary">
        <NotebookPen className="h-4 w-4" />
        <span className="text-xs font-bold uppercase tracking-widest">Спільний зошит</span>
        {remote === "notes" && <span className="text-xs">{role === "teacher" ? "учень пише…" : "викладач пише…"}</span>}
        {role === "teacher" && (
          <Button animated={false} size="sm" variant="outline" className="ml-auto h-7 text-xs" onClick={saveToFolder} disabled={busy || !plain(notes)}>
            {busy ? <Loader2 className="animate-spin" /> : <FolderDown />} Зберегти в папку
          </Button>
        )}
      </div>
      <MarkSheet
        className="min-h-0 flex-1"
        value={notes}
        onChange={(html) => push("notes", html)}
        register={(set) => onRemote("notes", set)}
        placeholder="Правила, приклади, помилки, слова…"
      />
    </div>
  );
}
