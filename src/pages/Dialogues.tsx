import { useState, useRef, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Send, ArrowLeft, Sparkles, Music, Volume2 } from "lucide-react";
import ReactMarkdown from "react-markdown";

/* ── Ambient Background ── */
const AmbientBackground = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
    <div
      className="absolute w-[600px] h-[600px] rounded-full opacity-[0.07] blur-[120px]"
      style={{
        background: "hsl(var(--primary))",
        top: "-10%",
        right: "-10%",
        animation: "ambient-drift-1 20s ease-in-out infinite",
      }}
    />
    <div
      className="absolute w-[500px] h-[500px] rounded-full opacity-[0.05] blur-[100px]"
      style={{
        background: "hsl(var(--primary))",
        bottom: "5%",
        left: "-8%",
        animation: "ambient-drift-2 25s ease-in-out infinite",
      }}
    />
    <div
      className="absolute w-[300px] h-[300px] rounded-full opacity-[0.04] blur-[80px]"
      style={{
        background: "hsl(var(--primary))",
        top: "40%",
        left: "50%",
        animation: "ambient-drift-3 18s ease-in-out infinite",
      }}
    />
  </div>
);

type Msg = { role: "user" | "assistant"; content: string };

const TOPICS = [
  { id: "cafe", emoji: "☕", de: "Im Café", ru: "В кафе", uk: "В кафе" },
  { id: "einkaufen", emoji: "🛒", de: "Einkaufen", ru: "В магазине", uk: "В магазині" },
  { id: "arzt", emoji: "🏥", de: "Beim Arzt", ru: "У врача", uk: "У лікаря" },
  { id: "reisen", emoji: "✈️", de: "Reisen", ru: "Путешествия", uk: "Подорожі" },
  { id: "vorstellung", emoji: "👋", de: "Sich vorstellen", ru: "Знакомство", uk: "Знайомство" },
  { id: "wohnung", emoji: "🏠", de: "Wohnung suchen", ru: "Поиск жилья", uk: "Пошук житла" },
  { id: "arbeit", emoji: "💼", de: "Arbeit & Beruf", ru: "Работа", uk: "Робота" },
  { id: "freizeit", emoji: "🎮", de: "Freizeit", ru: "Свободное время", uk: "Вільний час" },
];

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-dialogue`;

/* ── Topic Selection ── */
const TopicSelection = ({
  lang,
  selectedLevel,
  setSelectedLevel,
  onStart,
}: {
  lang: string;
  selectedLevel: string;
  setSelectedLevel: (l: string) => void;
  onStart: (t: typeof TOPICS[0]) => void;
}) => (
  <div className="flex flex-col gap-8 animate-slide-up max-w-lg mx-auto w-full">
    {/* Header */}
    <div className="text-center pt-4">
      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium mb-4">
        <Sparkles className="w-3.5 h-3.5" />
        {lang === "uk" ? "AI-співрозмовник" : "AI-собеседник"}
      </div>
      <h1 className="text-3xl font-display font-bold tracking-tight">
        {lang === "uk" ? "Діалоги" : "Диалоги"}
      </h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-xs mx-auto leading-relaxed">
        {lang === "uk"
          ? "Обери тему та практикуй німецьку в розмові з AI"
          : "Выбери тему и практикуй немецкий в разговоре с AI"}
      </p>
    </div>

    {/* Level pills */}
    <div className="flex justify-center gap-2">
      {LEVELS.map((lvl) => (
        <button
          key={lvl}
          onClick={() => setSelectedLevel(lvl)}
          className={`px-4 py-2 rounded-full text-xs font-display font-semibold transition-all duration-300 ${
            selectedLevel === lvl
              ? "bg-primary text-primary-foreground shadow-md shadow-primary/20 scale-105"
              : "bg-secondary/60 text-muted-foreground hover:text-foreground hover:bg-secondary"
          }`}
        >
          {lvl}
        </button>
      ))}
    </div>

    {/* Topics grid */}
    <div className="grid grid-cols-2 gap-3 px-1">
      {TOPICS.map((topic, i) => (
        <button
          key={topic.id}
          onClick={() => onStart(topic)}
          className="group relative overflow-hidden rounded-2xl bg-card/60 backdrop-blur-sm border border-border/30 p-5 text-left transition-all duration-300 hover:border-primary/30 hover:bg-card/90 hover:shadow-lg hover:shadow-primary/5 hover:-translate-y-0.5 active:scale-[0.98]"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <span className="relative text-3xl block mb-3 transition-transform duration-300 group-hover:scale-110">{topic.emoji}</span>
          <p className="relative font-display font-semibold text-sm">{topic.de}</p>
          <p className="relative text-xs text-muted-foreground mt-0.5">
            {lang === "uk" ? topic.uk : topic.ru}
          </p>
        </button>
      ))}
    </div>
  </div>
);

/* ── Chat Bubble ── */
const ChatBubble = ({ msg, index }: { msg: Msg; index: number }) => {
  const isUser = msg.role === "user";
  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}
      style={{ animationDelay: `${Math.min(index, 5) * 30}ms` }}
    >
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
          isUser
            ? "bg-primary/90 text-primary-foreground rounded-br-md"
            : "bg-card/60 border border-border/15 text-foreground rounded-bl-md"
        }`}
      >
        {isUser ? (
          <p>{msg.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&_hr]:my-2 [&_p]:my-1 [&_ul]:my-1 [&_strong]:text-foreground [&_em]:text-primary/70">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Mini Lofi Toggle ── */
const LOFI_STREAM_URL = "http://ec3.yesstreaming.net:3755/stream";

const MiniLofi = () => {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio();
    audio.volume = 0.25;
    audio.src = LOFI_STREAM_URL;
    audio.preload = "none";
    audioRef.current = audio;
    audio.onplay = () => setPlaying(true);
    audio.onpause = () => setPlaying(false);
    return () => { audio.pause(); audioRef.current = null; };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    playing ? audio.pause() : audio.play().catch(console.error);
  };

  return (
    <button
      onClick={toggle}
      className={`relative p-2 rounded-xl transition-all duration-300 ${
        playing
          ? "bg-primary/15 text-primary shadow-[0_0_12px_hsl(var(--primary)/0.12)]"
          : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
      }`}
      title="Lofi Radio"
    >
      <Music className="w-4 h-4" />
      {playing && (
        <span className="absolute -top-0.5 -right-0.5 flex gap-[1.5px]">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-[2px] bg-primary rounded-full animate-bounce"
              style={{ height: "6px", animationDelay: `${i * 0.15}s`, animationDuration: "0.6s" }}
            />
          ))}
        </span>
      )}
    </button>
  );
};

