import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { BookOpen, ArrowRight, Sparkles } from "lucide-react";

const articleColor = (a?: string | null) => {
  const x = (a || "").toLowerCase();
  if (x === "der") return "text-blue-400";
  if (x === "die") return "text-pink-400";
  if (x === "das") return "text-green-400";
  return "text-muted-foreground";
};

interface DictWord {
  id: string;
  german: string;
  russian: string;
  ukrainian?: string;
  article?: string | null;
}

const SRSWidget = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [words, setWords] = useState<DictWord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const [savedRes, customRes] = await Promise.all([
        supabase
          .from("saved_words")
          .select("id, learned_at, vocab_cards(german, russian, ukrainian, article)")
          .eq("user_id", user.id)
          .order("learned_at", { ascending: false })
          .limit(20),
        supabase
          .from("custom_words")
          .select("id, german, russian, article, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (cancelled) return;

      const saved: DictWord[] = (savedRes.data ?? [])
        .filter((w: any) => w.vocab_cards)
        .map((w: any) => ({
          id: `s-${w.id}`,
          german: w.vocab_cards.german,
          russian: w.vocab_cards.russian,
          ukrainian: w.vocab_cards.ukrainian ?? "",
          article: w.vocab_cards.article,
        }));
      const custom: DictWord[] = (customRes.data ?? []).map((w: any) => ({
        id: `c-${w.id}`,
        german: w.german,
        russian: w.russian,
        article: w.article,
      }));

      const combined = [...saved, ...custom];
      setWords(combined.slice(0, 8));
      setTotal(combined.length);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  if (loading) {
    return <div className="h-full min-h-[112px] rounded-2xl bg-white/5 animate-pulse" />;
  }

  // Empty state
  if (words.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="h-full backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition-all"
        onClick={() => navigate("/assistant")}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-accent" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground truncate">
                {lang === "uk" ? "Твій словник пустий" : "Твой словарь пуст"}
              </p>
              <p className="text-sm text-muted-foreground truncate">
                {lang === "uk"
                  ? "Додай собі слова з нашою пандою-професором 🐼"
                  : "Добавь слова с нашей пандой-профессором 🐼"}
              </p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-accent shrink-0" />
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="h-full backdrop-blur-xl bg-white/5 border border-white/10 rounded-2xl p-4 cursor-pointer hover:bg-white/10 transition-all flex flex-col gap-3"
      onClick={() => navigate("/dictionary")}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-foreground truncate">
              {lang === "uk" ? "Твій словник" : "Твой словарь"}
            </p>
            <p className="text-sm text-muted-foreground truncate">
              {total} {lang === "uk" ? "слів" : "слов"}
            </p>
          </div>
        </div>
        <ArrowRight className="w-4 h-4 text-primary shrink-0" />
      </div>

      <div className="flex flex-wrap gap-1.5 pt-1">
        {words.map((c) => {
          const translation = lang === "uk" ? c.ukrainian || c.russian : c.russian;
          return (
            <div
              key={c.id}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 border border-white/10 text-xs"
              title={translation}
            >
              {c.article && (
                <span className={`font-bold ${articleColor(c.article)}`}>{c.article}</span>
              )}
              <span className="font-semibold text-foreground">{c.german}</span>
              <span className="text-muted-foreground hidden sm:inline">— {translation}</span>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
};

export default SRSWidget;
