import { useEffect, useMemo, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ChevronDown,
  Copy,
  Download,
  Eye,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Trash2,
  Upload,
  Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import AiPdfImport from "./AiPdfImport";
import BlockEditor from "./BlockEditor";
import BlockRenderer, { BLOCK_ICON, blockLabel } from "./BlockRenderer";
import BookDrawer from "./BookDrawer";
import KitPicker from "./KitPicker";
import StudentBlocks from "./StudentBlocks";
import { BLOCK_META, BLOCK_TYPES, emptyPayload, type BlockType, type LessonBlock } from "./types";

interface Props {
  lessonId: string;
  studentId?: string | null;
}

/** Studio: блочний конструктор уроку для викладача. */
export default function LessonStudio({ lessonId, studentId }: Props) {
  const [blocks, setBlocks] = useState<LessonBlock[]>([]);
  const [loading, setLoading] = useState(true);
  const [openId, setOpenId] = useState<string | null>(null);
  const [preview, setPreview] = useState(false);
  const [pagePaths, setPagePaths] = useState<string[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("tutoring_lesson_blocks")
      .select("*")
      .eq("lesson_id", lessonId)
      .order("sort_order");
    if (error) toast({ title: "Не вдалося завантажити блоки", description: error.message, variant: "destructive" });
    setBlocks(((data ?? []) as any[]).map((b) => ({ ...b, payload: b.payload ?? {} })) as LessonBlock[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId]);

  const visible = useMemo(() => blocks.filter((b) => b.visible_to_student), [blocks]);

  const addBlock = async (type: BlockType) => {
    const { data, error } = await supabase
      .from("tutoring_lesson_blocks")
      .insert({
        lesson_id: lessonId,
        type,
        title: BLOCK_META[type].de,
        payload: emptyPayload(type) as any,
        sort_order: blocks.length,
        source: "manual",
      })
      .select("*")
      .single();
    if (error) return toast({ title: "Не вдалося додати блок", description: error.message, variant: "destructive" });
    setBlocks((s) => [...s, { ...(data as any), payload: (data as any).payload ?? {} }]);
    setOpenId((data as any).id);
  };

  const patchBlock = (id: string, patch: Partial<LessonBlock>) =>
    setBlocks((s) => s.map((b) => (b.id === id ? { ...b, ...patch } : b)));

  const saveBlock = async (block: LessonBlock) => {
    const { error } = await supabase
      .from("tutoring_lesson_blocks")
      .update({
        title: block.title,
        payload: block.payload as any,
        visible_to_student: block.visible_to_student,
        sort_order: block.sort_order,
      })
      .eq("id", block.id);
    if (error) toast({ title: "Не вдалося зберегти", description: error.message, variant: "destructive" });
    else toast({ title: "Збережено" });
  };

  const move = async (index: number, dir: -1 | 1) => {
    const next = [...blocks];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const reordered = next.map((b, i) => ({ ...b, sort_order: i }));
    setBlocks(reordered);
    await Promise.all(
      reordered.map((b) => supabase.from("tutoring_lesson_blocks").update({ sort_order: b.sort_order }).eq("id", b.id)),
    );
  };

  const duplicate = async (block: LessonBlock) => {
    const { data, error } = await supabase
      .from("tutoring_lesson_blocks")
      .insert({
        lesson_id: lessonId,
        type: block.type,
        title: `${block.title ?? ""} (копія)`.trim(),
        payload: block.payload as any,
        sort_order: blocks.length,
        source: block.source,
      })
      .select("*")
      .single();
    if (error) return toast({ title: "Не вдалося дублювати", description: error.message, variant: "destructive" });
    setBlocks((s) => [...s, { ...(data as any), payload: (data as any).payload ?? {} }]);
  };

  const remove = async (id: string) => {
    if (!confirm("Видалити цей блок?")) return;
    const { error } = await supabase.from("tutoring_lesson_blocks").delete().eq("id", id);
    if (error) return toast({ title: "Не вдалося видалити", description: error.message, variant: "destructive" });
    setBlocks((s) => s.filter((b) => b.id !== id));
  };

  const exportJson = () => {
    const payload = {
      version: 1,
      blocks: blocks.map((b) => ({ type: b.type, title: b.title, payload: b.payload, visible_to_student: b.visible_to_student })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `lektion-${lessonId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      const items = Array.isArray(parsed?.blocks) ? parsed.blocks : [];
      if (items.length === 0) throw new Error("У файлі немає блоків");
      const rows = items.slice(0, 40).map((b: any, i: number) => ({
        lesson_id: lessonId,
        type: String(b?.type ?? "luecke"),
        title: b?.title ? String(b.title).slice(0, 200) : null,
        payload: b?.payload ?? {},
        visible_to_student: b?.visible_to_student !== false,
        sort_order: blocks.length + i,
        source: "manual",
      }));
      const { error } = await supabase.from("tutoring_lesson_blocks").insert(rows);
      if (error) throw error;
      toast({ title: "Урок імпортовано", description: `Блоків: ${rows.length}` });
      load();
    } catch (e: any) {
      toast({ title: "Не вдалося імпортувати", description: e?.message, variant: "destructive" });
    }
  };

  const runFunction = async (name: string, label: string) => {
    setBusy(name);
    try {
      const { data, error } = await supabase.functions.invoke(name, { body: { lesson_id: lessonId } });
      if (error) throw error;
      toast({ title: label, description: data?.blocks ? `Створено блоків: ${data.blocks}` : data?.sent ? `Надіслано повідомлень: ${data.sent}` : "Готово" });
      if (name === "generate-block-homework") load();
    } catch (e: any) {
      toast({ title: `Не вдалося: ${label}`, description: e?.message, variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm">
              <Plus className="mr-1 h-4 w-4" />
              Додати блок
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            {BLOCK_TYPES.map((t) => {
              const Icon = BLOCK_ICON[t];
              return (
                <DropdownMenuItem key={t} onClick={() => addBlock(t)} className="gap-2">
                  <Icon className="h-4 w-4" />
                  <span>
                    {BLOCK_META[t].label}
                    <span className="ml-1 text-xs text-muted-foreground">{BLOCK_META[t].de}</span>
                  </span>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>

        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="secondary">
              <Sparkles className="mr-1 h-4 w-4" />
              PDF → урок (ШІ)
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>AI Magic PDF Import</DialogTitle>
            </DialogHeader>
            <AiPdfImport
              lessonId={lessonId}
              onCreated={(paths) => {
                setPagePaths((s) => [...s, ...paths]);
                setImportOpen(false);
                load();
              }}
            />
          </DialogContent>
        </Dialog>

        <Button size="sm" variant="outline" onClick={() => setPreview((v) => !v)}>
          <Eye className="mr-1 h-4 w-4" />
          {preview ? "Редагувати" : "Як бачить учень"}
        </Button>

        <Button size="sm" variant="outline" onClick={exportJson}>
          <Download className="mr-1 h-4 w-4" />
          Експорт JSON
        </Button>

        <label className="inline-flex">
          <input
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])}
          />
          <Button size="sm" variant="outline" asChild>
            <span>
              <Upload className="mr-1 h-4 w-4" />
              Імпорт JSON
            </span>
          </Button>
        </label>

        <Button size="sm" variant="outline" onClick={() => runFunction("generate-block-homework", "Домашка з помилок")} disabled={busy !== null}>
          {busy === "generate-block-homework" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Wand2 className="mr-1 h-4 w-4" />}
          Авто-ДЗ з помилок
        </Button>

        <Button size="sm" variant="outline" onClick={() => runFunction("notify-lesson-report", "Звіт у Telegram")} disabled={busy !== null}>
          {busy === "notify-lesson-report" ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
          Звіт у Telegram
        </Button>

        <KitPicker lessonId={lessonId} startSortOrder={blocks.length} onInserted={load} />

        <BookDrawer imagePaths={pagePaths} />
      </div>

      {preview ? (
        <div className="rounded-2xl border bg-muted/30 p-3">
          <StudentBlocks blocks={visible} studentId={studentId ?? null} persist={false} showActions onSubmitted={() => {}} />
        </div>
      ) : blocks.length === 0 ? (
        <Card className="p-8 text-center text-sm text-muted-foreground">
          Блоків ще немає. Додайте вручну або згенеруйте з PDF підручника.
        </Card>
      ) : (
        <div className={cn("grid gap-4", pagePaths.length > 0 && "lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]")}>
          {pagePaths.length > 0 && (
            <div className="hidden max-h-[70vh] space-y-3 overflow-y-auto rounded-2xl border p-3 lg:block">
              <p className="text-xs font-medium text-muted-foreground">Оригінальні сторінки</p>
              <PagePreviews paths={pagePaths} />
            </div>
          )}

          <div className="space-y-3">
            {blocks.map((b, i) => {
              const Icon = BLOCK_ICON[b.type as BlockType] ?? Sparkles;
              const open = openId === b.id;
              return (
                <Card key={b.id} className="overflow-hidden">
                  <div className="flex items-center gap-2 border-b p-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </span>
                    <button className="flex-1 text-left" onClick={() => setOpenId(open ? null : b.id)}>
                      <span className="text-sm font-semibold">{blockLabel(b)}</span>
                      <span className="ml-2 text-[11px] text-muted-foreground">
                        {BLOCK_META[b.type as BlockType]?.de} · {b.source === "ai" ? "ШІ" : b.source === "demo" ? "демо" : "вручну"}
                        {!b.visible_to_student && " · приховано"}
                      </span>
                    </button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => move(i, -1)} disabled={i === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => move(i, 1)} disabled={i === blocks.length - 1}>
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => duplicate(b)}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => remove(b.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
                  </div>

                  {open && (
                    <div className="space-y-4 p-3">
                      <BlockEditor block={b} onChange={(patch) => patchBlock(b.id, patch)} />
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setOpenId(null)}>
                          Закрити
                        </Button>
                        <Button size="sm" onClick={() => saveBlock(b)}>
                          Зберегти блок
                        </Button>
                      </div>
                      <div className="rounded-xl border bg-muted/30 p-3">
                        <p className="mb-2 text-xs font-medium text-muted-foreground">Превʼю</p>
                        <BlockRenderer block={b} value={undefined} onChange={() => {}} checked={false} readOnly />
                      </div>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PagePreviews({ paths }: { paths: string[] }) {
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    (async () => {
      const out: string[] = [];
      for (const p of paths) {
        const { data } = await supabase.storage.from("tutoring-materials").createSignedUrl(p, 3600);
        if (data?.signedUrl) out.push(data.signedUrl);
      }
      if (alive) setUrls(out);
    })();
    return () => {
      alive = false;
    };
  }, [paths]);

  return (
    <>
      {urls.map((u, i) => (
        <img key={i} src={u} alt={`Сторінка підручника ${i + 1}`} className="w-full rounded-xl border" loading="lazy" />
      ))}
    </>
  );
}
