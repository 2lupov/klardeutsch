import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Search, Trash2 } from "lucide-react";
import AddMyWordForm, { MyWord } from "@/components/dictionary/AddMyWordForm";
import { toast } from "sonner";

interface Row {
  id: string;
  created_at: string;
  content: any;
  class_id: string;
  classTitle: string;
  classDate: string;
}

export default function StudentDictionary() {
  const { user } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState<MyWord[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await supabase
        .from("custom_words")
        .select("id, german, russian, article, example, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setMine((data || []) as unknown as MyWord[]);
    })();
  }, [user]);

  const removeMine = async (id: string) => {
    setMine((m) => m.filter((w) => w.id !== id));
    const { error } = await supabase.from("custom_words").delete().eq("id", id);
    if (error) toast.error("Не вдалося видалити");
  };

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: classes } = await supabase
        .from("live_classes")
        .select("id, title, started_at")
        .eq("student_id", user.id)
        .order("started_at", { ascending: false });
      const list = classes || [];
      if (list.length === 0) { setLoading(false); return; }
      const { data: items } = await supabase
        .from("live_class_items")
        .select("id, class_id, content, created_at")
        .in("class_id", list.map((c: any) => c.id))
        .eq("kind", "word")
        .order("created_at", { ascending: true });
      const meta = new Map(list.map((c: any) => [c.id, c]));
      setRows(
        (items || []).map((it: any) => {
          const c: any = meta.get(it.class_id);
          return {
            id: it.id,
            created_at: it.created_at,
            content: it.content,
            class_id: it.class_id,
            classTitle: c?.title || "Урок",
            classDate: c?.started_at || it.created_at,
          };
        }),
      );
      setLoading(false);
    })();
  }, [user]);

  const groups = useMemo(() => {
    const s = q.trim().toLowerCase();
    const filtered = s
      ? rows.filter((r) =>
          [r.content?.term, r.content?.translation, r.content?.example]
            .filter(Boolean)
            .some((v: string) => String(v).toLowerCase().includes(s)))
      : rows;
    const map = new Map<string, Row[]>();
    for (const r of filtered) {
      const key = r.class_id;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).map(([, items]) => ({
      title: items[0].classTitle,
      date: items[0].classDate,
      items,
    })).sort((a, b) => +new Date(b.date) - +new Date(a.date));
  }, [rows, q]);

  const myFiltered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return mine;
    return mine.filter((w) =>
      [w.german, w.russian, w.example].filter(Boolean).some((v) => String(v).toLowerCase().includes(s)));
  }, [mine, q]);

  return (
    <div className="max-w-2xl mx-auto px-5 py-8">
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-widest text-primary font-bold">KLAR</p>
        <h1 className="font-display text-2xl font-bold text-foreground">Словник</h1>
        <p className="text-sm text-muted-foreground mt-1">Слова та фрази з ваших уроків</p>
      </header>

      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Пошук…"
          className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm"
        />
      </div>

      <div className="mb-8 space-y-4">
        <AddMyWordForm onAdded={(w) => setMine((m) => [w, ...m])} />

        {myFiltered.length > 0 && (
          <section>
            <div className="flex items-baseline justify-between mb-3 border-b border-border pb-2">
              <h2 className="font-display font-semibold text-foreground text-sm">Мої слова</h2>
              <span className="text-xs text-muted-foreground">{myFiltered.length}</span>
            </div>
            <ul className="divide-y divide-border/60">
              {myFiltered.map((w) => (
                <li key={w.id} className="py-3 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-foreground">
                      {w.article && <span className="text-primary mr-1">{w.article}</span>}
                      {w.german}
                    </p>
                    {w.example && <p className="text-xs italic text-muted-foreground/80 mt-1">{w.example}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm text-muted-foreground text-right">{w.russian}</span>
                    <button
                      onClick={() => removeMine(w.id)}
                      className="text-muted-foreground hover:text-red-500"
                      title="Видалити"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground animate-pulse">Завантаження…</p>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">Поки що немає слів з уроків — але ви вже можете додавати свої вище.</p>
      ) : (
        <div className="space-y-8">
          {groups.map((g, i) => (
            <section key={i}>
              <div className="flex items-baseline justify-between mb-3 border-b border-border pb-2">
                <h2 className="font-display font-semibold text-foreground text-sm">{g.title}</h2>
                <span className="text-xs text-muted-foreground">
                  {new Date(g.date).toLocaleDateString("uk-UA")}
                </span>
              </div>
              <ul className="divide-y divide-border/60">
                {g.items.map((r) => (
                  <li key={r.id} className="py-3">
                    <div className="flex items-baseline justify-between gap-4">
                      <p className="font-display text-foreground">
                        {r.content?.article && <span className="text-primary mr-1">{r.content.article}</span>}
                        {r.content?.term}
                      </p>
                      <p className="text-sm text-muted-foreground text-right">{r.content?.translation}</p>
                    </div>
                    {r.content?.example && (
                      <p className="text-xs italic text-muted-foreground/80 mt-1">{r.content.example}</p>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
