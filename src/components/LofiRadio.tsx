import { useState, useRef, useEffect } from "react";
import { Music } from "lucide-react";

const LOFI_STREAM_URL = "http://ec3.yesstreaming.net:3755/stream";

const LofiRadio = () => {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.volume = 0.3;
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

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else audio.play().catch(console.error);
  };

  return (
    <button
      onClick={toggle}
      className={`p-2 rounded-full transition-all ${
        playing
          ? "bg-primary/15 text-primary shadow-[0_0_10px_hsl(var(--primary)/0.2)]"
          : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
      title="Lofi Radio"
    >
      <Music className="w-4 h-4" />
      {playing && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
      )}
    </button>
  );
};

export default LofiRadio;
