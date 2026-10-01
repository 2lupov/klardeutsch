import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Search, Loader2, X, Plus, Check, BookOpen, Sparkles } from "lucide-react";
import { addMyWord, MyWord } from "./AddMyWordForm";

interface WordData {
  word: string;
  article?: string;
  translation: string;
  part_of_speech?: string;
  part_of_speech_translation?: string;
  level?: string;
  meanings?: { meaning: string; example_de: string; example_translation: string }[];
  conjugation?: {
    präsens?: Record<string, string>;
    präteritum?: Record<string, string>;
    perfekt?: string;
    governing?: string;
  };
  noun_forms?: { singular: string; plural: string; genitiv: string };
  synonyms?: string[];
}

const ARTICLE_COLORS: Record<string, string> = {
  der: "bg-blue-500/15 text-blue-500",
  die: "bg-pink-500/15 text-pink-500",
  das: "bg-emerald-500/15 text-emerald-600",
};

const Forms = ({ title, data }: { title: string; data: Record<string, string> }) => {
  const rows = [
    ["ich", data.ich],
    ["du", data.du],
    ["er/sie/es", data.er_sie_es],
    ["wir", data.wir],
    ["ihr", data.ihr],
    ["sie/Sie", data.sie_Sie],
  ].filter(([, v]) => Boolean(v));
  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-3 py-2 bg-secondary/60 border-b border-border text-xs font-display font-semibold">{title}</div>
      <div className="grid grid-cols-2">
        {rows.map(([p, f], i) => (
          <div key={p} className={`px-3 py-2 flex gap-2 text-sm ${i % 2 === 0 ? "border-r border-border" : ""} ${i < rows.length - 2 ? "border-b border-border/50" : ""}`}>
            <span className="text-xs text-muted-foreground w-16 shrink-0">{p}</span>
            <span className="font-medium">{f}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/** ШІ-словник панди: учень вводить незнайоме слово і одразу може зберегти його у свій словник. */
export function PandaLookupPanel({ onSaved, targetUserId }: { onSaved?: (w: MyWord) => void; targetUserId?: string }) {
  const { user: me } = useAuth();
  const user = targetUserId ? { id: targetUserId } : me;
  const [wLang, setWLang] = useState<"uk" | "ru">("uk");
  useEffect(() => {
    if (!user?.id) return;
    supabase.from("profiles").select("preferred_lang").eq("user_id", user.id).maybeSingle()
      .then(({ data }) => setWLang((data as any)?.preferred_lang === "ru" ? "ru" : "uk"));
  }, [user?.id]);
  const [word, setWord] = useState("");
  const [data, setData] = useState<WordData | null>(null);
  const [plain, setPlain] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const lookup = async (override?: string) => {
    const q = (override ?? word).trim();
    if (!q || loading) return;
    if (override) setWord(override);
    setLoading(true);
    setData(null);
    setPlain("");
    setSaved(false);
    try {
      const { data: res, error } = await supabase.functions.invoke("lookup-word", {
        body: { word: q, lang: wLang },
      });
      if (error) throw error;
      if (res?.structured) setData(res.structured as WordData);
      else setPlain(res?.result || "Нічого не знайдено");
    } catch {
      setPlain("Не вдалося знайти слово. Спробуйте ще раз.");
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    if (!user || !data || saving) return;
    setSaving(true);
    try {
      const { data: exists } = await supabase
        .from("custom_words")
        .select("id")
        .eq("user_id", user.id)
        .eq("german", data.word)
        .maybeSingle();
      if (exists) {
        setSaved(true);
        toast.success("Вже у словнику");
        return;
      }
      const w = await addMyWord(user.id, {
        german: data.word,
        russian: data.translation,
        article: data.article || null,
        example: data.meanings?.[0]?.example_de || null,
      });
      setSaved(true);
      onSaved?.(w);
      toast.success(targetUserId ? "Додано у словник учня 🐼" : "Додано у словник 🐼");
    } catch (e: any) {
      toast.error(e?.message || "Не вдалося зберегти");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={word}
            onChange={(e) => setWord(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && lookup()}
            placeholder="Незнайоме слово німецькою…"
            maxLength={60}
            className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-border bg-background text-sm"
          />
        </div>
        <button
          onClick={() => lookup()}
          disabled={!word.trim() || loading}
          className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-display font-semibold disabled:opacity-50 flex items-center gap-2"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
          <span className="hidden sm:inline">Знайти</span>
        </button>
      </div>

      {loading && <p className="text-sm text-muted-foreground animate-pulse">Панда шукає слово…</p>}

      {!loading && data && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {data.article && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${ARTICLE_COLORS[data.article] || "bg-secondary"}`}>
                      {data.article}
                    </span>
                  )}
                  <h3 className="text-xl font-display font-bold text-foreground">{data.word}</h3>
                  {data.level && (
                    <span className="text-[11px] px-2 py-0.5 rounded-md border border-border text-muted-foreground">{data.level}</span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">{data.translation}</p>
                {data.part_of_speech && (
                  <p className="text-[11px] text-muted-foreground/80 mt-1">
                    {data.part_of_speech}
                    {data.part_of_speech_translation ? ` (${data.part_of_speech_translation})` : ""}
                  </p>
                )}
              </div>
              {user && (
                <button
                  onClick={save}
                  disabled={saved || saving}
                  title="Додати у мій словник"
                  className={`shrink-0 p-2.5 rounded-xl border transition ${saved ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600" : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"}`}
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {data.meanings && data.meanings.length > 0 && (
            <ul className="rounded-2xl border border-border bg-card divide-y divide-border/50">
              {data.meanings.map((m, i) => (
                <li key={i} className="p-4">
                  <p className="text-sm font-semibold text-foreground">{m.meaning}</p>
                  <div className="mt-2 pl-3 border-l-2 border-primary/25">
                    <p className="text-sm italic text-foreground/80">{m.example_de}</p>
                    <p className="text-xs text-muted-foreground">{m.example_translation}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {data.conjugation && (
            <div className="space-y-2">
              {data.conjugation.präsens && <Forms title="Präsens" data={data.conjugation.präsens} />}
              {data.conjugation.präteritum && <Forms title="Präteritum" data={data.conjugation.präteritum} />}
              {data.conjugation.perfekt && (
                <div className="rounded-xl border border-border px-3 py-2 text-sm">
                  <span className="font-display font-semibold mr-2">Perfekt:</span>
                  {data.conjugation.perfekt}
                </div>
              )}
            </div>
          )}

          {data.noun_forms && (
            <div className="grid grid-cols-3 gap-2">
              {[
                ["Однина", data.noun_forms.singular],
                ["Множина", data.noun_forms.plural],
                ["Genitiv", data.noun_forms.genitiv],
              ].map(([l, v]) => (
                <div key={l} className="rounded-xl border border-border p-2.5 text-center">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</p>
                  <p className="text-sm font-semibold">{v}</p>
                </div>
              ))}
            </div>
          )}

          {data.synonyms && data.synonyms.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {data.synonyms.map((s, i) => (
                <button
                  key={i}
                  onClick={() => lookup(s)}
                  className="px-3 py-1.5 rounded-xl border border-border bg-secondary/50 text-sm hover:border-primary/40"
                >
                  {s}
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {!loading && !data && plain && (
        <div className="rounded-2xl border border-border bg-card p-4 text-sm whitespace-pre-wrap">{plain}</div>
      )}
    </div>
  );
}

/** Вікно словника поверх уроку — нікуди не переходить, лише пошук + «додати у мій словник». */
export function PandaLookupDialog({
  open,
  onOpenChange,
  onSaved,
  targetUserId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSaved?: (w: MyWord) => void;
  targetUserId?: string;
}) {
  const setOpen = onOpenChange;
  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-background/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6"
            onClick={() => setOpen(false)}
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-border bg-background p-5"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <h2 className="font-display font-bold text-foreground">Панда-словник</h2>
                </div>
                <button onClick={() => setOpen(false)} className="p-2 rounded-xl border border-border text-muted-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <PandaLookupPanel onSaved={onSaved} targetUserId={targetUserId} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

/** Плаваюча кнопка з панда-словником — відкривається поверх уроку, без переходів. */
export default function PandaLookupFab({
  onSaved,
  label = "Панда-словник",
  className = "fixed bottom-24 right-5 z-[60] flex items-center gap-2 px-4 py-3 rounded-2xl bg-primary text-primary-foreground shadow-lg font-display font-semibold text-sm",
}: {
  onSaved?: (w: MyWord) => void;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)} className={className}>
        <span className="text-base">🐼</span>
        <span className="hidden sm:inline">{label}</span>
      </button>
      <PandaLookupDialog open={open} onOpenChange={setOpen} onSaved={onSaved} />
    </>
  );
}
