import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  /** Куди вести. Якщо не передано — navigate(-1). */
  to?: string;
  label?: string;
  className?: string;
  onClick?: () => void;
}

/**
 * Єдина фірмова кнопка повернення на попередню сторінку.
 * Темна скляна пігулка з жовтим акцентом при наведенні.
 */
const BackButton = ({ to, label, className, onClick }: BackButtonProps) => {
  const navigate = useNavigate();
  const { t } = useLanguage();

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }
    if (to) navigate(to);
    else navigate(-1);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={label ?? t("back")}
      className={cn(
        "group inline-flex items-center gap-2 rounded-full",
        "border border-border/60 bg-card/60 backdrop-blur-md",
        "px-4 py-2 text-sm font-medium text-muted-foreground",
        "shadow-sm transition-all duration-200",
        "hover:border-primary/50 hover:text-foreground hover:shadow-[0_0_20px_-4px_hsl(var(--primary)/0.5)]",
        "active:scale-95",
        className,
      )}
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-muted/60 transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-200 group-hover:-translate-x-0.5" />
      </span>
      {label ?? t("back")}
    </button>
  );
};

export default BackButton;
