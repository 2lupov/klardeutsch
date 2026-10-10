import { useEffect, useState } from "react";
import { Check, Lock, Coins, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCoins } from "@/hooks/useCoins";
import { toast } from "sonner";

const PRESET_AVATARS = [
  { id: "ua-1", url: "/avatars/ua-1.png", label: "🇺🇦 Вишиванка" },
  { id: "ua-2", url: "/avatars/ua-2.png", label: "🇺🇦 Козак" },
  { id: "de-1", url: "/avatars/de-1.png", label: "🇩🇪 Баварець" },
  { id: "de-2", url: "/avatars/de-2.png", label: "🇩🇪 Поліцай" },
  { id: "neutral-1", url: "/avatars/neutral-1.png", label: "🥷 Ніндзя" },
  { id: "neutral-2", url: "/avatars/neutral-2.png", label: "🚀 Космонавт" },
  { id: "neutral-3", url: "/avatars/neutral-3.png", label: "🎓 Професор" },
  { id: "neutral-4", url: "/avatars/neutral-4.png", label: "🎧 Діджей" },
  { id: "neutral-5", url: "/avatars/neutral-5.png", label: "🎨 Художник" },
  { id: "neutral-6", url: "/avatars/neutral-6.png", label: "🧙 Чарівник" },
  { id: "theme-chef", url: "/avatars/theme-chef.jpg", label: "👨‍🍳 Кухар" },
  { id: "theme-football", url: "/avatars/theme-football.jpg", label: "⚽ Футболіст" },
  { id: "theme-pirate", url: "/avatars/theme-pirate.jpg", label: "🏴‍☠️ Пірат" },
  { id: "theme-gamer", url: "/avatars/theme-gamer.jpg", label: "🎮 Геймер" },
  { id: "theme-barista", url: "/avatars/theme-barista.jpg", label: "☕ Бариста" },
  { id: "theme-rocker", url: "/avatars/theme-rocker.jpg", label: "🎸 Рокер" },
];

export const LIVE_AVATARS = [
  { id: "a1a1a1a1-0000-4000-8000-000000000001", key: "live-king", url: "/avatars/live-king.jpg", label: "👑 Король", price: 300, fx: "gold" },
  { id: "a1a1a1a1-0000-4000-8000-000000000002", key: "live-cyber", url: "/avatars/live-cyber.jpg", label: "🤖 Кібер", price: 250, fx: "neon" },
  { id: "a1a1a1a1-0000-4000-8000-000000000003", key: "live-fire", url: "/avatars/live-fire.jpg", label: "🔥 Вогонь", price: 200, fx: "fire" },
  { id: "a1a1a1a1-0000-4000-8000-000000000004", key: "live-ice", url: "/avatars/live-ice.jpg", label: "❄️ Лід", price: 200, fx: "ice" },
  { id: "a1a1a1a1-0000-4000-8000-000000000005", key: "live-cosmic", url: "/avatars/live-cosmic.jpg", label: "🌌 Космос", price: 400, fx: "cosmic" },
];

const FX_RING: Record<string, string> = {
  gold: "from-yellow-300 via-amber-500 to-yellow-200",
  neon: "from-cyan-400 via-fuchsia-500 to-cyan-400",
  fire: "from-orange-500 via-red-500 to-yellow-400",
  ice: "from-sky-200 via-cyan-400 to-blue-300",
  cosmic: "from-violet-500 via-fuchsia-400 to-indigo-500",
};

interface AvatarPickerProps {
  currentUrl?: string | null;
  onSelect: (url: string) => void;
  loading?: boolean;
}

/** Animated "live" avatar tile: rotating aura ring + breathing image. */
export const LiveAvatarFrame = ({ url, fx, alt }: { url: string; fx: string; alt: string }) => (
  <div className="relative w-full h-full">
    <div className={`absolute -inset-1 rounded-2xl bg-gradient-conic bg-gradient-to-r ${FX_RING[fx]} animate-[spin_4s_linear_infinite] blur-[2px] opacity-90`} />
    <div className="absolute inset-0 rounded-xl overflow-hidden">
      <img src={url} alt={alt} loading="lazy" className="w-full h-full object-cover animate-[pulse_3s_ease-in-out_infinite] motion-safe:[animation-name:live-breathe]" />
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-foreground/15 to-transparent motion-safe:animate-[live-shine_2.8s_ease-in-out_infinite]" />
    </div>
  </div>
);

