import { useState, useEffect, useRef, useCallback } from "react";
import { fetchEdgeFunction } from "@/lib/auth-fetch";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Search, MessageCircle, Users, Mail, ArrowLeft, Mic, Square, Play, Pause, ImagePlus, X, Paperclip, FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";

/* ───── types ───── */
interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface CommunityMsg {
  id: string;
  user_id: string;
  content: string;
  audio_url?: string | null;
  image_url?: string | null;
  image_urls?: string[] | null;
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
  image_urls?: string[] | null;
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
  const filename = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from("chat-images").upload(filename, file, { contentType: file.type });
  if (error) return null;
  const { data } = supabase.storage.from("chat-images").getPublicUrl(filename);
  return data.publicUrl;
};

/* ───── Message Bubble ───── */
const MessageBubble = ({ isMe, content, audioUrl, imageUrl, time, senderName, avatarUrl, index }: {
  isMe: boolean; content: string; audioUrl?: string | null; imageUrl?: string | null; time: string;
  senderName?: string; avatarUrl?: string | null; index: number;
}) => {
  const [imgFullscreen, setImgFullscreen] = useState(false);

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, delay: Math.min(index * 0.02, 0.3) }}
        className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}
      >
        {!isMe && (
          <Avatar className="w-7 h-7 shrink-0 mt-auto">
            <AvatarImage src={avatarUrl || ""} className="object-cover" />
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">
              {(senderName || "?")[0]}
            </AvatarFallback>
          </Avatar>
        )}
        <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
          {!isMe && senderName && (
            <p className="text-[10px] mb-0.5 text-muted-foreground font-medium px-1">{senderName}</p>
          )}
          <div className={`rounded-2xl overflow-hidden text-sm leading-relaxed backdrop-blur-sm ${
            isMe
              ? "bg-primary text-primary-foreground rounded-br-md shadow-lg shadow-primary/20"
              : "bg-card border border-border rounded-bl-md shadow-sm"
          } ${imageUrl && !audioUrl ? "p-0" : "px-3.5 py-2.5"}`}>
            {imageUrl ? (
              <div className="cursor-pointer" onClick={() => setImgFullscreen(true)}>
                <img
                  src={imageUrl}
                  alt="shared"
                  className="max-w-[260px] max-h-[300px] object-cover rounded-2xl"
                  loading="lazy"
                />
                {content && content !== "📷" && (
                  <p className="px-3.5 py-2 text-sm">{content}</p>
                )}
              </div>
            ) : audioUrl ? (
              <VoicePlayer url={audioUrl} />
            ) : (
              content
            )}
          </div>
          <p className={`text-[9px] mt-0.5 px-1 ${isMe ? "text-right" : ""} text-muted-foreground/50`}>
            {time}
          </p>
        </div>
      </motion.div>

      {/* Fullscreen image viewer */}
      <AnimatePresence>
        {imgFullscreen && imageUrl && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setImgFullscreen(false)}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-pointer"
          >
            <motion.img
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.8 }}
              src={imageUrl}
              alt="fullscreen"
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <button className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 flex items-center justify-center text-white">
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/* ───── Chat Input Bar ───── */
const ChatInputBar = ({ onSendText, onSendVoice, onSendImage, placeholder, userId }: {
  onSendText: (text: string) => void;
  onSendVoice: (audioUrl: string) => void;
  onSendImage: (imageUrl: string) => void;
  placeholder: string;
  userId: string;
}) => {
  const [text, setText] = useState("");
  const { recording, elapsed, start, stop, cancel } = useVoiceRecorder();
  const [uploading, setUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if (!text.trim()) return;
    onSendText(text.trim());
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

  const handleImagePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const url = await uploadChatImage(file, userId);
    setUploading(false);
    if (url) onSendImage(url);
    e.target.value = "";
  };

  return (
    <motion.div
      layout
      className="relative border-t border-border bg-card/80 backdrop-blur-xl p-3 flex items-center gap-2"
    >
      <AnimatePresence mode="wait">
        {recording ? (
          <motion.div
            key="recording"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="flex-1 flex items-center gap-3"
          >
            <button onClick={cancel} className="text-destructive text-xs font-medium hover:underline">
              ✕
            </button>
            <div className="flex items-center gap-2 flex-1">
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
                className="w-2.5 h-2.5 rounded-full bg-destructive"
              />
              <span className="text-sm text-muted-foreground font-mono">
                {Math.floor(elapsed / 60).toString().padStart(2, "0")}:{(elapsed % 60).toString().padStart(2, "0")}
              </span>
            </div>
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleStopRecording}
              className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30"
            >
              <Square className="w-4 h-4" />
            </motion.button>
          </motion.div>
        ) : (
          <motion.div
            key="input"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="flex-1 flex items-center gap-2"
          >
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={() => imageInputRef.current?.click()}
              disabled={uploading}
              className="w-9 h-9 rounded-full hover:bg-muted/80 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors shrink-0"
            >
              <ImagePlus className="w-4 h-4" />
            </motion.button>
            <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImagePick} />
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
              placeholder={placeholder}
              className="flex-1 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 rounded-full px-4"
            />
            {text.trim() ? (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.85 }}
                onClick={handleSend}
                className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/30"
              >
                <Send className="w-4 h-4" />
              </motion.button>
            ) : (
              <motion.button
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                whileTap={{ scale: 0.85 }}
                onClick={start}
                disabled={uploading}
                className="w-10 h-10 rounded-full bg-muted hover:bg-primary/10 flex items-center justify-center text-muted-foreground hover:text-primary transition-colors"
              >
                <Mic className="w-4 h-4" />
              </motion.button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
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
            .select("user_id, display_name, avatar_url")
            .in("user_id", uids);
          if (profs) {
            const map: Record<string, Profile> = {};
            profs.forEach((p) => (map[p.user_id] = p));
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
            .select("user_id, display_name, avatar_url")
            .eq("user_id", msg.user_id)
            .single();
          if (data) setProfiles((prev) => ({ ...prev, [data.user_id]: data }));
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
    await supabase.from("community_messages").insert({ user_id: user.id, content });
  };

  const sendVoice = async (audioUrl: string) => {
    if (!user) return;
    await supabase.from("community_messages").insert({ user_id: user.id, content: "🎤", audio_url: audioUrl });
  };

  const sendImage = async (imageUrl: string) => {
    if (!user) return;
    await supabase.from("community_messages").insert({ user_id: user.id, content: "📷", image_url: imageUrl });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
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
          return (
            <MessageBubble
              key={m.id}
              isMe={isMe}
              content={m.content}
              audioUrl={m.audio_url}
              imageUrl={m.image_url}
              time={format(new Date(m.created_at), "HH:mm")}
              senderName={prof?.display_name || undefined}
              avatarUrl={prof?.avatar_url}
              index={i}
            />
          );
        })}
        <div ref={endRef} />
      </div>

      <ChatInputBar
        onSendText={sendText}
        onSendVoice={sendVoice}
        onSendImage={sendImage}
        placeholder={lang === "uk" ? "Написати повідомлення…" : "Написать сообщение…"}
        userId={user?.id || ""}
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
  const [peer, setPeer] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<DirectMsg[]>([]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .eq("user_id", peerId)
        .single();
      if (prof) setPeer(prof);

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
    await supabase.from("direct_messages").insert({ sender_id: user.id, receiver_id: peerId, content });
    fetchEdgeFunction("notify-dm", { json: { receiver_id: peerId, message_preview: content } }).catch(() => {});
  };

  const sendVoice = async (audioUrl: string) => {
    if (!user) return;
    await supabase.from("direct_messages").insert({ sender_id: user.id, receiver_id: peerId, content: "🎤", audio_url: audioUrl });
    fetchEdgeFunction("notify-dm", { json: { receiver_id: peerId, message_preview: "🎤 Голосовое сообщение" } }).catch(() => {});
  };

  const sendImage = async (imageUrl: string) => {
    if (!user) return;
    await supabase.from("direct_messages").insert({ sender_id: user.id, receiver_id: peerId, content: "📷", image_url: imageUrl });
    fetchEdgeFunction("notify-dm", { json: { receiver_id: peerId, message_preview: "📷 Фото" } }).catch(() => {});
  };

  return (
    <div className="flex flex-col h-full">
      {/* DM Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="flex items-center gap-3 p-3 border-b border-border bg-card/80 backdrop-blur-xl"
      >
        <motion.button whileTap={{ scale: 0.85 }} onClick={onBack}
          className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </motion.button>
        <Avatar className="w-9 h-9 ring-2 ring-primary/20">
          <AvatarImage src={peer?.avatar_url || ""} className="object-cover" />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {(peer?.display_name || "?")[0]}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-display font-bold text-sm">{peer?.display_name || "…"}</p>
          <p className="text-[10px] text-muted-foreground">online</p>
        </div>
      </motion.div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
        {messages.map((m, i) => {
          const isMe = m.sender_id === user?.id;
          return (
            <MessageBubble
              key={m.id}
              isMe={isMe}
              content={m.content}
              audioUrl={m.audio_url}
              imageUrl={m.image_url}
              time={format(new Date(m.created_at), "HH:mm")}
              index={i}
            />
          );
        })}
        <div ref={endRef} />
      </div>

      <ChatInputBar
        onSendText={sendText}
        onSendVoice={sendVoice}
        onSendImage={sendImage}
        placeholder={lang === "uk" ? "Написати…" : "Написать…"}
        userId={user?.id || ""}
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
        .select("user_id, display_name, avatar_url")
        .in("user_id", peerIds);

      const profMap: Record<string, Profile> = {};
      profs?.forEach((p) => (profMap[p.user_id] = p));

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
        className="h-full flex flex-col"
      >
        <DMConversation peerId={selectedPeer} onBack={() => setSelectedPeer(null)} />
      </motion.div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="p-4 pb-3"
      >
        <h1 className="text-2xl font-display font-bold mb-4">
          {lang === "uk" ? "Чат" : "Чат"} <span className="text-primary">💬</span>
        </h1>

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
