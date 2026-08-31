import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, SectionHeader, EmptyState } from "./_ui";
import { toast } from "@/hooks/use-toast";
import {
  MATERIAL_CATEGORIES,
  MATERIAL_LEVELS,
  MaterialCategory,
  MaterialFolder,
  MaterialItem,
  MaterialKind,
  createFolder,
  createItem,
  deleteFolder,
  deleteItem,
  fetchFolders,
  fetchItems,
  generateMaterials,
  kindLabel,
  materialPreview,
} from "@/lib/materials";
import { Folder, FolderPlus, Plus, Search, Sparkles, Trash2, BookOpen } from "lucide-react";

const input = "w-full px-3 py-2 rounded-xl border border-slate-200 text-sm";

export default function MaterialsPage() {
  const { user } = useAuth();
  const [folders, setFolders] = useState<MaterialFolder[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<MaterialCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewFolder, setShowNewFolder] = useState(false);

  const active = folders.find((f) => f.id === activeId) || null;

  const loadFolders = async () => {
    try {
      const list = await fetchFolders();
      setFolders(list);
      setActiveId((prev) => prev ?? list[0]?.id ?? null);
    } catch (e: any) {
      toast({ title: "Помилка", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadFolders(); }, []);

  useEffect(() => {
    if (!activeId) { setItems([]); return; }
    fetchItems(activeId).then(setItems).catch((e) => toast({ title: "Помилка", description: e.message, variant: "destructive" }));
  }, [activeId]);

  const visibleFolders = useMemo(
    () => folders.filter((f) => (catFilter ? f.category === catFilter : true)),
    [folders, catFilter],
  );

  const filteredItems = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter((i) =>
      (i.title || "").toLowerCase().includes(t) || materialPreview(i).toLowerCase().includes(t));
  }, [items, q]);

  if (loading) return <p className="text-sm text-slate-500 animate-pulse">Завантаження…</p>;

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Банк матеріалів"
        subtitle="Папки з готовою теорією та завданнями — під час уроку просто знаходьте й додавайте"
        action={
          <button
            onClick={() => setShowNewFolder(true)}
            className="px-4 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-2"
            style={{ background: "#4F46E5" }}
          >
            <FolderPlus className="w-4 h-4" /> Нова папка
          </button>
        }
      />

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setCatFilter(null)}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${!catFilter ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 bg-white"}`}
        >
          Усі категорії
        </button>
        {MATERIAL_CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCatFilter(c.key === catFilter ? null : c.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${c.key === catFilter ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600 bg-white"}`}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>

      {showNewFolder && user && (
        <NewFolderForm
          ownerId={user.id}
          onClose={() => setShowNewFolder(false)}
          onCreated={(f) => { setFolders((p) => [f, ...p]); setActiveId(f.id); setShowNewFolder(false); }}
        />
      )}

      {folders.length === 0 ? (
        <EmptyState
          title="Ще немає папок"
          description="Створіть папку, наприклад «B1 Prüfung», «B1 Медицина» або «Граматика B1» — і наповніть її матеріалами за допомогою ІІ."
          cta={{ label: "Створити папку", onClick: () => setShowNewFolder(true) }}
        />
      ) : (
        <div className="grid lg:grid-cols-[280px_1fr] gap-5 items-start">
          <Card className="p-3 space-y-1">
            {visibleFolders.map((f) => {
              const meta = MATERIAL_CATEGORIES.find((c) => c.key === f.category);
              return (
                <button
                  key={f.id}
                  onClick={() => setActiveId(f.id)}
                  className={`w-full text-left px-3 py-2.5 rounded-xl flex items-start gap-2 ${f.id === activeId ? "bg-indigo-50 text-indigo-700" : "hover:bg-slate-50 text-slate-700"}`}
                >
                  <span className="text-base leading-none mt-0.5">{meta?.icon}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium truncate">{f.name}</span>
                    <span className="block text-[11px] text-slate-400">
                      {meta?.label}{f.level ? ` · ${f.level}` : ""}
                    </span>
                  </span>
                </button>
              );
            })}
            {visibleFolders.length === 0 && (
              <p className="text-xs text-slate-400 p-3">У цій категорії папок немає.</p>
            )}
          </Card>

          {active && (
            <div className="space-y-5">
              <Card className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                      <Folder className="w-4 h-4 text-indigo-500" /> {active.name}
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {MATERIAL_CATEGORIES.find((c) => c.key === active.category)?.label}
                      {active.level ? ` · ${active.level}` : ""} · {items.length} матеріалів
                    </p>
                    {active.description && <p className="text-sm text-slate-600 mt-2">{active.description}</p>}
                  </div>
                  <button
                    onClick={async () => {
                      if (!confirm(`Видалити папку «${active.name}» разом з матеріалами?`)) return;
                      try {
                        await deleteFolder(active.id);
                        setFolders((p) => p.filter((x) => x.id !== active.id));
                        setActiveId(null);
                      } catch (e: any) {
                        toast({ title: "Помилка", description: e.message, variant: "destructive" });
                      }
                    }}
                    className="p-2 rounded-xl hover:bg-red-50 text-red-500 shrink-0"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </Card>

              <AiGenerator
                folder={active}
                onGenerated={(newItems) => setItems((p) => [...p, ...newItems])}
              />

              {user && (
                <ManualAdd
                  folder={active}
                  ownerId={user.id}
                  onAdded={(it) => setItems((p) => [...p, it])}
                />
              )}

              <Card className="p-5">
                <SectionHeader title="Матеріали" subtitle={`${filteredItems.length} знайдено`} />
                <div className="relative mb-4">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Пошук у папці…"
                    className={`${input} pl-9`}
                  />
                </div>
                {filteredItems.length === 0 ? (
                  <p className="text-sm text-slate-500">Поки нічого немає — згенеруйте матеріали через ІІ вище.</p>
                ) : (
                  <div className="space-y-2">
                    {filteredItems.map((m) => (
                      <div key={m.id} className="p-3 rounded-xl border border-slate-200 flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {m.title || materialPreview(m).slice(0, 70) || kindLabel(m.kind)}
                          </p>
                          <p className="text-xs text-slate-500 line-clamp-3 whitespace-pre-wrap">{materialPreview(m)}</p>
                          <div className="mt-1 flex gap-2 text-[10px] text-slate-400">
                            <span>{kindLabel(m.kind)}</span>
                            {m.level && <span>{m.level}</span>}
                            <span>{m.source === "ai" ? "ІІ" : m.source === "book" ? "з книги" : "вручну"}</span>
                          </div>
                        </div>
                        <button
                          onClick={async () => {
                            try {
                              await deleteItem(m.id);
                              setItems((p) => p.filter((x) => x.id !== m.id));
                            } catch (e: any) {
                              toast({ title: "Помилка", description: e.message, variant: "destructive" });
                            }
                          }}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-500 shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function NewFolderForm({
  ownerId,
  onCreated,
  onClose,
}: {
  ownerId: string;
  onCreated: (f: MaterialFolder) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<MaterialCategory>("grammar");
  const [level, setLevel] = useState("B1");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!name.trim()) return toast({ title: "Введіть назву папки" });
    setBusy(true);
    try {
      const f = await createFolder({ ownerId, name: name.trim(), category, level, description });
      onCreated(f);
      toast({ title: "Папку створено" });
    } catch (e: any) {
      toast({ title: "Помилка", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 space-y-3">
      <SectionHeader title="Нова папка" subtitle="Наприклад: «B1 Prüfung», «B1 Медицина», «B1 Максим»" />
      <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Назва папки" className={input} />
      <div className="flex flex-wrap gap-2">
        {MATERIAL_CATEGORIES.map((c) => (
          <button
            key={c.key}
            onClick={() => setCategory(c.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${c.key === category ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"}`}
          >
            {c.icon} {c.label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        {MATERIAL_LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border ${l === level ? "border-slate-800 bg-slate-900 text-white" : "border-slate-200 text-slate-500"}`}
          >
            {l}
          </button>
        ))}
      </div>
      <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} placeholder="Опис (необов’язково)" className={input} />
      <div className="flex gap-2">
        <button onClick={submit} disabled={busy} className="px-4 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50" style={{ background: "#4F46E5" }}>
          {busy ? "Створюю…" : "Створити"}
        </button>
        <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-600">
          Скасувати
        </button>
      </div>
    </Card>
  );
}

const GEN_KINDS: MaterialKind[] = ["question", "text", "word"];

function AiGenerator({
  folder,
  onGenerated,
}: {
  folder: MaterialFolder;
  onGenerated: (items: MaterialItem[]) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [bookText, setBookText] = useState("");
  const [showBook, setShowBook] = useState(false);
  const [level, setLevel] = useState(folder.level || "B1");
  const [count, setCount] = useState(10);
  const [kinds, setKinds] = useState<MaterialKind[]>(
    folder.category === "vocab" ? ["word"] : folder.category === "theory" ? ["text"] : ["question"],
  );
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLevel(folder.level || "B1");
    setKinds(folder.category === "vocab" ? ["word"] : folder.category === "theory" ? ["text"] : ["question"]);
  }, [folder.id]);

  const toggleKind = (k: MaterialKind) =>
    setKinds((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));

  const run = async () => {
    if (!kinds.length) return toast({ title: "Виберіть тип матеріалів" });
    setBusy(true);
    try {
      const created = await generateMaterials({
        folderId: folder.id,
        prompt,
        bookText,
        level,
        count,
        kinds,
      });
      onGenerated(created);
      toast({ title: `Готово — додано ${created.length} матеріалів` });
      setPrompt("");
      setBookText("");
    } catch (e: any) {
      toast({ title: "Помилка генерації", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-5 space-y-3">
      <SectionHeader title="Генерація з ІІ" subtitle="Опишіть, що потрібно — ІІ наповнить папку готовими матеріалами" />
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        rows={3}
        placeholder="Напр.: Perfekt із haben/sein, рівень B1, з медичною лексикою, для підготовки до Prüfung"
        className={input}
      />

      <button
        onClick={() => setShowBook((v) => !v)}
        className="text-xs font-medium text-indigo-600 flex items-center gap-1"
      >
        <BookOpen className="w-3.5 h-3.5" /> {showBook ? "Приховати текст із книги" : "Додати текст із книги"}
      </button>
      {showBook && (
        <textarea
          value={bookText}
          onChange={(e) => setBookText(e.target.value)}
          rows={6}
          placeholder="Вставте текст/теорію з книги — ІІ зробить із неї теорію та завдання"
          className={input}
        />
      )}

      <div className="flex flex-wrap gap-2">
        {GEN_KINDS.map((k) => (
          <button
            key={k}
            onClick={() => toggleKind(k)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${kinds.includes(k) ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"}`}
          >
            {kindLabel(k)}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {MATERIAL_LEVELS.map((l) => (
          <button
            key={l}
            onClick={() => setLevel(l)}
            className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border ${l === level ? "border-slate-800 bg-slate-900 text-white" : "border-slate-200 text-slate-500"}`}
          >
            {l}
          </button>
        ))}
        <select value={count} onChange={(e) => setCount(Number(e.target.value))} className="px-3 py-2 rounded-xl border border-slate-200 text-sm">
          {[5, 10, 15, 20, 30, 40].map((n) => (
            <option key={n} value={n}>{n} шт.</option>
          ))}
        </select>
        <button
          onClick={run}
          disabled={busy}
          className="px-4 py-2 rounded-xl text-white text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          style={{ background: "#4F46E5" }}
        >
          <Sparkles className="w-4 h-4" /> {busy ? "Генерую…" : "Згенерувати"}
        </button>
      </div>
    </Card>
  );
}

function ManualAdd({
  folder,
  ownerId,
  onAdded,
}: {
  folder: MaterialFolder;
  ownerId: string;
  onAdded: (it: MaterialItem) => void;
}) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<MaterialKind>(folder.category === "vocab" ? "word" : "text");
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
    } else {
      if (!term.trim()) return toast({ title: "Введіть слово" });
      content = { term, article, translation, example };
    }
    setBusy(true);
    try {
      const it = await createItem({
        folderId: folder.id,
        ownerId,
        kind,
        title: title.trim() || null,
        content,
        level: folder.level,
      });
      onAdded(it);
      toast({ title: "Додано в папку" });
      setTitle(""); setBody(""); setUrl(""); setQuestion(""); setOptions(""); setCorrect("");
      setTerm(""); setArticle(""); setTranslation(""); setExample("");
    } catch (e: any) {
      toast({ title: "Помилка", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-700 bg-white flex items-center gap-2"
      >
        <Plus className="w-4 h-4" /> Додати вручну
      </button>
    );
  }

  return (
    <Card className="p-5 space-y-3">
      <SectionHeader title="Додати вручну" />
      <div className="flex flex-wrap gap-2">
        {(["text", "question", "audio", "word"] as MaterialKind[]).map((k) => (
          <button
            key={k}
            onClick={() => setKind(k)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${k === kind ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"}`}
          >
            {kindLabel(k)}
          </button>
        ))}
      </div>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Заголовок (необов’язково)" className={input} />
      {kind === "text" && <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={5} placeholder="Текст, правило, приклади…" className={input} />}
      {kind === "audio" && <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Посилання на аудіо" className={input} />}
      {kind === "question" && (
        <>
          <textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} placeholder="Питання" className={input} />
          <textarea value={options} onChange={(e) => setOptions(e.target.value)} rows={3} placeholder="Варіанти — по одному в рядку (необов’язково)" className={input} />
          <input value={correct} onChange={(e) => setCorrect(e.target.value)} placeholder="Правильна відповідь" className={input} />
        </>
      )}
      {kind === "word" && (
        <div className="grid sm:grid-cols-2 gap-2">
          <input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Слово / фраза" className={input} />
          <input value={article} onChange={(e) => setArticle(e.target.value)} placeholder="Артикль (der/die/das)" className={input} />
          <input value={translation} onChange={(e) => setTranslation(e.target.value)} placeholder="Переклад" className={input} />
          <input value={example} onChange={(e) => setExample(e.target.value)} placeholder="Приклад" className={input} />
        </div>
      )}
      <div className="flex gap-2">
        <button onClick={submit} disabled={busy} className="px-4 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50" style={{ background: "#4F46E5" }}>
          {busy ? "Зберігаю…" : "Зберегти"}
        </button>
        <button onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-slate-600">
          Закрити
        </button>
      </div>
    </Card>
  );
}
