import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import type { Tables } from "@/integrations/supabase/types";

type Settings = Tables<"synthetic_settings">;
type Persona = Tables<"synthetic_personas">;

const NUM_FIELDS: { key: keyof Settings; label: string }[] = [
  { key: "max_messages_per_hour", label: "Макс. повідомлень за годину" },
  { key: "quiet_hours_start", label: "Тихі години з (Київ)" },
  { key: "quiet_hours_end", label: "Тихі години до" },
  { key: "min_delay_minutes", label: "Мін. пауза, хв" },
  { key: "max_delay_minutes", label: "Макс. пауза, хв" },
  { key: "active_personas", label: "Активних персонажів" },
];

export default function SyntheticChatPage() {
  const [s, setS] = useState<Settings | null>(null);
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    const [a, b] = await Promise.all([
      supabase.from("synthetic_settings").select("*").eq("id", 1).maybeSingle(),
      supabase.from("synthetic_personas").select("*").order("display_name"),
    ]);
    if (a.error || b.error) toast({ title: "Помилка завантаження", description: (a.error || b.error)?.message, variant: "destructive" });
    setS(a.data ?? null);
    setPersonas(b.data ?? []);
  };
  useEffect(() => { load(); }, []);

  const save = async (patch: Partial<Settings>) => {
    if (!s) return;
    const next = { ...s, ...patch };
    setS(next);
    const { error } = await supabase.from("synthetic_settings").update(patch).eq("id", 1);
    if (error) toast({ title: "Не збережено", description: error.message, variant: "destructive" });
  };

  const call = async (body: Record<string, unknown>) => {
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("community-synthetic", { body });
    setBusy(false);
    if (error) toast({ title: "Помилка", description: error.message, variant: "destructive" });
    else toast({ title: "Готово", description: JSON.stringify(data) });
    load();
  };

  const togglePersona = async (p: Persona) => {
    const { error } = await supabase.from("synthetic_personas").update({ enabled: !p.enabled }).eq("user_id", p.user_id);
    if (error) toast({ title: "Помилка", description: error.message, variant: "destructive" });
    load();
  };

  if (!s) return <p className="text-sm text-muted-foreground">Завантаження…</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Демо-активність у загальному чаті</p>
            <p className="text-xs text-muted-foreground">Демо-акаунти позначені в базі й не входять у статистику реальних учнів.</p>
          </div>
          <Switch checked={s.enabled} onCheckedChange={(v) => save({ enabled: v })} />
        </div>
        <div className="flex gap-2">
          {(["low", "medium", "high"] as const).map((l) => (
            <Button key={l} size="sm" variant={s.activity_level === l ? "default" : "outline"} onClick={() => save({ activity_level: l })}>
              {l === "low" ? "Низька" : l === "medium" ? "Помірна" : "Висока"}
            </Button>
          ))}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {NUM_FIELDS.map((f) => (
            <label key={f.key} className="text-xs space-y-1">
              <span className="text-muted-foreground">{f.label}</span>
              <Input type="number" defaultValue={Number(s[f.key])} onBlur={(e) => save({ [f.key]: Number(e.target.value) } as Partial<Settings>)} />
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          Наступна перевірка: {s.next_run_at ? new Date(s.next_run_at).toLocaleString() : "—"}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={busy} onClick={() => call({ action: "seed" })}>Створити персонажів</Button>
          <Button size="sm" variant="outline" disabled={busy} onClick={() => call({ action: "tick", force: true })}>Надіслати одне повідомлення зараз</Button>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="font-semibold mb-3">Персонажі ({personas.length})</p>
        <div className="divide-y divide-border">
          {personas.map((p) => (
            <div key={p.user_id} className="flex items-center gap-3 py-2">
              <img src={p.avatar_url || ""} alt="" className="w-8 h-8 rounded-full bg-muted" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{p.display_name} <span className="text-muted-foreground">@{p.username}</span> <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-muted">synthetic</span></p>
                <p className="text-xs text-muted-foreground truncate">{p.writing_style}</p>
              </div>
              <Switch checked={p.enabled} onCheckedChange={() => togglePersona(p)} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
