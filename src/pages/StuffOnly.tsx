import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Lock, Plus, Minus, Trash2, Pencil, UserPlus, Camera, Bot, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

interface DemoUser {
  id: string;
  display_name: string;
  total_xp: number;
  avatar_url: string | null;
}

const StuffOnly = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const { data } = await supabase.rpc("check_admin_password", { input_password: password });
    if (data) {
      setAuthenticated(true);
    } else {
      setError("Неверный пароль");
    }
  };

  if (!authenticated) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm animate-slide-up">
          <div className="text-center mb-6">
            <Lock className="w-10 h-10 text-primary mx-auto mb-3" />
            <h1 className="text-2xl font-display font-bold">Stuff Only</h1>
            <p className="text-sm text-muted-foreground mt-1">Введите пароль</p>
          </div>
          <div className="glass-card p-6 flex flex-col gap-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Пароль"
              className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-colors"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="submit" className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow">
              Войти
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-background overflow-y-auto">
      <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display font-bold text-gradient">Stuff Only</h1>
          <Link to="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" /> К приложению
          </Link>
        </div>
        <DemoUsersManager />
      </div>
    </div>
  );
};

const DemoUsersManager = () => {
  const [demoUsers, setDemoUsers] = useState<DemoUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [newDemoName, setNewDemoName] = useState("");
  const [newDemoXp, setNewDemoXp] = useState("100");
  const [editingDemoId, setEditingDemoId] = useState<string | null>(null);
  const [editingDemoName, setEditingDemoName] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("demo_leaderboard")
      .select("id, display_name, total_xp, avatar_url")
      .order("total_xp", { ascending: false });
    setDemoUsers((data as DemoUser[]) ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

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
      load();
    }
  };

  const removeDemoUser = async (id: string) => {
    const { error } = await supabase.from("demo_leaderboard").delete().eq("id", id);
    if (error) toast.error("Ошибка: " + error.message);
    else { toast.success("Удалён"); load(); }
  };

  const saveDemoName = async (id: string) => {
    if (!editingDemoName.trim()) return;
    const { error } = await supabase.from("demo_leaderboard").update({ display_name: editingDemoName.trim() }).eq("id", id);
    if (error) toast.error("Ошибка: " + error.message);
    else { toast.success("Имя обновлено"); setEditingDemoId(null); load(); }
  };

  const adjustDemoXp = async (id: string, currentXp: number, delta: number) => {
    const newXp = Math.max(0, currentXp + delta);
    await supabase.from("demo_leaderboard").update({ total_xp: newXp }).eq("id", id);
    load();
  };

  const uploadAvatar = async (id: string, file: File) => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `demo/${id}/avatar.${ext}`;
    const { error: uploadError } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (uploadError) {
      toast.error("Ошибка загрузки: " + uploadError.message);
      return;
    }
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
    const avatarUrl = urlData.publicUrl + "?t=" + Date.now();
    const { error: updateError } = await supabase.from("demo_leaderboard").update({ avatar_url: avatarUrl }).eq("id", id);
    if (updateError) {
      toast.error("Ошибка: " + updateError.message);
      return;
    }
    toast.success("Аватарка обновлена!");
    load();
  };

  if (loading) return <p className="text-muted-foreground animate-pulse">Загрузка...</p>;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="text-lg font-display font-semibold text-foreground flex items-center gap-2">
        <Bot className="w-5 h-5 text-primary" /> Фейк-юзеры для рейтинга
        <span className="ml-auto text-sm text-muted-foreground font-normal">{demoUsers.length}</span>
      </h2>

      {/* Add new */}
      <div className="glass-card p-4 flex flex-col gap-3">
        <p className="text-xs text-muted-foreground">Добавить нового фейк-юзера</p>
        <div className="flex gap-2">
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
            className="w-24 px-3 py-2.5 rounded-xl bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none"
          />
          <button
            onClick={addDemoUser}
            disabled={!newDemoName.trim()}
            className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 transition-all"
          >
            <UserPlus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* List */}
      <div className="flex flex-col gap-2">
        {demoUsers.map((du) => (
          <div key={du.id} className="glass-card p-4 flex items-center gap-3">
            {/* Avatar with upload */}
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
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadAvatar(du.id, file);
                    e.target.value = "";
                  }}
                />
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

            {/* XP controls */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => adjustDemoXp(du.id, du.total_xp, -50)}
                className="w-7 h-7 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center transition-colors"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <span className="text-sm font-bold text-foreground min-w-[45px] text-center">{du.total_xp}</span>
              <button
                onClick={() => adjustDemoXp(du.id, du.total_xp, 50)}
                className="w-7 h-7 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 flex items-center justify-center transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Delete */}
            <button
              onClick={() => removeDemoUser(du.id)}
              className="w-7 h-7 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 flex items-center justify-center transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      {demoUsers.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">Пока нет фейк-юзеров</p>
      )}
    </div>
  );
};

export default StuffOnly;
