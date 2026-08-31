import { BookOpen } from "lucide-react";
import type { BookTaskContent } from "@/lib/books";

/**
 * Read-only rendering of a recognised theory block from a textbook page:
 * summary, rules, declension/conjugation table, examples and Redemittel.
 * `tone="admin"` uses the light admin palette, `tone="app"` uses design tokens.
 */
export default function BookTheoryBlock({
  title,
  content,
  tone = "app",
}: {
  title?: string | null;
  content: BookTaskContent | null | undefined;
  tone?: "admin" | "app";
}) {
  if (!content) return null;

  const admin = tone === "admin";
  const cls = {
    wrap: admin
      ? "rounded-xl border border-amber-200 bg-amber-50/60 p-3"
      : "rounded-2xl border border-primary/20 bg-primary/5 p-4",
    title: admin ? "text-sm font-semibold text-slate-900" : "text-base font-semibold",
    text: admin ? "text-xs text-slate-700" : "text-sm text-foreground/80",
    muted: admin ? "text-[11px] text-slate-500" : "text-xs text-muted-foreground",
    cell: admin ? "border-slate-200 text-slate-700" : "border-border text-foreground/80",
    chip: admin ? "bg-white border-amber-200" : "bg-background border-border",
  };

  const rules = (content.rules ?? []).filter(Boolean) as string[];
  const examples = (content.examples ?? []).filter((e) => e?.de || e?.uk);
  const phrases = (content.phrases ?? []).filter((e) => e?.de || e?.uk);
  const table = content.table;
  const hasTable = !!table?.rows?.length;

  return (
    <div className={cls.wrap}>
      <div className="flex items-center gap-2">
        <BookOpen className={admin ? "w-4 h-4 text-amber-600" : "w-4 h-4 text-primary"} />
        <h3 className={cls.title}>{title || "Теорія"}</h3>
        <span className={cls.muted}>правило / пояснення</span>
      </div>

      {content.summary && (
        <p className={`mt-2 whitespace-pre-wrap ${cls.text}`}>{content.summary}</p>
      )}

      {rules.length > 0 && (
        <ul className={`mt-2.5 space-y-1 ${cls.text}`}>
          {rules.map((r, i) => (
            <li key={i} className="flex gap-2">
              <span className={admin ? "text-amber-600" : "text-primary"}>•</span>
              <span>{r}</span>
            </li>
          ))}
        </ul>
      )}

      {hasTable && (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-left border-collapse">
            {!!table?.headers?.length && (
              <thead>
                <tr>
                  {table.headers.map((h, i) => (
                    <th
                      key={i}
                      className={`border px-2 py-1.5 text-xs font-semibold ${cls.cell} ${admin ? "bg-white" : "bg-background"}`}
                    >
                      {h ?? ""}
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {(table?.rows ?? []).map((row, ri) => (
                <tr key={ri}>
                  {row.map((c, ci) => (
                    <td key={ci} className={`border px-2 py-1.5 text-xs ${cls.cell}`}>
                      {c ?? ""}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {examples.length > 0 && (
        <div className="mt-3 space-y-1.5">
          <p className={cls.muted}>Приклади</p>
          {examples.map((e, i) => (
            <div key={i} className={`rounded-lg border px-2.5 py-1.5 ${cls.chip}`}>
              <p className={admin ? "text-xs font-medium text-slate-900" : "text-sm font-medium"}>
                {e.de}
              </p>
              {e.uk && <p className={cls.muted}>{e.uk}</p>}
            </div>
          ))}
        </div>
      )}

      {phrases.length > 0 && (
        <div className="mt-3">
          <p className={cls.muted}>Корисні фрази та лексика</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {phrases.map((p, i) => (
              <span
                key={i}
                className={`rounded-lg border px-2 py-1 text-xs ${cls.chip}`}
                title={p.uk ?? undefined}
              >
                <b className={admin ? "text-slate-900" : ""}>{p.de}</b>
                {p.uk ? <span className={admin ? " text-slate-500" : " text-muted-foreground"}> — {p.uk}</span> : null}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
