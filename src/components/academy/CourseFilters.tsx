import type { Lang } from "@/i18n/translations";

interface Props {
  lang: Lang;
  levels: string[];
  tags: string[];
  levelFilter: string;
  tagFilter: string;
  onLevelChange: (v: string) => void;
  onTagChange: (v: string) => void;
}

const levelLabels: Record<string, string> = {
  all: "Все",
  A1: "A1",
  A2: "A2",
  B1: "B1",
  B2: "B2",
  C1: "C1",
};

const CourseFilters = ({ lang, levels, tags, levelFilter, tagFilter, onLevelChange, onTagChange }: Props) => (
  <div className="mb-6 space-y-3">
    {/* Level pills */}
    <div className="flex flex-wrap gap-2">
      {levels.map((lv) => (
        <button
          key={lv}
          onClick={() => onLevelChange(lv)}
          className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
            levelFilter === lv
              ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
              : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
          }`}
        >
          {lv === "all" ? (lang === "uk" ? "Усі" : "Все") : lv}
        </button>
      ))}
    </div>

    {/* Tag pills */}
    {tags.length > 0 && (
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => onTagChange("all")}
          className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
            tagFilter === "all"
              ? "bg-primary/15 text-primary border border-primary/30"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          }`}
        >
          {lang === "uk" ? "Усі теми" : "Все темы"}
        </button>
        {tags.map((tag) => (
          <button
            key={tag}
            onClick={() => onTagChange(tag)}
            className={`px-3 py-1 rounded-full text-[11px] font-medium transition-all ${
              tagFilter === tag
                ? "bg-primary/15 text-primary border border-primary/30"
                : "bg-muted/50 text-muted-foreground hover:bg-muted"
            }`}
          >
            {tag}
          </button>
        ))}
      </div>
    )}
  </div>
);

export default CourseFilters;
