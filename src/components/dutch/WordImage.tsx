import { useEffect, useState } from "react";
import { ImageOff, Loader2 } from "lucide-react";
import { fetchWordImage, type VocabItem } from "@/lib/vocabStore";

// Картинка подгружается лениво и только по одному разу на слово — результат
// (или факт, что картинки не нашлось) кэшируется прямо в строке dutch_vocab
// через fetchWordImage, так что при повторном показе того же слова запроса
// в Pexels уже не будет.
export default function WordImage({ item, className = "w-full aspect-square" }: { item: VocabItem; className?: string }) {
  const alreadyTried = item.image_url !== null && item.image_url !== undefined;
  const [url, setUrl] = useState<string | null>(item.image_url || null);
  const [credit, setCredit] = useState<string | null>(item.image_credit);
  const [loading, setLoading] = useState(!alreadyTried);

  useEffect(() => {
    if (alreadyTried) return;
    let cancelled = false;
    fetchWordImage(item)
      .then((res) => { if (!cancelled) { setUrl(res.url); setCredit(res.credit); } })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item.id]);

  if (loading) {
    return <div className={`${className} rounded-lg bg-muted flex items-center justify-center shrink-0`}><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>;
  }
  if (!url) {
    return <div className={`${className} rounded-lg bg-muted flex items-center justify-center shrink-0`}><ImageOff className="h-4 w-4 text-muted-foreground" /></div>;
  }
  return (
    <div className={`${className} rounded-lg overflow-hidden relative group shrink-0`}>
      <img src={url} alt="" className="w-full h-full object-cover" />
      {credit && (
        <span className="absolute bottom-0 inset-x-0 bg-black/55 text-white text-[9px] px-1 py-0.5 opacity-0 group-hover:opacity-100 transition truncate">
          {credit}
        </span>
      )}
    </div>
  );
}
