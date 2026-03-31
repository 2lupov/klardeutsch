import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Send, X, Bot, GraduationCap, Loader2, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fetchEdgeFunction } from "@/lib/auth-fetch";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  sender: string;
  content: string;
  created_at: string;
  video_timecode?: number | null;
}

interface Props {
  lessonId: string;
  courseId: string;
  lessonTitle: string;
  courseLevel: string;
  lang: string;
  open: boolean;
  onClose: () => void;
}

const QUICK_QUESTIONS = {
  ru: [
    "Объясни это правило проще",
    "Дай ещё примеры",
    "Как это произносится?",
  ],
  uk: [
    "Поясни це правило простіше",
    "Дай ще приклади",
    "Як це вимовляється?",
  ],
};

const TeacherChatPanel = ({ lessonId, courseId, lessonTitle, courseLevel, lang, open, onClose }: Props) => {
  const { user } = useAuth();
  const isUk = lang === "uk";

  // AI assistant state
  const [aiMessages, setAiMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([]);
  const [aiInput, setAiInput] = useState("");
  const [aiStreaming, setAiStreaming] = useState(false);
  const [aiStreamText, setAiStreamText] = useState("");

  // Teacher chat state
  const [teacherMessages, setTeacherMessages] = useState<Message[]>([]);
  const [teacherInput, setTeacherInput] = useState("");
  const [sending, setSending] = useState(false);
  const [attachTimecode, setAttachTimecode] = useState(false);

  const aiScrollRef = useRef<HTMLDivElement>(null);
  const teacherScrollRef = useRef<HTMLDivElement>(null);

  const scrollAi = () => setTimeout(() => aiScrollRef.current?.scrollTo({ top: aiScrollRef.current.scrollHeight, behavior: "smooth" }), 50);
  const scrollTeacher = () => setTimeout(() => teacherScrollRef.current?.scrollTo({ top: teacherScrollRef.current.scrollHeight, behavior: "smooth" }), 50);

  // Load teacher messages
  useEffect(() => {
    if (!user || !lessonId || !open) return;
    const load = async () => {
      const { data } = await supabase
        .from("teacher_chat_messages")
        .select("id, sender, content, created_at, video_timecode")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .order("created_at");
      setTeacherMessages((data as Message[]) ?? []);
    };
    load();
  }, [user, lessonId, open]);

  // Realtime for teacher messages
  useEffect(() => {
    if (!user || !lessonId || !open) return;
    const channel = supabase
      .channel(`teacher-panel-${lessonId}-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "teacher_chat_messages",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const msg = payload.new as any;
        if (msg.lesson_id === lessonId) {
          setTeacherMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          scrollTeacher();
        }
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, lessonId, open]);

  useEffect(() => { scrollTeacher(); }, [teacherMessages.length]);

  // AI send
  const sendAi = useCallback(async (text?: string) => {
    const msg = text || aiInput.trim();
    if (!msg || aiStreaming) return;
    setAiInput("");
    const newMsgs = [...aiMessages, { role: "user" as const, content: msg }];
    setAiMessages(newMsgs);
    setAiStreaming(true);
    setAiStreamText("");
    scrollAi();

    try {
      const systemContext = `Ты — AI-помощник для урока "${lessonTitle}" (уровень ${courseLevel}). Отвечай ${isUk ? "українською" : "на русском"}, помогай с вопросами по немецкому языку и содержанию урока.`;
      
      const res = await fetchEdgeFunction("ai-dialogue", {
        json: {
          messages: [
            { role: "system", content: systemContext },
            ...newMsgs.map(m => ({ role: m.role, content: m.content })),
          ],
          topic: lessonTitle,
          level: courseLevel,
          lang,
        },
      });

      if (!res.ok) {
        setAiMessages([...newMsgs, { role: "assistant", content: isUk ? "Помилка" : "Ошибка" }]);
        setAiStreaming(false);
        return;
      }

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
              if (delta) { fullText += delta; setAiStreamText(fullText); }
            } catch {}
          }
        }
      }
      setAiMessages([...newMsgs, { role: "assistant", content: fullText || "..." }]);
      setAiStreamText("");
    } catch {
      setAiMessages([...newMsgs, { role: "assistant", content: isUk ? "Помилка з'єднання" : "Ошибка соединения" }]);
    }
    setAiStreaming(false);
    scrollAi();
  }, [aiInput, aiMessages, aiStreaming, lessonTitle, courseLevel, lang, isUk]);

  // Teacher send
  const sendTeacher = useCallback(async () => {
    if (!teacherInput.trim() || !user || sending) return;
    const text = teacherInput.trim();
    setTeacherInput("");
    setSending(true);
    await supabase.from("teacher_chat_messages").insert({
      user_id: user.id,
      lesson_id: lessonId,
      sender: "student",
      content: text,
      video_timecode: attachTimecode ? 0 : null,
    });
    setAttachTimecode(false);

    // Get AI teacher reply
    try {
      const { data } = await supabase.functions.invoke("course-teacher-reply", {
        body: { lessonId, courseId, message: text, userId: user.id },
      });
      if (data?.reply) {
        await supabase.from("teacher_chat_messages").insert({
          user_id: user.id,
          lesson_id: lessonId,
          sender: "teacher",
          content: data.reply,
        });
      }
    } catch {}
    setSending(false);
  }, [teacherInput, user, sending, lessonId, courseId, attachTimecode]);

  if (!user || !open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 200 }}
        className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-card border-l border-border/30 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border/30 bg-primary/5 shrink-0">
          <GraduationCap className="w-5 h-5 text-primary" />
          <div className="flex-1 min-w-0">
            <span className="text-sm font-display font-bold text-foreground block truncate">
              {isUk ? "Допомога" : "Помощь"}
            </span>
            <span className="text-[10px] text-muted-foreground truncate block">{lessonTitle}</span>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="ai" className="flex-1 flex flex-col min-h-0">
          <TabsList className="mx-4 mt-2 shrink-0">
            <TabsTrigger value="ai" className="flex-1 text-xs gap-1.5">
              <Bot className="w-3.5 h-3.5" />
              {isUk ? "AI-помічник" : "AI-помощник"}
            </TabsTrigger>
            <TabsTrigger value="teacher" className="flex-1 text-xs gap-1.5">
              <GraduationCap className="w-3.5 h-3.5" />
              {isUk ? "Вчитель" : "Учитель"}
            </TabsTrigger>
          </TabsList>

          {/* AI Tab */}
          <TabsContent value="ai" className="flex-1 flex flex-col min-h-0 m-0">
            <div ref={aiScrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {aiMessages.length === 0 && (
                <div className="text-center py-6 space-y-3">
                  <Bot className="w-8 h-8 text-primary/30 mx-auto" />
                  <p className="text-xs text-muted-foreground">
                    {isUk ? "Задай питання по уроку!" : "Задай вопрос по уроку!"}
                  </p>
                  {/* Quick questions */}
                  <div className="space-y-1.5">
                    {(isUk ? QUICK_QUESTIONS.uk : QUICK_QUESTIONS.ru).map((q, i) => (
                      <button
                        key={i}
                        onClick={() => sendAi(q)}
                        className="w-full px-3 py-2 rounded-lg bg-muted/30 border border-border/20 text-xs text-foreground hover:border-primary/30 transition-colors text-left"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {aiMessages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-foreground rounded-bl-sm"
                  }`}>
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm prose-invert max-w-none [&_p]:m-0 text-xs">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : msg.content}
                  </div>
                </div>
              ))}

              {aiStreaming && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] px-3 py-2 rounded-xl bg-secondary text-foreground rounded-bl-sm text-xs">
                    {aiStreamText ? (
                      <div className="prose prose-sm prose-invert max-w-none [&_p]:m-0 text-xs">
                        <ReactMarkdown>{aiStreamText}</ReactMarkdown>
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

            <div className="px-4 py-2 border-t border-border/30 shrink-0">
              <div className="flex gap-2">
                <input
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendAi()}
                  placeholder={isUk ? "Запитай AI..." : "Спроси AI..."}
                  className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground text-xs border border-border focus:border-primary focus:outline-none"
                  disabled={aiStreaming}
                />
                <Button size="sm" onClick={() => sendAi()} disabled={!aiInput.trim() || aiStreaming} className="h-8 w-8 p-0">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* Teacher Tab */}
          <TabsContent value="teacher" className="flex-1 flex flex-col min-h-0 m-0">
            <div className="px-4 py-2 border-b border-border/20 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-400" />
                <span className="text-[10px] text-muted-foreground">
                  {isUk ? "Відповідає за 24год" : "Отвечает за 24ч"}
                </span>
              </div>
            </div>

            <div ref={teacherScrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {teacherMessages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center mt-8">
                  {isUk ? "Задайте питання вчителю!" : "Задайте вопрос учителю!"}
                </p>
              )}
              {teacherMessages.map(msg => (
                <div key={msg.id} className={`flex ${msg.sender === "student" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.sender === "student"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-foreground rounded-bl-sm"
                  }`}>
                    {msg.video_timecode != null && (
                      <span className="text-[9px] opacity-60 block mb-0.5">📎 Таймкод: {msg.video_timecode}s</span>
                    )}
                    {msg.content}
                    <div className={`text-[9px] mt-1 ${msg.sender === "student" ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {new Date(msg.created_at).toLocaleString("ru")}
                    </div>
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-secondary rounded-xl px-3 py-2 rounded-bl-sm">
                    <div className="flex gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="px-4 py-2 border-t border-border/30 space-y-1.5 shrink-0">
              <label className="flex items-center gap-1.5 text-[10px] text-muted-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={attachTimecode}
                  onChange={e => setAttachTimecode(e.target.checked)}
                  className="rounded"
                />
                <Paperclip className="w-3 h-3" />
                {isUk ? "Прикріпити момент з уроку" : "Прикрепить момент из урока"}
              </label>
              <div className="flex gap-2">
                <input
                  value={teacherInput}
                  onChange={e => setTeacherInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && sendTeacher()}
                  placeholder={isUk ? "Ваше питання..." : "Ваш вопрос..."}
                  className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground text-xs border border-border focus:border-primary focus:outline-none"
                  disabled={sending}
                />
                <Button size="sm" onClick={sendTeacher} disabled={!teacherInput.trim() || sending} className="h-8 w-8 p-0">
                  {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </AnimatePresence>
  );
};

export default TeacherChatPanel;
