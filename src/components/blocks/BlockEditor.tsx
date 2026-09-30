import { useEffect, useRef, useState } from "react";
import { Loader2, Plus, Trash2, Upload, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ARTIKEL_CLASS, norm, type Artikel, type BlockPayload, type LessonBlock, type LueckeItem, type PictureItem } from "./types";
import { MODEL_KEYS, modelLabel, modelParts } from "./InteractiveModel";
import SatzbauBlock from "./SatzbauBlock";
import BildBlock from "./BildBlock";

interface Props {
  block: LessonBlock;
  onChange: (patch: Partial<LessonBlock>) => void;
}

const line = (v: unknown) => String(v ?? "");
const ARTIKEL: Artikel[] = ["der", "die", "das", "plural"];

/** Слова з артиклем: «der Tisch» → { artikel: der, word: Tisch }. */
function splitArtikel(raw: string): { artikel: Artikel | null; word: string } {
  const m = raw.trim().match(/^(der|die|das)\s+(.+)$/i);
  if (!m) return { artikel: null, word: raw.trim() };
  return { artikel: m[1].toLowerCase() as Artikel, word: m[2].trim() };
}

/** Пропуск у квадратних дужках: «Ich warte [auf|an] den Bus». */
export function bracketize(item: LueckeItem) {
  const alts = [item.answer, ...(item.options ?? []).filter((o) => norm(o) !== norm(item.answer))].filter(Boolean);
  const inner = alts.join("|") || item.answer;
  const sentence = item.sentence || "";
  return sentence.includes("___") ? sentence.replace("___", `[${inner}]`) : sentence;
}

export function parseBracket(text: string, prev: LueckeItem): LueckeItem {
  const m = text.match(/\[([^\]]*)\]/);
  if (!m) return { ...prev, sentence: text };
  const alts = m[1].split("|").map((s) => s.trim()).filter(Boolean);
  return { ...prev, sentence: text.replace(m[0], "___"), answer: alts[0] ?? "", options: alts.length > 1 ? alts : [] };
}

const LUECKE_PRESETS = [
  "[der|die|das|den|dem|denen]",
  "[ein|eine|einen|einem|einer]",
  "[in|an|auf|vor|hinter|unter]",
  "[weil|denn|deshalb|obwohl]",
];

/** Швидкі граматичні шаблони для інших типів вправ. */
const SATZ_PRESETS: { label: string; hint: string }[] = [
  { label: "Subjekt + Verb + Objekt", hint: "Дієслово на 2 місці" },
  { label: "Inversion: Gestern + Verb + Subjekt", hint: "Обставина спереду — дієслово одразу після неї" },
  { label: "Nebensatz: weil / dass … Verb am Ende", hint: "У підрядному дієслово в кінці" },
  { label: "Perfekt: haben/sein … Partizip II", hint: "Partizip II у кінці речення" },
  { label: "Modalverb: Modalverb … Infinitiv", hint: "Infinitiv у кінці речення" },
];

const PAARE_PRESETS: { label: string; pairs: { left: string; right: string }[] }[] = [
  { label: "Verben mit Präpositionen", pairs: [{ left: "warten", right: "auf + Akk." }, { left: "denken", right: "an + Akk." }, { left: "sich interessieren", right: "für + Akk." }, { left: "träumen", right: "von + Dat." }] },
  { label: "Gegenteile", pairs: [{ left: "groß", right: "klein" }, { left: "hell", right: "dunkel" }, { left: "schnell", right: "langsam" }, { left: "reich", right: "arm" }] },
  { label: "Nomen-Verb-Verbindungen", pairs: [{ left: "eine Rolle", right: "spielen" }, { left: "eine Frage", right: "stellen" }, { left: "Bescheid", right: "geben" }] },
];

const ARTIKEL_PRESETS: { label: string; words: string[] }[] = [
  { label: "die: -ung / -heit / -keit / -schaft / -tion", words: ["die Wohnung", "die Freiheit", "die Möglichkeit", "die Mannschaft", "die Situation"] },
  { label: "der: -ling / -or / -ismus / -er / -ist", words: ["der Lehrling", "der Motor", "der Kapitalismus", "der Fahrer", "der Journalist"] },
  { label: "das: -chen / -lein / -ment / -um / -nis", words: ["das Mädchen", "das Fräulein", "das Dokument", "das Museum", "das Ergebnis"] },
];

const TRANS_PRESETS = [
  "Aktiv → Passiv (wurde / ist … worden)",
  "Hauptsatz → Nebensatz mit weil / obwohl",
  "Indikativ → Konjunktiv II (hätte / wäre / würde)",
  "Direkte Rede → Indirekte Rede",
];

