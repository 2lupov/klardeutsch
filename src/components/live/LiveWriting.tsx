import { useEffect, useRef, useState } from "react";
import { Loader2, Sparkles, PenLine, Dices, Highlighter, Underline, Bold, Strikethrough, Eraser, FolderDown } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { fetchFolders, createFolder, createItem, type MaterialFolder } from "@/lib/materials";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface WritingTopic {
  title_de?: string;
  situation_uk?: string;
  task_de?: string;
  points?: string[];
  redemittel?: string[];
  min_words?: number;
  level?: string;
}

const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

/** Старі листи — простий текст; перетворюємо на HTML і чистимо небезпечне. */
function toHtml(v: string) {
  if (!v) return "";
  if (!/<[a-z][\s\S]*>/i.test(v)) return v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>");
  const doc = new DOMParser().parseFromString(v, "text/html");
  doc.querySelectorAll("script,style,iframe,object,embed").forEach((n) => n.remove());
  doc.querySelectorAll("*").forEach((el) => [...el.attributes].forEach((a) => { if (/^on/i.test(a.name) || /javascript:/i.test(a.value)) el.removeAttribute(a.name); }));
  return doc.body.innerHTML;
}
const plain = (html: string) => { const d = document.createElement("div"); d.innerHTML = html.replace(/<br\s*\/?>/gi, "\n").replace(/<\/(div|p)>/gi, "\n"); return (d.textContent || "").trim(); };
const HIGHLIGHT = "#FDE047";

/**
 * «Письмо» у живому уроці: спільне поле, яке бачать і пишуть обоє в реальному часі.
 * Викладач може згенерувати тему листа ШІ під вибраний рівень.
 */
