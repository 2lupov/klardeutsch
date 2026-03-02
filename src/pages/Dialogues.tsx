import { useState, useRef, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { Send, ArrowLeft, Loader2 } from "lucide-react";
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
    // Send initial greeting from AI
    const greeting: Msg = { role: "user", content: `Hallo! Ich möchte über "${topic.de}" sprechen.` };
    setMessages([greeting]);
    streamChat([greeting]);
  };

  const resetChat = () => {
    setSelectedTopic(null);
    setMessages([]);
  };

  // Topic selection screen
  if (!selectedTopic) {
    return (
      <div className="flex flex-col gap-6 animate-slide-up">
        <div>
          <h1 className="text-2xl font-display font-bold">{lang === "uk" ? "Діалоги з AI" : "Диалоги с AI"}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {lang === "uk" ? "Практикуйте розмовну німецьку з AI-співрозмовником" : "Практикуйте разговорный немецкий с AI-собеседником"}
          </p>
        </div>

        {/* Level selector */}
        <div className="flex gap-2">
          {LEVELS.map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSelectedLevel(lvl)}
              className={`px-3 py-1.5 rounded-lg text-sm font-display font-semibold transition-colors ${
                selectedLevel === lvl
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:text-foreground"
              }`}
            >
              {lvl}
            </button>
          ))}
        </div>

        {/* Topics grid */}
        <div className="grid grid-cols-2 gap-3">
          {TOPICS.map((topic) => (
            <button
              key={topic.id}
              onClick={() => startConversation(topic)}
              className="glass-card p-4 text-left hover:border-primary/50 transition-all group"
            >
              <span className="text-2xl">{topic.emoji}</span>
              <p className="font-display font-semibold text-sm mt-2">{topic.de}</p>
              <p className="text-xs text-muted-foreground">{lang === "uk" ? topic.uk : topic.ru}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Chat screen
  return (
    <div className="flex flex-col h-[calc(100dvh-8rem)] lg:h-[calc(100dvh-2rem)] animate-slide-up">
      {/* Header */}
      <div className="flex items-center gap-3 pb-3 border-b border-border">
        <button onClick={resetChat} className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <p className="font-display font-semibold text-sm">
            {selectedTopic.emoji} {selectedTopic.de}
          </p>
          <p className="text-xs text-muted-foreground">{selectedLevel} · {lang === "uk" ? selectedTopic.uk : selectedTopic.ru}</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto py-4 space-y-4 overscroll-none">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-secondary text-foreground rounded-bl-md"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm dark:prose-invert max-w-none [&_hr]:my-2 [&_p]:my-1 [&_ul]:my-1 [&_strong]:text-foreground">
                  <ReactMarkdown>{msg.content}</ReactMarkdown>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
            </div>
          </div>
        ))}
        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex justify-start">
            <div className="bg-secondary rounded-2xl rounded-bl-md px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="pt-3 border-t border-border">
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
            className="flex-1 px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-colors text-sm"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="px-4 py-3 rounded-xl bg-primary text-primary-foreground disabled:opacity-50 transition-opacity"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Dialogues;
