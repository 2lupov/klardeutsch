import { ARTIKEL_CLASS, type LessonBlock } from "./types";

/** Блок теорії: правило українською + німецькі приклади. */
export default function TheorieBlock({ block }: { block: LessonBlock }) {
  const p = block.payload || {};
  const lines = String(p.markdown ?? "").split("\n");

  return (
    <div className="space-y-4">
      {p.instructions && <p className="text-sm text-muted-foreground">{p.instructions}</p>}

      <div className="rounded-2xl border bg-card p-4 space-y-2">
        {lines.map((raw, i) => {
          const l = raw.trim();
          if (!l) return <div key={i} className="h-1" />;
          if (l.startsWith("### ")) return <h4 key={i} className="text-sm font-semibold">{inline(l.slice(4))}</h4>;
          if (l.startsWith("## ")) return <h3 key={i} className="text-base font-bold">{inline(l.slice(3))}</h3>;
          if (l.startsWith("# ")) return <h3 key={i} className="text-lg font-bold">{inline(l.slice(2))}</h3>;
          if (/^[-*]\s/.test(l))
            return (
              <div key={i} className="flex gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span>{inline(l.replace(/^[-*]\s/, ""))}</span>
              </div>
            );
          return <p key={i} className="text-sm leading-relaxed">{inline(l)}</p>;
        })}
      </div>

      {(p.examples ?? []).length > 0 && (
        <div className="space-y-2">
          {(p.examples ?? []).map((ex, i) => (
            <div key={i} className="rounded-xl border-l-4 border-primary/60 bg-muted/40 px-3 py-2">
              <p className="text-sm font-medium">{ex.de}</p>
              {ex.uk && <p className="text-xs text-muted-foreground">{ex.uk}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** **жирне**, `код` і артиклі der/die/das кольорами. */
function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`|\b(?:der|die|das)\b)/g).filter(Boolean);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**"))
      return <strong key={i} className="font-semibold">{part.slice(2, -2)}</strong>;
    if (part.startsWith("`") && part.endsWith("`"))
      return <code key={i} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">{part.slice(1, -1)}</code>;
    if (part === "der" || part === "die" || part === "das")
      return (
        <span key={i} className={`rounded border px-1 font-medium ${ARTIKEL_CLASS[part]}`}>
          {part}
        </span>
      );
    return <span key={i}>{part}</span>;
  });
}
