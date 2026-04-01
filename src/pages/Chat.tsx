import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { fetchEdgeFunction } from "@/lib/auth-fetch";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Search, MessageCircle, Users, Mail, ArrowLeft, Mic, Square, Play, Pause, ImagePlus, X, Paperclip, FileText, Download, Gamepad2, Video, Circle, Reply, CornerUpRight, RefreshCw, MoreHorizontal } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import UserProfileDialog from "@/components/UserProfileDialog";
import MediaEmbed, { hasMediaEmbed } from "@/components/chat/MediaEmbed";
import StickerPicker, { isStickerMessage, getStickerSrc, STICKER_PREFIX } from "@/components/chat/StickerPicker";
import { Smile } from "lucide-react";

/* ───── Visual-viewport height for iOS keyboard handling ───── */
const useViewportHeight = () => {
  const [vh, setVh] = useState("100%");

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const update = () => {
      // On iOS PWA, when keyboard opens visualViewport shrinks.
      // We set the container to exactly that height so the input
      // bar stays just above the keyboard.
      setVh(`${vv.height}px`);
    };

    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);

    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return vh;
};

/* ───── Reply info type ───── */
interface ReplyInfo {
  id: string;
  content: string;
  senderName: string;
}

/* ───── Online status helper ───── */
const isUserOnline = (lastActive: string | null): boolean => {
  if (!lastActive) return false;
  return Date.now() - new Date(lastActive).getTime() < 5 * 60 * 1000;
};

/* ───── types ───── */
interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  last_active?: string | null;
}

interface CommunityMsg {
  id: string;
  user_id: string;
  content: string;
  audio_url?: string | null;
  image_url?: string | null;
  image_urls?: any;
  file_url?: string | null;
  file_name?: string | null;
  created_at: string;
  profile?: Profile;
}

interface DirectMsg {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  audio_url?: string | null;
  image_url?: string | null;
  image_urls?: any;
  file_url?: string | null;
  file_name?: string | null;
  is_read: boolean;
  created_at: string;
}

/* ───── Waveform generator (deterministic from url hash) ───── */
const generateWaveform = (seed: string, bars: number): number[] => {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  const wave: number[] = [];
  for (let i = 0; i < bars; i++) {
    hash = ((hash * 16807) % 2147483647);
    const base = 0.2 + (Math.abs(hash % 100) / 100) * 0.8;
    // create natural speech envelope
    const pos = i / bars;
    const envelope = Math.sin(pos * Math.PI) * 0.5 + 0.5;
    wave.push(base * (0.4 + envelope * 0.6));
  }
  return wave;
};

/* ───── Voice Player ───── */
const WAVEFORM_BARS = 32;

const VoicePlayer = ({ url }: { url: string }) => {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const waveform = useRef(generateWaveform(url, WAVEFORM_BARS)).current;

  useEffect(() => {
    const audio = new Audio(url);
    audioRef.current = audio;
    audio.addEventListener("loadedmetadata", () => setDuration(audio.duration));
    audio.addEventListener("timeupdate", () => setProgress(audio.currentTime / (audio.duration || 1)));
    audio.addEventListener("ended", () => { setPlaying(false); setProgress(0); });
    return () => { audio.pause(); audio.src = ""; };
  }, [url]);

  const toggle = () => {
    if (!audioRef.current) return;
    if (playing) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setPlaying(!playing);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const currentTime = duration > 0 ? progress * duration : 0;

  return (
    <button onClick={toggle} className="flex items-center gap-2.5 min-w-[160px]">
      <motion.div
        whileTap={{ scale: 0.85 }}
        className="w-8 h-8 rounded-full bg-background/20 flex items-center justify-center shrink-0"
      >
        <AnimatePresence mode="wait">
          {playing ? (
            <motion.div key="pause" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Pause className="w-3.5 h-3.5" />
            </motion.div>
          ) : (
            <motion.div key="play" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
              <Play className="w-3.5 h-3.5 ml-0.5" />
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      <div className="flex-1 flex flex-col gap-1">
        <div className="flex items-end gap-[2px] h-5">
          {waveform.map((h, i) => {
            const barProgress = i / WAVEFORM_BARS;
            const isActive = barProgress <= progress;
            return (
              <motion.div
                key={i}
                className="flex-1 rounded-full transition-colors duration-150"
                style={{
                  height: `${h * 100}%`,
                  minWidth: 2,
                  backgroundColor: isActive ? "currentColor" : "currentColor",
                  opacity: isActive ? 1 : 0.25,
                }}
                animate={playing && isActive ? {
                  scaleY: [1, 1.15, 1],
                } : { scaleY: 1 }}
                transition={playing && isActive ? {
                  duration: 0.4,
                  repeat: Infinity,
                  delay: i * 0.02,
                } : {}}
              />
            );
          })}
        </div>
        <span className="text-[9px] opacity-60 tabular-nums">
          {playing || progress > 0 ? formatTime(currentTime) : (duration > 0 ? formatTime(duration) : "…")}
        </span>
      </div>
    </button>
  );
};

/* ───── Voice Recorder Hook ───── */
const useVoiceRecorder = () => {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const start = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, { mimeType: "audio/webm" });
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.start(500);
      mediaRecorderRef.current = mr;
      setRecording(true);
      setElapsed(0);
      timerRef.current = setInterval(() => setElapsed((p) => p + 1), 1000);
    } catch { /* mic not available */ }
  }, []);

  const stop = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const mr = mediaRecorderRef.current;
      if (!mr || mr.state === "inactive") { resolve(null); return; }
      clearInterval(timerRef.current);
      mr.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        mr.stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        setElapsed(0);
        resolve(blob);
      };
      mr.stop();
    });
  }, []);

  const cancel = useCallback(() => {
    const mr = mediaRecorderRef.current;
    if (mr && mr.state !== "inactive") {
      clearInterval(timerRef.current);
      mr.stream.getTracks().forEach((t) => t.stop());
      mr.stop();
    }
    chunksRef.current = [];
    setRecording(false);
    setElapsed(0);
  }, []);

  return { recording, elapsed, start, stop, cancel };
};

/* ───── Upload voice helper ───── */
const uploadVoice = async (blob: Blob, userId: string): Promise<string | null> => {
  const filename = `${userId}/${Date.now()}.webm`;
  const { error } = await supabase.storage.from("voice-messages").upload(filename, blob, { contentType: "audio/webm" });
  if (error) return null;
  const { data } = supabase.storage.from("voice-messages").getPublicUrl(filename);
  return data.publicUrl;
};

