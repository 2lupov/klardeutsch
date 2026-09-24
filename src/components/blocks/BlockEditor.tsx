import { useRef, useState } from "react";
import { Loader2, Upload, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { Artikel, BlockPayload, LessonBlock } from "./types";
import { MODEL_KEYS, modelLabel, modelParts } from "./InteractiveModel";

interface Props {
  block: LessonBlock;
  onChange: (patch: Partial<LessonBlock>) => void;
}

const line = (v: unknown) => String(v ?? "");

/** Редактор блока: текст завдання, ключі, синоніми, підказки. */
export default function BlockEditor({ block, onChange }: Props) {
  const p: BlockPayload = block.payload || {};
  const [uploading, setUploading] = useState(false);
  const [voicing, setVoicing] = useState(false);
  const fileRef = useRef<HTMLInputElement | null>(null);

  const setPayload = (patch: Partial<BlockPayload>) => onChange({ payload: { ...p, ...patch } });

  const uploadAudio = async (file: File) => {
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "mp3";
      const path = block.source === "kit" ? `kits/${block.lesson_id}/audio-${crypto.randomUUID()}.${ext}` : `audio/${block.lesson_id}/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from("tutoring-materials").upload(path, file, { upsert: true });
      if (error) throw error;
      setPayload({ audio_path: path });
      toast({ title: "Аудіо завантажено" });
    } catch (e: any) {
      toast({ title: "Не вдалося завантажити аудіо", description: e?.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const voiceBlock = async () => {
    setVoicing(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-lesson-audio", { body: { block_id: block.id } });
      if (error) throw error;
      if (data?.audio_path) setPayload({ audio_path: data.audio_path });
      toast({ title: "Озвучено", description: "Аудіо додано до блока." });
    } catch (e: any) {
      toast({ title: "Не вдалося озвучити", description: e?.message, variant: "destructive" });
    } finally {
      setVoicing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <Label className="text-xs">Назва блока</Label>
          <Input value={line(block.title)} onChange={(e) => onChange({ title: e.target.value })} />
        </div>
        <div className="flex items-end gap-2 pb-1">
          <Switch checked={block.visible_to_student} onCheckedChange={(v) => onChange({ visible_to_student: v })} />
          <span className="text-xs text-muted-foreground">Видно учню</span>
        </div>
      </div>

      <div>
        <Label className="text-xs">Інструкція</Label>
        <Textarea rows={2} value={line(p.instructions)} onChange={(e) => setPayload({ instructions: e.target.value })} />
      </div>

      {block.type === "topic" && <div className="space-y-3">
        <Field label="Номер параграфа (наприклад §6)" value={p.chapter} onChange={(v) => setPayload({ chapter: v })} />
        <Field label="Підзаголовок" value={p.subtitle} onChange={(v) => setPayload({ subtitle: v })} />
        <label className="block space-y-1"><Label className="text-xs">Вступне правило</Label><Textarea rows={4} value={line(p.intro)} onChange={(e) => setPayload({ intro: e.target.value })} /></label>
      </div>}

      {block.type === "table" && <div className="space-y-3">
        <p className="text-xs text-muted-foreground">Позначте закінчення **двома зірочками** для підсвічування.</p>
        <div className="space-y-2"><Label className="text-xs">Колонки</Label>{(p.columns ?? []).map((col, i) => <div key={i} className="flex gap-2"><Input aria-label={`Колонка ${i + 1}`} value={col} onChange={(e) => setPayload({ columns: (p.columns ?? []).map((x, j) => j === i ? e.target.value : x) })} /><Button size="sm" variant="outline" onClick={() => setPayload({ columns: (p.columns ?? []).filter((_, j) => j !== i), rows: (p.rows ?? []).map((r) => r.filter((_, j) => j !== i)) })}>−</Button></div>)}<Button size="sm" variant="outline" onClick={() => setPayload({ columns: [...(p.columns ?? []), "Нова колонка"] })}>+ Колонка</Button></div>
        <div className="space-y-2"><Label className="text-xs">Рядки</Label>{(p.rows ?? []).map((row, i) => <div key={i} className="flex items-start gap-2"><span className="pt-2 text-xs text-muted-foreground">{i + 1}</span><div className="grid flex-1 gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, p.columns?.length ?? 1)}, minmax(80px, 1fr))` }}>{(p.columns ?? []).map((_, j) => <Input key={j} aria-label={`Рядок ${i + 1}, колонка ${j + 1}`} value={row[j] ?? ""} onChange={(e) => setPayload({ rows: (p.rows ?? []).map((r, ri) => ri === i ? (p.columns ?? []).map((_, ci) => ci === j ? e.target.value : r[ci] ?? "") : r) })} />)}</div><Button size="sm" variant="outline" onClick={() => setPayload({ rows: (p.rows ?? []).filter((_, ri) => ri !== i) })}>−</Button></div>)}<Button size="sm" variant="outline" onClick={() => setPayload({ rows: [...(p.rows ?? []), (p.columns ?? []).map(() => "")] })}>+ Рядок</Button></div>
        <Field label="Підпис таблиці" value={p.caption} onChange={(v) => setPayload({ caption: v })} />
      </div>}

      {block.type === "callout" && <div className="space-y-3"><label className="block space-y-1"><Label className="text-xs">Тип примітки</Label><select className="w-full rounded-md border p-2 text-sm" value={p.tone ?? "note"} onChange={(e) => setPayload({ tone: e.target.value as BlockPayload["tone"] })}><option value="note">Правило</option><option value="example">Приклад</option><option value="warning">Зверніть увагу</option></select></label><label className="block space-y-1"><Label className="text-xs">Текст (виділення **слова**)</Label><Textarea rows={5} value={line(p.markdown)} onChange={(e) => setPayload({ markdown: e.target.value })} /></label></div>}

      {block.type === "image" && <div className="space-y-3"><Field label="URL зображення (фото зі сторінки, без ШІ-підміни)" value={p.image_path} onChange={(v) => setPayload({ image_path: v })} /><label className="block space-y-1 text-xs">Або завантажити власне фото<input type="file" accept="image/jpeg,image/png,image/webp" className="w-full text-xs" disabled={uploading || block.lesson_id === "draft"} onChange={async (e) => { const file = e.target.files?.[0]; if (!file) return; if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) return toast({ title: "Потрібне зображення до 8 МБ", variant: "destructive" }); setUploading(true); try { const path = `kits/${block.lesson_id}/image-${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase() || "jpg"}`; const { error } = await supabase.storage.from("tutoring-materials").upload(path, file, { contentType: file.type }); if (error) throw error; setPayload({ image_path: path }); toast({ title: "Фото додано; збережіть урок" }); } catch (err: any) { toast({ title: "Фото не завантажено", description: err.message, variant: "destructive" }); } finally { setUploading(false); e.target.value = ""; } }} />{block.lesson_id === "draft" && <span className="text-muted-foreground">Спершу збережіть урок, тоді завантажте фото.</span>}</label><Field label="Підпис" value={p.caption} onChange={(v) => setPayload({ caption: v })} /><Field label="Контекст / сторінка джерела" value={p.context} onChange={(v) => setPayload({ context: v })} /></div>}

      {block.type === "artikel" && <div className="space-y-2"><Label className="text-xs">Слова та правильні артиклі</Label>{(p.article_items ?? []).map((item, i) => <div key={i} className="flex flex-wrap gap-2"><Input className="min-w-28 flex-1" aria-label={`Слово ${i + 1}`} value={item.word} onChange={(e) => setPayload({ article_items: (p.article_items ?? []).map((x, j) => j === i ? { ...x, word: e.target.value } : x) })} /><select aria-label={`Артикль ${i + 1}`} className="rounded-md border px-2" value={item.article} onChange={(e) => setPayload({ article_items: (p.article_items ?? []).map((x, j) => j === i ? { ...x, article: e.target.value as Artikel } : x) })}>{["der", "die", "das", "plural"].map((a) => <option key={a} value={a}>{a}</option>)}</select><Button size="sm" variant="outline" onClick={() => setPayload({ article_items: (p.article_items ?? []).filter((_, j) => j !== i) })}>−</Button></div>)}<Button size="sm" variant="outline" onClick={() => setPayload({ article_items: [...(p.article_items ?? []), { word: "", article: "der" }] })}>+ Слово</Button></div>}

      {block.type === "transformation" && <div className="space-y-3"><p className="text-xs font-semibold">Зразок</p><div className="grid gap-2 sm:grid-cols-2"><Field label="Початкове речення" value={p.example?.source} onChange={(v) => setPayload({ example: { source: v, answer: p.example?.answer ?? "" } })} /><Field label="Перетворення" value={p.example?.answer} onChange={(v) => setPayload({ example: { source: p.example?.source ?? "", answer: v } })} /></div><p className="text-xs font-semibold">Завдання</p>{(p.transformations ?? []).map((item, i) => <div key={i} className="flex items-end gap-2"><div className="grid flex-1 gap-2 sm:grid-cols-2"><Field label={`Речення ${i + 1}`} value={item.source} onChange={(v) => setPayload({ transformations: (p.transformations ?? []).map((x, j) => j === i ? { ...x, source: v } : x) })} /><Field label="Правильна відповідь" value={item.answer} onChange={(v) => setPayload({ transformations: (p.transformations ?? []).map((x, j) => j === i ? { ...x, answer: v } : x) })} /></div><Button size="sm" variant="outline" onClick={() => setPayload({ transformations: (p.transformations ?? []).filter((_, j) => j !== i) })}>−</Button></div>)}<Button size="sm" variant="outline" onClick={() => setPayload({ transformations: [...(p.transformations ?? []), { source: "", answer: "" }] })}>+ Речення</Button></div>}

      {block.type === "modell" && <div className="space-y-3">
        <label className="block space-y-1"><Label className="text-xs">Модель</Label><select className="w-full rounded-md border p-2 text-sm" value={p.model ?? "auge"} onChange={(e) => setPayload({ model: e.target.value, parts: e.target.value === "custom" ? (p.parts ?? []) : [] })}>{MODEL_KEYS.map((k) => <option key={k} value={k}>{modelLabel(k)}</option>)}<option value="custom">Власний SVG-код</option></select></label>
        {p.model !== "custom" && <Button size="sm" variant="outline" onClick={() => setPayload({ parts: modelParts(p.model ?? "auge") })}>Завантажити частини для редагування</Button>}
        {p.model === "custom" && <label className="block space-y-1"><Label className="text-xs">SVG-код (кожна клікабельна частина має data-part="id")</Label><Textarea rows={6} value={line(p.svg)} onChange={(e) => setPayload({ svg: e.target.value })} placeholder='<svg viewBox="0 0 400 300">...<path data-part="iris" .../></svg>' /></label>}
        <div className="space-y-2"><Label className="text-xs">Частини моделі</Label>{(p.parts ?? []).map((part, i) => <div key={i} className="space-y-1 rounded-md border p-2">
          <div className="flex gap-2"><Input aria-label={`ID частини ${i + 1}`} className="w-28" placeholder="data-part" value={part.id} onChange={(e) => setPayload({ parts: (p.parts ?? []).map((x, j) => j === i ? { ...x, id: e.target.value } : x) })} /><Input aria-label={`Назва ${i + 1}`} placeholder="Netzhaut" value={part.label} onChange={(e) => setPayload({ parts: (p.parts ?? []).map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} /><select aria-label={`Артикль ${i + 1}`} className="rounded-md border px-2 text-sm" value={part.article ?? "die"} onChange={(e) => setPayload({ parts: (p.parts ?? []).map((x, j) => j === i ? { ...x, article: e.target.value as Artikel } : x) })}>{["der", "die", "das", "plural"].map((a) => <option key={a} value={a}>{a}</option>)}</select><Button size="sm" variant="outline" onClick={() => setPayload({ parts: (p.parts ?? []).filter((_, j) => j !== i) })}>−</Button></div>
          <Textarea rows={2} aria-label={`Пояснення ${i + 1}`} placeholder="Коротке пояснення" value={line(part.text)} onChange={(e) => setPayload({ parts: (p.parts ?? []).map((x, j) => j === i ? { ...x, text: e.target.value } : x) })} />
        </div>)}<Button size="sm" variant="outline" onClick={() => setPayload({ parts: [...(p.parts ?? []), { id: "", label: "", article: "die", text: "" }] })}>+ Частина</Button></div>
        <p className="text-xs text-muted-foreground">Якщо список частин порожній, беруться стандартні частини вибраної моделі.</p>
      </div>}

      {block.type === "theorie" && (
        <>
          <div>
            <Label className="text-xs">Теорія (Markdown: ## заголовок, **жирне**, - список)</Label>
            <Textarea rows={8} value={line(p.markdown)} onChange={(e) => setPayload({ markdown: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Приклади — рядок: німецькою | переклад</Label>
            <Textarea
              rows={4}
              value={(p.examples ?? []).map((x) => `${x.de} | ${x.uk ?? ""}`).join("\n")}
              onChange={(e) =>
                setPayload({
                  examples: e.target.value
                    .split("\n")
                    .filter((l) => l.trim())
                    .map((l) => {
                      const [de, uk] = l.split("|").map((x) => x.trim());
                      return { de: de ?? "", uk: uk || null };
                    }),
                })
              }
            />
          </div>
        </>
      )}

      {block.type === "hoer" && (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="audio/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && uploadAudio(e.target.files[0])}
            />
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading || block.lesson_id === "draft"}>
              {uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
              Завантажити аудіо
            </Button>
            {block.source !== "kit" && <Button size="sm" variant="outline" onClick={voiceBlock} disabled={voicing || block.lesson_id === "draft"}>
              {voicing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Volume2 className="mr-1 h-4 w-4" />}
              Озвучити блок
            </Button>}
            {p.audio_path && <span className="text-xs text-muted-foreground">✓ аудіо є</span>}
            {block.lesson_id === "draft" && <span className="text-xs text-muted-foreground">Спершу збережіть урок.</span>}
          </div>
          <div>
            <Label className="text-xs">Транскрипт — рядок: секунда | німецькою | переклад</Label>
            <Textarea
              rows={6}
              value={(p.transcript ?? []).map((t) => `${t.t ?? ""} | ${t.de} | ${t.uk ?? ""}`).join("\n")}
              onChange={(e) =>
                setPayload({
                  transcript: e.target.value
                    .split("\n")
                    .filter((l) => l.trim())
                    .map((l) => {
                      const [t, de, uk] = l.split("|").map((x) => x.trim());
                      return { t: t === "" ? null : Number(t), de: de ?? "", uk: uk || null };
                    }),
                })
              }
            />
          </div>
        </>
      )}

      {block.type === "lesen" && (
        <>
          <div>
            <Label className="text-xs">Текст</Label>
            <Textarea rows={6} value={line(p.text)} onChange={(e) => setPayload({ text: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Лексика — рядок: слово | переклад | der/die/das/plural | Plural</Label>
            <Textarea
              rows={6}
              value={(p.words ?? []).map((w) => `${w.de} | ${w.uk} | ${w.artikel ?? ""} | ${w.plural ?? ""}`).join("\n")}
              onChange={(e) =>
                setPayload({
                  words: e.target.value
                    .split("\n")
                    .filter((l) => l.trim())
                    .map((l) => {
                      const [de, uk, art, plural] = l.split("|").map((x) => x.trim());
                      return { de: de ?? "", uk: uk ?? "", artikel: (art || null) as Artikel | null, plural: plural || null };
                    }),
                })
              }
            />
          </div>
        </>
      )}

      {block.type === "luecke" && (
        <>
          <div className="flex items-center gap-2">
            <Switch checked={(p.mode ?? "select") === "input"} onCheckedChange={(v) => setPayload({ mode: v ? "input" : "select" })} />
            <span className="text-xs text-muted-foreground">Ручний ввід замість вибору з 4 варіантів</span>
          </div>
          <div>
            <Label className="text-xs">Рядок: речення з ___ | відповідь | варіанти через кому | синоніми через кому | підказка</Label>
            <Textarea
              rows={7}
              value={(p.items ?? [])
                .map((it) => `${it.sentence} | ${it.answer} | ${(it.options ?? []).join(", ")} | ${(it.synonyms ?? []).join(", ")} | ${it.hint ?? ""}`)
                .join("\n")}
              onChange={(e) =>
                setPayload({
                  items: e.target.value
                    .split("\n")
                    .filter((l) => l.trim())
                    .map((l) => {
                      const [sentence, answer, options, synonyms, hint] = l.split("|").map((x) => x.trim());
                      return {
                        sentence: sentence ?? "",
                        answer: answer ?? "",
                        options: options ? options.split(",").map((x) => x.trim()).filter(Boolean) : [],
                        synonyms: synonyms ? synonyms.split(",").map((x) => x.trim()).filter(Boolean) : [],
                        hint: hint || null,
                      };
                    }),
                })
              }
            />
          </div>
        </>
      )}

      {block.type === "paare" && (
        <div>
          <Label className="text-xs">Пари — рядок: ліве | праве</Label>
          <Textarea
            rows={6}
            value={(p.pairs ?? []).map((x) => `${x.left} | ${x.right}`).join("\n")}
            onChange={(e) =>
              setPayload({
                pairs: e.target.value
                  .split("\n")
                  .filter((l) => l.trim())
                  .map((l) => {
                    const [left, right] = l.split("|").map((x) => x.trim());
                    return { left: left ?? "", right: right ?? "" };
                  }),
              })
            }
          />
        </div>
      )}

      {block.type === "satzbau" && (
        <div>
          <Label className="text-xs">Рядок: правильне речення | підказка</Label>
          <Textarea
            rows={6}
            value={(p.sentences ?? []).map((s) => `${s.words.join(" ")} | ${s.hint ?? ""}`).join("\n")}
            onChange={(e) =>
              setPayload({
                sentences: e.target.value
                  .split("\n")
                  .filter((l) => l.trim())
                  .map((l) => {
                    const [sentence, hint] = l.split("|").map((x) => x.trim());
                    return { words: (sentence ?? "").split(/\s+/).filter(Boolean), hint: hint || null };
                  }),
              })
            }
          />
        </div>
      )}

      {block.type === "schreiben" && (
        <>
          <div>
            <Label className="text-xs">Завдання</Label>
            <Textarea rows={2} value={line(p.prompt)} onChange={(e) => setPayload({ prompt: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Redemittel — по одному в рядку</Label>
            <Textarea
              rows={4}
              value={(p.redemittel ?? []).join("\n")}
              onChange={(e) => setPayload({ redemittel: e.target.value.split("\n").filter((l) => l.trim()) })}
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <Label className="text-xs">Мінімум слів</Label>
              <Input
                type="number"
                className="w-24"
                value={p.min_words ?? 20}
                onChange={(e) => setPayload({ min_words: Number(e.target.value) || 0 })}
              />
            </div>
            <div className="flex items-center gap-2 pt-4">
              <Switch checked={p.allow_voice !== false} onCheckedChange={(v) => setPayload({ allow_voice: v })} />
              <span className="text-xs text-muted-foreground">Дозволити голосову відповідь</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  return <label className="block space-y-1"><Label className="text-xs">{label}</Label><Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>;
}
