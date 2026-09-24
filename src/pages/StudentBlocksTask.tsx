import { useEffect, useRef, useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import LessonReader from "@/components/blocks/LessonReader";
import PandaLookupFab from "@/components/dictionary/PandaLookup";
import { type KitBlock, type KitSection } from "@/lib/lesson-kits";

/** Домашка-набір блоків: учень виконує і здає результат. */
export default function StudentBlocksTask() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [task, setTask] = useState<any>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

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

  const submit = async (score: number, max: number, values?: Record<string, any>) => {
    if (!user || !task || submittingRef.current || done) throw new Error("Завдання вже здається або завершене");
    submittingRef.current = true;
    setSubmitting(true);
    const percent = max > 0 ? Math.round((score / max) * 100) : 0;
    try {
      const { data: existing, error: lookupError } = await supabase.from("student_submissions").select("id").eq("assignment_id", task.id).eq("student_id", user.id).limit(1);
      if (lookupError) throw lookupError;
      if (!existing?.length) {
        const { error } = await supabase.from("student_submissions").insert({
          assignment_id: task.id,
          student_id: user.id,
          answers: { score, max, values: values ?? {} } as any,
          auto_score: percent,
          status: "submitted",
          submitted_at: new Date().toISOString(),
        });
        if (error) throw error;
      }
      const { error: statusError } = await supabase.from("student_assignments").update({ status: "submitted" }).eq("id", task.id);
      if (statusError) throw statusError;
      setDone(true);
      toast.success(`Здано! Результат ${percent}%`);
    } catch (error: any) {
      throw error;
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <Loader2 className="h-7 w-7 animate-spin text-primary" />
      </div>
    );
  }
  if (!task) return null;

  const sections = (task.payload?.sections ?? []) as KitSection[];
  // Multi-topic assignments use the same aggregate progress/submission flow as mini-courses.
  if (sections.length > 1) return <Navigate to={`/minicourse/${task.id}`} replace />;

  return (
    <div className="flex h-[100dvh] min-h-0 flex-col overflow-hidden bg-background">
      <header className="z-20 flex shrink-0 items-center gap-3 border-b bg-card/95 px-4 py-3 backdrop-blur">
        <button onClick={() => navigate("/academy")} className="text-muted-foreground hover:text-foreground">
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

      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden overscroll-contain">
        <div className="mx-auto max-w-3xl p-4">
          <LessonReader title={task.title} level={task.level} sections={sections.length ? sections : [{ id: "main", title: task.title, emoji: "", summary: null, layout: "practice", blocks: (task.payload?.blocks ?? []) as KitBlock[] }]} pagePaths={task.payload?.page_paths ?? []} imageBucket={task.payload?.presentation_id ? "presentation-slides" : "tutoring-materials"} readOnly={done} showActions={!done && !submitting} onSubmitted={submit} draftKey={`klar:kit:${user?.id}:${id}`} />
        </div>
      </main>

      <PandaLookupFab label="Словник" />
    </div>
  );
}
