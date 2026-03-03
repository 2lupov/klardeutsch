import { createContext, useContext, useState, useRef, useEffect, ReactNode } from "react";

interface LofiContextType {
  playing: boolean;
  toggle: () => void;
}

const LofiContext = createContext<LofiContextType>({ playing: false, toggle: () => {} });

export const useLofi = () => useContext(LofiContext);

const LOFI_STREAM_URL = "http://ec3.yesstreaming.net:3755/stream";

export const LofiProvider = ({ children }: { children: ReactNode }) => {
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
    <LofiContext.Provider value={{ playing, toggle }}>
      {children}
    </LofiContext.Provider>
  );
};
