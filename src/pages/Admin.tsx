import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plus, Trash2, Lock, Check, BookOpen, Languages, Headphones, BookText, ShoppingBag, Gamepad2, Users, Globe, Pencil, Sparkles, ScanSearch, FileText, Bot, GraduationCap, FolderOpen, BarChart3 } from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ShopEditor from "@/components/admin/ShopEditor";
import ListeningEditor from "@/components/admin/ListeningEditor";
import UsersEditor from "@/components/admin/UsersEditor";
import CafeEditor from "@/components/admin/CafeEditor";
import ContentGenerator from "@/components/admin/ContentGenerator";
import CourseEditor from "@/components/admin/CourseEditor";
import TranslationChecker from "@/components/admin/TranslationChecker";
import AllTextsEditor from "@/components/admin/AllTextsEditor";
import AdminStats from "@/components/admin/AdminStats";
import StuffOnlyTab from "@/components/admin/StuffOnlyTab";
import TopicsEditor from "@/components/admin/TopicsEditor";
import { toast } from "sonner";

type Level = "A1" | "A2" | "B1" | "B2" | "C1";
type Tab = "stats" | "topics" | "vocabulary" | "grammar" | "reading" | "listening" | "shop" | "games" | "users" | "translations" | "generator" | "checker" | "alltexts" | "stuffonly" | "courses";

/** Preserves scroll position of admin container across async reload */
const withScroll = async (fn: () => Promise<void>) => {
  const el = document.getElementById("admin-scroll");
  const scrollTop = el?.scrollTop ?? 0;
  await fn();
  requestAnimationFrame(() => {
    if (el) el.scrollTop = scrollTop;
  });
};

const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1"];

const TAB_CONFIG: { key: Tab; icon: React.ElementType; label: string }[] = [
  { key: "stats", icon: BarChart3, label: "stats" },
  { key: "topics", icon: FolderOpen, label: "topics" },
  { key: "vocabulary", icon: BookOpen, label: "vocabulary" },
  { key: "grammar", icon: Languages, label: "grammar" },
  { key: "reading", icon: BookText, label: "reading" },
  { key: "listening", icon: Headphones, label: "listening" },
  { key: "shop", icon: ShoppingBag, label: "shopTab" },
  { key: "games", icon: Gamepad2, label: "games" },
  { key: "users", icon: Users, label: "users" },
  { key: "translations", icon: Globe, label: "translations" },
  { key: "generator", icon: Sparkles, label: "generator" },
  { key: "checker", icon: ScanSearch, label: "checker" },
  { key: "alltexts", icon: FileText, label: "alltexts" },
  { key: "stuffonly", icon: Bot, label: "stuffonly" },
  { key: "courses", icon: GraduationCap, label: "courses" },
];

const Admin = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [level, setLevel] = useState<Level>("A1");
  const [tab, setTab] = useState<Tab>("vocabulary");

  useEffect(() => {
    if (!user) { setIsAdmin(false); return; }
    const checkRole = async () => {
      const { data } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      setIsAdmin(!!data);
    };
    checkRole();
  }, [user]);

  if (!user) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center px-4 overflow-y-auto">
        <p className="text-muted-foreground">{t("loginFirst")}</p>
      </div>
    );
  }

  if (isAdmin === null) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center px-4 overflow-y-auto">
        <p className="text-muted-foreground animate-pulse">Загрузка...</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="h-[100dvh] bg-background flex items-center justify-center px-4 overflow-y-auto">
        <div className="text-center">
          <Lock className="w-10 h-10 text-destructive mx-auto mb-3" />
          <h1 className="text-2xl font-display font-bold">{t("adminPanel")}</h1>
          <p className="text-sm text-muted-foreground mt-2">Доступ запрещён. Требуется роль администратора.</p>
        </div>
      </div>
    );
  }

  return (
    <div id="admin-scroll" className="h-[100dvh] bg-background overflow-y-auto" onFocus={(e) => { const t = e.target as HTMLElement; if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') (t as HTMLInputElement).select(); }}>
      <div className="w-full max-w-2xl mx-auto px-4 py-6 pb-12">
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
        <div className="flex gap-1.5 mb-6 flex-wrap">
          {TAB_CONFIG.map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm transition-all ${
                tab === key 
                  ? "bg-card border border-primary/50 text-foreground shadow-sm" 
                  : "text-muted-foreground hover:text-foreground hover:bg-card/50"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {key === "stats" ? "📊 Стата" : key === "topics" ? "Темы" : key === "games" ? "Игры" : key === "users" ? "Юзеры" : key === "translations" ? "Языки" : key === "generator" ? "ИИ-генератор" : key === "checker" ? "ИИ-проверка" : key === "alltexts" ? "Все тексты" : key === "stuffonly" ? "Stuff Only" : key === "courses" ? "Курсы" : t(label as any)}
            </button>
          ))}
        </div>

        {/* Hide level selector for non-level tabs */}
        {tab === "topics" && <TopicsEditor />}
        {tab === "vocabulary" && <VocabEditor level={level} />}
        {tab === "grammar" && <GrammarEditor level={level} />}
        {tab === "reading" && <ReadingEditor level={level} />}
        {tab === "listening" && <ListeningEditor level={level} />}
        {tab === "shop" && <ShopEditor />}
        {tab === "games" && <GamesEditor level={level} />}
        {tab === "users" && <UsersEditor />}
        {tab === "translations" && <TranslationsLauncher />}
        {tab === "generator" && <ContentGenerator level={level} />}
        {tab === "checker" && <TranslationChecker />}
        {tab === "alltexts" && <AllTextsEditor />}
        {tab === "stuffonly" && <StuffOnlyTab />}
        {tab === "courses" && <CourseEditor level={level} />}
      </div>
    </div>
  );
};

