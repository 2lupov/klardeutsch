import { useLanguage } from "@/contexts/LanguageContext";
import { Lang } from "@/i18n/translations";

const options: { value: Lang; label: string }[] = [
  { value: "ru", label: "RU" },
  { value: "uk", label: "UA" },
];

const LanguageSwitcher = () => {
  const { lang, setLang } = useLanguage();

  return (
    <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setLang(opt.value)}
          className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-all ${
            lang === opt.value
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;
