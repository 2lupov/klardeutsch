import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Search, UserPlus, UserCheck, UserX, Loader2, ArrowLeft, Users, Clock, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import UserProfileDialog from "@/components/UserProfileDialog";

interface FriendRow {
  id: string;
  user_id: string;
  friend_id: string;
  status: string;
  created_at: string;
}

interface ProfileRow {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface FriendsListProps {
  onBack: () => void;
}

const FriendsList = ({ onBack }: FriendsListProps) => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [tab, setTab] = useState<"friends" | "requests" | "search">("friends");
  const [friendships, setFriendships] = useState<FriendRow[]>([]);
  const [profiles, setProfiles] = useState<Record<string, ProfileRow>>({});
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ProfileRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  const t = useCallback((ru: string, uk: string) => lang === "uk" ? uk : ru, [lang]);

  const loadFriendships = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("friendships")
      .select("*")
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    const rows = (data ?? []) as FriendRow[];
    setFriendships(rows);

    // Load profiles for all friend IDs
    const ids = new Set<string>();
    rows.forEach(r => {
      ids.add(r.user_id);
      ids.add(r.friend_id);
    });
    ids.delete(user.id);

    if (ids.size > 0) {
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", Array.from(ids));
      const map: Record<string, ProfileRow> = {};
      (profilesData ?? []).forEach(p => { map[p.user_id] = p; });
      setProfiles(map);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { loadFriendships(); }, [loadFriendships]);

  const acceptedFriends = friendships.filter(f => f.status === "accepted");
  const incomingRequests = friendships.filter(f => f.status === "pending" && f.friend_id === user?.id);
  const outgoingRequests = friendships.filter(f => f.status === "pending" && f.user_id === user?.id);

  const getFriendId = (f: FriendRow) => f.user_id === user?.id ? f.friend_id : f.user_id;
  const getProfile = (id: string) => profiles[id] || { user_id: id, display_name: null, avatar_url: null };

  const allFriendIds = new Set(friendships.map(f => getFriendId(f)));

  const handleSearch = async () => {
    if (!user || searchQuery.trim().length < 2) return;
    setSearching(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .ilike("display_name", `%${searchQuery.trim()}%`)
      .neq("user_id", user.id)
      .limit(20);
    setSearchResults((data ?? []) as ProfileRow[]);
    setSearching(false);
  };

  const sendRequest = async (friendId: string) => {
    if (!user) return;
    setActionLoading(friendId);
    const { error } = await supabase.from("friendships").insert({ user_id: user.id, friend_id: friendId });
    if (error) {
      toast({ title: t("Ошибка", "Помилка"), description: error.message, variant: "destructive" });
    } else {
      toast({ title: t("Заявка отправлена!", "Заявку відправлено!") });
      loadFriendships();
    }
    setActionLoading(null);
  };

  const acceptRequest = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    const { error } = await supabase.from("friendships").update({ status: "accepted" }).eq("id", friendshipId);
    if (!error) {
      toast({ title: t("Друг добавлен! 🎉", "Друга додано! 🎉") });
      loadFriendships();
    }
    setActionLoading(null);
  };

