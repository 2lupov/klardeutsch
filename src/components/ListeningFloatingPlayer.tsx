import { Headphones, Pause, Play, X } from "lucide-react";
import { useListeningAudio } from "@/contexts/ListeningAudioContext";

const ListeningFloatingPlayer = () => {
  const { currentTitle, playing, loading, toggle, stop } = useListeningAudio();

  if (!currentTitle) return null;

  return (
    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 pl-3 pr-2 py-2 rounded-full bg-card/95 backdrop-blur-xl border border-primary/20 shadow-lg shadow-primary/10 transition-all animate-slide-up max-w-[90vw]">
      <Headphones className="w-3.5 h-3.5 text-primary flex-shrink-0" />
      <span className="text-xs font-display font-medium text-foreground truncate max-w-[140px]">
        {currentTitle}
      </span>

      {loading ? (
        <span className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="animate-pulse text-[10px] text-primary">...</span>
        </span>
      ) : (
        <button
          onClick={toggle}
          className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary hover:bg-primary/20 transition-colors"
        >
          {playing ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
        </button>
      )}

      {playing && <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse flex-shrink-0" />}

      <button
        onClick={stop}
        className="w-6 h-6 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

export default ListeningFloatingPlayer;