// ——— Save Button Component ———
const SaveButton = ({ dirty, saving, onSave }: { dirty: boolean; saving: boolean; onSave: () => void }) => {
  const { t } = useLanguage();
  if (!dirty) return null;
  return (
    <button
      onClick={onSave}
      disabled={saving}
      className="sticky bottom-4 z-20 w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow transition-all disabled:opacity-60"
    >
      {saving ? (
        <span className="animate-pulse">{t("loading")}</span>
      ) : (
        <>
          <Check className="w-4 h-4" /> {t("saveChanges") || "Сохранить изменения"}
        </>
      )}
    </button>
  );
};

// ——— Vocabulary Editor ———
const VocabEditor = ({ level }: { level: Level }) => {
  const { t } = useLanguage();
  const [cards, setCards] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingUpdates, setPendingUpdates] = useState<Map<string, Record<string, string>>>(new Map());
  const [topicsList, setTopicsList] = useState<string[]>([]);
  const [filterTopic, setFilterTopic] = useState<string>("__all__");

  const load = useCallback(async () => {
    setLoading(true);
    const [cardsRes, topicsRes] = await Promise.all([
      supabase.from("vocab_cards").select("*").eq("level", level).order("sort_order"),
      supabase.from("topics").select("name").eq("level", level).order("sort_order"),
    ]);
    setCards(cardsRes.data ?? []);
    setTopicsList((topicsRes.data ?? []).map((t: any) => t.name));
    setLoading(false);
    setDirty(false);
    setPendingUpdates(new Map());
  }, [level]);

  useEffect(() => { load(); }, [load]);

  const trackChange = (id: string, field: string, value: string) => {
    setPendingUpdates((prev) => {
      const next = new Map(prev);
      next.set(id, { ...(next.get(id) ?? {}), [field]: value });
      return next;
    });
    setDirty(true);
  };

  const saveAll = async () => {
    setSaving(true);
    const promises = Array.from(pendingUpdates.entries()).map(([id, updates]) =>
      supabase.from("vocab_cards").update(updates).eq("id", id)
    );
    await Promise.all(promises);
    setPendingUpdates(new Map());
    setDirty(false);
    setSaving(false);
    toast.success(t("saved") || "Сохранено!");
  };

  const addCard = async () => {
    const topic = filterTopic !== "__all__" ? filterTopic : "Allgemein";
    await supabase.from("vocab_cards").insert([{
      level, german: t("newWordGerman"), russian: t("newWord"), sort_order: cards.length + 1, topic,
    }]);
    withScroll(load);
  };

  const deleteCard = async (id: string) => {
    await supabase.from("vocab_cards").delete().eq("id", id);
    withScroll(load);
  };

  if (loading) return <p className="text-muted-foreground">{t("loading")}</p>;

  const filtered = filterTopic === "__all__" ? cards : cards.filter(c => (c.topic || "Allgemein") === filterTopic);

  return (
    <div className="flex flex-col gap-3">
      {/* Topic filter */}
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => setFilterTopic("__all__")} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${filterTopic === "__all__" ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-muted-foreground"}`}>
          Все ({cards.length})
        </button>
        {topicsList.map(tp => {
          const count = cards.filter(c => (c.topic || "Allgemein") === tp).length;
          return (
            <button key={tp} onClick={() => setFilterTopic(tp)} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${filterTopic === tp ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-muted-foreground"}`}>
              {tp} ({count})
            </button>
          );
        })}
      </div>

      {filtered.map((card) => (
        <div key={card.id} className="glass-card p-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <input defaultValue={card.german} onChange={(e) => trackChange(card.id, "german", e.target.value)} placeholder={t("german")} className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
            <input defaultValue={card.russian} onChange={(e) => trackChange(card.id, "russian", e.target.value)} placeholder="🇷🇺 Перевод" className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <input defaultValue={card.ukrainian ?? ""} onChange={(e) => trackChange(card.id, "ukrainian", e.target.value)} placeholder="🇺🇦 Переклад" className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
          </div>
          <div className="flex gap-2">
            <input defaultValue={card.article ?? ""} onChange={(e) => trackChange(card.id, "article", e.target.value)} placeholder={t("article")} className="w-20 px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
            <input defaultValue={card.example ?? ""} onChange={(e) => trackChange(card.id, "example", e.target.value)} placeholder={t("example")} className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
            <select defaultValue={card.topic ?? "Allgemein"} onChange={(e) => trackChange(card.id, "topic", e.target.value)} className="w-28 px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none">
              {topicsList.map(tp => <option key={tp} value={tp}>{tp}</option>)}
            </select>
            <button onClick={() => deleteCard(card.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
      <button onClick={addCard} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all">
        <Plus className="w-4 h-4" /> {t("addWord")}
      </button>
      <SaveButton dirty={dirty} saving={saving} onSave={saveAll} />
    </div>
  );
};

// ——— Grammar Editor ———
const GrammarEditor = ({ level }: { level: Level }) => {
  const { t } = useLanguage();
  const [lessons, setLessons] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingLessonUpdates, setPendingLessonUpdates] = useState<Map<string, Record<string, any>>>(new Map());
  const [pendingQUpdates, setPendingQUpdates] = useState<Map<string, Record<string, any>>>(new Map());
  const [topicsList, setTopicsList] = useState<string[]>([]);
  const [filterTopic, setFilterTopic] = useState<string>("__all__");

  const load = useCallback(async () => {
    setLoading(true);
    const [lessonsRes, qRes, topicsRes] = await Promise.all([
      supabase.from("grammar_lessons").select("*").eq("level", level).order("topic"),
      supabase.from("grammar_questions").select("*").eq("level", level).order("sort_order"),
      supabase.from("topics").select("name").eq("level", level).order("sort_order"),
    ]);
    setLessons(lessonsRes.data ?? []);
    setQuestions(qRes.data ?? []);
    setTopicsList((topicsRes.data ?? []).map((t: any) => t.name));
    setLoading(false);
    setDirty(false);
    setPendingLessonUpdates(new Map());
    setPendingQUpdates(new Map());
  }, [level]);

  useEffect(() => { load(); }, [load]);

  const trackLessonChange = (id: string, updates: Record<string, any>) => {
    setPendingLessonUpdates((prev) => {
      const next = new Map(prev);
      next.set(id, { ...(next.get(id) ?? {}), ...updates });
      return next;
    });
    setDirty(true);
  };

  const trackQChange = (id: string, updates: Record<string, any>) => {
    setPendingQUpdates((prev) => {
      const next = new Map(prev);
      next.set(id, { ...(next.get(id) ?? {}), ...updates });
      return next;
    });
    setDirty(true);
  };

  const saveAll = async () => {
    setSaving(true);
    const promises: PromiseLike<any>[] = [];

    for (const [id, updates] of pendingLessonUpdates.entries()) {
      promises.push(supabase.from("grammar_lessons").update(updates).eq("id", id).then());
    }
    for (const [id, updates] of pendingQUpdates.entries()) {
      promises.push(supabase.from("grammar_questions").update(updates).eq("id", id).then());
    }

    await Promise.all(promises);
    setDirty(false);
    setPendingLessonUpdates(new Map());
    setPendingQUpdates(new Map());
    setSaving(false);
    toast.success(t("saved") || "Сохранено!");
  };

  const addLesson = async () => {
    const topic = filterTopic !== "__all__" ? filterTopic : "Allgemein";
    await supabase.from("grammar_lessons").insert([{ level, theory: "", topic }]);
    withScroll(load);
  };

  const deleteLesson = async (id: string) => {
    if (!confirm("Удалить теорию грамматики?")) return;
    await supabase.from("grammar_lessons").delete().eq("id", id);
    withScroll(load);
  };

  const addQuestion = async () => {
    const topic = filterTopic !== "__all__" ? filterTopic : "Allgemein";
    await supabase.from("grammar_questions").insert([{
      level, question: t("newQuestion"), options: ["A", "B", "C", "D"], correct_index: 0, sort_order: questions.length + 1, topic,
    }]);
    withScroll(load);
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from("grammar_questions").delete().eq("id", id);
    withScroll(load);
  };

  if (loading) return <p className="text-muted-foreground">{t("loading")}</p>;

  const filteredLessons = filterTopic === "__all__" ? lessons : lessons.filter(l => (l.topic || "Allgemein") === filterTopic);
  const filteredQuestions = filterTopic === "__all__" ? questions : questions.filter(q => (q.topic || "Allgemein") === filterTopic);

  return (
    <div className="flex flex-col gap-4">
      {/* Topic filter */}
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => setFilterTopic("__all__")} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${filterTopic === "__all__" ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-muted-foreground"}`}>
          Все ({lessons.length}T / {questions.length}Q)
        </button>
        {topicsList.map(tp => {
          const lCount = lessons.filter(l => (l.topic || "Allgemein") === tp).length;
          const qCount = questions.filter(q => (q.topic || "Allgemein") === tp).length;
          return (
            <button key={tp} onClick={() => setFilterTopic(tp)} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${filterTopic === tp ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-muted-foreground"}`}>
              {tp} ({lCount}T/{qCount}Q)
            </button>
          );
        })}
      </div>

      {/* Grammar lessons (theory per topic) */}
      <h3 className="text-sm font-display font-semibold text-muted-foreground">📖 Теория</h3>
      {filteredLessons.map((lesson) => (
        <div key={lesson.id} className="glass-card p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <select defaultValue={lesson.topic ?? "Allgemein"} onChange={(e) => trackLessonChange(lesson.id, { topic: e.target.value })} className="px-2 py-1 rounded-lg bg-secondary text-foreground border border-border text-xs focus:border-primary focus:outline-none">
                {topicsList.map(tp => <option key={tp} value={tp}>{tp}</option>)}
              </select>
              <span className="text-[10px] text-muted-foreground">Теория</span>
            </div>
            <button onClick={() => deleteLesson(lesson.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
          <textarea defaultValue={lesson.theory} onChange={(e) => trackLessonChange(lesson.id, { theory: e.target.value })} rows={6} className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none resize-y" />
        </div>
      ))}
      <button onClick={addLesson} className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all text-sm">
        <Plus className="w-4 h-4" /> Добавить теорию {filterTopic !== "__all__" ? `(${filterTopic})` : ""}
      </button>

      <h3 className="text-sm font-display font-semibold text-muted-foreground">❓ {t("questions")}</h3>
      {filteredQuestions.map((q) => (
        <div key={q.id} className="glass-card p-4 flex flex-col gap-2">
          <div className="flex gap-2 items-start">
            <input defaultValue={q.question} onChange={(e) => trackQChange(q.id, { question: e.target.value })} placeholder={t("questionLabel")} className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
            <select defaultValue={q.topic ?? "Allgemein"} onChange={(e) => trackQChange(q.id, { topic: e.target.value })} className="w-28 px-2 py-2 rounded-lg bg-secondary text-foreground border border-border text-xs focus:border-primary focus:outline-none">
              {topicsList.map(tp => <option key={tp} value={tp}>{tp}</option>)}
            </select>
            <button onClick={() => deleteQuestion(q.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          {q.options.map((opt: string, i: number) => (
            <div key={i} className="flex gap-2 items-center">
              <input type="radio" name={`correct-${q.id}`} checked={q.correct_index === i} onChange={() => trackQChange(q.id, { correct_index: i })} className="accent-primary" />
              <input defaultValue={opt} onChange={(e) => { const newOpts = [...q.options]; newOpts[i] = e.target.value; trackQChange(q.id, { options: newOpts }); }} className="flex-1 px-3 py-1.5 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
            </div>
          ))}
          <input defaultValue={q.explanation ?? ""} onChange={(e) => trackQChange(q.id, { explanation: e.target.value || null })} placeholder={t("explanationOptional")} className="px-3 py-1.5 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
        </div>
      ))}
      <button onClick={addQuestion} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all">
        <Plus className="w-4 h-4" /> {t("addQuestion")} {filterTopic !== "__all__" ? `(${filterTopic})` : ""}
      </button>
      <SaveButton dirty={dirty} saving={saving} onSave={saveAll} />
    </div>
  );
};

// ——— Reading Editor ———
const ReadingEditor = ({ level }: { level: Level }) => {
  const { t } = useLanguage();
  const [texts, setTexts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingTextUpdates, setPendingTextUpdates] = useState<Map<string, Record<string, any>>>(new Map());
  const [pendingQUpdates, setPendingQUpdates] = useState<Map<string, Record<string, any>>>(new Map());
  const [topicsList, setTopicsList] = useState<string[]>([]);
  const [filterTopic, setFilterTopic] = useState<string>("__all__");

  const load = useCallback(async () => {
    setLoading(true);
    const [textsRes, topicsRes] = await Promise.all([
      supabase.from("reading_texts").select("*, reading_questions(*)").eq("level", level).order("sort_order"),
      supabase.from("topics").select("name").eq("level", level).order("sort_order"),
    ]);
    setTexts(textsRes.data ?? []);
    setTopicsList((topicsRes.data ?? []).map((t: any) => t.name));
    setLoading(false);
    setDirty(false);
    setPendingTextUpdates(new Map());
    setPendingQUpdates(new Map());
  }, [level]);

  useEffect(() => { load(); }, [load]);

  const trackTextChange = (id: string, updates: Record<string, any>) => {
    setPendingTextUpdates((prev) => {
      const next = new Map(prev);
      next.set(id, { ...(next.get(id) ?? {}), ...updates });
      return next;
    });
    setDirty(true);
  };

  const trackQChange = (id: string, updates: Record<string, any>) => {
    setPendingQUpdates((prev) => {
      const next = new Map(prev);
      next.set(id, { ...(next.get(id) ?? {}), ...updates });
      return next;
    });
    setDirty(true);
  };

  const saveAll = async () => {
    setSaving(true);
    const promises: PromiseLike<any>[] = [];
    for (const [id, updates] of pendingTextUpdates.entries()) {
      promises.push(supabase.from("reading_texts").update(updates).eq("id", id).then());
    }
    for (const [id, updates] of pendingQUpdates.entries()) {
      promises.push(supabase.from("reading_questions").update(updates).eq("id", id).then());
    }
    await Promise.all(promises);
    setDirty(false);
    setPendingTextUpdates(new Map());
    setPendingQUpdates(new Map());
    setSaving(false);
    toast.success(t("saved") || "Сохранено!");
  };

  const addText = async () => {
    await supabase.from("reading_texts").insert([{ level, title: t("newText"), text: t("textHere"), sort_order: texts.length + 1 }]);
    withScroll(load);
  };

  const deleteText = async (id: string) => {
    await supabase.from("reading_texts").delete().eq("id", id);
    withScroll(load);
  };

  const addQuestion = async (readingId: string, count: number) => {
    await supabase.from("reading_questions").insert([{
      reading_id: readingId, question: t("newQuestion"), options: ["A", "B", "C", "D"], correct_index: 0, sort_order: count + 1,
    }]);
    withScroll(load);
  };

  const deleteQuestion = async (id: string) => {
    await supabase.from("reading_questions").delete().eq("id", id);
    withScroll(load);
  };

  if (loading) return <p className="text-muted-foreground">{t("loading")}</p>;

  const filtered = filterTopic === "__all__" ? texts : texts.filter(t => (t.topic || "Allgemein") === filterTopic);

  return (
    <div className="flex flex-col gap-4">
      {/* Topic filter */}
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => setFilterTopic("__all__")} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${filterTopic === "__all__" ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-muted-foreground"}`}>
          Все ({texts.length})
        </button>
        {topicsList.map(tp => {
          const count = texts.filter(t => (t.topic || "Allgemein") === tp).length;
          return (
            <button key={tp} onClick={() => setFilterTopic(tp)} className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-colors ${filterTopic === tp ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-muted-foreground"}`}>
              {tp} ({count})
            </button>
          );
        })}
      </div>

      {filtered.map((txt) => (
        <div key={txt.id} className="glass-card p-4 flex flex-col gap-3">
          <div className="flex gap-2 items-start">
            <input defaultValue={txt.title} onChange={(e) => trackTextChange(txt.id, { title: e.target.value })} placeholder={t("title")} className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm font-semibold focus:border-primary focus:outline-none" />
            <select defaultValue={txt.topic ?? "Allgemein"} onChange={(e) => trackTextChange(txt.id, { topic: e.target.value })} className="w-28 px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none">
              {topicsList.map(tp => <option key={tp} value={tp}>{tp}</option>)}
            </select>
            <button onClick={() => deleteText(txt.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
          <textarea defaultValue={txt.text} onChange={(e) => trackTextChange(txt.id, { text: e.target.value })} rows={4} className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none resize-y" />

          <p className="text-xs text-muted-foreground font-display">{t("textQuestions")}</p>
          {(txt.reading_questions ?? [])
            .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
            .map((q: any) => (
            <div key={q.id} className="ml-2 border-l-2 border-border pl-3 flex flex-col gap-1.5">
              <div className="flex gap-2 items-start">
                <input defaultValue={q.question} onChange={(e) => trackQChange(q.id, { question: e.target.value })} className="flex-1 px-3 py-1.5 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
                <button onClick={() => deleteQuestion(q.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded-lg">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              {q.options.map((opt: string, i: number) => (
                <div key={i} className="flex gap-2 items-center">
                  <input type="radio" name={`rq-correct-${q.id}`} checked={q.correct_index === i} onChange={() => trackQChange(q.id, { correct_index: i })} className="accent-primary" />
                  <input defaultValue={opt} onChange={(e) => { const newOpts = [...q.options]; newOpts[i] = e.target.value; trackQChange(q.id, { options: newOpts }); }} className="flex-1 px-3 py-1 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none" />
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
      <SaveButton dirty={dirty} saving={saving} onSave={saveAll} />
    </div>
  );
};

// ——— Games Editor ———
const GamesEditor = ({ level }: { level: Level }) => {
  const [wordsCount, setWordsCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { count } = await supabase
        .from("vocab_cards")
        .select("*", { count: "exact", head: true })
        .eq("level", level)
        .not("article", "is", null);
      setWordsCount(count ?? 0);
      setLoading(false);
    };
    load();
  }, [level]);

  if (loading) return <p className="text-muted-foreground">Загрузка...</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="glass-card p-5">
        <h3 className="font-display text-sm font-bold text-foreground mb-1 flex items-center gap-2">
          ♻️ Der/Die/Das: Сортировка мусора
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Игра берёт слова из карточек словаря (vocab_cards) с заполненным артиклем.
        </p>
        <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 border border-border">
          <div className="text-center">
            <span className="text-2xl font-display font-bold text-primary">{wordsCount}</span>
            <p className="text-[10px] text-muted-foreground">слов с артиклем</p>
          </div>
          <div className="flex-1 text-xs text-muted-foreground">
            Уровень <span className="font-semibold text-foreground">{level}</span> · Чтобы добавить слова в игру, перейди во вкладку «Словарь» и убедись, что у карточек заполнено поле «Артикль» (der/die/das).
          </div>
        </div>
      </div>

      {/* Café Bestellung Editor */}
      <CafeEditor level={level} />
    </div>
  );
};

// ——— Translations Launcher ———
const TranslationsLauncher = () => {
  const navigate = useNavigate();
  const { setEditMode } = useLanguage();

  const handleLaunch = () => {
    setEditMode(true);
    navigate("/");
  };

  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <Globe className="w-12 h-12 text-primary/40" />
      <h2 className="font-display text-lg font-bold text-foreground">Редактирование переводов</h2>
      <p className="text-sm text-muted-foreground text-center max-w-sm">
        Нажмите кнопку, чтобы перейти на обычные страницы приложения. Все тексты станут кликабельными — нажмите на любой, чтобы отредактировать.
      </p>
      <button
        onClick={handleLaunch}
        className="flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm hover:opacity-90 transition-opacity"
      >
        <Pencil className="w-4 h-4" />
        Начать редактирование
      </button>
    </div>
  );
};

export default Admin;
