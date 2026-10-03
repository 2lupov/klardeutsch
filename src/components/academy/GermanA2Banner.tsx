import { useNavigate } from "react-router-dom";
import { ChevronRight, GraduationCap } from "lucide-react";

const GermanA2Banner = () => {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate("/course/a2")}
      className="w-full mb-5 flex items-center gap-4 rounded-2xl border border-primary/30 bg-primary/10 p-4 text-left transition hover:bg-primary/15"
    >
      <div className="w-12 h-12 shrink-0 rounded-xl bg-primary/20 flex items-center justify-center">
        <GraduationCap className="w-6 h-6 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">Інтерактивний курс · A2 · 500 грн</p>
        <p className="font-display font-bold text-foreground">Deutsch A2 — Perfekt</p>
        <p className="text-xs text-muted-foreground">Відео, слова, граматика, читання, аудіювання, письмо й тест</p>
      </div>
      <ChevronRight className="w-5 h-5 text-muted-foreground" />
    </button>
  );
};

export default GermanA2Banner;
