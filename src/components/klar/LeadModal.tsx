import { useEffect, useState } from "react";
import { z } from "zod";
import { X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const schema = z.object({
  name: z.string().trim().min(2, "Вкажіть імʼя").max(80, "Занадто довге імʼя"),
  phone: z
    .string()
    .trim()
    .regex(/^\+380\d{9}$/, "Формат: +380XXXXXXXXX"),
  telegram: z
    .string()
    .trim()
    .max(40)
    .regex(/^@?[A-Za-z0-9_]{3,32}$/, "Лише латиниця, цифри та _")
    .optional()
    .or(z.literal("")),
  email: z.string().trim().email("Некоректна пошта").max(255).optional().or(z.literal("")),
  level: z.string().max(40),
});

const LEVELS = [
  { value: "zero", label: "З нуля" },
  { value: "a1-a2", label: "A1–A2" },
  { value: "b1-b2", label: "B1–B2" },
  { value: "unknown", label: "Не знаю" },
];

const maskPhone = (raw: string) => {
  const digits = raw.replace(/\D/g, "").replace(/^380/, "").slice(0, 9);
  return "+380" + digits;
};

const getUtm = () => {
  const p = new URLSearchParams(window.location.search);
  return {
    utm_source: p.get("utm_source")?.slice(0, 120) || null,
    utm_medium: p.get("utm_medium")?.slice(0, 120) || null,
    utm_campaign: p.get("utm_campaign")?.slice(0, 120) || null,
  };
};

type Props = {
  open: boolean;
  onClose: () => void;
  discount?: string | null;
};

const LeadModal = ({ open, onClose, discount }: Props) => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("+380");
  const [telegram, setTelegram] = useState("");
  const [email, setEmail] = useState("");
  const [level, setLevel] = useState("unknown");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (open) {
      setDone(false);
      setErrors({});
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ name, phone, telegram, email, level });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      parsed.error.issues.forEach((i) => (next[String(i.path[0])] = i.message));
      setErrors(next);
      return;
    }
    setErrors({});
    setSending(true);

    const utm = getUtm();
    const payload = {
      name: parsed.data.name,
      phone: parsed.data.phone,
      telegram: parsed.data.telegram ? parsed.data.telegram.replace(/^@/, "") : null,
      email: parsed.data.email || null,
      level: LEVELS.find((l) => l.value === level)?.label || null,
      consent: true,
      consent_at: new Date().toISOString(),
      discount: discount || null,
      status: "new",
      ...utm,
    };

    const { error } = await supabase.from("leads").insert(payload);
    setSending(false);

    if (error) {
      setErrors({ form: "Не вдалося надіслати заявку. Спробуйте ще раз." });
      return;
    }

    setDone(true);
    supabase.functions.invoke("notify-lead", { body: payload }).catch(() => undefined);
    const fbq = (window as unknown as { fbq?: (...a: unknown[]) => void }).fbq;
    fbq?.("track", "Lead");
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />
      <div className="relative z-10 w-full sm:max-w-md max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:rounded-2xl border border-border/50 bg-card p-6 shadow-2xl animate-in slide-in-from-bottom-4 fade-in duration-300">
        <button
          onClick={onClose}
          aria-label="Закрити"
          className="absolute right-4 top-4 text-foreground/60 hover:text-foreground transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {done ? (
          <div className="py-10 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary/15">
              <Check className="h-7 w-7 text-primary" />
            </div>
            <h3 className="font-display text-2xl text-foreground">Дякуємо!</h3>
            <p className="mt-2 text-foreground/70">
              Я звʼяжуся з вами в Telegram найближчим часом.
            </p>
            <button
              onClick={onClose}
              className="mt-6 rounded-xl border border-primary/40 px-6 py-2.5 text-primary transition-colors hover:bg-primary/10"
            >
              Закрити
            </button>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-4">
            <h3 className="pr-8 font-display text-[26px] leading-snug text-foreground">
              Залиште заявку — я звʼяжуся з вами в Telegram
            </h3>

            {discount && (
              <p className="rounded-xl bg-accent/15 px-4 py-2.5 text-sm text-accent">
                Ваша знижка: <strong>{discount}</strong>
              </p>
            )}

            <Field label="Імʼя" error={errors.name}>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 80))}
                placeholder="Олена"
                className={inputCls}
                autoComplete="name"
              />
            </Field>

            <Field label="Телефон" error={errors.phone}>
              <input
                value={phone}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                inputMode="tel"
                placeholder="+380671234567"
                className={inputCls}
                autoComplete="tel"
              />
            </Field>

            <Field label="Telegram (опційно)" error={errors.telegram}>
              <input
                value={telegram}
                onChange={(e) => setTelegram(e.target.value.slice(0, 40))}
                placeholder="@nickname"
                className={inputCls}
              />
            </Field>

            <Field label="Пошта (опційно)" error={errors.email}>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value.slice(0, 255))}
                inputMode="email"
                placeholder="you@mail.com"
                className={inputCls}
                autoComplete="email"
              />
            </Field>

            <Field label="Рівень німецької">
              <select value={level} onChange={(e) => setLevel(e.target.value)} className={inputCls}>
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value} className="bg-card">
                    {l.label}
                  </option>
                ))}
              </select>
            </Field>

            <label className="flex cursor-pointer items-start gap-3 text-[13px] leading-relaxed text-foreground/70">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-0.5 h-4 w-4 accent-[hsl(var(--primary))]"
              />
              <span>
                Я даю згоду на обробку моїх персональних даних відповідно до{" "}
                <a href="/klar-privacy" target="_blank" rel="noreferrer" className="text-primary underline">
                  Політики конфіденційності
                </a>
                .
              </span>
            </label>

            {errors.form && <p className="text-sm text-red-400">{errors.form}</p>}

            <button
              type="submit"
              disabled={!consent || sending}
              className="w-full rounded-xl bg-primary px-6 py-3.5 font-semibold text-primary-foreground transition-all hover:shadow-[0_0_28px_hsl(var(--primary)/0.45)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              {sending ? "Надсилаю…" : "Надіслати заявку"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

const inputCls =
  "w-full rounded-xl border border-primary/20 bg-background/60 px-4 py-3 text-foreground placeholder:text-foreground/35 outline-none transition-colors focus:border-primary/60";

const Field = ({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) => (
  <div>
    <span className="mb-1.5 block text-xs uppercase tracking-wider text-foreground/50">{label}</span>
    {children}
    {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
  </div>
);

export default LeadModal;
