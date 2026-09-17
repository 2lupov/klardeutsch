import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Точка вказівки у частках області (0..1), щоб працювало на будь-якому екрані. */
export type LaserPoint = { fx: number; fy: number } | null;

const CH = (classId: string) => `live-laser:${classId}`;

/** Вчитель: надсилає позицію вказівки учню. */
export function useLaserSender(classId: string) {
  const chan = useRef<any>(null);
  const last = useRef(0);

  useEffect(() => {
    const ch = supabase.channel(CH(classId), { config: { broadcast: { self: false } } }).subscribe();
    chan.current = ch;
    return () => { supabase.removeChannel(ch); chan.current = null; };
  }, [classId]);

  const send = (p: LaserPoint) => {
    const now = Date.now();
    if (p && now - last.current < 40) return;
    last.current = now;
    chan.current?.send({ type: "broadcast", event: "laser", payload: { point: p } });
  };

  return send;
}

/** Учень: слухає вказівку вчителя; точка сама зникає, коли вчитель перестав водити. */
export function useLaserReceiver(classId?: string): LaserPoint {
  const [point, setPoint] = useState<LaserPoint>(null);
  const timer = useRef<any>(null);

  useEffect(() => {
    if (!classId) return;
    const ch = supabase
      .channel(CH(classId))
      .on("broadcast", { event: "laser" }, ({ payload }: any) => {
        const p = payload?.point ?? null;
        setPoint(p);
        if (timer.current) clearTimeout(timer.current);
        if (p) timer.current = setTimeout(() => setPoint(null), 2500);
      })
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [classId]);

  return point;
}

/** Яскрава червона цяточка — тільки показує, нічого не малює. */
export function LaserDot({ point }: { point: LaserPoint }) {
  if (!point) return null;
  return (
    <span
      className="pointer-events-none absolute z-40 rounded-full"
      style={{
        left: `${point.fx * 100}%`,
        top: `${point.fy * 100}%`,
        width: 14,
        height: 14,
        marginLeft: -7,
        marginTop: -7,
        background: "#ef4444",
        boxShadow: "0 0 10px 5px rgba(239,68,68,0.55), 0 0 26px 12px rgba(239,68,68,0.25)",
      }}
    />
  );
}

/**
 * Обгортка навколо матеріалу. Коли вказівка увімкнена, поверх лягає прозорий шар:
 * він перехоплює рух мишки, тому дошка не малює — учень бачить лише червону цятку.
 */
export function LaserSurface({
  active,
  onMove,
  point,
  className,
  children,
}: {
  active?: boolean;
  onMove?: (p: LaserPoint) => void;
  point?: LaserPoint;
  className?: string;
  children: React.ReactNode;
}) {
  const [own, setOwn] = useState<LaserPoint>(null);
  const shown = point ?? own;

  const handle = (e: React.PointerEvent) => {
    const r = e.currentTarget.getBoundingClientRect();
    const p = { fx: (e.clientX - r.left) / r.width, fy: (e.clientY - r.top) / r.height };
    setOwn(p);
    onMove?.(p);
  };

  const clear = () => { setOwn(null); onMove?.(null); };

  return (
    <div className={`relative ${className || ""}`}>
      {children}
      {active && (
        <div
          className="absolute inset-0 z-30"
          style={{ cursor: "none" }}
          onPointerMove={handle}
          onPointerDown={handle}
          onPointerLeave={clear}
        />
      )}
      <LaserDot point={shown} />
    </div>
  );
}
