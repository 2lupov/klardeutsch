import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BarChart3, Users, BookOpen, Swords, Coins, TrendingUp, RefreshCw, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface DailyStats {
  totalUsers: number;
  newToday: number;
  newWeek: number;
  activeToday: number;
  activeWeek: number;
  telegramUsers: number;
  lessonsToday: number;
  wordsToday: number;
  duelsToday: number;
  coinsEarned: number;
  coinsSpent: number;
  purchasesToday: number;
  totalXP: number;
}

const StatCard = ({ icon: Icon, label, value, sub, color = "primary" }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color?: string;
}) => (
  <div className="glass-card p-3 flex items-start gap-3">
    <div className={`w-8 h-8 rounded-lg bg-${color}/10 flex items-center justify-center shrink-0`}>
      <Icon className={`w-4 h-4 text-${color}`} />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">{label}</p>
      <p className="text-lg font-display font-bold text-foreground">{value}</p>
      {sub && <p className="text-[10px] text-muted-foreground">{sub}</p>}
    </div>
  </div>
);

const AdminStats = () => {
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("daily-stats", { body: {} });
      if (error) throw error;
      if (data?.stats) setStats(data.stats);
      else if (data?.error) throw new Error(data.error);
    } catch (err: any) {
      toast.error("Ошибка загрузки: " + err.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  const sendToTelegram = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("daily-stats", { body: {} });
      if (error) throw error;
      if (data?.ok) toast.success("Статистика отправлена в Telegram! 📊");
      else toast.error("Не удалось отправить");
    } catch (err: any) { toast.error(err.message); }
    setSending(false);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-sm text-muted-foreground text-center py-8">Нет данных</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-display font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary" /> Статистика за сегодня
        </h3>
        <div className="flex gap-2">
          <button onClick={loadStats} className="p-2 rounded-lg bg-secondary text-muted-foreground hover:text-foreground transition-colors" title="Обновить">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <button onClick={sendToTelegram} disabled={sending} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 disabled:opacity-40 transition-colors">
            {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            В Telegram
          </button>
        </div>
      </div>

      {/* Users */}
      <section>
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2">👥 Пользователи</p>
        <div className="grid grid-cols-2 gap-2">
          <StatCard icon={Users} label="Всего" value={stats.totalUsers} />
          <StatCard icon={Users} label="Новых сегодня" value={stats.newToday} sub={`за неделю: ${stats.newWeek}`} />
          <StatCard icon={Users} label="Активных сегодня" value={stats.activeToday} sub={`за неделю: ${stats.activeWeek}`} />
          <StatCard icon={Users} label="С Telegram" value={stats.telegramUsers} sub={`${stats.totalUsers ? Math.round((stats.telegramUsers / stats.totalUsers) * 100) : 0}% от всех`} />
        </div>
      </section>

      {/* Learning */}
      <section>
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2">📚 Обучение</p>
        <div className="grid grid-cols-3 gap-2">
          <StatCard icon={BookOpen} label="Уроков" value={stats.lessonsToday} />
          <StatCard icon={BookOpen} label="Слов" value={stats.wordsToday} />
          <StatCard icon={Swords} label="Дуэлей" value={stats.duelsToday} />
        </div>
      </section>

      {/* Economy */}
      <section>
        <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mb-2">💰 Экономика</p>
        <div className="grid grid-cols-3 gap-2">
          <StatCard icon={Coins} label="Заработано" value={`+${stats.coinsEarned}`} color="primary" />
          <StatCard icon={Coins} label="Потрачено" value={`-${stats.coinsSpent}`} color="destructive" />
          <StatCard icon={TrendingUp} label="Покупки" value={stats.purchasesToday} />
        </div>
      </section>

      <div className="glass-card p-3 text-center">
        <p className="text-[10px] text-muted-foreground">⭐ Общий XP платформы</p>
        <p className="text-xl font-display font-bold text-foreground">{stats.totalXP.toLocaleString("ru-RU")}</p>
      </div>
    </div>
  );
};

export default AdminStats;
