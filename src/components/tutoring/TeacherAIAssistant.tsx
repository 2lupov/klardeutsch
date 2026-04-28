import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sparkles, Send, Loader2, Trash2, Bot, User, Copy } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { useLanguage } from "@/contexts/LanguageContext";

type Msg = { role: "user" | "assistant"; content: string };

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  studentId: string;
  studentName: string;
  isKid?: boolean;
}

const QUICK_PROMPTS_ADULT = [
  "Объясни простыми словами разницу между Akkusativ и Dativ",
  "Дай 5 упражнений на Perfekt с haben/sein",
  "Придумай мини-диалог на тему 'в кафе' с переводом",
  "Составь 10 вопросов для проверки уровня A2",
];
const QUICK_PROMPTS_KID = [
  "🎮 Придумай весёлую игру со словами про животных",
  "🎨 Дай 5 простых заданий с эмодзи",
  "🐶 Объясни артикли der/die/das на примере игрушек",
  "🌟 Креативное домашнее задание на 10 минут",
];

export default function TeacherAIAssistant({ open, onOpenChange, studentId, studentName, isKid }: Props) {
  const { lang } = useLanguage();
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const quickPrompts = isKid ? QUICK_PROMPTS_KID : QUICK_PROMPTS_ADULT;

  useEffect(() => {
    if (!open) return;
    loadHistory();
  }, [open, studentId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const loadHistory = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data: chat } = await supabase
        .from("teacher_ai_chats")
        .select("id")
        .eq("teacher_id", user.id)
        .eq("student_id", studentId)
        .maybeSingle();
      if (!chat) {
        setMessages([]);
        return;
      }
      const { data: msgs } = await supabase
        .from("teacher_ai_messages")
        .select("role, content")
        .eq("chat_id", chat.id)
        .order("created_at", { ascending: true })
        .limit(60);
      setMessages((msgs || []).filter((m: any) => m.role !== "system") as Msg[]);
    } finally {
      setLoading(false);
    }
  };

  const send = async (text: string) => {
    if (!text.trim() || streaming) return;
    const userMsg: Msg = { role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg, { role: "assistant", content: "" }]);
    setInput("");
    setStreaming(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/teacher-ai-assistant`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ student_id: studentId, message: text.trim(), lang }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Помилка" }));
        if (resp.status === 429) toast.error("Забагато запитів. Спробуйте за хвилину.");
        else if (resp.status === 402) toast.error("AI credits закінчились");
        else toast.error(err.error || "Помилка AI");
        setMessages(prev => prev.slice(0, -1));
        return;
      }

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let acc = "";
      let done = false;

      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, idx);
          buf = buf.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") { done = true; break; }
          try {
            const p = JSON.parse(json);
            const c = p.choices?.[0]?.delta?.content;
            if (c) {
              acc += c;
              setMessages(prev => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: acc };
                return next;
              });
            }
          } catch {
            buf = line + "\n" + buf;
            break;
          }
        }
      }
    } catch (e: any) {
      toast.error(e.message);
      setMessages(prev => prev.slice(0, -1));
    } finally {
      setStreaming(false);
    }
  };

  const clearChat = async () => {
    if (!confirm("Очистити історію чату з AI для цього учня?")) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: chat } = await supabase
      .from("teacher_ai_chats")
      .select("id")
      .eq("teacher_id", user.id)
      .eq("student_id", studentId)
      .maybeSingle();
    if (chat) {
      await supabase.from("teacher_ai_messages").delete().eq("chat_id", chat.id);
    }
    setMessages([]);
    toast.success("Історія очищена");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl h-[85vh] p-0 flex flex-col gap-0">
        <DialogHeader className="p-4 border-b border-border">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg shadow-primary/30">
                <Sparkles className="w-5 h-5 text-primary-foreground" />
              </div>
              <div>
                <p className="font-bold leading-tight">AI-помічник</p>
                <p className="text-[11px] font-normal text-muted-foreground">
                  Контекст: {studentName} {isKid && "🧒"}
                </p>
              </div>
            </DialogTitle>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={clearChat} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-6">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mb-4">
                <Bot className="w-8 h-8 text-primary" />
              </div>
              <h3 className="font-bold text-lg mb-2">Запитайте AI про {studentName}</h3>
              <p className="text-sm text-muted-foreground mb-5 max-w-sm">
                AI знає рівень, вік і останні уроки. Допоможе пояснити тему, придумати вправу або відповісти на питання учня прямо на уроці.
              </p>
              <div className="grid gap-2 w-full max-w-md">
                {quickPrompts.map((p, i) => (
                  <button
                    key={i}
                    onClick={() => send(p)}
                    className="text-left text-sm px-4 py-2.5 rounded-xl border border-border hover:border-primary/40 hover:bg-primary/5 transition"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <div key={i} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                {m.role === "assistant" && (
                  <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3.5 h-3.5 text-primary" />
                  </div>
                )}
                <div
                  className={`group max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : "bg-muted text-foreground rounded-bl-sm"
                  }`}
                >
                  {m.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-ul:my-1.5 prose-li:my-0 prose-headings:my-2 prose-code:px-1 prose-code:py-0.5 prose-code:bg-background/50 prose-code:rounded">
                      {m.content ? (
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin opacity-60" />
                      )}
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  )}
                  {m.role === "assistant" && m.content && (
                    <button
                      onClick={() => { navigator.clipboard.writeText(m.content); toast.success("Скопійовано"); }}
                      className="opacity-0 group-hover:opacity-100 transition mt-1.5 text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> копіювати
                    </button>
                  )}
                </div>
                {m.role === "user" && (
                  <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="border-t border-border p-3">
          <div className="flex items-end gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send(input);
                }
              }}
              placeholder="Запитайте AI… (Enter — надіслати, Shift+Enter — новий рядок)"
              rows={1}
              className="resize-none min-h-[44px] max-h-32"
              disabled={streaming}
            />
            <Button
              onClick={() => send(input)}
              disabled={!input.trim() || streaming}
              size="icon"
              className="h-11 w-11 flex-shrink-0"
            >
              {streaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
