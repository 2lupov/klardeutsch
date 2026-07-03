import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, TrendingUp, Coins, Award, Search } from "lucide-react";

type Row = {
  user_id: string;
  display_name: string | null;
  nickname: string | null;
  avatar_url: string | null;
  total_xp: number;
  coins: number;
  words: number;
  lessons: number;
  in_groups: string[];
};

export default function TeachStudents() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [groupFilter, setGroupFilter] = useState<string>("");
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: g } = await supabase.from("school_groups").select("id, name");
      const groupList = (g || []) as any[];
      setGroups(groupList);
      const { data: m } = await supabase.from("school_group_members").select("group_id, student_id").in("group_id", groupList.map((x) => x.id));
      const memMap: Record<string, string[]> = {};
      const groupNameMap: Record<string, string> = {};
      groupList.forEach((x) => { groupNameMap[x.id] = x.name; });
      (m || []).forEach((r: any) => { (memMap[r.student_id] ||= []).push(groupNameMap[r.group_id]); });

      const ids = Object.keys(memMap);
      if (ids.length === 0) { setRows([]); setLoading(false); return; }

      const [{ data: profiles }, { data: xp }, { data: coins }, { data: sw }, { data: lp }] = await Promise.all([
        supabase.from("profiles").select("user_id, display_name, nickname, avatar_url").in("user_id", ids),
        supabase.from("user_xp").select("user_id, total_xp").in("user_id", ids),
        supabase.from("user_coins").select("user_id, balance").in("user_id", ids),
        supabase.from("saved_words").select("user_id").in("user_id", ids),
        supabase.from("user_progress").select("user_id, completed").in("user_id", ids).eq("completed", true),
      ]);
      const xpMap: Record<string, number> = {}; (xp || []).forEach((r: any) => { xpMap[r.user_id] = r.total_xp; });
      const coinMap: Record<string, number> = {}; (coins || []).forEach((r: any) => { coinMap[r.user_id] = r.balance; });
      const wordCount: Record<string, number> = {}; (sw || []).forEach((r: any) => { wordCount[r.user_id] = (wordCount[r.user_id] || 0) + 1; });
      const lessonCount: Record<string, number> = {}; (lp || []).forEach((r: any) => { lessonCount[r.user_id] = (lessonCount[r.user_id] || 0) + 1; });

      const out: Row[] = (profiles || []).map((p: any) => ({
        user_id: p.user_id,
        display_name: p.display_name,
        nickname: p.nickname,
        avatar_url: p.avatar_url,
        total_xp: xpMap[p.user_id] || 0,
        coins: coinMap[p.user_id] || 0,
        words: wordCount[p.user_id] || 0,
        lessons: lessonCount[p.user_id] || 0,
        in_groups: memMap[p.user_id] || [],
      })).sort((a, b) => b.total_xp - a.total_xp);
      setRows(out);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => rows.filter((r) => {
    if (query && !(r.display_name || r.nickname || "").toLowerCase().includes(query.toLowerCase())) return false;
    if (groupFilter && !r.in_groups.includes(groups.find((g) => g.id === groupFilter)?.name || "")) return false;
    return true;
  }), [rows, query, groupFilter, groups]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl font-bold">Учні</h2>
        <p className="text-sm text-muted-foreground">Прогрес усіх учнів ваших груп.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Пошук за ім'ям…"
            className="w-full pl-9 pr-3 h-10 rounded-lg border border-input bg-background text-sm" />
        </div>
        <select value={groupFilter} onChange={(e) => setGroupFilter(e.target.value)} className="h-10 px-3 rounded-lg border border-input bg-background text-sm">
          <option value="">Усі групи</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Завантаження…</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center">
          <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">Ще немає учнів у групах.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((r) => (
            <div key={r.user_id} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-muted overflow-hidden flex items-center justify-center font-bold">
                  {r.avatar_url ? <img src={r.avatar_url} className="w-full h-full object-cover" /> : (r.display_name || r.nickname || "?")[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold truncate">{r.display_name || r.nickname || "Учень"}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{r.in_groups.join(" · ") || "—"}</div>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1 mt-3 text-center">
                <Stat icon={<TrendingUp className="w-3 h-3" />} value={r.total_xp} label="XP" />
                <Stat icon={<Coins className="w-3 h-3" />} value={r.coins} label="монет" />
                <Stat icon={<Award className="w-3 h-3" />} value={r.words} label="слів" />
                <Stat icon={<Award className="w-3 h-3" />} value={r.lessons} label="уроків" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const Stat = ({ icon, value, label }: any) => (
  <div className="rounded-lg bg-muted/40 py-1.5">
    <div className="text-sm font-black">{value}</div>
    <div className="text-[9px] uppercase tracking-wider text-muted-foreground flex items-center justify-center gap-0.5">{icon} {label}</div>
  </div>
);
