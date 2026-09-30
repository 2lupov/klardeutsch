import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { slideUrls, type Presentation } from "@/lib/presentations";
import HtmlSlides from "@/components/live/HtmlSlides";

const cache = new Map<string, { title: string; urls: string[]; html?: string | null }>();

/** Показ одного слайда презентації (учню і в превʼю викладача). */
export default function PresentationView({
  presentationId,
  page,
  compact,
  syncKey,
}: {
  syncKey?: string;
  presentationId: string;
  page: number;
  compact?: boolean;
}) {
  const [data, setData] = useState<{ title: string; urls: string[]; html?: string | null } | null>(
    cache.get(presentationId) ?? null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    const cached = cache.get(presentationId);
    if (cached) {
      setData(cached);
      return;
    }
    (async () => {
      try {
        const { data: row, error: e } = await supabase
          .from("presentations")
          .select("*")
          .eq("id", presentationId)
          .maybeSingle();
        if (e) throw e;
        if (!row) throw new Error("Презентацію не знайдено");
        const p = row as unknown as Presentation;
        const urls = await slideUrls(p.slide_paths ?? []);
        const value = { title: p.title, urls, html: (p as any).html ?? null };
        cache.set(presentationId, value);
        if (alive) setData(value);
      } catch (err: any) {
        if (alive) setError(err.message || "Помилка завантаження");
      }
    })();
    return () => {
      alive = false;
    };
  }, [presentationId]);

  if (error) return <div className="p-6 text-sm text-muted-foreground">{error}</div>;
  if (!data)
    return (
      <div className="h-full min-h-[200px] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );

  if (data.html)
    return (
      <div className="h-full w-full min-h-[60vh] flex flex-col gap-2 p-2">
        <HtmlSlides html={data.html} syncKey={syncKey ? `${syncKey}:${presentationId}` : undefined} className="flex-1 min-h-[55vh] w-full rounded-xl border-0 bg-white shadow-lg" />
        <div className={`text-center text-muted-foreground ${compact ? "text-[11px]" : "text-sm"} font-bold`}>{data.title}</div>
      </div>
    );

  const total = data.urls.length;
  const idx = Math.min(Math.max(1, page), Math.max(1, total)) - 1;
  const url = data.urls[idx];

  return (
    <div className="h-full w-full flex flex-col items-center justify-center gap-3 p-2">
      {url ? (
        <img
          src={url}
          alt={`${data.title} — слайд ${idx + 1}`}
          className="max-h-full max-w-full rounded-xl shadow-lg bg-white object-contain"
        />
      ) : (
        <div className="text-sm text-muted-foreground">Слайд недоступний</div>
      )}
      <div className={`text-muted-foreground ${compact ? "text-[11px]" : "text-sm"} font-bold`}>
        {data.title} · {idx + 1} / {total}
      </div>
    </div>
  );
}