export default function LiveWriting({ classId, role, className }: { classId: string; role: "teacher" | "student"; className?: string }) {
  const [text, setText] = useState("");
  const [topic, setTopic] = useState<WritingTopic | null>(null);
  const [level, setLevel] = useState("A2");
  const [generating, setGenerating] = useState(false);
  const [remoteTyping, setRemoteTyping] = useState(false);
  const me = useRef<string | null>(null);
  const chan = useRef<any>(null);
  const saveT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const textRef = useRef("");
  const editorRef = useRef<HTMLDivElement>(null);
  const [saveOpen, setSaveOpen] = useState(false);
  const setEditor = (html: string) => {
    const el = editorRef.current;
    if (el && el.innerHTML !== html) el.innerHTML = html;
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      me.current = u.user?.id ?? null;
      const { data } = await (supabase as any).from("live_class_writing").select("*").eq("class_id", classId).maybeSingle();
      if (!alive) return;
      if (data) {
        const h = toHtml(data.text || "");
        setText(h); textRef.current = h; setEditor(h);
        setTopic(data.topic || null);
        if (data.topic?.level) setLevel(data.topic.level);
      }
    })();

    const ch = supabase.channel(`live-writing:${classId}`, { config: { broadcast: { self: false } } });
    ch.on("broadcast", { event: "text" }, ({ payload }: any) => {
      if (typeof payload?.text !== "string") return;
      const h = toHtml(payload.text);
      textRef.current = h; setText(h); setEditor(h);
      setRemoteTyping(true);
      if (typingT.current) clearTimeout(typingT.current);
      typingT.current = setTimeout(() => setRemoteTyping(false), 1500);
    });
    ch.on("broadcast", { event: "topic" }, ({ payload }: any) => setTopic(payload?.topic ?? null));
    ch.on("postgres_changes", { event: "*", schema: "public", table: "live_class_writing", filter: `class_id=eq.${classId}` }, (p: any) => {
      const row = p.new;
      if (!row || row.updated_by === me.current) return;
      const h = toHtml(row.text || ""); if (h !== textRef.current) { textRef.current = h; setText(h); setEditor(h); }
      setTopic(row.topic || null);
    });
    ch.subscribe();
    chan.current = ch;
    return () => { alive = false; supabase.removeChannel(ch); chan.current = null; };
  }, [classId]);

  const persist = (patch: { text?: string; topic?: WritingTopic | null }) =>
    (supabase as any).from("live_class_writing").upsert(
      { class_id: classId, text: textRef.current, topic, ...patch, updated_by: me.current },
      { onConflict: "class_id" },
    );

  const onType = (v: string) => {
    setText(v);
    textRef.current = v;
    chan.current?.send({ type: "broadcast", event: "text", payload: { text: v } });
    if (saveT.current) clearTimeout(saveT.current);
    saveT.current = setTimeout(() => { void persist({ text: v }); }, 600);
  };

  const generate = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-writing-topic", {
        body: { level, avoid: topic?.title_de ?? "" },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setTopic(data.topic);
      chan.current?.send({ type: "broadcast", event: "topic", payload: { topic: data.topic } });
      await persist({ topic: data.topic });
    } catch (e: any) {
      toast.error(e?.message || "Не вдалося згенерувати тему");
    } finally {
      setGenerating(false);
    }
  };

  const clearAll = async () => {
    setEditor("");
    onType("");
  };

  const fromEditor = () => onType(editorRef.current?.innerHTML ?? "");
  const format = (cmd: string, value?: string) => {
    editorRef.current?.focus();
    document.execCommand("styleWithCSS", false, "true");
    document.execCommand(cmd, false, value);
    fromEditor();
  };
  const insertPhrase = (r: string) => {
    const cur = plain(text);
    const h = `${text}${cur && !/\s$/.test(cur) ? " " : ""}${r.replace(/</g, "&lt;")}`;
    setEditor(h); onType(h);
  };

  const words = plain(text).split(/\s+/).filter(Boolean).length;
  const min = topic?.min_words ?? 0;

  return (
    <div className={cn("h-full min-h-0 grid gap-3 grid-cols-1 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)]", className)}>
      {/* Тема */}
      <aside className="min-h-0 overflow-y-auto rounded-2xl border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2 text-primary">
          <PenLine className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Тема письма</span>
          {topic?.level && <span className="ml-auto rounded-md bg-primary/10 px-2 py-0.5 text-xs font-bold">{topic.level}</span>}
        </div>

        {role === "teacher" && (
          <div className="space-y-2">
            <div className="grid grid-cols-5 gap-1">
              {LEVELS.map((l) => (
                <Button key={l} animated={false} size="sm" variant={l === level ? "default" : "outline"} onClick={() => setLevel(l)} className="h-8 px-0">
                  {l}
                </Button>
              ))}
            </div>
            <Button animated={false} className="w-full" onClick={generate} disabled={generating}>
              {generating ? <Loader2 className="animate-spin" /> : topic ? <Dices /> : <Sparkles />}
              {generating ? "Генеруємо…" : topic ? "Інша тема" : "Згенерувати тему"}
            </Button>
          </div>
        )}

        {topic ? (
          <div className="space-y-3 text-sm">
            {topic.title_de && <h3 className="font-display text-lg font-bold text-foreground leading-tight">{topic.title_de}</h3>}
            {topic.situation_uk && <p className="text-muted-foreground">{topic.situation_uk}</p>}
            {topic.task_de && <p className="rounded-xl bg-muted/50 p-3 font-medium text-foreground">{topic.task_de}</p>}
            {!!topic.points?.length && (
              <ul className="space-y-1.5">
                {topic.points.map((p, i) => (
                  <li key={i} className="flex gap-2 text-foreground">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/15 text-[11px] font-bold text-primary">{i + 1}</span>
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            )}
            {!!topic.redemittel?.length && (
              <div className="space-y-1.5">
                <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Корисні фрази</p>
                <div className="flex flex-wrap gap-1.5">
                  {topic.redemittel.map((r, i) => (
                    <button
                      key={i}
                      onClick={() => insertPhrase(r)}
                      className="rounded-lg border border-dashed border-border px-2 py-1 text-xs text-foreground hover:bg-muted"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            {role === "teacher" ? "Оберіть рівень і згенеруйте тему — учень одразу її побачить." : "Викладач зараз підготує тему листа."}
          </p>
        )}
      </aside>

      {/* Спільний аркуш */}
      <section className="min-h-[320px] flex flex-col rounded-2xl border border-border bg-card overflow-hidden">
        <div className="h-11 shrink-0 flex items-center gap-3 px-4 border-b border-border">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-foreground">Спільний аркуш</span>
          {remoteTyping && (
            <span className="text-xs text-primary">{role === "teacher" ? "учень пише…" : "викладач пише…"}</span>
          )}
          <span className={cn("ml-auto text-xs font-medium", min && words >= min ? "text-primary" : "text-muted-foreground")}>
            {words}{min ? ` / ${min}` : ""} слів
          </span>
          {role === "teacher" && text && (
            <Button animated={false} size="sm" variant="ghost" className="h-7 text-xs" onClick={clearAll}>Очистити</Button>
          )}
        </div>
        <div className="h-10 shrink-0 flex items-center gap-1 px-3 border-b border-border bg-muted/30">
          <Button animated={false} size="sm" variant="ghost" className="h-7 gap-1.5 px-2 text-xs" onMouseDown={(e) => e.preventDefault()} onClick={() => format("hiliteColor", HIGHLIGHT)} title="Виділити жовтим">
            <span className="grid size-5 place-items-center rounded bg-[hsl(var(--highlight,50_97%_64%))]" style={{ background: HIGHLIGHT }}><Highlighter className="h-3.5 w-3.5 text-foreground" /></span> Жовтим
          </Button>
          <Button animated={false} size="icon" variant="ghost" className="h-7 w-7" onMouseDown={(e) => e.preventDefault()} onClick={() => format("underline")} title="Підкреслити"><Underline /></Button>
          <Button animated={false} size="icon" variant="ghost" className="h-7 w-7" onMouseDown={(e) => e.preventDefault()} onClick={() => format("bold")} title="Жирний"><Bold /></Button>
          <Button animated={false} size="icon" variant="ghost" className="h-7 w-7" onMouseDown={(e) => e.preventDefault()} onClick={() => format("strikeThrough")} title="Закреслити помилку"><Strikethrough /></Button>
          <Button animated={false} size="icon" variant="ghost" className="h-7 w-7" onMouseDown={(e) => e.preventDefault()} onClick={() => { format("removeFormat"); format("hiliteColor", "transparent"); }} title="Прибрати виділення"><Eraser /></Button>
          {role === "teacher" && (
            <Button animated={false} size="sm" variant="outline" className="ml-auto h-7 text-xs" onClick={() => setSaveOpen(true)} disabled={!plain(text)}>
              <FolderDown /> Зберегти в папку
            </Button>
          )}
        </div>
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          spellCheck={false}
          onInput={fromEditor}
          data-placeholder="Liebe Anna, …"
          className="live-writing-sheet flex-1 min-h-0 w-full overflow-y-auto px-6 py-4 font-display text-lg leading-8 text-foreground outline-none"
          style={{
            backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 31px, hsl(var(--border)) 31px, hsl(var(--border)) 32px)",
            backgroundAttachment: "local",
            backgroundPosition: "0 16px",
          }}
        />
      </section>
      {role === "teacher" && (
        <SaveToFolder open={saveOpen} onOpenChange={setSaveOpen} html={text} topic={topic} level={topic?.level ?? level} />
      )}
    </div>
  );
}

/** Збереження листа в «Файли» (банк матеріалів) з датою в назві. */
function SaveToFolder({ open, onOpenChange, html, topic, level }: { open: boolean; onOpenChange: (v: boolean) => void; html: string; topic: WritingTopic | null; level: string }) {
  const [folders, setFolders] = useState<MaterialFolder[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => { if (open) fetchFolders().then(setFolders).catch(() => setFolders([])); }, [open]);

  const date = new Date().toLocaleDateString("uk-UA");
  const title = `Письмо · ${date}${topic?.title_de ? ` · ${topic.title_de}` : ""}`;

  const save = async (folderId?: string) => {
    setBusy(folderId ?? "new");
    try {
      const { data: u } = await supabase.auth.getUser();
      const ownerId = u.user!.id;
      let id = folderId;
      if (!id) {
        const existing = folders.find((f) => f.name === "Письма");
        id = existing?.id ?? (await createFolder({ ownerId, name: "Письма", category: "tasks", level: null, description: "Листи з живих уроків" })).id;
      }
      await createItem({ folderId: id, ownerId, kind: "text", title, level, tags: ["письмо", date],
        content: { body: plain(html), html, topic, date: new Date().toISOString() } });
      toast.success(`Збережено: ${title}`);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message || "Не вдалося зберегти");
    } finally { setBusy(null); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogTitle>Зберегти лист у папку</DialogTitle>
        <p className="text-sm text-muted-foreground">Назва: <b className="text-foreground">{title}</b></p>
        <Button animated={false} onClick={() => save()} disabled={!!busy}>
          {busy === "new" ? <Loader2 className="animate-spin" /> : <FolderDown />} У папку «Письма»
        </Button>
        {folders.filter((f) => f.name !== "Письма").length > 0 && (
          <div className="max-h-64 space-y-1 overflow-y-auto">
            <p className="text-[11px] font-bold uppercase tracking-widest text-muted-foreground">Або в іншу папку</p>
            {folders.filter((f) => f.name !== "Письма").map((f) => (
              <Button key={f.id} animated={false} variant="outline" className="w-full justify-start" onClick={() => save(f.id)} disabled={!!busy}>
                {busy === f.id && <Loader2 className="animate-spin" />} {f.name}{f.level ? ` · ${f.level}` : ""}
              </Button>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
