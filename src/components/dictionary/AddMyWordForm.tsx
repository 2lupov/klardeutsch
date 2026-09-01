import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus } from "lucide-react";

export interface MyWord {
  id: string;
  german: string;
  russian: string;
  article: string | null;
  example: string | null;
  created_at: string;
}

/** Учень сам додає слово у свій словник (працює і на уроці, і поза уроком). */
export async function addMyWord(
  userId: string,
  w: { german: string; russian: string; article?: string | null; example?: string | null },
) {
  const { data, error } = await supabase
    .from("custom_words")
    .insert({
      user_id: userId,
      german: w.german.trim(),
      russian: (w.russian || "").trim(),
      article: w.article || null,
      example: w.example || null,
    })
    .select("id, german, russian, article, example, created_at")
    .single();
  if (error) throw error;
  return data as unknown as MyWord;
}

const ARTICLES = ["", "der", "die", "das"];

export default function AddMyWordForm({
  onAdded,
  compact,
}: {
  onAdded?: (w: MyWord) => void;
  compact?: boolean;
}) {
  const { user } = useAuth();
  const [german, setGerman] = useState("");
  const [russian, setRussian] = useState("");
  const [article, setArticle] = useState("");
  const [example, setExample] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!user || !german.trim()) return;
    setBusy(true);
    try {
      const w = await addMyWord(user.id, { german, russian, article, example });
      onAdded?.(w);
      setGerman(""); setRussian(""); setArticle(""); setExample("");
      toast.success("Слово додано у словник");
    } catch (e: any) {
      toast.error(e?.message || "Не вдалося додати слово");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <p className="font-display font-semibold text-foreground text-sm">Додати своє слово</p>
      <div className="flex gap-2">
        <select
          value={article}
          onChange={(e) => setArticle(e.target.value)}
          className="w-20 px-2 py-2 rounded-xl border border-border bg-background text-sm"
        >
          {ARTICLES.map((a) => (
            <option key={a} value={a}>{a || "—"}</option>
          ))}
        </select>
        <input
          value={german}
          onChange={(e) => setGerman(e.target.value)}
          placeholder="Слово німецькою"
          className="flex-1 min-w-0 px-3 py-2 rounded-xl border border-border bg-background text-sm"
        />
      </div>
      <input
        value={russian}
        onChange={(e) => setRussian(e.target.value)}
        placeholder="Переклад"
        className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
      />
      {!compact && (
        <input
          value={example}
          onChange={(e) => setExample(e.target.value)}
          placeholder="Приклад (необов’язково)"
          className="w-full px-3 py-2 rounded-xl border border-border bg-background text-sm"
        />
      )}
      <button
        onClick={submit}
        disabled={busy || !german.trim()}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-display font-semibold disabled:opacity-50"
      >
        <Plus className="w-4 h-4" />
        {busy ? "Додаю…" : "Додати"}
      </button>
    </div>
  );
}
