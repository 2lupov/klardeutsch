import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { MessageCircle, User, Send, ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ChatUser {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  last_message: string;
  last_at: string;
  unread: number;
  lesson_title: string | null;
}

interface Message {
  id: string;
  sender: string;
  content: string;
  created_at: string;
  lesson_id: string | null;
}

const AdminChats = () => {
  const [chats, setChats] = useState<ChatUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);

  const loadChats = useCallback(async () => {
    setLoading(true);
    // Get all teacher chat messages grouped by user
    const { data: msgs } = await supabase
      .from("teacher_chat_messages")
      .select("user_id, content, created_at, sender, lesson_id")
      .order("created_at", { ascending: false })
      .limit(500);

    if (!msgs) { setLoading(false); return; }

    // Group by user
    const userMap = new Map<string, { messages: any[]; lastMsg: any }>();
    for (const m of msgs) {
      if (!userMap.has(m.user_id)) {
        userMap.set(m.user_id, { messages: [], lastMsg: m });
      }
      userMap.get(m.user_id)!.messages.push(m);
    }

    // Get profiles
    const userIds = [...userMap.keys()];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .in("user_id", userIds);

    const profileMap = new Map<string, any>();
    (profiles ?? []).forEach((p: any) => profileMap.set(p.user_id, p));

    const chatList: ChatUser[] = userIds.map(uid => {
      const { lastMsg, messages: userMsgs } = userMap.get(uid)!;
      const profile = profileMap.get(uid);
      return {
        user_id: uid,
        display_name: profile?.display_name || "Студент",
        avatar_url: profile?.avatar_url,
        last_message: lastMsg.content?.slice(0, 60) || "",
        last_at: lastMsg.created_at,
        unread: userMsgs.filter((m: any) => m.sender === "student" && !m.is_read).length,
        lesson_title: null,
      };
    });

    chatList.sort((a, b) => new Date(b.last_at).getTime() - new Date(a.last_at).getTime());
    setChats(chatList);
    setLoading(false);
  }, []);

  useEffect(() => { loadChats(); }, [loadChats]);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel("admin-teacher-chats")
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "teacher_chat_messages",
      }, () => { loadChats(); })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [loadChats]);

  const openChat = async (userId: string) => {
    setSelectedUser(userId);
    const { data } = await supabase
      .from("teacher_chat_messages")
      .select("id, sender, content, created_at, lesson_id")
      .eq("user_id", userId)
      .order("created_at");
    setMessages((data as Message[]) ?? []);
  };

  const sendReply = async () => {
    if (!reply.trim() || !selectedUser || sending) return;
    setSending(true);
    await supabase.from("teacher_chat_messages").insert({
      user_id: selectedUser,
      sender: "teacher",
      content: reply.trim(),
      lesson_id: messages[messages.length - 1]?.lesson_id || null,
    });
    setReply("");
    setSending(false);
    // Reload
    openChat(selectedUser);
    toast.success("Ответ отправлен!");
  };

  if (selectedUser) {
    const chatUser = chats.find(c => c.user_id === selectedUser);
    return (
      <div className="flex flex-col gap-3">
        <button onClick={() => setSelectedUser(null)} className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground self-start">
          <ArrowLeft className="w-3.5 h-3.5" /> Все чаты
        </button>

        <div className="glass-card p-3">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold">
              {chatUser?.display_name?.[0] || "S"}
            </div>
            <span className="text-sm font-bold">{chatUser?.display_name || "Студент"}</span>
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2 mb-3">
            {messages.map(msg => (
              <div key={msg.id} className={`flex ${msg.sender === "student" ? "justify-start" : "justify-end"}`}>
                <div className={`max-w-[80%] px-3 py-2 rounded-xl text-xs ${
                  msg.sender === "student"
                    ? "bg-secondary text-foreground rounded-bl-sm"
                    : "bg-primary text-primary-foreground rounded-br-sm"
                }`}>
                  {msg.content}
                  <div className={`text-[9px] mt-1 ${msg.sender === "student" ? "text-muted-foreground" : "text-primary-foreground/60"}`}>
                    {new Date(msg.created_at).toLocaleString("ru")}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              value={reply}
              onChange={e => setReply(e.target.value)}
              onKeyDown={e => e.key === "Enter" && sendReply()}
              placeholder="Ответ учителя..."
              className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground text-xs border border-border focus:border-primary focus:outline-none"
            />
            <button onClick={sendReply} disabled={!reply.trim() || sending} className="px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold disabled:opacity-40">
              {sending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
        <MessageCircle className="w-4 h-4 text-primary" /> Чаты учеников
        <span className="ml-auto text-xs text-muted-foreground font-normal">{chats.length}</span>
      </h3>

      {loading ? (
        <p className="text-xs text-muted-foreground animate-pulse">Загрузка...</p>
      ) : chats.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <MessageCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Пока нет сообщений от учеников</p>
        </div>
      ) : (
        <div className="space-y-1">
          {chats.map(chat => (
            <button
              key={chat.user_id}
              onClick={() => openChat(chat.user_id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/20 hover:border-primary/20 transition-colors text-left"
            >
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold shrink-0">
                {chat.display_name?.[0] || "S"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold truncate">{chat.display_name}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto shrink-0">
                    {new Date(chat.last_at).toLocaleDateString("ru")}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground truncate">{chat.last_message}</p>
              </div>
              {chat.unread > 0 && (
                <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold shrink-0">
                  {chat.unread}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminChats;
