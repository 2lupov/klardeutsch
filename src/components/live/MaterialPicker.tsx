import { useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { addLiveItem, LiveItem, LiveSection } from "@/lib/live-class";
import {
  MATERIAL_CATEGORIES,
  MATERIAL_LEVELS,
  MaterialFolder,
  MaterialItem,
  MaterialKind,
  fetchFolders,
  materialPreview,
  searchItems,
  kindLabel,
} from "@/lib/materials";
import { Search, X, Check, FolderOpen } from "lucide-react";

const kindsForSection = (section: LiveSection): MaterialKind[] =>
  section === "vocab" ? ["word"] :
  section === "listening" ? ["audio", "question", "text"] :
  section === "tasks" ? ["question", "text"] : ["text", "question"];

export default function MaterialPicker({
  classId,
  section,
  onAdded,
  onClose,
}: {
  classId: string;
  section: LiveSection;
  onAdded: (items: LiveItem[]) => void;
  onClose: () => void;
}) {
  const [folders, setFolders] = useState<MaterialFolder[]>([]);
  const [folderId, setFolderId] = useState<string | null>(null);
  const [level, setLevel] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [items, setItems] = useState<MaterialItem[]>([]);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const allowedKinds = useMemo(() => kindsForSection(section), [section]);

  useEffect(() => {
    fetchFolders().then(setFolders).catch(() => {});
  }, []);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const res = await searchItems({ query: q, folderId, level, kinds: allowedKinds, limit: 150 });
        if (!cancel) setItems(res);
      } catch (e: any) {
        if (!cancel) toast({ title: "Помилка пошуку", description: e.message, variant: "destructive" });
      } finally {
        if (!cancel) setLoading(false);
      }
    }, 250);
    return () => { cancel = true; clearTimeout(t); };
  }, [q, folderId, level, allowedKinds]);

  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  const addSelected = async () => {
    if (!selectedIds.length) return;
    setBusy(true);
    try {
      const added: LiveItem[] = [];
      for (const id of selectedIds) {
        const m = items.find((i) => i.id === id);
        if (!m) continue;
        const it = await addLiveItem(classId, section, m.kind, m.title, m.content);
        added.push(it);
      }
      onAdded(added);
      toast({ title: `Додано ${added.length} — учень уже бачить` });
      setSelected({});
      onClose();
    } catch (e: any) {
      toast({ title: "Помилка", description: e.message, variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[88vh] flex flex-col overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Додати з банку матеріалів</h3>
            <p className="text-xs text-slate-500">Знайдіть готове й додайте в урок одним кліком</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-3 space-y-3 border-b border-slate-100">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Пошук: Prüfung, Perfekt, медицина…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFolderId(null)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border ${!folderId ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"}`}
            >
              Усі папки
            </button>
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => setFolderId(f.id === folderId ? null : f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border flex items-center gap-1 ${f.id === folderId ? "border-indigo-300 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"}`}
              >
                <span>{MATERIAL_CATEGORIES.find((c) => c.key === f.category)?.icon}</span>
                {f.name}
                {f.level && <span className="text-slate-400">{f.level}</span>}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {MATERIAL_LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l === level ? null : l)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-medium border ${l === level ? "border-slate-800 bg-slate-900 text-white" : "border-slate-200 text-slate-500"}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {loading ? (
            <p className="text-sm text-slate-400 animate-pulse">Пошук…</p>
          ) : items.length === 0 ? (
            <div className="text-center py-10 text-slate-500 text-sm">
              <FolderOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
              Нічого не знайдено. Створіть матеріали в розділі «Банк матеріалів».
            </div>
          ) : (
            items.map((m) => {
              const on = !!selected[m.id];
              return (
                <button
                  key={m.id}
                  onClick={() => setSelected((p) => ({ ...p, [m.id]: !p[m.id] }))}
                  className={`w-full text-left p-3 rounded-xl border flex gap-3 items-start ${on ? "border-indigo-400 bg-indigo-50/60" : "border-slate-200 hover:bg-slate-50"}`}
                >
                  <span className={`mt-0.5 w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${on ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-300"}`}>
                    {on && <Check className="w-3.5 h-3.5" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-900 truncate">
                      {m.title || materialPreview(m).slice(0, 70) || kindLabel(m.kind)}
                    </span>
                    <span className="block text-xs text-slate-500 line-clamp-2">{materialPreview(m)}</span>
                    <span className="mt-1 inline-flex gap-2 text-[10px] text-slate-400">
                      <span>{kindLabel(m.kind)}</span>
                      {m.level && <span>{m.level}</span>}
                      <span>{folders.find((f) => f.id === m.folder_id)?.name}</span>
                    </span>
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-xs text-slate-500">Вибрано: {selectedIds.length}</span>
          <button
            disabled={!selectedIds.length || busy}
            onClick={addSelected}
            className="px-4 py-2 rounded-xl text-white text-sm font-medium disabled:opacity-50"
            style={{ background: "#4F46E5" }}
          >
            {busy ? "Додаю…" : "Додати в урок"}
          </button>
        </div>
      </div>
    </div>
  );
}
