import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { User } from "lucide-react";

interface Props {
  onComplete: (name: string) => void;
}

const NicknameGate = ({ onComplete }: Props) => {
  const { user } = useAuth();
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed.length < 2 || !user) return;
    setSaving(true);
    await supabase.from("profiles").update({ display_name: trimmed }).eq("user_id", user.id);
    toast({ title: "Отлично! 🎉" });
    onComplete(trimmed);
    setSaving(false);
  };

  return (
    <div className="min-h-[100dvh] bg-background flex items-center justify-center px-4">
      <div className="w-full max-w-sm glass-card p-8 flex flex-col items-center gap-6 animate-scale-in">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <User className="w-8 h-8 text-primary" />
        </div>
        <div className="text-center">
          <h2 className="font-display text-xl font-bold text-foreground mb-1">Как тебя зовут?</h2>
          <p className="text-sm text-muted-foreground">Выбери никнейм — он будет виден другим игрокам</p>
        </div>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 20))}
          placeholder="Твой никнейм"
          maxLength={20}
          autoFocus
          className="w-full px-4 py-3 rounded-xl bg-secondary border border-border text-center text-lg font-display font-semibold text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
          onKeyDown={(e) => e.key === "Enter" && handleSave()}
        />
        <p className="text-xs text-muted-foreground">от 2 до 20 символов</p>
        <button
          onClick={handleSave}
          disabled={name.trim().length < 2 || saving}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm disabled:opacity-40 hover:opacity-90 transition-all glow-yellow"
        >
          {saving ? "..." : "Продолжить"}
        </button>
      </div>
    </div>
  );
};

export default NicknameGate;
