import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Original uploaded pages stay separate from the generated blocks; never substitute AI art. */
export default function KitPageImages({ paths, bucket = "tutoring-materials" }: { paths: string[]; bucket?: "tutoring-materials" | "presentation-slides" }) {
  const [urls, setUrls] = useState<string[]>([]);
  // Parents can pass a new array on every render; sign only when the actual paths change.
  const pathsKey = JSON.stringify(paths);
  useEffect(() => {
    let live = true;
    const currentPaths: string[] = JSON.parse(pathsKey);
    if (!currentPaths.length) { setUrls([]); return; }
    setUrls([]);
    supabase.storage.from(bucket).createSignedUrls(currentPaths, 3600).then(({ data }) => {
      if (live) setUrls((data ?? []).map((item) => item.signedUrl).filter((url): url is string => !!url));
    });
    return () => { live = false; };
  }, [pathsKey, bucket]);
  if (!paths.length) return null;
  return <details className="rounded-xl border border-border p-3 text-sm">
    <summary className="cursor-pointer font-semibold">Оригінальні {bucket === "presentation-slides" ? "слайди" : "сторінки"} · {paths.length}</summary>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">{urls.map((url, i) => <img key={url} src={url} alt={`Сторінка ${i + 1}`} loading="lazy" className="w-full border border-border object-contain" />)}</div>
    {!urls.length && <p className="mt-3 text-muted-foreground">Завантаження сторінок або немає доступу.</p>}
  </details>;
}