import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, Loader2, Clock3 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  createRequest,
  formatSlot,
  getMyRequest,
  nextWeekStart,
  weekDays,
  type SlotChoice,
  type SlotRequest,
} from "@/lib/lesson-requests";

const HOURS = ["09:00", "10:00", "11:00", "12:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];
const MAX_SLOTS = 3;

const iso = (day: Date, hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(day);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

/** Щотижневе питання учню: на коли призначаємо наступні заняття. */
export default function NextLessonsCard() {
  const { user } = useAuth();
  const weekStart = useMemo(() => nextWeekStart(), []);
  const days = useMemo(() => weekDays(weekStart), [weekStart]);
  const [req, setReq] = useState<SlotRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [dayIdx, setDayIdx] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    getMyRequest(user.id, weekStart)
      .then(setReq)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [user, weekStart]);

  const toggle = (value: string) =>
    setPicked((p) =>
      p.includes(value) ? p.filter((x) => x !== value) : p.length >= MAX_SLOTS ? p : [...p, value],
    );

  const send = async () => {
    if (!user || picked.length === 0) return;
    setSaving(true);
    try {
      const slots: SlotChoice[] = picked
        .sort()
        .map((starts_at) => ({ starts_at, duration_min: 60 }));
      const created = await createRequest({ studentId: user.id, weekStart, slots, note });
      setReq(created);
      toast.success("Надіслано викладачу 🐼");
    } catch (e: any) {
      toast.error(e.message ?? "Не вдалося надіслати");
    } finally {
      setSaving(false);
    }
  };

  if (loading || !user) return null;

  const weekLabel = `${days[0].toLocaleDateString("uk-UA", { day: "numeric", month: "long" })} — ${days[5].toLocaleDateString("uk-UA", { day: "numeric", month: "long" })}`;

  if (req && req.status !== "declined") {
    const approved = req.status === "approved";
    return (
      <div className={`rounded-2xl border p-4 ${approved ? "border-emerald-500/40 bg-emerald-500/5" : "border-border bg-card"}`}>
        <div className="flex items-center gap-2 font-display font-black text-sm">
          {approved ? <Check className="w-4 h-4 text-emerald-600" /> : <Clock3 className="w-4 h-4 text-primary" />}
          {approved ? "Заняття підтверджені" : "Очікує підтвердження"}
        </div>
        <p className="text-xs text-muted-foreground mt-1">{weekLabel}</p>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {req.slots.map((s) => (
            <span key={s.starts_at} className="px-2.5 py-1 rounded-lg bg-muted text-[11px] font-bold">
              {formatSlot(s)}
            </span>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 font-display font-black text-sm">
        <CalendarClock className="w-4 h-4 text-primary" /> На коли призначимо наступні заняття?
      </div>
      <p className="text-xs text-muted-foreground mt-1">
        {req?.status === "declined"
          ? "Викладач попросив інші часи — оберіть, будь ласка, ще раз."
          : `Оберіть до ${MAX_SLOTS} зручних варіантів на тиждень ${weekLabel}.`}
      </p>

      <div className="flex gap-1.5 mt-3 overflow-x-auto no-scrollbar">
        {days.map((d, i) => (
          <button
            key={i}
            onClick={() => setDayIdx(i)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-bold ${
              dayIdx === i ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
            }`}
          >
            {d.toLocaleDateString("uk-UA", { weekday: "short", day: "numeric" })}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1.5 mt-3">
        {HOURS.map((h) => {
          const value = iso(days[dayIdx], h);
          const on = picked.includes(value);
          return (
            <button
              key={h}
              onClick={() => toggle(value)}
              className={`px-2 py-1.5 rounded-lg text-xs font-bold border ${
                on ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
              }`}
            >
              {h}
            </button>
          );
        })}
      </div>

      {picked.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {picked.sort().map((p) => (
            <span key={p} className="px-2.5 py-1 rounded-lg bg-primary/10 text-primary text-[11px] font-bold">
              {formatSlot({ starts_at: p, duration_min: 60 })}
            </span>
          ))}
        </div>
      )}

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Коментар для викладача (необовʼязково)"
        rows={2}
        className="w-full mt-3 px-3 py-2 rounded-xl border border-border bg-background text-sm"
      />

      <button
        onClick={send}
        disabled={saving || picked.length === 0}
        className="mt-3 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-bold text-sm disabled:opacity-50"
      >
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        Надіслати викладачу
      </button>
    </div>
  );
}
