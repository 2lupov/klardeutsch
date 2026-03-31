import { useState } from "react";
import { BookOpen, Play, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const videoUrl = lesson.video_url;

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
      ) : (
        <div className="aspect-video rounded-xl border border-border/30 bg-muted/20 flex flex-col items-center justify-center gap-3">
          <BookOpen className="w-12 h-12 text-primary/20" />
          <p className="text-sm text-muted-foreground">
            {lang === "uk" ? "Відео скоро буде доступне" : "Видео скоро будет доступно"}
          </p>
        </div>
      )}

      {/* Duration info */}
      {lesson.video_duration_sec != null && lesson.video_duration_sec > 0 && (
        <p className="text-xs text-muted-foreground">
          ⏱ {Math.round(lesson.video_duration_sec / 60)} {lang === "uk" ? "хв" : "мин"}
        </p>
      )}

      {/* Complete button */}
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
    </div>
  );
};

export default VideoLessonPlayer;
