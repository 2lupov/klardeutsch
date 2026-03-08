import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Zap, Check, X, Wand2, Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";

type Level = "A1" | "A2" | "B1" | "B2" | "C1";
type ContentType = "grammar" | "vocab" | "reading" | "listening";

interface TopicInfo {
  level: Level;
  topic: string;
  emoji: string;
}

interface JobResult {
  key: string;
  status: "pending" | "running" | "done" | "error";
  inserted?: number;
  error?: string;
}

const LEVELS: Level[] = ["A1", "A2", "B1", "B2", "C1"];
const CONTENT_TYPES: { key: ContentType; label: string; emoji: string }[] = [
  { key: "grammar", label: "Грамматика", emoji: "📝" },
  { key: "vocab", label: "Словарь", emoji: "📖" },
  { key: "reading", label: "Чтение", emoji: "📄" },
  { key: "listening", label: "Аудирование", emoji: "🎧" },
];

const SUGGESTED_EMOJIS = ["📚", "🏠", "🍎", "✈️", "💼", "🎯", "🎨", "🏥", "🛒", "🎉", "📱", "🌍", "🚗", "👨‍👩‍👧", "💰"];

const BulkGenerator = () => {
  const [topics, setTopics] = useState<TopicInfo[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<ContentType[]>(["grammar", "vocab"]);
  const [selectedLevels, setSelectedLevels] = useState<Level[]>(["A1"]);
  const [running, setRunning] = useState(false);
  const [jobs, setJobs] = useState<JobResult[]>([]);
  const [currentJob, setCurrentJob] = useState("");
  const [totalDone, setTotalDone] = useState(0);
  const [totalJobs, setTotalJobs] = useState(0);

  // New topic creation
  const [showNewTopic, setShowNewTopic] = useState(false);
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicLevel, setNewTopicLevel] = useState<Level>("A1");
  const [newTopicEmoji, setNewTopicEmoji] = useState("📚");
  const [creatingTopic, setCreatingTopic] = useState(false);
  const [creationResult, setCreationResult] = useState<any>(null);

  useEffect(() => {
    loadTopics();
  }, []);

  const loadTopics = async () => {
    const { data } = await supabase
      .from("topics")
      .select("level, name, emoji")
      .order("level")
      .order("sort_order");
    if (data) {
      setTopics(
        data
          .filter((t: any) => t.name !== "Aufgabensammlung")
          .map((t: any) => ({ level: t.level as Level, topic: t.name, emoji: t.emoji || "📂" }))
      );
    }
  };

  const toggleType = (t: ContentType) => {
    setSelectedTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]
    );
  };

  const toggleLevel = (l: Level) => {
    setSelectedLevels((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]
    );
  };

  const createNewTopic = async () => {
    if (!newTopicName.trim()) {
      toast.error("Введи название темы");
      return;
    }

    setCreatingTopic(true);
    setCreationResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("generate-new-topic", {
        body: {
          level: newTopicLevel,
          topicName: newTopicName.trim(),
          topicEmoji: newTopicEmoji,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCreationResult(data.results);
      toast.success(`Тема "${newTopicName}" создана!`);
      setNewTopicName("");
      loadTopics();
    } catch (e: any) {
      console.error("Create topic error:", e);
      toast.error("Ошибка: " + e.message);
    }

    setCreatingTopic(false);
  };

  const startGeneration = async () => {
    if (selectedTypes.length === 0 || selectedLevels.length === 0) {
      toast.error("Выбери хотя бы один уровень и тип");
      return;
    }

    const relevantTopics = topics.filter((t) => selectedLevels.includes(t.level));
    const allJobs: JobResult[] = [];
    for (const topic of relevantTopics) {
      for (const type of selectedTypes) {
        allJobs.push({
          key: `${topic.level}-${topic.topic}-${type}`,
          status: "pending",
        });
      }
    }

    setJobs(allJobs);
    setTotalJobs(allJobs.length);
    setTotalDone(0);
    setRunning(true);

    let done = 0;
    for (let i = 0; i < allJobs.length; i++) {
      const job = allJobs[i];

      const parts = job.key.split("-");
      const jobLevel = parts[0] as Level;
      const jobType = parts[parts.length - 1] as ContentType;
      const jobTopic = parts.slice(1, -1).join("-");

      setCurrentJob(`${jobLevel} / ${jobTopic} / ${jobType}`);
      setJobs((prev) =>
        prev.map((j, idx) => (idx === i ? { ...j, status: "running" } : j))
      );

      try {
        const { data, error } = await supabase.functions.invoke("bulk-generate-exercises", {
          body: { level: jobLevel, topic: jobTopic, type: jobType },
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        setJobs((prev) =>
          prev.map((j, idx) =>
            idx === i ? { ...j, status: "done", inserted: data.inserted } : j
          )
        );
        done++;
      } catch (e: any) {
        console.error(`Error for ${job.key}:`, e);
        setJobs((prev) =>
          prev.map((j, idx) =>
            idx === i ? { ...j, status: "error", error: e.message } : j
          )
        );
        done++;
      }

      setTotalDone(done);

      if (i < allJobs.length - 1) {
        await new Promise((r) => setTimeout(r, 1500));
      }
    }

    setRunning(false);
    setCurrentJob("");
    toast.success(`Генерация завершена! Обработано ${done}/${allJobs.length} задач`);
  };

  const doneCount = jobs.filter((j) => j.status === "done").length;
  const errorCount = jobs.filter((j) => j.status === "error").length;
  const totalInserted = jobs.reduce((sum, j) => sum + (j.inserted || 0), 0);
  const progressPct = totalJobs > 0 ? Math.round((totalDone / totalJobs) * 100) : 0;

  const [convertingTheory, setConvertingTheory] = useState(false);
  const [conversionResult, setConversionResult] = useState<string | null>(null);

  const convertGrammarTheory = async () => {
    setConvertingTheory(true);
    setConversionResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("convert-grammar-theory", {
        body: {},
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setConversionResult(`✅ Конвертировано: ${data.converted}/${data.total} уроков`);
      toast.success(`Конвертировано ${data.converted} уроков грамматики!`);
    } catch (e: any) {
      setConversionResult(`❌ Ошибка: ${e.message}`);
      toast.error("Ошибка конвертации: " + e.message);
    }
    setConvertingTheory(false);
  };

  return (
    <div className="space-y-5">
      {/* NEW: Create Topic with AI */}
      <div className="p-4 rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-sm text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            Создать новую тему с ИИ
          </h3>
          <button
            onClick={() => setShowNewTopic(!showNewTopic)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            {showNewTopic ? "Свернуть" : "Развернуть"}
          </button>
        </div>

        {showNewTopic && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              ИИ создаст тему и сгенерирует: 15 слов, грамматику с 10 упражнениями, текст для чтения и аудирования
            </p>

            {/* Level selector */}
            <div>
              <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Уровень</p>
              <div className="flex gap-1.5 flex-wrap">
                {LEVELS.map((l) => (
                  <button
                    key={l}
                    onClick={() => setNewTopicLevel(l)}
                    disabled={creatingTopic}
                    className={`px-2.5 py-1 rounded-md text-[11px] font-bold transition-all ${
                      newTopicLevel === l
                        ? "bg-purple-500 text-white"
                        : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Topic name */}
            <div>
              <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Название темы</p>
              <input
                type="text"
                value={newTopicName}
                onChange={(e) => setNewTopicName(e.target.value)}
                placeholder="Например: Einkaufen, Reisen, Familie..."
                disabled={creatingTopic}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
              />
            </div>

            {/* Emoji picker */}
            <div>
              <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider">Эмодзи</p>
              <div className="flex gap-1 flex-wrap">
                {SUGGESTED_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => setNewTopicEmoji(emoji)}
                    disabled={creatingTopic}
                    className={`w-8 h-8 rounded-md text-lg flex items-center justify-center transition-all ${
                      newTopicEmoji === emoji
                        ? "bg-purple-500 scale-110"
                        : "bg-secondary hover:bg-secondary/80"
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Create button */}
            <button
              onClick={createNewTopic}
              disabled={creatingTopic || !newTopicName.trim()}
              className="w-full py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all disabled:opacity-50"
            >
              {creatingTopic ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Создаю тему и контент...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  Создать тему с контентом
                </>
              )}
            </button>

            {/* Creation result */}
            {creationResult && (
              <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-xs text-green-400 font-bold mb-1">✅ Тема создана!</p>
                <div className="grid grid-cols-2 gap-1 text-[10px] text-muted-foreground">
                  <span>📖 Слова: {creationResult.vocab}</span>
                  <span>📝 Грамматика: {creationResult.grammar}</span>
                  <span>📄 Чтение: {creationResult.reading}</span>
                  <span>🎧 Аудирование: {creationResult.listening}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Convert Grammar Theory */}
      <div className="p-4 rounded-xl bg-accent/10 border border-accent/20">
        <h3 className="font-display font-bold text-sm text-foreground mb-1 flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-accent-foreground" />
          Конвертация теории грамматики
        </h3>
        <p className="text-xs text-muted-foreground mb-3">
          Преобразует markdown-теорию в красивые структурированные блоки (таблицы, правила, примеры)
        </p>
        <button
          onClick={convertGrammarTheory}
          disabled={convertingTheory}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-bold flex items-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50"
        >
          {convertingTheory ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Конвертация...</>
          ) : (
            <><Wand2 className="w-3.5 h-3.5" /> Конвертировать все</>
          )}
        </button>
        {conversionResult && (
          <p className="text-xs text-muted-foreground mt-2">{conversionResult}</p>
        )}
      </div>

      {/* Bulk Generate */}
      <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
        <h3 className="font-display font-bold text-sm text-primary mb-1 flex items-center gap-2">
          <Zap className="w-4 h-4" />
          Массовая генерация +10 заданий
        </h3>
        <p className="text-xs text-muted-foreground">
          ИИ сгенерирует по 10 новых заданий для каждой темы и типа упражнения
        </p>
      </div>

      {/* Level selection */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wider">Уровни</p>
        <div className="flex gap-2 flex-wrap">
          {LEVELS.map((l) => (
            <button
              key={l}
              onClick={() => toggleLevel(l)}
              disabled={running}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                selectedLevels.includes(l)
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              {l}
            </button>
          ))}
          <button
            onClick={() =>
              setSelectedLevels(selectedLevels.length === LEVELS.length ? [] : [...LEVELS])
            }
            disabled={running}
            className="px-3 py-1.5 rounded-lg text-xs text-muted-foreground border border-border hover:bg-secondary transition-all"
          >
            {selectedLevels.length === LEVELS.length ? "Снять все" : "Все"}
          </button>
        </div>
      </div>

      {/* Type selection */}
      <div>
        <p className="text-xs text-muted-foreground mb-2 font-semibold uppercase tracking-wider">Типы упражнений</p>
        <div className="flex gap-2 flex-wrap">
          {CONTENT_TYPES.map((ct) => (
            <button
              key={ct.key}
              onClick={() => toggleType(ct.key)}
              disabled={running}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1.5 ${
                selectedTypes.includes(ct.key)
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
              }`}
            >
              <span>{ct.emoji}</span>
              {ct.label}
            </button>
          ))}
        </div>
      </div>

      {/* Preview of what will be generated */}
      {selectedLevels.length > 0 && selectedTypes.length > 0 && (
        <div className="p-3 rounded-lg bg-secondary/50 border border-border/30">
          <p className="text-xs text-muted-foreground mb-1">
            Будет сгенерировано:{" "}
            <span className="text-foreground font-bold">
              {topics.filter((t) => selectedLevels.includes(t.level)).length * selectedTypes.length}
            </span>{" "}
            задач ({topics.filter((t) => selectedLevels.includes(t.level)).length} тем × {selectedTypes.length} типов)
          </p>
          <p className="text-[10px] text-muted-foreground">
            ≈ {topics.filter((t) => selectedLevels.includes(t.level)).length * selectedTypes.length * 10} новых заданий
          </p>
        </div>
      )}

      {/* Start button */}
      <button
        onClick={startGeneration}
        disabled={running || selectedLevels.length === 0 || selectedTypes.length === 0}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-bold text-sm flex items-center justify-center gap-2 hover:bg-primary/90 transition-all disabled:opacity-50"
      >
        {running ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Генерация... {progressPct}%
          </>
        ) : (
          <>
            <Zap className="w-4 h-4" />
            Запустить генерацию
          </>
        )}
      </button>

      {/* Progress */}
      {jobs.length > 0 && (
        <div className="space-y-2">
          {/* Progress bar */}
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300 rounded-full"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>{totalDone}/{totalJobs} задач</span>
            <span className="flex gap-3">
              {doneCount > 0 && <span className="text-green-400">✓ {doneCount}</span>}
              {errorCount > 0 && <span className="text-destructive">✗ {errorCount}</span>}
              {totalInserted > 0 && <span className="text-primary">+{totalInserted} заданий</span>}
            </span>
          </div>

          {/* Current job */}
          {currentJob && (
            <p className="text-xs text-muted-foreground animate-pulse">
              ⏳ {currentJob}
            </p>
          )}

          {/* Log */}
          <div className="max-h-48 overflow-y-auto space-y-0.5 rounded-lg bg-secondary/30 p-2">
            {jobs.map((j) => (
              <div
                key={j.key}
                className={`flex items-center gap-2 text-[10px] py-0.5 ${
                  j.status === "done"
                    ? "text-green-400"
                    : j.status === "error"
                    ? "text-destructive"
                    : j.status === "running"
                    ? "text-primary"
                    : "text-muted-foreground/50"
                }`}
              >
                {j.status === "done" && <Check className="w-3 h-3 shrink-0" />}
                {j.status === "error" && <X className="w-3 h-3 shrink-0" />}
                {j.status === "running" && <Loader2 className="w-3 h-3 shrink-0 animate-spin" />}
                {j.status === "pending" && <span className="w-3 h-3 shrink-0" />}
                <span className="truncate">{j.key}</span>
                {j.inserted != null && <span className="ml-auto shrink-0">+{j.inserted}</span>}
                {j.error && <span className="ml-auto shrink-0 truncate max-w-[150px]">{j.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default BulkGenerator;
