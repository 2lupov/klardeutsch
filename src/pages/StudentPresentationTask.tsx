import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PresentationView from "@/components/tutoring/PresentationView";
import { toast } from "sonner";

/** ДЗ з інтерактивної презентації: учень бачить усе, що зробив на уроці, і доробляє вдома. */
export default function StudentPresentationTask() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [task, setTask] = useState<any>(null);
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(1);

  useEffect(() => {
    const presentationId = task?.payload?.presentation_id;
    if (!presentationId) return;
    supabase.from("presentations").select("page_count, html").eq("id", presentationId).maybeSingle()
      .then(({ data }) => setPageCount(data?.html ? 1 : Math.max(1, data?.page_count ?? 1)));
  }, [task?.payload?.presentation_id]);

  useEffect(() => {
    if (!id) return;
    supabase.from("student_assignments").select("id, title, instructions, status, payload, student_id").eq("id", id).maybeSingle()
      .then(({ data }) => setTask(data));
  }, [id]);

  const submit = async () => {
    setBusy(true);
    const { error } = await supabase.from("student_assignments").update({ status: "submitted" }).eq("id", task.id);
    setBusy(false);
    if (error) { toast.error("Не вдалося здати"); return; }
    setTask({ ...task, status: "submitted" });
    toast.success("Здано викладачу");
  };

  if (!task || !user) return <div className="h-[100dvh] grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  const done = !["assigned", "in_progress"].includes(task.status);

  return (
    <div className="h-[100dvh] flex flex-col bg-background">
      <header className="shrink-0 flex flex-wrap items-center gap-2 border-b border-border px-3 py-2 pt-[max(.5rem,env(safe-area-inset-top))] md:px-5">
        <Button animated={false} variant="ghost" size="icon" onClick={() => navigate("/academy")} className="h-11 w-11" aria-label="Назад"><ArrowLeft className="w-4 h-4" /></Button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Інтерактивний урок</p>
          <h1 className="font-display font-bold text-foreground line-clamp-2 break-words text-sm sm:text-base">{task.title}</h1>
        </div>
        {done ? (
          <span className="text-xs font-semibold text-primary flex items-center gap-1"><Check className="w-4 h-4" /> Здано</span>
        ) : (
          <Button animated={false} onClick={submit} disabled={busy} className="h-11 px-3 font-display font-bold"><Check /><span className="sm:hidden">Здати</span><span className="hidden sm:inline">Здати викладачу</span></Button>
        )}
      </header>
      <div className="flex-1 min-h-0 p-0 sm:p-4">
        <PresentationView presentationId={task.payload?.presentation_id} page={page} progressStudentId={task.student_id} />
      </div>
      {pageCount > 1 && <nav aria-label="Слайди" className="flex shrink-0 items-center justify-between gap-3 border-t border-border px-3 py-2 pb-[max(.5rem,env(safe-area-inset-bottom))]"><Button animated={false} variant="outline" size="icon" className="h-11 w-11" disabled={page <= 1} aria-label="Попередній слайд" onClick={() => setPage((value) => value - 1)}><ChevronLeft /></Button><span className="text-sm tabular-nums text-muted-foreground">{page} / {pageCount}</span><Button animated={false} variant="outline" size="icon" className="h-11 w-11" disabled={page >= pageCount} aria-label="Наступний слайд" onClick={() => setPage((value) => value + 1)}><ChevronRight /></Button></nav>}
    </div>
  );
}
