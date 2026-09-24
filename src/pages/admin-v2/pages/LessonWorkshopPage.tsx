import { useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowUp, BookOpen, Copy, Download, Eye, EyeOff, Layers3, Loader2, Plus, Save, Send, Sparkles, Trash2, Upload } from "lucide-react";
import * as pdfjs from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { createKitFromPdf, createKitFromImages, assignKitToStudent, listAssignableStudents, type AssignableStudent } from "@/lib/kit-from-book";
import { createMiniCourseFromPresentation, assignMiniCourse } from "@/lib/minicourse";
import { downloadLibraryBook, listLibraryBooks, type LibraryBook } from "@/lib/book-library";
import { listPresentations, type Presentation } from "@/lib/presentations";
import { kitSections, normalizeKit, type KitBlock, type KitSection, type LessonKit } from "@/lib/lesson-kits";
import BlockEditor from "@/components/blocks/BlockEditor";
import LessonReader from "@/components/blocks/LessonReader";
import BlockRenderer from "@/components/blocks/BlockRenderer";
import KitPageImages from "@/components/blocks/KitPageImages";
import { BLOCK_META, BLOCK_TYPES, emptyPayload, type BlockType, type LessonBlock } from "@/components/blocks/types";

(pdfjs as any).GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
const LEVELS = ["A1", "A2", "B1", "B2", "C1"];
const LAYOUTS: { value: NonNullable<KitSection["layout"]>; label: string; hint: string }[] = [
  { value: "grammar", label: "Grammatik", hint: "Таблиці, правила, приклади" },
  { value: "reading", label: "Lesen", hint: "Журнальний текст і лексика" },
  { value: "illustrated", label: "Bildwelt", hint: "Зображення й пояснення" },
  { value: "practice", label: "Übungsheft", hint: "Короткі інтерактивні вправи" },
];
type Source = "pdf" | "photo" | "book" | "presentation";
type Draft = { title: string; level: string; sections: KitSection[]; pagePaths: string[] };
const section = (title = "Нова тема"): KitSection => ({ id: crypto.randomUUID(), title, emoji: "", summary: "", layout: "grammar", blocks: [] });
const blank = (): Draft => ({ title: "Новий урок німецької", level: "B1", sections: [section()], pagePaths: [] });
const inputClass = "w-full rounded-xl border border-admin-border bg-admin-card px-3 py-2 text-sm text-admin-fg outline-none focus:ring-2 focus:ring-admin-accent/60";
const buttonClass = "inline-flex items-center justify-center gap-2 rounded-xl bg-admin-primary px-4 py-2 text-sm font-semibold text-admin-primary-fg disabled:opacity-50";
const quietClass = "inline-flex items-center justify-center gap-1.5 rounded-xl border border-admin-border px-3 py-2 text-sm text-admin-fg hover:bg-admin-fg/5 disabled:opacity-50";

