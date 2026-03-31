import { useState } from "react";
import { Check } from "lucide-react";

const PRESET_AVATARS = [
  { id: "ua-1", url: "/avatars/ua-1.png", label: "🇺🇦 Вишиванка" },
  { id: "ua-2", url: "/avatars/ua-2.png", label: "🇺🇦 Козак" },
  { id: "de-1", url: "/avatars/de-1.png", label: "🇩🇪 Баварець" },
  { id: "de-2", url: "/avatars/de-2.png", label: "🇩🇪 Поліцай" },
  { id: "neutral-1", url: "/avatars/neutral-1.png", label: "🥷 Ніндзя" },
  { id: "neutral-2", url: "/avatars/neutral-2.png", label: "🚀 Космонавт" },
  { id: "neutral-3", url: "/avatars/neutral-3.png", label: "🎓 Професор" },
  { id: "neutral-4", url: "/avatars/neutral-4.png", label: "🎧 Діджей" },
  { id: "neutral-5", url: "/avatars/neutral-5.png", label: "🎨 Художник" },
  { id: "neutral-6", url: "/avatars/neutral-6.png", label: "🧙 Чарівник" },
];

interface AvatarPickerProps {
  currentUrl?: string | null;
  onSelect: (url: string) => void;
  loading?: boolean;
}

const AvatarPicker = ({ currentUrl, onSelect, loading }: AvatarPickerProps) => {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (url: string) => {
    setSelected(url);
    onSelect(url);
  };

  return (
    <div className="grid grid-cols-5 gap-2">
      {PRESET_AVATARS.map((avatar) => {
        const isActive = selected === avatar.url || (!selected && currentUrl?.includes(avatar.id));
        return (
          <button
            key={avatar.id}
            onClick={() => handleSelect(avatar.url)}
            disabled={loading}
            className={`relative rounded-xl overflow-hidden border-2 transition-all aspect-square ${
              isActive
                ? "border-primary ring-2 ring-primary/30 scale-105"
                : "border-border/50 hover:border-primary/50 hover:scale-105"
            } disabled:opacity-50`}
            title={avatar.label}
          >
            <img
              src={avatar.url}
              alt={avatar.label}
              className="w-full h-full object-cover"
            />
            {isActive && (
              <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                <Check className="w-5 h-5 text-primary drop-shadow-md" />
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
};

export { PRESET_AVATARS };
export default AvatarPicker;
