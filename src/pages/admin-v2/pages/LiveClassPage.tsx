import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, SectionHeader, EmptyState } from "./_ui";
import { toast } from "@/hooks/use-toast";
import {
  LIVE_SECTIONS,
  LiveSection,
  LiveClass,
  LiveItem,
  startLiveClass,
  endLiveClass,
  addLiveItem,
  fetchLiveItems,
} from "@/lib/live-class";
import { Play, Square, Trash2 } from "lucide-react";
import BoardEditor, { type BoardApi } from "@/components/live/BoardEditor";
import MaterialPicker from "@/components/live/MaterialPicker";
import LiveBookPagePicker from "@/components/books/LiveBookPagePicker";

interface StudentRow { user_id: string; display_name: string | null; email: string | null }

export default function LiveClassPage() {
  const { user } = useAuth();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [classes, setClasses] = useState<LiveClass[]>([]);
  const [studentId, setStudentId] = useState("");
  const [title, setTitle] = useState("Живий урок");
  const [activeClass, setActiveClass] = useState<LiveClass | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const { data: users } = await supabase.rpc("get_admin_users");
    setStudents(((users as any) || []).map((u: any) => ({ user_id: u.user_id, display_name: u.display_name, email: u.email })));
    if (user) {
      const { data } = await supabase
        .from("live_classes")
        .select("*")
        .eq("teacher_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);
      setClasses(((data as any) || []) as LiveClass[]);
    }
    setLoading(false);
  };

  useEffect(() => { if (user) load(); }, [user]);

  const start = async () => {
    if (!user || !studentId) { toast({ title: "Виберіть учня" }); return; }
    try {
      const c = await startLiveClass(user.id, studentId, title.trim() || "Живий урок");
      setActiveClass(c);
      load();
    } catch (e: any) {
      toast({ title: "Помилка", description: e.message, variant: "destructive" });
    }
  };

  if (activeClass) {
    return (
      <TeacherConsole
        cls={activeClass}
        studentName={students.find((s) => s.user_id === activeClass.student_id)?.display_name || "Учень"}
        onExit={() => { setActiveClass(null); load(); }}
      />
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <SectionHeader title="Запустити живий урок" subtitle="Учень одразу потрапляє в клас — без демонстрації екрана" />
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
          >
            <option value="">— Виберіть учня —</option>
            {students.map((s) => (
              <option key={s.user_id} value={s.user_id}>
                {s.display_name || s.email || s.user_id.slice(0, 8)}
              </option>
            ))}
          </select>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Назва уроку"
            className="px-3 py-2 rounded-xl border border-slate-200 text-sm"
          />
          <button
            onClick={start}
            className="px-4 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-2"
            style={{ background: "#4F46E5" }}
          >
            <Play className="w-4 h-4" /> Запустити
          </button>
        </div>
      </Card>

      <Card className="p-5">
        <SectionHeader title="Уроки" subtitle="Активні та завершені" />
        {loading ? (
          <p className="text-sm text-slate-500 animate-pulse">Завантаження…</p>
        ) : classes.length === 0 ? (
          <EmptyState title="Ще немає уроків" description="Запустіть перший живий урок вище." />
        ) : (
          <div className="divide-y divide-slate-100">
            {classes.map((c) => (
              <div key={c.id} className="py-3 flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{c.title}</p>
                  <p className="text-xs text-slate-500">
                    {students.find((s) => s.user_id === c.student_id)?.display_name || "Учень"} ·{" "}
                    {new Date(c.started_at).toLocaleString("uk-UA")}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-[11px] px-2 py-1 rounded-full font-medium"
                    style={c.status === "active" ? { background: "#DCFCE7", color: "#166534" } : { background: "#F1F5F9", color: "#475569" }}
                  >
                    {c.status === "active" ? "Активний" : "Завершено"}
                  </span>
                  <button
                    onClick={() => setActiveClass(c)}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 hover:bg-slate-50"
                  >
                    Відкрити
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function TeacherConsole({ cls, studentName, onExit }: { cls: LiveClass; studentName: string; onExit: () => void }) {
  const [section, setSection] = useState<LiveSection>(cls.current_section || "board");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [items, setItems] = useState<LiveItem[]>([]);
  const [answers, setAnswers] = useState<any[]>([]);
  const [ended, setEnded] = useState(cls.status === "ended");
  const boardApi = useRef<BoardApi | null>(null);

  const reloadItems = async () => setItems(await fetchLiveItems(cls.id));

  useEffect(() => { reloadItems(); }, [cls.id]);

  useEffect(() => {
    const ch = supabase
      .channel(`live-class-teacher:${cls.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "live_class_answers", filter: `class_id=eq.${cls.id}` },
        () => loadAnswers())
      .subscribe();
    const loadAnswers = async () => {
      const { data } = await supabase
        .from("live_class_answers")
        .select("item_id, answer, is_correct, updated_at")
        .eq("class_id", cls.id);
      setAnswers(data || []);
    };
    loadAnswers();
    return () => { supabase.removeChannel(ch); };
  }, [cls.id]);

  const pushSection = async (s: LiveSection) => {
    setSection(s);
    await supabase.from("live_classes").update({ current_section: s }).eq("id", cls.id);
  };

  const finish = async () => {
    await endLiveClass(cls.id);
    setEnded(true);
    toast({ title: "Урок завершено" });
    onExit();
  };

  const remove = async (id: string) => {
    await supabase.from("live_class_items").delete().eq("id", id);
    setItems((p) => p.filter((i) => i.id !== id));
  };

  const sectionItems = items.filter((i) => i.section === section);

  return (
    <div className="space-y-5">
      <Card className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs text-slate-500">Живий урок · {studentName}</p>
          <h2 className="text-base font-semibold text-slate-900">{cls.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onExit} className="px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 hover:bg-slate-50">
            ← До списку
          </button>
          {!ended && (
            <button
              onClick={finish}
              className="px-3 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-2"
              style={{ background: "#DC2626" }}
            >
              <Square className="w-4 h-4" /> Завершити урок
            </button>
          )}
        </div>
      </Card>

      <div className="flex flex-wrap gap-2">
        {LIVE_SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => pushSection(s.key)}
            className={`px-3 py-2 rounded-xl text-sm font-medium border transition ${
              s.key === section ? "text-white border-transparent" : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
            style={s.key === section ? { background: "#4F46E5" } : undefined}
          >
            {s.icon} {s.label}
          </button>
        ))}
      </div>

      {/* Дошка завжди змонтована — перехід між розділами нічого не стирає */}
      <div className={section === "board" ? "" : "hidden"}>
        <BoardEditor classId={cls.id} initial={cls.board || []} apiRef={boardApi} />
      </div>

      {section !== "board" && (
        <Card className="p-5">
          <SectionHeader title="Додати матеріал" subtitle="Учень побачить це одразу" />
          <>
            <button
              onClick={() => setPickerOpen(true)}
              className="mb-4 px-4 py-2 rounded-xl text-sm font-medium border border-indigo-200 bg-indigo-50 text-indigo-700"
            >
              📂 Додати з банку матеріалів
            </button>
            <AddForm section={section} classId={cls.id} onAdded={(it) => setItems((p) => [...p, it])} />
          </>
        </Card>
      )}


      {section === "board" ? (
        <LiveBookPagePicker
          classId={cls.id}
          onToBoard={(url) => boardApi.current?.insertImage(url)}
        />
      ) : (
        <LiveBookPagePicker classId={cls.id} current={(cls as any).book_page ?? null} />
      )}



      {pickerOpen && section !== "board" && (
        <MaterialPicker
          classId={cls.id}
          section={section}
          onAdded={(added) => setItems((p) => [...p, ...added])}
          onClose={() => setPickerOpen(false)}
        />
      )}

      {section !== "board" && (
        <Card className="p-5">
          <SectionHeader title="Уже в розділі" subtitle={`${sectionItems.length} елементів`} />
          {sectionItems.length === 0 ? (
            <p className="text-sm text-slate-500">Порожньо.</p>
          ) : (
            <div className="divide-y divide-slate-100">
              {sectionItems.map((it) => {
                const a = answers.find((x) => x.item_id === it.id);
                return (
                  <div key={it.id} className="py-3 flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {it.title || it.content?.term || it.content?.question || it.kind}
                      </p>
                      <p className="text-xs text-slate-500 truncate">
                        {it.content?.body || it.content?.translation || it.content?.url || ""}
                      </p>
                      {a && (
                        <p className="text-xs mt-1">
                          <span className="text-slate-500">Відповідь учня: </span>
                          <span className={a.is_correct === false ? "text-red-600" : "text-green-700"}>{a.answer}</span>
                        </p>
                      )}
                    </div>
                    <button onClick={() => remove(it.id)} className="p-2 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function AddForm({
  section,
  classId,
  onAdded,
}: {
  section: LiveSection;
  classId: string;
  onAdded: (it: LiveItem) => void;
}) {
  const kinds: LiveItem["kind"][] =
    section === "vocab" ? ["word"] :
    section === "listening" ? ["audio", "question", "text"] :
    section === "tasks" ? ["question", "text"] : ["text", "question"];

  const [kind, setKind] = useState<LiveItem["kind"]>(kinds[0]);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("");
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState("");
  const [correct, setCorrect] = useState("");
  const [term, setTerm] = useState("");
  const [article, setArticle] = useState("");
  const [translation, setTranslation] = useState("");
  const [example, setExample] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setKind(kinds[0]); }, [section]);

  const submit = async () => {
    let content: any = {};
    if (kind === "text") {
      if (!body.trim()) return toast({ title: "Введіть текст" });
      content = { body };
    } else if (kind === "audio") {
      if (!url.trim()) return toast({ title: "Вкажіть посилання на аудіо" });
      content = { url };
    } else if (kind === "question") {
      if (!question.trim()) return toast({ title: "Введіть питання" });
      content = {
        question,
        options: options.split("\n").map((o) => o.trim()).filter(Boolean),
        correct: correct.trim() || null,
      };
    } else if (kind === "word") {
      if (!term.trim()) return toast({ title: "Введіть слово" });
      content = { term, article, translation, example };
    }
    setBusy(true);
    try {
      const it = await addLiveItem(classId, section, kind, title.trim() || null, content);
      onAdded(it);
      toast({ title: "Додано — учень уже бачить" });
      setTitle(""); setBody(""); setUrl(""); setQuestion(""); setOptions(""); setCorrect("");
      setTerm(""); setArticle(""); setTranslation(""); setExample("");
    } catch (e: any) {
      toast({ title: "Помилка", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const input = "w-full px-3 py-2 rounded-xl border border-slate-200 text-sm";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {kinds.map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${
              k === kind ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"
            }`}
          >
            {k === "text" ? "Текст / теорія" : k === "audio" ? "Аудіо" : k === "question" ? "Питання" : "Слово"}
          </button>
        ))}
      </div>

      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Заголовок (необов’язково)" className={input} />

      {kind === "text" && (
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Текст, правило, приклади…" className={input} />
      )}
      {kind === "audio" && (
        <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="URL аудіофайлу" className={input} />
      )}
      {kind === "question" && (
        <>
          <input value={question} onChange={(e) => setQuestion(e.target.value)} placeholder="Питання" className={input} />
          <textarea value={options} onChange={(e) => setOptions(e.target.value)} rows={3}
            placeholder="Варіанти — по одному в рядку (порожньо = відкрита відповідь)" className={input} />
          <input value={correct} onChange={(e) => setCorrect(e.target.value)} placeholder="Правильна відповідь" className={input} />
        </>
      )}
      {kind === "word" && (
        <div className="grid gap-3 md:grid-cols-2">
          <input value={article} onChange={(e) => setArticle(e.target.value)} placeholder="Артикль (der / die / das)" className={input} />
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Слово або фраза" className={input} />
          <input value={translation} onChange={(e) => setTranslation(e.target.value)} placeholder="Переклад" className={input} />
          <input value={example} onChange={(e) => setExample(e.target.value)} placeholder="Приклад" className={input} />
        </div>
      )}

      <button
        onClick={submit}
        disabled={busy}
        className="px-4 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50"
        style={{ background: "#4F46E5" }}
      >
        {busy ? "Додаю…" : "Додати учню"}
      </button>
    </div>
  );
}

