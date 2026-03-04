import { createContext, useContext, useState, useRef, useEffect, ReactNode } from "react";

interface LofiContextType {
  playing: boolean;
  toggle: () => void;
}

const LofiContext = createContext<LofiContextType>({ playing: false, toggle: () => {} });

export const useLofi = () => useContext(LofiContext);

// High-quality HTTPS lofi streams (fallback chain)
const LOFI_STREAMS = [
  "https://streams.fluxfm.de/Chillhop/mp3-320/audio/",
  "https://stream.laut.fm/lofi",
  "https://stream.laut.fm/chillout-lounge",
];

export const LofiProvider = ({ children }: { children: ReactNode }) => {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const streamIdxRef = useRef(0);

  useEffect(() => {
    const audio = new Audio();
    audio.volume = 0.3;
    audio.preload = "none";
    audioRef.current = audio;
    audio.onplay = () => setPlaying(true);
    audio.onpause = () => setPlaying(false);
    audio.onerror = () => {
      // Try next stream on error
      streamIdxRef.current = (streamIdxRef.current + 1) % LOFI_STREAMS.length;
      audio.src = LOFI_STREAMS[streamIdxRef.current];
      if (playing) audio.play().catch(console.error);
    };
    return () => {
      audio.pause();
      audio.onplay = null;
      audio.onpause = null;
      audio.onerror = null;
      audioRef.current = null;
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.src = LOFI_STREAMS[streamIdxRef.current];
      audio.play().catch(console.error);
    }
  };

  return (
    <LofiContext.Provider value={{ playing, toggle }}>
      {children}
    </LofiContext.Provider>
  );
};
