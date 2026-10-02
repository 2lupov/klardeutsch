import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Volume2, Trash2, X, Check, Loader2, ArrowLeft, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { dutchAi, speakWord } from "@/lib/dutch";
import {
  getFolders, getByFolder, getVocabMap, addManualWord, updateWord, deleteWord,
  DEFAULT_FOLDER, type VocabItem, type FolderSummary, type GlossaryEntry,
} from "@/lib/vocabStore";
import WordImage from "./WordImage";

const LEVEL_ORDER = ["A0", "A1", "A2", "B1", "B2"];
const isLevelFolder = (name: string) => LEVEL_ORDER.includes(name);

export default function Dictionary() {
  const [folders, setFolders] = useState<FolderSummary[]>([]);
  const [selected, setSelected] = useState<string>("__all__");
  const [words, setWords] = useState<VocabItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<VocabItem | null>(null);

  const refreshFolders = async () => setFolders(await getFolders());
  const refreshWords = async (folder = selected) => {
    setLoading(true);
    try {
      if (folder === "__all__") setWords([...(await getVocabMap()).values()]);
      else setWords(await getByFolder(folder));
    } catch (e) { toast.error((e as Error).message); } finally { setLoading(false); }
  };

  useEffect(() => { refreshFolders(); refreshWords("__all__"); }, []);
  useEffect(() => { refreshWords(selected); }, [selected]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return words;
    return words.filter((w) => w.lemma.toLowerCase().includes(q) || (w.translation_ru ?? "").toLowerCase().includes(q));
  }, [words, query]);

  const levelFolders = folders.filter((f) => isLevelFolder(f.name)).sort((a, b) => LEVEL_ORDER.indexOf(a.name) - LEVEL_ORDER.indexOf(b.name));
  const customFolders = folders.filter((f) => !isLevelFolder(f.name));
  const totalCount = folders.reduce((s, f) => s + f.count, 0);
  const folderNames = folders.map((f) => f.name);

  const onAdded = (w: VocabItem) => {
    setAdding(false);
    refreshFolders();
    if (selected === "__all__" || selected === w.folder) setWords((ws) => [w, ...ws.filter((x) => x.id !== w.id)]);
  };

  const onDeleted = (id: string) => {
    setWords((ws) => ws.filter((w) => w.id !== id));
    setDetail(null);
    refreshFolders();
  };

  const onUpdated = (w: VocabItem) => {
    setWords((ws) => ws.map((x) => (x.id === w.id ? w : x)));
    setDetail(w);
  };

  if (detail) {
    return <WordDetail item={detail} folders={folderNames} onBack={() => setDetail(null)} onDeleted={onDeleted} onUpdated={onUpdated} />;
  }

  return (
    <div className="grid lg:grid-cols-[220px_1fr] gap-4 h-full min-h-0">
      <aside className="overflow-y-auto space-y-4 pr-1 min-h-0">
        <button onClick={() => setSelected("__all__")}
          className={`w-full text-left rounded-xl px-3 py-2 text-sm flex items-center justify-between ${selected === "__all__" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
          <span>Все слова</span><span className="opacity-70">{totalCount}</span>
        </button>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-2 pb-1">По уровням</p>
          {levelFolders.map((f) => (
            <button key={f.name} onClick={() => setSelected(f.name)}
              className={`w-full text-left rounded-xl px-3 py-2 text-sm flex items-center justify-between ${selected === f.name ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              <span>{f.name}</span><span className="opacity-70">{f.known}/{f.count}</span>
            </button>
          ))}
          {!levelFolders.length && <p className="px-2 text-xs text-muted-foreground">Появятся по мере прохождения курса</p>}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-2 pb-1">Мои папки</p>
          {customFolders.map((f) => (
            <button key={f.name} onClick={() => setSelected(f.name)}
              className={`w-full text-left rounded-xl px-3 py-2 text-sm flex items-center gap-2 ${selected === f.name ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
              <FolderOpen className="h-3.5 w-3.5 shrink-0 opacity-70" />
              <span className="flex-1 truncate">{f.name}</span><span className="opacity-70">{f.count}</span>
            </button>
          ))}
          {!customFolders.length && <p className="px-2 text-xs text-muted-foreground">Пока нет — появятся, когда добавишь слово</p>}
        </div>
      </aside>

      <section className="flex flex-col min-h-0 gap-3">
        <div className="flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-border bg-card px-3 py-2">
            <Search className="h-4 w-4 text-muted-foreground shrink-0" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Искать в словаре…" className="w-full bg-transparent text-sm outline-none" />
          </div>
          <Button onClick={() => setAdding(!adding)} className="gap-1 shrink-0"><Plus className="h-4 w-4" />Слово</Button>
        </div>

        {adding && <AddWordForm folderOptions={folderNames.length ? folderNames : [DEFAULT_FOLDER]} defaultFolder={selected === "__all__" ? DEFAULT_FOLDER : selected} onAdded={onAdded} onClose={() => setAdding(false)} />}

        <div className="flex-1 overflow-y-auto min-h-0">
          {loading ? (
            <div className="h-full flex items-center justify-center text-muted-foreground gap-2"><Loader2 className="h-4 w-4 animate-spin" />Загружаю…</div>
          ) : !filtered.length ? (
            <div className="h-full flex items-center justify-center text-center text-muted-foreground text-sm px-4">
              {query ? "Ничего не нашлось" : "Пока пусто — слова появятся сами по ходу курса и чтения, либо добавь своё кнопкой «Слово»"}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pb-6">
              {filtered.map((w) => (
                <button key={w.id} onClick={() => setDetail(w)} className="text-left rounded-xl border border-border bg-card p-2 hover:border-primary/50 transition space-y-2">
                  <WordImage item={w} className="w-full aspect-[4/3]" />
                  <div>
                    <p className="text-sm font-medium truncate">
                      {w.article && <span className="text-sky-400">{w.article} </span>}{w.lemma}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{w.translation_ru || "—"}</p>
                  </div>
                  <span className={`inline-block h-1.5 w-1.5 rounded-full ${w.status === "known" ? "bg-emerald-400" : w.status === "learning" ? "bg-amber-400" : "bg-sky-400"}`} />
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function AddWordForm({ folderOptions, defaultFolder, onAdded, onClose }: { folderOptions: string[]; defaultFolder: string; onAdded: (w: VocabItem) => void; onClose: () => void }) {
  const [dir, setDir] = useState<"nl-ru" | "ru-nl">("nl-ru");
  const [query, setQuery] = useState("");
  const [nl, setNl] = useState("");
  const [article, setArticle] = useState("");
  const [ru, setRu] = useState("");
  const [de, setDe] = useState("");
  const [en, setEn] = useState("");
  const [example, setExample] = useState("");
  const [exampleRu, setExampleRu] = useState("");
  const [folder, setFolder] = useState(defaultFolder);
  const [customFolder, setCustomFolder] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saving, setSaving] = useState(false);

  const translate = async () => {
    if (!query.trim()) { toast.error("Сначала впиши слово сюда"); return; }
    setBusy(true);
    try {
      const res = await dutchAi<{ entries: GlossaryEntry[] }>({ action: "translate", query, direction: dir });
      const e = res.entries?.[0];
      if (!e) { toast.error("Ничего не нашлось"); return; }
      setNl(e.nl || ""); setArticle(e.article || ""); setRu(e.ru || ""); setDe(e.de || "");
      setEn((e as any).en || ""); setExample(e.example || ""); setExampleRu(e.example_ru || "");
    } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  };

  const save = async () => {
    if (!nl.trim()) { toast.error("Нужно хотя бы слово на nl — впиши вручную или через «Перевести»"); return; }
    setSaving(true);
    try {
      const finalFolder = (customFolder ? folder : folder).trim() || DEFAULT_FOLDER;
      const saved = await addManualWord({ nl: nl.trim(), article, ru, de, en, example, example_ru: exampleRu }, finalFolder);
      toast.success(`«${saved.lemma}» в словаре`);
      onAdded(saved);
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">Новое слово</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
      </div>

      <div className="flex gap-2 text-xs">
        <button onClick={() => setDir("nl-ru")} className={`rounded-full px-3 py-1 ${dir === "nl-ru" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>Печатаю на nl</button>
        <button onClick={() => setDir("ru-nl")} className={`rounded-full px-3 py-1 ${dir === "ru-nl" ? "bg-accent text-accent-foreground" : "text-muted-foreground"}`}>Печатаю по-русски</button>
      </div>

      <div className="flex gap-2">
        <Input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && translate()}
          placeholder={dir === "nl-ru" ? "Слово на nl…" : "Слово по-русски…"} />
        <Button type="button" variant="secondary" onClick={translate} disabled={busy} className="gap-1 shrink-0">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Перевести ИИ"}
        </Button>
      </div>

      <div className="grid sm:grid-cols-3 gap-2">
        <Input placeholder="de / het" value={article} onChange={(e) => setArticle(e.target.value)} />
        <Input placeholder="слово на nl" value={nl} onChange={(e) => setNl(e.target.value)} className="sm:col-span-1" />
        <Input placeholder="перевод (ru)" value={ru} onChange={(e) => setRu(e.target.value)} />
      </div>
      <Input placeholder="немецкая параллель (необязательно)" value={de} onChange={(e) => setDe(e.target.value)} />
      <Textarea placeholder="пример на nl (необязательно)" value={example} onChange={(e) => setExample(e.target.value)} rows={2} />

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground shrink-0">Папка:</span>
        {!customFolder ? (
          <select value={folder} onChange={(e) => (e.target.value === "__new__" ? setCustomFolder(true) : setFolder(e.target.value))}
            className="rounded-lg border border-border bg-background px-2 py-1 text-sm">
            {folderOptions.map((f) => <option key={f} value={f}>{f}</option>)}
            <option value="__new__">+ новая папка…</option>
          </select>
        ) : (
          <Input autoFocus className="h-8 w-48" placeholder="название папки" value={folder} onChange={(e) => setFolder(e.target.value)} />
        )}
      </div>

      <Button onClick={save} disabled={saving} className="gap-1">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Сохранить в словарь
      </Button>
    </div>
  );
}

function WordDetail({ item, folders, onBack, onDeleted, onUpdated }: { item: VocabItem; folders: string[]; onBack: () => void; onDeleted: (id: string) => void; onUpdated: (w: VocabItem) => void }) {
  const [edit, setEdit] = useState(false);
  const [ru, setRu] = useState(item.translation_ru ?? "");
  const [de, setDe] = useState(item.translation_de ?? "");
  const [article, setArticle] = useState(item.article ?? "");
  const [example, setExample] = useState(item.example ?? "");
  const [folder, setFolder] = useState(item.folder);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await updateWord(item.id, { translation_ru: ru, translation_de: de, article, example, folder });
      onUpdated({ ...item, translation_ru: ru, translation_de: de, article, example, folder });
      setEdit(false);
      toast.success("Сохранено");
    } catch (e) { toast.error((e as Error).message); } finally { setSaving(false); }
  };

  const remove = async () => {
    try { await deleteWord(item.id); onDeleted(item.id); toast.success("Слово удалено"); }
    catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="h-full overflow-y-auto min-h-0 max-w-xl mx-auto space-y-4 pb-6">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />К словарю</button>

      <div className="rounded-2xl border border-border bg-card p-4 space-y-4">
        <WordImage item={item} className="w-full aspect-video" />

        <div className="flex items-start gap-3">
          <div className="flex-1">
            <p className="text-2xl font-bold">{item.article && <span className="text-sky-400">{item.article} </span>}{item.lemma}</p>
            <p className={`text-xs mt-1 ${item.status === "known" ? "text-emerald-400" : "text-muted-foreground"}`}>
              {item.status === "known" ? "выучено" : `в повторении · интервал ${Math.round(item.interval_days)} дн. · попыток ${item.reps}`}
            </p>
          </div>
          <button onClick={() => speakWord(item.lemma)} className="text-muted-foreground hover:text-primary"><Volume2 className="h-5 w-5" /></button>
        </div>

        {!edit ? (
          <>
            <p className="text-lg">{item.translation_ru || "—"}</p>
            {item.translation_de && <p className="text-sm text-muted-foreground">🇩🇪 {item.translation_de}</p>}
            {item.example && <p className="text-sm italic text-muted-foreground border-t border-border pt-3">{item.example}{item.example_ru && <span className="not-italic"> — {item.example_ru}</span>}</p>}
            <p className="text-xs text-muted-foreground">Папка: {item.folder} · источник: {item.source}</p>
            <div className="flex gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setEdit(true)}>Изменить</Button>
              {!confirmDelete ? (
                <Button size="sm" variant="outline" onClick={() => setConfirmDelete(true)} className="gap-1 text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" />Удалить</Button>
              ) : (
                <>
                  <Button size="sm" variant="destructive" onClick={remove}>Точно удалить</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}>Отмена</Button>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <Input placeholder="de / het" value={article} onChange={(e) => setArticle(e.target.value)} />
              <Input placeholder="перевод (ru)" value={ru} onChange={(e) => setRu(e.target.value)} />
            </div>
            <Input placeholder="немецкая параллель" value={de} onChange={(e) => setDe(e.target.value)} />
            <Textarea placeholder="пример" value={example} onChange={(e) => setExample(e.target.value)} rows={2} />
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Папка:</span>
              <select value={folder} onChange={(e) => setFolder(e.target.value)} className="rounded-lg border border-border bg-background px-2 py-1 text-sm">
                {[...new Set([item.folder, ...folders])].map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={save} disabled={saving} className="gap-1">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}Сохранить</Button>
              <Button size="sm" variant="ghost" onClick={() => setEdit(false)}>Отмена</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
