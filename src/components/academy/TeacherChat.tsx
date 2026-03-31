import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Send, MessageCircle, X, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  sender: string;
  content: string;
  created_at: string;
  audio_url?: string | null;
}

interface Props {
  lessonId: string;
  courseId: string;
  lang: string;
}

const TeacherChat = ({ lessonId, courseId, lang }: Props) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [unread, setUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
  };

  // Load messages
  useEffect(() => {
    if (!user || !lessonId) return;
    const load = async () => {
      const { data } = await supabase
        .from("teacher_chat_messages")
        .select("id, sender, content, created_at, audio_url")
        .eq("user_id", user.id)
        .eq("lesson_id", lessonId)
        .order("created_at");
      setMessages((data as Message[]) ?? []);
    };
    load();
  }, [user, lessonId]);

  // Realtime subscription
  useEffect(() => {
    if (!user || !lessonId) return;
    const channel = supabase
      .channel(`teacher-chat-${lessonId}-${user.id}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "teacher_chat_messages",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const msg = payload.new as Message;
        if (msg.lesson_id === lessonId) {
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
          if (!open && msg.sender === "teacher") setUnread((p) => p + 1);
          scrollToBottom();
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, lessonId, open]);

  useEffect(() => { if (open) { scrollToBottom(); setUnread(0); } }, [open, messages.length]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !user || sending) return;
    const text = input.trim();
    setInput("");
    setSending(true);

    // Insert student message
    await supabase.from("teacher_chat_messages").insert({
      user_id: user.id,
      lesson_id: lessonId,
      sender: "student",
      content: text,
    });

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
  }, [input, user, lessonId, courseId, sending]);

  if (!user) return null;

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-20 right-4 z-40 w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform ${open ? "hidden" : ""}`}
      >
        <MessageCircle className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-destructive text-[10px] text-white flex items-center justify-center font-bold">
            {unread}
          </span>
        )}
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-16 right-4 z-50 w-80 h-[28rem] rounded-2xl bg-card border border-border/50 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-primary/5">
              <div className="flex items-center gap-2">
                <Bot className="w-4 h-4 text-primary" />
                <span className="text-sm font-display font-bold">{lang === "uk" ? "Вчитель" : "Учитель"}</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {messages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center mt-8">
                  {lang === "uk" ? "Задайте питання вчителю!" : "Задайте вопрос учителю!"}
                </p>
              )}
              {messages.map((msg) => (
                <div key={msg.id} className={`flex ${msg.sender === "student" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                    msg.sender === "student"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-secondary text-foreground rounded-bl-sm"
                  }`}>
                    {msg.content}
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

            {/* Input */}
            <div className="px-3 py-2 border-t border-border/30">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder={lang === "uk" ? "Ваше питання..." : "Ваш вопрос..."}
                  className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground text-xs border border-border focus:border-primary focus:outline-none"
                  disabled={sending}
                />
                <Button size="sm" onClick={sendMessage} disabled={!input.trim() || sending} className="h-8 w-8 p-0">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default TeacherChat;
