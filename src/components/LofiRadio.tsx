import { useState, useRef, useEffect } from "react";
import { Radio, Volume2, VolumeX, Music } from "lucide-react";

const LOFI_STREAM_URL = "http://ec3.yesstreaming.net:3755/stream";

const LofiRadio = () => {
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audio.src = LOFI_STREAM_URL;
    audio.preload = "none";
    audioRef.current = audio;

    audio.onplay = () => setPlaying(true);
    audio.onpause = () => setPlaying(false);

    return () => {
      audio.pause();
      audio.onplay = null;
      audio.onpause = null;
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = volume;
    }
  }, [volume]);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
  };

  return (
    <div className="glass-card p-5 animate-slide-up">
      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-xl transition-colors ${playing ? "bg-primary/15" : "bg-muted/50"}`}>
          <Music className={`w-5 h-5 ${playing ? "text-primary" : "text-muted-foreground"}`} />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground">Lofi Radio</h3>
          <p className="text-[11px] text-muted-foreground">24/7 chill beats for studying</p>
        </div>
        <button
          onClick={toggle}
          className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-display font-semibold transition-all ${
            playing
              ? "bg-primary/15 text-primary border border-primary/30 shadow-[0_0_12px_hsl(var(--primary)/0.15)]"
              : "bg-muted/50 text-muted-foreground border border-border hover:text-foreground hover:border-primary/30 hover:bg-primary/5"
          }`}
        >
          <Radio className={`w-4 h-4 ${playing ? "animate-pulse" : ""}`} />
          {playing ? "ON" : "OFF"}
          {playing && (
            <span className="flex gap-[2px] ml-0.5">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="w-[2px] bg-primary rounded-full animate-bounce"
                  style={{
                    height: "10px",
                    animationDelay: `${i * 0.15}s`,
                    animationDuration: "0.6s",
                  }}
                />
              ))}
            </span>
          )}
        </button>
      </div>

      {/* Volume slider */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setVolume(0)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <VolumeX className="w-4 h-4" />
        </button>
        <div className="flex-1 relative h-8 flex items-center">
          <div className="w-full h-1.5 rounded-full bg-muted/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all"
              style={{ width: `${volume * 100}%` }}
            />
          </div>
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="absolute inset-0 w-full opacity-0 cursor-pointer"
          />
        </div>
        <button
          onClick={() => setVolume(1)}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <Volume2 className="w-4 h-4" />
        </button>
        <span className="text-[11px] text-muted-foreground font-display w-8 text-right">
          {Math.round(volume * 100)}%
        </span>
      </div>
    </div>
  );
};

export default LofiRadio;
