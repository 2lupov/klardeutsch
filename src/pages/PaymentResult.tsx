import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";

const STATUS_LABEL: Record<string, { title: string; icon: JSX.Element; color: string }> = {
  success:    { title: "Оплата успішна",              icon: <CheckCircle2 className="w-10 h-10" />, color: "text-emerald-500" },
  hold:       { title: "Кошти заблоковано (hold)",    icon: <Clock className="w-10 h-10" />,        color: "text-amber-500" },
  processing: { title: "Платіж обробляється…",        icon: <Loader2 className="w-10 h-10 animate-spin" />, color: "text-sky-500" },
  created:    { title: "Очікуємо оплату…",             icon: <Loader2 className="w-10 h-10 animate-spin" />, color: "text-sky-500" },
  failure:    { title: "Помилка оплати",              icon: <XCircle className="w-10 h-10" />,      color: "text-rose-500" },
  expired:    { title: "Термін оплати сплив",         icon: <XCircle className="w-10 h-10" />,      color: "text-rose-500" },
  reversed:   { title: "Кошти повернуто",             icon: <XCircle className="w-10 h-10" />,      color: "text-muted-foreground" },
};

export default function PaymentResult() {
  const [params] = useSearchParams();
  const invoiceId = params.get("invoiceId") || params.get("invoice_id");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!invoiceId) { setLoading(false); return; }
    let cancelled = false;

    const poll = async () => {
      const { data: fnData } = await supabase.functions.invoke("mono-invoice-status", {
        body: { invoiceId },
      });
      if (cancelled) return;
      setData(fnData);
      setLoading(false);
      // keep polling if not final
      const status = fnData?.status;
      if (status && !["success", "failure", "expired", "reversed"].includes(status)) {
        setTimeout(poll, 3000);
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [invoiceId]);

  const status = data?.status ?? (loading ? "processing" : "failure");
  const meta = STATUS_LABEL[status] ?? STATUS_LABEL.processing;

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="glass-card p-8 max-w-md w-full text-center space-y-4">
        <div className={`mx-auto ${meta.color}`}>{meta.icon}</div>
        <h1 className="font-display text-xl font-bold">{meta.title}</h1>
        {data?.amount && (
          <p className="text-sm text-muted-foreground">
            Сума: <b>{(data.amount / 100).toFixed(2)} грн</b>
          </p>
        )}
        {invoiceId && (
          <p className="text-[10px] text-muted-foreground break-all">Invoice: {invoiceId}</p>
        )}
        <Link to="/" className="inline-block px-5 py-2 rounded-xl bg-primary text-primary-foreground font-semibold text-sm">
          На головну
        </Link>
      </div>
    </div>
  );
}
