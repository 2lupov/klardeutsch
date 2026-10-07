import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2, Upload, Trash2, Pencil, Presentation as PresIcon, ChevronLeft, ChevronRight, Eye, Sparkles, UserPlus, Check,
  Folder, FolderPlus, Inbox, Star, Archive, ArchiveRestore, Search, LayoutGrid, List as ListIcon, FolderInput, Wand2,
  Code2, X,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import {
  listPresentations, uploadPresentation, deletePresentation, updatePresentation, updatePresentations, slideUrls,
  createHtmlPresentation, isHtmlFile, getPresentationHtml, assignPresentationHomework,
  listPresentationFolders, createPresentationFolder, updatePresentationFolder, deletePresentationFolder,
  guessMeta, prettyTitle, dupKey, isInteractive,
  LEVELS, KIND_META, SKILL_META,
  type Presentation, type PresentationFolder, type PresKind, type PresSkill,
} from "@/lib/presentations";
import HtmlSlides from "@/components/live/HtmlSlides";
import { assignMiniCourse, listMiniCourses, type MiniCourse } from "@/lib/minicourse";
import { listAssignableStudents, type AssignableStudent } from "@/lib/kit-from-book";
import { Card, Btn, SubTabs, EmptyState } from "./_ui";
import { Modal, KebabMenu, LevelBadge, Field, fieldClass } from "../components/presentations/ui";

/* ───────────────────────── Довідники відображення ───────────────────────── */

const KIND_TILE: Record<PresKind, string> = {
  pdf: "from-sky-500/25 to-sky-500/5",
  interactive: "from-indigo-500/25 to-indigo-500/5",
  game: "from-rose-500/25 to-rose-500/5",
  test: "from-emerald-500/25 to-emerald-500/5",
};
const FOLDER_EMOJIS = ["📁", "📐", "🧩", "🎮", "👤", "✅", "📖", "🎧", "✍️", "💬", "🎓", "🗺️", "⭐", "🇩🇪"];
const skillShort = (s: PresSkill) => SKILL_META[s].label.split(" · ")[0];

type FolderKey = "all" | "fav" | "none" | "archive" | string;
type SortKey = "new" | "updated" | "title" | "level";

/* ───────────────────────── Сторінка ───────────────────────── */

export default function PresentationsPage() {
  const [tab, setTab] = useState<"slides" | "courses">("slides");
  const [courseCount, setCourseCount] = useState(0);
  return (
    <div className="space-y-5 max-w-[1500px]">
      <SubTabs
        tabs={[
          { key: "slides", label: "Презентації та ігри", icon: PresIcon },
          { key: "courses", label: courseCount ? `Мінікурси · ${courseCount}` : "Мінікурси", icon: Sparkles },
        ]}
        active={tab}
        onChange={setTab}
      />
      {tab === "slides" ? <SlidesTab /> : <CoursesTab onCount={setCourseCount} />}
      {/* лічильник мінікурсів підтягуємо у фоні, щоб вкладка не була «порожньою на вигляд» */}
      {tab === "slides" && <CourseCounter onCount={setCourseCount} />}
    </div>
  );
}

function CourseCounter({ onCount }: { onCount: (n: number) => void }) {
  useEffect(() => {
    listMiniCourses().then((c) => onCount(c.length)).catch(() => {});
  }, [onCount]);
  return null;
}

/* ───────────────────────── Вкладка: презентації ───────────────────────── */