  const rejectOrRemove = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    await supabase.from("friendships").delete().eq("id", friendshipId);
    loadFriendships();
    setActionLoading(null);
  };

  const UserRow = ({ profile: p, right }: { profile: ProfileRow; right: React.ReactNode }) => {
    const name = p.display_name || "User";
    const initials = name.slice(0, 2).toUpperCase();
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-card/50 border border-border">
        <button onClick={() => setSelectedUserId(p.user_id)} className="flex-shrink-0">
          <Avatar className="w-10 h-10">
            {p.avatar_url && <AvatarImage src={p.avatar_url} />}
            <AvatarFallback className="bg-muted text-xs font-bold">{initials}</AvatarFallback>
          </Avatar>
        </button>
        <button onClick={() => setSelectedUserId(p.user_id)} className="flex-1 min-w-0 text-left">
          <p className="text-sm font-semibold text-foreground truncate">{name}</p>
        </button>
        {right}
      </div>
    );
  };

  return (
    <div className="p-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <button onClick={onBack} className="p-1 rounded-lg hover:bg-muted transition-colors">
          <ArrowLeft className="w-5 h-5 text-muted-foreground" />
        </button>
        <h2 className="font-display text-lg font-bold text-foreground">{t("Друзья", "Друзі")}</h2>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-muted/30 rounded-xl p-1">
        {([
          { key: "friends" as const, label: t("Друзья", "Друзі"), icon: Users, count: acceptedFriends.length },
          { key: "requests" as const, label: t("Заявки", "Заявки"), icon: Clock, count: incomingRequests.length },
          { key: "search" as const, label: t("Поиск", "Пошук"), icon: Search, count: 0 },
        ]).map(tab_ => (
          <button
            key={tab_.key}
            onClick={() => setTab(tab_.key)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-colors relative ${
              tab === tab_.key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <tab_.icon className="w-3.5 h-3.5" />
            {tab_.label}
            {tab_.count > 0 && (
              <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
                {tab_.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <AnimatePresence mode="wait">
          {tab === "friends" && (
            <motion.div key="friends" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-2">
              {acceptedFriends.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">{t("Пока нет друзей", "Поки немає друзів")}</p>
                  <button onClick={() => setTab("search")} className="mt-3 text-xs text-primary font-semibold hover:underline">
                    {t("Найти друзей", "Знайти друзів")}
                  </button>
                </div>
              ) : (
                acceptedFriends.map(f => {
                  const friendId = getFriendId(f);
                  const p = getProfile(friendId);
                  return (
                    <UserRow key={f.id} profile={p} right={
                      <button
                        onClick={() => rejectOrRemove(f.id)}
                        disabled={actionLoading === f.id}
                        className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                        title={t("Удалить", "Видалити")}
                      >
                        {actionLoading === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
                      </button>
                    } />
                  );
                })
              )}
            </motion.div>
          )}

          {tab === "requests" && (
            <motion.div key="requests" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col gap-3">
              {incomingRequests.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-2">{t("Входящие", "Вхідні")}</p>
                  <div className="flex flex-col gap-2">
                    {incomingRequests.map(f => {
                      const p = getProfile(f.user_id);
                      return (
                        <UserRow key={f.id} profile={p} right={
                          <div className="flex gap-1">
                            <button
                              onClick={() => acceptRequest(f.id)}
                              disabled={actionLoading === f.id}
                              className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                            >
                              {actionLoading === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                            </button>
                            <button
                              onClick={() => rejectOrRemove(f.id)}
                              disabled={actionLoading === f.id}
                              className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        } />
                      );
                    })}
                  </div>
                </div>
              )}
              {outgoingRequests.length > 0 && (
                <div>
                  <p className="text-xs text-muted-foreground font-semibold mb-2">{t("Отправленные", "Відправлені")}</p>
                  <div className="flex flex-col gap-2">
                    {outgoingRequests.map(f => {
                      const p = getProfile(f.friend_id);
                      return (
                        <UserRow key={f.id} profile={p} right={
                          <button
                            onClick={() => rejectOrRemove(f.id)}
                            disabled={actionLoading === f.id}
                            className="p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title={t("Отменить", "Скасувати")}
                          >
                            {actionLoading === f.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
                          </button>
                        } />
                      );
                    })}
                  </div>
                </div>
              )}
              {incomingRequests.length === 0 && outgoingRequests.length === 0 && (
                <div className="text-center py-12">
                  <Clock className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">{t("Нет заявок", "Немає заявок")}</p>
                </div>
              )}
            </motion.div>
          )}

          {tab === "search" && (
            <motion.div key="search" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div className="flex gap-2 mb-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    placeholder={t("Введи никнейм...", "Введи нікнейм...")}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-muted/50 border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>
                <button
                  onClick={handleSearch}
                  disabled={searching || searchQuery.trim().length < 2}
                  className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : t("Найти", "Знайти")}
                </button>
              </div>

              {searchResults.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {searchResults.map(p => {
                    const isFriend = allFriendIds.has(p.user_id);
                    return (
                      <UserRow key={p.user_id} profile={p} right={
                        isFriend ? (
                          <span className="p-2 text-primary">
                            <UserCheck className="w-4 h-4" />
                          </span>
                        ) : (
                          <button
                            onClick={() => sendRequest(p.user_id)}
                            disabled={actionLoading === p.user_id}
                            className="p-2 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                          >
                            {actionLoading === p.user_id ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                          </button>
                        )
                      } />
                    );
                  })}
                </div>
              ) : searchQuery.trim().length >= 2 && !searching ? (
                <div className="text-center py-12">
                  <Search className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">{t("Никого не найдено", "Нікого не знайдено")}</p>
                </div>
              ) : (
                <div className="text-center py-12">
                  <UserPlus className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">{t("Найди друзей по никнейму", "Знайди друзів за нікнеймом")}</p>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {selectedUserId && (() => {
        const p = profiles[selectedUserId] || searchResults.find(r => r.user_id === selectedUserId);
        return (
          <UserProfileDialog
            userId={selectedUserId}
            displayName={p?.display_name ?? null}
            avatarUrl={p?.avatar_url ?? null}
            totalXp={0}
            open={!!selectedUserId}
            onOpenChange={open => !open && setSelectedUserId(null)}
          />
        );
      })()}
    </div>
  );
};

export default FriendsList;
