import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Lock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { GermanA2Course } from "@/features/german-a2";
import { createSupabaseProgressStore } from "@/features/german-a2/supabaseProgressStore";
import { A2_COURSE_ID, A2_PRICE_UAH } from "@/features/german-a2/pricing";
import { Button } from "@/components/ui/button";

const CourseA2 = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const store = useMemo(() => (user ? createSupabaseProgressStore(user.id) : undefined), [user?.id]);
  const [access, setAccess] = useState<boolean | null>(null);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const check = async () => {
      // Курс відкритий для всіх користувачів
      if (alive) setAccess(true);
      return true;
    };
    check();
    // After returning from payment the bank confirmation may take a few seconds
    const t = window.setInterval(() => { check().then(ok => ok && window.clearInterval(t)); }, 5000);
    const stop = window.setTimeout(() => window.clearInterval(t), 60000);
    return () => { alive = false; window.clearInterval(t); window.clearTimeout(stop); };
  }, [user?.id]);

  const buy = async () => {
    setPaying(true); setError(null);
    const { data, error } = await supabase.functions.invoke("buy-a2-course", { body: {} });
    setPaying(false);
    if (data?.owned) return setAccess(true);
    if (error || !data?.pageUrl) return setError("Не вдалося відкрити оплату. Спробуйте ще раз.");
    window.location.href = data.pageUrl;
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <button onClick={() => navigate("/academy")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> Академія
        </button>
      </div>
      {access === null ? (
        <div className="flex justify-center py-20"><div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" /></div>
      ) : access && store ? (
        <GermanA2Course store={store} className="mx-auto max-w-6xl p-4" />
      ) : (
        <div className="mx-auto max-w-md px-4 py-16 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="font-display text-2xl font-bold text-foreground">Deutsch A2 — Perfekt</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Відео, слова з німецькою озвучкою, граматика, читання, аудіювання, письмо та фінальний тест. Прогрес зберігається у вашому акаунті.
          </p>
          <p className="mt-6 font-display text-4xl font-black text-foreground">{A2_PRICE_UAH} грн</p>
          <p className="text-xs text-muted-foreground">одноразово, доступ назавжди</p>
          <Button size="lg" className="mt-6 w-full font-display font-bold" onClick={buy} disabled={paying}>
            {paying ? "Відкриваю оплату…" : `Купити за ${A2_PRICE_UAH} грн`}
          </Button>
          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          <p className="mt-4 text-xs text-muted-foreground">Оплата карткою через Monobank. Після оплати курс відкриється автоматично.</p>
        </div>
      )}
    </div>
  );
};

export default CourseA2;