/* ───── Upload image helper ───── */
const uploadChatImage = async (file: File, userId: string): Promise<string | null> => {
  const ext = file.name.split(".").pop() || "jpg";
  const filename = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
  const { error } = await supabase.storage.from("chat-images").upload(filename, file, { contentType: file.type });
  if (error) return null;
  const { data } = supabase.storage.from("chat-images").getPublicUrl(filename);
  return data.publicUrl;
};

/* ───── Upload multiple images ───── */
const uploadChatImages = async (files: File[], userId: string): Promise<string[]> => {
  const urls: string[] = [];
  for (const file of files) {
    const url = await uploadChatImage(file, userId);
    if (url) urls.push(url);
  }
  return urls;
};

/* ───── Upload file helper ───── */
const uploadChatFile = async (file: File, userId: string): Promise<{ url: string; name: string } | null> => {
  const filename = `${userId}/${Date.now()}-${file.name}`;
  const { error } = await supabase.storage.from("chat-files").upload(filename, file, { contentType: file.type });
  if (error) return null;
  const { data } = supabase.storage.from("chat-files").getPublicUrl(filename);
  return { url: data.publicUrl, name: file.name };
};

/* ───── Upload video circle helper ───── */
const uploadVideoCircle = async (blob: Blob, userId: string): Promise<string | null> => {
  const filename = `${userId}/${Date.now()}-circle.webm`;
  const { error } = await supabase.storage.from("voice-messages").upload(filename, blob, { contentType: "video/webm" });
  if (error) return null;
  const { data } = supabase.storage.from("voice-messages").getPublicUrl(filename);
  return data.publicUrl;
};

/* ───── Game list for invites ───── */
const gameList = [
  { id: "article-sorter", emoji: "🔀", name_ru: "Сортировка артиклей", name_uk: "Сортування артиклів" },
  { id: "cafe", emoji: "☕", name_ru: "Кафе Bestellung", name_uk: "Кафе Bestellung" },
  { id: "challenges", emoji: "⚔️", name_ru: "Дуэли", name_uk: "Дуелі" },
  { id: "pronunciation", emoji: "🎙️", name_ru: "Произношение", name_uk: "Вимова" },
  { id: "leben", emoji: "🏛️", name_ru: "Leben in Deutschland", name_uk: "Leben in Deutschland" },
  { id: "wortbaustelle", emoji: "🔨", name_ru: "Wortbaustelle", name_uk: "Wortbaustelle" },
  { id: "satzpuzzle", emoji: "🧩", name_ru: "Satzpuzzle", name_uk: "Satzpuzzle" },
  { id: "telefon", emoji: "📞", name_ru: "Telefon-Trainer", name_uk: "Telefon-Trainer" },
  { id: "dialogues", emoji: "💬", name_ru: "Диалоги", name_uk: "Діалоги" },
];

