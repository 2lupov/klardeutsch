import { useEffect, useState } from "react";
import { Sparkles, Trash2, Eye, Globe, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { listBooks, listPages, type Book, type BookPage } from "@/lib/books";
import {
  listInteractivePages,
  saveInteractivePage,
  deleteInteractivePage,
  BLOCK_LABEL,
  type InteractivePage,
} from "@/lib/interactivePages";
import InteractiveScene from "@/components/interactive/InteractiveScene";
import { Card } from "./_ui";

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

export default function InteractivePagesPage() {
  const [books, setBooks] = useState<Book[]>([]);
  const [bookId, setBookId] = useState<string>("");
  const [pages, setPages] = useState<BookPage[]>([]);
  const [pageId, setPageId] = useState<string>("");
  const [level, setLevel] = useState("A2");
  const [hint, setHint] = useState("");
  const [busy, setBusy] = useState(false);

  const [items, setItems] = useState<InteractivePage[]>([]);
  const [preview, setPreview] = useState<InteractivePage | null>(null);

  const load = async () => {
    try {
      setItems(await listInteractivePages());
    } catch (e: any) {
      toast.error(e.message || "Не вдалося завантажити сторінки");
    }
  };

  useEffect(() => {
    listBooks().then(setBooks).catch(() => {});
    load();
  }, []);

  useEffect(() => {
    if (!bookId) return setPages([]);
    listPages(bookId).then((p) => {
      setPages(p);
      setPageId(p[0]?.id ?? "");
    });
  }, [bookId]);

  const generate = async () => {
    if (!pageId) return toast.error("Виберіть сторінку підручника");
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-interactive-page", {
        body: { page_id: pageId, level, hint },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success(`Готово: ${(data as any).blocks} блоків`);
      setHint("");
      await load();
    } catch (e: any) {
      toast.error(e.message || "AI не змогла обробити сторінку");
    } finally {
      setBusy(false);
    }
  };

  const togglePublish = async (p: InteractivePage) => {
    const status = p.status === "published" ? "draft" : "published";
    try {
      await saveInteractivePage(p.id, { status });
      setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, status } : x)));
      toast.success(status === "published" ? "Опубліковано для учнів" : "Знято з публікації");
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const rename = async (p: InteractivePage, title: string) => {
    setItems((prev) => prev.map((x) => (x.id === p.id ? { ...x, title } : x)));
    try {
      await saveInteractivePage(p.id, { title });
    } catch {
      /* silent */
    }
  };

  const remove = async (p: InteractivePage) => {
    if (!confirm(`Видалити «${p.title}»?`)) return;
    try {
      await deleteInteractivePage(p.id);
      setItems((prev) => prev.filter((x) => x.id !== p.id));
      if (preview?.id === p.id) setPreview(null);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Інтерактивні сторінки</h1>
        <p className="mt-1 text-sm text-slate-500">
          AI перетворює фото сторінки енциклопедії на анімовану сторінку: орбіти, схеми з підписами, шкали, картки,
          лексика та мінітест. Текст залишається німецьким.
        </p>
      </div>

      <Card className="p-5 space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          <label className="text-sm">
            <span className="block mb-1 font-medium text-slate-700">Підручник</span>
            <select
              value={bookId}
              onChange={(e) => setBookId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">— виберіть —</option>
              {books.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.title}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="block mb-1 font-medium text-slate-700">Сторінка</span>
            <select
              value={pageId}
              onChange={(e) => setPageId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  Стор. {p.page_number ?? "?"}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="block mb-1 font-medium text-slate-700">Рівень</span>
            <div className="flex gap-1.5">
              {LEVELS.map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`px-3 py-2 rounded-xl text-xs font-semibold border ${
                    level === l ? "border-indigo-500 bg-indigo-50 text-indigo-700" : "border-slate-200 text-slate-600"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
          </label>
        </div>

        <label className="block text-sm">
          <span className="block mb-1 font-medium text-slate-700">Побажання до AI (необовʼязково)</span>
          <input
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            placeholder="напр. зроби акцент на порівнянні розмірів планет"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        </label>

        <button
          onClick={generate}
          disabled={busy || !pageId}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          Створити інтерактивну сторінку
        </button>
      </Card>

      <Card className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-semibold text-slate-900">Створені сторінки</h2>
          <button onClick={load} className="text-slate-500 hover:text-slate-900" title="Оновити">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm text-slate-500">Ще нічого не створено.</p>
        ) : (
          <div className="space-y-2">
            {items.map((p) => (
              <div key={p.id} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    value={p.title}
                    onChange={(e) => rename(p, e.target.value)}
                    className="flex-1 min-w-[180px] rounded-lg border border-transparent px-2 py-1 text-sm font-medium text-slate-900 hover:border-slate-200 focus:border-indigo-400 outline-none"
                  />
                  <span className="text-xs text-slate-500">{p.level || "—"}</span>
                  <span
                    className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                      p.status === "published" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {p.status === "published" ? "опубліковано" : "чернетка"}
                  </span>
                  <button
                    onClick={() => setPreview(preview?.id === p.id ? null : p)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700"
                  >
                    <Eye className="w-3.5 h-3.5" /> Перегляд
                  </button>
                  <button
                    onClick={() => togglePublish(p)}
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-700"
                  >
                    <Globe className="w-3.5 h-3.5" /> {p.status === "published" ? "Зняти" : "Опублікувати"}
                  </button>
                  <button onClick={() => remove(p)} className="p-1.5 text-slate-400 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {p.scene.map((b, i) => (
                    <span key={i} className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                      {BLOCK_LABEL[b.type]}
                    </span>
                  ))}
                </div>
                <p className="mt-1 text-[11px] text-slate-400">/interactive/{p.id}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {preview ? (
        <Card className="p-5">
          <h2 className="font-semibold text-slate-900 mb-3">Так це побачить учень</h2>
          <div className="dark rounded-2xl bg-[#0F172A] p-4">
            <InteractiveScene scene={preview.scene} />
          </div>
        </Card>
      ) : null}
    </div>
  );
}
