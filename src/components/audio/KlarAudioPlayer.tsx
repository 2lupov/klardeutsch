import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Pause, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";

interface KlarAudioPlayerProps {
  src: string;
  label?: string;
  compact?: boolean;
  className?: string;
}

const SPEEDS = [0.75, 1, 1.25, 1.5];

const fmt = (s: number) => {
  if (!isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

/** Красивий програвач у стилі KLAR — хвиля, швидкість, перемотка */
const KlarAudioPlayer = ({ src, label, compact, className = "" }: KlarAudioPlayerProps) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [muted, setMuted] = useState(false);

  // Стабільна псевдо-хвиля для конкретного src
  const bars = useMemo(() => {
    let seed = 0;
    for (let i = 0; i < src.length; i++) seed = (seed * 31 + src.charCodeAt(i)) % 100000;
    const rnd = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    return Array.from({ length: compact ? 32 : 56 }, (_, i) => {
      const wave = Math.sin(i / 3) * 0.25 + 0.55;
      return Math.max(0.18, Math.min(1, wave + (rnd() - 0.5) * 0.55));
    });
  }, [src, compact]);

  useEffect(() => {
    setPlaying(false);
    setCurrent(0);
    setDuration(0);
  }, [src]);

  useEffect(() => {
    const a = audioRef.current;
    if (a) a.playbackRate = speed;
  }, [speed]);

  const progress = duration > 0 ? current / duration : 0;

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play().catch(() => {});
    } else {
      a.pause();
    }
  };

  const seekTo = (ratio: number) => {
    const a = audioRef.current;
    if (!a || !isFinite(a.duration)) return;
    a.currentTime = Math.max(0, Math.min(1, ratio)) * a.duration;
    setCurrent(a.currentTime);
  };

  const nudge = (delta: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(a.duration || 0, a.currentTime + delta));
  };

  return (
    <div
      className={`relative overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-[0_10px_30px_-18px_hsl(var(--primary)/0.6)] ${className}`}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration || 0)}
        onTimeUpdate={(e) => setCurrent(e.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />

      {label && (
        <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={playing ? "Пауза" : "Відтворити"}
          className="relative shrink-0 w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/30 transition-transform active:scale-95"
        >
          {playing && (
            <span className="absolute inset-0 rounded-2xl bg-primary/40 animate-ping" aria-hidden />
          )}
          {playing ? <Pause className="w-5 h-5 relative" /> : <Play className="w-5 h-5 relative ml-0.5" />}
        </button>

        {/* Waveform */}
        <button
          type="button"
          aria-label="Перемотати"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            seekTo((e.clientX - rect.left) / rect.width);
          }}
          className="flex-1 h-12 flex items-center gap-[2px] cursor-pointer"
        >
          {bars.map((h, i) => {
            const active = i / bars.length <= progress;
            return (
              <span
                key={i}
                className={`flex-1 rounded-full transition-all duration-200 ${
                  active ? "bg-primary" : "bg-muted-foreground/25"
                }`}
                style={{
                  height: `${h * (playing && active ? 100 : 82)}%`,
                  minHeight: 4,
                }}
              />
            );
          })}
        </button>
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <span className="text-xs font-mono tabular-nums text-muted-foreground">
          {fmt(current)} <span className="opacity-50">/ {fmt(duration)}</span>
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => nudge(-5)}
            aria-label="-5 сек"
            className="w-8 h-8 rounded-xl border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => nudge(5)}
            aria-label="+5 сек"
            className="w-8 h-8 rounded-xl border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => {
              const next = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
              setSpeed(next);
            }}
            className="h-8 px-2.5 rounded-xl border border-border/70 text-[11px] font-bold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors tabular-nums"
          >
            {speed}×
          </button>
          <button
            type="button"
            onClick={() => {
              const a = audioRef.current;
              if (!a) return;
              a.muted = !a.muted;
              setMuted(a.muted);
            }}
            aria-label={muted ? "Увімкнути звук" : "Вимкнути звук"}
            className="w-8 h-8 rounded-xl border border-border/70 text-muted-foreground hover:text-foreground hover:bg-muted flex items-center justify-center transition-colors"
          >
            {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default KlarAudioPlayer;