const blankLuecke = (): LueckeItem => ({ sentence: "___", answer: "", options: [], synonyms: [], hint: null });

function AutoGrowTextarea(props: React.ComponentProps<typeof Textarea>) {
  const ref = useRef<HTMLTextAreaElement | null>(null);
  const resize = () => {
    const node = ref.current;
    if (!node) return;
    node.style.height = "auto";
    node.style.height = `${node.scrollHeight}px`;
  };

  useEffect(resize, [props.value]);
  return <Textarea {...props} ref={ref} rows={2} onInput={(event) => { resize(); props.onInput?.(event); }} />;
}

/** Редактор блока: швидкі рядкові форми, ключі, підказки. */
export default function BlockEditor({ block, onChange }: Props) {
  const p: BlockPayload = block.payload || {};
  const [uploading, setUploading] = useState(false);
  const [voicing, setVoicing] = useState(false);
  const [lueckeEditorMode, setLueckeEditorMode] = useState("builder");
  const [lueckeBulk, setLueckeBulk] = useState("");
  const [activeLueckeIndex, setActiveLueckeIndex] = useState<number | null>(null);
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

  const uploadImage = async (file: File): Promise<string | null> => {
    if (block.lesson_id === "draft") {
      toast({ title: "Спершу збережіть урок, тоді додайте фото", variant: "destructive" });
      return null;
    }
    if (!file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) {
      toast({ title: "Потрібне зображення до 8 МБ", variant: "destructive" });
      return null;
    }
    setUploading(true);
    try {
      const path = `kits/${block.lesson_id}/image-${crypto.randomUUID()}.${file.name.split(".").pop()?.toLowerCase() || "jpg"}`;
      const { error } = await supabase.storage.from("tutoring-materials").upload(path, file, { contentType: file.type });
      if (error) throw error;
      return path;
    } catch (e: any) {
      toast({ title: "Фото не завантажено", description: e?.message, variant: "destructive" });
      return null;
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

  /** Список рядків: Enter — новий рядок, вставка списком — багато рядків одразу. */
  const rows = <T,>(items: T[], set: (next: T[]) => void, blankItem: () => T) => ({
    items,
    add: () => set([...items, blankItem()]),
    remove: (i: number) => set(items.filter((_, j) => j !== i)),
    patch: (i: number, item: T) => set(items.map((x, j) => (j === i ? item : x))),
    keys: (i: number) => (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        set([...items.slice(0, i + 1), blankItem(), ...items.slice(i + 1)]);
      }
    },
    paste: (i: number, make: (text: string) => T) => (e: React.ClipboardEvent) => {
      const lines = e.clipboardData.getData("text").split("\n").map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) return;
      e.preventDefault();
      set([...items.slice(0, i), ...lines.map(make), ...items.slice(i + 1)]);
    },
  });

  const luecke = rows<LueckeItem>(p.items ?? [], (items) => setPayload({ items }), blankLuecke);
  const satz = rows(p.sentences ?? [], (sentences) => setPayload({ sentences }), () => ({ words: [], hint: null }));
  const paare = rows(p.pairs ?? [], (pairs) => setPayload({ pairs }), () => ({ left: "", right: "" }));
  const artikel = rows(p.article_items ?? [], (article_items) => setPayload({ article_items }), () => ({ word: "", article: "der" as Artikel }));
  const vocab = rows(p.words ?? [], (words) => setPayload({ words }), () => ({ de: "", uk: "", artikel: null, plural: null }));
  const bild = rows<PictureItem>(p.picture_items ?? [], (picture_items) => setPayload({ picture_items }), () => ({ image: "", word: "", artikel: null, uk: "", options: [] }));

  const bulkLines = lueckeBulk.split("\n").map((value) => value.trim()).filter(Boolean);
  const parsedBulk = bulkLines.map((value) => parseBracket(value, blankLuecke()));
  const invalidBulkCount = parsedBulk.filter((item) => !item.answer).length;

  const importLueckeBulk = () => {
    if (!parsedBulk.length || invalidBulkCount > 0) {
      toast({ title: "Перевірте масовий імпорт", description: "Кожен рядок має містити відповідь у квадратних дужках.", variant: "destructive" });
      return;
    }
    setPayload({ items: [...(p.items ?? []), ...parsedBulk] });
    setLueckeBulk("");
    setLueckeEditorMode("builder");
    toast({ title: `Додано речень: ${parsedBulk.length}` });
  };

  const applyLueckePreset = (preset: string) => {
    const items = p.items ?? [];
    const target = activeLueckeIndex !== null && items[activeLueckeIndex] ? activeLueckeIndex : items.length - 1;
    if (target < 0) {
      setPayload({ items: [parseBracket(preset, blankLuecke())] });
      setActiveLueckeIndex(0);
      return;
    }
    const item = items[target];
    const nextText = item.sentence.includes("___") ? item.sentence.replace("___", preset) : `${bracketize(item)} ${preset}`.trim();
    setPayload({ items: items.map((entry, index) => index === target ? parseBracket(nextText, entry) : entry) });
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
        <p className="text-xs text-muted-foreground">Позначте закінчення **двома зірочками** для підсвічування. Tab — наступна комірка.</p>
        <div className="space-y-2"><Label className="text-xs">Колонки</Label>{(p.columns ?? []).map((col, i) => <div key={i} className="flex gap-2"><Input aria-label={`Колонка ${i + 1}`} value={col} onChange={(e) => setPayload({ columns: (p.columns ?? []).map((x, j) => j === i ? e.target.value : x) })} /><Button size="sm" variant="outline" onClick={() => setPayload({ columns: (p.columns ?? []).filter((_, j) => j !== i), rows: (p.rows ?? []).map((r) => r.filter((_, j) => j !== i)) })}>−</Button></div>)}<Button size="sm" variant="outline" onClick={() => setPayload({ columns: [...(p.columns ?? []), "Нова колонка"] })}>+ Колонка</Button></div>
        <div className="space-y-2"><Label className="text-xs">Рядки</Label>{(p.rows ?? []).map((row, i) => <div key={i} className="flex items-start gap-2"><span className="pt-2 text-xs text-muted-foreground">{i + 1}</span><div className="grid flex-1 gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(1, p.columns?.length ?? 1)}, minmax(80px, 1fr))` }}>{(p.columns ?? []).map((_, j) => <Input key={j} aria-label={`Рядок ${i + 1}, колонка ${j + 1}`} value={row[j] ?? ""} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); setPayload({ rows: [...(p.rows ?? []).slice(0, i + 1), (p.columns ?? []).map(() => ""), ...(p.rows ?? []).slice(i + 1)] }); } }} onChange={(e) => setPayload({ rows: (p.rows ?? []).map((r, ri) => ri === i ? (p.columns ?? []).map((_, ci) => ci === j ? e.target.value : r[ci] ?? "") : r) })} />)}</div><Button size="sm" variant="outline" onClick={() => setPayload({ rows: (p.rows ?? []).filter((_, ri) => ri !== i) })}>−</Button></div>)}<Button size="sm" variant="outline" onClick={() => setPayload({ rows: [...(p.rows ?? []), (p.columns ?? []).map(() => "")] })}>+ Рядок</Button></div>
        <Field label="Підпис таблиці" value={p.caption} onChange={(v) => setPayload({ caption: v })} />
      </div>}

      {block.type === "callout" && <div className="space-y-3"><label className="block space-y-1"><Label className="text-xs">Тип примітки</Label><select className="w-full rounded-md border p-2 text-sm" value={p.tone ?? "note"} onChange={(e) => setPayload({ tone: e.target.value as BlockPayload["tone"] })}><option value="note">Правило</option><option value="example">Приклад</option><option value="warning">Зверніть увагу</option></select></label><label className="block space-y-1"><Label className="text-xs">Текст (виділення **слова**)</Label><Textarea rows={5} value={line(p.markdown)} onChange={(e) => setPayload({ markdown: e.target.value })} /></label></div>}

      {block.type === "image" && <div className="space-y-3"><Field label="URL зображення (фото зі сторінки, без ШІ-підміни)" value={p.image_path} onChange={(v) => setPayload({ image_path: v })} /><label className="block space-y-1 text-xs">Або завантажити власне фото<input type="file" accept="image/jpeg,image/png,image/webp" className="w-full text-xs" disabled={uploading || block.lesson_id === "draft"} onChange={async (e) => { const file = e.target.files?.[0]; if (file) { const path = await uploadImage(file); if (path) { setPayload({ image_path: path }); toast({ title: "Фото додано; збережіть урок" }); } } e.target.value = ""; }} />{block.lesson_id === "draft" && <span className="text-muted-foreground">Спершу збережіть урок, тоді завантажте фото.</span>}</label><Field label="Підпис" value={p.caption} onChange={(v) => setPayload({ caption: v })} /><Field label="Контекст / сторінка джерела" value={p.context} onChange={(v) => setPayload({ context: v })} /></div>}

      {block.type === "artikel" && <div className="space-y-3">
        <Label className="text-xs">Слова та правильні артиклі</Label>
        <PresetRow
          label="Швидкі шаблони за суфіксами"
          presets={ARTIKEL_PRESETS.map((preset) => preset.label)}
          onPick={(label) => {
            const preset = ARTIKEL_PRESETS.find((entry) => entry.label === label);
            if (!preset) return;
            setPayload({ article_items: [...(p.article_items ?? []), ...preset.words.map((raw) => { const s = splitArtikel(raw); return { word: s.word, article: s.artikel ?? "der" as Artikel }; })] });
          }}
        />
        <ModeTabs
          builder={<>
            <p className="text-[11px] text-muted-foreground">Впишіть «der Tisch» — артикль підставиться сам. Alt+1/2/3/4 — der/die/das/Plural. Enter — новий рядок.</p>
            {artikel.items.map((item, i) => <div key={i} className="space-y-1.5 rounded-xl border p-2">
              <div className="flex items-start gap-2">
                <AutoGrowTextarea
                  className="min-h-[44px] flex-1 resize-none overflow-hidden leading-6"
                  aria-label={`Слово ${i + 1}`}
                  placeholder="Tisch або der Tisch"
                  value={item.word}
                  onKeyDown={(e) => {
                    const digit = ["1", "2", "3", "4"].indexOf(e.key);
                    if (e.altKey && digit >= 0) { e.preventDefault(); artikel.patch(i, { ...item, article: ARTIKEL[digit] }); return; }
                    artikel.keys(i)(e);
                  }}
                  onPaste={artikel.paste(i, (text) => { const s = splitArtikel(text); return { word: s.word, article: s.artikel ?? "der" }; })}
                  onChange={(e) => { const s = splitArtikel(e.target.value); artikel.patch(i, s.artikel ? { ...item, word: s.word, article: s.artikel } : { ...item, word: e.target.value }); }}
                />
                <Button size="icon" variant="ghost" className="shrink-0 text-destructive" onClick={() => artikel.remove(i)} aria-label={`Видалити слово ${i + 1}`}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {ARTIKEL.map((a) => <button key={a} type="button" onClick={() => artikel.patch(i, { ...item, article: a })} className={cn("rounded-lg border px-2.5 py-1 text-xs font-semibold", item.article === a ? ARTIKEL_CLASS[a] : "text-muted-foreground")}>{a === "plural" ? "Pl." : a}</button>)}
              </div>
            </div>)}
            <Button size="sm" variant="outline" onClick={artikel.add}><Plus className="mr-1 h-3.5 w-3.5" />Слово</Button>
          </>}
          bulk={<BulkPanel
            label="По одному слову на рядок: «der Tisch» або «Tisch | der»"
            placeholder={"der Tisch\ndie Lampe\ndas Buch\nKinder | plural"}
            parse={(row) => {
              const [first, second] = row.split("|").map((x) => x.trim());
              const s = splitArtikel(first ?? "");
              const explicit = (second ?? "").toLowerCase();
              const article = ARTIKEL.includes(explicit as Artikel) ? (explicit as Artikel) : s.artikel;
              if (!s.word) return null;
              return { word: s.word, article: article ?? ("der" as Artikel) };
            }}
            onImport={(items) => setPayload({ article_items: [...(p.article_items ?? []), ...items] })}
            unit={["слово", "слів"]}
          />}
        />
      </div>}

      {block.type === "transformation" && <div className="space-y-3">
        <p className="text-xs font-semibold">Зразок</p>
        <div className="grid gap-2 sm:grid-cols-2">
          <Field label="Початкове речення" value={p.example?.source} onChange={(v) => setPayload({ example: { source: v, answer: p.example?.answer ?? "" } })} />
          <Field label="Перетворення" value={p.example?.answer} onChange={(v) => setPayload({ example: { source: p.example?.source ?? "", answer: v } })} />
        </div>
        <PresetRow
          label="Швидкі шаблони перетворення"
          presets={TRANS_PRESETS}
          onPick={(hint) => setPayload({ transformations: [...(p.transformations ?? []), { source: "", answer: "", hint }] })}
        />
        <ModeTabs
          builder={<>
            <p className="text-[11px] text-muted-foreground">Ліве — вихідне речення, праве — правильне перетворення.</p>
            {(p.transformations ?? []).map((item, i) => <div key={i} className="space-y-2 rounded-lg border p-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-muted-foreground">Речення {i + 1}</span>
                {item.hint && <span className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">{item.hint}</span>}
                <Button size="icon" variant="ghost" className="ml-auto shrink-0 text-destructive" onClick={() => setPayload({ transformations: (p.transformations ?? []).filter((_, j) => j !== i) })} aria-label={`Видалити речення ${i + 1}`}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <AutoGrowTextarea className="min-h-[56px] resize-none overflow-hidden leading-6" aria-label={`Вихідне речення ${i + 1}`} placeholder="Der Techniker reparierte den Aufzug." value={line(item.source)} onChange={(e) => setPayload({ transformations: (p.transformations ?? []).map((x, j) => j === i ? { ...x, source: e.target.value } : x) })} />
              <AutoGrowTextarea className="min-h-[56px] resize-none overflow-hidden leading-6" aria-label={`Відповідь ${i + 1}`} placeholder="Der Aufzug wurde vom Techniker repariert." value={line(item.answer)} onChange={(e) => setPayload({ transformations: (p.transformations ?? []).map((x, j) => j === i ? { ...x, answer: e.target.value } : x) })} />
            </div>)}
            <Button size="sm" variant="outline" onClick={() => setPayload({ transformations: [...(p.transformations ?? []), { source: "", answer: "" }] })}><Plus className="mr-1 h-3.5 w-3.5" />Речення</Button>
          </>}
          bulk={<BulkPanel
            label="По одній парі на рядок: «вихідне -> відповідь» або через «|»"
            placeholder={"Der Techniker reparierte den Aufzug. -> Der Aufzug wurde vom Techniker repariert.\nIch komme nicht, ich bin krank. -> Ich komme nicht, weil ich krank bin."}
            parse={(row) => {
              const [source, answer] = row.split(/->|→|\|/).map((x) => x.trim());
              if (!source || !answer) return null;
              return { source, answer };
            }}
            onImport={(items) => setPayload({ transformations: [...(p.transformations ?? []), ...items] })}
            unit={["речення", "речень"]}
          />}
        />
      </div>}

      {block.type === "modell" && <div className="space-y-3">
        <label className="block space-y-1"><Label className="text-xs">Модель</Label><select className="w-full rounded-md border p-2 text-sm" value={p.model ?? "auge"} onChange={(e) => setPayload({ model: e.target.value, parts: e.target.value === "custom" ? (p.parts ?? []) : [] })}>{MODEL_KEYS.map((k) => <option key={k} value={k}>{modelLabel(k)}</option>)}<option value="custom">Власний SVG-код</option></select></label>
        {p.model !== "custom" && <Button size="sm" variant="outline" onClick={() => setPayload({ parts: modelParts(p.model ?? "auge") })}>Завантажити частини для редагування</Button>}
        {p.model === "custom" && <label className="block space-y-1"><Label className="text-xs">SVG-код (data-part="id") або повний HTML від Gemini — він запуститься в окремому вікні</Label><Textarea rows={6} value={line(p.svg)} onChange={(e) => setPayload({ svg: e.target.value })} placeholder='<svg viewBox="0 0 400 300">...<path data-part="iris" .../></svg>' /></label>}
        <div className="space-y-2"><Label className="text-xs">Частини моделі</Label>{(p.parts ?? []).map((part, i) => <div key={i} className="space-y-1 rounded-md border p-2">
          <div className="flex gap-2"><Input aria-label={`ID частини ${i + 1}`} className="w-28" placeholder="data-part" value={part.id} onChange={(e) => setPayload({ parts: (p.parts ?? []).map((x, j) => j === i ? { ...x, id: e.target.value } : x) })} /><Input aria-label={`Назва ${i + 1}`} placeholder="Netzhaut" value={part.label} onChange={(e) => setPayload({ parts: (p.parts ?? []).map((x, j) => j === i ? { ...x, label: e.target.value } : x) })} /><select aria-label={`Артикль ${i + 1}`} className="rounded-md border px-2 text-sm" value={part.article ?? "die"} onChange={(e) => setPayload({ parts: (p.parts ?? []).map((x, j) => j === i ? { ...x, article: e.target.value as Artikel } : x) })}>{ARTIKEL.map((a) => <option key={a} value={a}>{a}</option>)}</select><Button size="sm" variant="outline" onClick={() => setPayload({ parts: (p.parts ?? []).filter((_, j) => j !== i) })}>−</Button></div>
          <Textarea rows={2} aria-label={`Пояснення ${i + 1}`} placeholder="Коротке пояснення" value={line(part.text)} onChange={(e) => setPayload({ parts: (p.parts ?? []).map((x, j) => j === i ? { ...x, text: e.target.value } : x) })} />
        </div>)}<Button size="sm" variant="outline" onClick={() => setPayload({ parts: [...(p.parts ?? []), { id: "", label: "", article: "die", text: "" }] })}>+ Частина</Button></div>
        <p className="text-xs text-muted-foreground">Якщо список частин порожній, беруться стандартні частини вибраної моделі.</p>
      </div>}

      {block.type === "bild" && <div className="space-y-3">
        <label className="block space-y-1"><Label className="text-xs">Що робить учень</Label><select className="w-full rounded-md border p-2 text-sm" value={p.bild_mode ?? "artikel"} onChange={(e) => setPayload({ bild_mode: e.target.value as BlockPayload["bild_mode"] })}>
          <option value="artikel">Артикль + слово вручну</option>
          <option value="choice">Вибір з варіантів</option>
          <option value="input">Тільки вписати слово</option>
        </select></label>
        {bild.items.map((item, i) => <div key={i} className="space-y-2 rounded-xl border p-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">Картинка {i + 1}</span>
            <Button size="sm" variant="ghost" className="ml-auto text-destructive" onClick={() => bild.remove(i)} aria-label={`Видалити картинку ${i + 1}`}><Trash2 className="h-4 w-4" /></Button>
          </div>
          <Input aria-label={`Посилання на картинку ${i + 1}`} placeholder="https://… або завантажте файл" value={item.image} onChange={(e) => bild.patch(i, { ...item, image: e.target.value })} />
          <input type="file" accept="image/jpeg,image/png,image/webp" className="w-full text-xs" disabled={uploading || block.lesson_id === "draft"} onChange={async (e) => { const f = e.target.files?.[0]; if (f) { const path = await uploadImage(f); if (path) bild.patch(i, { ...item, image: path }); } e.target.value = ""; }} />
          <div className="flex gap-2">
            <Input
              className="flex-1"
              aria-label={`Слово ${i + 1}`}
              placeholder="der Apfel"
              value={item.artikel ? `${item.artikel === "plural" ? "die" : item.artikel} ${item.word}` : item.word}
              onKeyDown={bild.keys(i)}
              onChange={(e) => { const s = splitArtikel(e.target.value); bild.patch(i, { ...item, word: s.word, artikel: s.artikel ?? item.artikel ?? null }); }}
            />
            <Input className="w-28" aria-label={`Переклад ${i + 1}`} placeholder="яблуко" value={line(item.uk)} onChange={(e) => bild.patch(i, { ...item, uk: e.target.value })} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {ARTIKEL.map((a) => <button key={a} type="button" onClick={() => bild.patch(i, { ...item, artikel: a })} className={cn("rounded-lg border px-2.5 py-1 text-xs font-semibold", item.artikel === a ? ARTIKEL_CLASS[a] : "text-muted-foreground")}>{a === "plural" ? "Pl." : a}</button>)}
          </div>
          {(p.bild_mode ?? "artikel") === "choice" && <Input aria-label={`Хибні варіанти ${i + 1}`} placeholder="Хибні варіанти через кому: Birne, Banane" value={(item.options ?? []).join(", ")} onChange={(e) => bild.patch(i, { ...item, options: e.target.value.split(",").map((x) => x.trim()).filter(Boolean) })} />}
        </div>)}
        <Button size="sm" variant="outline" onClick={bild.add}><Plus className="mr-1 h-3.5 w-3.5" />Картинка</Button>
        <MiniPreview label="Очима учня"><BildBlock block={block} value={{}} onChange={() => {}} checked={false} readOnly /></MiniPreview>
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
          <div className="space-y-2">
            <Label className="text-xs">Лексика</Label>
            <p className="text-[11px] text-muted-foreground">Впишіть «die Lampe» — артикль визначиться сам. Enter — новий рядок, вставка списком додає всі рядки.</p>
            {vocab.items.map((w, i) => <div key={i} className="space-y-1.5 rounded-xl border p-2">
              <div className="flex gap-2">
                <Input className="flex-1" aria-label={`Слово ${i + 1}`} placeholder="die Lampe" value={w.artikel ? `${w.artikel === "plural" ? "die" : w.artikel} ${w.de}` : w.de}
                  onKeyDown={vocab.keys(i)}
                  onPaste={vocab.paste(i, (text) => { const parts = text.split("|").map((x) => x.trim()); const s = splitArtikel(parts[0] ?? ""); return { de: s.word, uk: parts[1] ?? "", artikel: s.artikel, plural: null }; })}
                  onChange={(e) => { const s = splitArtikel(e.target.value); vocab.patch(i, { ...w, de: s.word, artikel: s.artikel ?? w.artikel ?? null }); }} />
                <Input className="flex-1" aria-label={`Переклад ${i + 1}`} placeholder="лампа" value={line(w.uk)} onKeyDown={vocab.keys(i)} onChange={(e) => vocab.patch(i, { ...w, uk: e.target.value })} />
                <Button size="sm" variant="ghost" className="text-destructive" onClick={() => vocab.remove(i)} aria-label={`Видалити слово ${i + 1}`}><Trash2 className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                {ARTIKEL.map((a) => <button key={a} type="button" onClick={() => vocab.patch(i, { ...w, artikel: a })} className={cn("rounded-lg border px-2.5 py-1 text-xs font-semibold", w.artikel === a ? ARTIKEL_CLASS[a] : "text-muted-foreground")}>{a === "plural" ? "Pl." : a}</button>)}
                <Input className="ml-auto h-8 w-28 text-xs" aria-label={`Множина ${i + 1}`} placeholder="Lampen" value={line(w.plural)} onChange={(e) => vocab.patch(i, { ...w, plural: e.target.value })} />
              </div>
            </div>)}
            <Button size="sm" variant="outline" onClick={vocab.add}><Plus className="mr-1 h-3.5 w-3.5" />Слово</Button>
          </div>
        </>
      )}

      {block.type === "luecke" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Switch checked={(p.mode ?? "select") === "input"} onCheckedChange={(v) => setPayload({ mode: v ? "input" : "select" })} />
            <span className="text-xs text-muted-foreground">Ручний ввід замість вибору з варіантів</span>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Швидкі варіанти</Label>
            <div className="flex flex-wrap gap-1.5">
              {LUECKE_PRESETS.map((preset) => <Button key={preset} type="button" size="sm" variant="outline" className="h-auto whitespace-normal px-2.5 py-1.5 font-mono text-[11px]" onClick={() => applyLueckePreset(preset)}>{preset}</Button>)}
            </div>
          </div>
          <Tabs value={lueckeEditorMode} onValueChange={setLueckeEditorMode}>
            <TabsList className="grid w-full grid-cols-2 sm:w-auto">
              <TabsTrigger value="builder">Конструктор</TabsTrigger>
              <TabsTrigger value="bulk">Масовий імпорт</TabsTrigger>
            </TabsList>
            <TabsContent value="builder" className="space-y-2">
              <Label className="text-xs">Речення з пропуском</Label>
              <p className="text-[11px] text-muted-foreground">Відповідь беріть у квадратні дужки: <code>Ich warte [auf] den Bus</code>. Варіанти — через «|»: <code>[auf|an|für]</code>.</p>
              {luecke.items.map((item, i) => <div key={i} className="space-y-2 rounded-lg border p-3">
                <div className="flex items-start gap-2">
                  <AutoGrowTextarea className="min-h-[72px] flex-1 resize-none overflow-hidden leading-6" aria-label={`Речення ${i + 1}`} placeholder="Das Buch liegt [auf|an|in] dem Tisch." value={bracketize(item)} onFocus={() => setActiveLueckeIndex(i)} onChange={(e) => luecke.patch(i, parseBracket(e.target.value, item))} />
                  <Button size="icon" variant="ghost" className="shrink-0 text-destructive" onClick={() => luecke.remove(i)} aria-label={`Видалити речення ${i + 1}`}><Trash2 className="h-4 w-4" /></Button>
                </div>
                <div className="flex flex-wrap gap-1.5" aria-label={`Варіанти речення ${i + 1}`}>
                  {item.answer ? [item.answer, ...(item.options ?? []).filter((option) => norm(option) !== norm(item.answer))].map((option, optionIndex) => <span key={`${option}-${optionIndex}`} className={cn("rounded-full border px-2.5 py-1 text-xs font-medium", optionIndex === 0 ? "border-primary bg-primary/10 text-primary" : "border-border bg-muted text-muted-foreground")}>{option}</span>) : <span className="rounded-full border border-destructive px-2.5 py-1 text-xs font-medium text-destructive">Додайте [відповідь] у дужках</span>}
                </div>
                <Input className="h-8 text-xs" aria-label={`Підказка ${i + 1}`} placeholder="💡 підказка (необовʼязково)" value={line(item.hint)} onChange={(e) => luecke.patch(i, { ...item, hint: e.target.value || null })} />
              </div>)}
              <Button size="sm" variant="outline" onClick={() => { luecke.add(); setActiveLueckeIndex(luecke.items.length); }}><Plus className="mr-1 h-3.5 w-3.5" />Речення</Button>
            </TabsContent>
            <TabsContent value="bulk" className="space-y-3">
              <div>
                <Label className="text-xs" htmlFor={`luecke-bulk-${block.id}`}>По одному реченню на рядок</Label>
                <Textarea id={`luecke-bulk-${block.id}`} className="mt-1 min-h-48 font-mono text-sm leading-6" maxLength={12000} placeholder={"Ich warte [auf|an|für] den Bus.\nDas ist [der|die|das] richtige Artikel."} value={lueckeBulk} onChange={(e) => setLueckeBulk(e.target.value)} />
              </div>
              {bulkLines.length > 0 && <div className="rounded-lg border bg-muted/40 p-3 text-xs"><span className="font-semibold">Розпізнано: {parsedBulk.length}</span>{invalidBulkCount > 0 && <span className="ml-2 text-destructive">Без відповіді в дужках: {invalidBulkCount}</span>}</div>}
              <Button type="button" onClick={importLueckeBulk} disabled={!bulkLines.length || invalidBulkCount > 0}>Імпортувати {parsedBulk.length || ""} {parsedBulk.length === 1 ? "речення" : "речень"}</Button>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {block.type === "paare" && (
        <div className="space-y-2">
          <Label className="text-xs">Пари</Label>
          <p className="text-[11px] text-muted-foreground">Ліве — німецькою, праве — переклад або продовження. Enter — нова пара.</p>
          {paare.items.map((pair, i) => <div key={i} className="flex gap-2">
            <Input className="flex-1" aria-label={`Ліве ${i + 1}`} placeholder="warten" value={pair.left} onKeyDown={paare.keys(i)}
              onPaste={paare.paste(i, (text) => { const [left, right] = text.split(/[|–-]/).map((x) => x.trim()); return { left: left ?? "", right: right ?? "" }; })}
              onChange={(e) => paare.patch(i, { ...pair, left: e.target.value })} />
            <span className="self-center text-xs text-muted-foreground">↔</span>
            <Input className="flex-1" aria-label={`Праве ${i + 1}`} placeholder="auf + Akk." value={pair.right} onKeyDown={paare.keys(i)} onChange={(e) => paare.patch(i, { ...pair, right: e.target.value })} />
            <Button size="sm" variant="ghost" className="text-destructive" onClick={() => paare.remove(i)} aria-label={`Видалити пару ${i + 1}`}><Trash2 className="h-4 w-4" /></Button>
          </div>)}
          <Button size="sm" variant="outline" onClick={paare.add}><Plus className="mr-1 h-3.5 w-3.5" />Пара</Button>
        </div>
      )}

      {block.type === "satzbau" && (
        <div className="space-y-2">
          <Label className="text-xs">Речення у правильному порядку</Label>
          <p className="text-[11px] text-muted-foreground">Учень побачить ці слова перемішаними. Enter — нове речення.</p>
          {satz.items.map((s, i) => <div key={i} className="space-y-1.5 rounded-xl border p-2">
            <div className="flex gap-2">
              <Input
                className="flex-1"
                aria-label={`Речення ${i + 1}`}
                placeholder="Ich gehe heute ins Kino"
                value={s.words.join(" ")}
                onKeyDown={satz.keys(i)}
                onPaste={satz.paste(i, (text) => ({ words: text.split(/\s+/).filter(Boolean), hint: null }))}
                onChange={(e) => satz.patch(i, { ...s, words: e.target.value.split(/\s+/).filter(Boolean) })}
              />
              <Button size="sm" variant="ghost" className="text-destructive" onClick={() => satz.remove(i)} aria-label={`Видалити речення ${i + 1}`}><Trash2 className="h-4 w-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-1">
              {s.words.map((w, j) => <span key={j} className="rounded-lg border bg-muted px-2 py-0.5 text-xs">{w}</span>)}
              {s.words.length === 0 && <span className="text-[11px] text-muted-foreground">Слова зʼявляться тут</span>}
            </div>
            <Input className="h-8 text-xs" aria-label={`Підказка ${i + 1}`} placeholder="💡 Дієслово на 2 місці" value={line(s.hint)} onChange={(e) => satz.patch(i, { ...s, hint: e.target.value || null })} />
          </div>)}
          <Button size="sm" variant="outline" onClick={satz.add}><Plus className="mr-1 h-3.5 w-3.5" />Речення</Button>
          <MiniPreview label="Очима учня"><SatzbauBlock block={block} value={{}} onChange={() => {}} checked={false} readOnly /></MiniPreview>
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

function MiniPreview({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-muted/30 p-2">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="pointer-events-none origin-top scale-[.92]">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value?: string; onChange: (value: string) => void }) {
  return <label className="block space-y-1"><Label className="text-xs">{label}</Label><Input value={value ?? ""} onChange={(e) => onChange(e.target.value)} /></label>;
}
