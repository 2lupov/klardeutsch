import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import StudentBlocks from "./StudentBlocks";
import type { LessonBlock } from "./types";

/** Завантажує видимі блоки уроку і показує їх учню. */
export default function StudentLessonBlocks({
  lessonId,
  studentId,
}: {
  lessonId: string;
  studentId?: string | null;
}) {
  const [blocks, setBlocks] = useState<LessonBlock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase
        .from("tutoring_lesson_blocks")
        .select("*")
        .eq("lesson_id", lessonId)
        .eq("visible_to_student", true)
        .order("sort_order");
      if (!alive) return;
      setBlocks(((data ?? []) as any[]).map((b) => ({ ...b, payload: b.payload ?? {} })) as LessonBlock[]);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [lessonId]);

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (blocks.length === 0) {
    return <div className="py-12 text-center text-muted-foreground">Завдань ще немає</div>;
  }
  return <StudentBlocks blocks={blocks} studentId={studentId ?? null} showActions />;
}