/* ── Main Component ── */
const Dialogues = () => {
  const { lang } = useLanguage();
  useAuth();
  const [selectedTopic, setSelectedTopic] = useState<typeof TOPICS[0] | null>(null);
  const [selectedLevel, setSelectedLevel] = useState("A1");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const streamChat = useCallback(async (allMessages: Msg[]) => {
    setIsLoading(true);
    let assistantSoFar = "";

    const upsert = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        upsert("Необходимо войти в аккаунт.");
        setIsLoading(false);
        return;
      }

      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          topic: selectedTopic?.de ?? "Allgemein",
          level: selectedLevel,
        }),
      });

      if (!resp.ok || !resp.body) {
        const err = await resp.json().catch(() => ({ error: "Ошибка" }));
        upsert(err.error || "Произошла ошибка. Попробуйте ещё раз.");
        setIsLoading(false);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nlIdx: number;
        while ((nlIdx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, nlIdx);
          buffer = buffer.slice(nlIdx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) upsert(content);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (e) {
      console.error(e);
      upsert("Ошибка соединения. Попробуйте ещё раз.");
    }
    setIsLoading(false);
  }, [selectedTopic, selectedLevel]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading) return;
    setInput("");
    const userMsg: Msg = { role: "user", content: text };
    const updated = [...messages, userMsg];
    setMessages(updated);
    await streamChat(updated);
    inputRef.current?.focus();
  };

  const startConversation = (topic: typeof TOPICS[0]) => {
    setSelectedTopic(topic);
    setMessages([]);
    const greeting: Msg = { role: "user", content: `Hallo! Ich möchte über "${topic.de}" sprechen.` };
    setMessages([greeting]);
    streamChat([greeting]);
  };

  const resetChat = () => {
    setSelectedTopic(null);
    setMessages([]);
  };

  if (!selectedTopic) {
    return (
      <>
        <AmbientBackground />
        <TopicSelection
          lang={lang}
          selectedLevel={selectedLevel}
          setSelectedLevel={setSelectedLevel}
          onStart={startConversation}
        />
      </>
    );
  }

  return (
    <>
      <AmbientBackground />
      <div className="flex flex-col animate-slide-up h-[calc(100dvh-5rem)] lg:h-[calc(100dvh-2rem)]">
        {/* Chat container — full height, padded */}
        <div className="w-full flex flex-col flex-1 min-h-0 px-2">
          {/* Header */}
          <div className="flex items-center gap-2 pb-3">
            <button
              onClick={resetChat}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <span className="text-base">{selectedTopic.emoji}</span>
            <span className="font-display font-semibold text-sm">{selectedTopic.de}</span>
            <span className="text-[10px] text-muted-foreground ml-1">{selectedLevel}</span>
            <div className="flex-1" />
            <MiniLofi />
          </div>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto rounded-2xl bg-card/30 backdrop-blur-sm border border-border/10 p-4 space-y-3 overscroll-none">
            {messages.map((msg, i) => (
              <ChatBubble key={i} msg={msg} index={i} />
            ))}
            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start animate-fade-in">
                <div className="bg-card/60 border border-border/15 rounded-2xl rounded-bl-md px-4 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse [animation-delay:200ms]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-primary/40 animate-pulse [animation-delay:400ms]" />
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2 pt-2 pb-1"
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={lang === "uk" ? "Напишіть німецькою..." : "Напишите на немецком..."}
              disabled={isLoading}
              style={{ fontSize: "16px" }}
              className="flex-1 px-4 py-2.5 rounded-xl bg-card/40 text-foreground placeholder:text-muted-foreground/40 border border-border/15 focus:border-primary/30 focus:outline-none transition-colors"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2.5 rounded-xl bg-primary text-primary-foreground disabled:opacity-20 transition-all active:scale-90"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </>
  );
};

export default Dialogues;
