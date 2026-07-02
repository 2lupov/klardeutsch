import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, SectionHeader, EmptyState } from "./_ui";
import { Search, Trophy, BookOpen, Swords, Coins } from "lucide-react";

interface AdminUser {
  user_id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  total_xp: number;
  coin_balance: number;
  roles: string[];
  words_learned: number;
  lessons_completed: number;
  duels_played: number;
  duels_won: number;
  user_created_at: string;
}

export default function StudentsPage() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc("get_admin_users");
      if (!error) setUsers((data as any) || []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return users;
    return users.filter((u) =>
      (u.display_name || "").toLowerCase().includes(s) ||
      (u.email || "").toLowerCase().includes(s));
  }, [users, q]);

  return (
    <div className="space-y-6">
      <SectionHeader title="Студенти" subtitle={`Всього: ${users.length}`} />

      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Пошук за іменем чи email..."
          className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-white" />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <Card key={i} className="p-4 animate-pulse h-24" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState title="Немає студентів" description="Спробуй інший запит" />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map((u) => (
            <Card key={u.user_id} className="p-4">
              <div className="flex items-start gap-3">
                {u.avatar_url ? (
                  <img src={u.avatar_url} className="w-11 h-11 rounded-full object-cover" />
                ) : (
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-white font-semibold"
                    style={{ background: "linear-gradient(135deg,#4F46E5,#7C3AED)" }}>
                    {(u.display_name || u.email || "U")[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-slate-900 truncate">
                      {u.display_name || "Без імені"}
                    </h3>
                    {u.roles.map((r) => (
                      <span key={r} className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                        style={{ background: "#FEF3C7", color: "#92400E" }}>{r}</span>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 truncate">{u.email}</p>
                  <div className="mt-3 grid grid-cols-4 gap-1.5 text-[11px] text-slate-600">
                    <span className="flex items-center gap-1"><Trophy className="w-3 h-3 text-amber-500" />{u.total_xp}</span>
                    <span className="flex items-center gap-1"><Coins className="w-3 h-3 text-yellow-500" />{u.coin_balance}</span>
                    <span className="flex items-center gap-1"><BookOpen className="w-3 h-3 text-indigo-500" />{u.lessons_completed}</span>
                    <span className="flex items-center gap-1"><Swords className="w-3 h-3 text-red-500" />{u.duels_won}/{u.duels_played}</span>
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
