import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, X, Loader2, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { approveRequest, declineRequest, formatSlot, listRequests, type SlotRequest } from "@/lib/lesson-requests";
import { listAssignableStudents, type AssignableStudent } from "@/lib/kit-from-book";

interface Planned {
  id: string;
  title: string;
  starts_at: string;
  duration_min: number;
  status: string;
}

export default function SchedulePage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<SlotRequest[]>([]);
  const [students, setStudents] = useState<AssignableStudent[]>([]);
  const [planned, setPlanned] = useState<Planned[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  // Manual lesson scheduling (admin only)
  const [studentId, setStudentId] = useState("");
  const [lessonDate, setLessonDate] = useState("");
  const [lessonTime, setLessonTime] = useState("17:00");
  const [durationMin, setDurationMin] = useState(60);
  const [adding, setAdding] = useState(false);

  const names = useMemo(() => new Map(students.map((s) => [s.id, s.name])), [students]);

  const load = async () => {
    const [reqs, sts] = await Promise.all([listRequests(), listAssignableStudents()]);
    setRequests(reqs);
    setStudents(sts);
    const { data } = await supabase
      .from("school_schedule")
      .select("id, title, starts_at, duration_min, status")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(30);
    setPlanned((data ?? []) as Planned[]);
    setLoading(false);
  };

  useEffect(() => {
    load().catch(() => setLoading(false));
  }, []);

  const approve = async (r: SlotRequest) => {
    if (!user) return;
    setBusy(r.id);
    try {
      await approveRequest(r, user.id, names.get(r.student_id) ?? "Учень");
      toast.success("Підтверджено — заняття в графіку");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Не вдалося підтвердити");
    } finally {
      setBusy(null);
    }
  };

  const decline = async (r: SlotRequest) => {
    if (!user) return;
    setBusy(r.id);
    try {
      await declineRequest(r.id, user.id);
      toast.success("Відхилено — учень обере інші часи");
      await load();
    } catch (e: any) {
      toast.error(e.message ?? "Не вдалося відхилити");
    } finally {
      setBusy(null);
    }
  };

  const pending = requests.filter((r) => r.status === "pending");
  const handled = requests.filter((r) => r.status !== "pending").slice(0, 12);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-black flex items-center gap-2">
          <CalendarClock className="w-6 h-6 text-primary" /> Графік занять
        </h1>
        <p className="text-sm text-muted-foreground mt-1">Учні надсилають зручні часи — ви підтверджуєте або відхиляєте.</p>
      </header>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Завантаження…
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <h2 className="text-lg font-display font-black">Нові заявки {pending.length > 0 && `(${pending.length})`}</h2>
            {pending.length === 0 ? (
              <p className="text-sm text-muted-foreground">Поки немає нових заявок.</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {pending.map((r) => (
                  <div key={r.id} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                    <div>
                      <div className="font-bold">{names.get(r.student_id) ?? "Учень"}</div>
                      <div className="text-xs text-muted-foreground">
                        тиждень з {new Date(`${r.week_start}T00:00:00`).toLocaleDateString("uk-UA")}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {r.slots.map((s) => (
                        <span key={s.starts_at} className="px-2.5 py-1 rounded-lg bg-muted text-[11px] font-bold">
                          {formatSlot(s)}
                        </span>
                      ))}
                    </div>
                    {r.note && <p className="text-xs text-muted-foreground italic">«{r.note}»</p>}
                    <div className="flex gap-2">
                      <button
                        onClick={() => approve(r)}
                        disabled={busy === r.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-50"
                      >
                        <Check className="w-3.5 h-3.5" /> Підтвердити
                      </button>
                      <button
                        onClick={() => decline(r)}
                        disabled={busy === r.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-bold disabled:opacity-50"
                      >
                        <X className="w-3.5 h-3.5" /> Відхилити
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-display font-black flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-primary" /> Найближчі заняття
            </h2>
            {planned.length === 0 ? (
              <p className="text-sm text-muted-foreground">Запланованих занять немає.</p>
            ) : (
              <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
                {planned.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="font-bold text-sm">{p.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(p.starts_at).toLocaleString("uk-UA", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}{" "}
                      · {p.duration_min} хв
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {handled.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-lg font-display font-black">Оброблені заявки</h2>
              <ul className="divide-y divide-border rounded-2xl border border-border bg-card">
                {handled.map((r) => (
                  <li key={r.id} className="px-4 py-3 flex items-center justify-between gap-3">
                    <span className="text-sm font-bold">{names.get(r.student_id) ?? "Учень"}</span>
                    <span className="text-xs text-muted-foreground">
                      {r.slots.map((s) => formatSlot(s)).join(" · ")}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        r.status === "approved" ? "bg-emerald-500/10 text-emerald-600" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {r.status === "approved" ? "Підтверджено" : "Відхилено"}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
