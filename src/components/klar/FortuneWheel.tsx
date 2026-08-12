import { useState } from "react";

type Prize = { label: string; discount: string; weight: number; color: string };

const PRIZES: Prize[] = [
  { label: "-5%", discount: "-5% на перший пакет занять", weight: 34, color: "hsl(var(--klar-aqua) / 0.25)" },
  { label: "-10%", discount: "-10% на перший пакет занять", weight: 26, color: "hsl(var(--klar-sand) / 0.28)" },
  { label: "Бонус-урок", discount: "Додатковий бонус-урок", weight: 18, color: "hsl(var(--klar-aqua) / 0.4)" },
  { label: "-15%", discount: "-15% на перший пакет занять", weight: 14, color: "hsl(var(--klar-sand) / 0.45)" },
  { label: "Розбір цілі", discount: "Безкоштовний розбір мовної цілі", weight: 6, color: "hsl(var(--klar-aqua) / 0.55)" },
  { label: "-20%", discount: "-20% на перший пакет занять", weight: 2, color: "hsl(var(--klar-sand) / 0.6)" },
];

const pick = () => {
  const total = PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = Math.random() * total;
  for (let i = 0; i < PRIZES.length; i++) {
    r -= PRIZES[i].weight;
    if (r <= 0) return i;
  }
  return 0;
};

const SEG = 360 / PRIZES.length;

/** Discount wheel with weighted chances. Calls onWin with the prize text. */
const FortuneWheel = ({ onWin }: { onWin: (discount: string) => void }) => {
  const [angle, setAngle] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<Prize | null>(null);

  const spin = () => {
    if (spinning || result) return;
    const idx = pick();
    const target = 360 * 5 + (360 - (idx * SEG + SEG / 2));
    setSpinning(true);
    setAngle((a) => a + target);
    window.setTimeout(() => {
      setSpinning(false);
      setResult(PRIZES[idx]);
      onWin(PRIZES[idx].discount);
    }, 4200);
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative">
        <div className="absolute left-1/2 top-0 z-10 -translate-x-1/2 -translate-y-1">
          <div className="h-0 w-0 border-x-[9px] border-t-[14px] border-x-transparent border-t-[hsl(var(--klar-sand))]" />
        </div>
        <div
          className="relative h-[260px] w-[260px] rounded-full border border-klar-aqua/30 sm:h-[320px] sm:w-[320px]"
          style={{
            transform: `rotate(${angle}deg)`,
            transition: "transform 4s cubic-bezier(0.16, 1, 0.3, 1)",
            background: `conic-gradient(${PRIZES.map(
              (p, i) => `${p.color} ${i * SEG}deg ${(i + 1) * SEG}deg`,
            ).join(", ")})`,
          }}
        >
          {PRIZES.map((p, i) => (
            <span
              key={p.label}
              className="absolute left-1/2 top-1/2 origin-left text-[11px] font-medium tracking-wide text-klar-pearl sm:text-xs"
              style={{ transform: `rotate(${i * SEG + SEG / 2}deg) translateX(58px)` }}
            >
              {p.label}
            </span>
          ))}
          <div className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 rounded-full border border-klar-aqua/40 bg-klar-bg" />
        </div>
      </div>

      {result ? (
        <div className="text-center">
          <p className="font-klar-display text-2xl text-klar-sand">{result.discount}</p>
          <p className="mt-1 text-sm text-klar-pearl/60">Знижку вже додано до вашої заявки</p>
        </div>
      ) : (
        <button
          onClick={spin}
          disabled={spinning}
          className="rounded-xl bg-klar-aqua px-8 py-3.5 font-semibold text-klar-bg transition-all hover:shadow-[0_0_28px_hsl(var(--klar-aqua)/0.45)] disabled:opacity-50"
        >
          {spinning ? "Крутиться…" : "Крутити колесо"}
        </button>
      )}
    </div>
  );
};

export default FortuneWheel;