function SlidesTab() {
  const { user } = useAuth();
  const [items, setItems] = useState<Presentation[]>([]);
  const [folders, setFolders] = useState<PresentationFolder[]>([]);
  const [students, setStudents] = useState<AssignableStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [folder, setFolder] = useState<FolderKey>(() => localStorage.getItem("klar-pres-folder") || "all");
  const [q, setQ] = useState("");
  const [level, setLevel] = useState<string>("");
  const [kind, setKind] = useState<string>("");
  const [skill, setSkill] = useState<string>("");
  const [sort, setSort] = useState<SortKey>(() => (localStorage.getItem("klar-pres-sort") as SortKey) || "new");
  const [layout, setLayout] = useState<"grid" | "list">(() => (localStorage.getItem("klar-pres-layout") as any) || "grid");
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [dragOver, setDragOver] = useState(false);

  // діалоги
  const [details, setDetails] = useState<Presentation | null>(null);
  const [moving, setMoving] = useState<string[] | null>(null);
  const [assigning, setAssigning] = useState<Presentation | null>(null);
  const [confirmDel, setConfirmDel] = useState<Presentation | null>(null);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [folderEdit, setFolderEdit] = useState<PresentationFolder | "new" | null>(null);
  const [autoOpen, setAutoOpen] = useState(false);
  const [pdfView, setPdfView] = useState<{ p: Presentation; urls: string[]; page: number } | null>(null);
  const [htmlView, setHtmlView] = useState<{ p: Presentation; html: string } | null>(null);

  useEffect(() => { localStorage.setItem("klar-pres-folder", folder); }, [folder]);
  useEffect(() => { localStorage.setItem("klar-pres-sort", sort); }, [sort]);
  useEffect(() => { localStorage.setItem("klar-pres-layout", layout); }, [layout]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [p, f] = await Promise.all([listPresentations(), listPresentationFolders()]);
      setItems(p);
      setFolders(f);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    listAssignableStudents().then(setStudents).catch(() => {});
  }, [load]);

  // якщо збережена папка вже видалена — повертаємось до «Усі»
  useEffect(() => {
    if (loading) return;
    if (!["all", "fav", "none", "archive"].includes(folder) && !folders.some((f) => f.id === folder)) setFolder("all");
  }, [folders, folder, loading]);

  const patchLocal = (ids: string[], patch: Partial<Presentation>) =>
    setItems((prev) => prev.map((p) => (ids.includes(p.id) ? { ...p, ...patch } : p)));

  const patch = async (ids: string[], p: Partial<Presentation>, okMsg?: string) => {
    const before = items;
    patchLocal(ids, p); // оптимістично
    try {
      await updatePresentations(ids, p as any);
      if (okMsg) toast.success(okMsg);
    } catch (e: any) {
      setItems(before);
      toast.error(e.message);
    }
  };

  /* ── завантаження файлів ── */
  const currentFolderId = !["all", "fav", "none", "archive"].includes(folder) ? folder : null;

  const onFiles = async (files: FileList | File[] | null) => {
    if (!files || !("length" in files) || !files.length || !user) return;
    for (const file of Array.from(files)) {
      try {
        if (isHtmlFile(file)) {
          setBusy(`Додаємо ${file.name}…`);
          await createHtmlPresentation(user.id, prettyTitle(file.name), await file.text(), { folder_id: currentFolderId });
        } else if (/\.pdf$/i.test(file.name)) {
          await uploadPresentation({ ownerId: user.id, file, meta: { folder_id: currentFolderId }, onProgress: (t) => setBusy(t) });
        } else {
          toast.error(`${file.name}: підтримуємо PDF, HTML і SVG.`);
          continue;
        }
        toast.success(`${file.name} — додано 🐼`);
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setBusy(null);
      }
    }
    load(true);
  };

  /* ── відкриття ── */
  const open = async (p: Presentation) => {
    try {
      if (isInteractive(p)) {
        setBusy("Відкриваємо…");
        const html = await getPresentationHtml(p.id);
        setHtmlView({ p, html });
      } else {
        const urls = await slideUrls(p.slide_paths);
        setPdfView({ p, urls, page: 1 });
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(null);
    }
  };

  const toMinicourse = (p: Presentation) => {
    sessionStorage.setItem("klar-workshop-source", JSON.stringify({ source: "presentation", id: p.id }));
    window.dispatchEvent(new CustomEvent("admin-v2:navigate", { detail: { key: "workshop" } }));
  };

  /* ── похідні дані ── */
  const active = useMemo(() => items.filter((p) => !p.archived), [items]);
  const counts = useMemo(() => {
    const byFolder: Record<string, number> = {};
    active.forEach((p) => { if (p.folder_id) byFolder[p.folder_id] = (byFolder[p.folder_id] || 0) + 1; });
    return {
      all: active.length,
      fav: active.filter((p) => p.pinned).length,
      none: active.filter((p) => !p.folder_id).length,
      archive: items.length - active.length,
      byFolder,
    };
  }, [items, active]);

  // дублі: однакова нормалізована назва; найновіша не вважається дублем
  const dupIds = useMemo(() => {
    const seen = new Set<string>();
    const out = new Set<string>();
    [...active].sort((a, b) => b.created_at.localeCompare(a.created_at)).forEach((p) => {
      const k = dupKey(p.title);
      if (!k) return;
      if (seen.has(k)) out.add(p.id); else seen.add(k);
    });
    return out;
  }, [active]);

  const scoped = useMemo(() => {
    return items.filter((p) => {
      if (folder === "archive") return p.archived;
      if (p.archived) return false;
      if (folder === "fav") return p.pinned;
      if (folder === "none") return !p.folder_id;
      if (folder !== "all") return p.folder_id === folder;
      return true;
    });
  }, [items, folder]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const r = scoped.filter((p) => {
      if (level && p.level !== level) return false;
      if (kind && p.kind !== kind) return false;
      if (skill && p.skill !== skill) return false;
      if (needle && !(`${p.title} ${p.tags.join(" ")} ${p.notes ?? ""}`.toLowerCase().includes(needle))) return false;
      return true;
    });
    const lv = (p: Presentation) => (p.level ? LEVELS.indexOf(p.level as any) : 99);
    r.sort((a, b) =>
      sort === "title" ? a.title.localeCompare(b.title, "de")
        : sort === "level" ? lv(a) - lv(b) || a.title.localeCompare(b.title, "de")
        : sort === "updated" ? b.updated_at.localeCompare(a.updated_at)
        : b.created_at.localeCompare(a.created_at));
    return r;
  }, [scoped, q, level, kind, skill, sort]);

  const levelsPresent = useMemo(() => LEVELS.filter((l) => scoped.some((p) => p.level === l)), [scoped]);
  const needsTagging = useMemo(
    () => active.filter((p) => !p.level || !p.skill).map((p) => ({ p, g: guessMeta(p.title, isInteractive(p)) }))
      .filter(({ p, g }) => (!p.level && g.level) || (!p.skill && g.skill)),
    [active],
  );

  const folderName = (id: string | null) => folders.find((f) => f.id === id);
  const toggleSel = (id: string) => setSel((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const clearSel = () => setSel(new Set());
  const filtersOn = !!(q || level || kind || skill);

  const title =
    folder === "all" ? "Усі матеріали" : folder === "fav" ? "Обране" : folder === "none" ? "Без папки" : folder === "archive" ? "Архів"
      : folderName(folder)?.name ?? "";

  return (
    <div
      className="space-y-4"
      onDragOver={(e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); setDragOver(true); } }}
      onDragLeave={(e) => { if (e.currentTarget === e.target) setDragOver(false); }}
      onDrop={(e) => { e.preventDefault(); setDragOver(false); onFiles(e.dataTransfer.files); }}
    >
      {/* Шапка */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-admin-fg truncate">{title}</h2>
          <p className="text-sm text-admin-muted">
            PDF — слайди для живого уроку · HTML/SVG — інтерактивні вправи й ігри. Перетягніть файли сюди, щоб додати.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept="application/pdf,.html,.htm,.svg" multiple className="hidden"
            onChange={(e) => { onFiles(e.target.files); e.currentTarget.value = ""; }} />
          <Btn onClick={() => fileRef.current?.click()} disabled={!!busy}>
            <span className="inline-flex items-center gap-2">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {busy || "Додати файл"}
            </span>
          </Btn>
          <Btn variant="ghost" onClick={() => setPasteOpen(true)}><span className="inline-flex items-center gap-2"><Code2 className="w-4 h-4" />Вставити код</span></Btn>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[230px_minmax(0,1fr)]">
        {/* Папки */}
        <FolderNav
          folder={folder} setFolder={setFolder} folders={folders} counts={counts}
          onNew={() => setFolderEdit("new")} onEdit={(f) => setFolderEdit(f)}
        />

        {/* Список */}
        <div className="space-y-3 min-w-0">
          {/* Фільтри */}
          <Card className="p-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative flex-1 min-w-[180px]">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-admin-muted" />
                <input className={`${fieldClass} pl-9`} placeholder="Пошук: назва, тема, тег…" value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
              <select className={`${fieldClass} !w-auto`} value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Тип">
                <option value="">Усі типи</option>
                {(Object.keys(KIND_META) as PresKind[]).map((k) => <option key={k} value={k}>{KIND_META[k].emoji} {KIND_META[k].label}</option>)}
              </select>
              <select className={`${fieldClass} !w-auto`} value={skill} onChange={(e) => setSkill(e.target.value)} aria-label="Навичка">
                <option value="">Усі навички</option>
                {(Object.keys(SKILL_META) as PresSkill[]).map((k) => <option key={k} value={k}>{SKILL_META[k].emoji} {SKILL_META[k].label}</option>)}
              </select>
              <select className={`${fieldClass} !w-auto`} value={sort} onChange={(e) => setSort(e.target.value as SortKey)} aria-label="Сортування">
                <option value="new">Спершу нові</option>
                <option value="updated">Нещодавно змінені</option>
                <option value="title">За назвою А–Я</option>
                <option value="level">За рівнем A1→C2</option>
              </select>
              <div className="flex rounded-xl border border-admin-border overflow-hidden">
                {([["grid", LayoutGrid], ["list", ListIcon]] as const).map(([k, Icon]) => (
                  <button key={k} onClick={() => setLayout(k)} aria-label={k}
                    className={`w-9 h-9 flex items-center justify-center ${layout === k ? "bg-admin-primary text-admin-primary-fg" : "text-admin-muted hover:bg-admin-fg/5"}`}>
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>
            {levelsPresent.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-admin-muted mr-1">Рівень:</span>
                {levelsPresent.map((l) => (
                  <button key={l} onClick={() => setLevel(level === l ? "" : l)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${level === l ? "bg-admin-primary text-admin-primary-fg border-admin-primary" : "border-admin-border text-admin-muted hover:text-admin-fg"}`}>
                    {l}
                  </button>
                ))}
                {filtersOn && (
                  <button onClick={() => { setQ(""); setLevel(""); setKind(""); setSkill(""); }} className="ml-auto inline-flex items-center gap-1 text-xs text-admin-muted hover:text-admin-fg">
                    <X className="w-3.5 h-3.5" /> Скинути фільтри
                  </button>
                )}
              </div>
            )}
          </Card>

          {/* Підказка: навести лад */}
          {needsTagging.length > 0 && folder !== "archive" && (
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-admin-accent/40 bg-admin-accent/10 px-4 py-3 text-sm">
              <Wand2 className="w-4 h-4 shrink-0" />
              <span className="flex-1 min-w-[220px]">
                У {needsTagging.length} матеріалів не вказано рівень або навичку — я можу визначити їх за назвою (A2, Genitiv, Wortschatz…).
              </span>
              <Btn variant="ghost" onClick={() => setAutoOpen(true)}>Переглянути й застосувати</Btn>
            </div>
          )}

          {/* Панель масових дій */}
          {sel.size > 0 && (
            <div className="sticky top-0 z-20 flex flex-wrap items-center gap-2 rounded-2xl border border-admin-border bg-admin-card px-4 py-2.5 shadow-md">
              <span className="text-sm font-semibold">Вибрано: {sel.size}</span>
              <div className="flex-1" />
              <Btn variant="ghost" onClick={() => setMoving([...sel])}><span className="inline-flex items-center gap-2"><FolderInput className="w-4 h-4" />Перемістити</span></Btn>
              {folder === "archive"
                ? <Btn variant="ghost" onClick={() => { patch([...sel], { archived: false }, "Відновлено"); clearSel(); }}>Відновити</Btn>
                : <Btn variant="ghost" onClick={() => { patch([...sel], { archived: true }, "Перенесено в архів"); clearSel(); }}>В архів</Btn>}
              <Btn variant="ghost" onClick={clearSel}>Скасувати</Btn>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-admin-muted" /></div>
          ) : visible.length === 0 ? (
            items.length === 0 ? (
              <EmptyState title="Поки що порожньо" description="Додайте PDF зі слайдами або HTML/SVG-гру. Перетягніть файли у це вікно." cta={{ label: "Додати файл", onClick: () => fileRef.current?.click() }} />
            ) : (
              <EmptyState title={filtersOn ? "Нічого не знайдено" : folder === "archive" ? "Архів порожній" : "У цій папці ще немає матеріалів"}
                description={filtersOn ? "Змініть пошук або скиньте фільтри." : "Перемістіть сюди матеріали через меню «⋯» → «Перемістити…» або виберіть кілька карток."} />
            )
          ) : (
            <div className={layout === "grid" ? "grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" : "space-y-2"}>
              {visible.map((p) => (
                <PresCard
                  key={p.id} p={p} layout={layout} folder={folderName(p.folder_id)} showFolder={folder === "all" || folder === "fav"}
                  selected={sel.has(p.id)} anySelected={sel.size > 0} dup={dupIds.has(p.id)}
                  onSelect={() => toggleSel(p.id)} onOpen={() => open(p)}
                  onAssign={() => setAssigning(p)} onDetails={() => setDetails(p)} onMove={() => setMoving([p.id])}
                  onPin={() => patch([p.id], { pinned: !p.pinned })}
                  onArchive={() => patch([p.id], { archived: !p.archived }, p.archived ? "Відновлено" : "Перенесено в архів")}
                  onDelete={() => setConfirmDel(p)} onMini={() => toMinicourse(p)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {dragOver && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-admin-primary/20 backdrop-blur-sm pointer-events-none">
          <div className="rounded-3xl border-2 border-dashed border-admin-primary bg-admin-card px-10 py-8 text-lg font-semibold text-admin-fg">
            Відпустіть, щоб додати {currentFolderId ? `у «${folderName(currentFolderId)?.name}»` : "у бібліотеку"}
          </div>
        </div>
      )}

      {/* ───── діалоги ───── */}
      <DetailsDialog p={details} folders={folders} onClose={() => setDetails(null)}
        onSave={async (id, changes) => { await patch([id], changes, "Збережено"); setDetails(null); }} />

      <MoveDialog ids={moving} folders={folders} onClose={() => setMoving(null)}
        onPick={async (fid) => { if (moving) { await patch(moving, { folder_id: fid }, "Переміщено"); clearSel(); } setMoving(null); }}
        onNewFolder={() => { setFolderEdit("new"); }} />

      <AssignDialog p={assigning} students={students} onClose={() => setAssigning(null)}
        teacherId={user?.id ?? ""} />

      <Modal open={!!confirmDel} onClose={() => setConfirmDel(null)} title="Видалити назавжди?"
        footer={<>
          <Btn variant="ghost" onClick={() => setConfirmDel(null)}>Скасувати</Btn>
          <Btn variant="danger" onClick={async () => {
            const p = confirmDel; if (!p) return;
            try { await deletePresentation(p); setItems((x) => x.filter((i) => i.id !== p.id)); toast.success("Видалено"); }
            catch (e: any) { toast.error(e.message); }
            setConfirmDel(null);
          }}>Видалити</Btn>
        </>}>
        <p className="text-sm text-admin-fg">«{confirmDel?.title}» буде видалено разом зі слайдами. Якщо не впевнені — краще перенесіть в архів.</p>
      </Modal>

      <PasteDialog open={pasteOpen} onClose={() => setPasteOpen(false)} onCreate={async (t, code) => {
        if (!user) return;
        try { await createHtmlPresentation(user.id, t, code, { folder_id: currentFolderId }); toast.success("Додано 🐼"); setPasteOpen(false); load(true); }
        catch (e: any) { toast.error(e.message); }
      }} />

      <FolderDialog value={folderEdit} onClose={() => setFolderEdit(null)}
        onSave={async (name, emoji, existing) => {
          try {
            if (existing) await updatePresentationFolder(existing.id, { name, emoji });
            else if (user) {
              const f = await createPresentationFolder(user.id, name, emoji, (folders[folders.length - 1]?.sort_order ?? 0) + 1);
              setFolder(f.id);
            }
            setFolderEdit(null); load(true);
          } catch (e: any) {
            toast.error(/relation|schema cache|does not exist/i.test(e.message) ? "Таблиці папок ще немає — виконайте міграцію 20261007120000_presentation_folders.sql" : e.message);
          }
        }}
        onDelete={async (f) => {
          try { await deletePresentationFolder(f.id); if (folder === f.id) setFolder("all"); setFolderEdit(null); toast.success("Папку видалено, матеріали збережено"); load(true); }
          catch (e: any) { toast.error(e.message); }
        }}
        countIn={(f) => counts.byFolder[f.id] || 0} />

      <AutoTagDialog open={autoOpen} rows={needsTagging} onClose={() => setAutoOpen(false)}
        onApply={async () => {
          try {
            for (const { p, g } of needsTagging) {
              const ch: Partial<Presentation> = {};
              if (!p.level && g.level) ch.level = g.level;
              if (!p.skill && g.skill) ch.skill = g.skill;
              await updatePresentation(p.id, ch as any);
            }
            toast.success("Рівні та навички проставлено");
            setAutoOpen(false); load(true);
          } catch (e: any) { toast.error(e.message); }
        }} />

      {pdfView && <PdfViewer state={pdfView} onClose={() => setPdfView(null)} setPage={(page) => setPdfView((s) => (s ? { ...s, page } : s))} />}
      {htmlView && (
        <div className="klar-admin fixed inset-0 z-50 flex flex-col bg-admin-bg p-3 sm:p-4">
          <div className="mb-2 flex items-center justify-between gap-3">
            <div className="font-semibold truncate text-admin-fg">{htmlView.p.title}</div>
            <Btn variant="ghost" onClick={() => setHtmlView(null)}>Закрити</Btn>
          </div>
          <div className="flex-1 min-h-0"><HtmlSlides html={htmlView.html} /></div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Папки ───────────────────────── */

function FolderNav({
  folder, setFolder, folders, counts, onNew, onEdit,
}: {
  folder: FolderKey;
  setFolder: (k: FolderKey) => void;
  folders: PresentationFolder[];
  counts: { all: number; fav: number; none: number; archive: number; byFolder: Record<string, number> };
  onNew: () => void;
  onEdit: (f: PresentationFolder) => void;
}) {
  const row = (key: FolderKey, icon: React.ReactNode, label: string, n: number, extra?: React.ReactNode) => {
    const on = folder === key;
    return (
      <div key={key} className={`group flex items-center rounded-xl ${on ? "bg-admin-primary text-admin-primary-fg" : "hover:bg-admin-fg/5 text-admin-fg"}`}>
        <button onClick={() => setFolder(key)} className="flex-1 min-w-0 flex items-center gap-2.5 px-3 py-2 text-sm text-left">
          <span className="w-5 text-center shrink-0">{icon}</span>
          <span className="truncate">{label}</span>
          <span className={`ml-auto text-xs ${on ? "opacity-80" : "text-admin-muted"}`}>{n}</span>
        </button>
        {extra}
      </div>
    );
  };
  const chip = (key: FolderKey, label: string, n: number) => (
    <button key={key} onClick={() => setFolder(key)}
      className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border ${folder === key ? "bg-admin-primary text-admin-primary-fg border-admin-primary" : "border-admin-border text-admin-muted"}`}>
      {label} · {n}
    </button>
  );
  return (
    <>
      {/* телефон / планшет: горизонтальна стрічка */}
      <div className="lg:hidden flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {chip("all", "Усі", counts.all)}
        {chip("fav", "⭐ Обране", counts.fav)}
        {folders.map((f) => chip(f.id, `${f.emoji} ${f.name}`, counts.byFolder[f.id] || 0))}
        {chip("none", "Без папки", counts.none)}
        {chip("archive", "Архів", counts.archive)}
        <button onClick={onNew} className="shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border border-dashed border-admin-border text-admin-muted">+ папка</button>
      </div>
      {/* десктоп: бічна колонка */}
      <Card className="hidden lg:block p-2 h-fit sticky top-0">
        {row("all", <Folder className="w-4 h-4" />, "Усі матеріали", counts.all)}
        {row("fav", <Star className="w-4 h-4" />, "Обране", counts.fav)}
        <div className="px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-admin-muted">Мої папки</div>
        {folders.map((f) => row(f.id, <span>{f.emoji}</span>, f.name, counts.byFolder[f.id] || 0,
          <button onClick={() => onEdit(f)} aria-label="Редагувати папку"
            className="mr-1 w-7 h-7 rounded-lg hidden group-hover:flex items-center justify-center opacity-70 hover:opacity-100"><Pencil className="w-3.5 h-3.5" /></button>))}
        {row("none", <Inbox className="w-4 h-4" />, "Без папки", counts.none)}
        <button onClick={onNew} className="mt-1 w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-admin-muted hover:bg-admin-fg/5 hover:text-admin-fg">
          <FolderPlus className="w-4 h-4" /> Нова папка
        </button>
        <div className="my-2 h-px bg-admin-border" />
        {row("archive", <Archive className="w-4 h-4" />, "Архів", counts.archive)}
      </Card>
    </>
  );
}

/* ───────────────────────── Картка ───────────────────────── */

function PresCard(props: {
  p: Presentation; layout: "grid" | "list"; folder?: PresentationFolder; showFolder: boolean;
  selected: boolean; anySelected: boolean; dup: boolean;
  onSelect: () => void; onOpen: () => void; onAssign: () => void; onDetails: () => void; onMove: () => void;
  onPin: () => void; onArchive: () => void; onDelete: () => void; onMini: () => void;
}) {
  const { p, layout, folder, showFolder, selected, anySelected, dup } = props;
  const inter = isInteractive(p);
  const meta = (
    <div className="flex flex-wrap items-center gap-1.5">
      <LevelBadge level={p.level} />
      <span className="text-[11px] text-admin-muted">{KIND_META[p.kind].label}</span>
      {p.skill && <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-admin-fg/5 text-admin-muted">{SKILL_META[p.skill].emoji} {skillShort(p.skill)}</span>}
    </div>
  );
  const sub = (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-admin-muted">
      <span>{inter ? "інтерактив" : `${p.page_count} слайд.`}</span>
      <span>·</span>
      <span>{new Date(p.created_at).toLocaleDateString("uk-UA")}</span>
      {showFolder && folder && <span className="px-1.5 py-0.5 rounded-md bg-admin-fg/5">{folder.emoji} {folder.name}</span>}
      {dup && <span className="px-1.5 py-0.5 rounded-md bg-amber-500/15 text-amber-700 dark:text-amber-300" title="Є матеріал з такою ж назвою">дубль?</span>}
      {p.tags.slice(0, 3).map((t) => <span key={t} className="text-admin-muted">#{t}</span>)}
    </div>
  );
  const actions = (
    <div className="flex items-center gap-1.5">
      <button onClick={props.onOpen} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-admin-primary text-admin-primary-fg text-xs font-semibold hover:opacity-90">
        <Eye className="w-3.5 h-3.5" /> Відкрити
      </button>
      {inter && (
        <button onClick={props.onAssign} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-admin-border text-xs font-semibold text-admin-fg hover:bg-admin-fg/5">
          <UserPlus className="w-3.5 h-3.5" /> ДЗ
        </button>
      )}
      <KebabMenu items={[
        { label: "Деталі й теги", icon: <Pencil className="w-4 h-4" />, onClick: props.onDetails },
        { label: "Перемістити в папку…", icon: <FolderInput className="w-4 h-4" />, onClick: props.onMove },
        { label: p.pinned ? "Прибрати з обраного" : "В обране", icon: <Star className="w-4 h-4" />, onClick: props.onPin },
        ...(!inter ? [{ label: "Створити мінікурс (ШІ)", icon: <Sparkles className="w-4 h-4" />, onClick: props.onMini }] : []),
        "sep" as const,
        { label: p.archived ? "Відновити з архіву" : "В архів", icon: p.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />, onClick: props.onArchive },
        { label: "Видалити…", icon: <Trash2 className="w-4 h-4" />, onClick: props.onDelete, danger: true },
      ]} />
    </div>
  );
  const checkbox = (
    <button onClick={props.onSelect} aria-label="Вибрати"
      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${selected ? "bg-admin-primary border-admin-primary text-admin-primary-fg" : `border-admin-border bg-admin-surface ${anySelected ? "" : "opacity-0 group-hover:opacity-100 focus:opacity-100"}`}`}>
      {selected && <Check className="w-3.5 h-3.5" />}
    </button>
  );
  const star = (
    <button onClick={props.onPin} aria-label="Обране" className={`w-7 h-7 rounded-lg flex items-center justify-center ${p.pinned ? "text-amber-500" : "text-admin-muted opacity-0 group-hover:opacity-100"} hover:bg-admin-fg/5`}>
      <Star className={`w-4 h-4 ${p.pinned ? "fill-current" : ""}`} />
    </button>
  );
  const tile = (
    <div className={`w-12 h-12 shrink-0 rounded-xl bg-gradient-to-br ${KIND_TILE[p.kind]} border border-admin-border flex items-center justify-center text-2xl`}>
      {KIND_META[p.kind].emoji}
    </div>
  );

  if (layout === "list") {
    return (
      <div className={`group flex items-center gap-3 rounded-2xl border bg-admin-card px-3 py-2.5 ${selected ? "border-admin-primary" : "border-admin-border"}`}>
        {checkbox}{tile}
        <div className="min-w-0 flex-1 space-y-1">
          <div className="font-semibold text-sm text-admin-fg truncate">{p.title}</div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">{meta}{sub}</div>
        </div>
        {star}{actions}
      </div>
    );
  }
  return (
    <div className={`group flex flex-col rounded-2xl border bg-admin-card transition-shadow hover:shadow-md ${selected ? "border-admin-primary ring-1 ring-admin-primary" : "border-admin-border"}`}>
      <div className="flex items-start gap-3 p-4 pb-2">
        {tile}
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="font-semibold text-sm leading-snug text-admin-fg line-clamp-2" title={p.title}>{p.title}</div>
          {meta}
        </div>
        <div className="flex flex-col items-end gap-1">{checkbox}{star}</div>
      </div>
      <div className="px-4 pb-3">{sub}</div>
      <div className="mt-auto px-3 pb-3">{actions}</div>
    </div>
  );
}

/* ───────────────────────── Діалоги ───────────────────────── */

function DetailsDialog({ p, folders, onClose, onSave }: {
  p: Presentation | null; folders: PresentationFolder[]; onClose: () => void;
  onSave: (id: string, ch: Partial<Presentation>) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("");
  const [kind, setKind] = useState<PresKind>("pdf");
  const [skill, setSkill] = useState("");
  const [folderId, setFolderId] = useState("");
  const [tags, setTags] = useState("");
  const [notes, setNotes] = useState("");
  useEffect(() => {
    if (!p) return;
    setTitle(p.title); setLevel(p.level ?? ""); setKind(p.kind); setSkill(p.skill ?? "");
    setFolderId(p.folder_id ?? ""); setTags(p.tags.join(", ")); setNotes(p.notes ?? "");
  }, [p]);
  if (!p) return null;
  const inter = isInteractive(p);
  const pretty = prettyTitle(title);
  return (
    <Modal open onClose={onClose} title="Деталі матеріалу" wide
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Скасувати</Btn>
        <Btn disabled={!title.trim()} onClick={() => onSave(p.id, {
          title: title.trim(), level: level || null, kind, skill: (skill || null) as PresSkill | null,
          folder_id: folderId || null, notes: notes.trim() || null,
          tags: tags.split(",").map((t) => t.trim().replace(/^#/, "")).filter(Boolean),
        })}>Зберегти</Btn>
      </>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Field label="Назва">
            <input className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} />
          </Field>
          {pretty !== title && (
            <button onClick={() => setTitle(pretty)} className="mt-1 inline-flex items-center gap-1.5 text-xs text-admin-muted hover:text-admin-fg">
              <Wand2 className="w-3.5 h-3.5" /> Зробити читабельною: «{pretty}»
            </button>
          )}
        </div>
        <Field label="Рівень (CEFR)">
          <select className={fieldClass} value={level} onChange={(e) => setLevel(e.target.value)}>
            <option value="">— не вказано —</option>
            {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </Field>
        <Field label="Навичка / тема уроку">
          <select className={fieldClass} value={skill} onChange={(e) => setSkill(e.target.value)}>
            <option value="">— не вказано —</option>
            {(Object.keys(SKILL_META) as PresSkill[]).map((k) => <option key={k} value={k}>{SKILL_META[k].emoji} {SKILL_META[k].label}</option>)}
          </select>
        </Field>
        <Field label="Тип" hint={inter ? undefined : "Слайди з PDF — завжди «Слайди»."}>
          <select className={fieldClass} value={kind} disabled={!inter} onChange={(e) => setKind(e.target.value as PresKind)}>
            {(inter ? (["interactive", "game", "test"] as PresKind[]) : (["pdf"] as PresKind[])).map((k) => <option key={k} value={k}>{KIND_META[k].emoji} {KIND_META[k].label}</option>)}
          </select>
        </Field>
        <Field label="Папка">
          <select className={fieldClass} value={folderId} onChange={(e) => setFolderId(e.target.value)}>
            <option value="">Без папки</option>
            {folders.map((f) => <option key={f.id} value={f.id}>{f.emoji} {f.name}</option>)}
          </select>
        </Field>
        <div className="sm:col-span-2">
          <Field label="Теги" hint="Через кому: Genitiv, Präpositionen, Modalverben, Dmytro…">
            <input className={fieldClass} value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Genitiv, Kasus" />
          </Field>
        </div>
        <div className="sm:col-span-2">
          <Field label="Нотатка для себе">
            <textarea className={`${fieldClass} min-h-[80px]`} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Для кого, що пропустити, що повторити…" />
          </Field>
        </div>
      </div>
    </Modal>
  );
}

function MoveDialog({ ids, folders, onClose, onPick, onNewFolder }: {
  ids: string[] | null; folders: PresentationFolder[]; onClose: () => void;
  onPick: (folderId: string | null) => void; onNewFolder: () => void;
}) {
  return (
    <Modal open={!!ids} onClose={onClose} title={`Перемістити (${ids?.length ?? 0})`}
      footer={<Btn variant="ghost" onClick={() => { onClose(); onNewFolder(); }}><span className="inline-flex items-center gap-2"><FolderPlus className="w-4 h-4" />Нова папка</span></Btn>}>
      <div className="space-y-1">
        <button onClick={() => onPick(null)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left hover:bg-admin-fg/5 text-admin-fg">
          <Inbox className="w-4 h-4" /> Без папки
        </button>
        {folders.map((f) => (
          <button key={f.id} onClick={() => onPick(f.id)} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-left hover:bg-admin-fg/5 text-admin-fg">
            <span className="w-4 text-center">{f.emoji}</span> {f.name}
          </button>
        ))}
        {folders.length === 0 && <p className="text-sm text-admin-muted px-3 py-2">Папок ще немає — створіть першу.</p>}
      </div>
    </Modal>
  );
}

function AssignDialog({ p, students, teacherId, onClose }: { p: Presentation | null; students: AssignableStudent[]; teacherId: string; onClose: () => void }) {
  const [given, setGiven] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const list = students.filter((s) => s.name.toLowerCase().includes(q.trim().toLowerCase()));
  return (
    <Modal open={!!p} onClose={onClose} title={p ? `ДЗ: ${p.title}` : ""} footer={<Btn variant="ghost" onClick={onClose}>Готово</Btn>}>
      <input className={`${fieldClass} mb-3`} placeholder="Знайти учня…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="space-y-1 max-h-[50dvh] overflow-y-auto">
        {students.length === 0 && <p className="text-sm text-admin-muted">Немає учнів.</p>}
        {list.map((st) => {
          const k = `${p?.id}:${st.id}`;
          const done = given.includes(k);
          return (
            <button key={st.id} disabled={done}
              onClick={async () => {
                if (!p) return;
                try {
                  const fresh = await assignPresentationHomework(teacherId, st.id, p.id);
                  setGiven((g) => [...g, k]);
                  toast.success(fresh ? `Видано: ${st.name}` : `${st.name} вже має це ДЗ`);
                } catch (e: any) { toast.error(e.message); }
              }}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-sm text-left border ${done ? "border-admin-primary text-admin-fg" : "border-transparent hover:bg-admin-fg/5 text-admin-fg"}`}>
              <span className="truncate">{st.name}</span>
              {done ? <Check className="w-4 h-4" /> : <UserPlus className="w-4 h-4 text-admin-muted" />}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

function PasteDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (title: string, code: string) => Promise<void> }) {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setTitle(""); setCode(""); } }, [open]);
  return (
    <Modal open={open} onClose={onClose} title="Вставити HTML / SVG код" wide
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Скасувати</Btn>
        <Btn disabled={busy || !code.trim()} onClick={async () => { setBusy(true); await onCreate(title.trim() || "Інтерактивна презентація", code); setBusy(false); }}>Додати</Btn>
      </>}>
      <div className="space-y-4">
        <Field label="Назва"><input className={fieldClass} value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Genitiv · урок 1" /></Field>
        <Field label="Код" hint="Повний HTML-документ або SVG. Рівень і тип визначаться за назвою.">
          <textarea className={`${fieldClass} min-h-[220px] font-mono text-xs`} value={code} onChange={(e) => setCode(e.target.value)} placeholder="<!DOCTYPE html>…" />
        </Field>
      </div>
    </Modal>
  );
}

function FolderDialog({ value, onClose, onSave, onDelete, countIn }: {
  value: PresentationFolder | "new" | null; onClose: () => void;
  onSave: (name: string, emoji: string, existing: PresentationFolder | null) => Promise<void>;
  onDelete: (f: PresentationFolder) => Promise<void>;
  countIn: (f: PresentationFolder) => number;
}) {
  const existing = value && value !== "new" ? value : null;
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("📁");
  const [confirm, setConfirm] = useState(false);
  useEffect(() => { if (value) { setName(existing?.name ?? ""); setEmoji(existing?.emoji ?? "📁"); setConfirm(false); } }, [value]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal open={!!value} onClose={onClose} title={existing ? "Редагувати папку" : "Нова папка"}
      footer={<>
        {existing && !confirm && <Btn variant="danger" className="mr-auto" onClick={() => setConfirm(true)}>Видалити папку</Btn>}
        {existing && confirm && <Btn variant="danger" className="mr-auto" onClick={() => onDelete(existing)}>Так, видалити (матеріали збережуться)</Btn>}
        <Btn variant="ghost" onClick={onClose}>Скасувати</Btn>
        <Btn disabled={!name.trim()} onClick={() => onSave(name.trim(), emoji, existing)}>Зберегти</Btn>
      </>}>
      <div className="space-y-4">
        <Field label="Назва"><input autoFocus className={fieldClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="Напр.: B1 · Konjunktiv, Дмитро, Goethe B2" /></Field>
        <div>
          <span className="text-xs font-semibold text-admin-muted">Іконка</span>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {FOLDER_EMOJIS.map((e) => (
              <button key={e} onClick={() => setEmoji(e)} className={`w-9 h-9 rounded-xl border text-lg ${emoji === e ? "border-admin-primary bg-admin-primary/10" : "border-admin-border hover:bg-admin-fg/5"}`}>{e}</button>
            ))}
          </div>
        </div>
        {existing && confirm && <p className="text-sm text-admin-muted">У папці {countIn(existing)} матеріалів — вони перейдуть у «Без папки».</p>}
      </div>
    </Modal>
  );
}

function AutoTagDialog({ open, rows, onClose, onApply }: {
  open: boolean; rows: { p: Presentation; g: { level: string | null; skill: PresSkill | null } }[];
  onClose: () => void; onApply: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title={`Проставити рівень і навичку (${rows.length})`} wide
      footer={<>
        <Btn variant="ghost" onClick={onClose}>Скасувати</Btn>
        <Btn disabled={busy} onClick={async () => { setBusy(true); await onApply(); setBusy(false); }}>Застосувати</Btn>
      </>}>
      <p className="text-sm text-admin-muted mb-3">Заповню тільки порожні поля, за назвою. Те, що ви вже вказали, не зміниться. Потім усе можна поправити у «Деталях».</p>
      <div className="space-y-1.5 max-h-[50dvh] overflow-y-auto">
        {rows.map(({ p, g }) => (
          <div key={p.id} className="flex items-center gap-3 rounded-xl border border-admin-border px-3 py-2 text-sm">
            <span className="flex-1 min-w-0 truncate text-admin-fg">{p.title}</span>
            {!p.level && g.level ? <LevelBadge level={g.level} /> : null}
            {!p.skill && g.skill ? <span className="text-xs text-admin-muted">{SKILL_META[g.skill].emoji} {skillShort(g.skill)}</span> : null}
          </div>
        ))}
      </div>
    </Modal>
  );
}

/* ───────────────────────── Перегляд PDF-слайдів ───────────────────────── */

function PdfViewer({ state, onClose, setPage }: { state: { p: Presentation; urls: string[]; page: number }; onClose: () => void; setPage: (n: number) => void }) {
  const { p, urls, page } = state;
  const go = useCallback((d: number) => setPage(Math.min(urls.length, Math.max(1, page + d))), [page, urls.length, setPage]);
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); go(1); }
      else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); go(-1); }
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [go, onClose]);
  return (
    <div className="fixed inset-0 z-50 bg-black/85 flex flex-col p-3 sm:p-5" onClick={onClose}>
      <div className="flex items-center justify-between text-white mb-2 gap-3" onClick={(e) => e.stopPropagation()}>
        <div className="font-semibold truncate">{p.title}</div>
        <button onClick={onClose} className="w-9 h-9 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center" aria-label="Закрити"><X className="w-5 h-5" /></button>
      </div>
      <div className="flex-1 min-h-0 flex items-center justify-center" onClick={(e) => e.stopPropagation()}>
        <img src={urls[page - 1]} alt={`Слайд ${page}`} className="max-h-full max-w-full rounded-xl bg-white object-contain" />
      </div>
      <div className="mt-3 flex items-center justify-center gap-3 text-white" onClick={(e) => e.stopPropagation()}>
        <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40" disabled={page <= 1} onClick={() => go(-1)}><ChevronLeft className="w-5 h-5" /></button>
        <div className="text-sm font-semibold tabular-nums">{page} / {urls.length}</div>
        <button className="p-2 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-40" disabled={page >= urls.length} onClick={() => go(1)}><ChevronRight className="w-5 h-5" /></button>
      </div>
    </div>
  );
}

/* ───────────────────────── Вкладка: мінікурси ───────────────────────── */

function CoursesTab({ onCount }: { onCount: (n: number) => void }) {
  const { user } = useAuth();
  const [courses, setCourses] = useState<MiniCourse[]>([]);
  const [students, setStudents] = useState<AssignableStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [giveFor, setGiveFor] = useState<string | null>(null);
  const [given, setGiven] = useState<string[]>([]);

  useEffect(() => {
    listMiniCourses().then((c) => { setCourses(c); onCount(c.length); }).catch((e) => toast.error(e.message)).finally(() => setLoading(false));
    listAssignableStudents().then(setStudents).catch(() => {});
  }, [onCount]);

  const give = async (course: MiniCourse, studentId: string) => {
    if (!user) return;
    try {
      await assignMiniCourse(user.id, course, studentId);
      setGiven((s) => [...s, `${course.id}:${studentId}`]);
      toast.success("Курс у акаунті учня 🎉");
    } catch (e: any) { toast.error(e.message); }
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-admin-muted" /></div>;
  if (!courses.length)
    return <EmptyState title="Мінікурсів ще немає" description="Відкрийте презентацію (PDF) → меню «⋯» → «Створити мінікурс (ШІ)» — ШІ розіб’є слайди на теми з теорією та вправами."
      cta={{ label: "До майстерні уроків", onClick: () => window.dispatchEvent(new CustomEvent("admin-v2:navigate", { detail: { key: "workshop" } })) }} />;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {courses.map((c) => (
        <Card key={c.id} className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <div className="font-semibold text-sm leading-snug text-admin-fg">{c.title}</div>
            <LevelBadge level={c.level ?? null} />
          </div>
          <div className="text-xs text-admin-muted">{c.sections.length} тем · {new Date(c.created_at).toLocaleDateString("uk-UA")}</div>
          {c.summary && <p className="text-xs text-admin-muted line-clamp-3">{c.summary}</p>}
          <div className="flex flex-wrap gap-1.5">
            {c.sections.map((s) => <span key={s.id} className="px-2 py-1 rounded-lg bg-admin-fg/5 text-[11px] font-medium text-admin-fg">{s.emoji} {s.title}</span>)}
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn variant="ghost" onClick={() => { sessionStorage.setItem("klar-workshop-kit", c.id); window.dispatchEvent(new CustomEvent("admin-v2:navigate", { detail: { key: "workshop" } })); }}>Редагувати</Btn>
            <Btn variant="ghost" onClick={() => setGiveFor(giveFor === c.id ? null : c.id)}><span className="inline-flex items-center gap-1.5"><UserPlus className="w-3.5 h-3.5" />Учню</span></Btn>
          </div>
          {giveFor === c.id && (
            <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto">
              {students.length === 0 && <span className="text-xs text-admin-muted">Немає учнів</span>}
              {students.map((st) => {
                const done = given.includes(`${c.id}:${st.id}`);
                return (
                  <button key={st.id} onClick={() => give(c, st.id)}
                    className={`px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold ${done ? "border-emerald-500 text-emerald-600" : "border-admin-border text-admin-fg hover:bg-admin-fg/5"}`}>
                    {done && <Check className="w-3 h-3 inline mr-1" />}{st.name}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}
