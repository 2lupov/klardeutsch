import { useEffect, useState } from "react";
import { Library, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { normalizeKit, type LessonKit } from "@/lib/lesson-kits";

interface Props {
  lessonId: string;
  startSortOrder: number;
  onInserted: () => void;
}

/** Додає готовий урок із бібліотеки (Генератор уроку з книги) у живий урок. */
export default function KitPicker({ lessonId, startSortOrder, onInserted }: Props) {
  const [open, setOpen] = useState(false);
  const [kits, setKits] = useState<LessonKit[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    (async () => {
      const { data } = await supabase.from("lesson_kits").select("*").neq("kind", "minicourse").order("created_at", { ascending: false }).limit(50);
      setKits(((data ?? []) as any[]).map(normalizeKit));
    })();
  }, [open]);

  const insert = async (kit: LessonKit) => {
    if (kit.blocks.length === 0) return toast({ title: "У цьому уроці немає блоків", variant: "destructive" });
    setBusy(kit.id);
    const rows = kit.blocks.map((b, i) => ({
      lesson_id: lessonId,
      type: b.type,
      title: b.title ?? null,
      payload: (b.payload ?? {}) as any,
      sort_order: startSortOrder + i,
      visible_to_student: true,
      source: "kit",
    }));
    const { error } = await supabase.from("tutoring_lesson_blocks").insert(rows);
    setBusy(null);
    if (error) return toast({ title: "Не вдалося додати", description: error.message, variant: "destructive" });
    toast({ title: "Урок додано", description: `Блоків: ${rows.length}` });
    setOpen(false);
    onInserted();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Library className="mr-1 h-4 w-4" />
          З бібліотеки
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Готові уроки з книги</DialogTitle>
        </DialogHeader>
        {kits.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Порожньо. Створіть урок в адмінці → «Генератор уроку з книги».
          </p>
        ) : (
          <div className="space-y-2">
            {kits.map((k) => (
              <button
                key={k.id}
                onClick={() => insert(k)}
                disabled={busy !== null}
                className="flex w-full items-center gap-3 rounded-xl border p-3 text-left hover:bg-muted/50 disabled:opacity-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{k.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {k.level ?? "—"} · {k.focus === "arbeitsbuch" ? "Arbeitsbuch" : "Kursbuch"} · {k.blocks.length} блоків
                  </p>
                </div>
                {busy === k.id && <Loader2 className="h-4 w-4 animate-spin" />}
              </button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
