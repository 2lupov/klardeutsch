import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, CreditCard, ExternalLink, Loader2, Lock, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { GermanA2Course } from "@/features/german-a2";
import { createSupabaseProgressStore } from "@/features/german-a2/supabaseProgressStore";
import { A2_COURSE_ID, A2_PRICE_UAH } from "@/features/german-a2/pricing";
import { Button } from "@/components/ui/button";

const PAY_STEPS = [
  { icon: ExternalLink, title: "Натисніть «Купити»", text: "Відкриється захищена сторінка оплати Monobank." },
  { icon: CreditCard, title: `Оплатіть ${A2_PRICE_UAH} грн`, text: "Карткою будь-якого банку або через застосунок Monobank." },
  { icon: CheckCircle2, title: "Курс відкриється", text: "Автоматично на цій сторінці — нічого більше робити не треба." },
];

const CourseA2 = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const store = useMemo(() => (user ? createSupabaseProgressStore(user.id) : undefined), [user?.id]);
  const [access, setAccess] = useState<boolean | null>(null);
  const [paying, setPaying] = useState(false);
  const [checking, setChecking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const checkAccess = useCallback(async () => {
    if (!user) return false;
    const [{ data: purchase }, { data: adminRole }, { data: teacherRole }] = await Promise.all([
      supabase.from("course_purchases").select("id").eq("user_id", user!.id).eq("course_id", A2_COURSE_ID).maybeSingle(),
      supabase.rpc("has_role", { _user_id: user!.id, _role: "admin" }),
      supabase.rpc("has_role", { _user_id: user!.id, _role: "teacher" }),
    ]);
    const ok = !!purchase || !!adminRole || !!teacherRole;
    setAccess(ok);
    return ok;
  }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    checkAccess();
    // After returning from payment the bank confirmation may take a few seconds
    const t = window.setInterval(() => { checkAccess().then(ok => ok && window.clearInterval(t)); }, 5000);
    const stop = window.setTimeout(() => window.clearInterval(t), 60000);
    return () => { alive = false; window.clearInterval(t); window.clearTimeout(stop); };
  }, [user?.id, checkAccess]);

  const buy = async () => {
    setPaying(true); setError(null);
    const { data, error } = await supabase.functions.invoke("buy-a2-course", { body: {} });
    setPaying(false);
    if (data?.owned) return setAccess(true);
    if (error || !data?.pageUrl) return setError("Не вдалося відкрити оплату. Спробуйте ще раз.");
    window.location.href = data.pageUrl;
  };

  const manualCheck = async () => {
    setChecking(true); setNotice(null); setError(null);
    const ok = await checkAccess();
    setChecking(false);
    if (!ok) {
      setNotice("Оплату ще не підтверджено. Банку може знадобитися 1–2 хвилини — зачекайте й натисніть ще раз.");
    }
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

          <ol className="mt-8 space-y-4 text-left">
            {PAY_STEPS.map((step, i) => (
              <li key={i} className="flex gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/15">
                  <step.icon className="h-4 w-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">{i + 1}. {step.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{step.text}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-8 rounded-2xl border border-border/60 bg-card/50 p-4 text-left">
            <p className="font-display text-sm font-bold text-foreground">Коли курс стане доступним?</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Одразу після оплати: Monobank підтверджує платіж протягом кількох секунд, максимум 1–2 хвилини.
              Ця сторінка сама перевіряє статус після повернення з оплати й відкриє курс, щойно банк підтвердить платіж.
              Якщо курс не з'явився — натисніть кнопку нижче.
            </p>
            <Button variant="outline" size="sm" className="mt-3 w-full font-display" onClick={manualCheck} disabled={checking}>
              {checking ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
              {checking ? "Перевіряю…" : "Я вже оплатив — перевірити доступ"}
            </Button>
            {notice && <p className="mt-2 text-xs text-muted-foreground">{notice}</p>}
          </div>

          <p className="mt-4 text-xs text-muted-foreground">Оплата карткою через Monobank. Після оплати курс відкриється автоматично.</p>
        </div>
      )}
    </div>
  );
};

export default CourseA2;