export default function LessonWorkshopPage() {
  const { user } = useAuth();
  const [kits, setKits] = useState<LessonKit[]>([]);
  const [books, setBooks] = useState<LibraryBook[]>([]);
  const [presentations, setPresentations] = useState<Presentation[]>([]);
  const [students, setStudents] = useState<AssignableStudent[]>([]);
  const [query, setQuery] = useState("");
  const [mode, setMode] = useState<"library" | "manual" | "ai">("library");
  const [kit, setKit] = useState<LessonKit | null>(null);
  const [draft, setDraft] = useState<Draft>(blank);
  const [active, setActive] = useState(0);
  const [selectedBlock, setSelectedBlock] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [showStructure, setShowStructure] = useState(false);
  const [busy, setBusy] = useState("");
  const [dirty, setDirty] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [given, setGiven] = useState<string[]>([]);
  const [source, setSource] = useState<Source>("book");
  const [bookId, setBookId] = useState("");
  const [presentationId, setPresentationId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [pages, setPages] = useState(0);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(3);
  const [focus, setFocus] = useState<"kursbuch" | "arbeitsbuch">("arbeitsbuch");
  const [prompt, setPrompt] = useState("");
  const [approved, setApproved] = useState(false);
  const [suggestQuery, setSuggestQuery] = useState("");
  const [suggestStudent, setSuggestStudent] = useState("");
  const [suggested, setSuggested] = useState<{ kit_id: string; reason: string }[] | null>(null);
  const [suggestHint, setSuggestHint] = useState("");
  const [assignAfterSource, setAssignAfterSource] = useState(false);
  const [requestedKit, setRequestedKit] = useState("");
  const [intentVersion, setIntentVersion] = useState(0);

  useEffect(() => {
    const total = source === "book" ? books.find((b) => b.id === bookId)?.total_pages : source === "presentation" ? presentations.find((p) => p.id === presentationId)?.page_count : null;
    if (total && from === 1 && to > total) setTo(Math.min(3, total));
  }, [source, bookId, presentationId, books, presentations, from, to]);

  const refresh = async () => {
    const { data, error } = await supabase.from("lesson_kits").select("*").order("created_at", { ascending: false }).limit(250);
    if (error) toast({ title: "Не вдалося відкрити уроки", description: error.message, variant: "destructive" });
    else setKits((data ?? []).map(normalizeKit));
  };
  useEffect(() => {
    refresh();
    listLibraryBooks().then(setBooks).catch(() => {});
    listPresentations().then(setPresentations).catch(() => {});
    listAssignableStudents().then(setStudents).catch(() => {});
  }, []);
  useEffect(() => {
    const intent = sessionStorage.getItem("klar-workshop-source");
    if (intent) {
      sessionStorage.removeItem("klar-workshop-source");
      try {
        const parsed = JSON.parse(intent);
        if (parsed.source === "book" || parsed.source === "presentation") {
          setSource(parsed.source);
          if (parsed.source === "book") setBookId(parsed.id);
          else setPresentationId(parsed.id);
          if (parsed.assign) setAssignAfterSource(true);
          setMode("ai");
        }
      } catch { /* ignore stale navigation */ }
    }
    const requested = sessionStorage.getItem("klar-workshop-kit");
    if (requested) { sessionStorage.removeItem("klar-workshop-kit"); setRequestedKit(requested); }
  }, [intentVersion]);
  useEffect(() => {
    const onNavigate = (event: Event) => {
      if ((event as CustomEvent).detail?.key === "workshop") setIntentVersion((v) => v + 1);
    };
    window.addEventListener("admin-v2:navigate", onNavigate);
    return () => window.removeEventListener("admin-v2:navigate", onNavigate);
  }, []);
  useEffect(() => {
    if (!requestedKit || !kits.length) return;
    const found = kits.find((k) => k.id === requestedKit);
    if (found) open(found);
    setRequestedKit("");
  }, [kits, requestedKit]);
  const open = (k: LessonKit) => {
    if (mode === "manual" && dirty && !window.confirm("Незбережені зміни буде втрачено. Продовжити?")) return;
    setKit(k);
    setDraft({ title: k.title, level: k.level ?? "B1", sections: kitSections(k).map((s) => ({ ...s, blocks: s.blocks.map((b) => ({ ...b, id: b.id ?? crypto.randomUUID() })) })), pagePaths: k.page_paths });
    setMode("manual"); setActive(0); setSelectedBlock(null); setPreview(false); setDirty(false); setGiven([]);
  };
  const create = () => { if (dirty && !window.confirm("Незбережені зміни буде втрачено. Продовжити?")) return; setKit(null); setDraft(blank()); setActive(0); setSelectedBlock(null); setMode("manual"); setPreview(false); setDirty(false); };
  const update = (patch: Partial<Draft>) => { setDraft((d) => ({ ...d, ...patch })); setDirty(true); };
  const updateSection = (index: number, change: (s: KitSection) => KitSection) => update({ sections: draft.sections.map((s, i) => i === index ? change(s) : s) });
  const swap = (items: KitBlock[], i: number, delta: number) => {
    const out = [...items]; const j = i + delta;
    if (j >= 0 && j < items.length) [out[i], out[j]] = [out[j], out[i]];
    return out;
  };
  const addBlock = (type: BlockType) => {
    const id = crypto.randomUUID();
    updateSection(active, (s) => ({ ...s, blocks: [...s.blocks, { id, type, title: BLOCK_META[type].de, payload: emptyPayload(type) }] }));
    setSelectedBlock(id);
  };
  const save = async () => {
    if (!user || !draft.title.trim()) return toast({ title: "Назвіть урок", variant: "destructive" });
    if (!draft.sections.length || draft.sections.some((s) => !s.blocks.length)) return toast({ title: "Додайте хоча б один блок у кожну тему", variant: "destructive" });
    setBusy("Зберігаємо урок…");
    try {
      const sections = draft.sections.map((s) => ({ ...s, title: s.title.trim() || "Тема", blocks: s.blocks }));
      const payload = { title: draft.title.trim(), level: draft.level, sections: sections as any, blocks: sections.flatMap((s) => s.blocks) as any, page_paths: draft.pagePaths as any, source: kit?.source ?? "manual", kind: kit?.kind ?? "lesson", focus: kit?.focus ?? "arbeitsbuch" };
      const response = kit
        ? await supabase.from("lesson_kits").update(payload).eq("id", kit.id).select("*").single()
        : await supabase.from("lesson_kits").insert({ ...payload, owner_id: user.id }).select("*").single();
      if (response.error) throw response.error;
      setKit(normalizeKit(response.data)); setDirty(false); await refresh();
      toast({ title: "Урок збережено" });
    } catch (e: any) { toast({ title: "Не вдалося зберегти", description: e.message, variant: "destructive" }); }
    finally { setBusy(""); }
  };
  const changeMode = (next: typeof mode) => {
    if (dirty && !window.confirm("Незбережені зміни буде втрачено. Продовжити?")) return;
    setDirty(false); setMode(next); setPreview(false);
  };
  const chooseFile = async (f: File) => {
    if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") return toast({ title: "Потрібен PDF", variant: "destructive" });
    setFile(null); setPages(0); setApproved(false);
    try { const pdf = await (pdfjs as any).getDocument({ data: await f.arrayBuffer() }).promise; setFile(f); setPages(pdf.numPages); setFrom(1); setTo(Math.min(3, pdf.numPages)); }
    catch { setPages(0); toast({ title: "PDF не відкривається", variant: "destructive" }); }
  };
  const chooseSource = (next: Source) => {
    setSource(next); setApproved(false); setFrom(1);
    setTo(Math.min(3, next === "photo" ? photos.length : next === "pdf" ? pages : next === "book" ? books.find((b) => b.id === bookId)?.total_pages ?? 0 : presentations.find((p) => p.id === presentationId)?.page_count ?? 0));
  };
  const sourceName = source === "presentation" ? presentations.find((p) => p.id === presentationId)?.title : source === "book" ? books.find((b) => b.id === bookId)?.title : source === "photo" ? photos.length ? `${photos.length} фото сторінок` : "" : file?.name;
  const validRange = Number.isInteger(from) && Number.isInteger(to) && from >= 1 && to >= from && to <= (source === "presentation" ? presentations.find((p) => p.id === presentationId)?.page_count ?? 0 : source === "book" ? books.find((b) => b.id === bookId)?.total_pages ?? 0 : source === "photo" ? photos.length : pages) && to - from < (source === "presentation" ? 12 : 8);
  const canGenerate = !!sourceName && validRange;
  const generate = async () => {
    if (!user || !canGenerate || !approved || busy) return;
    setBusy("ШІ читає джерело та створює чернетку…");
    try {
      let made: LessonKit;
      if (source === "presentation") {
        made = await createMiniCourseFromPresentation({ presentationId, level: draft.level, from, to, notes: prompt });
      } else if (source === "photo") {
        made = await createKitFromImages({ ownerId: user.id, images: photos.slice(from - 1, to), title: `Фото сторінок · ${from}–${to}`, level: draft.level, focus, notes: prompt });
      } else {
        const pdf = source === "pdf" ? file : await downloadLibraryBook(books.find((b) => b.id === bookId)!);
        if (!pdf) throw new Error("Виберіть PDF");
        made = await createKitFromPdf({ ownerId: user.id, file: pdf, title: `${sourceName} · ${from}–${to}`, level: draft.level, focus, from, to, notes: prompt });
      }
      await refresh(); open(made);
      if (assignAfterSource) { setAssignAfterSource(false); setGiven([]); setAssignOpen(true); }
      toast({ title: "Чернетку створено", description: "Перевірте слова та відповіді перед видачею учню." });
    } catch (e: any) { toast({ title: "Не вдалося створити урок", description: e?.message ?? "Помилка ШІ", variant: "destructive" }); }
    finally { setBusy(""); setApproved(false); }
  };
  const exportJson = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 2, title: draft.title, level: draft.level, sections: draft.sections, page_paths: draft.pagePaths }, null, 2)], { type: "application/json" }));
    const link = document.createElement("a"); link.href = url; link.download = "klar-lesson.json"; link.click(); URL.revokeObjectURL(url);
  };
  const importJson = async (f: File) => {
    try {
      const raw = JSON.parse(await f.text());
      const rows = Array.isArray(raw.sections) ? raw.sections : Array.isArray(raw.blocks) ? [{ title: raw.title || "Урок", blocks: raw.blocks }] : [];
      if (!rows.length) throw new Error("У JSON немає тем або блоків");
      const next: KitSection[] = rows.slice(0, 50).map((s: any) => ({ id: crypto.randomUUID(), title: String(s.title || "Тема"), emoji: "", summary: String(s.summary ?? ""), layout: LAYOUTS.some((l) => l.value === s.layout) ? s.layout : "grammar", blocks: (Array.isArray(s.blocks) ? s.blocks : []).slice(0, 100).filter((b: any) => BLOCK_TYPES.includes(b.type)).map((b: any) => ({ id: crypto.randomUUID(), type: b.type, title: String(b.title ?? ""), payload: b.payload ?? {}, visible_to_student: b.visible_to_student !== false })) }));
      update({ title: String(raw.title || draft.title), level: LEVELS.includes(raw.level) ? raw.level : draft.level, sections: next, pagePaths: [] });
      setActive(0); setSelectedBlock(null); toast({ title: "JSON завантажено", description: "Збережіть урок, щоб опублікувати зміни." });
    } catch (e: any) { toast({ title: "Невірний JSON", description: e.message, variant: "destructive" }); }
  };
  const assign = async (studentId: string) => {
    if (!user || !kit || dirty || busy || given.includes(studentId)) return;
    setBusy("Видаємо урок…");
    try {
      const current = normalizeKit({ ...kit, title: draft.title, level: draft.level, sections: draft.sections, blocks: draft.sections.flatMap((s) => s.blocks) });
      if (current.sections.length > 1 || current.kind === "minicourse") await assignMiniCourse(user.id, current, studentId);
      else await assignKitToStudent(user.id, current, studentId);
      setGiven((g) => [...g, studentId]); toast({ title: "Урок призначено" });
    } catch (e: any) { toast({ title: "Не вдалося призначити", description: e.message, variant: "destructive" }); }
    finally { setBusy(""); }
  };
  const visible = useMemo(() => kits.filter((k) => `${k.title} ${k.level} ${k.topics.join(" ")}`.toLowerCase().includes(query.toLowerCase())), [kits, query]);
  const askSuggestion = async () => {
    if (!suggestQuery.trim()) return toast({ title: "Опишіть потрібну тему" });
    if (!window.confirm("ШІ підбере уроки з бібліотеки. Запустити AI-запит?")) return;
    setBusy("Шукаємо урок для учня…");
    try {
      const { data, error } = await supabase.functions.invoke("suggest-lesson-kits", { body: { query: suggestQuery.trim(), student_id: suggestStudent || null } });
      if (error || (data as any)?.error) throw error ?? new Error((data as any)?.error);
      setSuggested((data as any)?.results ?? []);
      setSuggestHint((data as any)?.hint ?? "");
    } catch (e: any) { toast({ title: "Не вдалося знайти урок", description: e.message, variant: "destructive" }); }
    finally { setBusy(""); }
  };
  const current = draft.sections[active];
  const editBlock = current?.blocks.find((b) => b.id === selectedBlock);
  const editorBlock: LessonBlock | null = editBlock ? { id: editBlock.id!, lesson_id: kit?.id ?? "draft", type: editBlock.type, title: editBlock.title ?? null, payload: editBlock.payload ?? {}, sort_order: 0, visible_to_student: editBlock.visible_to_student !== false, source: "kit", book_page_id: null } : null;
  const moveBlock = (index: number, delta: number) => updateSection(active, (s) => ({ ...s, blocks: swap(s.blocks, index, delta) }));
  const duplicateBlock = (block: KitBlock, index: number) => {
    const id = crypto.randomUUID();
    updateSection(active, (s) => ({ ...s, blocks: [...s.blocks.slice(0, index + 1), { ...block, id }, ...s.blocks.slice(index + 1)] }));
    setSelectedBlock(id);
  };
  const removeBlock = (block: KitBlock) => {
    updateSection(active, (s) => ({ ...s, blocks: s.blocks.filter((b) => b.id !== block.id) }));
    if (selectedBlock === block.id) setSelectedBlock(null);
  };

  return <div className="mx-auto max-w-[1600px] space-y-6 pb-12 text-admin-fg">
    <div className="flex flex-wrap items-end justify-between gap-4 border-b border-admin-border pb-5">
      <div><p className="mb-2 text-xs font-bold uppercase tracking-[.22em] text-admin-muted">KLAR / Unterricht</p><h2 className="font-display text-3xl font-semibold">Майстерня уроків</h2><p className="mt-2 max-w-2xl text-sm text-admin-muted">Одна бібліотека уроків. Зберіть сторінки вручну або перетворіть книгу, PDF, фото чи презентацію на редаговану чернетку.</p></div>
      <div className="flex flex-wrap gap-2"><button className={quietClass} onClick={() => changeMode("library")}><BookOpen size={16} />Бібліотека</button><button className={buttonClass} onClick={create}><Plus size={16} />Новий урок</button><button className={quietClass} onClick={() => changeMode("ai")}><Sparkles size={16} />Із джерела (ШІ)</button></div>
    </div>

    {mode === "library" && <div className="space-y-5">
      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Знайти урок за назвою, темою або рівнем" className={`${inputClass} max-w-xl`} />
       <div className="rounded-2xl border border-admin-border bg-admin-card p-5"><div className="flex items-center gap-2 text-sm font-bold"><Sparkles size={17} />Підказати урок</div><p className="mt-1 text-xs text-admin-muted">Опишіть тему, рівень або конкретного учня. AI-пошук запускається лише після натискання.</p><div className="mt-3 flex flex-wrap gap-2"><input className={`${inputClass} min-w-[190px] flex-1`} value={suggestQuery} onChange={(e) => setSuggestQuery(e.target.value)} placeholder="Наприклад: Genitiv B1, артиклі" /><select aria-label="Для якого учня" className={`${inputClass} w-auto`} value={suggestStudent} onChange={(e) => setSuggestStudent(e.target.value)}><option value="">Будь-який учень</option>{students.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><button className={quietClass} disabled={!!busy} onClick={askSuggestion}>Знайти</button></div>{suggested !== null && <div className="mt-3 space-y-2">{suggested.length ? suggested.map((r) => { const found = kits.find((k) => k.id === r.kit_id); return found ? <button key={found.id} onClick={() => open(found)} className="block w-full rounded-lg border border-admin-border p-3 text-left text-sm"><strong>{found.title}</strong><span className="ml-2 text-xs text-admin-muted">{r.reason}</span></button> : null; }) : <p className="text-xs text-admin-muted">Нічого не знайдено. Спробуйте інший запит.</p>}{suggestHint && <p className="text-xs text-admin-muted">{suggestHint}</p>}</div>}</div>
      {visible.length === 0 && <div className="rounded-2xl border border-dashed border-admin-border p-12 text-center text-admin-muted">Уроків ще немає. Почніть з ручного уроку або PDF.</div>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{visible.map((k) => <button key={k.id} onClick={() => open(k)} className="group rounded-2xl border border-admin-border bg-admin-card p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-admin-fg/30 hover:shadow-md"><span className="text-[11px] font-bold uppercase tracking-widest text-admin-muted">{k.level ?? "Deutsch"} · {k.kind === "minicourse" ? "Мінікурс" : "Урок"}</span><h3 className="mt-3 font-display text-lg font-semibold group-hover:underline">{k.title}</h3><p className="mt-2 line-clamp-2 text-xs text-admin-muted">{k.summary ?? `${kitSections(k).length} тем · ${k.blocks.length} блоків`}</p><span className="mt-5 inline-flex items-center gap-1 text-xs font-bold">Редагувати <span aria-hidden>→</span></span></button>)}</div>
    </div>}

    {mode === "ai" && <div className="mx-auto max-w-4xl space-y-5">
      <div className="rounded-2xl border border-admin-border bg-admin-card p-6"><div className="flex items-start gap-3"><Sparkles className="mt-1 shrink-0" size={20} /><div><h3 className="font-display text-xl font-semibold">Створити чернетку з матеріалу</h3><p className="mt-1 text-sm text-admin-muted">Виберіть реальне джерело, сторінки та побажання. Перед запуском окремо підтвердьте AI-запит.</p></div></div>
        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(["book", "pdf", "photo", "presentation"] as Source[]).map((s) => <button key={s} className={`rounded-xl border px-4 py-4 text-left text-sm font-semibold ${source === s ? "border-admin-fg bg-admin-accent/15" : "border-admin-border"}`} onClick={() => chooseSource(s)}>{s === "book" ? "Бібліотека книг" : s === "pdf" ? "PDF з компʼютера" : s === "photo" ? "Фото сторінок" : "Презентація"}</button>)}</div>
        <div className="mt-5 space-y-4">
          {source === "book" && <label className="block space-y-1 text-xs font-semibold">Книга<select className={inputClass} value={bookId} onChange={(e) => { setBookId(e.target.value); setApproved(false); const b = books.find((x) => x.id === e.target.value); if (b) { setTo(Math.min(3, b.total_pages || 3)); setDraft((d) => ({ ...d, level: b.level || d.level })); setFocus(b.kind === "grammatik" || b.kind === "arbeitsbuch" ? "arbeitsbuch" : "kursbuch"); } }}><option value="">Виберіть книгу</option>{books.map((b) => <option key={b.id} value={b.id}>{b.title} · {b.total_pages} стор.</option>)}</select></label>}
          {source === "presentation" && <label className="block space-y-1 text-xs font-semibold">Презентація<select className={inputClass} value={presentationId} onChange={(e) => { setPresentationId(e.target.value); setApproved(false); setTo(Math.min(12, presentations.find((p) => p.id === e.target.value)?.page_count ?? 0)); }}><option value="">Виберіть презентацію</option>{presentations.map((p) => <option key={p.id} value={p.id}>{p.title} · {p.page_count} слайдів</option>)}</select></label>}
          {source === "pdf" && <label className="block space-y-1 text-xs font-semibold">Ваш PDF<input type="file" accept="application/pdf,.pdf" className={inputClass} onChange={(e) => e.target.files?.[0] && chooseFile(e.target.files[0])} />{file && <span className="text-admin-muted">{file.name} · {pages} стор.</span>}</label>}
          {source === "photo" && <label className="block space-y-1 text-xs font-semibold">Фото сторінок у порядку читання (JPG, PNG, WebP; до 8 за один запуск)<input type="file" accept="image/jpeg,image/png,image/webp" multiple className={inputClass} onChange={(e) => { const selected = Array.from(e.target.files ?? []); if (selected.some((f) => !["image/jpeg", "image/png", "image/webp"].includes(f.type) || f.size > 12 * 1024 * 1024)) { toast({ title: "Потрібні JPG, PNG чи WebP до 12 МБ", variant: "destructive" }); setPhotos([]); } else { setPhotos(selected); setFrom(1); setTo(Math.min(3, selected.length)); } setApproved(false); }} />{photos.length > 0 && <span className="text-admin-muted">{photos.map((f, i) => `${i + 1}. ${f.name}`).join(" · ")}</span>}</label>}
          <div className="grid gap-4 sm:grid-cols-3"><label className="text-xs font-semibold">З<input type="number" min={1} value={from} onChange={(e) => { setFrom(Number(e.target.value)); setApproved(false); }} className={inputClass} /></label><label className="text-xs font-semibold">До<input type="number" min={1} value={to} onChange={(e) => { setTo(Number(e.target.value)); setApproved(false); }} className={inputClass} /></label><label className="text-xs font-semibold">Рівень<select value={draft.level} onChange={(e) => { setDraft((d) => ({ ...d, level: e.target.value })); setApproved(false); }} className={inputClass}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select></label></div>
          {source !== "presentation" && <label className="text-xs font-semibold">Напрям<select className={inputClass} value={focus} onChange={(e) => { setFocus(e.target.value as typeof focus); setApproved(false); }}><option value="arbeitsbuch">Граматика та вправи</option><option value="kursbuch">Читання та лексика</option></select></label>}
          <label className="block space-y-1 text-xs font-semibold">Що саме створити?<textarea className={inputClass} rows={3} value={prompt} onChange={(e) => { setPrompt(e.target.value); setApproved(false); }} placeholder="Наприклад: тема Genitiv, спочатку правило, далі таблиця та 5 вправ. Без аудіо." /></label>
        </div>
      </div>
      {canGenerate && <div className="rounded-2xl border border-admin-border bg-admin-card p-6"><p className="text-xs font-bold uppercase tracking-widest text-admin-muted">План перед запуском</p><h4 className="mt-2 font-display text-xl font-semibold">{sourceName}</h4><p className="mt-2 text-sm text-admin-muted">{source === "presentation" ? "Слайди" : "Сторінки"} {from}–{to} · {draft.level} · {source === "presentation" ? "теми з теорією та вправами" : focus === "arbeitsbuch" ? "граматичні блоки та завдання" : "читання, слова та завдання"}</p><p className="mt-2 text-sm text-admin-muted">{prompt || "Без додаткових інструкцій."}</p><p className="mt-4 text-xs text-admin-muted">ШІ читає оригінальні сторінки/слайди. Перевірте текст і ключі після генерації. Запит може витратити кредити AI-провайдера; монети учня не списуються, окремої вартості генерації в застосунку поки немає.</p><label className="mt-5 flex items-start gap-2 text-sm"><input type="checkbox" checked={approved} onChange={(e) => setApproved(e.target.checked)} className="mt-1" />Підтверджую запуск AI-запиту та можливі витрати кредитів провайдера</label><button disabled={!approved || !!busy} onClick={generate} className={`${buttonClass} mt-5`}>{busy ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}{busy || "Створити чернетку"}</button></div>}
      {!canGenerate && <p className="text-sm text-admin-muted">Виберіть джерело та правильний діапазон: до 8 сторінок PDF/фото або до 12 слайдів.</p>}
    </div>}

    {mode === "manual" && <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-admin-border bg-admin-card px-4 py-3"><div className="flex flex-wrap gap-2"><button className={quietClass} onClick={() => changeMode("library")}><ArrowLeft size={15} />До бібліотеки</button><button className={quietClass} onClick={() => setPreview((x) => !x)}><Eye size={15} />{preview ? "До редактора" : "Очима учня"}</button><button className={quietClass} onClick={exportJson}><Download size={15} />JSON</button><label className={`${quietClass} cursor-pointer`}><Upload size={15} />Імпорт JSON<input className="hidden" type="file" accept="application/json,.json" onChange={(e) => { if (e.target.files?.[0]) importJson(e.target.files[0]); e.target.value = ""; }} /></label></div><div className="flex gap-2"><button disabled={!kit || dirty || !!busy} className={quietClass} onClick={() => { setGiven([]); setAssignOpen(true); }}><Send size={15} />Дати учню</button><button disabled={!!busy || !dirty && !!kit} onClick={save} className={buttonClass}>{busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}{dirty ? "Зберегти зміни" : kit ? "Збережено" : "Зберегти урок"}</button></div></div>
      {preview ? <LessonReader title={draft.title} level={draft.level} sections={draft.sections} pagePaths={draft.pagePaths} imageBucket={kit?.presentation_id ? "presentation-slides" : "tutoring-materials"} showActions={false} /> : <div className="grid min-h-[70vh] gap-4 xl:grid-cols-[210px_minmax(0,1fr)_300px]">
        <aside className="rounded-2xl border border-admin-border bg-admin-card p-4"><span className="text-[11px] font-bold uppercase tracking-widest text-admin-muted">Структура уроку</span><input aria-label="Назва уроку" value={draft.title} onChange={(e) => update({ title: e.target.value })} className={`${inputClass} mt-4 font-semibold`} /><select aria-label="Рівень" className={`${inputClass} mt-2`} value={draft.level} onChange={(e) => update({ level: e.target.value })}>{LEVELS.map((l) => <option key={l}>{l}</option>)}</select><div className="mt-6 space-y-2">{draft.sections.map((s, i) => <button key={s.id} onClick={() => { setActive(i); setSelectedBlock(null); }} className={`w-full rounded-xl border px-3 py-3 text-left text-sm ${active === i ? "border-admin-fg bg-admin-accent/20" : "border-admin-border"}`}><span className="block text-[10px] font-bold text-admin-muted">ТЕМА {String(i + 1).padStart(2, "0")}</span><strong className="mt-1 block truncate">{s.title}</strong><span className="text-xs text-admin-muted">{s.blocks.length} блоків · {LAYOUTS.find((l) => l.value === s.layout)?.label}</span></button>)}</div><button className={`${quietClass} mt-4 w-full`} onClick={() => { update({ sections: [...draft.sections, section()] }); setActive(draft.sections.length); setSelectedBlock(null); }}><Plus size={15} />Додати тему</button></aside>
        <div className="min-w-0 rounded-2xl border border-admin-border bg-admin-card p-4 sm:p-7"><div className="mb-6 flex flex-wrap items-start justify-between gap-3 border-b border-admin-border pb-5"><div className="min-w-0 flex-1 space-y-2"><span className="text-[11px] font-bold uppercase tracking-widest text-admin-muted">Розворот {active + 1} / {draft.sections.length}</span><input aria-label="Назва теми" className={`${inputClass} font-display text-lg font-semibold`} value={current.title} onChange={(e) => updateSection(active, (s) => ({ ...s, title: e.target.value }))} /><input aria-label="Опис теми" className={inputClass} placeholder="Короткий опис теми" value={current.summary ?? ""} onChange={(e) => updateSection(active, (s) => ({ ...s, summary: e.target.value }))} /></div><button className={quietClass} disabled={draft.sections.length === 1} onClick={() => { if (!window.confirm("Видалити тему та всі її блоки?")) return; update({ sections: draft.sections.filter((_, i) => i !== active) }); setActive(Math.max(0, active - 1)); setSelectedBlock(null); }} title="Видалити тему"><Trash2 size={15} /></button></div>
          <div className="mb-7 grid gap-2 sm:grid-cols-2">{LAYOUTS.map((l) => <button key={l.value} onClick={() => updateSection(active, (s) => ({ ...s, layout: l.value }))} className={`rounded-xl border px-3 py-3 text-left ${current.layout === l.value ? "border-admin-fg bg-admin-accent/15" : "border-admin-border"}`}><strong className="block text-xs">{l.label}</strong><span className="text-[11px] text-admin-muted">{l.hint}</span></button>)}</div>
          <div className="mt-6 flex items-center justify-between"><span className="text-xs font-bold uppercase tracking-widest text-admin-muted">Сторінка уроку</span><button className={quietClass} onClick={() => setShowStructure((v) => !v)}><Layers3 size={14} />{showStructure ? "Сховати структуру" : "Показати структуру"}</button></div>
          {showStructure && <div className="mt-3 space-y-2">{current.blocks.map((b, i) => <div key={b.id} className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${selectedBlock === b.id ? "border-admin-fg bg-admin-accent/10" : "border-admin-border"}`}><span className="text-admin-muted">{i + 1}</span><button className="min-w-0 flex-1 truncate text-left font-semibold" onClick={() => setSelectedBlock(b.id!)}>{b.title || BLOCK_META[b.type as BlockType]?.label || b.type}</button>{b.visible_to_student === false && <EyeOff size={14} />}</div>)}</div>}
          <div className="lesson-reader lesson-workshop-canvas mt-4 overflow-hidden rounded-2xl border shadow-sm">
            <div className="flex items-center justify-between border-b border-border bg-muted/30 px-5 py-3 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
              <span>Полотно · {LAYOUTS.find((l) => l.value === current.layout)?.label ?? "Grammatik"}</span>
              <span>{current.blocks.length} блоків</span>
            </div>
            <div className="lesson-workshop-paper px-5 py-8 sm:px-9 sm:py-10">
              <p className="text-[11px] font-bold uppercase tracking-[.2em] text-primary">KLAR / {draft.level} · Thema {String(active + 1).padStart(2, "0")}</p>
              <h3 className="mt-3 font-display text-2xl font-semibold leading-tight text-foreground">{current.title}</h3>
              {current.summary && <p className="mt-2 text-sm leading-7 text-muted-foreground">{current.summary}</p>}
              {draft.pagePaths.length > 0 && <div className="mt-6"><KitPageImages paths={draft.pagePaths} bucket={kit?.presentation_id ? "presentation-slides" : "tutoring-materials"} /></div>}
              {current.blocks.length === 0 && <div className="mt-8 rounded-xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">Порожня сторінка. Додайте перший блок нижче.</div>}
              <div className={`lesson-layout-${current.layout ?? "grammar"} mt-7`}>
                {current.blocks.map((b, i) => <section key={b.id} className={`lesson-workshop-block border-b border-border/70 py-6 last:border-0 ${selectedBlock === b.id ? "lesson-workshop-block-selected" : ""}`}>
                  <div className="mb-4 flex flex-wrap items-center gap-1.5">
                    <button className="mr-auto min-w-0 text-left text-xs font-bold text-primary hover:underline" onClick={() => setSelectedBlock(b.id!)} aria-label={`Редагувати блок ${i + 1}: ${b.title || BLOCK_META[b.type as BlockType]?.label || b.type}`}>
                      {String(i + 1).padStart(2, "0")} · {b.title || BLOCK_META[b.type as BlockType]?.label || b.type}
                    </button>
                    <button className="lesson-workshop-tool" title={b.visible_to_student === false ? "Показати учню" : "Приховати від учня"} aria-label={b.visible_to_student === false ? "Показати учню" : "Приховати від учня"} onClick={() => updateSection(active, (s) => ({ ...s, blocks: s.blocks.map((x) => x.id === b.id ? { ...x, visible_to_student: x.visible_to_student === false } : x) }))}>{b.visible_to_student === false ? <EyeOff size={15} /> : <Eye size={15} />}</button>
                    <button className="lesson-workshop-tool" aria-label="Угору" disabled={i === 0} onClick={() => moveBlock(i, -1)}><ArrowUp size={15} /></button>
                    <button className="lesson-workshop-tool" aria-label="Вниз" disabled={i === current.blocks.length - 1} onClick={() => moveBlock(i, 1)}><ArrowDown size={15} /></button>
                    <button className="lesson-workshop-tool" aria-label="Дублювати" onClick={() => duplicateBlock(b, i)}><Copy size={15} /></button>
                    <button className="lesson-workshop-tool" aria-label="Видалити блок" onClick={() => removeBlock(b)}><Trash2 size={15} /></button>
                  </div>
                  {b.visible_to_student === false && <p className="mb-3 text-xs font-semibold text-muted-foreground">Приховано від учня</p>}
                  <div className={b.visible_to_student === false ? "opacity-50" : ""}>
                    <BlockRenderer block={{ id: b.id!, lesson_id: kit?.id ?? "draft", type: b.type, title: b.title ?? null, payload: b.payload ?? {}, sort_order: i, visible_to_student: b.visible_to_student !== false, source: "kit", book_page_id: null }} value={{}} onChange={() => {}} checked={false} readOnly />
                  </div>
                </section>)}
              </div>
            </div>
          </div>
          <div className="mt-7 border-t border-admin-border pt-5"><span className="text-xs font-bold text-admin-muted">ДОДАТИ БЛОК</span><div className="mt-3 flex flex-wrap gap-2">{BLOCK_TYPES.filter((t) => t !== "hoer").map((t) => <button key={t} className={quietClass} onClick={() => addBlock(t)}><Plus size={13} />{BLOCK_META[t].label}</button>)}</div><p className="mt-3 text-xs text-admin-muted">Аудіо необовʼязкове; його можна додати окремим блоком.</p><button className={`${quietClass} mt-2`} onClick={() => addBlock("hoer")}>+ Аудіювання</button></div>
        </div>
        <aside className="min-w-0 rounded-2xl border border-admin-border bg-admin-card p-4"><span className="text-[11px] font-bold uppercase tracking-widest text-admin-muted">Налаштування блока</span>{editorBlock ? <div className="mt-4 max-h-[75vh] overflow-y-auto pr-1"><BlockEditor block={editorBlock} onChange={(patch) => updateSection(active, (s) => ({ ...s, blocks: s.blocks.map((b) => b.id === selectedBlock ? { ...b, title: patch.title === undefined ? b.title : patch.title, payload: patch.payload ?? b.payload, visible_to_student: patch.visible_to_student ?? b.visible_to_student } : b) }))} /></div> : <div className="mt-6 rounded-xl bg-admin-bg p-5 text-sm leading-6 text-admin-muted"><Layers3 className="mb-3" size={22} />Виберіть блок на сторінці, щоб редагувати його зміст і правильні відповіді.</div>}</aside>
      </div>}
    </div>}

    {assignOpen && kit && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setAssignOpen(false)}><div className="max-h-[80vh] w-full max-w-sm overflow-y-auto rounded-2xl bg-admin-card p-5" onClick={(e) => e.stopPropagation()}><h3 className="font-display text-lg font-semibold">Кому призначити урок?</h3><p className="mt-1 text-xs text-admin-muted">Учень отримає копію поточного збереженого уроку.</p><div className="mt-4 space-y-1">{students.map((s) => <button key={s.id} disabled={given.includes(s.id) || !!busy} className={`${quietClass} w-full justify-between`} onClick={() => assign(s.id)}>{s.name}{given.includes(s.id) ? " ✓" : " →"}</button>)}{students.length === 0 && <p className="text-sm text-admin-muted">Учнів поки немає.</p>}</div><button className={`${quietClass} mt-4`} onClick={() => setAssignOpen(false)}>Закрити</button></div></div>}
  </div>;
}