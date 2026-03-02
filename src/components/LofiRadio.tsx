import { useState, useRef, useEffect, useCallback } from "react";
import { Radio, Volume2, VolumeX, Loader2 } from "lucide-react";

// Cache the generated audio blob URL across component remounts
let cachedAudioUrl: string | null = null;

const LofiRadio = () => {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [volume, setVolume] = useState(0.3);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.volume = volume;
    audio.loop = true;
    audioRef.current = audio;

    // If we already have cached audio, set it
    if (cachedAudioUrl) {
      audio.src = cachedAudioUrl;
    }

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

  const generateAndPlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    // If already have audio, just play/pause
    if (cachedAudioUrl) {
      if (playing) {
        audio.pause();
      } else {
        audio.src = cachedAudioUrl;
        await audio.play();
      }
      return;
    }

    // Generate new lofi track
    setLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/lofi-music`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) throw new Error("Failed to generate lofi music");

      const blob = await response.blob();
      cachedAudioUrl = URL.createObjectURL(blob);
      audio.src = cachedAudioUrl;
      await audio.play();
    } catch (e) {
      console.error("Lofi generation error:", e);
    } finally {
      setLoading(false);
    }
  }, [playing]);

  const toggle = () => {
    if (loading) return;

    if (playing) {
      audioRef.current?.pause();
    } else {
      generateAndPlay();
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        disabled={loading}
        className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-display font-medium transition-all ${
          playing
            ? "bg-primary/15 text-primary border border-primary/30"
            : loading
            ? "bg-secondary/80 text-muted-foreground border border-border cursor-wait"
            : "bg-secondary/80 text-muted-foreground border border-border hover:text-foreground hover:border-primary/20"
        }`}
        title={loading ? "Generating lofi..." : playing ? "Pause" : "Play Lofi"}
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Radio className={`w-3.5 h-3.5 ${playing ? "animate-pulse" : ""}`} />
        )}
        <span className="hidden sm:inline">{loading ? "loading..." : "lofi"}</span>
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

      {(playing || loading) && !loading && (
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
