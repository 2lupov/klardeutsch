import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Search, Download, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

type Product = {
  id: string;
  internal_id: number | null;
  barcode: string | null;
  brand: string | null;
  category: string | null;
  name: string;
  description: string | null;
  price_uah: number | null;
  cost_uah: number | null;
  margin_pct: number | null;
  stock: number | null;
  weight_kg: number | null;
  supplier: string | null;
  received_at: string | null;
  expires_at: string | null;
  image_url: string | null;
};

const PAGE_SIZE = 50;

const ProductsEditor = () => {
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [q, setQ] = useState("");
  const [brand, setBrand] = useState<string>("");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [editing, setEditing] = useState<Product | null>(null);

  const load = async () => {
    setLoading(true);
    let query = supabase.from("products").select("*", { count: "exact" }).order("internal_id", { ascending: true });
    if (q) query = query.or(`name.ilike.%${q}%,barcode.ilike.%${q}%,category.ilike.%${q}%,brand.ilike.%${q}%`);
    if (brand) query = query.eq("category", brand);
    query = query.range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);
    const { data, count } = await query;
    setItems((data as Product[]) ?? []);
    setTotal(count ?? 0);
    setLoading(false);
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, brand, page]);

  const [brands, setBrands] = useState<string[]>([]);
  useEffect(() => {
    supabase.from("products").select("category").not("category", "is", null).then(({ data }) => {
      const set = new Set<string>();
      (data ?? []).forEach((r: any) => r.category && set.add(r.category));
      setBrands(Array.from(set).sort());
    });
  }, [importing]);

  const importSeed = async () => {
    if (!confirm("Імпортувати ~5000 товарів з PDF? Існуючі за internal_id будуть оновлені.")) return;
    setImporting(true);
    try {
      const res = await fetch("/products-seed.json");
      const seed: any[] = await res.json();
      toast.info(`Завантажено ${seed.length} товарів, імпортую...`);
      const chunkSize = 500;
      for (let i = 0; i < seed.length; i += chunkSize) {
        const chunk = seed.slice(i, i + chunkSize).map((r) => ({
          internal_id: r.internal_id,
          barcode: r.barcode,
          category: r.category,
          brand: r.category?.split(" ")[0] ?? null,
          name: r.name,
          price_uah: r.price_uah,
          weight_kg: r.weight_kg,
          stock: r.stock,
        }));
        const { error } = await supabase.from("products").upsert(chunk, { onConflict: "internal_id" });
        if (error) throw error;
      }
      toast.success(`Імпортовано ${seed.length} товарів!`);
      setPage(0);
      load();
    } catch (e: any) {
      toast.error("Помилка: " + e.message);
    } finally {
      setImporting(false);
    }
  };

  const addNew = () => {
    setEditing({
      id: "new",
      internal_id: null,
      barcode: "",
      brand: "",
      category: "",
      name: "",
      description: "",
      price_uah: 0,
      cost_uah: null,
      margin_pct: null,
      stock: 0,
      weight_kg: null,
      supplier: "",
      received_at: null,
      expires_at: null,
      image_url: null,
    });
  };

  const save = async () => {
    if (!editing || !editing.name) { toast.error("Назва обов'язкова"); return; }
    const payload: any = { ...editing };
    delete payload.id;
    if (editing.id === "new") {
      const { error } = await supabase.from("products").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Створено");
    } else {
      const { error } = await supabase.from("products").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Збережено");
    }
    setEditing(null);
    load();
  };

  const del = async (id: string) => {
    if (!confirm("Видалити товар?")) return;
    await supabase.from("products").delete().eq("id", id);
    toast.success("Видалено");
    load();
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2 flex-wrap">
        <button onClick={addNew} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium">
          <Plus className="w-4 h-4" /> Новий товар
        </button>
        <button onClick={importSeed} disabled={importing} className="flex items-center gap-1 px-3 py-2 rounded-lg bg-secondary text-secondary-foreground text-sm">
          {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          Імпорт з PDF ({importing ? "..." : "5038"})
        </button>
        <span className="text-xs text-muted-foreground self-center">Всього: {total}</span>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => { setPage(0); setQ(e.target.value); }}
            placeholder="Пошук (назва, штрихкод, бренд)"
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-secondary border border-border text-sm"
          />
        </div>
        <select value={brand} onChange={(e) => { setPage(0); setBrand(e.target.value); }} className="px-3 py-2 rounded-lg bg-secondary border border-border text-sm">
          <option value="">Усі категорії</option>
          {brands.map((b) => <option key={b} value={b}>{b}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground text-sm">
          Товарів немає. Натисніть "Імпорт з PDF" щоб завантажити інвентар.
        </div>
      ) : (
        <div className="flex flex-col gap-1.5">
          {items.map((p) => (
            <div key={p.id} className="glass-card p-3 flex items-center gap-3 hover:border-primary/30 transition-colors">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-mono">#{p.internal_id}</span>
                  {p.barcode && <span className="font-mono">· {p.barcode}</span>}
                  {p.category && <span>· {p.category}</span>}
                </div>
                <div className="text-sm font-medium truncate">{p.name}</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold">{p.price_uah?.toFixed(0) ?? "—"} ₴</div>
                <div className="text-[10px] text-muted-foreground">stock: {p.stock ?? 0}</div>
              </div>
              <button onClick={() => setEditing(p)} className="p-1.5 text-primary hover:bg-primary/10 rounded">
                <Save className="w-4 h-4" />
              </button>
              <button onClick={() => del(p.id)} className="p-1.5 text-destructive hover:bg-destructive/10 rounded">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="px-3 py-1 rounded bg-secondary text-sm disabled:opacity-50">←</button>
          <span className="text-xs text-muted-foreground">{page + 1} / {totalPages}</span>
          <button onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))} disabled={page >= totalPages - 1} className="px-3 py-1 rounded bg-secondary text-sm disabled:opacity-50">→</button>
        </div>
      )}

      {editing && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-2 sm:p-4" onClick={() => setEditing(null)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-background border border-border rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-5 flex flex-col gap-3">
            <h3 className="text-lg font-display font-bold">{editing.id === "new" ? "Новий товар" : `Редагувати #${editing.internal_id ?? ""}`}</h3>
            <div className="grid grid-cols-2 gap-2">
              <Field label="ID" type="number" value={editing.internal_id ?? ""} onChange={(v) => setEditing({ ...editing, internal_id: v ? +v : null })} />
              <Field label="Штрихкод" value={editing.barcode ?? ""} onChange={(v) => setEditing({ ...editing, barcode: v })} />
              <Field label="Бренд" value={editing.brand ?? ""} onChange={(v) => setEditing({ ...editing, brand: v })} />
              <Field label="Категорія" value={editing.category ?? ""} onChange={(v) => setEditing({ ...editing, category: v })} />
            </div>
            <Field label="Назва *" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
            <Field label="Опис" value={editing.description ?? ""} onChange={(v) => setEditing({ ...editing, description: v })} textarea />
            <div className="grid grid-cols-3 gap-2">
              <Field label="Ціна (₴)" type="number" value={editing.price_uah ?? ""} onChange={(v) => setEditing({ ...editing, price_uah: v ? +v : null })} />
              <Field label="Собівартість" type="number" value={editing.cost_uah ?? ""} onChange={(v) => setEditing({ ...editing, cost_uah: v ? +v : null })} />
              <Field label="Маржа %" type="number" value={editing.margin_pct ?? ""} onChange={(v) => setEditing({ ...editing, margin_pct: v ? +v : null })} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="К-сть" type="number" value={editing.stock ?? ""} onChange={(v) => setEditing({ ...editing, stock: v ? +v : 0 })} />
              <Field label="Вага (кг)" type="number" value={editing.weight_kg ?? ""} onChange={(v) => setEditing({ ...editing, weight_kg: v ? +v : null })} />
            </div>
            <Field label="Постачальник" value={editing.supplier ?? ""} onChange={(v) => setEditing({ ...editing, supplier: v })} />
            <div className="grid grid-cols-2 gap-2">
              <Field label="Надходження" type="date" value={editing.received_at ?? ""} onChange={(v) => setEditing({ ...editing, received_at: v || null })} />
              <Field label="Термін придатності" type="date" value={editing.expires_at ?? ""} onChange={(v) => setEditing({ ...editing, expires_at: v || null })} />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={save} className="flex-1 py-2 rounded-lg bg-primary text-primary-foreground font-medium text-sm">Зберегти</button>
              <button onClick={() => setEditing(null)} className="flex-1 py-2 rounded-lg bg-secondary text-sm">Скасувати</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Field = ({ label, value, onChange, type = "text", textarea = false }: any) => (
  <label className="flex flex-col gap-1 text-xs text-muted-foreground">
    <span>{label}</span>
    {textarea ? (
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={2} className="px-2 py-1.5 rounded bg-secondary border border-border text-sm text-foreground" />
    ) : (
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} className="px-2 py-1.5 rounded bg-secondary border border-border text-sm text-foreground" />
    )}
  </label>
);

export default ProductsEditor;
