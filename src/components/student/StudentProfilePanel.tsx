import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCoins } from "@/hooks/useCoins";
import AvatarPicker from "@/components/AvatarPicker";
import GiftShelf from "@/components/gifts/GiftShelf";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Coins } from "lucide-react";
import { toast } from "sonner";
import { ACADEMY_BGS } from "./academyBackgrounds";

export default function StudentProfilePanel({ bg, onBg }: { bg: string | null; onBg: (id: string) => void }) {
  const { user } = useAuth();
  const { balance } = useCoins();
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [pick, setPick] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase.from("profiles").select("display_name, avatar_url").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => { setName(data?.display_name || ""); setAvatar(data?.avatar_url || null); });
  }, [user?.id]);

  const save = async (patch: Record<string, any>) => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update(patch as any).eq("user_id", user.id);
    if (error) toast.error("Не вдалося зберегти"); else toast.success("Збережено");
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={() => setPick((v) => !v)} title="Змінити аватар">
            <Avatar className="w-16 h-16 border-2 border-primary">
              {avatar ? <AvatarImage src={avatar} className="object-cover" /> : null}
              <AvatarFallback>{(name || "?").slice(0, 2).toUpperCase()}</AvatarFallback>
            </Avatar>
          </button>
          <div className="flex-1 flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Твоє ім'я"
              className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm" />
            <button onClick={() => save({ display_name: name.trim() })}
              className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-bold">OK</button>
          </div>
        </div>
        {pick && <AvatarPicker currentUrl={avatar} onSelect={(u) => { setAvatar(u); setPick(false); save({ avatar_url: u }); }} />}
        <div className="flex items-center gap-2 text-sm font-bold">
          <Coins className="w-4 h-4 text-primary" /> {balance} монет
          <span className="text-xs font-normal text-muted-foreground">— за домашку, тести й уроки</span>
        </div>
      </section>

      {user && (
        <section className="rounded-2xl border border-border bg-card p-4">
          <h3 className="font-display font-bold mb-2">🎁 Мої подарунки</h3>
          <GiftShelf userId={user.id} />
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card p-4">
        <h3 className="font-display font-bold mb-3">Фон Академії</h3>
        <div className="grid grid-cols-3 gap-2">
          {ACADEMY_BGS.map((b) => (
            <button key={b.id} onClick={() => { onBg(b.id); save({ academy_bg: b.id }); }}
              className={`h-16 rounded-xl border-2 text-xs font-bold flex items-end p-1.5 bg-background ${bg === b.id || (!bg && b.id === "none") ? "border-primary" : "border-border"}`}
              style={b.css ? { backgroundImage: b.css } : undefined}>
              <span className="px-1.5 py-0.5 rounded bg-background/80">{b.label}</span>
            </button>
          ))}
        </div>
      </section>

    </div>
  );
}
