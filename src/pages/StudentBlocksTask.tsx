import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import StudentBlocks from "@/components/blocks/StudentBlocks";
import PandaLookupFab from "@/components/dictionary/PandaLookup";
import { kitBlocksToLessonBlocks, type KitBlock } from "@/lib/lesson-kits";

/** Домашка-набір блоків: учень виконує і здає результат. */
export default function StudentBlocksTask() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<any>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("student_assignments")
        .select("id, title, instructions, payload, status, level")
        .eq("id", id)
        .maybeSingle();
      setTask(data);
      setDone(!!data && data.status !== "assigned" && data.status !== "in_progress");
      setLoading(false);
    })();
  }, [id]);

  const submit = async (score: number, max: number) => {
    if (!user || !task) return;
    const percent = max > 0 ? Math.round((score / max) * 100) : 0;
    const { error } = await supabase.from("student_submissions").insert({
      assignment_id: task.id,
      student_id: user.id,
      answers: { score, max } as any,
      auto_score: percent,
      status: "submitted",
      submitted_at: new Date().toISOString(),
    });
    if (error) return toast.error(error.message);
    await supabase.from("student_assignments").update({ status: "submitted" }).eq("id", task.id);
    setDone(true);
    toast.success(`Здано! Результат ${percent}%`);
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }
  if (!task) return null;

  const blocks = kitBlocksToLessonBlocks((task.payload?.blocks ?? []) as KitBlock[], task.id);

  return (
    <div className="min-h-[100dvh] bg-background">
      <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-card/95 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate("/assignments")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="min-w-0">
          <h1 className="truncate text-sm font-semibold">{task.title}</h1>
          {task.instructions && <p className="truncate text-xs text-muted-foreground">{task.instructions}</p>}
        </div>
        {done && (
          <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
            <CheckCircle2 className="h-3.5 w-3.5" /> Здано
          </span>
        )}
      </header>

      <main className="mx-auto max-w-3xl p-4">
        <StudentBlocks blocks={blocks} persist={false} readOnly={done} showActions={!done} onSubmitted={submit} />
      </main>

      <PandaLookupFab label="Словник" />
    </div>
  );
}
