import { useState, useRef, useEffect } from "react";
import { Radio, Volume2, VolumeX } from "lucide-react";

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
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display font-medium transition-all ${
          playing
            ? "bg-primary/15 text-primary border border-primary/30"
            : "bg-secondary/80 text-muted-foreground border border-border hover:text-foreground hover:border-primary/20"
        }`}
        title={playing ? "Pause" : "Play Lofi"}
      >
        <Radio className={`w-3.5 h-3.5 ${playing ? "animate-pulse" : ""}`} />
        <span className="hidden sm:inline">lofi</span>
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

      {playing && (
        <div className="flex items-center gap-1.5">
          <VolumeX className="w-3 h-3 text-muted-foreground" />
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => setVolume(parseFloat(e.target.value))}
            className="w-16 h-1 accent-primary cursor-pointer"
          />
          <Volume2 className="w-3 h-3 text-muted-foreground" />
        </div>
      )}
    </div>
  );
};

export default LofiRadio;
