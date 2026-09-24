import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import BoardStudentView from "@/components/live/BoardStudentView";
import { Loader2 } from "lucide-react";

/** Особиста дошка учня — зберігається в акаунті. */
export default function StudentBoard({ className = "h-[70vh]" }: { className?: string }) {
  const { user } = useAuth();
  const [initial, setInitial] = useState<any[] | null>(null);
  const els = useRef<Map<string, any>>(new Map());
  const timer = useRef<any>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any).from("student_boards").select("elements").eq("user_id", user.id).maybeSingle();
      const list = Array.isArray(data?.elements) ? data.elements : [];
      els.current = new Map(list.map((e: any) => [e.id, e]));
      setInitial(list);
    })();
  }, [user?.id]);

  const save = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      if (!user) return;
      await (supabase as any).from("student_boards").upsert({ user_id: user.id, elements: [...els.current.values()] });
    }, 800);
  };

  if (!initial) return <div className={`${className} flex items-center justify-center`}><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className={`${className} min-w-0 rounded-md border border-border bg-card overflow-hidden`}>
      <BoardStudentView
        elements={initial}
        className="w-full h-full"
        onDraw={(el: any, live?: boolean) => { if (live) return; els.current.set(el.id, el); save(); }}
        onErase={(id: string) => { els.current.delete(id); save(); }}
      />
    </div>
  );
}
