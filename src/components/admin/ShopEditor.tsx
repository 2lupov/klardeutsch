import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plus, Trash2 } from "lucide-react";

const ShopEditor = () => {
  const { t } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from("shop_items").select("*").order("created_at");
    setItems(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const addItem = async () => {
    await supabase.from("shop_items").insert([{
      title: "Новый товар",
      description: "Описание",
      price: 100,
      item_type: "task",
    }]);
    load();
  };

  const updateItem = async (id: string, field: string, value: any) => {
    await supabase.from("shop_items").update({ [field]: value }).eq("id", id);
  };

  const deleteItem = async (id: string) => {
    await supabase.from("shop_items").delete().eq("id", id);
    load();
  };

  if (loading) return <p className="text-muted-foreground">{t("loading")}</p>;

  return (
    <div className="flex flex-col gap-3">
      {items.map((item) => (
        <div key={item.id} className="glass-card p-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              defaultValue={item.title}
              onBlur={(e) => updateItem(item.id, "title", e.target.value)}
              placeholder={t("title")}
              className="flex-1 px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none"
            />
            <input
              type="number"
              defaultValue={item.price}
              onBlur={(e) => updateItem(item.id, "price", parseInt(e.target.value) || 0)}
              placeholder={t("shopPrice")}
              className="w-24 px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <textarea
            defaultValue={item.description ?? ""}
            onBlur={(e) => updateItem(item.id, "description", e.target.value || null)}
            placeholder={t("shopDescription")}
            rows={2}
            className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none resize-y"
          />
          <textarea
            defaultValue={item.content ?? ""}
            onBlur={(e) => updateItem(item.id, "content", e.target.value || null)}
            placeholder={t("shopContent")}
            rows={3}
            className="w-full px-3 py-2 rounded-lg bg-secondary text-foreground border border-border text-sm focus:border-primary focus:outline-none resize-y"
          />
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                defaultChecked={item.available}
                onChange={(e) => updateItem(item.id, "available", e.target.checked)}
                className="accent-primary"
              />
              {t("shopAvailable")}
            </label>
            <button onClick={() => deleteItem(item.id)} className="p-2 text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
      <button onClick={addItem} className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-all">
        <Plus className="w-4 h-4" /> {t("shopAddItem")}
      </button>
    </div>
  );
};

export default ShopEditor;
