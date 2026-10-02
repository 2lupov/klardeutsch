import { useEffect, useState } from "react";
import { Volume2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { speakWord } from "@/lib/dutch";
import { getDueCards, reviewCard, type VocabItem } from "@/lib/vocabStore";
import type { SrsGrade } from "@/lib/srs";
import { toast } from "sonner";
import WordImage from "./WordImage";

export default function Review() {
  const [queue, setQueue] = useState<VocabItem[] | null>(null);
  const [idx, setIdx] = useState(0);
  const [flip, setFlip] = useState(false);
  const [done, setDone] = useState(0);

  const load = async () => {
    setQueue(null);
    try {
      const cards = await getDueCards(50);
      setQueue(cards); setIdx(0); setFlip(false); setDone(0);
    } catch (e) { toast.error((e as Error).message); setQueue([]); }
  };

  useEffect(() => { load(); }, []);

  const card = queue?.[idx];
  useEffect(() => { if (card && flip === false) speakWord(card.lemma).catch(() => {}); }, [card?.id]);

  const grade = async (g: SrsGrade) => {
    if (!card) return;
    try { await reviewCard(card, g); } catch (e) { toast.error((e as Error).message); }
    setDone((d) => d + 1);
    setFlip(false);
    setIdx((i) => i + 1);
  };

  if (queue === null) {
    return <div className="h-full flex items-center justify-center text-muted-foreground gap-2"><Loader2 className="h-4 w-4 animate-spin" />Загружаю очередь…</div>;
  }

  if (!queue.length || idx >= queue.length) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-3 text-center text-muted-foreground">
        <p className="text-lg">{done > 0 ? `Готово — ${done} слов повторено 🎉` : "Нечего повторять прямо сейчас 🎉"}</p>
        <p className="text-sm">Новые слова появятся здесь по расписанию по мере прохождения курса и чтения.</p>
        <Button variant="outline" onClick={load}>Обновить</Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col items-center justify-center gap-6">
      <p className="text-sm text-muted-foreground">{idx + 1} / {queue.length}</p>
      <button onClick={() => setFlip(!flip)} className="w-full max-w-md rounded-2xl border border-border bg-background p-6 text-center space-y-4">
        <WordImage item={card!} className="w-full aspect-video" />
        <div>
          <p className="text-3xl font-bold">
            {card!.article && <span className="text-sky-400">{card!.article} </span>}{card!.lemma}
          </p>
          {flip ? (
            <div className="mt-4 space-y-1">
              <p className="text-xl">{card!.translation_ru}</p>
              {card!.translation_de && <p className="text-muted-foreground">🇩🇪 {card!.translation_de}</p>}
              {card!.example && <p className="text-sm italic text-muted-foreground mt-3">{card!.example}</p>}
            </div>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">нажми, чтобы перевернуть</p>
          )}
        </div>
      </button>

      <div className="flex gap-2">
        <Button variant="outline" size="icon" onClick={() => speakWord(card!.lemma)}><Volume2 className="h-4 w-4" /></Button>
      </div>

      {flip && (
        <div className="flex gap-2">
          <Button variant="destructive" onClick={() => grade("again")}>Забыл</Button>
          <Button variant="outline" onClick={() => grade("hard")}>Трудно</Button>
          <Button onClick={() => grade("good")}>Хорошо</Button>
          <Button variant="secondary" onClick={() => grade("easy")}>Легко</Button>
        </div>
      )}
    </div>
  );
}
