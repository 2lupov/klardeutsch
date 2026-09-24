import { useState } from "react";
import type { BlockPayload } from "./types";

export default function ImageHotspots({ url, p, alt }: { url: string; p: BlockPayload; alt: string }) {
  const spots = p.hotspots ?? [];
  const [active, setActive] = useState<number | null>(null);
  const [seen, setSeen] = useState<number[]>([]);
  const open = (i: number) => { setActive(i); setSeen((s) => (s.includes(i) ? s : [...s, i])); };
  return (
    <figure className="space-y-3">
      {url ? (
        <div className="relative overflow-hidden rounded-2xl border border-border bg-muted/20 shadow-sm">
          <img src={url} alt={alt} className="block w-full" />
          {spots.map((s, i) => (
            <button key={i} type="button" aria-label={s.label} onClick={() => open(i)} style={{ left: `${s.x}%`, top: `${s.y}%` }}
              className={`absolute flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-background text-xs font-bold shadow-lg transition-transform hover:scale-125 ${active === i ? "scale-125 bg-primary text-primary-foreground" : seen.includes(i) ? "bg-foreground/80 text-background" : "animate-pulse bg-primary text-primary-foreground"}`}>
              {i + 1}
            </button>
          ))}
        </div>
      ) : <div className="flex aspect-video items-center justify-center border border-dashed border-border bg-muted/30 text-sm text-muted-foreground">Ілюстрацію не додано або немає доступу</div>}
      {spots.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Натискайте на точки · відкрито {seen.length}/{spots.length}</p>
          {active !== null && spots[active] && (
            <div className="rounded-xl border-l-4 border-primary bg-primary/10 p-4">
              <p className="font-display text-lg font-semibold">{active + 1}. {spots[active].label}</p>
              {spots[active].text && <p className="mt-1 text-sm leading-6 text-muted-foreground">{spots[active].text}</p>}
            </div>
          )}
          <div className="flex flex-wrap gap-2">{spots.map((s, i) => <button key={i} type="button" onClick={() => open(i)} className={`rounded-full border px-3 py-1 text-xs ${active === i ? "border-primary bg-primary/15" : "border-border"}`}>{i + 1}. {seen.includes(i) ? s.label : "?"}</button>)}</div>
        </div>
      )}
      {(p.caption || p.context) && <figcaption className="text-sm leading-6 text-muted-foreground">{p.caption}{p.context && <span className="block">{p.context}</span>}</figcaption>}
    </figure>
  );
}
