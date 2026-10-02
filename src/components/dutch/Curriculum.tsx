import { useEffect, useState } from "react";
import { Lock, Check, Loader2 } from "lucide-react";
import { CURRICULUM, type CourseLevel } from "@/lib/curriculum";
import { getProgressMap, resolveStatus, type ModuleStatus } from "@/lib/moduleStore";
import Module from "./Module";

const LEVELS: CourseLevel[] = ["A0", "A1", "A2", "B1", "B2"];

export default function Curriculum() {
  const [progress, setProgress] = useState<Map<string, any> | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  const refresh = async () => setProgress(await getProgressMap());
  useEffect(() => { refresh(); }, []);

  if (openId) return <Module moduleId={openId} onExit={() => { setOpenId(null); refresh(); }} />;

  if (!progress) {
    return <div className="h-full flex items-center justify-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Загружаю программу…</div>;
  }

  const passedCount = CURRICULUM.filter((m) => progress.get(m.id)?.status === "passed").length;

  return (
    <div className="h-full overflow-y-auto min-h-0 space-y-6 pr-1 pb-6">
      <div className="rounded-2xl border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Пройдено модулей: <b className="text-foreground">{passedCount}</b> / {CURRICULUM.length}</p>
        <div className="mt-2 h-2 rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: `${(passedCount / CURRICULUM.length) * 100}%` }} />
        </div>
      </div>

      {LEVELS.map((lvl) => {
        const mods = CURRICULUM.filter((m) => m.level === lvl);
        return (
          <div key={lvl}>
            <h2 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">{lvl}</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {mods.map((m) => {
                const status: ModuleStatus = resolveStatus(m, progress);
                const row = progress.get(m.id);
                return (
                  <button
                    key={m.id}
                    disabled={status === "locked"}
                    onClick={() => setOpenId(m.id)}
                    className={`text-left rounded-xl border border-border p-3 transition ${
                      status === "locked" ? "opacity-40 cursor-not-allowed" :
                      status === "passed" ? "bg-emerald-500/10 hover:bg-emerald-500/20" :
                      "bg-card hover:bg-muted"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {status === "locked" && <Lock className="h-3.5 w-3.5 text-muted-foreground" />}
                      {status === "passed" && <Check className="h-3.5 w-3.5 text-emerald-400" />}
                      <span className="text-sm font-medium">{m.title}</span>
                    </div>
                    {row?.best_score != null && (
                      <p className="text-xs text-muted-foreground mt-0.5">лучший результат: {Math.round(row.best_score * 100)}%</p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
