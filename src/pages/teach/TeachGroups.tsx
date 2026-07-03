import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Users, Trash2, X, UserPlus, Search } from "lucide-react";

type Group = {
  id: string;
  name: string;
  level: string | null;
  language: string | null;
  description: string | null;
  color: string | null;
};

type Member = { id: string; group_id: string; student_id: string };
type Student = { user_id: string; display_name: string | null; nickname: string | null; avatar_url: string | null };

const COLORS = ["indigo", "amber", "emerald", "rose", "sky", "violet"] as const;
const colorCls: Record<string, string> = {
  indigo: "from-indigo-500/20 to-indigo-500/5 border-indigo-500/40",
  amber: "from-amber-500/20 to-amber-500/5 border-amber-500/40",
  emerald: "from-emerald-500/20 to-emerald-500/5 border-emerald-500/40",
  rose: "from-rose-500/20 to-rose-500/5 border-rose-500/40",
  sky: "from-sky-500/20 to-sky-500/5 border-sky-500/40",
  violet: "from-violet-500/20 to-violet-500/5 border-violet-500/40",
};

export default function TeachGroups() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Student>>({});
  const [loading, setLoading] = useState(true);
  const [openCreate, setOpenCreate] = useState(false);
  const [activeGroup, setActiveGroup] = useState<Group | null>(null);

  const load = async () => {
    const { data: g } = await supabase.from("school_groups").select("*").order("created_at", { ascending: false });
    const list = (g || []) as Group[];
    setGroups(list);
    if (list.length) {
      const { data: m } = await supabase
        .from("school_group_members")
        .select("*")
        .in("group_id", list.map((x) => x.id));
      const mem = (m || []) as Member[];
      setMembers(mem);
      const ids = Array.from(new Set(mem.map((x) => x.student_id)));
      if (ids.length) {
        const { data: p } = await supabase
          .from("profiles")
          .select("user_id, display_name, nickname, avatar_url")
          .in("user_id", ids);
        const map: Record<string, Student> = {};
        (p || []).forEach((s: any) => { map[s.user_id] = s; });
        setProfiles(map);
      }
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const membersByGroup = useMemo(() => {
    const map: Record<string, Member[]> = {};
    members.forEach((m) => { (map[m.group_id] ||= []).push(m); });
    return map;
  }, [members]);

  const createGroup = async (payload: Partial<Group>) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("school_groups").insert({
      teacher_id: u.user.id,
      name: payload.name!,
      level: payload.level || null,
      language: payload.language || "de",
      description: payload.description || null,
      color: payload.color || "indigo",
    });
    if (error) return toast.error(error.message);
    toast.success("Група створена");
    setOpenCreate(false);
    load();
  };

  const removeGroup = async (id: string) => {
    if (!confirm("Видалити групу?")) return;
    const { error } = await supabase.from("school_groups").delete().eq("id", id);
    if (error) return toast.error(error.message);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-2xl font-bold">Групи</h2>
          <p className="text-sm text-muted-foreground">Об'єднуйте учнів у групи для планування уроків.</p>
        </div>
        <button onClick={() => setOpenCreate(true)} className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90">
          <Plus className="w-4 h-4" /> Нова група
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Завантаження…</div>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Ще немає груп. Створіть першу.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {groups.map((g) => {
            const mem = membersByGroup[g.id] || [];
            const cls = colorCls[g.color || "indigo"];
            return (
              <button key={g.id} onClick={() => setActiveGroup(g)} className={`text-left rounded-2xl bg-gradient-to-br ${cls} border p-4 hover:shadow-md transition`}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {g.language?.toUpperCase()} • {g.level || "рівень —"}
                    </div>
                    <h3 className="font-display text-lg font-black mt-1">{g.name}</h3>
                  </div>
                  <div className="text-xs px-2 py-1 rounded-full bg-background/60 border border-border/60">
                    {mem.length} 👥
                  </div>
                </div>
                {g.description && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{g.description}</p>}
                <div className="flex -space-x-2 mt-3">
                  {mem.slice(0, 5).map((m) => {
                    const p = profiles[m.student_id];
                    return (
                      <div key={m.id} className="w-7 h-7 rounded-full border-2 border-background bg-muted overflow-hidden flex items-center justify-center text-[10px] font-bold">
                        {p?.avatar_url ? <img src={p.avatar_url} className="w-full h-full object-cover" /> : (p?.display_name || p?.nickname || "?")[0]}
                      </div>
                    );
                  })}
                  {mem.length > 5 && <div className="w-7 h-7 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold">+{mem.length - 5}</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {openCreate && <CreateGroupDialog onClose={() => setOpenCreate(false)} onCreate={createGroup} />}
      {activeGroup && (
        <GroupDetailsDialog
          group={activeGroup}
          members={membersByGroup[activeGroup.id] || []}
          profiles={profiles}
          onClose={() => setActiveGroup(null)}
          onDelete={async () => { await removeGroup(activeGroup.id); setActiveGroup(null); }}
          onChanged={load}
        />
      )}
    </div>
  );
}

function CreateGroupDialog({ onClose, onCreate }: { onClose: () => void; onCreate: (p: Partial<Group>) => void }) {
  const [name, setName] = useState("");
  const [level, setLevel] = useState("A1");
  const [language, setLanguage] = useState("de");
  const [color, setColor] = useState<string>("indigo");
  const [description, setDescription] = useState("");
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display text-lg font-bold">Нова група</h3>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Назва (наприклад, A1 - Ранкова)"
          className="w-full px-3 h-10 rounded-lg border border-input bg-background text-sm" />
        <div className="grid grid-cols-2 gap-2">
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="h-10 rounded-lg border border-input bg-background text-sm px-3">
            {["A1", "A2", "B1", "B2", "C1", "C2"].map((l) => <option key={l}>{l}</option>)}
          </select>
          <select value={language} onChange={(e) => setLanguage(e.target.value)} className="h-10 rounded-lg border border-input bg-background text-sm px-3">
            {["de", "en", "pl", "es", "fr", "it"].map((l) => <option key={l} value={l}>{l.toUpperCase()}</option>)}
          </select>
        </div>
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Опис (опц.)"
          className="w-full px-3 py-2 rounded-lg border border-input bg-background text-sm resize-none" />
        <div>
          <div className="text-[11px] font-bold text-muted-foreground mb-1.5">Колір</div>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} className={`w-7 h-7 rounded-full border-2 ${color === c ? "border-foreground" : "border-border"} bg-gradient-to-br ${colorCls[c]}`} />
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 h-9 rounded-lg text-sm">Скасувати</button>
          <button
            onClick={() => name.trim() && onCreate({ name: name.trim(), level, language, color, description })}
            disabled={!name.trim()}
            className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-bold disabled:opacity-50">
            Створити
          </button>
        </div>
      </div>
    </div>
  );
}

function GroupDetailsDialog({ group, members, profiles, onClose, onDelete, onChanged }: any) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Student[]>([]);
  const [adding, setAdding] = useState(false);

  const doSearch = async () => {
    const { data } = await supabase.rpc("search_teachers" as any, { p_query: search }); // reuse fallback
    // Fallback to broad profile search
    const { data: p } = await supabase
      .from("profiles")
      .select("user_id, display_name, nickname, avatar_url")
      .or(`display_name.ilike.%${search}%,nickname.ilike.%${search}%`)
      .limit(15);
    setResults((p || []) as Student[]);
  };

  const addMember = async (studentId: string) => {
    const { error } = await supabase.from("school_group_members").insert({ group_id: group.id, student_id: studentId });
    if (error) return toast.error(error.message);
    toast.success("Учня додано");
    setSearch("");
    setResults([]);
    setAdding(false);
    onChanged();
  };
  const removeMember = async (id: string) => {
    const { error } = await supabase.from("school_group_members").delete().eq("id", id);
    if (error) return toast.error(error.message);
    onChanged();
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card border border-border p-5 space-y-4 max-h-[90vh] overflow-auto">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              {group.language?.toUpperCase()} • {group.level}
            </div>
            <h3 className="font-display text-xl font-black">{group.name}</h3>
            {group.description && <p className="text-sm text-muted-foreground mt-1">{group.description}</p>}
          </div>
          <button onClick={onClose}><X className="w-4 h-4" /></button>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold">Учасники ({members.length})</h4>
            <button onClick={() => setAdding((v: boolean) => !v)} className="inline-flex items-center gap-1.5 text-xs h-8 px-3 rounded-lg bg-primary/10 text-primary font-bold">
              <UserPlus className="w-3.5 h-3.5" /> Додати
            </button>
          </div>

          {adding && (
            <div className="rounded-xl border border-border bg-muted/30 p-2 space-y-2 mb-3">
              <div className="flex gap-2">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ім'я або нікнейм…"
                  className="flex-1 h-9 px-3 rounded-lg border border-input bg-background text-sm" />
                <button onClick={doSearch} className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm inline-flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5" /> Пошук
                </button>
              </div>
              <div className="space-y-1 max-h-56 overflow-auto">
                {results.map((r) => (
                  <button key={r.user_id} onClick={() => addMember(r.user_id)} className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-background text-left">
                    <div className="w-7 h-7 rounded-full bg-muted overflow-hidden">{r.avatar_url && <img src={r.avatar_url} className="w-full h-full object-cover" />}</div>
                    <div className="text-sm">{r.display_name || r.nickname || r.user_id.slice(0, 8)}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-1">
            {members.map((m: Member) => {
              const p = profiles[m.student_id];
              return (
                <div key={m.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-background">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-muted overflow-hidden">
                      {p?.avatar_url && <img src={p.avatar_url} className="w-full h-full object-cover" />}
                    </div>
                    <div className="text-sm">{p?.display_name || p?.nickname || m.student_id.slice(0, 8)}</div>
                  </div>
                  <button onClick={() => removeMember(m.id)} className="text-destructive p-1.5 rounded hover:bg-destructive/10"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              );
            })}
            {members.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">Ще немає учнів у групі.</p>}
          </div>
        </div>

        <div className="pt-2 border-t border-border flex justify-between">
          <button onClick={onDelete} className="text-destructive text-sm font-medium">Видалити групу</button>
          <button onClick={onClose} className="px-4 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-bold">Готово</button>
        </div>
      </div>
    </div>
  );
}
