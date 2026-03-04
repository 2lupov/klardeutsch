import { useState, useEffect, useCallback } from "react";

const withScroll = async (fn: () => Promise<void>) => {
  const el = document.getElementById("admin-scroll");
  const scrollTop = el?.scrollTop ?? 0;
  await fn();
  requestAnimationFrame(() => { if (el) el.scrollTop = scrollTop; });
};
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, ChevronDown, ChevronUp, Save, Loader2, X, Pencil, Hash } from "lucide-react";
import { toast } from "sonner";

type Level = "A1" | "A2" | "B1" | "B2" | "C1";
const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1"];

interface Topic {
  id: string;
  level: string;
  name: string;
  emoji: string;
  sort_order: number;
  // Computed counts
  vocab_count?: number;
  grammar_count?: number;
  reading_count?: number;
  listening_count?: number;
}

const TopicsEditor = () => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeLevel, setActiveLevel] = useState<Level>("A1");
  const [newName, setNewName] = useState("");
  const [newEmoji, setNewEmoji] = useState("📂");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editEmoji, setEditEmoji] = useState("");

  const load = useCallback(async () => {
    setLoading(true);

    // Load topics
    const { data: topicsData } = await supabase
      .from("topics")
      .select("*")
      .eq("level", activeLevel)
      .order("sort_order", { ascending: true });

    const topicsList = (topicsData as Topic[]) ?? [];

    // Load counts per topic for this level
    const [vocabRes, grammarRes, readingRes, listeningRes] = await Promise.all([
      supabase.from("vocab_cards").select("topic").eq("level", activeLevel),
      supabase.from("grammar_questions").select("topic").eq("level", activeLevel),
      supabase.from("reading_texts").select("topic").eq("level", activeLevel),
      supabase.from("listening_texts").select("topic").eq("level", activeLevel),
    ]);

    const countByTopic = (data: any[] | null) => {
      const map: Record<string, number> = {};
      (data || []).forEach(item => {
        const t = item.topic || "Allgemein";
        map[t] = (map[t] || 0) + 1;
      });
      return map;
    };

    const vocabCounts = countByTopic(vocabRes.data);
    const grammarCounts = countByTopic(grammarRes.data);
    const readingCounts = countByTopic(readingRes.data);
    const listeningCounts = countByTopic(listeningRes.data);

    const enriched = topicsList.map(t => ({
      ...t,
      vocab_count: vocabCounts[t.name] || 0,
      grammar_count: grammarCounts[t.name] || 0,
      reading_count: readingCounts[t.name] || 0,
      listening_count: listeningCounts[t.name] || 0,
    }));

    setTopics(enriched);
    setLoading(false);
  }, [activeLevel]);

  useEffect(() => { load(); }, [load]);

  const addTopic = async () => {
    if (!newName.trim()) return;
    const { error } = await supabase.from("topics").insert({
      level: activeLevel,
      name: newName.trim(),
      emoji: newEmoji || "📂",
      sort_order: topics.length,
    } as any);
    if (error) {
      if (error.message.includes("duplicate")) toast.error("Тема с таким именем уже существует");
      else toast.error("Ошибка: " + error.message);
      return;
    }
    toast.success(`Тема "${newName.trim()}" создана!`);
    setNewName("");
    setNewEmoji("📂");
    withScroll(load);
  };

  const deleteTopic = async (topic: Topic) => {
    const total = (topic.vocab_count || 0) + (topic.grammar_count || 0) + (topic.reading_count || 0) + (topic.listening_count || 0);
    if (total > 0) {
      if (!confirm(`В теме "${topic.name}" есть ${total} единиц контента. Контент будет перемещён в "Allgemein". Продолжить?`)) return;
      // Move content to Allgemein
      await Promise.all([
        supabase.from("vocab_cards").update({ topic: "Allgemein" } as any).eq("level", activeLevel).eq("topic", topic.name),
        supabase.from("grammar_questions").update({ topic: "Allgemein" } as any).eq("level", activeLevel).eq("topic", topic.name),
        supabase.from("grammar_lessons").update({ topic: "Allgemein" } as any).eq("level", activeLevel).eq("topic", topic.name),
        supabase.from("reading_texts").update({ topic: "Allgemein" } as any).eq("level", activeLevel).eq("topic", topic.name),
        supabase.from("listening_texts").update({ topic: "Allgemein" } as any).eq("level", activeLevel).eq("topic", topic.name),
      ]);
    } else {
      if (!confirm(`Удалить тему "${topic.name}"?`)) return;
    }
    await supabase.from("topics").delete().eq("id", topic.id);
    toast.success("Тема удалена");
    withScroll(load);
  };

  const saveEdit = async () => {
    if (!editingId || !editName.trim()) return;
    const oldTopic = topics.find(t => t.id === editingId);
    if (!oldTopic) return;

    // Update topic
    await supabase.from("topics").update({ name: editName.trim(), emoji: editEmoji || "📂" } as any).eq("id", editingId);

    // If name changed, rename in content tables
    if (oldTopic.name !== editName.trim()) {
      await Promise.all([
        supabase.from("vocab_cards").update({ topic: editName.trim() } as any).eq("level", activeLevel).eq("topic", oldTopic.name),
        supabase.from("grammar_questions").update({ topic: editName.trim() } as any).eq("level", activeLevel).eq("topic", oldTopic.name),
        supabase.from("grammar_lessons").update({ topic: editName.trim() } as any).eq("level", activeLevel).eq("topic", oldTopic.name),
        supabase.from("reading_texts").update({ topic: editName.trim() } as any).eq("level", activeLevel).eq("topic", oldTopic.name),
        supabase.from("listening_texts").update({ topic: editName.trim() } as any).eq("level", activeLevel).eq("topic", oldTopic.name),
      ]);
    }

    toast.success("Тема обновлена ✅");
    setEditingId(null);
    withScroll(load);
  };

  const moveTopic = async (index: number, dir: -1 | 1) => {
    const ni = index + dir;
    if (ni < 0 || ni >= topics.length) return;
    const newTopics = [...topics];
    [newTopics[index], newTopics[ni]] = [newTopics[ni], newTopics[index]];
    newTopics.forEach((t, i) => t.sort_order = i);
    setTopics(newTopics);
    await Promise.all(newTopics.map((t, i) =>
      supabase.from("topics").update({ sort_order: i } as any).eq("id", t.id)
    ));
  };

  const addToAllLevels = async () => {
    if (!newName.trim()) return;
    let added = 0;
    for (const lvl of LEVELS) {
      const { error } = await supabase.from("topics").insert({
        level: lvl, name: newName.trim(), emoji: newEmoji || "📂", sort_order: 99,
      } as any);
      if (!error) added++;
    }
    toast.success(`Тема "${newName.trim()}" добавлена в ${added} уровней`);
    setNewName("");
    setNewEmoji("📂");
    withScroll(load);
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Level tabs */}
      <div className="flex gap-1.5">
        {LEVELS.map(l => (
          <button
            key={l}
            onClick={() => setActiveLevel(l)}
            className={`flex-1 py-2 rounded-xl font-display font-bold text-sm transition-all ${
              activeLevel === l ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {l}
          </button>
        ))}
      </div>

      {/* Add new topic */}
      <div className="glass-card p-4 space-y-3">
        <p className="text-xs text-muted-foreground font-bold uppercase">Новая тема</p>
        <div className="flex gap-2">
          <input
            value={newEmoji}
            onChange={e => setNewEmoji(e.target.value)}
            placeholder="📂"
            className="w-12 px-2 py-2.5 rounded-xl bg-secondary text-foreground border border-border text-sm text-center focus:border-primary focus:outline-none"
          />
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && addTopic()}
            placeholder="Название темы (Essen, Technik...)"
            className="flex-1 px-3 py-2.5 rounded-xl bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={addTopic}
            disabled={!newName.trim()}
            className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-bold disabled:opacity-40 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" /> Добавить в {activeLevel}
          </button>
          <button
            onClick={addToAllLevels}
            disabled={!newName.trim()}
            className="py-2.5 px-4 rounded-xl bg-secondary border border-border text-foreground text-sm font-medium disabled:opacity-40 hover:border-primary/30 transition-colors"
          >
            Во все уровни
          </button>
        </div>
      </div>

      {/* Topics list */}
      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : topics.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-8">Нет тем для {activeLevel}</p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">{topics.length} тем для {activeLevel}</p>
          {topics.map((topic, i) => (
            <div key={topic.id} className="glass-card p-3">
              <div className="flex items-center gap-2">
                {/* Reorder */}
                <div className="flex flex-col gap-0.5 shrink-0">
                  <button onClick={() => moveTopic(i, -1)} disabled={i === 0} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronUp className="w-3 h-3" /></button>
                  <button onClick={() => moveTopic(i, 1)} disabled={i === topics.length - 1} className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-20"><ChevronDown className="w-3 h-3" /></button>
                </div>

                {editingId === topic.id ? (
                  <div className="flex-1 flex gap-1.5 items-center">
                    <input value={editEmoji} onChange={e => setEditEmoji(e.target.value)} className="w-10 px-1 py-1.5 rounded-lg bg-secondary text-foreground border border-primary text-sm text-center" />
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && saveEdit()}
                      autoFocus
                      className="flex-1 px-2 py-1.5 rounded-lg bg-secondary text-foreground border border-primary text-sm focus:outline-none"
                    />
                    <button onClick={saveEdit} className="p-1.5 rounded-lg bg-primary/10 text-primary"><Save className="w-3 h-3" /></button>
                    <button onClick={() => setEditingId(null)} className="p-1.5 rounded-lg text-muted-foreground"><X className="w-3 h-3" /></button>
                  </div>
                ) : (
                  <>
                    <span className="text-lg shrink-0">{topic.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{topic.name}</p>
                      <div className="flex gap-2 mt-0.5 text-[10px] text-muted-foreground">
                        {topic.vocab_count! > 0 && <span>📚 {topic.vocab_count}</span>}
                        {topic.grammar_count! > 0 && <span>📝 {topic.grammar_count}</span>}
                        {topic.reading_count! > 0 && <span>📕 {topic.reading_count}</span>}
                        {topic.listening_count! > 0 && <span>🎧 {topic.listening_count}</span>}
                        {(topic.vocab_count! + topic.grammar_count! + topic.reading_count! + topic.listening_count!) === 0 && <span className="italic">Пусто</span>}
                      </div>
                    </div>
                    <button
                      onClick={() => { setEditingId(topic.id); setEditName(topic.name); setEditEmoji(topic.emoji); }}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {topic.name !== "Allgemein" && (
                      <button
                        onClick={() => deleteTopic(topic)}
                        className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TopicsEditor;
