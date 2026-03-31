import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { AtSign } from "lucide-react";

interface Props {
  onComplete: (name: string) => void;
}

const usernameRegex = /^[a-zA-Zа-яА-ЯёЁіІїЇєЄґҐ][a-zA-Zа-яА-ЯёЁіІїЇєЄґҐ0-9._]{4,19}$/;

const NicknameGate = ({ onComplete }: Props) => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const validate = (val: string) => {
    if (val.length < 5) return "Минимум 5 символов";
    if (!/^[a-zA-Zа-яА-ЯёЁіІїЇєЄґҐ]/.test(val)) return "Должен начинаться с буквы";
    if (!usernameRegex.test(val)) return "Только буквы, цифры, точка и _";
    return "";
  };

  const handleChange = (val: string) => {
    const cleaned = val.replace(/\s/g, "").slice(0, 20);
    setName(cleaned);
    setError(cleaned.length > 0 ? validate(cleaned) : "");
  };

  const handleSave = async () => {
    const trimmed = name.trim();
    const err = validate(trimmed);
    if (err || !user) { setError(err); return; }

    setChecking(true);
    // Check uniqueness
    const { data: existing } = await supabase
      .from("profiles")
      .select("user_id")
      .ilike("display_name", trimmed)
      .neq("user_id", user.id)
      .limit(1);

    if (existing && existing.length > 0) {
      setError("Этот никнейм уже занят");
      setChecking(false);
      return;
    }

    setSaving(true);
    setChecking(false);
    await supabase.from("profiles").update({ display_name: trimmed }).eq("user_id", user.id);
    // Award 50 coins for creating a nickname
    await supabase.rpc("award_coins", { p_user_id: user.id, p_amount: 50, p_reason: "nickname_created" });
    toast({ title: "Отлично! +50 монет 🎉🪙" });
    onComplete(trimmed);
    setSaving(false);
  };

  const isValid = name.length >= 5 && !error;

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm glass-card p-8 flex flex-col items-center gap-6 animate-scale-in">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <AtSign className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="font-display text-xl font-bold text-foreground mb-1">Создай уникальный никнейм</h2>
          <p className="text-sm text-muted-foreground">Он будет виден другим игрокам как @{name || "nickname"}</p>
        </div>
        <div className="w-full relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-lg text-muted-foreground font-display font-bold">@</span>
          <input
            type="text"
            value={name}
            onChange={(e) => handleChange(e.target.value)}
            placeholder="nickname"
            maxLength={20}
            autoFocus
            className="w-full pl-10 pr-4 py-3 rounded-xl bg-secondary border border-border text-lg font-display font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
          />
        </div>
        {error ? (
          <p className="text-xs text-destructive -mt-3">{error}</p>
        ) : (
          <p className="text-xs text-muted-foreground -mt-3">Начинается с буквы · минимум 5 символов · буквы, цифры, . и _</p>
        )}
        <button
          onClick={handleSave}
          disabled={!isValid || saving || checking}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm disabled:opacity-40 hover:opacity-90 transition-all glow-yellow"
        >
          {saving || checking ? "..." : "Продолжить"}
        </button>
      </div>
    </div>
  );
};

export default NicknameGate;
