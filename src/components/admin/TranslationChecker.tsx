import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Wrench, CheckCircle2, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface TranslationError {
  type: "vocab" | "override" | "grammar";
  id: string;
  field: string;
  current: string;
  suggested: string;
  reason: string;
  selected?: boolean;
}

type TrafficLight = "idle" | "scanning" | "red" | "yellow" | "green";

const TranslationChecker = () => {
  const [status, setStatus] = useState<TrafficLight>("idle");
  const [errors, setErrors] = useState<TranslationError[]>([]);
  const [scanned, setScanned] = useState<{ vocab: number; overrides: number; grammar: number } | null>(null);
  const [fixing, setFixing] = useState(false);

  const handleScan = async () => {
    setStatus("scanning");
    setErrors([]);
    setScanned(null);

    try {
      const { data, error } = await supabase.functions.invoke("check-translations", {
        body: { action: "scan" },
      });

      if (error) throw error;

      const errs: TranslationError[] = (data.errors ?? []).map((e: any) => ({
        ...e,
        selected: true,
      }));

      setErrors(errs);
      setScanned(data.scanned);
      setStatus(errs.length > 0 ? "red" : "green");

      if (errs.length === 0) {
        toast.success("Всё идеально! Ошибок не найдено 🎉");
      } else {
        toast.warning(`Найдено ${errs.length} ошибок`);
      }
    } catch (e: any) {
      console.error("Scan error:", e);
      toast.error(e.message || "Ошибка сканирования");
      setStatus("idle");
    }
  };

  const handleFix = async () => {
    const selectedFixes = errors.filter((e) => e.selected);
    if (selectedFixes.length === 0) {
      toast.info("Выберите ошибки для исправления");
      return;
    }

    setFixing(true);
    setStatus("yellow");

    try {
      const { data, error } = await supabase.functions.invoke("check-translations", {
        body: {
          action: "fix",
          fixes: selectedFixes.map((f) => ({
            type: f.type,
            id: f.id,
            field: f.field,
            suggested: f.suggested,
          })),
        },
      });

      if (error) throw error;

      const successCount = (data.results ?? []).filter((r: any) => r.success).length;
      const failCount = (data.results ?? []).filter((r: any) => !r.success).length;

      // Remove fixed errors from list
      const fixedIds = new Set(
        (data.results ?? []).filter((r: any) => r.success).map((r: any) => r.id)
      );
      const remaining = errors.filter((e) => !fixedIds.has(e.id));
      setErrors(remaining);

      setStatus(remaining.length === 0 ? "green" : "red");

      if (failCount > 0) {
        toast.warning(`Исправлено ${successCount}, не удалось ${failCount}`);
      } else {
        toast.success(`Исправлено ${successCount} ошибок!`);
      }
    } catch (e: any) {
      console.error("Fix error:", e);
      toast.error(e.message || "Ошибка исправления");
      setStatus("red");
    } finally {
      setFixing(false);
    }
  };

  const toggleError = (index: number) => {
    setErrors((prev) =>
      prev.map((e, i) => (i === index ? { ...e, selected: !e.selected } : e))
    );
  };

  const toggleAll = (selected: boolean) => {
    setErrors((prev) => prev.map((e) => ({ ...e, selected })));
  };

  const typeLabel = (type: string) => {
    switch (type) {
      case "vocab": return "Словарь";
      case "override": return "Перевод UI";
      case "grammar": return "Грамматика";
      default: return type;
    }
  };

  const trafficLightColor = (light: "r" | "y" | "g") => {
    if (status === "green" && light === "g") return "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)]";
    if (status === "yellow" && light === "y") return "bg-yellow-500 shadow-[0_0_12px_rgba(234,179,8,0.6)]";
    if (status === "red" && light === "r") return "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]";
    return "bg-muted/30";
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header with traffic light */}
      <div className="glass-card p-5 flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-bold text-foreground flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            ИИ-проверка переводов
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            Сканирует карточки, грамматику и переводы интерфейса
          </p>
        </div>

        {/* Traffic light */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5 bg-muted/20 rounded-full px-3 py-2 border border-border">
            <div className={`w-4 h-4 rounded-full transition-all duration-500 ${trafficLightColor("r")}`} />
            <div className={`w-4 h-4 rounded-full transition-all duration-500 ${trafficLightColor("y")}`} />
            <div className={`w-4 h-4 rounded-full transition-all duration-500 ${trafficLightColor("g")}`} />
          </div>
        </div>
      </div>

      {/* Scan button */}
      <button
        onClick={handleScan}
        disabled={status === "scanning"}
        className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
      >
        {status === "scanning" ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Сканирование...
          </>
        ) : (
          <>
            <Search className="w-4 h-4" />
            Проверить весь сайт
          </>
        )}
      </button>

      {/* Scanned stats */}
      {scanned && (
        <div className="flex gap-2 text-xs text-muted-foreground">
          <span className="px-2 py-1 rounded-lg bg-muted/30">📚 Карточки: {scanned.vocab}</span>
          <span className="px-2 py-1 rounded-lg bg-muted/30">🌐 UI: {scanned.overrides}</span>
          <span className="px-2 py-1 rounded-lg bg-muted/30">📝 Грамматика: {scanned.grammar}</span>
        </div>
      )}

      {/* Error list */}
      {errors.length > 0 && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-display font-semibold text-foreground flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              Найдено ошибок: {errors.length}
            </h3>
            <div className="flex gap-2">
              <button
                onClick={() => toggleAll(true)}
                className="text-xs text-primary hover:underline"
              >
                Выбрать все
              </button>
              <button
                onClick={() => toggleAll(false)}
                className="text-xs text-muted-foreground hover:underline"
              >
                Снять все
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto space-y-2 pr-1">
            {errors.map((err, i) => (
              <div
                key={`${err.id}-${err.field}-${i}`}
                className={`glass-card p-3 flex items-start gap-3 transition-all cursor-pointer ${
                  err.selected ? "border-primary/30" : "opacity-60"
                }`}
                onClick={() => toggleError(i)}
              >
                <input
                  type="checkbox"
                  checked={err.selected}
                  onChange={() => toggleError(i)}
                  className="mt-1 accent-primary shrink-0"
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted/50 text-muted-foreground font-medium">
                      {typeLabel(err.type)}
                    </span>
                    <span className="text-[10px] text-muted-foreground">{err.field}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-destructive line-through truncate">{String(err.current)}</span>
                    <span className="text-muted-foreground">→</span>
                    <span className="text-primary font-medium truncate">{String(err.suggested)}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">{err.reason}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Fix button */}
          <button
            onClick={handleFix}
            disabled={fixing || errors.filter((e) => e.selected).length === 0}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-display font-semibold text-sm disabled:opacity-50 hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 mt-2"
          >
            {fixing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Исправляем...
              </>
            ) : (
              <>
                <Wrench className="w-4 h-4" />
                Исправить ({errors.filter((e) => e.selected).length})
              </>
            )}
          </button>
        </div>
      )}

      {/* Success state */}
      {status === "green" && errors.length === 0 && scanned && (
        <div className="glass-card p-6 text-center border-green-500/20">
          <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
          <p className="font-display font-semibold text-foreground">Всё идеально!</p>
          <p className="text-xs text-muted-foreground mt-1">Ошибок в переводах не найдено</p>
        </div>
      )}
    </div>
  );
};

export default TranslationChecker;
