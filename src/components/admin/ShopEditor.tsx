import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Plus, Trash2, ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const ShopEditor = () => {
  const { t } = useLanguage();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

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
    // Also delete image if exists
    const item = items.find(i => i.id === id);
    if (item?.image_url) {
      const path = item.image_url.split("/shop-images/")[1];
      if (path) await supabase.storage.from("shop-images").remove([path]);
    }
    await supabase.from("shop_items").delete().eq("id", id);
    load();
  };

  const uploadImage = async (id: string, file: File) => {
    setUploading(id);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${id}.${ext}`;

      // Remove old image if exists
      await supabase.storage.from("shop-images").remove([filePath]);

      const { error: uploadError } = await supabase.storage
        .from("shop-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("shop-images")
        .getPublicUrl(filePath);

      const imageUrl = urlData.publicUrl + "?t=" + Date.now();
      await supabase.from("shop_items").update({ image_url: imageUrl }).eq("id", id);
      
      setItems(prev => prev.map(item => 
        item.id === id ? { ...item, image_url: imageUrl } : item
      ));
      
      toast.success("Фото загружено!");
    } catch (err: any) {
      toast.error("Ошибка загрузки: " + err.message);
    }
    setUploading(null);
  };

  const removeImage = async (id: string, imageUrl: string) => {
    const path = imageUrl.split("/shop-images/")[1]?.split("?")[0];
    if (path) {
      await supabase.storage.from("shop-images").remove([path]);
    }
    await supabase.from("shop_items").update({ image_url: null }).eq("id", id);
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, image_url: null } : item
    ));
    toast.success("Фото удалено");
  };

  if (loading) return <p className="text-muted-foreground">{t("loading")}</p>;

  return (
    <div className="flex flex-col gap-3" onFocus={(e) => { const t = e.target as HTMLElement; if (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA') (t as HTMLInputElement).select(); }}>
      {items.map((item) => (
        <div key={item.id} className="glass-card p-4 flex flex-col gap-2">
          {/* Image section */}
          <div className="flex gap-3 items-start">
            <div className="relative w-20 h-20 rounded-lg bg-secondary border border-border flex-shrink-0 overflow-hidden group">
              {item.image_url ? (
                <>
                  <img 
                    src={item.image_url} 
                    alt={item.title} 
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={() => removeImage(item.id, item.image_url)}
                    className="absolute top-0.5 right-0.5 p-0.5 rounded-full bg-destructive/80 text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <label className="w-full h-full flex flex-col items-center justify-center cursor-pointer text-muted-foreground hover:text-primary transition-colors">
                  {uploading === item.id ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      <ImagePlus className="w-5 h-5" />
                      <span className="text-[9px] mt-0.5">Фото</span>
                    </>
                  )}
                  <input 
                    type="file" 
                    className="hidden" 
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadImage(item.id, file);
                    }}
                  />
                </label>
              )}
            </div>

            <div className="flex-1 flex flex-col gap-2">
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
            </div>
          </div>

          {/* Change photo button if image exists */}
          {item.image_url && (
            <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary cursor-pointer transition-colors self-start">
              <ImagePlus className="w-3 h-3" />
              Заменить фото
              <input 
                type="file" 
                className="hidden" 
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(item.id, file);
                }}
              />
            </label>
          )}

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
