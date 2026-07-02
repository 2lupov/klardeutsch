import { useState, useRef, useEffect, useCallback } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { fetchEdgeFunction } from "@/lib/auth-fetch";
import {
  Bot, Send, BookOpen, FileText, Languages, BookMarked,
  Sparkles, Loader2, Search, ArrowLeft, Plus, Check,
  Upload, FileCheck, Lightbulb, Table2, Layers, Quote,
  Building2, Home as HomeIcon, Briefcase, GraduationCap,
  Heart, Car, Landmark, CreditCard, HelpCircle, Camera, X, Image as ImageIcon

} from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "@/hooks/use-toast";
import pandaExplorer from "@/assets/panda-coach.png";

/* ── Cinematic Ambient Background ── */
const AmbientBg = () => (
  <div className="fixed inset-0 pointer-events-none overflow-hidden -z-10">
    <div className="absolute w-[600px] h-[600px] rounded-full opacity-30 blur-[140px]"
      style={{ background: "hsl(var(--primary))", top: "-15%", right: "-10%", animation: "ambient-drift-1 20s ease-in-out infinite" }} />
    <div className="absolute w-[500px] h-[500px] rounded-full opacity-20 blur-[120px]"
      style={{ background: "hsl(var(--accent))", bottom: "0%", left: "-8%", animation: "ambient-drift-2 25s ease-in-out infinite" }} />
    <div className="absolute w-[320px] h-[320px] rounded-full opacity-15 blur-[100px]"
      style={{ background: "hsl(var(--primary))", top: "45%", left: "50%", animation: "ambient-drift-3 18s ease-in-out infinite" }} />
  </div>
);

type Msg = { role: "user" | "assistant"; content: string };
type Tab = "menu" | "chat" | "dictionary" | "reading" | "files";

/* ── Card animation helper ── */
const cardAnim = (i: number) => ({
  initial: { opacity: 0, y: 20 } as const,
  animate: { opacity: 1, y: 0 } as const,
  transition: { delay: i * 0.08, duration: 0.35 },
});

/* ── Word data types (same as WordLookup) ── */
interface WordData {
  word: string;
  article?: string;
  translation: string;
  part_of_speech: string;
  part_of_speech_translation: string;
  level: string;
  meanings: { meaning: string; example_de: string; example_translation: string }[];
  conjugation?: { präsens: Record<string, string>; präteritum: Record<string, string>; perfekt: string; governing?: string };
  noun_forms?: { singular: string; plural: string; genitiv: string };
  synonyms?: string[];
}

const LEVEL_COLORS: Record<string, string> = {
  A1: "bg-primary/15 text-primary border-primary/30",
  A2: "bg-primary/20 text-primary border-primary/40",
  B1: "bg-accent/15 text-accent border-accent/30",
  B2: "bg-accent/20 text-accent border-accent/40",
  C1: "bg-accent/25 text-accent border-accent/50",
};

const ARTICLE_COLORS: Record<string, string> = {
  der: "bg-blue-500/15 text-blue-400",
  die: "bg-pink-500/15 text-pink-400",
  das: "bg-emerald-500/15 text-emerald-400",
};

