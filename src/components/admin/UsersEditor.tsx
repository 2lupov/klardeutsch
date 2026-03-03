import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Shield, ShieldOff, Search, Users, Star, Coins } from "lucide-react";
import { toast } from "sonner";

interface AdminUser {
  user_id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  total_xp: number;
  coin_balance: number;
  roles: string[];
  user_created_at: string;
  last_active: string | null;
}

const UsersEditor = () => {
  const { t } = useLanguage();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("get_admin_users");
    if (error) {
      console.error(error);
      toast.error("Ошибка загрузки пользователей");
    }
    setUsers((data as AdminUser[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleAdmin = async (userId: string, isAdmin: boolean) => {
    if (isAdmin) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    }
    toast.success(isAdmin ? "Роль admin снята" : "Роль admin назначена");
    load();
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return !q || 
      u.email?.toLowerCase().includes(q) || 
      u.display_name?.toLowerCase().includes(q);
  });

  if (loading) return <p className="text-muted-foreground">{t("loading")}</p>;

  return (
    <div className="flex flex-col gap-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по email или имени..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none"
        />
      </div>

      {/* Stats */}
      <div className="flex gap-3">
        <div className="flex-1 glass-card p-3 flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          <span className="text-sm font-display font-bold text-foreground">{users.length}</span>
          <span className="text-xs text-muted-foreground">пользователей</span>
        </div>
        <div className="flex-1 glass-card p-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-sm font-display font-bold text-foreground">{users.filter(u => u.roles.includes("admin")).length}</span>
          <span className="text-xs text-muted-foreground">админов</span>
        </div>
      </div>

      {/* Users list */}
      {filtered.map((user) => {
        const isAdmin = user.roles.includes("admin");
        return (
          <div key={user.user_id} className="glass-card p-4 flex flex-col gap-2">
            <div className="flex items-center gap-3">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover border border-border" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                  {(user.display_name || user.email || "?")[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user.display_name || "Без имени"}
                </p>
                <p className="text-xs text-muted-foreground truncate">{user.email}</p>
              </div>
              {isAdmin && (
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">ADMIN</span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 text-yellow-500" /> {user.total_xp} XP
              </span>
              <span className="flex items-center gap-1">
                <Coins className="w-3 h-3 text-yellow-500" /> {user.coin_balance}
              </span>
              <span>
                {user.user_created_at ? new Date(user.user_created_at).toLocaleDateString("ru") : "—"}
              </span>
            </div>

            <div className="flex justify-end">
              <button
                onClick={() => toggleAdmin(user.user_id, isAdmin)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isAdmin 
                    ? "bg-destructive/10 text-destructive hover:bg-destructive/20" 
                    : "bg-primary/10 text-primary hover:bg-primary/20"
                }`}
              >
                {isAdmin ? <ShieldOff className="w-3 h-3" /> : <Shield className="w-3 h-3" />}
                {isAdmin ? "Снять admin" : "Сделать admin"}
              </button>
            </div>
          </div>
        );
      })}

      {filtered.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">Пользователи не найдены</p>
      )}
    </div>
  );
};

export default UsersEditor;
