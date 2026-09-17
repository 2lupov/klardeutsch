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
      const path = `audio/${block.lesson_id}/${Date.now()}.${ext}`;
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
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Upload className="mr-1 h-4 w-4" />}
              Завантажити аудіо
            </Button>
            <Button size="sm" variant="outline" onClick={voiceBlock} disabled={voicing}>
              {voicing ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Volume2 className="mr-1 h-4 w-4" />}
              Озвучити блок
            </Button>
            {p.audio_path && <span className="text-xs text-muted-foreground">✓ аудіо є</span>}
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
