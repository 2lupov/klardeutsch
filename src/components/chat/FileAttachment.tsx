import { Download, FileText } from "lucide-react";

const FileAttachment = ({ url, name, isMe }: { url: string; name: string; isMe: boolean }) => (
  <a
    href={url}
    target="_blank"
    rel="noopener noreferrer"
    className={`flex items-center gap-2.5 p-2 rounded-xl min-w-0 ${isMe ? "bg-primary-foreground/10" : "bg-muted/60"}`}
  >
    <FileText className="w-5 h-5 shrink-0" />
    <span className="text-sm truncate flex-1 min-w-0">{name}</span>
    <Download className="w-4 h-4 shrink-0 opacity-70" />
  </a>
);

export default FileAttachment;
