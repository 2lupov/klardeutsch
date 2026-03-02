import { useState, useRef, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Send, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";

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
const ChatBubble = ({ msg }: { msg: Msg }) => {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-in`}>
      <div
        className={`max-w-[82%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-lg"
            : "bg-card/80 backdrop-blur-sm border border-border/30 text-foreground rounded-bl-lg"
        }`}
      >
        {isUser ? (
          <p>{msg.content}</p>
        ) : (
          <div className="prose prose-sm dark:prose-invert max-w-none [&_hr]:my-2 [&_p]:my-1.5 [&_ul]:my-1 [&_strong]:text-foreground [&_em]:text-muted-foreground">
            <ReactMarkdown>{msg.content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
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
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
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
      <TopicSelection
        lang={lang}
        selectedLevel={selectedLevel}
        setSelectedLevel={setSelectedLevel}
        onStart={startConversation}
      />
    );
  }

  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] lg:h-[calc(100dvh-2rem)] animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 mb-1">
        <button
          onClick={resetChat}
          className="p-2 -ml-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="font-display font-semibold text-sm truncate">
            {selectedTopic.emoji} {selectedTopic.de}
          </p>
          <p className="text-xs text-muted-foreground">
            {selectedLevel} · {lang === "uk" ? selectedTopic.uk : selectedTopic.ru}
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary">
          <Sparkles className="w-3 h-3" />
          <span className="text-[10px] font-semibold">AI</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3.5 overscroll-none scrollbar-thin">
        {messages.map((msg, i) => (
          <ChatBubble key={i} msg={msg} />
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start animate-fade-in">
            <div className="bg-card/80 backdrop-blur-sm border border-border/30 rounded-2xl rounded-bl-lg px-4 py-3">
              <div className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-pulse" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-pulse [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 animate-pulse [animation-delay:300ms]" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="pt-3">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={lang === "uk" ? "Напишіть німецькою..." : "Напишите на немецком..."}
            disabled={isLoading}
            className="flex-1 px-4 py-3 rounded-2xl bg-card/60 backdrop-blur-sm text-foreground placeholder:text-muted-foreground/60 border border-border/30 focus:border-primary/40 focus:bg-card/90 focus:outline-none focus:ring-1 focus:ring-primary/20 transition-all duration-300 text-sm"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-3 rounded-2xl bg-primary text-primary-foreground disabled:opacity-30 transition-all duration-300 hover:shadow-md hover:shadow-primary/20 active:scale-95"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Dialogues;
