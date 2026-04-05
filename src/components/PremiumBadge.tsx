import { Crown } from "lucide-react";

interface Props {
  className?: string;
  size?: "sm" | "md";
}

const PremiumBadge = ({ className = "", size = "sm" }: Props) => {
  const sizeClasses = size === "sm"
    ? "text-[10px] px-1.5 py-0.5 gap-0.5"
    : "text-xs px-2 py-1 gap-1";
  const iconSize = size === "sm" ? "w-2.5 h-2.5" : "w-3.5 h-3.5";

  return (
    <span className={`inline-flex items-center ${sizeClasses} rounded-full bg-primary/20 text-primary font-bold ${className}`}>
      <Crown className={iconSize} />
      PRO
    </span>
  );
};

export default PremiumBadge;
