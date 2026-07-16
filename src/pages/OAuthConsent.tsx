import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

// Local typed wrapper for the beta supabase.auth.oauth namespace.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauthApi = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Відсутній authorization_id");
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      try {
        const { data, error } = await oauthApi.getAuthorizationDetails(authorizationId);
        if (!active) return;
        if (error) {
          setError(error.message);
          return;
        }
        const immediate = data?.redirect_url ?? data?.redirect_to;
        if (immediate && !data?.client) {
          window.location.href = immediate;
          return;
        }
        setDetails(data);
      } catch (e: any) {
        setError(e?.message ?? "Не вдалося завантажити запит авторизації");
      }
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    try {
      const { data, error } = approve
        ? await oauthApi.approveAuthorization(authorizationId)
        : await oauthApi.denyAuthorization(authorizationId);
      if (error) {
        setError(error.message);
        setBusy(false);
        return;
      }
      const target = data?.redirect_url ?? data?.redirect_to;
      if (!target) {
        setError("Сервер авторизації не повернув redirect");
        setBusy(false);
        return;
      }
      window.location.href = target;
    } catch (e: any) {
      setError(e?.message ?? "Помилка");
      setBusy(false);
    }
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <div className="max-w-md w-full rounded-2xl border border-border/40 bg-card p-6 space-y-3">
          <h1 className="font-display text-xl font-bold">Не вдалося завантажити запит</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }

  if (!details) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-background">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </main>
    );
  }

  const clientName = details.client?.name ?? details.client?.client_name ?? "Зовнішній застосунок";
  const scopes: string[] = details.scopes ?? details.requested_scopes ?? [];

  return (
    <main className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full rounded-2xl border border-border/40 bg-card p-6 space-y-5">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Підключити {clientName} до KLAR
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            {clientName} зможе викликати інструменти KLAR від вашого імені, поки ви залишаєтесь у системі.
          </p>
        </div>

        {scopes.length > 0 && (
          <div className="rounded-xl bg-muted/30 p-3">
            <p className="text-xs font-bold text-foreground mb-1.5">Запитані права</p>
            <ul className="text-xs text-muted-foreground space-y-1">
              {scopes.map((s) => (
                <li key={s}>• {s}</li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Це не обходить дозволи KLAR і політики бекенду.
        </p>

        <div className="flex gap-2 justify-end">
          <Button variant="ghost" disabled={busy} onClick={() => decide(false)}>
            Скасувати
          </Button>
          <Button disabled={busy} onClick={() => decide(true)}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : "Підключити"}
          </Button>
        </div>
      </div>
    </main>
  );
}
