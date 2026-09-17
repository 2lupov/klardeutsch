import { useEffect, useRef, useState } from "react";
import { ChevronDown, Pause, Play, RotateCcw, RotateCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LessonBlock } from "./types";

const SPEEDS = [0.8, 1, 1.2];

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

export default function HoerBlock({ block }: { block: LessonBlock }) {
  const p = block.payload || {};
  const [url, setUrl] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [dur, setDur] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [showText, setShowText] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!p.audio_path) return setUrl(null);
      const { data } = await supabase.storage.from("tutoring-materials").createSignedUrl(p.audio_path, 3600);
      if (alive) setUrl(data?.signedUrl ?? null);
    })();
    return () => {
      alive = false;
    };
  }, [p.audio_path]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = speed;
  }, [speed, url]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const seek = (t: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = Math.max(0, Math.min(t, a.duration || t));
    setTime(a.currentTime);
  };

  return (
    <div className="space-y-4">
      {p.instructions && <p className="text-sm text-muted-foreground">{p.instructions}</p>}

      {url ? (
        <div className="rounded-2xl border bg-muted/40 p-4">
          <audio
            ref={audioRef}
            src={url}
            onTimeUpdate={(e) => setTime((e.target as HTMLAudioElement).currentTime)}
            onLoadedMetadata={(e) => setDur((e.target as HTMLAudioElement).duration || 0)}
            onEnded={() => setPlaying(false)}
            preload="metadata"
          />
          <div className="flex items-center gap-2">
            <Button size="icon" className="h-11 w-11 rounded-full" onClick={toggle}>
              {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={() => seek(time - 5)} aria-label="-5 c">
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button size="icon" variant="ghost" onClick={() => seek(time + 5)} aria-label="+5 c">
              <RotateCw className="h-4 w-4" />
            </Button>
            <div className="flex-1">
              <div
                className="h-2 cursor-pointer rounded-full bg-border"
                onClick={(e) => {
                  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  seek(((e.clientX - r.left) / r.width) * (dur || 0));
                }}
              >
                <div
                  className="h-2 rounded-full bg-primary transition-all"
                  style={{ width: `${dur ? (time / dur) * 100 : 0}%` }}
                />
              </div>
              <div className="mt-1 flex justify-between text-[11px] tabular-nums text-muted-foreground">
                <span>{fmt(time)}</span>
                <span>{fmt(dur)}</span>
              </div>
            </div>
            <div className="flex gap-1">
              {SPEEDS.map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={speed === s ? "default" : "outline"}
                  className="h-8 px-2 text-xs"
                  onClick={() => setSpeed(s)}
                >
                  {s}x
                </Button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
          Аудіо ще не додано. Викладач може озвучити транскрипт кнопкою «Озвучити блок».
        </div>
      )}

      {(p.transcript ?? []).length > 0 && (
        <div className="rounded-2xl border">
          <button
            className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
            onClick={() => setShowText((v) => !v)}
          >
            Транскрипт
            <ChevronDown className={cn("h-4 w-4 transition-transform", showText && "rotate-180")} />
          </button>
          {showText && (
            <div className="space-y-1 border-t p-3">
              {(p.transcript ?? []).map((line, i) => {
                const active = typeof line.t === "number" && time >= (line.t ?? 0) &&
                  (i === (p.transcript!.length - 1) || time < (p.transcript![i + 1]?.t ?? Infinity));
                return (
                  <button
                    key={i}
                    onClick={() => typeof line.t === "number" && seek(line.t)}
                    className={cn(
                      "block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors hover:bg-muted",
                      active && "bg-primary/10 font-medium",
                    )}
                  >
                    <span>{line.de}</span>
                    {line.uk && <span className="block text-xs text-muted-foreground">{line.uk}</span>}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
