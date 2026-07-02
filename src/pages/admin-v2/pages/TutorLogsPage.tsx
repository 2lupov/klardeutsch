import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, SectionHeader, EmptyState } from "./_ui";
import { MessageSquare, User, Bot } from "lucide-react";

interface Chat {
  id: string;
  teacher_id: string;
  student_id: string;
  title: string | null;
  updated_at: string;
  teacher_name?: string;
  student_name?: string;
}
interface Message {
  id: string;
  role: string;
  content: string;
  created_at: string;
}

export default function TutorLogsPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selected, setSelected] = useState<Chat | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: chatsData } = await supabase
        .from("teacher_ai_chats")
        .select("id,teacher_id,student_id,title,updated_at")
        .order("updated_at", { ascending: false })
        .limit(100);
      const list = (chatsData as any) || [];
      const ids = Array.from(new Set(list.flatMap((c: Chat) => [c.teacher_id, c.student_id]))) as string[];
      if (ids.length) {
        const { data: profiles } = await supabase
          .from("profiles").select("user_id,display_name").in("user_id", ids);
        const map = new Map<string, string>();
        (profiles as any[] || []).forEach((p) => map.set(p.user_id, p.display_name || "—"));
        list.forEach((c: Chat) => {
          c.teacher_name = map.get(c.teacher_id) || "—";
          c.student_name = map.get(c.student_id) || "—";
        });
      }
      setChats(list);
      setLoading(false);
    })();
  }, []);

  const openChat = async (c: Chat) => {
    setSelected(c);
    setMsgs([]);
    const { data } = await supabase
      .from("teacher_ai_messages")
      .select("id,role,content,created_at")
      .eq("chat_id", c.id)
      .order("created_at", { ascending: true });
    setMsgs((data as any) || []);
  };

  return (
    <div className="space-y-6">
      <SectionHeader title="AI Tutor Logs" subtitle={`Останні ${chats.length} діалогів`} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="space-y-2 lg:col-span-1">
          {loading ? (
            [0, 1, 2, 3].map((i) => <Card key={i} className="h-16 animate-pulse"><div /></Card>)
          ) : chats.length === 0 ? (
            <EmptyState title="Логів немає" description="Тут з'являться діалоги AI-репетитора" />
          ) : (
            chats.map((c) => (
              <button key={c.id} onClick={() => openChat(c)} className="w-full text-left">
                <Card className={`p-3 ${selected?.id === c.id ? "ring-2 ring-indigo-500" : ""}`}>
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-indigo-500 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {c.teacher_name} → {c.student_name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {new Date(c.updated_at).toLocaleString("uk-UA")}
                      </p>
                    </div>
                  </div>
                </Card>
              </button>
            ))
          )}
        </div>

        <Card className="lg:col-span-2 p-5 min-h-[500px]">
          {!selected ? (
            <div className="h-full flex items-center justify-center text-sm text-slate-400">
              Обери діалог зліва
            </div>
          ) : (
            <div className="space-y-3">
              <div className="pb-3 border-b border-slate-100">
                <h3 className="font-semibold text-slate-900">
                  {selected.teacher_name} → {selected.student_name}
                </h3>
                <p className="text-xs text-slate-500">{selected.title || "Без назви"}</p>
              </div>
              {msgs.map((m) => (
                <div key={m.id} className={`flex gap-2 ${m.role === "user" ? "" : "flex-row-reverse"}`}>
                  <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: m.role === "user" ? "#EEF2FF" : "#F3E8FF" }}>
                    {m.role === "user"
                      ? <User className="w-3.5 h-3.5 text-indigo-600" />
                      : <Bot className="w-3.5 h-3.5 text-purple-600" />}
                  </div>
                  <div className={`max-w-[80%] px-3 py-2 rounded-2xl text-sm ${
                    m.role === "user" ? "bg-slate-100 text-slate-800" : "bg-indigo-50 text-slate-800"
                  }`}>
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