/* ───── Image Gallery ───── */
const ImageGallery = ({ urls, onOpen }: { urls: string[]; onOpen: (idx: number) => void }) => {
  const count = urls.length;
  if (count === 0) return null;
  if (count === 1) {
    return (
      <div className="cursor-pointer" onClick={() => onOpen(0)}>
        <img src={urls[0]} alt="shared" className="max-w-[260px] max-h-[300px] object-cover rounded-2xl" loading="lazy" />
      </div>
    );
  }
  const gridClass = count === 2 ? "grid-cols-2" : count === 3 ? "grid-cols-2" : "grid-cols-2";
  return (
    <div className={`grid ${gridClass} gap-1 max-w-[280px]`}>
      {urls.slice(0, 4).map((url, i) => (
        <div key={i} className="relative cursor-pointer aspect-square" onClick={() => onOpen(i)}>
          <img src={url} alt="" className="w-full h-full object-cover rounded-lg" loading="lazy" />
          {i === 3 && count > 4 && (
            <div className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">+{count - 4}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

/* ───── File Attachment Display ───── */
const FileAttachment = ({ url, name, isMe }: { url: string; name: string; isMe: boolean }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl transition-colors ${
      isMe ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" : "bg-muted/50 hover:bg-muted"
    }`}
  >
    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
      isMe ? "bg-primary-foreground/20" : "bg-primary/10"
    }`}>
      <FileText className={`w-4 h-4 ${isMe ? "text-primary-foreground" : "text-primary"}`} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-medium truncate">{name}</p>
      <p className="text-[10px] opacity-60">Файл</p>
    </div>
    <Download className="w-3.5 h-3.5 opacity-50 shrink-0" />
  </a>
);

/* ───── Game Invite Bubble ───── */
const GameInviteBubble = ({ content, isMe }: { content: string; isMe: boolean }) => {
  const { lang } = useLanguage();
  const navigate = useNavigate();
  // content format: "🎮:game_id"
  const gameId = content.replace("🎮:", "");
  const game = gameList.find(g => g.id === gameId);
  if (!game) return <span>{content}</span>;

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={() => navigate("/games", { state: { screen: gameId } })}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl w-full text-left transition-colors ${
        isMe ? "bg-primary-foreground/10 hover:bg-primary-foreground/20" : "bg-muted/50 hover:bg-muted"
      }`}
    >
      <span className="text-2xl">{game.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold">{lang === "uk" ? game.name_uk : game.name_ru}</p>
        <p className="text-[10px] opacity-60">{lang === "uk" ? "Натисни щоб грати!" : "Нажми чтобы играть!"}</p>
      </div>
      <Gamepad2 className="w-4 h-4 opacity-50 shrink-0" />
    </motion.button>
  );
};

/* ───── Video Circle Player ───── */
const VideoCirclePlayer = ({ url }: { url: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    // Force inline playback on iOS/Telegram WebView
    v.setAttribute("playsinline", "");
    v.setAttribute("webkit-playsinline", "");
    v.setAttribute("x-webkit-airplay", "deny");
    // Prevent fullscreen requests
    const prevent = (e: Event) => e.preventDefault();
    v.addEventListener("webkitbeginfullscreen", prevent);
    v.addEventListener("fullscreenchange", prevent);
    return () => {
      v.removeEventListener("webkitbeginfullscreen", prevent);
      v.removeEventListener("fullscreenchange", prevent);
    };
  }, []);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!videoRef.current) return;
    if (playing) videoRef.current.pause();
    else videoRef.current.play().catch(() => {});
    setPlaying(!playing);
  };

  return (
    <motion.div
      whileTap={{ scale: 0.95 }}
      onClick={toggle}
      className="relative w-40 h-40 rounded-full overflow-hidden cursor-pointer ring-2 ring-primary/30 shadow-lg"
    >
      <video
        ref={videoRef}
        src={url}
        className="w-full h-full object-cover"
        loop
        playsInline
        muted={false}
        preload="metadata"
        onEnded={() => setPlaying(false)}
        style={{ objectFit: "cover" }}
      />
      {!playing && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <Play className="w-8 h-8 text-white" />
        </div>
      )}
      {playing && (
        <motion.div
          className="absolute inset-0 rounded-full border-2 border-primary pointer-events-none"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
};

/* ───── Message Bubble ───── */
const MessageBubble = ({ isMe, content, audioUrl, imageUrl, imageUrls, fileUrl, fileName, time, senderName, avatarUrl, index, senderId, replyToContent, replyToSender, onReply, onAvatarClick, messageId }: {
  isMe: boolean; content: string; audioUrl?: string | null; imageUrl?: string | null;
  imageUrls?: string[] | null; fileUrl?: string | null; fileName?: string | null;
  time: string; senderName?: string; avatarUrl?: string | null; index: number;
  senderId?: string; replyToContent?: string | null; replyToSender?: string | null;
  onReply?: () => void; onAvatarClick?: (userId: string) => void; messageId?: string;
}) => {
  const [galleryOpen, setGalleryOpen] = useState<number | null>(null);
  const [swipeX, setSwipeX] = useState(0);
  const swipeTriggered = useRef(false);

  // Combine legacy single image_url with new image_urls array
  const allImages: string[] = [];
  if (imageUrls && Array.isArray(imageUrls) && imageUrls.length > 0) {
    allImages.push(...imageUrls);
  } else if (imageUrl) {
    allImages.push(imageUrl);
  }

  const hasMedia = allImages.length > 0 || fileUrl;

  const handleDrag = (_: any, info: { offset: { x: number } }) => {
    // Swipe right for own messages, left for others
    const dx = info.offset.x;
    const threshold = 60;
    if (isMe && dx < -threshold && !swipeTriggered.current) {
      swipeTriggered.current = true;
      onReply?.();
    } else if (!isMe && dx > threshold && !swipeTriggered.current) {
      swipeTriggered.current = true;
      onReply?.();
    }
  };

  return (
    <>
      <div className="relative overflow-hidden">
        {/* Reply icon hint behind message */}
        <AnimatePresence>
          {Math.abs(swipeX) > 20 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 0.6, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              className={`absolute top-1/2 -translate-y-1/2 ${isMe ? "left-3" : "right-3"}`}
            >
              <Reply className="w-4 h-4 text-primary" />
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div
          initial={{ opacity: 0, y: 12, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
          transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.3) }}
          drag="x"
          dragConstraints={{ left: isMe ? -80 : 0, right: isMe ? 0 : 80 }}
          dragElastic={0.3}
          onDrag={handleDrag}
          onDragEnd={() => { swipeTriggered.current = false; setSwipeX(0); }}
          onUpdate={(latest: any) => { if (latest.x !== undefined) setSwipeX(latest.x as number); }}
          className={`flex gap-2 group ${isMe ? "flex-row-reverse" : ""}`}
          style={{ touchAction: "pan-y" }}
        >
          {!isMe && (
            <button onClick={() => senderId && onAvatarClick?.(senderId)} className="shrink-0 mt-auto">
              <Avatar className="w-7 h-7 hover:ring-2 hover:ring-primary/40 transition-all">
                <AvatarImage src={avatarUrl || ""} className="object-cover" />
                <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
                  {(senderName || "?")[0]}
                </AvatarFallback>
              </Avatar>
            </button>
          )}
          <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
            {!isMe && senderName && (
              <button onClick={() => senderId && onAvatarClick?.(senderId)} className="text-[10px] mb-0.5 text-muted-foreground font-medium px-1 hover:text-primary transition-colors">
                {senderName}
              </button>
            )}

            {/* Reply preview */}
            {replyToContent && (
              <div className={`text-[10px] mb-1 px-2.5 py-1 rounded-lg border-l-2 border-primary/40 ${isMe ? "bg-primary/10 ml-auto" : "bg-muted/60"} max-w-full truncate`}>
                <span className="font-semibold text-primary/70">{replyToSender || "?"}</span>
                <span className="text-muted-foreground ml-1">{replyToContent.slice(0, 60)}</span>
              </div>
            )}

            <div className={`rounded-2xl overflow-hidden text-sm leading-relaxed backdrop-blur-sm ${
              isMe
                ? "bg-primary text-primary-foreground rounded-br-md shadow-lg shadow-primary/20"
                : "bg-card border border-border rounded-bl-md shadow-sm"
            } ${isStickerMessage(content) ? "p-1 bg-transparent border-0 shadow-none !bg-transparent" : content.startsWith("🎮:") ? "p-2" : content === "🎥" && audioUrl ? "p-1" : allImages.length > 0 && !audioUrl ? "p-1.5" : hasMediaEmbed(content) ? "p-1.5" : "px-3.5 py-2.5"}`}>
              {isStickerMessage(content) ? (
                <img src={getStickerSrc(content) || ""} alt="sticker" className="w-28 h-28 object-contain" loading="lazy" />
              ) : content.startsWith("🎮:") ? (
                <GameInviteBubble content={content} isMe={isMe} />
              ) : content === "🎥" && audioUrl ? (
                <VideoCirclePlayer url={audioUrl} />
              ) : allImages.length > 0 ? (
                <div>
                  <ImageGallery urls={allImages} onOpen={(idx) => setGalleryOpen(idx)} />
                  {content && content !== "📷" && content !== "📷📎" && (
                    <p className="px-2 py-1.5 text-sm">{content}</p>
                  )}
                </div>
              ) : audioUrl ? (
                <VoicePlayer url={audioUrl} />
              ) : fileUrl && fileName ? (
                <div>
                  <FileAttachment url={fileUrl} name={fileName} isMe={isMe} />
                  {content && content !== "📎" && (
                    <p className="px-1 pt-1.5 text-sm">{content}</p>
                  )}
                </div>
              ) : hasMediaEmbed(content) ? (
                <div>
                  <MediaEmbed url={content} isMe={isMe} />
                </div>
              ) : (
                content
              )}
            </div>
            <div className={`flex items-center gap-1.5 mt-0.5 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
              <p className="text-[9px] text-muted-foreground/50">{time}</p>
              {onReply && (
                <button onClick={onReply} className="opacity-60 md:opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground/60 hover:text-primary active:text-primary p-1">
                  <Reply className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Fullscreen gallery viewer */}
      <AnimatePresence>
        {galleryOpen !== null && allImages.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex flex-col items-center justify-center p-4"
          >
            <motion.img
              key={galleryOpen}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              src={allImages[galleryOpen]}
              alt="fullscreen"
              className="max-w-full max-h-[80vh] object-contain rounded-lg"
            />
            {allImages.length > 1 && (
              <div className="flex items-center gap-3 mt-4">
                {allImages.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setGalleryOpen(i)}
                    className={`w-2 h-2 rounded-full transition-all ${i === galleryOpen ? "bg-white scale-125" : "bg-white/40"}`}
                  />
                ))}
              </div>
            )}
            <button
              onClick={() => setGalleryOpen(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white"
            >
              <X className="w-5 h-5" />
            </button>
            {galleryOpen > 0 && (
              <button onClick={() => setGalleryOpen(galleryOpen - 1)} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
            {galleryOpen < allImages.length - 1 && (
              <button onClick={() => setGalleryOpen(galleryOpen + 1)} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white rotate-180">
                <ArrowLeft className="w-5 h-5" />
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/* ───── Chat Input Bar ───── */
const ChatInputBar = ({ onSendText, onSendVoice, onSendImages, onSendFile, onSendGameInvite, onSendVideoCircle, placeholder, userId, replyTo, onCancelReply, scrollToBottom }: {
  onSendText: (text: string) => void;
  onSendVoice: (audioUrl: string) => void;
  onSendImages: (imageUrls: string[]) => void;
  onSendFile: (fileUrl: string, fileName: string) => void;
  onSendGameInvite: (gameId: string) => void;
  onSendVideoCircle: (videoUrl: string) => void;
  placeholder: string;
  userId: string;
  replyTo?: ReplyInfo | null;
  onCancelReply?: () => void;
  scrollToBottom?: () => void;
}) => {
  const { lang } = useLanguage();
  const [text, setText] = useState("");
  const { recording, elapsed, start, stop, cancel } = useVoiceRecorder();
  const [uploading, setUploading] = useState(false);
  const [pendingImages, setPendingImages] = useState<{ file: File; preview: string }[]>([]);
   const [showGamePicker, setShowGamePicker] = useState(false);
   const [showStickerPicker, setShowStickerPicker] = useState(false);
   const [recordingVideo, setRecordingVideo] = useState(false);
   const [videoElapsed, setVideoElapsed] = useState(0);
   const [showAttachMenu, setShowAttachMenu] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoRecorderRef = useRef<MediaRecorder | null>(null);
  const videoChunksRef = useRef<Blob[]>([]);
  const videoTimerRef = useRef<ReturnType<typeof setInterval>>();
  const videoStreamRef = useRef<MediaStream | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Scroll chat to bottom when keyboard opens via visualViewport
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv || !scrollToBottom) return;
    const onResize = () => {
      // Keyboard opened — scroll to bottom immediately
      scrollToBottom();
    };
    vv.addEventListener("resize", onResize);
    return () => vv.removeEventListener("resize", onResize);
  }, [scrollToBottom]);

  const handleInputFocus = () => {
    // Instant scroll on focus
    setTimeout(() => scrollToBottom?.(), 100);
    setTimeout(() => scrollToBottom?.(), 300);
  };

  const handleSend = () => {
    if (pendingImages.length > 0) { handleSendImages(); return; }
    if (!text.trim()) return;
    onSendText(text.trim());
    setText("");
    onCancelReply?.();
  };

  const handleSendImages = async () => {
    if (pendingImages.length === 0) return;
    setUploading(true);
    const urls = await uploadChatImages(pendingImages.map(p => p.file), userId);
    setUploading(false);
    if (urls.length > 0) onSendImages(urls);
    pendingImages.forEach(p => URL.revokeObjectURL(p.preview));
    setPendingImages([]);
    setText("");
  };

  const handleStopRecording = async () => {
    const blob = await stop();
    if (!blob) return;
    setUploading(true);
    const url = await uploadVoice(blob, userId);
    setUploading(false);
    if (url) onSendVoice(url);
  };

  const handleImagePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const newPending = files.map(f => ({ file: f, preview: URL.createObjectURL(f) }));
    setPendingImages(prev => [...prev, ...newPending].slice(0, 10));
    e.target.value = "";
  };

  const handleFilePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const result = await uploadChatFile(file, userId);
    setUploading(false);
    if (result) onSendFile(result.url, result.name);
    e.target.value = "";
  };

  const removePendingImage = (idx: number) => {
    setPendingImages(prev => {
      const copy = [...prev];
      URL.revokeObjectURL(copy[idx].preview);
      copy.splice(idx, 1);
      return copy;
    });
  };

  // Video circle recording — front camera only, no mirror
   const startVideoCircle = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: 480, height: 480 }, audio: true });
      videoStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      videoChunksRef.current = [];
      const mr = new MediaRecorder(stream, { mimeType: "video/webm" });
      mr.ondataavailable = (e) => { if (e.data.size > 0) videoChunksRef.current.push(e.data); };
      mr.start(500);
      videoRecorderRef.current = mr;
      setRecordingVideo(true);
      setVideoElapsed(0);
      videoTimerRef.current = setInterval(() => setVideoElapsed(p => p + 1), 1000);
    } catch { /* camera not available */ }
  };

  // No camera flip — front only

  const stopVideoCircle = async () => {
    clearInterval(videoTimerRef.current);
    const mr = videoRecorderRef.current;
    if (!mr || mr.state === "inactive") return;
    return new Promise<void>((resolve) => {
      mr.onstop = async () => {
        const blob = new Blob(videoChunksRef.current, { type: "video/webm" });
        videoStreamRef.current?.getTracks().forEach(t => t.stop());
        if (videoRef.current) videoRef.current.srcObject = null;
        setRecordingVideo(false);
        setVideoElapsed(0);
        setUploading(true);
        const url = await uploadVideoCircle(blob, userId);
        setUploading(false);
        if (url) onSendVideoCircle(url);
        resolve();
      };
      mr.stop();
    });
  };

  const cancelVideoCircle = () => {
    clearInterval(videoTimerRef.current);
    const mr = videoRecorderRef.current;
    if (mr && mr.state !== "inactive") mr.stop();
    videoStreamRef.current?.getTracks().forEach(t => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    videoChunksRef.current = [];
    setRecordingVideo(false);
    setVideoElapsed(0);
  };

  return (
    <motion.div
      layout
      className="relative border-t border-border bg-card/80 backdrop-blur-xl"
    >
      {/* Reply preview */}
      <AnimatePresence>
        {replyTo && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 py-2 bg-muted/40 border-b border-border/50">
              <CornerUpRight className="w-3.5 h-3.5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold text-primary">{replyTo.senderName}</p>
                <p className="text-[11px] text-muted-foreground truncate">{replyTo.content.slice(0, 80)}</p>
              </div>
              <button onClick={onCancelReply} className="text-muted-foreground hover:text-foreground shrink-0">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game picker */}
      <AnimatePresence>
        {showGamePicker && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border"
          >
            <div className="p-3 space-y-1 max-h-[200px] overflow-y-auto">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-1 mb-2">
                {lang === "uk" ? "Запросити в гру" : "Пригласить в игру"}
              </p>
              {gameList.map(game => (
                <motion.button
                  key={game.id}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => { onSendGameInvite(game.id); setShowGamePicker(false); }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-muted/60 transition-colors text-left"
                >
                  <span className="text-lg">{game.emoji}</span>
                  <span className="text-sm font-medium">{lang === "uk" ? game.name_uk : game.name_ru}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sticker picker */}
      <StickerPicker
        open={showStickerPicker}
        onClose={() => setShowStickerPicker(false)}
        onSelect={(stickerId) => { onSendText(`${STICKER_PREFIX}${stickerId}]`); setShowStickerPicker(false); }}
      />


      <AnimatePresence>
        {recordingVideo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="absolute bottom-full left-0 right-0 flex flex-col items-center justify-center p-6 bg-background/95 backdrop-blur-xl border-t border-border"
          >
            <div className="relative w-36 h-36 rounded-full overflow-hidden ring-4 ring-destructive/50 shadow-2xl">
              <video ref={(el) => { videoRef.current = el; if (el && videoStreamRef.current && !el.srcObject) { el.srcObject = videoStreamRef.current; el.play(); } }} className="w-full h-full object-cover" playsInline muted />
              <motion.div
                className="absolute inset-0 rounded-full border-2 border-destructive"
                animate={{ scale: [1, 1.08, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
            </div>
            <div className="flex items-center gap-2 mt-3">
              <motion.div animate={{ scale: [1, 1.4, 1] }} transition={{ duration: 1, repeat: Infinity }} className="w-2 h-2 rounded-full bg-destructive" />
              <span className="text-sm font-mono text-muted-foreground">
                {Math.floor(videoElapsed / 60).toString().padStart(2, "0")}:{(videoElapsed % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-4">
              <button onClick={cancelVideoCircle} className="text-xs text-destructive font-medium hover:underline">
                {lang === "uk" ? "Скасувати" : "Отменить"}
              </button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={stopVideoCircle}
                className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30"
              >
                <Send className="w-5 h-5" />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pending images preview */}
      <AnimatePresence>
        {pendingImages.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex gap-2 p-3 pb-0 overflow-x-auto">
              {pendingImages.map((p, i) => (
                <div key={i} className="relative shrink-0">
                  <img src={p.preview} alt="" className="w-16 h-16 object-cover rounded-xl border border-border" />
                  <button
                    onClick={() => removePendingImage(i)}
                    className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center text-[10px]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div
        className="px-3 pt-2 pb-3"
        style={{
          paddingBottom: `max(0.75rem, env(safe-area-inset-bottom, 0.75rem))`,
        }}
      >
        <AnimatePresence mode="wait">
          {recording ? (
            <motion.div
              key="recording"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex items-center gap-3"
            >
              <button onClick={cancel} className="text-destructive text-xs font-medium hover:underline">✕</button>
              <div className="flex items-center gap-2 flex-1">
                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 1.2, repeat: Infinity }} className="w-2.5 h-2.5 rounded-full bg-destructive" />
                <span className="text-sm text-muted-foreground font-mono">
                  {Math.floor(elapsed / 60).toString().padStart(2, "0")}:{(elapsed % 60).toString().padStart(2, "0")}
                </span>
              </div>
              <motion.button whileTap={{ scale: 0.9 }} onClick={handleStopRecording}
                className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30">
                <Square className="w-4 h-4" />
              </motion.button>
            </motion.div>
          ) : (
            <motion.div key="input" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="flex items-center gap-2">
              {/* Attach menu trigger */}
              <div className="relative shrink-0">
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { setShowAttachMenu(!showAttachMenu); setShowGamePicker(false); setShowStickerPicker(false); }}
                  className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${showAttachMenu ? "bg-primary text-primary-foreground" : "bg-muted/60 text-muted-foreground hover:text-primary hover:bg-muted"}`}
                >
                  {showAttachMenu ? <X className="w-4 h-4" /> : <MoreHorizontal className="w-4 h-4" />}
                </motion.button>

                {/* Attach menu popover */}
                <AnimatePresence>
                  {showAttachMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.9 }}
                      transition={{ duration: 0.15 }}
                      className="absolute bottom-full left-0 mb-2 bg-card border border-border rounded-2xl shadow-xl overflow-hidden min-w-[180px] z-10"
                    >
                      <button onClick={() => { imageInputRef.current?.click(); setShowAttachMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left">
                        <ImagePlus className="w-4 h-4 text-primary" />
                        <span className="text-sm">{lang === "uk" ? "Фото" : "Фото"}</span>
                      </button>
                      <button onClick={() => { startVideoCircle(); setShowAttachMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left">
                        <Video className="w-4 h-4 text-primary" />
                        <span className="text-sm">{lang === "uk" ? "Відеокружок" : "Видеокружок"}</span>
                      </button>
                      <button onClick={() => { setShowGamePicker(true); setShowAttachMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left">
                        <Gamepad2 className="w-4 h-4 text-primary" />
                        <span className="text-sm">{lang === "uk" ? "Запросити в гру" : "Пригласить в игру"}</span>
                      </button>
                      <button onClick={() => { setShowStickerPicker(true); setShowAttachMenu(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/60 transition-colors text-left">
                        <Smile className="w-4 h-4 text-primary" />
                        <span className="text-sm">{lang === "uk" ? "Стікери" : "Стикеры"}</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <input ref={imageInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImagePick} />
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleFilePick} />

              <Input
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
                onFocus={handleInputFocus}
                placeholder={placeholder}
                className="flex-1 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-full h-10 px-4"
              />

              {text.trim() || pendingImages.length > 0 ? (
                <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.85 }} onClick={handleSend}
                  className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30 shrink-0">
                  <Send className="w-4 h-4" />
                </motion.button>
              ) : (
                <motion.button initial={{ scale: 0 }} animate={{ scale: 1 }} whileTap={{ scale: 0.85 }} onClick={start} disabled={uploading}
                  className="w-10 h-10 rounded-full bg-muted hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors shrink-0">
                  <Mic className="w-4 h-4" />
                </motion.button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {uploading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-card/80 backdrop-blur-sm flex items-center justify-center rounded-lg">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
        </motion.div>
      )}
    </motion.div>
  );
};

/* ───── Tab Button ───── */
const TabButton = ({ active, icon: Icon, label, badge, onClick }: {
  active: boolean; icon: React.ElementType; label: string; badge?: number; onClick: () => void;
}) => (
  <motion.button
    whileTap={{ scale: 0.95 }}
    onClick={onClick}
    className={`relative flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-medium transition-colors ${
      active ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" : "text-muted-foreground hover:bg-muted/50"
    }`}
  >
    <Icon className="w-3.5 h-3.5" />
    {label}
    {(badge ?? 0) > 0 && (
      <span className="absolute -top-1 -right-0.5 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full min-w-[16px] h-4 flex items-center justify-center px-1">
        {badge}
      </span>
    )}
  </motion.button>
);

/* ───── Community Chat ───── */
const CommunityChat = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [messages, setMessages] = useState<CommunityMsg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);
  const [replyTo, setReplyTo] = useState<ReplyInfo | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const profileUser = profileUserId ? profiles[profileUserId] : null;

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("community_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(200);
      if (data) {
        setMessages(data);
        const uids = [...new Set(data.map((m) => m.user_id))];
        if (uids.length) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url, last_active")
            .in("user_id", uids);
          if (profs) {
            const map: Record<string, Profile> = {};
            profs.forEach((p) => (map[p.user_id] = p as any));
            setProfiles(map);
          }
        }
      }
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("community-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages" }, async (payload) => {
        const msg = payload.new as CommunityMsg;
        setMessages((prev) => [...prev, msg]);
        if (!profiles[msg.user_id]) {
          const { data } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url, last_active")
            .eq("user_id", msg.user_id)
            .single();
          if (data) setProfiles((prev) => ({ ...prev, [data.user_id]: data as any }));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendText = async (content: string) => {
    if (!user) return;
    const insert: any = { user_id: user.id, content };
    if (replyTo) {
      insert.reply_to_id = replyTo.id;
      insert.reply_to_content = replyTo.content.slice(0, 100);
      insert.reply_to_sender = replyTo.senderName;
    }
    await supabase.from("community_messages").insert(insert);
    setReplyTo(null);
  };

  const sendVoice = async (audioUrl: string) => {
    if (!user) return;
    await supabase.from("community_messages").insert({ user_id: user.id, content: "🎤", audio_url: audioUrl });
  };

  const sendImages = async (imageUrls: string[]) => {
    if (!user) return;
    await supabase.from("community_messages").insert({ user_id: user.id, content: "📷", image_urls: imageUrls });
  };

  const sendFile = async (fileUrl: string, fileName: string) => {
    if (!user) return;
    await supabase.from("community_messages").insert({ user_id: user.id, content: "📎", file_url: fileUrl, file_name: fileName });
  };

  const sendGameInvite = async (gameId: string) => {
    if (!user) return;
    await supabase.from("community_messages").insert({ user_id: user.id, content: `🎮:${gameId}` });
  };

  const sendVideoCircle = async (videoUrl: string) => {
    if (!user) return;
    await supabase.from("community_messages").insert({ user_id: user.id, content: "🎥", audio_url: videoUrl });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const viewportH = useViewportHeight();

  return (
    <div className="flex flex-col" style={{ height: viewportH }}>
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
            <p className="text-4xl mb-3">💬</p>
            <p className="text-muted-foreground text-sm">
              {lang === "uk" ? "Поки немає повідомлень. Напишіть перше!" : "Пока нет сообщений. Напишите первое!"}
            </p>
          </motion.div>
        )}
        {messages.map((m, i) => {
          const isMe = m.user_id === user?.id;
          const prof = profiles[m.user_id];
          const msg = m as any;
          return (
            <MessageBubble
              key={m.id}
              messageId={m.id}
              isMe={isMe}
              content={m.content}
              audioUrl={m.audio_url}
              imageUrl={m.image_url}
              imageUrls={m.image_urls}
              fileUrl={m.file_url}
              fileName={m.file_name}
              time={format(new Date(m.created_at), "HH:mm")}
              senderName={prof?.display_name || undefined}
              avatarUrl={prof?.avatar_url}
              senderId={m.user_id}
              replyToContent={msg.reply_to_content}
              replyToSender={msg.reply_to_sender}
              onReply={() => setReplyTo({ id: m.id, content: m.content, senderName: prof?.display_name || "?" })}
              onAvatarClick={(uid) => setProfileUserId(uid)}
              index={i}
            />
          );
        })}
        <div ref={endRef} />
      </div>

      <ChatInputBar
        onSendText={sendText}
        onSendVoice={sendVoice}
        onSendImages={sendImages}
        onSendFile={sendFile}
        onSendGameInvite={sendGameInvite}
        onSendVideoCircle={sendVideoCircle}
        placeholder={lang === "uk" ? "Написати повідомлення…" : "Написать сообщение…"}
        userId={user?.id || ""}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        scrollToBottom={() => endRef.current?.scrollIntoView({ behavior: "smooth" })}
      />

      {/* Profile dialog */}
      <UserProfileDialog
        userId={profileUserId}
        displayName={profileUser?.display_name || null}
        avatarUrl={profileUser?.avatar_url || null}
        totalXp={0}
        open={!!profileUserId}
        onOpenChange={(open) => { if (!open) setProfileUserId(null); }}
      />
    </div>
  );
};

/* ───── Find Users ───── */
const FindUsers = ({ onSelectUser }: { onSelectUser: (uid: string) => void }) => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .ilike("display_name", `%${search.trim()}%`)
      .neq("user_id", user?.id || "")
      .limit(20);
    setUsers(data || []);
    setLoading(false);
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doSearch()}
          placeholder={lang === "uk" ? "Пошук за іменем…" : "Поиск по имени…"}
          className="flex-1 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-full px-4"
        />
        <motion.button whileTap={{ scale: 0.9 }} onClick={doSearch}
          className="w-10 h-10 rounded-full bg-muted hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors">
          <Search className="w-4 h-4" />
        </motion.button>
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      )}

      <div className="space-y-1">
        {users.map((u, i) => (
          <motion.button
            key={u.user_id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => onSelectUser(u.user_id)}
            className="w-full flex items-center gap-3 p-3 rounded-2xl hover:bg-muted/60 active:scale-[0.98] transition-all text-left"
          >
            <Avatar className="w-11 h-11 ring-2 ring-border">
              <AvatarImage src={u.avatar_url || ""} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {(u.display_name || "?")[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{u.display_name || "—"}</p>
            </div>
            <Mail className="w-4 h-4 text-muted-foreground/50" />
          </motion.button>
        ))}
        {!loading && users.length === 0 && search && (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center text-muted-foreground text-sm py-12">
            {lang === "uk" ? "Нікого не знайдено" : "Никого не найдено"}
          </motion.p>
        )}
      </div>
    </div>
  );
};

/* ───── DM Conversation ───── */
const DMConversation = ({ peerId, onBack }: { peerId: string; onBack: () => void }) => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [peer, setPeer] = useState<(Profile & { last_active?: string | null }) | null>(null);
  const [messages, setMessages] = useState<DirectMsg[]>([]);
  const endRef = useRef<HTMLDivElement>(null);
  const [replyTo, setReplyTo] = useState<ReplyInfo | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);

  const peerOnline = isUserOnline(peer?.last_active ?? null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, last_active")
        .eq("user_id", peerId)
        .single();
      if (prof) setPeer(prof as any);

      const { data: msgs } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true })
        .limit(200);
      if (msgs) setMessages(msgs);

      await supabase
        .from("direct_messages")
        .update({ is_read: true })
        .eq("sender_id", peerId)
        .eq("receiver_id", user.id)
        .eq("is_read", false);
    };
    load();

    const channel = supabase
      .channel(`dm-${peerId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (payload) => {
        const msg = payload.new as DirectMsg;
        if (
          (msg.sender_id === user.id && msg.receiver_id === peerId) ||
          (msg.sender_id === peerId && msg.receiver_id === user.id)
        ) {
          setMessages((prev) => [...prev, msg]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, peerId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendText = async (content: string) => {
    if (!user) return;
    const insert: any = { sender_id: user.id, receiver_id: peerId, content };
    if (replyTo) {
      insert.reply_to_id = replyTo.id;
      insert.reply_to_content = replyTo.content.slice(0, 100);
      insert.reply_to_sender = replyTo.senderName;
    }
    await supabase.from("direct_messages").insert(insert);
    setReplyTo(null);
    fetchEdgeFunction("notify-dm", { json: { receiver_id: peerId, message_preview: content } }).catch(() => {});
  };

  const sendVoice = async (audioUrl: string) => {
    if (!user) return;
    await supabase.from("direct_messages").insert({ sender_id: user.id, receiver_id: peerId, content: "🎤", audio_url: audioUrl });
    fetchEdgeFunction("notify-dm", { json: { receiver_id: peerId, message_preview: "🎤 Голосовое сообщение" } }).catch(() => {});
  };

  const sendImages = async (imageUrls: string[]) => {
    if (!user) return;
    await supabase.from("direct_messages").insert({ sender_id: user.id, receiver_id: peerId, content: "📷", image_urls: imageUrls });
    fetchEdgeFunction("notify-dm", { json: { receiver_id: peerId, message_preview: `📷 ${imageUrls.length > 1 ? imageUrls.length + " фото" : "Фото"}` } }).catch(() => {});
  };

  const sendFile = async (fileUrl: string, fileName: string) => {
    if (!user) return;
    await supabase.from("direct_messages").insert({ sender_id: user.id, receiver_id: peerId, content: "📎", file_url: fileUrl, file_name: fileName });
    fetchEdgeFunction("notify-dm", { json: { receiver_id: peerId, message_preview: `📎 ${fileName}` } }).catch(() => {});
  };

  const sendGameInvite = async (gameId: string) => {
    if (!user) return;
    await supabase.from("direct_messages").insert({ sender_id: user.id, receiver_id: peerId, content: `🎮:${gameId}` });
    fetchEdgeFunction("notify-dm", { json: { receiver_id: peerId, message_preview: "🎮 Приглашение в игру" } }).catch(() => {});
  };

  const sendVideoCircle = async (videoUrl: string) => {
    if (!user) return;
    await supabase.from("direct_messages").insert({ sender_id: user.id, receiver_id: peerId, content: "🎥", audio_url: videoUrl });
    fetchEdgeFunction("notify-dm", { json: { receiver_id: peerId, message_preview: "🎥 Видеокружок" } }).catch(() => {});
  };

  const viewportH = useViewportHeight();

  return (
    <div className="flex flex-col" style={{ height: viewportH }}>
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-3 p-3 border-b border-border bg-card/80 backdrop-blur-xl"
      >
        <motion.button whileTap={{ scale: 0.85 }} onClick={onBack}
          className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </motion.button>
        <button onClick={() => setProfileOpen(true)} className="relative">
          <Avatar className="w-9 h-9 ring-2 ring-primary/20 hover:ring-primary/40 transition-all">
            <AvatarImage src={peer?.avatar_url || ""} className="object-cover" />
            <AvatarFallback className="text-xs bg-primary/10 text-primary">
              {(peer?.display_name || "?")[0]}
            </AvatarFallback>
          </Avatar>
          <span className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card ${peerOnline ? "bg-green-500" : "bg-muted-foreground/40"}`} />
        </button>
        <button onClick={() => setProfileOpen(true)} className="text-left">
          <p className="font-display font-bold text-sm">{peer?.display_name || "…"}</p>
          <p className={`text-[10px] ${peerOnline ? "text-green-500" : "text-muted-foreground"}`}>
            {peerOnline ? "online" : "offline"}
          </p>
        </button>
      </motion.div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {messages.map((m, i) => {
          const isMe = m.sender_id === user?.id;
          const msg = m as any;
          const senderName = isMe ? undefined : peer?.display_name || undefined;
          return (
            <MessageBubble
              key={m.id}
              messageId={m.id}
              isMe={isMe}
              content={m.content}
              audioUrl={m.audio_url}
              imageUrl={m.image_url}
              imageUrls={m.image_urls}
              fileUrl={m.file_url}
              fileName={m.file_name}
              time={format(new Date(m.created_at), "HH:mm")}
              senderName={senderName}
              avatarUrl={isMe ? undefined : peer?.avatar_url}
              senderId={isMe ? undefined : peerId}
              replyToContent={msg.reply_to_content}
              replyToSender={msg.reply_to_sender}
              onReply={() => setReplyTo({ id: m.id, content: m.content, senderName: isMe ? "Вы" : (peer?.display_name || "?") })}
              onAvatarClick={(uid) => setProfileOpen(true)}
              index={i}
            />
          );
        })}
        <div ref={endRef} />
      </div>

      <ChatInputBar
        onSendText={sendText}
        onSendVoice={sendVoice}
        onSendImages={sendImages}
        onSendFile={sendFile}
        onSendGameInvite={sendGameInvite}
        onSendVideoCircle={sendVideoCircle}
        placeholder={lang === "uk" ? "Написати…" : "Написать…"}
        userId={user?.id || ""}
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        scrollToBottom={() => endRef.current?.scrollIntoView({ behavior: "smooth" })}
      />

      <UserProfileDialog
        userId={peerId}
        displayName={peer?.display_name || null}
        avatarUrl={peer?.avatar_url || null}
        totalXp={0}
        open={profileOpen}
        onOpenChange={setProfileOpen}
      />
    </div>
  );
};

/* ───── DM List ───── */
const DMList = ({ onSelectPeer }: { onSelectPeer: (uid: string) => void }) => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [convos, setConvos] = useState<{ peerId: string; lastMsg: string; lastAt: string; unread: number; profile?: Profile }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: msgs } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(500);

      if (!msgs || msgs.length === 0) { setLoading(false); return; }

      const peerMap: Record<string, { lastMsg: string; lastAt: string; unread: number }> = {};
      msgs.forEach((m) => {
        const peerId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        if (!peerMap[peerId]) {
          peerMap[peerId] = { lastMsg: m.content, lastAt: m.created_at, unread: 0 };
        }
        if (m.receiver_id === user.id && !m.is_read) peerMap[peerId].unread++;
      });

      const peerIds = Object.keys(peerMap);
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, last_active")
        .in("user_id", peerIds);

      const profMap: Record<string, Profile> = {};
      profs?.forEach((p) => (profMap[p.user_id] = p as any));

      const sorted = peerIds
        .map((pid) => ({ peerId: pid, ...peerMap[pid], profile: profMap[pid] }))
        .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

      setConvos(sorted);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (convos.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
        <p className="text-4xl mb-3">✉️</p>
        <p className="text-muted-foreground text-sm">
          {lang === "uk" ? "Ще немає повідомлень. Знайдіть користувача!" : "Пока нет сообщений. Найдите пользователя!"}
        </p>
      </motion.div>
    );
  }

  return (
    <div className="py-1">
      {convos.map((c, i) => (
        <motion.button
          key={c.peerId}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          onClick={() => onSelectPeer(c.peerId)}
          className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 active:bg-muted/60 transition-colors text-left"
        >
          <div className="relative">
            <Avatar className="w-12 h-12 ring-2 ring-border">
              <AvatarImage src={c.profile?.avatar_url || ""} className="object-cover" />
              <AvatarFallback className="bg-primary/10 text-primary">
                {(c.profile?.display_name || "?")[0]}
              </AvatarFallback>
            </Avatar>
            <span className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-card ${isUserOnline((c.profile as any)?.last_active) ? "bg-green-500" : "bg-muted-foreground/40"}`} />
            {c.unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 shadow-md">
                {c.unread}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-baseline justify-between gap-2">
              <p className="font-display font-bold text-sm truncate">{c.profile?.display_name || "…"}</p>
              <span className="text-[10px] text-muted-foreground/60 shrink-0">{format(new Date(c.lastAt), "HH:mm")}</span>
            </div>
            <p className="text-xs text-muted-foreground truncate mt-0.5">{c.lastMsg}</p>
          </div>
        </motion.button>
      ))}
    </div>
  );
};

/* ───── Main Chat Page ───── */
const Chat = () => {
  const navigate = useNavigate();
  const { lang } = useLanguage();
  const [tab, setTab] = useState<"community" | "dm" | "find">("community");
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);

  const handleSelectUser = (uid: string) => {
    setSelectedPeer(uid);
  };

  if (selectedPeer) {
    return (
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="flex flex-col h-full"
      >
        <DMConversation peerId={selectedPeer} onBack={() => setSelectedPeer(null)} />
      </motion.div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="p-4 pb-3"
      >
        <div className="flex items-center gap-3 mb-4">
          <motion.button whileTap={{ scale: 0.85 }} onClick={() => navigate("/")}
            className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </motion.button>
          <h1 className="text-2xl font-display font-bold">
            {lang === "uk" ? "Чат" : "Чат"} <span className="text-primary">💬</span>
          </h1>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 p-1 bg-muted/50 rounded-2xl">
          <TabButton
            active={tab === "community"}
            icon={MessageCircle}
            label={lang === "uk" ? "Спільнота" : "Общий"}
            onClick={() => setTab("community")}
          />
          <TabButton
            active={tab === "dm"}
            icon={Mail}
            label={lang === "uk" ? "Особисті" : "Личные"}
            onClick={() => setTab("dm")}
          />
          <TabButton
            active={tab === "find"}
            icon={Users}
            label={lang === "uk" ? "Знайти" : "Найти"}
            onClick={() => setTab("find")}
          />
        </div>
      </motion.div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {tab === "community" && (
            <motion.div key="community" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="h-full">
              <CommunityChat />
            </motion.div>
          )}
          {tab === "dm" && (
            <motion.div key="dm" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="h-full overflow-y-auto">
              <DMList onSelectPeer={handleSelectUser} />
            </motion.div>
          )}
          {tab === "find" && (
            <motion.div key="find" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="h-full overflow-y-auto">
              <FindUsers onSelectUser={handleSelectUser} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default Chat;
