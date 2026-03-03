import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Minus, Trash2, Pencil, UserPlus, Camera, Lock, MessageSquare } from "lucide-react";
import { toast } from "sonner";
import AvatarPicker from "@/components/AvatarPicker";

interface DemoUser {
  id: string;
  display_name: string;
  total_xp: number;
  avatar_url: string | null;
  telegram_chat_id: number | null;
  words_learned: number;
  lessons_completed: number;
  duels_won: number;
  duels_played: number;
}

const StuffOnlyTab = () => {
  const [unlocked, setUnlocked] = useState(false);
  const [pwd, setPwd] = useState("");
  const [error, setError] = useState("");

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const { data } = await supabase.rpc("check_admin_password", { input_password: pwd });
    if (data) {
      setUnlocked(true);
    } else {
      setError("Неверный пароль");
    }
  };

  if (!unlocked) {
    return (
      <form onSubmit={handleUnlock} className="glass-card p-6 flex flex-col gap-4 max-w-sm mx-auto">
        <div className="text-center">
          <Lock className="w-8 h-8 text-primary mx-auto mb-2" />
          <h3 className="text-sm font-display font-semibold text-foreground">Stuff Only</h3>
          <p className="text-xs text-muted-foreground mt-1">Введите пароль для доступа</p>
        </div>
        <input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="Пароль..."
          className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
        <button type="submit" className="w-full px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
          Открыть
        </button>
      </form>
    );
  }

  return <DemoUsersManager />;
};

