import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ArrowLeft, Plus, Trash2, Save, Lock, ShoppingBag } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ShopEditor from "@/components/admin/ShopEditor";

type Level = "A1" | "A2" | "B1" | "B2";
type Tab = "vocabulary" | "grammar" | "reading" | "shop";

const LEVELS: Level[] = ["A1", "A2", "B1", "B2"];

const Admin = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [level, setLevel] = useState<Level>("A1");
  const [tab, setTab] = useState<Tab>("vocabulary");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const { data } = await supabase.rpc("check_admin_password", { input_password: password });
    if (data) {
      setAuthenticated(true);
    } else {
      setError(t("wrongPassword"));
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <p className="text-muted-foreground">{t("loginFirst")}</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <form onSubmit={handleLogin} className="w-full max-w-sm animate-slide-up">
          <div className="text-center mb-6">
            <Lock className="w-10 h-10 text-primary mx-auto mb-3" />
            <h1 className="text-2xl font-display font-bold">{t("adminPanel")}</h1>
            <p className="text-sm text-muted-foreground mt-1">{t("enterAdminPassword")}</p>
          </div>
          <div className="glass-card p-6 flex flex-col gap-4">
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("password")}
              className="w-full px-4 py-3 rounded-xl bg-secondary text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none transition-colors"
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
            <button type="submit" className="w-full px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow">
              {t("login")}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="w-full max-w-2xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-display font-bold text-gradient">{t("adminPanel")}</h1>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <a href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">{t("toApp")}</a>
          </div>
        </div>

        {/* Level selector */}
        <div className="flex gap-2 mb-4">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => setLevel(l)}
              className={`px-4 py-2 rounded-xl font-display font-bold text-sm transition-all ${
                level === l ? "bg-primary text-primary-foreground glow-yellow" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
              }`}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Tab selector */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(["vocabulary", "grammar", "reading", "shop"] as Tab[]).map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={`px-4 py-2 rounded-xl text-sm transition-all ${
                tab === tb ? "bg-card border border-primary/50 text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tb === "vocabulary" ? t("vocabulary") : tb === "grammar" ? t("grammar") : tb === "reading" ? t("reading") : t("shopTab")}
            </button>
          ))}
        </div>

        {tab === "vocabulary" && <VocabEditor level={level} />}
        {tab === "grammar" && <GrammarEditor level={level} />}
        {tab === "reading" && <ReadingEditor level={level} />}
        {tab === "shop" && <ShopEditor />}
      </div>
    </div>
  );
};

// ——— Vocabulary Editor ———
const VocabEditor = ({ level }: { level: Level }) => {
  const { t } = useLanguage();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("vocab_cards").select("*").eq("level", level).order("sort_order");
    setCards(data ?? []);
    setLoading(false);
  }, [level]);

  useEffect(() => { load(); }, [load]);

  const addCard = async () => {
    await supabase.from("vocab_cards").insert([{
      level, german: t("newWordGerman"), russian: t("newWord"), sort_order: cards.length + 1,
    }]);
    load();
  };

  const updateCard = async (id: string, field: string, value: string) => {
    await supabase.from("vocab_cards").update({ [field]: value || null }).eq("id", id);
  };

  const deleteCard = async (id: string) => {
    await supabase.from("vocab_cards").delete().eq("id", id);
    load();
  };

  if (loading) return <p className="text-muted-foreground">{t("loading")}</p>;

  return (
    <div className="flex flex-col gap-3">
      {cards.map((card) => (
        <div key={card.id} className="glass-card p-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <input defaultValue={card.german} onBlur={(e) => updateCard(card.id, "german", e.target.value)} placeholder={t("german")} className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
            <input defaultValue={card.russian} onBlur={(e) => updateCard(card.id, "russian", e.target.value)} placeholder={t("russian")} className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <input defaultValue={card.article ?? ""} onBlur={(e) => updateCard(card.id, "article", e.target.value)} placeholder={t("article")} className="w-20 px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
            <input defaultValue={card.example ?? ""} onBlur={(e) => updateCard(card.id, "example", e.target.value)} placeholder={t("example")} className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
            <button onClick={() => deleteCard(card.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
      <button onClick={addCard} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all">
        <Plus className="w-4 h-4" /> {t("addWord")}
      </button>
    </div>
  );
};

// ——— Grammar Editor ———
const GrammarEditor = ({ level }: { level: Level }) => {
  const { t } = useLanguage();
  const [theory, setTheory] = useState("");
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [lessonRes, qRes] = await Promise.all([
      supabase.from("grammar_lessons").select("*").eq("level", level).single(),
      supabase.from("grammar_questions").select("*").eq("level", level).order("sort_order"),
    ]);
    setTheory(lessonRes.data?.theory ?? "");
    setLessonId(lessonRes.data?.id ?? null);
    setQuestions(qRes.data ?? []);
    setLoading(false);
  }, [level]);

  useEffect(() => { load(); }, [load]);

  const saveTheory = async () => {
    if (lessonId) {
      await supabase.from("grammar_lessons").update({ theory }).eq("id", lessonId);
    } else {
      await supabase.from("grammar_lessons").insert([{ level, theory }]);
      load();
    }
  };

  const addQuestion = async () => {
    await supabase.from("grammar_questions").insert([{
      level, question: t("newQuestion"), options: ["A", "B", "C", "D"], correct_index: 0, sort_order: questions.length + 1,
    }]);
    load();
  };

  const updateQuestion = async (id: string, updates: Record<string, any>) => {
    await supabase.from("grammar_questions").update(updates).eq("id", id);
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from("grammar_questions").delete().eq("id", id);
    load();
  };

  if (loading) return <p className="text-muted-foreground">{t("loading")}</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card p-4">
        <label className="text-sm text-muted-foreground mb-2 block">{t("theoryMarkdown")}</label>
        <textarea value={theory} onChange={(e) => setTheory(e.target.value)} rows={8} className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none resize-y" />
        <button onClick={saveTheory} className="mt-2 flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold">
          <Save className="w-4 h-4" /> {t("saveTheory")}
        </button>
      </div>

      <h3 className="text-sm font-display font-semibold text-muted-foreground">{t("questions")}</h3>
      {questions.map((q) => (
        <div key={q.id} className="glass-card p-4 flex flex-col gap-2">
          <div className="flex gap-2 items-start">
            <input defaultValue={q.question} onBlur={(e) => updateQuestion(q.id, { question: e.target.value })} placeholder={t("questionLabel")} className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
            <button onClick={() => deleteQuestion(q.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          {q.options.map((opt: string, i: number) => (
            <div key={i} className="flex gap-2 items-center">
              <input type="radio" name={`correct-${q.id}`} checked={q.correct_index === i} onChange={() => updateQuestion(q.id, { correct_index: i })} className="accent-primary" />
              <input defaultValue={opt} onBlur={(e) => { const newOpts = [...q.options]; newOpts[i] = e.target.value; updateQuestion(q.id, { options: newOpts }); }} className="flex-1 px-3 py-1.5 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
            </div>
          ))}
          <input defaultValue={q.explanation ?? ""} onBlur={(e) => updateQuestion(q.id, { explanation: e.target.value || null })} placeholder={t("explanationOptional")} className="px-3 py-1.5 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
        </div>
      ))}
      <button onClick={addQuestion} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all">
        <Plus className="w-4 h-4" /> {t("addQuestion")}
      </button>
    </div>
  );
};

// ——— Reading Editor ———
const ReadingEditor = ({ level }: { level: Level }) => {
  const { t } = useLanguage();
  const [texts, setTexts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("reading_texts").select("*, reading_questions(*)").eq("level", level).order("sort_order");
    setTexts(data ?? []);
    setLoading(false);
  }, [level]);

  useEffect(() => { load(); }, [load]);

  const addText = async () => {
    await supabase.from("reading_texts").insert([{ level, title: t("newText"), text: t("textHere"), sort_order: texts.length + 1 }]);
    load();
  };

  const updateText = async (id: string, updates: Record<string, any>) => {
    await supabase.from("reading_texts").update(updates).eq("id", id);
  };

  const deleteText = async (id: string) => {
    await supabase.from("reading_texts").delete().eq("id", id);
    load();
  };

  const addQuestion = async (readingId: string, count: number) => {
    await supabase.from("reading_questions").insert([{
      reading_id: readingId, question: t("newQuestion"), options: ["A", "B", "C", "D"], correct_index: 0, sort_order: count + 1,
    }]);
    load();
  };

  const updateQuestion = async (id: string, updates: Record<string, any>) => {
    await supabase.from("reading_questions").update(updates).eq("id", id);
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from("reading_questions").delete().eq("id", id);
    load();
  };

  if (loading) return <p className="text-muted-foreground">{t("loading")}</p>;

  return (
    <div className="flex flex-col gap-4">
      {texts.map((txt) => (
        <div key={txt.id} className="glass-card p-4 flex flex-col gap-3">
          <div className="flex gap-2 items-start">
            <input defaultValue={txt.title} onBlur={(e) => updateText(txt.id, { title: e.target.value })} placeholder={t("title")} className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm font-semibold focus:border-primary focus:outline-none" />
            <button onClick={() => deleteText(txt.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <textarea defaultValue={txt.text} onBlur={(e) => updateText(txt.id, { text: e.target.value })} rows={4} className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none resize-y" />

          <p className="text-xs text-muted-foreground font-display">{t("textQuestions")}</p>
          {(txt.reading_questions ?? [])
            .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((q: any) => (
            <div key={q.id} className="ml-2 border-l-2 border-border pl-3 flex flex-col gap-1.5">
              <div className="flex gap-2 items-start">
                <input defaultValue={q.question} onBlur={(e) => updateQuestion(q.id, { question: e.target.value })} className="flex-1 px-3 py-1.5 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
                <button onClick={() => deleteQuestion(q.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {q.options.map((opt: string, i: number) => (
                <div key={i} className="flex gap-2 items-center">
                  <input type="radio" name={`rq-correct-${q.id}`} checked={q.correct_index === i} onChange={() => updateQuestion(q.id, { correct_index: i })} className="accent-primary" />
                  <input defaultValue={opt} onBlur={(e) => { const newOpts = [...q.options]; newOpts[i] = e.target.value; updateQuestion(q.id, { options: newOpts }); }} className="flex-1 px-3 py-1 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
                </div>
              ))}
            </div>
          ))}
          <button onClick={() => addQuestion(txt.id, txt.reading_questions?.length ?? 0)} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 ml-2">
            <Plus className="w-3 h-3" /> {t("addQuestion")}
          </button>
        </div>
      ))}
      <button onClick={addText} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all">
        <Plus className="w-4 h-4" /> {t("addText")}
      </button>
    </div>
  );
};

export default Admin;
