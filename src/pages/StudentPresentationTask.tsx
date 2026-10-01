import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
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
      <header className="shrink-0 flex items-center gap-3 border-b border-border px-3 py-2 md:px-5">
        <button onClick={() => navigate("/academy")} className="p-2 rounded-xl hover:bg-muted" aria-label="Назад"><ArrowLeft className="w-4 h-4" /></button>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-widest text-primary font-bold">Інтерактивний урок</p>
          <h1 className="font-display font-bold text-foreground truncate">{task.title}</h1>
        </div>
        {done ? (
          <span className="text-xs font-semibold text-primary flex items-center gap-1"><Check className="w-4 h-4" /> Здано</span>
        ) : (
          <button onClick={submit} disabled={busy} className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-display font-bold disabled:opacity-50">
            Здати викладачу
          </button>
        )}
      </header>
      <div className="flex-1 min-h-0 p-2 sm:p-4">
        <PresentationView presentationId={task.payload?.presentation_id} page={1} progressStudentId={task.student_id} />
      </div>
    </div>
  );
}
