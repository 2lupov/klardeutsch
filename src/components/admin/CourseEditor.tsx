import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, Wand2, Copy, Check, FileJson, Upload, Loader2, Trash2,
  Plus, ChevronDown, ChevronUp, Eye, EyeOff, Save, Sparkles, GraduationCap
} from "lucide-react";
import { toast } from "sonner";

type Level = "A1" | "A2" | "B1" | "B2" | "C1";
type Step = "setup" | "prompt" | "import" | "preview";

interface CourseLesson {
  title: string;
  theory: string;
  exercises: {
    vocab_cards?: Array<{ german: string; russian: string; ukrainian?: string; article?: string; example?: string }>;
    grammar_questions?: Array<{ question: string; options: string[]; correct_index: number; explanation?: string }>;
    reading?: { title: string; text: string; questions: Array<{ question: string; options: string[]; correct_index: number; explanation?: string }> };
  };
}

interface CourseData {
  course: { title: string; description: string; level: string };
  lessons: CourseLesson[];
}

interface ExistingCourse {
  id: string;
  title: string;
  description: string | null;
  level: string;
  price: number;
  available: boolean;
  created_at: string;
  lessons_count?: number;
}

const CourseEditor = ({ level }: { level: Level }) => {
  const [step, setStep] = useState<Step>("setup");
  const [courseName, setCourseName] = useState("");
  const [description, setDescription] = useState("");
  const [lessonsCount, setLessonsCount] = useState("5");
  const [topics, setTopics] = useState("");

  const [generatedPrompt, setGeneratedPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const [jsonInput, setJsonInput] = useState("");
  const [validating, setValidating] = useState(false);
  const [courseData, setCourseData] = useState<CourseData | null>(null);

  const [saving, setSaving] = useState(false);
  const [expandedLesson, setExpandedLesson] = useState<number | null>(null);

  // Existing courses
  const [existingCourses, setExistingCourses] = useState<ExistingCourse[]>([]);
  const [loadingCourses, setLoadingCourses] = useState(true);

  const loadCourses = useCallback(async () => {
    setLoadingCourses(true);
    const { data } = await supabase
      .from("courses")
      .select("*")
      .order("created_at", { ascending: false });

    if (data) {
      // Count lessons for each course
      const coursesWithCount = await Promise.all(
        (data as any[]).map(async (c) => {
          const { count } = await supabase
            .from("course_lessons")
            .select("*", { count: "exact", head: true })
            .eq("course_id", c.id);
          return { ...c, lessons_count: count || 0 };
        })
      );
      setExistingCourses(coursesWithCount);
    }
    setLoadingCourses(false);
  }, []);

  useEffect(() => {
    loadCourses();
  }, [loadCourses]);

  const handleGeneratePrompt = async () => {
    if (!courseName.trim()) {
      toast.error("Введите название курса");
      return;
    }
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-course-prompt", {
        body: {
          action: "generate_prompt",
          courseName: courseName.trim(),
          level,
          lessonsCount: parseInt(lessonsCount) || 5,
          topics: topics.trim() ? topics.split(",").map((t) => t.trim()) : [],
          description: description.trim(),
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGeneratedPrompt(data.prompt);
      setStep("prompt");
      toast.success("Промпт сгенерирован!");
    } catch (err: any) {
      toast.error("Ошибка: " + err.message);
    }
    setGenerating(false);
  };

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    toast.success("Скопировано!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setJsonInput(text);
      toast.success(`Файл ${file.name} загружен`);
    } catch {
      toast.error("Не удалось прочитать файл");
    }
  };

  const handleValidateAndPreview = async () => {
    if (!jsonInput.trim()) {
      toast.error("Вставьте JSON или загрузите файл");
      return;
    }

    // Clean up markdown code blocks and whitespace
    let clean = jsonInput.trim();
    // Remove various markdown wrappers
    clean = clean.replace(/^```(?:json)?\s*\n?/i, "");
    clean = clean.replace(/\n?```\s*$/i, "");
    clean = clean.trim();

    // Try to extract JSON object if there's extra text around it
    const jsonMatch = clean.match(/(\{[\s\S]*\})/);
    if (jsonMatch) {
      clean = jsonMatch[1];
    }

    try {
      const parsed = JSON.parse(clean) as CourseData;
      if (!parsed.course || !parsed.lessons?.length) {
        toast.error("JSON распознан, но нет полей 'course' или 'lessons'. Проверьте структуру.");
        return;
      }
      // Auto-fill level if missing
      if (!parsed.course.level) {
        parsed.course.level = level;
      }
      setCourseData(parsed);
      setStep("preview");
      toast.success(`Курс "${parsed.course.title}" — ${parsed.lessons.length} уроков`);
      return;
    } catch (parseErr: any) {
      // Show specific parse error to help debug
      const errMsg = parseErr.message || "Неизвестная ошибка";
      const posMatch = errMsg.match(/position (\d+)/);
      let hint = errMsg;
      if (posMatch) {
        const pos = parseInt(posMatch[1]);
        const snippet = clean.substring(Math.max(0, pos - 30), pos + 30);
        hint = `Ошибка на позиции ${pos}: ...${snippet}...`;
      }
      console.error("JSON parse error:", errMsg, "\nFirst 200 chars:", clean.substring(0, 200));
      toast.error(`Ошибка парсинга JSON: ${hint}`);
    }

    // Fallback: try AI validation
    setValidating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-course-prompt", {
        body: { action: "validate_json", jsonData: clean },
      });
      if (error) throw error;
      if (data?.valid === false) {
        toast.error("JSON невалидный: " + (data.error || "Проверьте формат"));
        setValidating(false);
        return;
      }
      if (data?.course && data?.lessons) {
        setCourseData(data);
        setStep("preview");
        toast.success(`Курс распознан: ${data.lessons.length} уроков`);
      } else {
        toast.error("Не удалось распознать структуру курса");
      }
    } catch (err: any) {
      toast.error("Ошибка валидации: " + err.message);
    }
    setValidating(false);
  };

  const handleSaveCourse = async () => {
    if (!courseData) return;
    setSaving(true);
    try {
      // Create course
      const { data: courseRow, error: courseErr } = await supabase
        .from("courses")
        .insert({
          title: courseData.course.title,
          description: courseData.course.description || null,
          level: courseData.course.level || level,
          available: false,
        } as any)
        .select("id")
        .single();
      if (courseErr) throw courseErr;

      // Create lessons
      const lessons = courseData.lessons.map((l, i) => ({
        course_id: (courseRow as any).id,
        title: l.title,
        theory: l.theory || "",
        exercises: l.exercises || {},
        sort_order: i,
      }));
      const { error: lessonsErr } = await supabase.from("course_lessons").insert(lessons as any);
      if (lessonsErr) throw lessonsErr;

      toast.success(`✅ Курс "${courseData.course.title}" сохранён с ${lessons.length} уроками!`);
      setCourseData(null);
      setJsonInput("");
      setStep("setup");
      loadCourses();
    } catch (err: any) {
      toast.error("Ошибка сохранения: " + err.message);
    }
    setSaving(false);
  };

  const toggleCourseAvailability = async (id: string, current: boolean) => {
    await supabase.from("courses").update({ available: !current } as any).eq("id", id);
    toast.success(current ? "Курс скрыт" : "Курс опубликован");
    loadCourses();
  };

  const deleteCourse = async (id: string) => {
    if (!confirm("Удалить курс и все уроки?")) return;
    await supabase.from("courses").delete().eq("id", id);
    toast.success("Курс удалён");
    loadCourses();
  };

  const updateCoursePrice = async (id: string, price: number) => {
    await supabase.from("courses").update({ price } as any).eq("id", id);
    loadCourses();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Existing courses */}
      <section className="glass-card p-4 flex flex-col gap-3">
        <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-primary" />
          Существующие курсы
          <span className="ml-auto text-xs text-muted-foreground font-normal">{existingCourses.length}</span>
        </h3>

        {loadingCourses ? (
          <p className="text-xs text-muted-foreground">Загрузка...</p>
        ) : existingCourses.length === 0 ? (
          <p className="text-xs text-muted-foreground">Курсов пока нет</p>
        ) : (
          <div className="space-y-2">
            {existingCourses.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-muted/30 border border-border/20">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-primary">{c.level}</span>
                    <span className="text-sm font-semibold text-foreground truncate">{c.title}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {c.lessons_count} уроков • {c.price} 🪙
                  </div>
                </div>
                <input
                  type="number"
                  defaultValue={c.price}
                  onBlur={(e) => {
                    const val = parseInt(e.target.value);
                    if (val > 0 && val !== c.price) updateCoursePrice(c.id, val);
                  }}
                  className="w-16 px-2 py-1 rounded bg-secondary text-foreground border border-border text-xs text-center focus:border-primary focus:outline-none"
                />
                <button
                  onClick={() => toggleCourseAvailability(c.id, c.available)}
                  className={`p-1.5 rounded-lg transition-colors ${c.available ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}
                  title={c.available ? "Опубликован" : "Скрыт"}
                >
                  {c.available ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                </button>
                <button onClick={() => deleteCourse(c.id)} className="p-1.5 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Step indicator */}
      <div className="flex gap-1">
        {(["setup", "prompt", "import", "preview"] as Step[]).map((s, i) => (
          <button
            key={s}
            onClick={() => setStep(s)}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-display font-bold transition-all ${
              step === s ? "bg-primary/15 text-primary border border-primary/30" : "bg-secondary text-muted-foreground"
            }`}
          >
            {i + 1}. {s === "setup" ? "Настройка" : s === "prompt" ? "Промпт" : s === "import" ? "Импорт" : "Превью"}
          </button>
        ))}
      </div>

      {/* Step 1: Setup */}
      {step === "setup" && (
        <div className="glass-card p-4 flex flex-col gap-3">
          <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Новый курс ({level})
          </h3>
          <input
            value={courseName}
            onChange={(e) => setCourseName(e.target.value)}
            placeholder="Название курса, например: Немецкий для путешествий"
            className="w-full px-3 py-2.5 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none"
          />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Описание / цель курса (необязательно)"
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none resize-y"
          />
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-[10px] text-muted-foreground mb-1 block">Кол-во уроков</label>
              <input
                type="number"
                value={lessonsCount}
                onChange={(e) => setLessonsCount(e.target.value)}
                min={1}
                max={30}
                className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none"
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] text-muted-foreground mb-1 block">Темы уроков (через запятую, необязательно)</label>
            <input
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              placeholder="Приветствие, В аэропорту, В отеле..."
              className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <button
            onClick={handleGeneratePrompt}
            disabled={generating || !courseName.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold transition-all disabled:opacity-40"
          >
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {generating ? "ИИ генерирует промпт..." : "Создать промпт через ИИ"}
          </button>
        </div>
      )}

      {/* Step 2: Generated prompt */}
      {step === "prompt" && (
        <div className="glass-card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-primary" />
              Промпт для Claude
            </h3>
            <button
              onClick={copyPrompt}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Скопировано!" : "Копировать"}
            </button>
          </div>
          <pre className="whitespace-pre-wrap text-xs text-foreground bg-secondary rounded-lg p-3 border border-border max-h-[400px] overflow-y-auto font-mono leading-relaxed">
            {generatedPrompt}
          </pre>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
            <Sparkles className="w-4 h-4 text-primary shrink-0" />
            <p className="text-xs text-foreground">
              Скопируйте промпт → вставьте в Claude → получите JSON → перейдите к шагу "Импорт"
            </p>
          </div>
          <button
            onClick={() => setStep("import")}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-secondary border border-border text-foreground font-semibold hover:bg-muted transition-all"
          >
            <FileJson className="w-4 h-4" />
            Перейти к импорту JSON
          </button>
        </div>
      )}

      {/* Step 3: Import JSON */}
      {step === "import" && (
        <div className="glass-card p-4 flex flex-col gap-3">
          <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-2">
            <FileJson className="w-4 h-4 text-primary" />
            Импорт курса из JSON
          </h3>
          <label className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 cursor-pointer transition-all">
            <Upload className="w-4 h-4" />
            Загрузить .json файл
            <input type="file" accept=".json,.txt" className="hidden" onChange={handleJsonFile} />
          </label>
          <div className="text-center text-xs text-muted-foreground">или вставьте JSON вручную:</div>
          <textarea
            value={jsonInput}
            onChange={(e) => setJsonInput(e.target.value)}
            placeholder='{"course": {...}, "lessons": [...]}'
            rows={10}
            className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-xs font-mono focus:border-primary focus:outline-none resize-y"
          />
          <button
            onClick={handleValidateAndPreview}
            disabled={validating || !jsonInput.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold transition-all disabled:opacity-40"
          >
            {validating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
            {validating ? "ИИ проверяет JSON..." : "Проверить и показать превью"}
          </button>
        </div>
      )}

      {/* Step 4: Preview & Save */}
      {step === "preview" && courseData && (
        <div className="flex flex-col gap-3">
          <div className="glass-card p-4">
            <h3 className="text-sm font-display font-semibold text-foreground mb-1">{courseData.course.title}</h3>
            <p className="text-xs text-muted-foreground">{courseData.course.description}</p>
            <div className="flex gap-2 mt-2">
              <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold">{courseData.course.level}</span>
              <span className="text-xs text-muted-foreground">{courseData.lessons.length} уроков</span>
            </div>
          </div>

          {courseData.lessons.map((lesson, i) => (
            <div key={i} className="glass-card p-3">
              <button
                onClick={() => setExpandedLesson(expandedLesson === i ? null : i)}
                className="w-full flex items-center justify-between text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
                  <span className="text-sm font-semibold text-foreground">{lesson.title}</span>
                </div>
                {expandedLesson === i ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              {expandedLesson === i && (
                <div className="mt-3 space-y-2 text-xs">
                  {lesson.theory && (
                    <div className="p-2 rounded bg-secondary border border-border">
                      <span className="text-[10px] text-muted-foreground font-bold block mb-1">ТЕОРИЯ</span>
                      <p className="text-foreground whitespace-pre-wrap line-clamp-6">{lesson.theory}</p>
                    </div>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {lesson.exercises?.vocab_cards && (
                      <span className="px-2 py-1 rounded bg-primary/10 text-primary text-[10px]">
                        📖 {lesson.exercises.vocab_cards.length} слов
                      </span>
                    )}
                    {lesson.exercises?.grammar_questions && (
                      <span className="px-2 py-1 rounded bg-primary/10 text-primary text-[10px]">
                        📝 {lesson.exercises.grammar_questions.length} грам. вопросов
                      </span>
                    )}
                    {lesson.exercises?.reading && (
                      <span className="px-2 py-1 rounded bg-primary/10 text-primary text-[10px]">
                        📚 Текст + {lesson.exercises.reading.questions?.length || 0} вопросов
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}

          <button
            onClick={handleSaveCourse}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-semibold glow-yellow transition-all disabled:opacity-40"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Сохранение..." : "Сохранить курс в базу"}
          </button>
        </div>
      )}
    </div>
  );
};

export default CourseEditor;
