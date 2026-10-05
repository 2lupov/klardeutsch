import { format } from "date-fns";
import { Reply, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import MediaEmbed, { hasMediaEmbed } from "@/components/chat/MediaEmbed";
import { isStickerMessage, getStickerSrc } from "@/components/chat/StickerPicker";
import ImageAttachment from "./ImageAttachment";
import FileAttachment from "./FileAttachment";
import type { CommunityMessage, ChatProfile } from "@/hooks/useCommunityMessages";

type Props = {
  msg: CommunityMessage;
  author?: ChatProfile;
  isMe: boolean;
  canDelete: boolean;
  onReply: () => void;
  onDelete: () => void;
  onAuthorClick: () => void;
  onJumpTo?: (id: string) => void;
};

const PLACEHOLDERS = new Set(["📷", "📎", "📷📎"]);

const imagesOf = (m: CommunityMessage): string[] => {
  const arr = Array.isArray(m.image_urls) ? (m.image_urls as unknown[]).filter((x): x is string => typeof x === "string") : [];
  if (arr.length) return arr;
  return m.image_url ? [m.image_url] : [];
};

const MessageBubble = ({ msg, author, isMe, canDelete, onReply, onDelete, onAuthorClick, onJumpTo }: Props) => {
  const name = author?.display_name || "—";
  const images = imagesOf(msg);
  const sticker = isStickerMessage(msg.content);
  const text = PLACEHOLDERS.has(msg.content) ? "" : msg.content;

  return (
    <div id={`msg-${msg.id}`} className={`group flex gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
      {!isMe && (
        <button onClick={onAuthorClick} className="shrink-0 mt-auto">
          <Avatar className="w-8 h-8">
            <AvatarImage src={author?.avatar_url || ""} className="object-cover" />
            <AvatarFallback className="text-[10px] bg-primary/10 text-primary">{name[0]}</AvatarFallback>
          </Avatar>
        </button>
      )}
      <div className={`flex flex-col min-w-0 max-w-[80%] ${isMe ? "items-end" : "items-start"}`}>
        {!isMe && (
          <button onClick={onAuthorClick} className="text-[11px] mb-0.5 px-1 font-medium text-muted-foreground hover:text-primary truncate max-w-full">
            {name}
          </button>
        )}
        {msg.reply_to_content && (
          <button
            onClick={() => msg.reply_to_id && onJumpTo?.(msg.reply_to_id)}
            className={`text-[11px] mb-1 px-2.5 py-1 rounded-lg border-l-2 border-primary/50 bg-muted/60 max-w-full truncate text-left`}
          >
            <span className="font-semibold text-primary/80">{msg.reply_to_sender || "?"}</span>
            <span className="text-muted-foreground ml-1">{msg.reply_to_content.slice(0, 80)}</span>
          </button>
        )}
        <div
          className={`rounded-2xl text-sm leading-relaxed break-words max-w-full ${
            sticker
              ? "p-0"
              : isMe
                ? "bg-primary text-primary-foreground rounded-br-md shadow-sm"
                : "bg-card border border-border rounded-bl-md shadow-sm"
          } ${sticker ? "" : images.length || hasMediaEmbed(msg.content) ? "p-1.5" : "px-3.5 py-2"}`}
        >
          {sticker ? (
            <img src={getStickerSrc(msg.content) || ""} alt="sticker" className="w-28 h-28 object-contain" loading="lazy" />
          ) : (
            <div className="space-y-1.5">
              {images.length > 0 && <ImageAttachment urls={images} />}
              {msg.file_url && <FileAttachment url={msg.file_url} name={msg.file_name || "file"} isMe={isMe} />}
              {text && (hasMediaEmbed(text) ? <MediaEmbed url={text} isMe={isMe} /> : <p className={`whitespace-pre-wrap ${images.length || msg.file_url ? "px-2 pb-1" : ""}`}>{text}</p>)}
            </div>
          )}
        </div>
        <div className={`flex items-center gap-1 mt-0.5 px-1 ${isMe ? "flex-row-reverse" : ""}`}>
          <span className="text-[10px] text-muted-foreground/60">{format(new Date(msg.created_at), "dd.MM HH:mm")}</span>
          <button onClick={onReply} aria-label="Reply" className="p-1 text-muted-foreground/60 hover:text-primary md:opacity-0 group-hover:opacity-100 transition-opacity">
            <Reply className="w-3.5 h-3.5" />
          </button>
          {canDelete && (
            <button onClick={onDelete} aria-label="Delete" className="p-1 text-muted-foreground/60 hover:text-destructive md:opacity-0 group-hover:opacity-100 transition-opacity">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
