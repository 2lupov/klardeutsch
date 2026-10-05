import { useEffect, useRef, useState } from "react";
import { ImagePlus, Paperclip, Send, Smile, X, FileText } from "lucide-react";
import StickerPicker, { STICKER_PREFIX } from "@/components/chat/StickerPicker";
import ReplyPreview, { type ReplyInfo } from "./ReplyPreview";
import { MAX_IMAGES, validateFile, validateImage, IMAGE_TYPES } from "@/hooks/useChatUpload";

export type ComposerPayload = { text: string; images: File[]; file: File | null };

type Props = {
  placeholder: string;
  reply: ReplyInfo | null;
  onCancelReply: () => void;
  onSend: (p: ComposerPayload) => Promise<boolean>;
  onError: (code: "type" | "size" | "count") => void;
};

const MessageComposer = ({ placeholder, reply, onCancelReply, onSend, onError }: Props) => {
  const [text, setText] = useState("");
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const [stickers, setStickers] = useState(false);
  const imgInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const imagesRef = useRef(images);
  imagesRef.current = images;

  // revoke all previews on unmount
  useEffect(() => () => imagesRef.current.forEach((i) => URL.revokeObjectURL(i.preview)), []);

  const clearImages = () => {
    images.forEach((i) => URL.revokeObjectURL(i.preview));
    setImages([]);
  };

  const pickImages = (list: FileList | null) => {
    if (!list) return;
    const accepted: { file: File; preview: string }[] = [];
    for (const f of Array.from(list)) {
      if (images.length + accepted.length >= MAX_IMAGES) { onError("count"); break; }
      const err = validateImage(f);
      if (err) { onError(err as "type" | "size"); continue; }
      accepted.push({ file: f, preview: URL.createObjectURL(f) });
    }
    setImages((prev) => [...prev, ...accepted]);
  };

  const pickFile = (list: FileList | null) => {
    const f = list?.[0];
    if (!f) return;
    const err = validateFile(f);
    if (err) { onError(err as "type" | "size"); return; }
    setFile(f);
  };

  const removeImage = (idx: number) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const submit = async (override?: string) => {
    const t = (override ?? text).trim();
    if (sending || (!t && !images.length && !file)) return;
    setSending(true);
    const ok = await onSend({ text: t, images: override ? [] : images.map((i) => i.file), file: override ? null : file });
    setSending(false);
    if (ok && !override) {
      setText("");
      clearImages();
      setFile(null);
      if (taRef.current) taRef.current.style.height = "auto";
    }
  };

  return (
    <div className="border-t border-border bg-card/90 backdrop-blur-xl px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)]">
      {reply && <ReplyPreview reply={reply} onCancel={onCancelReply} />}
      {(images.length > 0 || file) && (
        <div className="flex gap-2 mb-2 overflow-x-auto no-scrollbar">
          {images.map((img, i) => (
            <div key={img.preview} className="relative shrink-0">
              <img src={img.preview} alt="" className="w-16 h-16 rounded-lg object-cover" />
              <button onClick={() => removeImage(i)} className="absolute -top-1 -right-1 bg-background border border-border rounded-full p-0.5" aria-label="Remove">
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
          {file && (
            <div className="flex items-center gap-2 px-3 h-16 rounded-lg bg-muted shrink-0 max-w-[220px]">
              <FileText className="w-4 h-4 shrink-0" />
              <span className="text-xs truncate">{file.name}</span>
              <button onClick={() => setFile(null)} aria-label="Remove"><X className="w-3 h-3" /></button>
            </div>
          )}
        </div>
      )}
      <div className="relative flex items-end gap-1.5">
        <StickerPicker open={stickers} onClose={() => setStickers(false)} onSelect={(id) => { setStickers(false); submit(`${STICKER_PREFIX}${id}]`); }} />
        <button onClick={() => imgInput.current?.click()} className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-muted" aria-label="Image">
          <ImagePlus className="w-5 h-5" />
        </button>
        <button onClick={() => fileInput.current?.click()} className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-muted" aria-label="File">
          <Paperclip className="w-5 h-5" />
        </button>
        <textarea
          ref={taRef}
          rows={1}
          value={text}
          placeholder={placeholder}
          onChange={(e) => {
            setText(e.target.value);
            e.target.style.height = "auto";
            e.target.style.height = Math.min(e.target.scrollHeight, 140) + "px";
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submit(); }
          }}
          className="flex-1 min-w-0 resize-none bg-muted/50 rounded-2xl px-4 py-2.5 text-base md:text-sm outline-none focus:ring-1 focus:ring-primary/40"
        />
        <button onClick={() => setStickers((s) => !s)} className="p-2 rounded-full text-muted-foreground hover:text-primary hover:bg-muted" aria-label="Stickers">
          <Smile className="w-5 h-5" />
        </button>
        <button
          onClick={() => submit()}
          disabled={sending}
          className="p-2.5 rounded-full bg-primary text-primary-foreground disabled:opacity-50"
          aria-label="Send"
        >
          <Send className="w-4 h-4" />
        </button>
        <input ref={imgInput} type="file" accept={IMAGE_TYPES.join(",")} multiple hidden onChange={(e) => { pickImages(e.target.files); e.target.value = ""; }} />
        <input ref={fileInput} type="file" hidden onChange={(e) => { pickFile(e.target.files); e.target.value = ""; }} />
      </div>
    </div>
  );
};

export default MessageComposer;
