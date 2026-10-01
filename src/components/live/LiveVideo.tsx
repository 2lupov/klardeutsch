import { useEffect, useState } from "react";
import { Clapperboard, Link2, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import MarkSheet from "@/components/live/MarkSheet";
import { cn } from "@/lib/utils";
import { useLiveVideo, youtubeVideoId } from "@/components/live/useLiveVideo";
import VideoLessonGenerator from "@/components/live/VideoLessonGenerator";
import type { LessonKit } from "@/lib/lesson-kits";

export default function LiveVideo({
  classId,
  role,
  className,
  onUseLesson,
}: {
  classId: string;
  role: "teacher" | "student";
  className?: string;
  onUseLesson?: (kit: LessonKit) => Promise<void> | void;
}) {
  const { state, update, remoteTyping, registerEditor } = useLiveVideo(classId);
  const [url, setUrl] = useState(state.video_url);
  const [invalid, setInvalid] = useState(false);

  useEffect(() => setUrl(state.video_url), [state.video_url]);

  const openVideo = () => {
    const videoId = youtubeVideoId(url);
    if (!videoId) { setInvalid(true); return; }
    setInvalid(false);
    update({ video_url: url.trim(), video_id: videoId }, true);
  };

  return (
    <div className={cn("flex min-h-0 flex-col gap-3", className)}>
      {role === "teacher" && (
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <div className="relative min-w-0 flex-1">
            <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={url}
              onChange={(event) => { setUrl(event.target.value); setInvalid(false); }}
              onKeyDown={(event) => { if (event.key === "Enter") openVideo(); }}
              placeholder="Вставте посилання YouTube"
              className={cn("pl-9", invalid && "border-destructive focus-visible:ring-destructive")}
            />
          </div>
          <Button animated={false} onClick={openVideo}><Clapperboard /> Відкрити відео</Button>
          {onUseLesson && <VideoLessonGenerator classId={classId} videoUrl={state.video_url || url} onUseLesson={onUseLesson} />}
          {invalid && <p className="self-center text-xs text-destructive">Перевірте посилання YouTube</p>}
        </div>
      )}

      {state.video_id ? (
        <div className="aspect-video max-h-[52dvh] w-full shrink-0 overflow-hidden rounded-md border border-border bg-card">
          <iframe
            key={state.video_id}
            src={`https://www.youtube-nocookie.com/embed/${state.video_id}?rel=0`}
            title="Відео уроку"
            className="h-full w-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="grid aspect-video max-h-[45dvh] w-full shrink-0 place-items-center rounded-md border border-dashed border-border bg-muted/30 text-center">
          <div className="space-y-2 px-4 text-muted-foreground">
            <Clapperboard className="mx-auto h-8 w-8" />
            <p className="text-sm">{role === "teacher" ? "Вставте посилання YouTube вище" : "Викладач ще не відкрив відео"}</p>
          </div>
        </div>
      )}

      <div className="flex min-h-[220px] flex-1 flex-col gap-2">
        <div className="flex shrink-0 items-center gap-2 px-1 text-primary">
          <NotebookPen className="h-4 w-4" />
          <span className="text-xs font-bold uppercase tracking-widest">Нотатки до відео</span>
          {remoteTyping && <span className="text-xs text-muted-foreground">{role === "teacher" ? "учень пише…" : "викладач пише…"}</span>}
        </div>
        <MarkSheet
          className="min-h-0 flex-1"
          value={state.notes}
          onChange={(notes) => update({ notes })}
          register={registerEditor}
          placeholder="Нові слова, фрази, важливі моменти з відео…"
        />
      </div>
    </div>
  );
}