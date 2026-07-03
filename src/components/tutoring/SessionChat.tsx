import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Msg {
  id: string;
  from: "teacher" | "student";
  text: string;
  at: number;
}

interface Props {
  sessionId?: string;
  role: "teacher" | "student";
  compact?: boolean; // teacher panel style vs student floating button
}

/**
 * Ephemeral live chat via Supabase Realtime broadcast — messages exist only
 * for the current session and aren't persisted, which fits the "class v2" flow.
 */
const SessionChat = ({ sessionId, role, compact }: Props) => {
  const [open, setOpen] = useState(compact ? true : false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [unread, setUnread] = useState(0);
  const chRef = useRef<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) return;
    const ch = supabase.channel(`session-chat-${sessionId}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "msg" }, (payload: any) => {
      const m: Msg = payload.payload;
      setMessages((prev) => [...prev, m]);
      if (!open) setUnread((u) => u + 1);
    }).subscribe();
    chRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [sessionId, open]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  useEffect(() => { if (open) setUnread(0); }, [open]);

  const send = async () => {
    const val = text.trim();
    if (!val || !chRef.current) return;
    const m: Msg = { id: crypto.randomUUID(), from: role, text: val, at: Date.now() };
    setMessages((prev) => [...prev, m]);
    setText("");
    await chRef.current.send({ type: "broadcast", event: "msg", payload: m });
  };

  const Bubble = ({ m }: { m: Msg }) => {
    const mine = m.from === role;
    return (
      <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
        <div className={`max-w-[80%] px-3 py-1.5 rounded-2xl text-sm ${mine ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"}`}>
          {m.text}
        </div>
      </div>
    );
  };

  if (compact) {
    return (
      <div className="flex flex-col h-full min-h-[160px]">
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-1.5 pr-1">
          {messages.length === 0 ? (
            <p className="text-[11px] text-muted-foreground text-center py-4">Чат появится, когда кто-то напишет.</p>
          ) : messages.map((m) => <Bubble key={m.id} m={m} />)}
        </div>
        <div className="mt-2 flex gap-1.5">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") send(); }}
            placeholder="Сообщение ученику…"
            className="flex-1 text-sm px-3 py-1.5 rounded-lg border border-input bg-background"
          />
          <button onClick={send} className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90">
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );
  }

  // Student floating button + panel
  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-24 right-6 z-40 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-105 transition"
      >
        <MessageCircle className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-40 right-6 z-40 w-80 max-w-[90vw] h-96 rounded-2xl bg-card border border-border shadow-2xl flex flex-col overflow-hidden"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/40">
              <div className="text-sm font-bold flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4 text-primary" /> Чат с учителем
              </div>
              <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-muted"><X className="w-4 h-4" /></button>
            </div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-1.5">
              {messages.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">Напиши учителю, если что-то непонятно.</p>
              ) : messages.map((m) => <Bubble key={m.id} m={m} />)}
            </div>
            <div className="p-2 border-t border-border flex gap-1.5">
              <input
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") send(); }}
                placeholder="Сообщение…"
                className="flex-1 text-sm px-3 py-2 rounded-lg border border-input bg-background"
              />
              <button onClick={send} className="h-9 w-9 rounded-lg bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SessionChat;
