import { useState } from "react";
import { BookOpen, Play, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import TheoryBlock from "./TheoryBlock";
import type { Lang } from "@/i18n/translations";

interface Props {
  lesson: {
    id: string;
    title: string;
    description: string | null;
    video_url: string | null;
    video_duration_sec: number | null;
    content: any;
  };
  onComplete: () => void;
  lang: Lang;
}

const VideoLessonPlayer = ({ lesson, onComplete, lang }: Props) => {
  const [watched, setWatched] = useState(false);
  const [theoryDone, setTheoryDone] = useState(false);

  const videoUrl = lesson.video_url;
  const theoryBlocks = (lesson.content as any)?.theory?.blocks;
  const hasTheory = Array.isArray(theoryBlocks) && theoryBlocks.length > 0;

  // Convert YouTube URLs to embed
  const getEmbedUrl = (url: string) => {
    if (url.includes("youtube.com/embed")) return url;
    if (url.includes("youtu.be/")) return `https://www.youtube.com/embed/${url.split("youtu.be/")[1]?.split("?")[0]}`;
    if (url.includes("watch?v=")) return `https://www.youtube.com/embed/${url.split("v=")[1]?.split("&")[0]}`;
    return url;
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="font-display text-xl font-bold text-foreground">{lesson.title}</h2>
        {lesson.description && (
          <p className="text-sm text-muted-foreground mt-1">{lesson.description}</p>
        )}
      </div>

      {/* Theory block - always shown first if present */}
      {hasTheory && (
        <TheoryBlock
          blocks={theoryBlocks}
          lang={lang}
          onTheoryComplete={!videoUrl ? () => { setTheoryDone(true); setWatched(true); onComplete(); } : () => setTheoryDone(true)}
        />
      )}

      {/* Video */}
      {videoUrl ? (
        <div className="rounded-xl overflow-hidden border border-border/30 bg-card/40">
          <div className="aspect-video">
            <iframe
              src={getEmbedUrl(videoUrl)}
              title={lesson.title}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      ) : !hasTheory ? (
        <div className="aspect-video rounded-xl border border-border/30 bg-muted/20 flex flex-col items-center justify-center gap-3">
          <BookOpen className="w-12 h-12 text-primary/20" />
          <p className="text-sm text-muted-foreground">
            {lang === "uk" ? "Відео скоро буде доступне" : "Видео скоро будет доступно"}
          </p>
        </div>
      ) : null}

      {/* Duration info */}
      {lesson.video_duration_sec != null && lesson.video_duration_sec > 0 && (
        <p className="text-xs text-muted-foreground">
          ⏱ {Math.round(lesson.video_duration_sec / 60)} {lang === "uk" ? "хв" : "мин"}
        </p>
      )}

      {/* Complete button - only for video lessons (theory-only handled by TheoryBlock) */}
      {videoUrl && (
        <div className="flex justify-center">
          {watched ? (
            <div className="flex items-center gap-2 text-primary text-sm font-semibold">
              <CheckCircle2 className="w-5 h-5" />
              {lang === "uk" ? "Завершено!" : "Завершено!"}
            </div>
          ) : (
            <Button
              onClick={() => {
                setWatched(true);
                onComplete();
              }}
              className="font-display font-bold"
              size="lg"
            >
              <Play className="w-4 h-4 mr-2" />
              {lang === "uk" ? "Завершити урок" : "Завершить урок"}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoLessonPlayer;
