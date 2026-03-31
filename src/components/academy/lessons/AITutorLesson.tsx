import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Bot, Send, Volume2, Lightbulb, BarChart3, Loader2 } from "lucide-react";
import type { Lang } from "@/i18n/translations";
import { fetchEdgeFunction } from "@/lib/auth-fetch";
import ReactMarkdown from "react-markdown";

interface Props {
  lesson: { id: string; title: string; content: any };
  onComplete: () => void;
  lang: Lang;
}

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

interface Analysis {
  errors: Array<{ original: string; corrected: string; explanation: string }>;
  new_words: Array<{ de: string; ru: string }>;
  scores: { grammar: number; vocabulary: number; fluency: number };
  overall: number;
  advice: string;
}

const AITutorLesson = ({ lesson, onComplete, lang }: Props) => {
  const content = lesson.content as any;
  const scenario = content?.scenario ?? content?.situation ?? "Allgemein";
  const role = content?.role ?? "Partner";
  const context = content?.context ?? "";
  const level = content?.level ?? "A1";
  const theorySummary = content?.theory_summary ?? "";

  const isUk = lang === "uk";

  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", content: context || `Hallo! Willkommen zum Szenario: ${scenario}. Ich bin dein ${role}. Was möchtest du sagen?` },
  ]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [showHint, setShowHint] = useState(false);
  const [hintText, setHintText] = useState("");
  const [loadingHint, setLoadingHint] = useState(false);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [finished, setFinished] = useState(false);
  const [playingIdx, setPlayingIdx] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const userMsgCount = messages.filter(m => m.role === "user").length;

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
  };

  useEffect(() => { scrollToBottom(); }, [messages, streamText]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || streaming) return;
    const userMsg = input.trim();
    setInput("");
    const newMessages: ChatMsg[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setStreaming(true);
    setStreamText("");
    setShowHint(false);

    try {
      const apiMessages = newMessages.map(m => ({ role: m.role, content: m.content }));
      
      const res = await fetchEdgeFunction("ai-dialogue", {
        json: {
          messages: apiMessages,
          topic: scenario,
          level,
          lang,
          lesson_context: {
            situation: scenario,
            role,
            level,
            topic: lesson.title,
            theory_summary: theorySummary,
          },
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setMessages([...newMessages, { role: "assistant", content: err.error || (isUk ? "Помилка AI" : "Ошибка AI") }]);
        setStreaming(false);
        return;
      }

      // Parse SSE stream
      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                fullText += delta;
                setStreamText(fullText);
              }
            } catch {}
          }
        }
      }

      setMessages([...newMessages, { role: "assistant", content: fullText || (isUk ? "..." : "...") }]);
      setStreamText("");
    } catch {
      setMessages([...newMessages, { role: "assistant", content: isUk ? "Помилка з'єднання" : "Ошибка соединения" }]);
    }
    setStreaming(false);
  }, [input, messages, streaming, scenario, role, level, lang, lesson.title, theorySummary, isUk]);

  const requestHint = useCallback(async () => {
    if (loadingHint) return;
    setLoadingHint(true);
    setShowHint(true);
    try {
      const apiMessages = messages.map(m => ({ role: m.role, content: m.content }));
      apiMessages.push({ role: "user", content: isUk ? "Дай підказку що я можу відповісти (коротко, 1-2 варіанти німецькою)" : "Дай подсказку что я могу ответить (коротко, 1-2 варианта на немецком)" });

      const res = await fetchEdgeFunction("ai-dialogue", { json: { messages: apiMessages, topic: scenario, level, lang } });
      if (!res.ok) { setHintText(isUk ? "Не вдалося отримати підказку" : "Не удалось получить подсказку"); setLoadingHint(false); return; }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let text = "";
      if (reader) {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) { text += delta; setHintText(text); }
            } catch {}
          }
        }
      }
    } catch { setHintText(isUk ? "Помилка" : "Ошибка"); }
    setLoadingHint(false);
  }, [messages, scenario, level, lang, loadingHint, isUk]);

  const finishDialogue = useCallback(async () => {
    setFinished(true);
    setAnalyzing(true);
    try {
      const res = await fetchEdgeFunction("analyze-lesson-dialogue", {
        json: {
          history: messages.map(m => ({ role: m.role, content: m.content })),
          level,
          topic: scenario,
          lang,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setAnalysis(data);
      }
    } catch {}
    setAnalyzing(false);
  }, [messages, level, scenario, lang]);

  const playTTS = async (text: string, idx: number) => {
    if (playingIdx !== null) return;
    // Extract only German text (before ---)
    const germanPart = text.split("---")[0].trim();
    if (!germanPart) return;
    setPlayingIdx(idx);
    try {
      const res = await fetchEdgeFunction("elevenlabs-tts", { json: { text: germanPart, voiceId: "JBFqnCBsd6RMkjVDRZzb" } });
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => { setPlayingIdx(null); URL.revokeObjectURL(url); };
      await audio.play();
    } catch { setPlayingIdx(null); }
  };

  return (
    <div className="space-y-4">
      {/* Scenario card */}
      <div className="p-3 rounded-xl bg-primary/5 border border-primary/15">
        <h2 className="font-display text-lg font-bold text-foreground">{lesson.title}</h2>
        <p className="text-xs text-muted-foreground mt-1">
          🎭 {scenario} · {role}
        </p>
        {context && <p className="text-xs text-foreground/70 mt-1">{context}</p>}
      </div>

      {/* Chat */}
      <div ref={scrollRef} className="rounded-xl border border-border/30 bg-card/40 p-4 space-y-3 min-h-[300px] max-h-[400px] overflow-y-auto">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm ${
              msg.role === "user"
                ? "bg-primary text-primary-foreground rounded-br-md"
                : "bg-muted/50 text-foreground rounded-bl-md"
            }`}>
              {msg.role === "assistant" && (
                <div className="flex items-center gap-1.5 mb-1">
                  <Bot className="w-3.5 h-3.5 text-primary" />
                  <button
                    onClick={() => playTTS(msg.content, i)}
                    disabled={playingIdx !== null}
                    className="p-0.5 rounded hover:bg-muted/30 text-muted-foreground hover:text-primary transition-colors disabled:opacity-40"
                  >
                    <Volume2 className={`w-3 h-3 ${playingIdx === i ? "text-primary animate-pulse" : ""}`} />
                  </button>
                </div>
              )}
              <div className="prose prose-sm prose-invert max-w-none [&_p]:m-0 [&_strong]:text-foreground [&_li]:text-foreground/90 text-sm leading-relaxed">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        ))}

        {/* Streaming message */}
        {streaming && (
          <div className="flex justify-start">
            <div className="max-w-[85%] px-3.5 py-2.5 rounded-2xl bg-muted/50 text-foreground rounded-bl-md text-sm">
              <div className="flex items-center gap-1.5 mb-1">
                <Bot className="w-3.5 h-3.5 text-primary" />
              </div>
              {streamText ? (
                <div className="prose prose-sm prose-invert max-w-none [&_p]:m-0 text-sm leading-relaxed">
                  <ReactMarkdown>{streamText}</ReactMarkdown>
                </div>
              ) : (
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hint */}
      {showHint && hintText && (
        <div className="p-3 rounded-xl bg-accent/5 border border-accent/20 text-xs text-foreground/80">
          <div className="flex items-center gap-1.5 mb-1">
            <Lightbulb className="w-3.5 h-3.5 text-primary" />
            <span className="font-bold text-[11px]">{isUk ? "Підказка" : "Подсказка"}</span>
          </div>
          <div className="prose prose-sm prose-invert max-w-none text-xs">
            <ReactMarkdown>{hintText}</ReactMarkdown>
          </div>
        </div>
      )}

      {/* Input */}
      {!finished && (
        <div className="flex gap-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder={isUk ? "Напиши відповідь німецькою..." : "Напиши ответ на немецком..."}
            className="flex-1 px-4 py-2.5 rounded-xl bg-muted/30 border border-border/30 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            disabled={streaming}
          />
          <Button onClick={requestHint} size="icon" variant="ghost" className="shrink-0" disabled={streaming || loadingHint}>
            <Lightbulb className={`w-4 h-4 ${loadingHint ? "animate-pulse" : ""}`} />
          </Button>
          <Button onClick={handleSend} size="icon" className="shrink-0" disabled={!input.trim() || streaming}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Finish / Complete buttons */}
      {!finished && userMsgCount >= 3 && (
        <div className="flex justify-center">
          <Button onClick={finishDialogue} variant="outline" className="font-display text-xs">
            <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
            {isUk ? "Завершити діалог" : "Завершить диалог"}
          </Button>
        </div>
      )}

      {/* Analysis */}
      {finished && (
        <div className="space-y-3">
          {analyzing ? (
            <div className="flex items-center justify-center gap-2 py-6">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">
                {isUk ? "Аналізую діалог..." : "Анализирую диалог..."}
              </span>
            </div>
          ) : analysis ? (
            <div className="p-4 rounded-xl bg-card/60 border border-border/30 space-y-4">
              <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                {isUk ? "Розбір діалогу" : "Разбор диалога"}
              </h3>

              {/* Scores */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: isUk ? "Граматика" : "Грамматика", val: analysis.scores.grammar },
                  { label: isUk ? "Словник" : "Словарь", val: analysis.scores.vocabulary },
                  { label: isUk ? "Плавність" : "Беглость", val: analysis.scores.fluency },
                ].map(({ label, val }) => (
                  <div key={label} className="text-center p-2 rounded-lg bg-muted/30">
                    <div className="text-lg font-bold text-primary">{val}/5</div>
                    <div className="text-[10px] text-muted-foreground">{label}</div>
                  </div>
                ))}
              </div>

              <div className="text-center text-sm font-bold text-primary">
                {isUk ? "Загальний бал" : "Общий балл"}: {analysis.overall}/100
              </div>

              {/* Errors */}
              {analysis.errors.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-foreground mb-1.5">
                    🔍 {isUk ? "Помилки" : "Ошибки"}
                  </h4>
                  <div className="space-y-1.5">
                    {analysis.errors.map((e, i) => (
                      <div key={i} className="p-2 rounded-lg bg-destructive/5 border border-destructive/10 text-xs">
                        <p><span className="line-through text-destructive/70">{e.original}</span> → <span className="font-semibold text-foreground">{e.corrected}</span></p>
                        <p className="text-muted-foreground mt-0.5">{e.explanation}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New words */}
              {analysis.new_words.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-foreground mb-1.5">
                    💡 {isUk ? "Нові слова" : "Новые слова"}
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.new_words.map((w, i) => (
                      <span key={i} className="px-2 py-1 rounded-lg bg-primary/10 text-xs text-foreground">
                        {w.de} — {w.ru}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Advice */}
              {analysis.advice && (
                <div>
                  <h4 className="text-xs font-bold text-foreground mb-1">
                    📝 {isUk ? "Що покращити" : "Что улучшить"}
                  </h4>
                  <p className="text-xs text-foreground/80">{analysis.advice}</p>
                </div>
              )}
            </div>
          ) : null}

          <div className="flex justify-center">
            <Button onClick={onComplete} className="font-display font-bold">
              {isUk ? "Завершити урок" : "Завершить урок"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AITutorLesson;
