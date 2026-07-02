import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, SectionHeader } from "./_ui";
import { Sparkles, Loader2, BookOpen, Brain, ScrollText, Headphones } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const TYPES = [
  { key: "vocab", label: "Словник", icon: BookOpen },
  { key: "grammar", label: "Граматика", icon: Brain },
  { key: "reading", label: "Читання", icon: ScrollText },
  { key: "listening", label: "Аудіювання", icon: Headphones },
];
const LEVELS = ["A1", "A2", "B1", "B2", "C1"];

export default function ExerciseStudioPage() {
  const [content, setContent] = useState("");
  const [level, setLevel] = useState("A1");
  const [selected, setSelected] = useState<string[]>(["vocab", "grammar"]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const toggle = (k: string) =>
    setSelected((s) => s.includes(k) ? s.filter((x) => x !== k) : [...s, k]);

  const generate = async () => {
    if (!content.trim() || selected.length === 0) {
      toast({ title: "Введи матеріал і обери типи" });
      return;
    }
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-exercises", {
        body: { content, level, types: selected },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setResult((data as any).exercises);
      toast({ title: "Готово" });
    } catch (e: any) {
      toast({ title: "Помилка", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Exercise Studio"
        subtitle="Згенеруй набір вправ з будь-якого тексту — словник, граматика, читання, аудіювання"
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5 space-y-4">
          <div>
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Матеріал</label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Встав текст, урок, тему..."
              className="mt-2 w-full min-h-[220px] px-3 py-2 rounded-lg border border-slate-200 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Рівень</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)}
                className="mt-2 w-full px-3 py-2 rounded-lg border border-slate-200 text-sm">
                {LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600 uppercase tracking-wide">Типи вправ</label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {TYPES.map(({ key, label, icon: Icon }) => (
                <button key={key} onClick={() => toggle(key)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all ${
                    selected.includes(key)
                      ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}>
                  <Icon className="w-4 h-4" /> {label}
                </button>
              ))}
            </div>
          </div>

          <button onClick={generate} disabled={loading}
            className="w-full px-4 py-2.5 rounded-xl text-white font-medium flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: "#4F46E5" }}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? "Генерую..." : "Згенерувати"}
          </button>
        </Card>

        <Card className="p-5">
          <SectionHeader title="Результат" subtitle="JSON preview — використай для копіювання або створення уроку" />
          {!result ? (
            <div className="h-[420px] rounded-xl bg-slate-50 flex items-center justify-center text-sm text-slate-400">
              Тут з'явиться результат
            </div>
          ) : (
            <pre className="text-[11px] p-3 rounded-xl bg-slate-900 text-slate-100 overflow-auto max-h-[500px]">
{JSON.stringify(result, null, 2)}
            </pre>
          )}
        </Card>
      </div>
    </div>
  );
}
