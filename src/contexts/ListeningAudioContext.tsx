import { createContext, useContext, useState, useRef, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ListeningAudioContextType {
  /** Currently playing text (null = idle) */
  currentTitle: string | null;
  playing: boolean;
  loading: boolean;
  /** Play a listening text. If same text is already loaded, toggle play/pause. */
  play: (text: string, title: string) => Promise<void>;
  toggle: () => void;
  stop: () => void;
}

const ListeningAudioContext = createContext<ListeningAudioContextType>({
  currentTitle: null,
  playing: false,
  loading: false,
  play: async () => {},
  toggle: () => {},
  stop: () => {},
});

export const useListeningAudio = () => useContext(ListeningAudioContext);

export const ListeningAudioProvider = ({ children }: { children: ReactNode }) => {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTitle, setCurrentTitle] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTextRef = useRef<string | null>(null);

  const stop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onplay = null;
      audioRef.current.onended = null;
      audioRef.current.onpause = null;
      audioRef.current = null;
    }
    setPlaying(false);
    setLoading(false);
    setCurrentTitle(null);
    currentTextRef.current = null;
  }, []);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(console.error);
    }
  }, [playing]);

  const play = useCallback(async (text: string, title: string) => {
    // If same text already loaded, just toggle
    if (currentTextRef.current === text && audioRef.current) {
      toggle();
      return;
    }

    // Stop any existing audio
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.onplay = null;
      audioRef.current.onended = null;
      audioRef.current.onpause = null;
      audioRef.current = null;
    }

    setLoading(true);
    setCurrentTitle(title);
    currentTextRef.current = text;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      // Detect dialogue
      const isDialogue = /^[A-Z]:\s/m.test(text);
      const functionName = isDialogue ? "dialogue-tts" : "elevenlabs-tts";

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ text, speed: 0.85 }),
        }
      );

      if (!response.ok) throw new Error("TTS failed");

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audioRef.current = audio;

      audio.onplay = () => setPlaying(true);
      audio.onpause = () => setPlaying(false);
      audio.onended = () => {
        setPlaying(false);
        // Don't clear title — allow replay
      };

      await audio.play();
    } catch (e) {
      console.error("ListeningAudio TTS error:", e);
      setCurrentTitle(null);
      currentTextRef.current = null;
    } finally {
      setLoading(false);
    }
  }, [toggle]);

  return (
    <ListeningAudioContext.Provider value={{ currentTitle, playing, loading, play, toggle, stop }}>
      {children}
    </ListeningAudioContext.Provider>
  );
};
