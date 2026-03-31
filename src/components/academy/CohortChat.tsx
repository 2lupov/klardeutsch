import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Send, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface CohortMessage {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  display_name?: string;
  avatar_url?: string;
}

interface Props {
  courseId: string;
  lang: string;
  open: boolean;
  onClose: () => void;
}

const CohortChat = ({ courseId, lang, open, onClose }: Props) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<CohortMessage[]>([]);
  const [messages, setMessages] = useState<CohortMessage[]>([]);
  const [profiles, setProfiles] = useState<Record<string, { display_name: string; avatar_url: string | null }>>({});
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
  };

  // Load messages + profiles
  useEffect(() => {
    if (!user || !courseId) return;
    const load = async () => {
      const { data: msgs } = await supabase
        .from("course_cohort_messages")
        .select("id, user_id, content, created_at")
        .eq("course_id", courseId)
        .order("created_at")
        .limit(200);
      
      const msgList = (msgs ?? []) as CohortMessage[];
      setMessages(msgList);

      // Load profiles for unique user_ids
      const userIds = [...new Set(msgList.map(m => m.user_id))];
      if (userIds.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, display_name, avatar_url")
          .in("user_id", userIds);
        const map: Record<string, any> = {};
        (profs ?? []).forEach((p: any) => { map[p.user_id] = p; });
        setProfiles(map);
      }
    };
    load();
  }, [user, courseId]);

  // Realtime
  useEffect(() => {
    if (!user || !courseId) return;
    const channel = supabase
      .channel(`cohort-${courseId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "course_cohort_messages",
        filter: `course_id=eq.${courseId}`,
      }, async (payload) => {
        const msg = payload.new as CohortMessage;
        setMessages((prev) => {
          if (prev.some(m => m.id === msg.id)) return prev;
          return [...prev, msg];
        });
        // Load profile if unknown
        if (!profiles[msg.user_id]) {
          const { data } = await supabase.from("profiles").select("user_id, display_name, avatar_url").eq("user_id", msg.user_id).single();
          if (data) setProfiles(prev => ({ ...prev, [data.user_id]: data }));
        }
        scrollToBottom();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, courseId, profiles]);

  useEffect(() => { if (open) scrollToBottom(); }, [open, messages.length]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !user || sending) return;
    setSending(true);
    await supabase.from("course_cohort_messages").insert({
      user_id: user.id,
      course_id: courseId,
      content: input.trim(),
    });
    setInput("");
    setSending(false);
  }, [input, user, courseId, sending]);

  if (!user) return null;

  const getName = (userId: string) => profiles[userId]?.display_name || (lang === "uk" ? "Студент" : "Студент");

  return (
    <>
      {/* FAB */}
      <button
        onClick={() => setOpen(true)}
        className={`fixed bottom-20 left-4 z-40 w-12 h-12 rounded-full bg-accent text-accent-foreground shadow-lg flex items-center justify-center hover:scale-105 transition-transform ${open ? "hidden" : ""}`}
      >
        <Users className="w-5 h-5" />
      </button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-16 left-4 z-50 w-80 h-[28rem] rounded-2xl bg-card border border-border/50 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-accent/10">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-accent-foreground" />
                <span className="text-sm font-display font-bold">{lang === "uk" ? "Чат потоку" : "Чат потока"}</span>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
              {messages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center mt-8">
                  {lang === "uk" ? "Напишіть першими!" : "Напишите первыми!"}
                </p>
              )}
              {messages.map((msg) => {
                const isMe = msg.user_id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                    <div className="max-w-[80%]">
                      {!isMe && (
                        <span className="text-[10px] text-muted-foreground ml-1">{getName(msg.user_id)}</span>
                      )}
                      <div className={`px-3 py-2 rounded-xl text-xs leading-relaxed ${
                        isMe
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-secondary text-foreground rounded-bl-sm"
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Input */}
            <div className="px-3 py-2 border-t border-border/30">
              <div className="flex gap-2">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder={lang === "uk" ? "Повідомлення..." : "Сообщение..."}
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

export default CohortChat;
