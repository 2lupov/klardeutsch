import { useState, useEffect, useRef } from "react";
import { fetchEdgeFunction } from "@/lib/auth-fetch";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, Search, MessageCircle, Users, Mail, ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";

/* ───── types ───── */
interface Profile {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface CommunityMsg {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: Profile;
}

interface DirectMsg {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
}

/* ───── Community Chat ───── */
const CommunityChat = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [messages, setMessages] = useState<CommunityMsg[]>([]);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from("community_messages")
        .select("*")
        .order("created_at", { ascending: true })
        .limit(200);
      if (data) {
        setMessages(data);
        const uids = [...new Set(data.map((m) => m.user_id))];
        if (uids.length) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .in("user_id", uids);
          if (profs) {
            const map: Record<string, Profile> = {};
            profs.forEach((p) => (map[p.user_id] = p));
            setProfiles(map);
          }
        }
      }
      setLoading(false);
    };
    load();

    const channel = supabase
      .channel("community-chat")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "community_messages" }, async (payload) => {
        const msg = payload.new as CommunityMsg;
        setMessages((prev) => [...prev, msg]);
        if (!profiles[msg.user_id]) {
          const { data } = await supabase
            .from("profiles")
            .select("user_id, display_name, avatar_url")
            .eq("user_id", msg.user_id)
            .single();
          if (data) setProfiles((prev) => ({ ...prev, [data.user_id]: data }));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || !user) return;
    const content = text.trim();
    setText("");
    await supabase.from("community_messages").insert({ user_id: user.id, content });
  };

  if (loading) return <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse">Loading…</div>;

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <p className="text-center text-muted-foreground text-sm py-12">
            {lang === "uk" ? "Поки немає повідомлень. Напишіть перше!" : "Пока нет сообщений. Напишите первое!"}
          </p>
        )}
        {messages.map((m) => {
          const isMe = m.user_id === user?.id;
          const prof = profiles[m.user_id];
          return (
            <div key={m.id} className={`flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarImage src={prof?.avatar_url || ""} />
                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                  {(prof?.display_name || "?")[0]}
                </AvatarFallback>
              </Avatar>
              <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"}`}>
                <p className={`text-[11px] mb-0.5 ${isMe ? "text-right" : ""} text-muted-foreground`}>
                  {prof?.display_name || "…"}
                </p>
                <div className={`rounded-2xl px-3 py-2 text-sm ${isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"}`}>
                  {m.content}
                </div>
                <p className={`text-[10px] mt-0.5 ${isMe ? "text-right" : ""} text-muted-foreground/60`}>
                  {format(new Date(m.created_at), "HH:mm")}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border p-3 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={lang === "uk" ? "Написати повідомлення…" : "Написать сообщение…"}
          className="flex-1"
        />
        <Button size="icon" onClick={send} disabled={!text.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

/* ───── Find Users ───── */
const FindUsers = ({ onSelectUser }: { onSelectUser: (uid: string) => void }) => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  const doSearch = async () => {
    if (!search.trim()) return;
    setLoading(true);
    const { data } = await supabase
      .from("profiles")
      .select("user_id, display_name, avatar_url")
      .ilike("display_name", `%${search.trim()}%`)
      .neq("user_id", user?.id || "")
      .limit(20);
    setUsers(data || []);
    setLoading(false);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="flex gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && doSearch()}
          placeholder={lang === "uk" ? "Пошук за іменем…" : "Поиск по имени…"}
          className="flex-1"
        />
        <Button size="icon" variant="outline" onClick={doSearch}>
          <Search className="w-4 h-4" />
        </Button>
      </div>

      {loading && <p className="text-center text-muted-foreground text-sm animate-pulse">…</p>}

      <div className="space-y-2">
        {users.map((u) => (
          <button
            key={u.user_id}
            onClick={() => onSelectUser(u.user_id)}
            className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors text-left"
          >
            <Avatar className="w-10 h-10">
              <AvatarImage src={u.avatar_url || ""} />
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {(u.display_name || "?")[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm truncate">{u.display_name || "—"}</p>
            </div>
            <Mail className="w-4 h-4 text-muted-foreground" />
          </button>
        ))}
        {!loading && users.length === 0 && search && (
          <p className="text-center text-muted-foreground text-sm py-8">
            {lang === "uk" ? "Нікого не знайдено" : "Никого не найдено"}
          </p>
        )}
      </div>
    </div>
  );
};

/* ───── DM Conversation ───── */
const DMConversation = ({ peerId, onBack }: { peerId: string; onBack: () => void }) => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [peer, setPeer] = useState<Profile | null>(null);
  const [messages, setMessages] = useState<DirectMsg[]>([]);
  const [text, setText] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: prof } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .eq("user_id", peerId)
        .single();
      if (prof) setPeer(prof);

      const { data: msgs } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${user.id})`)
        .order("created_at", { ascending: true })
        .limit(200);
      if (msgs) setMessages(msgs);

      // mark as read
      await supabase
        .from("direct_messages")
        .update({ is_read: true })
        .eq("sender_id", peerId)
        .eq("receiver_id", user.id)
        .eq("is_read", false);
    };
    load();

    const channel = supabase
      .channel(`dm-${peerId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (payload) => {
        const msg = payload.new as DirectMsg;
        if (
          (msg.sender_id === user.id && msg.receiver_id === peerId) ||
          (msg.sender_id === peerId && msg.receiver_id === user.id)
        ) {
          setMessages((prev) => [...prev, msg]);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, peerId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    if (!text.trim() || !user) return;
    const content = text.trim();
    setText("");
    await supabase.from("direct_messages").insert({ sender_id: user.id, receiver_id: peerId, content });
    // Notify receiver via Telegram bot (fire-and-forget)
    fetchEdgeFunction("notify-dm", { json: { receiver_id: peerId, message_preview: content } }).catch(() => {});
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-3 p-3 border-b border-border">
        <Button size="icon" variant="ghost" onClick={onBack}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <Avatar className="w-8 h-8">
          <AvatarImage src={peer?.avatar_url || ""} />
          <AvatarFallback className="text-xs bg-primary/10 text-primary">
            {(peer?.display_name || "?")[0]}
          </AvatarFallback>
        </Avatar>
        <span className="font-medium text-sm">{peer?.display_name || "…"}</span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m) => {
          const isMe = m.sender_id === user?.id;
          return (
            <div key={m.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${isMe ? "bg-primary text-primary-foreground rounded-tr-sm" : "bg-muted rounded-tl-sm"}`}>
                {m.content}
                <p className={`text-[10px] mt-0.5 ${isMe ? "text-primary-foreground/60" : "text-muted-foreground/60"}`}>
                  {format(new Date(m.created_at), "HH:mm")}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </div>

      <div className="border-t border-border p-3 flex gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder={lang === "uk" ? "Написати…" : "Написать…"}
          className="flex-1"
        />
        <Button size="icon" onClick={send} disabled={!text.trim()}>
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

/* ───── DM List (conversations) ───── */
const DMList = ({ onSelectPeer }: { onSelectPeer: (uid: string) => void }) => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [convos, setConvos] = useState<{ peerId: string; lastMsg: string; lastAt: string; unread: number; profile?: Profile }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Get all DMs involving this user
      const { data: msgs } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(500);

      if (!msgs || msgs.length === 0) { setLoading(false); return; }

      // Group by peer
      const peerMap: Record<string, { lastMsg: string; lastAt: string; unread: number }> = {};
      msgs.forEach((m) => {
        const peerId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        if (!peerMap[peerId]) {
          peerMap[peerId] = { lastMsg: m.content, lastAt: m.created_at, unread: 0 };
        }
        if (m.receiver_id === user.id && !m.is_read) peerMap[peerId].unread++;
      });

      const peerIds = Object.keys(peerMap);
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", peerIds);

      const profMap: Record<string, Profile> = {};
      profs?.forEach((p) => (profMap[p.user_id] = p));

      const sorted = peerIds
        .map((pid) => ({ peerId: pid, ...peerMap[pid], profile: profMap[pid] }))
        .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

      setConvos(sorted);
      setLoading(false);
    };
    load();
  }, [user]);

  if (loading) return <div className="flex items-center justify-center h-32 text-muted-foreground animate-pulse">…</div>;

  if (convos.length === 0) {
    return (
      <p className="text-center text-muted-foreground text-sm py-12">
        {lang === "uk" ? "Ще немає повідомлень. Знайдіть користувача!" : "Пока нет сообщений. Найдите пользователя!"}
      </p>
    );
  }

  return (
    <div className="divide-y divide-border">
      {convos.map((c) => (
        <button
          key={c.peerId}
          onClick={() => onSelectPeer(c.peerId)}
          className="w-full flex items-center gap-3 p-4 hover:bg-muted/50 transition-colors text-left"
        >
          <Avatar className="w-10 h-10">
            <AvatarImage src={c.profile?.avatar_url || ""} />
            <AvatarFallback className="bg-primary/10 text-primary text-sm">
              {(c.profile?.display_name || "?")[0]}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm truncate">{c.profile?.display_name || "…"}</p>
            <p className="text-xs text-muted-foreground truncate">{c.lastMsg}</p>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-[10px] text-muted-foreground">{format(new Date(c.lastAt), "HH:mm")}</span>
            {c.unread > 0 && (
              <span className="bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {c.unread}
              </span>
            )}
          </div>
        </button>
      ))}
    </div>
  );
};

/* ───── Main Chat Page ───── */
const Chat = () => {
  const { lang } = useLanguage();
  const [tab, setTab] = useState("community");
  const [selectedPeer, setSelectedPeer] = useState<string | null>(null);

  const handleSelectUser = (uid: string) => {
    setSelectedPeer(uid);
    setTab("dm");
  };

  // If DM conversation is open
  if (selectedPeer) {
    return (
      <div className="h-full flex flex-col">
        <DMConversation peerId={selectedPeer} onBack={() => setSelectedPeer(null)} />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 pb-0">
        <h1 className="text-xl font-display font-bold mb-3">
          {lang === "uk" ? "Чат" : "Чат"}
        </h1>
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="community" className="flex-1 gap-1.5">
              <MessageCircle className="w-3.5 h-3.5" />
              {lang === "uk" ? "Спільнота" : "Общий"}
            </TabsTrigger>
            <TabsTrigger value="dm" className="flex-1 gap-1.5">
              <Mail className="w-3.5 h-3.5" />
              {lang === "uk" ? "Особисті" : "Личные"}
            </TabsTrigger>
            <TabsTrigger value="find" className="flex-1 gap-1.5">
              <Users className="w-3.5 h-3.5" />
              {lang === "uk" ? "Знайти" : "Найти"}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="community" className="flex-1 -mx-4 mt-0" style={{ height: "calc(100dvh - 180px)" }}>
            <CommunityChat />
          </TabsContent>

          <TabsContent value="dm" className="mt-0">
            <DMList onSelectPeer={(uid) => setSelectedPeer(uid)} />
          </TabsContent>

          <TabsContent value="find" className="mt-0 -mx-4">
            <FindUsers onSelectUser={handleSelectUser} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Chat;
