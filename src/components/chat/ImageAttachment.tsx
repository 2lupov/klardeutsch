import { useState } from "react";
import { X } from "lucide-react";

const ImageAttachment = ({ urls }: { urls: string[] }) => {
  const [open, setOpen] = useState<number | null>(null);
  const cols = urls.length === 1 ? "grid-cols-1" : "grid-cols-2";
  return (
    <>
      <div className={`grid ${cols} gap-1`}>
        {urls.map((u, i) => (
          <button key={u} onClick={() => setOpen(i)} className="block overflow-hidden rounded-xl">
            <img src={u} alt="" loading="lazy" className={`w-full object-cover ${urls.length === 1 ? "max-h-72" : "h-32"}`} />
          </button>
        ))}
      </div>
      {open !== null && (
        <div className="fixed inset-0 z-50 bg-background/95 flex items-center justify-center p-4" onClick={() => setOpen(null)}>
          <button className="absolute top-4 right-4 p-2 rounded-full bg-muted" aria-label="Close"><X className="w-5 h-5" /></button>
          <img src={urls[open]} alt="" className="max-w-full max-h-full object-contain rounded-xl" />
        </div>
      )}
    </>
  );
};

export default ImageAttachment;