const DemoUsersManager = () => {
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDemoName, setNewDemoName] = useState("");
  const [newDemoXp, setNewDemoXp] = useState("100");
  const [editingDemoId, setEditingDemoId] = useState<string | null>(null);
  const [editingDemoName, setEditingDemoName] = useState("");
  const [avatarPickerFor, setAvatarPickerFor] = useState<string | null>(null);
  const [newUserAvatarUrl, setNewUserAvatarUrl] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("demo_leaderboard")
      .select("id, display_name, total_xp, avatar_url, telegram_chat_id, words_learned, lessons_completed, duels_won, duels_played")
      .order("total_xp", { ascending: false });
    setDemoUsers((data as DemoUser[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addDemoUser = async () => {
    if (!newDemoName.trim()) return;
    const insertData: any = {
      display_name: newDemoName.trim(),
      total_xp: parseInt(newDemoXp) || 100,
    };
    if (newUserAvatarUrl) insertData.avatar_url = newUserAvatarUrl;
    const { error } = await supabase.from("demo_leaderboard").insert(insertData);
    if (error) toast.error("Ошибка: " + error.message);
    else { toast.success("Добавлен!"); setNewDemoName(""); setNewDemoXp("100"); setNewUserAvatarUrl(null); load(); }
  };

  const removeDemoUser = async (id: string) => {
    await supabase.from("demo_leaderboard").delete().eq("id", id);
    toast.success("Удалён"); load();
  };

  const saveDemoName = async (id: string) => {
    if (!editingDemoName.trim()) return;
    await supabase.from("demo_leaderboard").update({ display_name: editingDemoName.trim() }).eq("id", id);
    toast.success("Обновлено"); setEditingDemoId(null); load();
  };

  const adjustDemoXp = async (id: string, currentXp: number, delta: number) => {
    await supabase.from("demo_leaderboard").update({ total_xp: Math.max(0, currentXp + delta) }).eq("id", id);
    load();
  };

  const setDemoAvatar = async (id: string, url: string) => {
    await supabase.from("demo_leaderboard").update({ avatar_url: url }).eq("id", id);
    toast.success("Аватарка обновлена!"); setAvatarPickerFor(null); load();
  };

  const uploadAvatar = async (id: string, file: File) => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `demo/${id}/avatar.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (upErr) { toast.error("Ошибка: " + upErr.message); return; }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    await supabase.from("demo_leaderboard").update({ avatar_url: urlData.publicUrl + "?t=" + Date.now() }).eq("id", id);
    toast.success("Аватарка обновлена!"); load();
  };

  if (loading) return <p className="text-muted-foreground animate-pulse">Загрузка...</p>;

  return (
    <div className="flex flex-col gap-4">
      {/* Add new */}
      <div className="glass-card p-4 flex flex-col gap-3">
        <p className="text-xs text-muted-foreground font-medium">Новый фейк-юзер</p>
        <div className="flex gap-2">
          {newUserAvatarUrl && (
            <img src={newUserAvatarUrl} alt="" className="w-10 h-10 rounded-full object-cover border-2 border-primary shrink-0" />
          )}
          <input
            value={newDemoName}
            onChange={(e) => setNewDemoName(e.target.value)}
            placeholder="Имя..."
            className="flex-1 px-3 py-2.5 rounded-xl bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none"
          />
          <input
            value={newDemoXp}
            onChange={(e) => setNewDemoXp(e.target.value)}
            placeholder="XP"
            type="number"
            className="w-20 px-3 py-2.5 rounded-xl bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none"
          />
          <button
            onClick={addDemoUser}
            disabled={!newDemoName.trim()}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>
        <p className="text-[10px] text-muted-foreground">Выбери аватарку для нового юзера:</p>
        <AvatarPicker
          currentUrl={newUserAvatarUrl}
          onSelect={(url) => setNewUserAvatarUrl(url)}
        />
      </div>

      {/* List */}
      <p className="text-xs text-muted-foreground">{demoUsers.length} фейк-юзеров</p>
      {demoUsers.map((du) => (
        <div key={du.id} className="glass-card p-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            {/* Avatar */}
            <div className="relative group shrink-0">
              {du.avatar_url ? (
                <img src={du.avatar_url} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-border" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg">
                  {du.display_name[0]?.toUpperCase()}
                </div>
              )}
              <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                <Camera className="w-4 h-4 text-white" />
                <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAvatar(du.id, f); e.target.value = ""; }} />
              </label>
            </div>

            {/* Name */}
            <div className="flex-1 min-w-0">
              {editingDemoId === du.id ? (
                <input
                  value={editingDemoName}
                  onChange={(e) => setEditingDemoName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && saveDemoName(du.id)}
                  onBlur={() => saveDemoName(du.id)}
                  autoFocus
                  className="w-full px-2 py-1 rounded-lg bg-secondary text-foreground border border-primary text-sm focus:outline-none"
                />
              ) : (
                <p
                  className="text-sm font-semibold text-foreground cursor-pointer hover:text-primary transition-colors truncate"
                  onClick={() => { setEditingDemoId(du.id); setEditingDemoName(du.display_name); }}
                >
                  {du.display_name} <Pencil className="w-3 h-3 inline text-muted-foreground" />
                </p>
              )}
            </div>

            {/* XP */}
            <div className="flex items-center gap-1.5">
              <button onClick={() => adjustDemoXp(du.id, du.total_xp, -50)} className="w-7 h-7 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center">
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-sm font-bold text-foreground min-w-[40px] text-center">{du.total_xp}</span>
              <button onClick={() => adjustDemoXp(du.id, du.total_xp, 50)} className="w-7 h-7 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center">
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Delete */}
            <button onClick={() => removeDemoUser(du.id)} className="w-7 h-7 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Stats controls */}
          <div className="grid grid-cols-2 gap-2">
            {([
              { key: "words_learned", label: "📚 Слова", value: du.words_learned },
              { key: "lessons_completed", label: "📖 Уроки", value: du.lessons_completed },
              { key: "duels_won", label: "🏆 Победы", value: du.duels_won },
              { key: "duels_played", label: "⚔️ Дуэли", value: du.duels_played },
            ] as const).map((stat) => (
              <div key={stat.key} className="flex items-center gap-1.5 bg-secondary/50 rounded-lg px-2 py-1.5">
                <span className="text-[10px] text-muted-foreground whitespace-nowrap">{stat.label}</span>
                <input
                  type="number"
                  defaultValue={stat.value}
                  onBlur={async (e) => {
                    const val = Math.max(0, parseInt(e.target.value) || 0);
                    if (val === stat.value) return;
                    await supabase.from("demo_leaderboard").update({ [stat.key]: val } as any).eq("id", du.id);
                    toast.success("Обновлено!"); load();
                  }}
                  className="w-14 px-1.5 py-0.5 rounded bg-secondary text-foreground border border-border text-xs text-center focus:border-primary focus:outline-none"
                />
              </div>
            ))}
          </div>

          {/* Telegram + Avatar picker */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => setAvatarPickerFor(avatarPickerFor === du.id ? null : du.id)}
              className="text-xs text-primary hover:underline"
            >
              {avatarPickerFor === du.id ? "Скрыть аватарки" : "Выбрать аватарку"}
            </button>
            <div className="flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3 text-muted-foreground" />
              <input
                type="number"
                placeholder="Telegram chat ID"
                defaultValue={du.telegram_chat_id ?? ""}
                onBlur={async (e) => {
                  const val = e.target.value.trim();
                  const chatId = val ? parseInt(val) : null;
                  if (chatId === du.telegram_chat_id) return;
                  await supabase.from("demo_leaderboard").update({ telegram_chat_id: chatId } as any).eq("id", du.id);
                  toast.success(chatId ? "Telegram подключён!" : "Telegram отключён");
                  load();
                }}
                className="w-36 px-2 py-1 rounded-lg bg-secondary text-foreground border border-border text-xs focus:border-primary focus:outline-none"
              />
              {du.telegram_chat_id && <span className="text-[10px] text-green-500 font-medium">✓</span>}
            </div>
          </div>

          {avatarPickerFor === du.id && (
            <AvatarPicker
              currentUrl={du.avatar_url}
              onSelect={(url) => setDemoAvatar(du.id, url)}
            />
          )}
        </div>
      ))}

      {demoUsers.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">Пока нет фейк-юзеров</p>
      )}
    </div>
  );
};

export default StuffOnlyTab;