/* ── Conjugation Table ── */
const ConjugationTable = ({ title, data, icon }: { title: string; data: Record<string, string>; icon?: string }) => {
  const pronouns = [
    ["ich", data.ich], ["du", data.du], ["er/sie/es", data.er_sie_es],
    ["wir", data.wir], ["ihr", data.ihr], ["sie/Sie", data.sie_Sie],
  ];
  return (
    <div className="rounded-xl border border-border bg-secondary/30 overflow-hidden">
      <div className="px-4 py-2.5 bg-secondary/60 border-b border-border flex items-center gap-2">
        <span>{icon || "📝"}</span>
        <span className="font-display font-semibold text-sm text-foreground">{title}</span>
      </div>
      <div className="grid grid-cols-2 gap-0">
        {pronouns.map(([pronoun, form], i) => (
          <div key={pronoun} className={`px-4 py-2.5 flex items-center gap-2 ${i % 2 === 0 ? "border-r border-border" : ""} ${i < 4 ? "border-b border-border/50" : ""}`}>
            <span className="text-xs text-muted-foreground w-14 shrink-0">{pronoun}</span>
            <span className="text-sm font-medium text-foreground">{form}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════ */

const MENU_THEMES = {
  chat:       { gradient: "from-accent/20 to-accent/5",   glow: "shadow-accent/20",  border: "hover:border-accent/50",  accent: "text-accent" },
  dictionary: { gradient: "from-primary/20 to-primary/5", glow: "shadow-primary/20", border: "hover:border-primary/50", accent: "text-primary" },
  reading:    { gradient: "from-primary/15 to-accent/10", glow: "shadow-primary/15", border: "hover:border-primary/40", accent: "text-primary" },
  files:      { gradient: "from-accent/15 to-primary/10", glow: "shadow-accent/15",  border: "hover:border-accent/40",  accent: "text-accent" },
};

const Assistant = () => {
  const { lang } = useLanguage();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("menu");

  const t = useCallback((ru: string, uk: string) => lang === "uk" ? uk : ru, [lang]);

  /* ── Chat state ── */
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  /* ── Dictionary state ── */
  const [dictWord, setDictWord] = useState("");
  const [wordData, setWordData] = useState<WordData | null>(null);
  const [dictFallback, setDictFallback] = useState("");
  const [dictLoading, setDictLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{ german: string; article: string | null }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [dictSearched, setDictSearched] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  /* ── Reading state ── */
  const [readingText, setReadingText] = useState("");
  const [readingResult, setReadingResult] = useState<string | null>(null);
  const [readingLoading, setReadingLoading] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  /* ── Suggestion autocomplete ── */
  useEffect(() => {
    const q = dictWord.trim().toLowerCase();
    if (q.length < 2) { setSuggestions([]); setShowSuggestions(false); return; }
    const timer = setTimeout(async () => {
      const { data } = await supabase
        .from("vocab_cards").select("german, article")
        .ilike("german", `${q}%`).order("german").limit(8);
      if (data && data.length > 0) {
        const unique = Array.from(new Map(data.map(d => [d.german.toLowerCase(), d])).values());
        setSuggestions(unique);
        setShowSuggestions(true);
      } else { setSuggestions([]); setShowSuggestions(false); }
    }, 200);
    return () => clearTimeout(timer);
  }, [dictWord]);

  /* ══════════════════════ MENU ══════════════════════ */

  const menuItems: { id: Tab; emoji: string; label: string; desc: string }[] = [
    { id: "chat", emoji: "🧠", label: t("ИИ Тьютор", "ІІ Тьютор"), desc: t("Объяснит грамматику, переведёт и разберёт ошибки", "Пояснить граматику, перекладе та розбере помилки") },
    { id: "dictionary", emoji: "📖", label: t("Умный словарь", "Розумний словник"), desc: t("Перевод, примеры, спряжение и формы", "Переклад, приклади, відмінювання та форми") },
    { id: "reading", emoji: "📄", label: t("Анализ текста", "Аналіз тексту"), desc: t("Загрузи текст — ИИ создаст словарь и вопросы", "Завантаж текст — ІІ створить словник і питання") },
    { id: "files", emoji: "📁", label: t("Шаблоны документов", "Шаблони документів"), desc: t("Помощь с немецкими документами", "Допомога з німецькими документами") },
  ];

  const renderMenu = () => (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto h-full justify-center px-5 py-8">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative rounded-3xl overflow-hidden border border-border/40 bg-gradient-to-br from-primary/20 via-card/60 to-accent/15 backdrop-blur-sm"
      >
        <div className="absolute -top-16 -right-10 w-64 h-64 rounded-full blur-[90px] bg-accent/25 pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full blur-[100px] bg-primary/25 pointer-events-none" />

        <div className="relative flex items-center gap-5 p-6 md:p-8">
          <motion.img
            src={pandaExplorer}
            alt=""
            initial={{ opacity: 0, scale: 0.8, rotate: -8 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="w-24 md:w-32 shrink-0 drop-shadow-[0_15px_40px_rgba(245,166,35,0.4)]"
          />
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-accent/15 border border-accent/30 mb-2">
              <Sparkles className="w-3 h-3 text-accent" />
              <span className="text-[10px] font-bold text-accent uppercase tracking-[0.18em]">
                KLAR Assistant
              </span>
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold text-foreground leading-[1.05] tracking-tight">
              Твій{" "}
              <span className="italic text-accent">персональний</span>
              <br />
              <span className="text-foreground/70">мовний тренер</span>
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground mt-2 leading-relaxed">
              Граматика, словник, розбір текстів і документів — все в одному місці
            </p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-2 gap-3">
        {menuItems.map((item, i) => {
          const theme = MENU_THEMES[item.id as keyof typeof MENU_THEMES];
          return (
            <motion.button
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 + i * 0.07, duration: 0.35 }}
              whileHover={{ scale: 1.03, y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => setTab(item.id)}
              className={`relative p-5 flex flex-col items-center gap-2.5 rounded-2xl border border-border/40 bg-gradient-to-b ${theme.gradient} backdrop-blur-sm overflow-hidden transition-all hover:shadow-[0_20px_50px_-15px] ${theme.glow} ${theme.border} group`}
            >
              <motion.span className="text-3xl"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 2.5, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}>
                {item.emoji}
              </motion.span>
              <div className="text-center">
                <h3 className={`text-base font-display font-bold ${theme.accent} transition-colors`}>{item.label}</h3>
                <p className="text-[11px] text-muted-foreground mt-1 leading-tight">{item.desc}</p>
              </div>
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-foreground/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            </motion.button>
          );
        })}
      </div>
    </div>
  );

  /* ══════════════════════ CHAT ══════════════════════ */

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || chatLoading) return;
    const newMsgs: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(newMsgs);
    setInput("");
    setChatLoading(true);

    try {
      const systemPrompt = lang === "uk"
        ? `Ти — KLAR Assistant, преміальний ІІ-репетитор з німецької мови. Відповідай СТРУКТУРОВАНО: використовуй заголовки (##), блоки з правилами, приклади виділяй жирним та курсивом. Завжди давай приклади з перекладом. Якщо пояснюєш граматику — подай як чітку таблицю чи список. Будь дружнім, лаконічним і корисним.`
        : `Ты — KLAR Assistant, премиальный ИИ-репетитор по немецкому языку. Отвечай СТРУКТУРИРОВАННО: используй заголовки (##), блоки с правилами, примеры выделяй жирным и курсивом. Всегда давай примеры с переводом. Если объясняешь грамматику — подавай как чёткую таблицу или список. Будь дружелюбным, лаконичным и полезным.`;

      const resp = await fetchEdgeFunction("ai-dialogue", {
        json: {
          messages: [
            { role: "system", content: systemPrompt },
            ...newMsgs.map(m => ({ role: m.role, content: m.content })),
          ],
        },
      });

      if (!resp.ok || !resp.body) throw new Error("fail");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "", result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) { result += delta; setMessages([...newMsgs, { role: "assistant", content: result }]); }
          } catch { break; }
        }
      }
      if (!result) setMessages([...newMsgs, { role: "assistant", content: t("Не удалось получить ответ.", "Не вдалося отримати відповідь.") }]);
    } catch {
      setMessages([...newMsgs, { role: "assistant", content: t("Ошибка соединения.", "Помилка з'єднання.") }]);
    } finally { setChatLoading(false); }
  };

  /* ── Keyboard-tracking for mobile input ── */
  const [kbOffset, setKbOffset] = useState(0);
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const diff = window.innerHeight - vv.height;
      setKbOffset(diff > 50 ? diff : 0);
    };
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => { vv.removeEventListener("resize", update); vv.removeEventListener("scroll", update); };
  }, []);

  const renderChat = () => (
    <div className="flex flex-col h-full relative">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3" style={{ paddingBottom: 80 }}>
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center gap-4 py-12">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Bot className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="font-display font-bold text-lg text-foreground">{t("ИИ Тьютор", "ІІ Тьютор")}</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-xs">
                {t("Структурированные объяснения грамматики, перевод и разбор ошибок", "Структуровані пояснення граматики, переклад та розбір помилок")}
              </p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center max-w-sm">
              {[
                t("Объясни Akkusativ vs Dativ", "Поясни Akkusativ vs Dativ"),
                t("Переведи и разбери: Ich hätte gerne...", "Переклади і розбери: Ich hätte gerne..."),
                t("Таблица неправильных глаголов", "Таблиця неправильних дієслів"),
                t("Как писать формальное письмо?", "Як писати формальний лист?"),
              ].map((q) => (
                <button key={q} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                  className="px-3 py-2 rounded-xl bg-muted/60 border border-border text-xs text-foreground/80 hover:bg-primary/10 hover:border-primary/30 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-md"
                  : "bg-card border border-border text-foreground rounded-bl-md"
              }`}>
                {msg.role === "assistant" ? (
                  <div className="prose prose-invert prose-sm max-w-none [&_p]:my-1.5 [&_h2]:text-primary [&_h3]:text-primary [&_strong]:text-foreground [&_code]:text-primary [&_code]:bg-primary/10 [&_code]:px-1.5 [&_code]:rounded [&_li]:text-foreground/90 [&_table]:text-xs [&_th]:bg-secondary/60 [&_th]:px-3 [&_th]:py-1.5 [&_td]:px-3 [&_td]:py-1.5 [&_tr]:border-border">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                ) : msg.content}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {chatLoading && messages[messages.length - 1]?.role === "user" && (
          <div className="flex justify-start">
            <div className="bg-card border border-border rounded-2xl rounded-bl-md px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map(d => (
                  <span key={d} className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: `${d * 150}ms` }} />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 px-3 pb-3 pt-2 transition-transform duration-150"
        style={{ transform: kbOffset > 0 ? `translateY(-${kbOffset}px)` : "none" }}>
        <div className="flex items-end gap-2 bg-card/90 backdrop-blur-2xl border border-border rounded-[1.25rem] px-3 py-2 shadow-lg shadow-black/10">
          <textarea ref={inputRef} value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder={t("Задай вопрос тьютору...", "Постав питання тьютору...")}
            rows={1}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none max-h-32"
            style={{ minHeight: 38 }} />
          <button onClick={sendMessage} disabled={!input.trim() || chatLoading}
            className="shrink-0 w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 transition-all hover:scale-105 active:scale-95">
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  /* ══════════════════════ DICTIONARY ══════════════════════ */

  const handleSaveWord = async () => {
    if (!user || !wordData || saving) return;
    setSaving(true);
    try {
      const { data: existing } = await supabase.from("custom_words").select("id").eq("user_id", user.id).eq("german", wordData.word).maybeSingle();
      if (existing) { setSaved(true); toast({ title: t("Уже в словаре ✅", "Вже у словнику ✅") }); return; }
      await supabase.from("custom_words").insert({
        user_id: user.id, german: wordData.word, russian: wordData.translation,
        article: wordData.article || null, example: wordData.meanings?.[0]?.example_de || null,
      });
      setSaved(true);
      toast({ title: t("Добавлено в словарь! 📖", "Додано у словник! 📖") });
    } catch { toast({ title: t("Ошибка сохранения", "Помилка збереження"), variant: "destructive" }); }
    finally { setSaving(false); }
  };

  const handleLookup = async (overrideWord?: string) => {
    const searchWord = (overrideWord || dictWord).trim();
    if (!searchWord) return;
    if (overrideWord) setDictWord(overrideWord);
    setDictLoading(true); setWordData(null); setDictFallback(""); setDictSearched(true); setShowSuggestions(false); setSaved(false);
    try {
      const { data, error } = await supabase.functions.invoke("lookup-word", { body: { word: searchWord, lang } });
      if (error) throw error;
      if (data?.structured) setWordData(data.structured);
      else setDictFallback(data?.result || t("Ничего не найдено", "Нічого не знайдено"));
    } catch { setDictFallback(t("❌ Ошибка. Попробуйте ещё раз.", "❌ Помилка. Спробуйте ще раз.")); }
    finally { setDictLoading(false); }
  };

  const renderDictionary = () => (
    <div className="flex-1 overflow-y-auto px-4 py-4 max-w-2xl mx-auto w-full">
      {/* Search */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative mb-6">
        <div className="relative group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary/30 via-accent/25 to-primary/30 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
          <div className="relative flex gap-2">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input type="text"
                placeholder={t("Введите слово на немецком...", "Введіть слово німецькою...")}
                value={dictWord} onChange={(e) => setDictWord(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleLookup()}
                onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
                maxLength={60} autoFocus
                className="w-full pl-12 pr-4 py-4 rounded-2xl bg-card border border-border text-foreground text-base placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all backdrop-blur-sm" />
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                    className="absolute z-50 left-0 right-0 top-full mt-2 rounded-xl border border-border bg-card/95 backdrop-blur-md shadow-xl overflow-hidden">
                    {suggestions.map((s, i) => (
                      <motion.button key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                        className="w-full px-4 py-3 text-left text-sm hover:bg-primary/10 transition-colors flex items-center gap-3 text-foreground border-b border-border/50 last:border-0"
                        onMouseDown={(e) => { e.preventDefault(); handleLookup(s.german); }}>
                        {s.article && <span className={`text-xs font-bold px-2 py-0.5 rounded-md ${ARTICLE_COLORS[s.article] || "text-muted-foreground"}`}>{s.article}</span>}
                        <span className="font-medium">{s.german}</span>
                        <Sparkles className="w-3 h-3 text-primary/40 ml-auto" />
                      </motion.button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => handleLookup()} disabled={!dictWord.trim() || dictLoading}
              className="px-6 py-4 rounded-2xl bg-primary text-primary-foreground font-display font-bold text-sm disabled:opacity-40 transition-all hover:shadow-lg hover:shadow-primary/20 flex items-center gap-2">
              {dictLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BookOpen className="w-5 h-5" />}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Loading */}
      {dictLoading && (
        <div className="flex flex-col items-center gap-3 py-12">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary" />
          <p className="text-sm text-muted-foreground">{t("Ищу слово...", "Шукаю слово...")}</p>
        </div>
      )}

      {/* Structured result */}
      {!dictLoading && wordData && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3 pb-8">
          {/* Word Header */}
          <motion.div {...cardAnim(0)} className="rounded-2xl border border-border bg-card/90 backdrop-blur-sm overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary/60 via-accent/50 to-primary/60" />
            <div className="p-5 flex items-start gap-4">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-2xl">📖</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {wordData.article && <span className={`text-sm font-bold px-2.5 py-1 rounded-lg ${ARTICLE_COLORS[wordData.article] || "bg-secondary text-muted-foreground"}`}>{wordData.article}</span>}
                  <h2 className="text-2xl font-display font-bold text-foreground">{wordData.word}</h2>
                </div>
                <p className="text-lg text-muted-foreground mt-1">{wordData.translation}</p>
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="text-xs px-2.5 py-1 rounded-lg bg-secondary border border-border text-foreground/70 font-medium">
                    {wordData.part_of_speech} <span className="text-muted-foreground">({wordData.part_of_speech_translation})</span>
                  </span>
                  <span className={`text-xs px-2.5 py-1 rounded-lg border font-bold ${LEVEL_COLORS[wordData.level] || "bg-secondary text-foreground"}`}>{wordData.level}</span>
                </div>
              </div>
              {user && (
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={handleSaveWord} disabled={saved || saving}
                  className={`shrink-0 p-3 rounded-xl border transition-all ${saved ? "bg-primary/15 border-primary/30 text-primary" : "bg-primary/10 border-primary/30 text-primary hover:bg-primary/20"}`}>
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : saved ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
                </motion.button>
              )}
            </div>
          </motion.div>

          {/* Meanings */}
          <motion.div {...cardAnim(1)} className="rounded-2xl border border-border bg-card/90 backdrop-blur-sm overflow-hidden">
            <div className="px-5 py-3.5 border-b border-border/50 flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><Lightbulb className="w-4 h-4 text-primary" /></div>
              <h3 className="font-display font-semibold text-foreground">{t("Значения", "Значення")}</h3>
            </div>
            <div className="divide-y divide-border/40">
              {wordData.meanings.map((m, i) => (
                <div key={i} className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{m.meaning}</p>
                      <div className="mt-2 pl-3 border-l-2 border-primary/20 space-y-1">
                        <p className="text-sm text-foreground/80 italic">{m.example_de}</p>
                        <p className="text-xs text-muted-foreground">{m.example_translation}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Conjugation */}
          {wordData.conjugation && (
            <motion.div {...cardAnim(2)} className="rounded-2xl border border-border bg-card/90 backdrop-blur-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/50 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><Table2 className="w-4 h-4 text-primary" /></div>
                <h3 className="font-display font-semibold text-foreground">{t("Спряжение", "Відмінювання")}</h3>
                {wordData.conjugation.governing && <span className="ml-auto text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary border border-primary/20">{wordData.conjugation.governing}</span>}
              </div>
              <div className="p-4 space-y-3">
                <ConjugationTable title="Präsens" data={wordData.conjugation.präsens} icon="🟢" />
                <ConjugationTable title="Präteritum" data={wordData.conjugation.präteritum} icon="🔵" />
                <div className="rounded-xl border border-border bg-secondary/30 px-4 py-3 flex items-center gap-3">
                  <span>🟣</span>
                  <span className="text-sm font-display font-semibold text-foreground">Perfekt:</span>
                  <span className="text-sm text-foreground/90 font-medium">{wordData.conjugation.perfekt}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Noun Forms */}
          {wordData.noun_forms && (
            <motion.div {...cardAnim(2)} className="rounded-2xl border border-border bg-card/90 backdrop-blur-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/50 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-accent/10 flex items-center justify-center"><Layers className="w-4 h-4 text-accent" /></div>
                <h3 className="font-display font-semibold text-foreground">{t("Формы", "Форми")}</h3>
              </div>
              <div className="p-4 grid grid-cols-3 gap-3">
                {[[t("Ед. число", "Однина"), wordData.noun_forms.singular], [t("Мн. число", "Множина"), wordData.noun_forms.plural], ["Genitiv", wordData.noun_forms.genitiv]].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-border bg-secondary/30 p-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{label}</p>
                    <p className="text-sm font-semibold text-foreground">{value}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Synonyms */}
          {wordData.synonyms && wordData.synonyms.length > 0 && (
            <motion.div {...cardAnim(3)} className="rounded-2xl border border-border bg-card/90 backdrop-blur-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-border/50 flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><Languages className="w-4 h-4 text-primary" /></div>
                <h3 className="font-display font-semibold text-foreground">{t("Синонимы", "Синоніми")}</h3>
              </div>
              <div className="px-5 py-4 flex flex-wrap gap-2">
                {wordData.synonyms.map((s, i) => (
                  <motion.button key={i} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => handleLookup(s)}
                    className="px-4 py-2 rounded-xl bg-secondary border border-border text-sm font-medium text-foreground hover:bg-primary/10 hover:border-primary/30 transition-colors">
                    {s}
                  </motion.button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Search another */}
          <motion.button {...cardAnim(4)}
            onClick={() => { setDictWord(""); setWordData(null); setDictFallback(""); setDictSearched(false); }}
            className="w-full py-3 rounded-xl border border-border bg-secondary/50 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors font-medium flex items-center justify-center gap-2">
            <Search className="w-4 h-4" /> {t("Искать другое слово", "Шукати інше слово")}
          </motion.button>
        </motion.div>
      )}

      {/* Fallback */}
      {!dictLoading && !wordData && dictFallback && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pb-8">
          <div className="rounded-2xl border border-border bg-card/90 p-5">
            <p className="text-sm text-foreground whitespace-pre-wrap">{dictFallback}</p>
          </div>
        </motion.div>
      )}

      {/* Empty state */}
      {!dictSearched && !dictLoading && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="text-center py-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Languages className="w-7 h-7 text-primary" />
          </div>
          <h3 className="font-display font-bold text-lg text-foreground">{t("Умный словарь", "Розумний словник")}</h3>
          <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">{t("Введи слово — получи перевод, спряжение, примеры и синонимы", "Введи слово — отримай переклад, відмінювання, приклади та синоніми")}</p>
        </motion.div>
      )}
    </div>
  );

  /* ══════════════════════ READING ══════════════════════ */

  const analyzeText = async () => {
    const text = readingText.trim();
    if (!text || readingLoading) return;
    setReadingLoading(true); setReadingResult(null);
    try {
      const prompt = lang === "uk"
        ? `Проаналізуй цей німецький текст і створи структурований розбір:\n\n## 📖 Словник\nВиділи 10-15 найважливіших слів з перекладом та прикладами\n\n## ❓ Питання до тексту\n5 питань для перевірки розуміння\n\n## 💎 Круті вирази\nЦікаві фрази та ідіоми з тексту з поясненням\n\n## 📊 Рівень тексту\nОцінка складності (A1-C2) з поясненням\n\nТекст:\n${text}`
        : `Проанализируй этот немецкий текст и создай структурированный разбор:\n\n## 📖 Словарь\nВыдели 10-15 самых важных слов с переводом и примерами\n\n## ❓ Вопросы к тексту\n5 вопросов для проверки понимания\n\n## 💎 Крутые выражения\nИнтересные фразы и идиомы из текста с объяснением\n\n## 📊 Уровень текста\nОценка сложности (A1-C2) с объяснением\n\nТекст:\n${text}`;

      const resp = await fetchEdgeFunction("ai-dialogue", {
        json: { messages: [{ role: "user", content: prompt }] },
      });

      if (!resp.ok || !resp.body) throw new Error("fail");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "", result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) { result += delta; setReadingResult(result); }
          } catch { break; }
        }
      }
    } catch { setReadingResult(t("Ошибка анализа текста.", "Помилка аналізу тексту.")); }
    finally { setReadingLoading(false); }
  };

  const renderReading = () => (
    <div className="flex-1 overflow-y-auto px-4 py-4 max-w-2xl mx-auto w-full space-y-4">
      {!readingResult ? (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
              <BookMarked className="w-7 h-7 text-primary" />
            </div>
            <h3 className="font-display font-bold text-lg">{t("Анализ текста", "Аналіз тексту")}</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              {t("Вставь немецкий текст — ИИ создаст словарь, вопросы и выделит крутые выражения", "Встав німецький текст — ІІ створить словник, питання та виділить круті вирази")}
            </p>
          </motion.div>

          <textarea
            value={readingText}
            onChange={(e) => setReadingText(e.target.value)}
            placeholder={t("Вставьте немецкий текст для анализа...", "Вставте німецький текст для аналізу...")}
            rows={8}
            className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />

          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={analyzeText} disabled={!readingText.trim() || readingLoading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-primary to-primary text-white font-display font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-primary/30 transition-all">
            {readingLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
            {t("Анализировать текст", "Аналізувати текст")}
          </motion.button>
        </>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pb-8">
          <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-sm p-5">
            <div className="prose prose-invert prose-sm max-w-none [&_h2]:text-primary [&_h3]:text-primary [&_strong]:text-foreground [&_li]:text-foreground/90 [&_code]:text-primary [&_code]:bg-primary/10 [&_code]:px-1.5 [&_code]:rounded">
              <ReactMarkdown>{readingResult}</ReactMarkdown>
              {readingLoading && <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5" />}
            </div>
          </div>
          {!readingLoading && (
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onClick={() => { setReadingText(""); setReadingResult(null); }}
              className="w-full py-3 rounded-xl border border-border bg-secondary/50 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors font-medium flex items-center justify-center gap-2">
              <Search className="w-4 h-4" /> {t("Анализировать другой текст", "Аналізувати інший текст")}
            </motion.button>
          )}
        </motion.div>
      )}
    </div>
  );

  /* ══════════════════════ FILES ══════════════════════ */

  const fileTemplates: { emoji: string; icon: React.ElementType; label: string; desc: string; color: string }[] = [
    { emoji: "🏛️", icon: Landmark, label: "Jobcenter", desc: t("Bescheide, Anträge, Widersprüche", "Рішення, заявки, заперечення"), color: "from-primary/15 to-primary/5" },
    { emoji: "💼", icon: Briefcase, label: "Arbeitsagentur", desc: t("Arbeitslosengeld, Maßnahmen", "Допомога по безробіттю, заходи"), color: "from-accent/15 to-accent/5" },
    { emoji: "🏢", icon: Building2, label: t("Работодатель", "Роботодавець"), desc: t("Arbeitsvertrag, Kündigung, Zeugnis", "Трудовий договір, звільнення, характеристика"), color: "from-primary/20 to-accent/5" },
    { emoji: "🏠", icon: HomeIcon, label: t("Арендодатель", "Орендодавець"), desc: t("Mietvertrag, Nebenkostenabrechnung", "Договір оренди, комунальні"), color: "from-accent/20 to-primary/5" },
    { emoji: "🏥", icon: Heart, label: t("Страховка", "Страхування"), desc: t("Krankenkasse, Versicherung", "Лікарняна каса, страхування"), color: "from-accent/15 to-primary/10" },
    { emoji: "🚗", icon: Car, label: t("Штрафы / Транспорт", "Штрафи / Транспорт"), desc: t("Bußgeld, Führerschein, KFZ", "Штрафи, водійські права, авто"), color: "from-accent/20 to-accent/5" },
    { emoji: "🏫", icon: GraduationCap, label: t("Учёба / Курсы", "Навчання / Курси"), desc: t("Integrationskurs, Studium, Anerkennung", "Інтеграційний курс, навчання, визнання"), color: "from-primary/20 to-primary/5" },
    { emoji: "💳", icon: CreditCard, label: t("Финансы", "Фінанси"), desc: t("Bank, Steuererklärung, Schufa", "Банк, податкова декларація, Schufa"), color: "from-primary/15 to-accent/10" },
  ];

  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [fileText, setFileText] = useState("");
  const [fileResult, setFileResult] = useState<string | null>(null);
  const [fileLoading, setFileLoading] = useState(false);
  const [attachedFile, setAttachedFile] = useState<{ name: string; dataUrl: string; mime: string } | null>(null);
  const fileUploadRef = useRef<HTMLInputElement>(null);
  const photoUploadRef = useRef<HTMLInputElement>(null);

  const handleFilePick = (file: File | null) => {
    if (!file) return;
    if (file.size > 15 * 1024 * 1024) {
      setFileResult(t("Файл занадто великий (макс 15 МБ).", "Файл слишком большой (макс 15 МБ)."));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({ name: file.name, dataUrl: reader.result as string, mime: file.type || "application/octet-stream" });
    };
    reader.readAsDataURL(file);
  };

  const analyzeFile = async (template: string) => {
    const text = fileText.trim();
    if ((!text && !attachedFile) || fileLoading) return;
    setFileLoading(true); setFileResult(null);
    try {
      const instruction = lang === "uk"
        ? `Ти — експерт з німецьких документів (${template}). Проаналізуй наданий документ (текст або зображення/PDF) і створи:\n\n## 📋 Тип документа\nЩо це за документ і від кого\n\n## 🔑 Головне\nОсновні пункти та що вони означають\n\n## ⚠️ Що важливо\nНа що звернути увагу, терміни, дедлайни\n\n## 📖 Словник документу\nКлючові терміни з перекладом\n\n## ✅ Що робити далі\nКонкретні кроки і рекомендації`
        : `Ты — эксперт по немецким документам (${template}). Проанализируй предоставленный документ (текст или изображение/PDF) и создай:\n\n## 📋 Тип документа\nЧто это за документ и от кого\n\n## 🔑 Главное\nОсновные пункты и что они значат\n\n## ⚠️ Что важно\nНа что обратить внимание, сроки, дедлайны\n\n## 📖 Словарь документа\nКлючевые термины с переводом\n\n## ✅ Что делать дальше\nКонкретные шаги и рекомендации`;

      const contentParts: any[] = [{ type: "text", text: instruction + (text ? `\n\nТекст:\n${text}` : "") }];
      if (attachedFile) {
        if (attachedFile.mime.startsWith("image/")) {
          contentParts.push({ type: "image_url", image_url: { url: attachedFile.dataUrl } });
        } else {
          contentParts.push({ type: "file", file: { filename: attachedFile.name, file_data: attachedFile.dataUrl } });
        }
      }

      const resp = await fetchEdgeFunction("ai-dialogue", {
        json: { messages: [{ role: "user", content: contentParts }] },
      });

      if (!resp.ok || !resp.body) throw new Error("fail");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "", result = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) { result += delta; setFileResult(result); }
          } catch { break; }
        }
      }
    } catch { setFileResult(t("Ошибка анализа.", "Помилка аналізу.")); }
    finally { setFileLoading(false); }
  };

  const renderFiles = () => (
    <div className="flex-1 overflow-y-auto px-4 py-4 max-w-2xl mx-auto w-full space-y-4">
      {!selectedTemplate ? (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto mb-3">
              <FileText className="w-7 h-7 text-accent" />
            </div>
            <h3 className="font-display font-bold text-lg">{t("Помощь с документами", "Допомога з документами")}</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs mx-auto">
              {t("Выбери тип документа — вставь текст — получи разбор", "Обери тип документу — встав текст — отримай розбір")}
            </p>
          </motion.div>

          <div className="grid grid-cols-2 gap-3">
            {fileTemplates.map((ft, i) => (
              <motion.button key={ft.label}
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.35 }}
                whileHover={{ scale: 1.03, y: -2 }} whileTap={{ scale: 0.97 }}
                onClick={() => setSelectedTemplate(ft.label)}
                className={`relative p-4 flex flex-col items-center gap-2 rounded-2xl border border-border bg-gradient-to-b ${ft.color} backdrop-blur-sm overflow-hidden transition-all hover:shadow-lg group text-center`}>
                <span className="text-2xl">{ft.emoji}</span>
                <h4 className="font-display font-bold text-sm text-foreground">{ft.label}</h4>
                <p className="text-[10px] text-muted-foreground leading-tight">{ft.desc}</p>
                <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              </motion.button>
            ))}
          </div>
        </>
      ) : !fileResult ? (
        <>
          <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="text-center py-2">
            <h3 className="font-display font-bold text-lg text-foreground">{selectedTemplate}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {t("Вставьте текст, загрузите файл или сфотографируйте документ", "Встав текст, завантаж файл або сфотографуй документ")}
            </p>
          </motion.div>

          <textarea value={fileText} onChange={(e) => setFileText(e.target.value)}
            placeholder={t("Вставьте текст письма или документа...", "Вставте текст листа чи документу...")}
            rows={6}
            className="w-full bg-card border border-border rounded-2xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-2 focus:ring-primary/30" />

          <input ref={fileUploadRef} type="file" accept="image/*,application/pdf" className="hidden"
            onChange={(e) => { handleFilePick(e.target.files?.[0] ?? null); e.target.value = ""; }} />
          <input ref={photoUploadRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => { handleFilePick(e.target.files?.[0] ?? null); e.target.value = ""; }} />

          {attachedFile ? (
            <div className="flex items-center gap-3 p-3 rounded-2xl border border-accent/30 bg-accent/5">
              {attachedFile.mime.startsWith("image/") ? (
                <img src={attachedFile.dataUrl} alt="" className="w-14 h-14 rounded-lg object-cover" />
              ) : (
                <div className="w-14 h-14 rounded-lg bg-accent/15 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-accent" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{attachedFile.name}</p>
                <p className="text-[10px] text-muted-foreground">{attachedFile.mime}</p>
              </div>
              <button onClick={() => setAttachedFile(null)}
                className="w-8 h-8 rounded-lg bg-secondary/70 flex items-center justify-center text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => fileUploadRef.current?.click()}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-secondary/40 text-sm text-foreground hover:bg-secondary transition-colors">
                <Upload className="w-4 h-4" /> {t("Загрузить файл", "Завантажити файл")}
              </button>
              <button onClick={() => photoUploadRef.current?.click()}
                className="flex items-center justify-center gap-2 py-3 rounded-xl border border-border bg-secondary/40 text-sm text-foreground hover:bg-secondary transition-colors">
                <Camera className="w-4 h-4" /> {t("Сфотографировать", "Сфотографувати")}
              </button>
            </div>
          )}

          <div className="flex gap-2">
            <button onClick={() => { setSelectedTemplate(null); setFileText(""); setAttachedFile(null); }}
              className="px-4 py-3 rounded-xl border border-border bg-secondary/50 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
              onClick={() => analyzeFile(selectedTemplate)} disabled={(!fileText.trim() && !attachedFile) || fileLoading}
              className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-accent to-accent text-accent-foreground font-display font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-accent/30 transition-all">
              {fileLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <FileCheck className="w-5 h-5" />}
              {t("Разобрать документ", "Розібрати документ")}
            </motion.button>
          </div>
        </>
      ) : (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4 pb-8">
          <div className="rounded-2xl border border-border bg-card/90 backdrop-blur-sm p-5">
            <div className="prose prose-invert prose-sm max-w-none [&_h2]:text-primary [&_h3]:text-primary [&_strong]:text-foreground [&_li]:text-foreground/90 [&_code]:text-primary [&_code]:bg-primary/10 [&_code]:px-1.5 [&_code]:rounded">
              <ReactMarkdown>{fileResult}</ReactMarkdown>
              {fileLoading && <span className="inline-block w-2 h-4 bg-primary/60 animate-pulse ml-0.5" />}
            </div>
          </div>
          {!fileLoading && (
            <motion.button initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              onClick={() => { setSelectedTemplate(null); setFileText(""); setFileResult(null); setAttachedFile(null); }}
              className="w-full py-3 rounded-xl border border-border bg-secondary/50 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors font-medium flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> {t("Другой документ", "Інший документ")}
            </motion.button>
          )}
        </motion.div>
      )}
    </div>
  );

  /* ══════════════════════ LAYOUT ══════════════════════ */

  const tabTitle = tab === "chat" ? t("ИИ Тьютор", "ІІ Тьютор") : tab === "dictionary" ? t("Словарь", "Словник") : tab === "reading" ? t("Читання", "Читання") : tab === "files" ? t("Документы", "Документи") : "";

  return (
    <div className="h-[100dvh] bg-background flex flex-col relative overflow-hidden">
      <AmbientBg />

      {/* Header — only when not on menu */}
      {tab !== "menu" && (
        <header className="sticky top-0 z-30 bg-card/80 backdrop-blur-xl border-b border-border px-4 py-3">
          <div className="flex items-center gap-3">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={() => setTab("menu")}
              className="p-2 rounded-xl bg-secondary/80 border border-border text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <div>
              <h1 className="font-display font-bold text-base text-foreground">{tabTitle}</h1>
              <p className="text-[10px] text-muted-foreground">KLAR Assistant</p>
            </div>
          </div>
        </header>
      )}

      {/* Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {tab === "menu" && renderMenu()}
        {tab === "chat" && renderChat()}
        {tab === "dictionary" && renderDictionary()}
        {tab === "reading" && renderReading()}
        {tab === "files" && renderFiles()}
      </div>
    </div>
  );
};

export default Assistant;
