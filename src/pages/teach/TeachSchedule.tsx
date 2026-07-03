import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, X, Trash2, Calendar as CalIcon, Clock, ChevronLeft, ChevronRight } from "lucide-react";

type Group = { id: string; name: string; color: string | null };
type Item = {
  id: string;
  title: string;
  notes: string | null;
  starts_at: string;
  duration_min: number;
  status: string;
  group_id: string | null;
  student_id: string | null;
};

const DAYS = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"];

function startOfWeek(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const dow = (x.getDay() + 6) % 7; // Mon=0
  x.setDate(x.getDate() - dow);
  return x;
}
function fmtDay(d: Date) { return d.toLocaleDateString("uk-UA", { day: "numeric", month: "short" }); }
function fmtTime(iso: string) { return new Date(iso).toLocaleTimeString("uk-UA", { hour: "2-digit", minute: "2-digit" }); }

export default function TeachSchedule() {
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [items, setItems] = useState<Item[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [open, setOpen] = useState(false);
  const [presetDay, setPresetDay] = useState<Date | null>(null);

  const weekEnd = useMemo(() => {
    const e = new Date(weekStart); e.setDate(e.getDate() + 7); return e;
  }, [weekStart]);

  const load = async () => {
    const { data: g } = await supabase.from("school_groups").select("id, name, color");
    setGroups((g || []) as Group[]);
    const { data } = await supabase
      .from("school_schedule")
      .select("*")
      .gte("starts_at", weekStart.toISOString())
      .lt("starts_at", weekEnd.toISOString())
      .order("starts_at");
    setItems((data || []) as Item[]);
  };
  useEffect(() => { load(); }, [weekStart.toISOString()]);

  const byDay = useMemo(() => {
    const map: Record<number, Item[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
    items.forEach((it) => {
      const d = new Date(it.starts_at);
      const idx = (d.getDay() + 6) % 7;
      map[idx].push(it);
    });
    return map;
  }, [items]);

  const groupName = (id: string | null) => groups.find((g) => g.id === id)?.name;

  const remove = async (id: string) => {
    if (!confirm("Видалити цей урок?")) return;
    const { error } = await supabase.from("school_schedule").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold">Розклад</h2>
          <p className="text-sm text-muted-foreground">Плануйте групові й індивідуальні уроки.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() - 7); setWeekStart(d); }}
            className="w-9 h-9 rounded-lg border border-border hover:bg-muted inline-flex items-center justify-center">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-sm font-medium min-w-[180px] text-center">
            {fmtDay(weekStart)} — {fmtDay(new Date(weekEnd.getTime() - 86400000))}
          </div>
          <button onClick={() => { const d = new Date(weekStart); d.setDate(d.getDate() + 7); setWeekStart(d); }}
            className="w-9 h-9 rounded-lg border border-border hover:bg-muted inline-flex items-center justify-center">
            <ChevronRight className="w-4 h-4" />
          </button>
          <button onClick={() => setWeekStart(startOfWeek(new Date()))} className="text-xs px-3 h-9 rounded-lg border border-border hover:bg-muted">Сьогодні</button>
          <button onClick={() => { setPresetDay(null); setOpen(true); }} className="inline-flex items-center gap-2 px-4 h-9 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90">
            <Plus className="w-4 h-4" /> Додати
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {DAYS.map((name, i) => {
          const day = new Date(weekStart); day.setDate(day.getDate() + i);
          const isToday = day.toDateString() === new Date().toDateString();
          return (
            <div key={i} className={`rounded-2xl border ${isToday ? "border-primary bg-primary/5" : "border-border bg-card"} p-3 min-h-[180px] flex flex-col`}>
              <button onClick={() => { setPresetDay(day); setOpen(true); }} className="text-left mb-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{name}</div>
                <div className={`text-lg font-display font-black ${isToday ? "text-primary" : ""}`}>{day.getDate()}</div>
              </button>
              <div className="space-y-2 flex-1">
                {(byDay[i] || []).map((it) => (
                  <div key={it.id} className="group rounded-xl border border-border bg-background p-2 text-xs">
                    <div className="flex items-center justify-between">
                      <div className="font-mono text-[11px] flex items-center gap-1 text-muted-foreground">
                        <Clock className="w-3 h-3" /> {fmtTime(it.starts_at)} • {it.duration_min}хв
                      </div>
                      <button onClick={() => remove(it.id)} className="opacity-0 group-hover:opacity-100 text-destructive"><Trash2 className="w-3 h-3" /></button>
                    </div>
                    <div className="font-bold mt-1 truncate">{it.title}</div>
                    {(it.group_id || it.student_id) && (
                      <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                        {it.group_id ? `👥 ${groupName(it.group_id) || "група"}` : "👤 індивід."}
                      </div>
                    )}
                  </div>
                ))}
                {(!byDay[i] || byDay[i].length === 0) && <div className="text-[10px] text-muted-foreground/60 text-center pt-4">—</div>}
              </div>
            </div>
          );
        })}
      </div>

      {open && <CreateScheduleDialog groups={groups} presetDay={presetDay} onClose={() => setOpen(false)} onSaved={() => { setOpen(false); load(); }} />}
    </div>
  );
}

function CreateScheduleDialog({ groups, presetDay, onClose, onSaved }: any) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [groupId, setGroupId] = useState<string>("");
  const initDate = presetDay ? new Date(presetDay) : new Date();
  initDate.setHours(10, 0, 0, 0);
  const [date, setDate] = useState<string>(initDate.toISOString().slice(0, 10));
  const [time, setTime] = useState<string>(initDate.toTimeString().slice(0, 5));
  const [duration, setDuration] = useState(45);

  const save = async () => {
    if (!title.trim()) return toast.error("Введіть назву");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const starts = new Date(`${date}T${time}:00`);
    const { error } = await supabase.from("school_schedule").insert({
      teacher_id: u.user.id,
      title: title.trim(),
      notes: notes.trim() || null,
      group_id: groupId || null,
      starts_at: starts.toISOString(),
      duration_min: duration,
    });
    if (error) return toast.error(error.message);
    toast.success("Заплановано");
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold flex items-center gap-2"><CalIcon className="w-4 h-4" /> Новий урок</h3>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Назва (напр. Perfekt — практика)"
          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm" />
        <select value={groupId} onChange={(e) => setGroupId(e.target.value)}
          className="w-full h-10 px-3 rounded-lg border border-input bg-background text-sm">
          <option value="">Індивідуальний</option>
          {groups.map((g: Group) => <option key={g.id} value={g.id}>👥 {g.name}</option>)}
        </select>
        <div className="grid grid-cols-3 gap-2">
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-10 px-3 rounded-lg border border-input bg-background text-sm" />
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-10 px-3 rounded-lg border border-input bg-background text-sm" />
          <select value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="h-10 px-3 rounded-lg border border-input bg-background text-sm">
            {[30, 45, 60, 75, 90, 120].map((d) => <option key={d} value={d}>{d} хв</option>)}
          </select>
        </div>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Нотатки (опц.)"
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none" />
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="px-4 h-9 rounded-lg text-sm">Скасувати</button>
          <button onClick={save} className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-bold">Зберегти</button>
        </div>
      </div>
    </div>
  );
}
