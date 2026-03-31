import { Play, BookOpen } from "lucide-react";

interface Props {
  title: string;
  thumbnailUrl: string | null;
  trailerUrl: string | null;
  difficulty: string;
}

const levelColors: Record<string, string> = {
  A1: "bg-emerald-500/20 text-emerald-400",
  A2: "bg-sky-500/20 text-sky-400",
  B1: "bg-amber-500/20 text-amber-400",
  B2: "bg-orange-500/20 text-orange-400",
  C1: "bg-rose-500/20 text-rose-400",
};

const CourseHeroPlayer = ({ title, thumbnailUrl, trailerUrl, difficulty }: Props) => {
  const colorClass = levelColors[difficulty] ?? "bg-primary/20 text-primary";

  // If trailer URL is a YouTube embed
  if (trailerUrl) {
    const embedUrl = trailerUrl.includes("youtube.com/embed")
      ? trailerUrl
      : trailerUrl.includes("youtu.be/")
        ? `https://www.youtube.com/embed/${trailerUrl.split("youtu.be/")[1]?.split("?")[0]}`
        : trailerUrl.includes("watch?v=")
          ? `https://www.youtube.com/embed/${trailerUrl.split("v=")[1]?.split("&")[0]}`
          : trailerUrl;

    return (
      <div className="relative rounded-2xl overflow-hidden border border-border/30 bg-card/60">
        <div className="aspect-video">
          <iframe
            src={embedUrl}
            title={title}
            className="w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
        <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-bold ${colorClass}`}>
          {difficulty}
        </div>
      </div>
    );
  }

  // Thumbnail fallback
  return (
    <div className="relative aspect-video rounded-2xl overflow-hidden border border-border/30 bg-card/60">
      {thumbnailUrl ? (
        <img src={thumbnailUrl} alt={title} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5">
          <BookOpen className="w-16 h-16 text-primary/20" />
        </div>
      )}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-16 h-16 rounded-full bg-primary/80 flex items-center justify-center shadow-xl backdrop-blur-sm">
          <Play className="w-7 h-7 text-primary-foreground ml-1" />
        </div>
      </div>
      <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-lg text-[11px] font-bold ${colorClass}`}>
        {difficulty}
      </div>
    </div>
  );
};

export default CourseHeroPlayer;
