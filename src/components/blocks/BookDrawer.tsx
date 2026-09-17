import { useEffect, useState } from "react";
import { BookMarked } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/** Шторка з оригінальною сторінкою підручника для звірки. */
export default function BookDrawer({ imagePaths }: { imagePaths: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);

  useEffect(() => {
    let alive = true;
    (async () => {
      const out: string[] = [];
      for (const p of imagePaths) {
        const bucket = p.startsWith("pdf/") || p.startsWith("reading/") || p.startsWith("audio/") ? "tutoring-materials" : "book-pages";
        const { data } = await supabase.storage.from(bucket).createSignedUrl(p, 3600);
        if (data?.signedUrl) out.push(data.signedUrl);
      }
      if (alive) setUrls(out);
    })();
    return () => {
      alive = false;
    };
  }, [imagePaths]);

  if (imagePaths.length === 0) return null;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm">
          <BookMarked className="mr-1 h-4 w-4" />
          Підручник
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>Сторінки підручника</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-3">
          {urls.map((u, i) => (
            <img key={i} src={u} alt={`Сторінка підручника ${i + 1}`} className="w-full rounded-xl border" loading="lazy" />
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
