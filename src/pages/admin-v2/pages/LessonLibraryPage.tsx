import { useEffect, useMemo, useState } from "react";
import { Check, Loader2, Pencil, Search, Send, Sparkles, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import StudentBlocks from "@/components/blocks/StudentBlocks";
import { kitBlocksToLessonBlocks, normalizeKit, type LessonKit } from "@/lib/lesson-kits";
import { assignKitToStudent, listAssignableStudents, type AssignableStudent } from "@/lib/kit-from-book";
import { Btn, Card, EmptyState, LoadingState, SectionHeader } from "./_ui";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

const focusLabel = (f: string) => (f === "arbeitsbuch" ? "Граматика" : "Читання й аудіо");

/** Бібліотека готових уроків + ШІ-підбір уроку під запит і конкретного учня. */
export default function LessonLibraryPage({ onNavigate }: { onNavigate?: (key: string) => void }) {
  const { user } = useAuth();
  const [kits, setKits] = useState<LessonKit[] | null>(null);
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("all");
  const [focus, setFocus] = useState("all");

  const [aiQuery, setAiQuery] = useState("");
  const [students, setStudents] = useState<AssignableStudent[]>([]);
  const [studentId, setStudentId] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiResults, setAiResults] = useState<{ kit_id: string; reason: string }[] | null>(null);
  const [aiHint, setAiHint] = useState<string | null>(null);

  const [openKit, setOpenKit] = useState<LessonKit | null>(null);
  const [assignFor, setAssignFor] = useState<LessonKit | null>(null);
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [assigning, setAssigning] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("lesson_kits")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast({ title: "Не вдалося завантажити", description: error.message, variant: "destructive" });
      setKits([]);
      return;
    }
    setKits(((data ?? []) as any[]).map(normalizeKit));
  };

  useEffect(() => {
    load();
    listAssignableStudents().then(setStudents);
  }, []);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return (kits ?? []).filter((k) => {
      if (level !== "all" && (k.level ?? "") !== level) return false;
      if (focus !== "all" && k.focus !== focus) return false;
      if (!needle) return true;
      return (
        k.title.toLowerCase().includes(needle) ||
        (k.summary ?? "").toLowerCase().includes(needle) ||
        k.topics.some((t) => t.toLowerCase().includes(needle))
      );
    });
  }, [kits, q, level, focus]);

  const askAi = async () => {
    if (!aiQuery.trim()) return toast({ title: "Напишіть, що шукаєте" });
    setAiBusy(true);
    setAiResults(null);
    setAiHint(null);
    try {
      const { data, error } = await supabase.functions.invoke("suggest-lesson-kits", {
        body: { query: aiQuery.trim(), student_id: studentId || null },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setAiResults(((data as any)?.results ?? []) as any);
      setAiHint((data as any)?.hint ?? null);
    } catch (e: any) {
      toast({ title: "ШІ не змогла підібрати", description: String(e?.message ?? ""), variant: "destructive" });
    } finally {
      setAiBusy(false);
    }
  };

  const rename = async (kit: LessonKit) => {
    const next = window.prompt("Нова назва уроку", kit.title);
    if (!next || next.trim() === kit.title) return;
    const { error } = await supabase.from("lesson_kits").update({ title: next.trim() }).eq("id", kit.id);
    if (error) return toast({ title: "Не вдалося", description: error.message, variant: "destructive" });
    setKits((s) => (s ?? []).map((k) => (k.id === kit.id ? { ...k, title: next.trim() } : k)));
  };

  const remove = async (kit: LessonKit) => {
    if (!window.confirm(`Видалити «${kit.title}»?`)) return;
    const { error } = await supabase.from("lesson_kits").delete().eq("id", kit.id);
    if (error) return toast({ title: "Не вдалося", description: error.message, variant: "destructive" });
    setKits((s) => (s ?? []).filter((k) => k.id !== kit.id));
    if (openKit?.id === kit.id) setOpenKit(null);
  };

  const assign = async (kit: LessonKit, sid: string) => {
    if (!user?.id) return;
    setAssigning(true);
    try {
      await assignKitToStudent(user.id, kit, sid);
      setAssignedTo((s) => [...s, sid]);
      toast({ title: "Домашку призначено 🐼" });
      setKits((s) => (s ?? []).map((k) => (k.id === kit.id ? { ...k, last_assigned_at: new Date().toISOString() } : k)));
    } catch (e: any) {
      toast({ title: "Не вдалося призначити", description: String(e?.message ?? ""), variant: "destructive" });
    } finally {
      setAssigning(false);
    }
  };

  const byId = (id: string) => (kits ?? []).find((k) => k.id === id);

  const kitCard = (kit: LessonKit, reason?: string) => (
    <Card key={kit.id} className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-sm font-semibold text-admin-fg">{kit.title}</h3>
          <p className="mt-0.5 text-xs text-admin-muted">
            {kit.level ?? "—"} · {focusLabel(kit.focus)} · {kit.blocks.length} завдань
          </p>
        </div>
        <div className="flex shrink-0 gap-1">
          <button onClick={() => rename(kit)} className="rounded-lg p-1.5 text-admin-muted hover:bg-admin-fg/5" title="Перейменувати">
            <Pencil className="h-4 w-4" />
          </button>
          <button onClick={() => remove(kit)} className="rounded-lg p-1.5 text-admin-danger hover:bg-admin-danger/10" title="Видалити">
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {kit.summary && <p className="mt-2 text-xs text-admin-muted line-clamp-2">{kit.summary}</p>}
      {reason && <p className="mt-2 text-xs font-medium text-admin-fg">🐼 {reason}</p>}

      {kit.topics.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {kit.topics.slice(0, 4).map((t) => (
            <span key={t} className="rounded-full bg-admin-accent/15 px-2 py-0.5 text-[11px] text-admin-fg">
              {t}
            </span>
          ))}
        </div>
      )}

      {kit.last_assigned_at && (
        <p className="mt-2 text-[11px] text-admin-muted">
          Уже давали: {new Date(kit.last_assigned_at).toLocaleDateString("uk-UA")}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        <Btn
          onClick={() => {
            setAssignFor(kit);
            setAssignedTo([]);
          }}
        >
          <span className="inline-flex items-center gap-1.5">
            <Send className="h-4 w-4" /> Дати як домашку
          </span>
        </Btn>
        <Btn variant="ghost" onClick={() => setOpenKit(kit)}>
          Подивитись
        </Btn>
      </div>
    </Card>
  );

  return (
    <div>
      <SectionHeader
        title="Бібліотека уроків"
        subtitle="Усі уроки, які згенерував ШІ з книг і фото. Питайте панду, що дати учню."
        action={
          onNavigate && (
            <Btn variant="ghost" onClick={() => onNavigate("library")}>
              Створити з книги
            </Btn>
          )
        }
      />

      <Card className="p-4">
        <label className="mb-1 block text-[11px] font-bold uppercase text-admin-muted">Що шукаємо?</label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={aiQuery}
            onChange={(e) => setAiQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && askAi()}
            placeholder="напр. щось на Genitiv для B1 / повторити прийменники"
            className="flex-1 rounded-xl border border-admin-border bg-admin-card px-3 py-2 text-sm text-admin-fg"
          />
          <select
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            className="rounded-xl border border-admin-border bg-admin-card px-3 py-2 text-sm text-admin-fg"
          >
            <option value="">Без учня</option>
            {students.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <Btn onClick={askAi} disabled={aiBusy}>
            <span className="inline-flex items-center gap-1.5">
              {aiBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {aiBusy ? "Шукаю…" : "Підібрати"}
            </span>
          </Btn>
        </div>
        <p className="mt-1 text-[11px] text-admin-muted">
          Якщо вибрати учня — ШІ врахує його рівень і теми, де він помилявся.
        </p>
      </Card>

      {aiResults && (
        <div className="mt-4">
          <SectionHeader title="Панда радить" subtitle={aiHint ?? undefined} />
          {aiResults.length === 0 ? (
            <EmptyState
              title="Нічого підхожого немає"
              description={aiHint ?? "Створіть новий урок із книги — це швидко."}
              cta={onNavigate ? { label: "До книг", onClick: () => onNavigate("library") } : undefined}
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {aiResults.map((r) => {
                const kit = byId(r.kit_id);
                return kit ? kitCard(kit, r.reason) : null;
              })}
            </div>
          )}
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-admin-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Пошук за назвою або темою"
            className="w-full rounded-xl border border-admin-border bg-admin-card py-2 pl-9 pr-3 text-sm text-admin-fg"
          />
        </div>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="rounded-xl border border-admin-border bg-admin-card px-3 py-2 text-sm text-admin-fg"
        >
          <option value="all">Усі рівні</option>
          {LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </select>
        <select
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          className="rounded-xl border border-admin-border bg-admin-card px-3 py-2 text-sm text-admin-fg"
        >
          <option value="all">Будь-який тип</option>
          <option value="kursbuch">Читання й аудіо</option>
          <option value="arbeitsbuch">Граматика</option>
        </select>
      </div>

      <div className="mt-4">
        {kits === null ? (
          <LoadingState />
        ) : filtered.length === 0 ? (
          <EmptyState
            title="Уроків поки немає"
            description="Згенеруйте урок із книги — він автоматично збережеться тут."
            cta={onNavigate ? { label: "До бібліотеки книг", onClick: () => onNavigate("library") } : undefined}
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{filtered.map((k) => kitCard(k))}</div>
        )}
      </div>

      {assignFor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAssignFor(null)}>
          <div
            className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-2xl border border-admin-border bg-admin-card p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-sm font-semibold text-admin-fg">Кому дати «{assignFor.title}»?</h3>
            <div className="mt-3 space-y-1">
              {students.length === 0 && <p className="text-sm text-admin-muted">Учнів поки немає.</p>}
              {students.map((s) => (
                <button
                  key={s.id}
                  disabled={assigning || assignedTo.includes(s.id)}
                  onClick={() => assign(assignFor, s.id)}
                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-admin-fg hover:bg-admin-fg/5 disabled:opacity-50"
                >
                  {s.name}
                  {assignedTo.includes(s.id) && <Check className="h-4 w-4 text-admin-accent" />}
                </button>
              ))}
            </div>
            <div className="mt-4">
              <Btn variant="ghost" onClick={() => setAssignFor(null)}>
                Готово
              </Btn>
            </div>
          </div>
        </div>
      )}

      {openKit && (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4" onClick={() => setOpenKit(null)}>
          <div
            className="w-full max-w-2xl rounded-2xl border border-admin-border bg-admin-card p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-sm font-semibold text-admin-fg">{openKit.title}</h3>
              <Btn variant="ghost" onClick={() => setOpenKit(null)}>
                Закрити
              </Btn>
            </div>
            <StudentBlocks blocks={kitBlocksToLessonBlocks(openKit.blocks, openKit.id)} persist={false} showActions={false} />
          </div>
        </div>
      )}
    </div>
  );
}
