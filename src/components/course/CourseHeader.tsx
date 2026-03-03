import { ArrowLeft, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Progress } from "@/components/ui/progress";

interface CourseHeaderProps {
  title: string;
  description: string | null;
  level: string;
  lessonCount: number;
  completedSections: number;
  totalSections: number;
  lang: string;
}

const CourseHeader = ({ title, description, level, lessonCount, completedSections, totalSections, lang }: CourseHeaderProps) => {
  const navigate = useNavigate();
  const progressPercent = totalSections > 0 ? Math.round((completedSections / totalSections) * 100) : 0;

  return (
    <div className="mb-6">
      <button
        onClick={() => navigate("/shop")}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4 transition-colors group"
      >
        <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
        {lang === "uk" ? "Магазин" : "Магазин"}
      </button>

      <div className="relative overflow-hidden rounded-2xl border border-border/30">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/15 via-card to-card" />
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
        
        <div className="relative p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 glow-yellow">
              <span className="text-primary font-display font-bold text-sm">{level}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-display text-lg font-bold text-foreground leading-tight">{title}</h1>
              {description && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{description}</p>
              )}
            </div>
          </div>

          {/* Progress section */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3 h-3" />
                {lessonCount} {lang === "uk" ? "уроків" : "уроков"}
              </span>
              <span className="text-primary font-semibold">{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-1.5 bg-secondary" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseHeader;
