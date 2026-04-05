import { useState, useRef, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { fetchEdgeFunction } from "@/lib/auth-fetch";
import {
  Bot, Send, BookOpen, FileText, Languages, BookMarked,
  ArrowLeft, Sparkles, Loader2
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";

/* ── Ambient Background ── */
const AmbientBg = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
    <div
      className="absolute w-[600px] h-[600px] rounded-full opacity-[0.07] blur-[120px]"
      style={{ background: "hsl(var(--primary))", top: "-10%", right: "-10%", animation: "ambient-drift-1 20s ease-in-out infinite" }}
    />
    <div
      className="absolute w-[500px] h-[500px] rounded-full opacity-[0.05] blur-[100px]"
      style={{ background: "hsl(var(--primary))", bottom: "5%", left: "-8%", animation: "ambient-drift-2 25s ease-in-out infinite" }}
    />
  </div>
);

type Msg = { role: "user" | "assistant"; content: string };
type Tab = "chat" | "dictionary" | "reading" | "files";

const Assistant = () => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("chat");
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [dictWord, setDictWord] = useState("");
  const [dictResult, setDictResult] = useState<string | null>(null);
  const [dictLoading, setDictLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const t = useCallback((ru: string, uk: string) => lang === "uk" ? uk : ru, [lang]);

  const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
    { id: "chat", icon: Bot, label: t("ИИ Тьютор", "ІІ Тьютор") },
    { id: "dictionary", icon: Languages, label: t("Словарь", "Словник") },
    { id: "reading", icon: BookMarked, label: t("Чтение", "Читання") },
    { id: "files", icon: FileText, label: t("Файлы", "Файли") },
  ];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  /* ── Chat ── */
  const sendMessage = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const newMsgs: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);
    setInput("");
    setLoading(true);

    try {
      const systemPrompt = lang === "uk"
        ? "Ти — KLAR Assistant, персональний репетитор з німецької мови. Відповідай українською, якщо не просять іншою мовою. Пояснюй граматику, допомагай з перекладом, виправляй помилки. Будь дружнім та лаконічним."
        : "Ты — KLAR Assistant, персональный репетитор по немецкому языку. Отвечай по-русски, если не просят на другом языке. Объясняй грамматику, помогай с переводом, исправляй ошибки. Будь дружелюбным и лаконичным.";

      const resp = await fetchEdgeFunction("ai-dialogue", {
        json: {
          messages: [
            { role: "system", content: systemPrompt },
            ...newMsgs.map(m => ({ role: m.role, content: m.content })),
          ],
        },
      });

      if (!resp.ok || !resp.body) throw new Error("AI request failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              result += delta;
              setMessages([...newMsgs, { role: "assistant", content: result }]);
            }
          } catch { break; }
        }
      }
      if (!result) {
        setMessages([...newMsgs, { role: "assistant", content: t("Не удалось получить ответ.", "Не вдалося отримати відповідь.") }]);
      }
    } catch {
      setMessages([...newMsgs, { role: "assistant", content: t("Ошибка соединения.", "Помилка з'єднання.") }]);
    } finally {
      setLoading(false);
    }
  };

  /* ── Dictionary lookup ── */
  const lookupWord = async () => {
    const w = dictWord.trim();
    if (!w || dictLoading) return;
    setDictLoading(true);
    setDictResult(null);
    try {
      const resp = await fetchEdgeFunction("lookup-word", { json: { word: w, lang } });
      const data = await resp.json();
      setDictResult(data.result || data.error || t("Ничего не найдено", "Нічого не знайдено"));
    } catch {
      setDictResult(t("Ошибка запроса", "Помилка запиту"));
    } finally {
      setDictLoading(false);
    }
  };

  /* ── Chat View ── */
  const renderChat = () => (
    <div className="flex flex-col h-full">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-foreground">KLAR Assistant</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                {t(
                  "Задай вопрос по грамматике, попроси перевести фразу или объяснить правило",
                  "Постав питання з граматики, попроси перекласти фразу чи пояснити правило"
                )}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {[
                t("Объясни Akkusativ", "Поясни Akkusativ"),
                t("Переведи «Я учу немецкий»", "Переклади «Я вивчаю німецьку»"),
                t("Когда использовать sein/haben?", "Коли вживати sein/haben?"),
              ].map((q) => (
                <button
                  key={q}
                  onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="px-3 py-1.5 rounded-xl bg-muted/60 border border-border text-xs text-foreground/80 hover:bg-muted transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-md"
                    : "bg-card border border-border text-foreground rounded-bl-md"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-invert prose-sm max-w-none [&_p]:my-1 [&_strong]:text-foreground [&_code]:text-primary [&_code]:bg-primary/10 [&_code]:px-1 [&_code]:rounded">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {loading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border bg-card/50 backdrop-blur-xl">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={t("Задай вопрос...", "Постав питання...")}
            rows={1}
            className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30 max-h-32"
            style={{ minHeight: 42 }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || loading}
            className="shrink-0 w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition-opacity"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  /* ── Dictionary View ── */
  const renderDictionary = () => (
    <div className="p-4 space-y-4">
      <div className="text-center py-4">
        <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
          <Languages className="w-7 h-7 text-primary" />
        </div>
        <h3 className="font-display font-bold text-lg">{t("Умный словарь", "Розумний словник")}</h3>
        <p className="text-xs text-muted-foreground mt-1">{t("Введи слово — получи перевод, примеры и синонимы", "Введи слово — отримай переклад, приклади та синоніми")}</p>
      </div>

      <div className="flex gap-2">
        <input
          value={dictWord}
          onChange={(e) => setDictWord(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && lookupWord()}
          placeholder={t("Введи слово...", "Введи слово...")}
          className="flex-1 bg-muted/50 border border-border rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          onClick={lookupWord}
          disabled={!dictWord.trim() || dictLoading}
          className="shrink-0 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 flex items-center gap-2"
        >
          {dictLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
          {t("Найти", "Знайти")}
        </button>
      </div>

      {dictResult && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-4"
        >
          <div className="prose prose-invert prose-sm max-w-none [&_strong]:text-foreground [&_code]:text-primary">
            <ReactMarkdown>{dictResult}</ReactMarkdown>
          </div>
        </motion.div>
      )}
    </div>
  );

  /* ── Reading / Files — placeholder ── */
  const renderPlaceholder = (icon: React.ElementType, title: string, desc: string) => {
    const Icon = icon;
    return (
      <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-20 px-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-8 h-8 text-primary" />
        </div>
        <h3 className="font-display font-bold text-lg">{title}</h3>
        <p className="text-sm text-muted-foreground max-w-xs">{desc}</p>
        <span className="text-[10px] text-muted-foreground/60 font-display uppercase tracking-wider">
          {t("Скоро", "Незабаром")}
        </span>
      </div>
    );
  };

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col relative">
      <AmbientBg />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="font-display font-bold text-base text-foreground">KLAR Assistant</h1>
            <p className="text-[10px] text-muted-foreground">{t("Персональный ИИ-помощник", "Персональний ІІ-помічник")}</p>
          </div>
        </div>
      </header>

      {/* Tab bar */}
      <div className="flex gap-1 px-3 py-2 border-b border-border bg-card/40 backdrop-blur-lg overflow-x-auto">
        {tabs.map((tb) => {
          const active = tab === tb.id;
          return (
            <button
              key={tb.id}
              onClick={() => setTab(tb.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-display font-medium whitespace-nowrap transition-all ${
                active
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <tb.icon className="w-3.5 h-3.5" />
              {tb.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {tab === "chat" && renderChat()}
        {tab === "dictionary" && (
          <div className="flex-1 overflow-y-auto">{renderDictionary()}</div>
        )}
        {tab === "reading" && renderPlaceholder(BookMarked, t("Интерактивное чтение", "Інтерактивне читання"), t("Читай тексты с мгновенным переводом абзацев", "Читай тексти з миттєвим перекладом абзаців"))}
        {tab === "files" && renderPlaceholder(FileText, t("Анализ файлов", "Аналіз файлів"), t("Загрузи PDF или фото — ИИ разберёт текст", "Завантаж PDF або фото — ІІ розбере текст"))}
      </div>
    </div>
  );
};

export default Assistant;
