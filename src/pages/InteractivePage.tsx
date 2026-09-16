import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import InteractiveScene from "@/components/interactive/InteractiveScene";
import { fetchInteractivePage, type InteractivePage as IPage } from "@/lib/interactivePages";

export default function InteractivePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [page, setPage] = useState<IPage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetchInteractivePage(id)
      .then(setPage)
      .catch(() => setPage(null))
      .finally(() => setLoading(false));
  }, [id]);

  return (
    <div className="h-[100dvh] overflow-y-auto bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 px-4 py-3 bg-background/90 backdrop-blur border-b border-border">
        <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-muted/60">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0">
          <h1 className="font-display font-bold text-foreground truncate">{page?.title || "Інтерактивна сторінка"}</h1>
          {page?.level ? <p className="text-xs text-muted-foreground">Niveau {page.level}</p> : null}
        </div>
      </header>

      <main className="p-4 pb-24 max-w-3xl mx-auto">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : page ? (
          <InteractiveScene scene={page.scene} />
        ) : (
          <p className="text-sm text-muted-foreground py-20 text-center">Сторінку не знайдено або вона ще не опублікована.</p>
        )}
      </main>
    </div>
  );
}
