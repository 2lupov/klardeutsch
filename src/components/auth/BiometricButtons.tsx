import { useEffect, useState } from "react";
import { ScanFace } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { disableBiometric, enableBiometric, hasLocalPasskey, isBiometricSupported, loginWithBiometric } from "@/lib/biometrics";

export function BiometricLoginButton({ onSuccess }: { onSuccess?: () => void }) {
  const [supported, setSupported] = useState(false);
  const [busy, setBusy] = useState(false);
  // Only show when Face ID was enabled on THIS device — otherwise iOS offers a QR code for another device.
  useEffect(() => { isBiometricSupported().then((s) => setSupported(s && hasLocalPasskey())); }, []);
  if (!supported) return null;

  const go = async () => {
    setBusy(true);
    try {
      await loginWithBiometric();
      onSuccess?.();
    } catch (e: any) {
      if (e?.name !== "NotAllowedError") toast({ title: e?.message || "Не вдалося", variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm border border-primary/40 bg-primary/10 text-foreground hover:bg-primary/20 transition-all disabled:opacity-60"
    >
      <ScanFace className="w-5 h-5 text-primary" />
      {busy ? "Перевірка…" : "Увійти через Face ID / Touch ID"}
    </button>
  );
}

export function BiometricToggle() {
  const [supported, setSupported] = useState(false);
  const [on, setOn] = useState(hasLocalPasskey());
  const [busy, setBusy] = useState(false);
  useEffect(() => { isBiometricSupported().then(setSupported); }, []);
  if (!supported) return null;

  const toggle = async (next: boolean) => {
    setBusy(true);
    try {
      if (next) { await enableBiometric(); toast({ title: "Face ID увімкнено для швидкого входу" }); }
      else { await disableBiometric(); toast({ title: "Біометричний вхід вимкнено" }); }
      setOn(next);
    } catch (e: any) {
      if (e?.name !== "NotAllowedError") toast({ title: e?.message || "Не вдалося", variant: "destructive" });
    } finally { setBusy(false); }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card/60 px-4 py-3">
      <div className="flex items-center gap-3">
        <ScanFace className="w-5 h-5 text-primary" />
        <div>
          <p className="text-sm font-semibold">Face ID / біометрія</p>
          <p className="text-xs text-muted-foreground">Швидкий вхід на цьому пристрої</p>
        </div>
      </div>
      <Switch checked={on} disabled={busy} onCheckedChange={toggle} />
    </div>
  );
}
