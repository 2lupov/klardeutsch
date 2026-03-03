import { Music, X } from "lucide-react";
import { useLofi } from "@/contexts/LofiContext";

const LofiFloatingPlayer = () => {
  const { playing, toggle } = useLofi();

  if (!playing) return null;

  return (
    <button
      onClick={toggle}
      className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-2 rounded-full bg-card/90 backdrop-blur-xl border border-primary/20 shadow-lg shadow-primary/10 transition-all hover:border-primary/40 group"
    >
      <Music className="w-3.5 h-3.5 text-primary" />
      <span className="text-xs font-display font-medium text-primary">Lofi</span>
      <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
      <X className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
};

export default LofiFloatingPlayer;
