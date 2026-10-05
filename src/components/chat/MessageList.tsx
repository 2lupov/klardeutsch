import { useEffect, useLayoutEffect, useRef } from "react";
import MessageBubble from "./MessageBubble";
import type { CommunityMessage, ChatProfile } from "@/hooks/useCommunityMessages";

type Props = {
  messages: CommunityMessage[];
  profiles: Record<string, ChatProfile>;
  myId?: string;
  isAdmin: boolean;
  hasMore: boolean;
  loadingOlder: boolean;
  emptyText: string;
  onLoadOlder: () => Promise<number>;
  onReply: (m: CommunityMessage) => void;
  onDelete: (m: CommunityMessage) => void;
  onAuthorClick: (userId: string) => void;
};

const MessageList = ({ messages, profiles, myId, isAdmin, hasMore, loadingOlder, emptyText, onLoadOlder, onReply, onDelete, onAuthorClick }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const prevHeight = useRef<number | null>(null);
  const lastId = useRef<string | null>(null);
  const nearBottom = useRef(true);

  // keep position when older messages prepend; stick to bottom on new ones
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prevHeight.current !== null) {
      el.scrollTop = el.scrollHeight - prevHeight.current;
      prevHeight.current = null;
      return;
    }
    const newest = messages[messages.length - 1]?.id ?? null;
    if (newest !== lastId.current) {
      const mine = messages[messages.length - 1]?.user_id === myId;
      if (nearBottom.current || mine || lastId.current === null) el.scrollTop = el.scrollHeight;
      lastId.current = newest;
    }
  }, [messages, myId]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onScroll = () => {
      nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
      if (el.scrollTop < 80 && hasMore && !loadingOlder) {
        prevHeight.current = el.scrollHeight;
        onLoadOlder().then((n) => { if (!n) prevHeight.current = null; });
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [hasMore, loadingOlder, onLoadOlder]);

  const jumpTo = (id: string) => document.getElementById(`msg-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <div ref={ref} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-3 md:px-6 py-4 space-y-3">
      {loadingOlder && <p className="text-center text-xs text-muted-foreground">…</p>}
      {!messages.length && <p className="text-center text-sm text-muted-foreground py-16">{emptyText}</p>}
      {messages.map((m) => (
        <MessageBubble
          key={m.id}
          msg={m}
          author={profiles[m.user_id]}
          isMe={m.user_id === myId}
          canDelete={m.user_id === myId || isAdmin}
          onReply={() => onReply(m)}
          onDelete={() => onDelete(m)}
          onAuthorClick={() => onAuthorClick(m.user_id)}
          onJumpTo={jumpTo}
        />
      ))}
    </div>
  );
};

export default MessageList;