const AvatarPicker = ({ currentUrl, onSelect, loading }: AvatarPickerProps) => {
  const { user } = useAuth();
  const { balance, purchaseItem } = useCoins();
  const [selected, setSelected] = useState<string | null>(null);
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [buying, setBuying] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("purchases")
      .select("item_id")
      .eq("user_id", user.id)
      .in("item_id", LIVE_AVATARS.map((a) => a.id))
      .then(({ data }) => setOwned(new Set((data ?? []).map((d) => d.item_id))));
  }, [user]);

  const handleSelect = (url: string) => {
    setSelected(url);
    onSelect(url);
  };

  const isActive = (url: string, key: string) =>
    selected === url || (!selected && !!currentUrl?.includes(key));

  const buy = async (a: (typeof LIVE_AVATARS)[number]) => {
    if (balance < a.price) {
      toast.error(`Не вистачає монеток: потрібно ${a.price}, у тебе ${balance}`);
      return;
    }
    setBuying(a.id);
    const ok = await purchaseItem(a.id);
    setBuying(null);
    if (!ok) return toast.error("Не вдалося купити");
    setOwned((s) => new Set(s).add(a.id));
    toast.success(`${a.label} твій!`);
    handleSelect(a.url);
  };

  const tile = "snap-center shrink-0 w-[30%] sm:w-[22%] md:w-auto";

  return (
    <div className="space-y-4">
      <style>{`@keyframes live-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}@keyframes live-shine{0%{transform:translateX(-120%)}60%,100%{transform:translateX(120%)}}`}</style>

      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-primary" /> Живі аватарки
          </p>
          <span className="text-xs text-muted-foreground flex items-center gap-1"><Coins className="w-3.5 h-3.5" />{balance}</span>
        </div>
        <div className="flex md:grid md:grid-cols-5 gap-3 overflow-x-auto snap-x snap-mandatory pb-2 px-1 pt-1 -mx-1 scrollbar-none">
          {LIVE_AVATARS.map((a) => {
            const has = owned.has(a.id);
            const active = isActive(a.url, a.key);
            return (
              <div key={a.id} className={`${tile} flex flex-col items-center gap-1`}>
                <button
                  onClick={() => (has ? handleSelect(a.url) : buy(a))}
                  disabled={loading || buying === a.id}
                  className={`relative w-full aspect-square transition-transform ${active ? "scale-105" : "active:scale-95"} disabled:opacity-60`}
                  title={a.label}
                >
                  <LiveAvatarFrame url={a.url} fx={a.fx} alt={a.label} />
                  {!has && (
                    <div className="absolute inset-0 rounded-xl bg-background/50 flex items-center justify-center">
                      <Lock className="w-5 h-5 text-foreground" />
                    </div>
                  )}
                  {active && (
                    <div className="absolute inset-0 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Check className="w-5 h-5 text-primary drop-shadow-md" />
                    </div>
                  )}
                </button>
                <span className="text-[10px] text-muted-foreground truncate max-w-full">
                  {has ? a.label : <span className="inline-flex items-center gap-0.5 text-primary font-semibold"><Coins className="w-3 h-3" />{a.price}</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold text-muted-foreground mb-2">Безкоштовні</p>
        <div className="flex md:grid md:grid-cols-5 gap-2 overflow-x-auto snap-x snap-mandatory pb-2 px-1 pt-1 -mx-1 scrollbar-none">
          {PRESET_AVATARS.map((avatar) => {
            const active = isActive(avatar.url, avatar.id);
            return (
              <button
                key={avatar.id}
                onClick={() => handleSelect(avatar.url)}
                disabled={loading}
                className={`${tile} relative rounded-xl overflow-hidden border-2 transition-all aspect-square ${
                  active ? "border-primary ring-2 ring-primary/30 scale-105" : "border-border/50 hover:border-primary/50"
                } disabled:opacity-50`}
                title={avatar.label}
              >
                <img src={avatar.url} alt={avatar.label} loading="lazy" className="w-full h-full object-cover" />
                {active && (
                  <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                    <Check className="w-5 h-5 text-primary drop-shadow-md" />
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export { PRESET_AVATARS };
export default AvatarPicker;
