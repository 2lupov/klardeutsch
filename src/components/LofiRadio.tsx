import { Music } from "lucide-react";
import { useLofi } from "@/contexts/LofiContext";

const LofiRadio = () => {
  const { playing, toggle } = useLofi();

  return (
    <button
      onClick={toggle}
      className={`p-2 rounded-full transition-all ${
        playing
          ? "bg-primary/15 text-primary shadow-[0_0_10px_hsl(var(--primary)/0.2)]"
          : "bg-muted/50 text-muted-foreground hover:text-foreground hover:bg-muted"
      }`}
      title="Lofi Radio"
    >
      <Music className="w-4 h-4" />
      {playing && (
        <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-primary animate-pulse" />
      )}
    </button>
  );
};

export default LofiRadio;
