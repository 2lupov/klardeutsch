import { createContext, useContext, useState, useRef, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ListeningAudioContextType {
  currentTitle: string | null;
  playing: boolean;
  loading: boolean;
  playbackSpeed: number;
  setPlaybackSpeed: (speed: number) => void;
  play: (text: string, title: string, voiceConfig?: Record<string, string> | null, audioUrl?: string | null) => Promise<void>;
  toggle: () => void;
  stop: () => void;
}

const ListeningAudioContext = createContext<ListeningAudioContextType>({
  currentTitle: null,
  playing: false,
  loading: false,
  playbackSpeed: 0.85,
  setPlaybackSpeed: () => {},
  play: async () => {},
  toggle: () => {},
  stop: () => {},
});

export const useListeningAudio = () => useContext(ListeningAudioContext);

export const ListeningAudioProvider = ({ children }: { children: ReactNode }) => {
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentTitle, setCurrentTitle] = useState<string | null>(null);
  const [playbackSpeed, setPlaybackSpeedState] = useState(0.85);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentTextRef = useRef<string | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  const setPlaybackSpeed = useCallback((speed: number) => {
    setPlaybackSpeedState(speed);
    if (audioRef.current) {
      audioRef.current.playbackRate = speed;
    }
  }, []);

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

  const play = useCallback(async (text: string, title: string, voiceConfig?: Record<string, string> | null, audioUrl?: string | null) => {
    if (currentTextRef.current === text && audioRef.current) {
      toggle();
      return;
    }

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
      let url: string;

      if (audioUrl) {
        url = audioUrl;
      } else {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

        const isDialogue = /^[A-Z]:\s/m.test(text);
        const functionName = isDialogue ? "dialogue-tts" : "elevenlabs-tts";

        const bodyPayload: Record<string, any> = { text, speed: playbackSpeed };
        if (isDialogue && voiceConfig && Object.keys(voiceConfig).length > 0) {
          bodyPayload.voice_config = voiceConfig;
        } else if (!isDialogue && voiceConfig?.narrator) {
          bodyPayload.voiceId = voiceConfig.narrator;
        }

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(bodyPayload),
          }
        );

        if (!response.ok) throw new Error("TTS failed");

        const blob = await response.blob();
        url = URL.createObjectURL(blob);
      }

      const audio = new Audio(url);
      audio.playbackRate = playbackSpeed;
      audioRef.current = audio;

      audio.onplay = () => setPlaying(true);
      audio.onpause = () => setPlaying(false);
      audio.onended = () => {
        setPlaying(false);
      };

      await audio.play();
    } catch (e) {
      console.error("ListeningAudio TTS error:", e);
      setCurrentTitle(null);
      currentTextRef.current = null;
    } finally {
      setLoading(false);
    }
  }, [toggle, playbackSpeed]);

  return (
    <ListeningAudioContext.Provider value={{ currentTitle, playing, loading, playbackSpeed, setPlaybackSpeed, play, toggle, stop }}>
      {children}
    </ListeningAudioContext.Provider>
  );
};
