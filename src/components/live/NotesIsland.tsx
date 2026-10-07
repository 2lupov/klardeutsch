import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import LiveNotes from "@/components/live/LiveNotes";
import PandaLookupFab from "@/components/dictionary/PandaLookup";

const fab = "grid size-12 place-items-center rounded-full bg-primary text-primary-foreground shadow-lg text-xl transition hover:scale-105";

/**
 * Плаваючі кнопки живого уроку: 📝 нотатки (острівцем) над 🐼 словником.
 * Коли викладач відкриває нотатки — у учня вони теж відкриваються; учень може відкривати й сам.
 */
export default function NotesIsland({
  classId, role, studentId, teacherId, withPanda = false, bottomClass = "bottom-4",
}: {
  classId: string; role: "teacher" | "student"; studentId?: string; teacherId?: string;
  withPanda?: boolean; bottomClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const chan = useRef<any>(null);

  useEffect(() => {
    const ch = supabase.channel(`live-notes-island:${classId}`, { config: { broadcast: { self: false } } });
    if (role === "student") ch.on("broadcast", { event: "open" }, ({ payload }: any) => setOpen(!!payload?.open));
    ch.subscribe();
    chan.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [classId, role]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (role === "teacher") chan.current?.send({ type: "broadcast", event: "open", payload: { open: next } });
  };

  return (
    <div className={`fixed right-4 ${bottomClass} z-[60] flex flex-col items-end gap-2`}>
      {open && (
        <div className="w-[min(92vw,380px)] h-[min(60vh,460px)] rounded-2xl border border-border bg-card/95 backdrop-blur-xl shadow-2xl flex flex-col p-2">
          <LiveNotes classId={classId} role={role} studentId={studentId} teacherId={teacherId} className="flex-1" />
        </div>
      )}
      <button onClick={toggle} className={fab} title={open ? "Закрити нотатки" : "Нотатки"} aria-label="Нотатки">
        {open ? "✕" : "📝"}
      </button>
      {withPanda && <PandaLookupFab label="" className={fab} />}
    </div>
  );
}
