import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Shield, ShieldOff, Search, Users, Star, Coins, Send, Bell, Loader2, MessageSquare, CheckSquare, Square, X, Plus, Minus, Trash2, UserPlus, Pencil, Bot, Camera, MailCheck } from "lucide-react";
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
  email_confirmed: boolean;
  words_learned: number;
  lessons_completed: number;
  duels_played: number;
  duels_won: number;
}

interface DemoUser {
  id: string;
  display_name: string;
  total_xp: number;
}

const UsersEditor = () => {
  const { t } = useLanguage();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [broadcastMsg, setBroadcastMsg] = useState("");
  const [broadcasting, setBroadcasting] = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<Set<string>>(new Set());
  const [dmUserId, setDmUserId] = useState<string | null>(null);
  const [dmMsg, setDmMsg] = useState("");
  const [dmSending, setDmSending] = useState(false);
  const [xpAmounts, setXpAmounts] = useState<Record<string, string>>({});
  const [resending, setResending] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [coinAmounts, setCoinAmounts] = useState<Record<string, string>>({});

  // Demo users state
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [newDemoName, setNewDemoName] = useState("");
  const [newDemoXp, setNewDemoXp] = useState("100");
  const [editingDemoId, setEditingDemoId] = useState<string | null>(null);
  const [editingDemoName, setEditingDemoName] = useState("");

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

  const loadDemo = useCallback(async () => {
    const { data } = await supabase
      .from("demo_leaderboard")
      .select("id, display_name, total_xp")
      .order("total_xp", { ascending: false });
    setDemoUsers((data as DemoUser[]) ?? []);
  }, []);

  useEffect(() => { load(); loadDemo(); }, [load, loadDemo]);

  const toggleAdmin = async (userId: string, isAdmin: boolean) => {
    if (isAdmin) {
      await supabase.from("user_roles").delete().eq("user_id", userId).eq("role", "admin");
    } else {
      await supabase.from("user_roles").insert({ user_id: userId, role: "admin" });
    }
    toast.success(isAdmin ? "Роль admin снята" : "Роль admin назначена");
    setUsers(prev => prev.map(u => u.user_id === userId ? {
      ...u,
      roles: isAdmin ? u.roles.filter(r => r !== "admin") : [...u.roles, "admin"]
    } : u));
  };

  const adjustXp = async (userId: string, currentXp: number, delta: number) => {
    const newXp = Math.max(0, currentXp + delta);
    const { error } = await supabase.rpc("admin_set_xp", { p_user_id: userId, p_xp: newXp });
    if (error) {
      toast.error("Ошибка: " + error.message);
    } else {
      toast.success(`XP: ${currentXp} → ${newXp}`);
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, total_xp: newXp } : u));
    }
  };

  const adjustCoins = async (userId: string, delta: number) => {
    const reason = delta > 0 ? "admin_award" : "admin_deduct";
    const { error } = await supabase.rpc("award_coins", { p_user_id: userId, p_amount: delta, p_reason: reason });
    if (error) {
      toast.error("Ошибка: " + error.message);
    } else {
      toast.success(`Монеты: ${delta > 0 ? "+" : ""}${delta}`);
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, coin_balance: u.coin_balance + delta } : u));
    }
  };

  const uploadAvatar = async (userId: string, file: File) => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error("Ошибка загрузки: " + uploadError.message);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = urlData.publicUrl + "?t=" + Date.now();
    const { error: updateError } = await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("user_id", userId);
    if (updateError) {
      toast.error("Ошибка обновления профиля: " + updateError.message);
      return;
    }
    toast.success("Аватарка обновлена!");
    setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, avatar_url: avatarUrl } : u));
  };

  // Demo user actions
  const addDemoUser = async () => {
    if (!newDemoName.trim()) return;
    const { error } = await supabase.from("demo_leaderboard").insert({
      display_name: newDemoName.trim(),
      total_xp: parseInt(newDemoXp) || 100,
    });
    if (error) {
      toast.error("Ошибка: " + error.message);
    } else {
      toast.success("Фейк-юзер добавлен");
      setNewDemoName("");
      setNewDemoXp("100");
      loadDemo();
    }
  };

  const removeDemoUser = async (id: string) => {
    const { error } = await supabase.from("demo_leaderboard").delete().eq("id", id);
    if (error) {
      toast.error("Ошибка: " + error.message);
    } else {
      toast.success("Удалён");
      loadDemo();
    }
  };

  const saveDemoName = async (id: string) => {
    if (!editingDemoName.trim()) return;
    const { error } = await supabase.from("demo_leaderboard").update({ display_name: editingDemoName.trim() }).eq("id", id);
    if (error) {
      toast.error("Ошибка: " + error.message);
    } else {
      toast.success("Имя обновлено");
      setEditingDemoId(null);
      loadDemo();
    }
  };

  const adjustDemoXp = async (id: string, currentXp: number, delta: number) => {
    const newXp = Math.max(0, currentXp + delta);
    const { error } = await supabase.from("demo_leaderboard").update({ total_xp: newXp }).eq("id", id);
    if (error) {
      toast.error("Ошибка: " + error.message);
    } else {
      loadDemo();
    }
  };

  const toggleSelect = (userId: string) => {
    setSelectedUsers(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedUsers.size === filtered.length) {
      setSelectedUsers(new Set());
    } else {
      setSelectedUsers(new Set(filtered.map(u => u.user_id)));
    }
  };

  const handleBroadcast = async () => {
    if (!broadcastMsg.trim()) return;
    setBroadcasting(true);
    const body: any = { message: broadcastMsg.trim() };
    if (selectedUsers.size > 0) {
      body.user_ids = Array.from(selectedUsers);
    }
    const { data, error } = await supabase.functions.invoke("telegram-broadcast", { body });
    if (error) {
      toast.error("Ошибка: " + error.message);
    } else {
      toast.success(`Отправлено ${data?.sent ?? 0} из ${data?.total ?? 0}`);
      setBroadcastMsg("");
    }
    setBroadcasting(false);
  };

  const handleTriggerReminders = async () => {
    setTriggering(true);
    const body: any = {};
    if (selectedUsers.size > 0) {
      body.user_ids = Array.from(selectedUsers);
    }
    const { data, error } = await supabase.functions.invoke("telegram-reminders", { body });
    if (error) {
      toast.error("Ошибка: " + error.message);
    } else {
      toast.success(`Напоминания: ${data?.sent ?? 0} отправлено из ${data?.total ?? 0}`);
    }
    setTriggering(false);
  };

  const handleDmSend = async () => {
    if (!dmUserId || !dmMsg.trim()) return;
    setDmSending(true);
    const { data, error } = await supabase.functions.invoke("telegram-broadcast", {
      body: { message: dmMsg.trim(), user_ids: [dmUserId] },
    });
    if (error) {
      toast.error("Ошибка: " + error.message);
    } else if (data?.sent) {
      toast.success("Сообщение отправлено!");
      setDmMsg("");
      setDmUserId(null);
    } else {
      toast.error("Не удалось отправить (нет Telegram?)");
    }
    setDmSending(false);
  };

  const handleResendConfirmation = async (userId: string, email: string) => {
    setResending(userId);
    const { data, error } = await supabase.functions.invoke("resend-confirmation", {
      body: { email },
    });
    if (error) {
      toast.error("Ошибка: " + error.message);
    } else if (data?.error) {
      toast.error("Ошибка: " + data.error);
    } else {
      toast.success(`Письмо отправлено на ${email}`);
    }
    setResending(null);
  };


  const handleConfirmEmail = async (userId: string) => {
    setConfirming(userId);
    const { data, error } = await supabase.functions.invoke("admin-confirm-email", {
      body: { user_id: userId },
    });
    if (error) {
      toast.error("Ошибка: " + error.message);
    } else if (data?.error) {
      toast.error("Ошибка: " + data.error);
    } else {
      toast.success("Email подтверждён!");
      setUsers(prev => prev.map(u => u.user_id === userId ? { ...u, email_confirmed: true } : u));
    }
    setConfirming(null);
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
      {/* Demo Users Section */}
      <section className="glass-card p-4 flex flex-col gap-3">
        <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
          <Bot className="w-4 h-4 text-primary" /> Фейк-юзеры (рейтинг)
          <span className="ml-auto text-xs text-muted-foreground font-normal">{demoUsers.length}</span>
        </h3>

        {/* Add new */}
        <div className="flex gap-2">
          <input
            value={newDemoName}
            onChange={(e) => setNewDemoName(e.target.value)}
            placeholder="Имя..."
            className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none"
          />
          <input
            value={newDemoXp}
            onChange={(e) => setNewDemoXp(e.target.value)}
            placeholder="XP"
            type="number"
            className="w-20 px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none"
          />
          <button
            onClick={addDemoUser}
            disabled={!newDemoName.trim()}
            className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 transition-all"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>

        {/* List */}
        <div className="space-y-1.5">
          {demoUsers.map((du) => (
            <div key={du.id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/20">
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-[10px]">
                {du.display_name[0]?.toUpperCase()}
              </div>

              {editingDemoId === du.id ? (
                <input
                  value={editingDemoName}
                  onChange={(e) => setEditingDemoName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveDemoName(du.id)}
                  onBlur={() => saveDemoName(du.id)}
                  autoFocus
                  className="flex-1 px-2 py-1 rounded bg-secondary text-foreground border border-primary text-xs focus:outline-none"
                />
              ) : (
                <span
                  className="flex-1 text-xs font-medium text-foreground cursor-pointer hover:text-primary transition-colors"
                  onClick={() => { setEditingDemoId(du.id); setEditingDemoName(du.display_name); }}
                  title="Нажми чтобы переименовать"
                >
                  {du.display_name} <Pencil className="w-2.5 h-2.5 inline text-muted-foreground" />
                </span>
              )}

              {/* XP controls */}
              <button
                onClick={() => adjustDemoXp(du.id, du.total_xp, -50)}
                className="w-5 h-5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center transition-colors"
              >
                <Minus className="w-3 h-3" />
              </button>
              <span className="text-xs font-semibold text-foreground min-w-[35px] text-center">{du.total_xp}</span>
              <button
                onClick={() => adjustDemoXp(du.id, du.total_xp, 50)}
                className="w-5 h-5 rounded bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>

              <button
                onClick={() => removeDemoUser(du.id)}
                className="w-5 h-5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center transition-colors ml-1"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      </section>

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

      {/* Telegram actions */}
      <div className="glass-card p-4 flex flex-col gap-3">
        <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
          <Send className="w-4 h-4 text-primary" /> Telegram
          {selectedUsers.size > 0 && (
            <span className="ml-auto text-xs text-primary font-normal">
              Выбрано: {selectedUsers.size}
              <button onClick={() => setSelectedUsers(new Set())} className="ml-1.5 text-muted-foreground hover:text-foreground">
                <X className="w-3 h-3 inline" />
              </button>
            </span>
          )}
        </h3>
        <textarea
          value={broadcastMsg}
          onChange={(e) => setBroadcastMsg(e.target.value)}
          placeholder={selectedUsers.size > 0 ? `Сообщение для ${selectedUsers.size} выбранных...` : "Сообщение для всех пользователей..."}
          rows={3}
          maxLength={1000}
          className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none resize-y"
        />
        <div className="flex gap-2">
          <button
            onClick={handleBroadcast}
            disabled={broadcasting || !broadcastMsg.trim()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 transition-all"
          >
            {broadcasting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {broadcasting ? "Отправка..." : selectedUsers.size > 0 ? `Отправить (${selectedUsers.size})` : "Отправить всем"}
          </button>
          <button
            onClick={handleTriggerReminders}
            disabled={triggering}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-secondary border border-border text-foreground text-sm font-medium disabled:opacity-40 hover:bg-muted transition-all"
          >
            {triggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <Bell className="w-4 h-4" />}
            {triggering ? "..." : selectedUsers.size > 0 ? `Напомнить (${selectedUsers.size})` : "Напомнить всем"}
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">
          Выберите пользователей ниже для точечной отправки, или отправьте всем.
        </p>
      </div>

      {/* DM modal */}
      {dmUserId && (
        <div className="glass-card p-4 flex flex-col gap-2 border-primary/30">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-display font-semibold text-foreground flex items-center gap-1.5">
              <MessageSquare className="w-3.5 h-3.5 text-primary" />
              Личное сообщение: {users.find(u => u.user_id === dmUserId)?.display_name || "Пользователь"}
            </h4>
            <button onClick={() => { setDmUserId(null); setDmMsg(""); }} className="text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          </div>
          <textarea
            value={dmMsg}
            onChange={(e) => setDmMsg(e.target.value)}
            placeholder="Напишите личное сообщение..."
            rows={2}
            maxLength={1000}
            className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none resize-y"
            autoFocus
          />
          <button
            onClick={handleDmSend}
            disabled={dmSending || !dmMsg.trim()}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 transition-all"
          >
            {dmSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {dmSending ? "Отправка..." : "Отправить"}
          </button>
        </div>
      )}

      {/* Select all */}
      <button
        onClick={selectAll}
        className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
      >
        {selectedUsers.size === filtered.length && filtered.length > 0 ? (
          <CheckSquare className="w-3.5 h-3.5 text-primary" />
        ) : (
          <Square className="w-3.5 h-3.5" />
        )}
        {selectedUsers.size === filtered.length && filtered.length > 0 ? "Снять выделение" : "Выбрать всех"}
      </button>

      {/* Users list */}
      {filtered.map((user) => {
        const isAdmin = user.roles.includes("admin");
        const isSelected = selectedUsers.has(user.user_id);
        return (
          <div key={user.user_id} className={`glass-card p-4 flex flex-col gap-2 transition-colors ${isSelected ? "border-primary/30 bg-primary/5" : ""}`}>
            <div className="flex items-center gap-3">
              <button onClick={() => toggleSelect(user.user_id)} className="shrink-0">
                {isSelected ? (
                  <CheckSquare className="w-4 h-4 text-primary" />
                ) : (
                  <Square className="w-4 h-4 text-muted-foreground" />
                )}
              </button>

              <div className="relative group shrink-0">
                {user.avatar_url ? (
                  <img src={user.avatar_url} alt="" className="w-9 h-9 rounded-full object-cover border border-border" />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                    {(user.display_name || user.email || "?")[0].toUpperCase()}
                  </div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                  <Camera className="w-3.5 h-3.5 text-white" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadAvatar(user.user_id, file);
                      e.target.value = "";
                    }}
                  />
                </label>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {user.display_name || "Без имени"}
                </p>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                  {user.email_confirmed ? (
                    <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-green-500/15 text-green-600 text-[9px] font-bold">✓</span>
                  ) : (
                    <span className="shrink-0 px-1.5 py-0.5 rounded-full bg-destructive/15 text-destructive text-[9px] font-bold">не подтв.</span>
                  )}
                </div>
              </div>
              {isAdmin && (
                <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">ADMIN</span>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground pl-7">
              <span className="flex items-center gap-1">
                <Star className="w-3 h-3 text-primary" />
                <button
                  onClick={() => adjustXp(user.user_id, user.total_xp, -(parseInt(xpAmounts[user.user_id]) || 50))}
                  className="w-5 h-5 rounded bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center transition-colors"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="font-semibold text-foreground min-w-[35px] text-center text-[11px]">{user.total_xp}</span>
                <button
                  onClick={() => adjustXp(user.user_id, user.total_xp, parseInt(xpAmounts[user.user_id]) || 50)}
                  className="w-5 h-5 rounded bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center transition-colors"
                >
                  <Plus className="w-3 h-3" />
                </button>
                <input
                  type="number"
                  value={xpAmounts[user.user_id] ?? "50"}
                  onChange={(e) => setXpAmounts(prev => ({ ...prev, [user.user_id]: e.target.value }))}
                  className="w-14 px-1.5 py-0.5 rounded bg-secondary text-foreground border border-border text-[10px] text-center focus:border-primary focus:outline-none"
                  min={1}
                />
                <span className="text-muted-foreground text-[10px]">XP</span>
              </span>
              <span className="flex items-center gap-1">
                <Coins className="w-3 h-3 text-primary" />
                <span className="font-semibold text-foreground min-w-[35px] text-center text-[11px]">{user.coin_balance}</span>
                <input
                  type="number"
                  value={coinAmounts[user.user_id] ?? "50"}
                  onChange={(e) => setCoinAmounts(prev => ({ ...prev, [user.user_id]: e.target.value }))}
                  className="w-14 px-1.5 py-0.5 rounded bg-secondary text-foreground border border-border text-[10px] text-center focus:border-primary focus:outline-none"
                  min={1}
                />
                <button
                  onClick={() => {
                    const amt = parseInt(coinAmounts[user.user_id]) || 50;
                    if (confirm(`Начислить +${amt} монет для ${user.display_name || user.email}?`)) {
                      adjustCoins(user.user_id, amt);
                    }
                  }}
                  className="px-2 py-0.5 rounded bg-primary/15 text-primary hover:bg-primary/25 text-[10px] font-bold transition-colors"
                >
                  +Дать
                </button>
                <button
                  onClick={() => {
                    const amt = parseInt(coinAmounts[user.user_id]) || 50;
                    if (confirm(`Снять -${amt} монет у ${user.display_name || user.email}?`)) {
                      adjustCoins(user.user_id, -amt);
                    }
                  }}
                  className="px-2 py-0.5 rounded bg-destructive/15 text-destructive hover:bg-destructive/25 text-[10px] font-bold transition-colors"
                >
                  −Снять
                </button>
              </span>
            </div>

            {/* Learning stats row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-7 mt-1">
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                📚 <span className="font-semibold text-foreground">{user.lessons_completed}</span> уроков
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                📝 <span className="font-semibold text-foreground">{user.words_learned}</span> слов
              </span>
              <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                ⚔️ <span className="font-semibold text-foreground">{user.duels_played}</span> дуэлей
                {user.duels_won > 0 && <span className="text-primary font-bold">({user.duels_won} W)</span>}
              </span>
              <span className="text-[10px] text-muted-foreground">
                📅 {user.user_created_at ? new Date(user.user_created_at).toLocaleDateString("ru") : "—"}
              </span>
              {user.last_active && (
                <span className="text-[10px] text-muted-foreground">
                  🕐 {new Date(user.last_active).toLocaleDateString("ru")}
                </span>
              )}
            </div>

            <div className="flex justify-end gap-1.5 flex-wrap">
              {!user.email_confirmed && (
                <button
                  onClick={() => handleConfirmEmail(user.user_id)}
                  disabled={confirming === user.user_id}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-green-500/10 text-green-600 hover:bg-green-500/20 transition-colors disabled:opacity-40"
                >
                  {confirming === user.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <MailCheck className="w-3 h-3" />}
                  Подтвердить email
                </button>
              )}
              <button
                onClick={() => handleResendConfirmation(user.user_id, user.email)}
                disabled={resending === user.user_id}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-muted text-foreground transition-colors disabled:opacity-40"
              >
                {resending === user.user_id ? <Loader2 className="w-3 h-3 animate-spin" /> : <MailCheck className="w-3 h-3" />}
                Переотправить код
              </button>
              <button
                onClick={() => { setDmUserId(user.user_id); setDmMsg(""); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-secondary hover:bg-muted text-foreground transition-colors"
              >
                <MessageSquare className="w-3 h-3" /> Написать
              </button>
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
