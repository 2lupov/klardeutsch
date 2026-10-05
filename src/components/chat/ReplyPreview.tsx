import { X } from "lucide-react";

export type ReplyInfo = { id: string; content: string; sender: string };

const ReplyPreview = ({ reply, onCancel }: { reply: ReplyInfo; onCancel: () => void }) => (
  <div className="flex items-center gap-2 px-3 py-2 mb-2 rounded-xl bg-muted/60 border-l-2 border-primary">
    <div className="min-w-0 flex-1 text-xs">
      <p className="font-semibold text-primary truncate">{reply.sender}</p>
      <p className="text-muted-foreground truncate">{reply.content}</p>
    </div>
    <button onClick={onCancel} className="p-1 rounded-full hover:bg-muted text-muted-foreground" aria-label="Cancel reply">
      <X className="w-4 h-4" />
    </button>
  </div>
);

export default ReplyPreview;
