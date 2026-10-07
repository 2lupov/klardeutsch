import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Lock, Search, Play, Sparkles, X, Languages } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { listPresentations, type Presentation } from "@/lib/presentations";
import PresentationView from "@/components/tutoring/PresentationView";

const LEVELS = ["Усі", "A1", "A2", "B1", "B2", "C1"] as const;
const KIND_ICON: Record<string, string> = { pdf: "📄", interactive: "✨", game: "🎮", test: "📝" };

/** «Мій KLAR» — приватна студія адміна: сам собі видаєш презентації, відповіді зберігаються як в учня. */
export default function MyKlar() {
  const { user, loading } = useAuth() as any;
  const [ok, setOk] = useState<boolean | null>(null);
  const [items, setItems] = useState<Presentation[]>([]);
  const [touched, setTouched] = useState<Record<string, string>>({});
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("Усі");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Presentation | null>(null);
  const [page, setPage] = useState(0);

  useEffect(() => { document.title = "Мій KLAR — особиста студія"; }, []);
  useEffect(() => {
    if (loading) return;
    if (!user) { setOk(false); return; }
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => setOk(!!data));
  }, [user, loading]);

  const loadProgress = () => {
    if (!user) return;
    supabase.from("presentation_progress").select("presentation_id, updated_at").eq("student_id", user.id)
      .then(({ data }) => setTouched(Object.fromEntries((data ?? []).map((r: any) => [r.presentation_id, r.updated_at]))));
  };
  useEffect(() => {
    if (!ok) return;
    listPresentations().then((l) => setItems(l.filter((p) => !p.archived)));
    loadProgress();
  }, [ok]);

  const filtered = useMemo(() => items.filter((p) =>
    (level === "Усі" || p.level === level) && p.title.toLowerCase().includes(q.toLowerCase())), [items, level, q]);
  const inProgress = useMemo(() => items.filter((p) => touched[p.id])
    .sort((a, b) => touched[b.id].localeCompare(touched[a.id])), [items, touched]);

  if (ok === null) return <div className="h-[100dvh] flex items-center justify-center bg-background text-muted-foreground">Завантаження…</div>;
  if (!ok) return (
    <div className="h-[100dvh] flex flex-col items-center justify-center gap-3 bg-background text-foreground">
      <Lock className="h-10 w-10" /><p>Приватна сторінка</p><Link to="/" className="underline text-sm">На головну</Link>
    </div>
  );

  const start = (p: Presentation) => {
    setPage(Number(localStorage.getItem(`klar-my-page:${p.id}`) || 0));
    setOpen(p);
  };
  const go = (n: number) => {
    if (!open) return;
    const max = Math.max(0, (open.page_count || 1) - 1);
    const next = Math.min(max, Math.max(0, n));
    setPage(next);
    localStorage.setItem(`klar-my-page:${open.id}`, String(next));
  };

  if (open) return (
    <div className="dark h-[100dvh] flex flex-col bg-background text-foreground">
      <header className="flex items-center gap-3 px-4 py-2.5 border-b border-border/60">
        <button onClick={() => { setOpen(null); loadProgress(); }} className="rounded-lg p-1.5 hover:bg-muted" aria-label="Закрити"><X className="h-4 w-4" /></button>
        <p className="font-semibold truncate flex-1">{open.title}</p>
        <span className="font-mono text-xs text-muted-foreground">{page + 1} / {open.page_count || 1}</span>
        <button onClick={() => go(page - 1)} className="rounded-lg p-1.5 hover:bg-muted" aria-label="Назад"><ChevronLeft className="h-4 w-4" /></button>
        <button onClick={() => go(page + 1)} className="rounded-lg p-1.5 hover:bg-muted" aria-label="Далі"><ChevronRight className="h-4 w-4" /></button>
      </header>
      <main className="flex-1 min-h-0 p-3 md:p-5">
        <div className="h-full rounded-2xl border border-border/60 overflow-hidden bg-card">
          <PresentationView presentationId={open.id} page={page} progressStudentId={user.id} />
        </div>
      </main>
    </div>
  );

  return (
    <div className="dark h-[100dvh] overflow-y-auto bg-background text-foreground">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 space-y-8">
        <header className="flex items-center gap-3">
          <Link to="/admin" className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"><ArrowLeft className="h-4 w-4" /></Link>
          <div className="flex-1">
            <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">studio · private</p>
            <h1 className="text-2xl md:text-3xl font-bold">Мій KLAR</h1>
          </div>
          <Link to="/dutch" className="flex items-center gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm hover:bg-muted">
            <Languages className="h-4 w-4" /> Нідерландська
          </Link>
        </header>

        <div className="grid grid-cols-3 gap-3">
          {[["Матеріалів", items.length], ["У процесі", inProgress.length], ["Рівень", level]].map(([k, v]) => (
            <div key={k as string} className="rounded-2xl border border-border/60 bg-card/60 p-4">
              <p className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">{k}</p>
              <p className="text-2xl font-bold mt-1">{v}</p>
            </div>
          ))}
        </div>

        {inProgress.length > 0 && (
          <section className="space-y-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground"><Sparkles className="h-4 w-4 text-accent" /> Продовжити</h2>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {inProgress.map((p) => (
                <button key={p.id} onClick={() => start(p)}
                  className="shrink-0 w-64 text-left rounded-2xl border border-accent/40 bg-card p-4 hover:shadow-[0_0_24px_-6px_hsl(var(--accent)/0.5)] transition">
                  <p className="text-lg">{KIND_ICON[p.kind] ?? "📄"}</p>
                  <p className="font-semibold line-clamp-2 mt-1">{p.title}</p>
                  <p className="font-mono text-[11px] text-muted-foreground mt-2">{new Date(touched[p.id]).toLocaleDateString("uk-UA")} · {p.level ?? "—"}</p>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2 flex-1 min-w-[200px] rounded-xl border border-border/60 bg-card/60 px-3 py-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Пошук матеріалу…" className="bg-transparent outline-none text-sm flex-1" />
            </div>
            <div className="flex gap-1 rounded-xl border border-border/60 p-1">
              {LEVELS.map((l) => (
                <button key={l} onClick={() => setLevel(l)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-mono ${level === l ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted"}`}>{l}</button>
              ))}
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <div key={p.id} className="group rounded-2xl border border-border/60 bg-card/60 p-4 flex flex-col gap-3 hover:border-accent/50 transition">
                <div className="flex items-start gap-2">
                  <span className="text-lg">{KIND_ICON[p.kind] ?? "📄"}</span>
                  <p className="font-medium line-clamp-2 flex-1">{p.title}</p>
                </div>
                <div className="flex items-center gap-2 mt-auto">
                  <span className="font-mono text-[11px] text-muted-foreground">{p.level ?? "—"} · {p.page_count || 1} сл.</span>
                  {touched[p.id] && <span className="text-[11px] text-accent">● розпочато</span>}
                  <button onClick={() => start(p)} className="ml-auto flex items-center gap-1.5 rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-xs font-semibold">
                    <Play className="h-3 w-3" /> {touched[p.id] ? "Продовжити" : "Взяти на вивчення"}
                  </button>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <p className="text-sm text-muted-foreground">Нічого не знайдено.</p>}
          </div>
        </section>
      </div>
    </div>
  );
}
