import { useTargetLanguage, TargetLang } from "@/contexts/TargetLanguageContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Check, Globe } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

interface Props {
  variant?: "compact" | "full";
  className?: string;
}

export default function TargetLanguageSwitcher({ variant = "compact", className }: Props) {
  const { targetLang, setTargetLang, activeLanguages, languages } = useTargetLanguage();
  const { lang: uiLang } = useLanguage();

  const current = languages.find((l) => l.code === targetLang);
  const nameOf = (l: (typeof languages)[number]) =>
    uiLang === "uk" ? l.name_uk : l.name_ru;

  const handleSelect = async (code: TargetLang) => {
    await setTargetLang(code);
    toast.success(
      uiLang === "uk"
        ? `Мова навчання: ${nameOf(languages.find((l) => l.code === code)!)}`
        : `Язык обучения: ${nameOf(languages.find((l) => l.code === code)!)}`
    );
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={variant === "compact" ? "sm" : "default"}
          className={className}
        >
          {current ? (
            <span className="flex items-center gap-2">
              <span className="text-lg leading-none">{current.flag_emoji}</span>
              {variant === "full" && <span>{current.name_native}</span>}
            </span>
          ) : (
            <Globe className="w-4 h-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-50 bg-background">
        <DropdownMenuLabel>
          {uiLang === "uk" ? "Що вивчаєш?" : "Что учишь?"}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {languages.map((l) => {
          const disabled = !l.is_active;
          return (
            <DropdownMenuItem
              key={l.code}
              disabled={disabled}
              onClick={() => !disabled && handleSelect(l.code)}
              className="flex items-center gap-2 cursor-pointer"
            >
              <span className="text-lg">{l.flag_emoji}</span>
              <span className="flex-1">{l.name_native}</span>
              {l.code === targetLang && <Check className="w-4 h-4 text-primary" />}
              {disabled && (
                <span className="text-[10px] uppercase text-muted-foreground">
                  soon
                </span>
              )}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
