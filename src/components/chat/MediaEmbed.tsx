import { useMemo } from "react";
import { Play, ExternalLink } from "lucide-react";

interface MediaEmbedProps {
  url: string;
  isMe?: boolean;
}

type EmbedInfo = {
  type: "youtube" | "spotify";
  embedUrl: string;
  title: string;
  originalUrl: string;
};

const parseMediaUrl = (text: string): EmbedInfo | null => {
  // YouTube patterns
  const ytPatterns = [
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?(?:www\.)?youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /(?:https?:\/\/)?music\.youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
  ];

  for (const pattern of ytPatterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return {
        type: "youtube",
        embedUrl: `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1`,
        title: "YouTube",
        originalUrl: text,
      };
    }
  }

  // Spotify patterns
  const spotifyPatterns = [
    /(?:https?:\/\/)?open\.spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/,
  ];

  for (const pattern of spotifyPatterns) {
    const match = text.match(pattern);
    if (match?.[1] && match?.[2]) {
      return {
        type: "spotify",
        embedUrl: `https://open.spotify.com/embed/${match[1]}/${match[2]}?utm_source=generator&theme=0`,
        title: `Spotify ${match[1]}`,
        originalUrl: text,
      };
    }
  }

  return null;
};

/** Check if a text contains a media URL */
export const hasMediaEmbed = (text: string): boolean => {
  return parseMediaUrl(text) !== null;
};

const MediaEmbed = ({ url, isMe }: MediaEmbedProps) => {
  const embed = useMemo(() => parseMediaUrl(url), [url]);

  if (!embed) return null;

  if (embed.type === "youtube") {
    return (
      <div className="w-full max-w-[320px] rounded-xl overflow-hidden">
        <div className="relative w-full" style={{ aspectRatio: "16/9" }}>
          <iframe
            src={embed.embedUrl}
            className="absolute inset-0 w-full h-full"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            loading="lazy"
            title="YouTube"
          />
        </div>
        <a
          href={embed.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium transition-colors ${
            isMe ? "text-primary-foreground/70 hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <Play className="w-3 h-3" />
          YouTube
          <ExternalLink className="w-2.5 h-2.5 ml-auto" />
        </a>
      </div>
    );
  }

  if (embed.type === "spotify") {
    return (
      <div className="w-full max-w-[320px] rounded-xl overflow-hidden">
        <iframe
          src={embed.embedUrl}
          className="w-full rounded-xl"
          height="152"
          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
          loading="lazy"
          title="Spotify"
          style={{ border: 0 }}
        />
        <a
          href={embed.originalUrl}
          target="_blank"
          rel="noopener noreferrer"
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-medium transition-colors ${
            isMe ? "text-primary-foreground/70 hover:text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <span className="text-green-500">●</span>
          Spotify
          <ExternalLink className="w-2.5 h-2.5 ml-auto" />
        </a>
      </div>
    );
  }

  return null;
};

export default MediaEmbed;
