import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { kitBlocksToLessonBlocks, type KitSection } from "@/lib/lesson-kits";
import StudentBlocks from "./StudentBlocks";
import KitPageImages from "./KitPageImages";

interface Props {
  title: string;
  level?: string | null;
  sections: KitSection[];
  active?: number;
  onActiveChange?: (index: number) => void;
  readOnly?: boolean;
  showActions?: boolean;
  onSubmitted?: (score: number, max: number, values?: Record<string, any>) => void | Promise<void>;
  progress?: Record<string, { score: number; max: number }>;
  pagePaths?: string[];
  imageBucket?: "tutoring-materials" | "presentation-slides";
  draftKey?: string;
}

/** The same page for editor preview, assigned work, and course reading. */
export default function LessonReader({ title, level, sections, active, onActiveChange, readOnly, showActions = false, onSubmitted, progress, pagePaths = [], imageBucket, draftKey }: Props) {
  const [internalActive, setInternalActive] = useState(0);
  const current = Math.min(active ?? internalActive, Math.max(sections.length - 1, 0));
  const section = sections[current];
  const change = (next: number) => {
    setInternalActive(next);
    onActiveChange?.(next);
  };
  if (section?.layout === "labor") {
    const hasNext = current < sections.length - 1;
    return (
      <div className="lesson-reader fixed inset-0 z-50 flex flex-col bg-background text-foreground" style={{ ["--model-frame-h" as string]: "calc(100dvh - 7.5rem)" }}>
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-border px-4 py-2">
          <div className="min-w-0">
            <p className="text-[10px] font-semibold uppercase text-primary">KLAR · Labor · {current + 1} / {sections.length}</p>
            <h2 className="truncate font-display text-base font-semibold">🔬 {section.title.replace(/^🔬\s*/, "")}</h2>
          </div>
          {current > 0 && <Button type="button" size="sm" variant="ghost" onClick={() => change(current - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Назад</Button>}
        </header>
        <main className="min-h-0 flex-1 overflow-auto px-2 py-2">
          <StudentBlocks key={`${draftKey ?? title}:${section.id}`} blocks={kitBlocksToLessonBlocks(section.blocks.filter((b) => b.visible_to_student !== false), section.id)} persist={false} readOnly={readOnly} showActions={false} editorial draftKey={draftKey ? `${draftKey}:${section.id}` : undefined} />
        </main>
        {hasNext && <Button type="button" size="lg" className="fixed bottom-4 right-4 z-10 shadow-lg" onClick={() => change(current + 1)}>Перейти до вправ<ChevronRight className="ml-1 h-4 w-4" /></Button>}
      </div>
    );
  }
  return (
    <div className="lesson-reader min-h-full bg-background text-foreground">
      <div className="mx-auto w-full max-w-5xl px-4 py-7 sm:px-8 sm:py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-border pb-5">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-primary">KLAR · {level ?? "Deutsch"}</p>
            <h1 className="font-display text-2xl font-semibold leading-tight sm:text-3xl">{title}</h1>
          </div>
          <p className="text-xs text-muted-foreground">{current + 1} / {sections.length}</p>
        </div>
        <div className="mb-5"><KitPageImages paths={pagePaths} bucket={imageBucket} /></div>
        {sections.length > 1 && <nav aria-label="Теми уроку" className="mb-8 flex gap-2 overflow-x-auto border-b border-border pb-4">
          {sections.map((s, i) => <Button type="button" key={s.id} size="sm" variant={i === current ? "default" : "ghost"} onClick={() => change(i)} className="shrink-0">{progress?.[s.id] ? "✓ " : ""}{String(i + 1).padStart(2, "0")} · {s.title}</Button>)}
        </nav>}
        {section && <article className={cn("mx-auto w-full", section.layout === "reading" ? "max-w-4xl" : section.layout === "illustrated" ? "max-w-5xl" : "max-w-3xl")}>
          {sections.length > 1 && <div className="mb-4"><span className="text-xs font-semibold uppercase text-primary">Thema {String(current + 1).padStart(2, "0")}</span><h2 className="mt-1 font-display text-2xl font-semibold leading-tight">{section.title}</h2>{section.summary && <p className="mt-2 text-sm leading-6 text-muted-foreground">{section.summary}</p>}</div>}
          <div className={cn("lesson-page", `lesson-layout-${section.layout ?? "grammar"}`)}>
            <StudentBlocks key={`${draftKey ?? title}:${section.id}`} blocks={kitBlocksToLessonBlocks(section.blocks.filter((b) => b.visible_to_student !== false), section.id)} persist={false} readOnly={readOnly} showActions={showActions} onSubmitted={onSubmitted} editorial draftKey={draftKey ? `${draftKey}:${section.id}` : undefined} />
          </div>
        </article>}
        {sections.length > 1 && <div className="mx-auto mt-6 flex max-w-3xl justify-between border-t border-border pt-5">
          <Button type="button" variant="outline" disabled={current === 0} onClick={() => change(current - 1)}><ChevronLeft className="mr-1 h-4 w-4" />Попередня</Button>
          <Button type="button" variant="outline" disabled={current >= sections.length - 1} onClick={() => change(current + 1)}>Наступна<ChevronRight className="ml-1 h-4 w-4" /></Button>
        </div>}
      </div>
    </div>
  );
}