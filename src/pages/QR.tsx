import { useSearchParams, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import KlarLogo from "@/components/KlarLogo";

const QR = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const ref = searchParams.get("ref");

  const handleStart = () => {
    // Redirect to auth page, passing ref code if present
    navigate(ref ? `/auth?ref=${ref}` : "/auth");
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center px-6 relative overflow-hidden">
      {/* Ambient glow */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse, hsl(var(--primary) / 0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-xs animate-slide-up">
        {/* Logo */}
        <KlarLogo progress={100} />

        {/* Subtitle */}
        <div className="text-center">
          <p className="text-base text-muted-foreground font-display">
            Учи немецкий легко и эффективно
          </p>
          {ref && (
            <p className="text-xs text-primary mt-2 font-medium">
              🎁 Тебя пригласил друг — бонус ждёт!
            </p>
          )}
        </div>

        {/* CTA Button */}
        <button
          onClick={handleStart}
          className="w-full py-4 rounded-2xl bg-primary text-primary-foreground font-display font-bold text-lg shadow-lg hover:bg-primary/90 active:scale-[0.98] transition-all"
          style={{
            boxShadow: "0 8px 32px hsl(var(--primary) / 0.3)",
          }}
        >
          Начать учиться
        </button>

        {/* Footer */}
        <p className="text-[11px] text-muted-foreground/50 text-center">
          Бесплатно · Без рекламы · Для русскоговорящих
        </p>
      </div>
    </div>
  );
};

export default QR;
