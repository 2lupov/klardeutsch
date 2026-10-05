import { useEffect, useMemo, useState } from "react";
import { Link, Route, Routes, useNavigate, useParams, Navigate } from "react-router-dom";
import { BookOpen, CheckCircle2, GraduationCap, Search, Trophy } from "lucide-react";
import BackButton from "@/components/BackButton";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { EXAMS, L, MODULES, SECTIONS, Section, scoreExam, EXAM_SOURCE } from "./data";
import { useDrStore } from "./store";
import { SectionView, allVocab } from "./Sections";
import { ExamView } from "./Exam";
import { SayBtn, UI } from "./ui";

const BASE = "/a2";

export default function DeutschraumApp() {
  const { user } = useAuth();
  const { lang: appLang } = useLanguage();
  const [lang, setLang] = useState<L>(() => (localStorage.getItem("klar-dr-lang") as L) || (appLang === "uk" ? "uk" : "ru"));
  useEffect(() => { localStorage.setItem("klar-dr-lang", lang); }, [lang]);
  const { state, update } = useDrStore(user?.id);
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    if (!user) return;
    supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }).then(({ data }) => setIsAdmin(!!data));
  }, [user]);
  const ctx = { lang, state, update, isAdmin };

  return (
    <div className="h-[100dvh] overflow-y-auto bg-background text-foreground">
      <div className="max-w-4xl mx-auto px-4 py-4 pb-24 space-y-5">
        <header className="flex items-center justify-between gap-3 pl-12 md:pl-0">
          <Link to={BASE} className="font-display font-bold text-lg flex items-center gap-2"><GraduationCap className="w-5 h-5 text-primary" />{UI.course[lang]}</Link>
          <div className="flex rounded-full border border-border p-0.5">
            {(["uk", "ru", "de"] as L[]).map((l) => (
              <button key={l} onClick={() => setLang(l)} className={cn("px-2.5 py-1 rounded-full text-xs font-semibold", lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground")}>
                {l === "uk" ? "UA" : l.toUpperCase()}
              </button>
            ))}
          </div>
        </header>
        <Routes>
          <Route index element={<Overview {...ctx} />} />
          <Route path="module/:moduleId/:section" element={<ModulePage {...ctx} />} />
          <Route path="dictionary" element={<Dictionary lang={lang} />} />
          <Route path="exam" element={<ExamList {...ctx} />} />
          <Route path="exam/:examId" element={<ExamPage {...ctx} />} />
          <Route path="*" element={<Navigate to={BASE} replace />} />
        </Routes>
      </div>
    </div>
  );
}

type Ctx = { lang: L; state: ReturnType<typeof useDrStore>["state"]; update: ReturnType<typeof useDrStore>["update"]; isAdmin: boolean };

function Overview({ lang, state }: Ctx) {
  const total = MODULES.length * SECTIONS.length;
  const doneCount = Object.values(state.done).filter(Boolean).length;
  return (
    <div className="space-y-5">
      <BackButton to="/academy" />
      <div className="rounded-3xl border border-primary/30 bg-primary/10 p-5">
        <p className="text-sm text-muted-foreground">{UI.progress[lang]}</p>
        <p className="text-2xl font-display font-bold">{doneCount} / {total}</p>
        <div className="h-2 rounded-full bg-muted mt-2 overflow-hidden"><div className="h-full bg-primary" style={{ width: `${(doneCount / total) * 100}%` }} /></div>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Link to={`${BASE}/dictionary`} className="rounded-2xl border border-border bg-card/60 p-4 flex items-center gap-3 hover:border-primary/60"><BookOpen className="w-5 h-5 text-primary" />{UI.dictionary[lang]}</Link>
        <Link to={`${BASE}/exam`} className="rounded-2xl border border-border bg-card/60 p-4 flex items-center gap-3 hover:border-primary/60"><Trophy className="w-5 h-5 text-primary" />{UI.exam[lang]}</Link>
      </div>
      <h2 className="font-display font-bold text-lg">{UI.modules[lang]}</h2>
      <div className="grid sm:grid-cols-2 gap-3">
        {MODULES.map((m) => {
          const d = SECTIONS.filter((s) => state.done[`${m.id}-${s}`]).length;
          return (
            <Link key={m.id} to={`${BASE}/module/${m.id}/theory`} className="rounded-2xl border border-border bg-card/60 p-4 hover:border-primary/60 transition">
              <p className="text-xs text-primary font-semibold">Modul {m.id} · {d}/{SECTIONS.length}</p>
              <p className="font-display font-bold">{m.title.de}</p>
              {lang !== "de" && <p className="text-sm text-muted-foreground">{m.title[lang]}</p>}
              <p className="text-xs text-muted-foreground mt-1">{m.grammar}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

function ModulePage(ctx: Ctx) {
  const { moduleId, section } = useParams();
  const nav = useNavigate();
  const m = MODULES.find((x) => String(x.id) === moduleId);
  if (!m || !SECTIONS.includes(section as Section)) return <Navigate to={BASE} replace />;
  const sec = section as Section;
  const idx = SECTIONS.indexOf(sec);
  const doneKey = `${m.id}-${sec}`;
  const isDone = !!ctx.state.done[doneKey];
  const goNext = () => {
    if (idx < SECTIONS.length - 1) nav(`${BASE}/module/${m.id}/${SECTIONS[idx + 1]}`);
    else if (m.id < MODULES.length) nav(`${BASE}/module/${m.id + 1}/theory`);
    else nav(`${BASE}/exam`);
  };
  return (
    <div className="space-y-4">
      <BackButton to={BASE} />
      <div>
        <p className="text-xs text-primary font-semibold">Modul {m.id}</p>
        <h1 className="font-display text-2xl font-bold">{m.title.de}</h1>
        {ctx.lang !== "de" && <p className="text-muted-foreground">{m.title[ctx.lang]}</p>}
      </div>
      <nav className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 pr-8 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_85%,transparent)]">
        {SECTIONS.map((s) => (
          <Link key={s} to={`${BASE}/module/${m.id}/${s}`} className={cn("shrink-0 px-3 py-1.5 rounded-full text-sm border flex items-center gap-1",
            s === sec ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground")}>
            {ctx.state.done[`${m.id}-${s}`] && <CheckCircle2 className="w-3.5 h-3.5" />}{UI[s][ctx.lang]}
          </Link>
        ))}
      </nav>
      <SectionView key={doneKey} m={m} section={sec} {...ctx} />
      <div className="flex gap-2 pt-2">
        <button onClick={() => ctx.update((s) => ({ ...s, done: { ...s.done, [doneKey]: !isDone } }))}
          className={cn("flex-1 py-3 rounded-2xl font-semibold border", isDone ? "border-primary text-primary" : "border-border")}>
          {isDone ? `✓ ${UI.done[ctx.lang]}` : UI.markDone[ctx.lang]}
        </button>
        <button onClick={() => { if (!isDone) ctx.update((s) => ({ ...s, done: { ...s.done, [doneKey]: true } })); goNext(); }}
          className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground font-bold">{UI.next[ctx.lang]} →</button>
      </div>
    </div>
  );
}

function Dictionary({ lang }: { lang: L }) {
  const [q, setQ] = useState("");
  const words = useMemo(() => allVocab(), []);
  const list = words.filter((w) => !q || [w.de, w.ru, w.uk].some((x) => x.toLowerCase().includes(q.toLowerCase())));
  return (
    <div className="space-y-4">
      <BackButton to={BASE} />
      <h1 className="font-display text-2xl font-bold">{UI.dictionary[lang]} · {words.length}</h1>
      <div className="relative"><Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={UI.search[lang]} className="w-full rounded-xl border border-border bg-background pl-9 pr-3 py-2.5" /></div>
      <div className="space-y-2">
        {list.map((w, i) => (
          <div key={i} className="rounded-xl border border-border bg-card/60 p-3 flex justify-between gap-3">
            <div><p className="font-semibold flex items-center gap-1">{w.de}<SayBtn text={w.de} /></p><p className="text-xs italic text-muted-foreground">{w.example}</p></div>
            <div className="text-right text-sm"><p>{lang === "de" ? w.definition : w[lang]}</p><p className="text-xs text-muted-foreground">Modul {w.module}</p></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ExamList({ lang, state }: Ctx) {
  return (
    <div className="space-y-4">
      <BackButton to={BASE} />
      <h1 className="font-display text-2xl font-bold">{UI.exam[lang]}</h1>
      <p className="text-sm text-muted-foreground">{UI.disclaimer[lang]} <a className="underline text-primary" href={EXAM_SOURCE} target="_blank" rel="noreferrer">{UI.official[lang]}</a></p>
      {EXAMS.map((e) => {
        const rec = state.exams[`e${e.id}`];
        const sc = rec?.submitted ? scoreExam(e, rec.answers) : null;
        return (
          <Link key={e.id} to={`${BASE}/exam/${e.id}`} className="block rounded-2xl border border-border bg-card/60 p-4 hover:border-primary/60">
            <p className="font-display font-bold">Modelltest {e.id}</p>
            <p className="text-sm text-muted-foreground">Hören · Lesen · Schreiben · Sprechen</p>
            {sc && <p className="text-sm text-primary font-semibold mt-1">{sc.correct}/{sc.total} · {sc.percent}%</p>}
          </Link>
        );
      })}
    </div>
  );
}

function ExamPage(ctx: Ctx) {
  const { examId } = useParams();
  const exam = EXAMS.find((e) => String(e.id) === examId);
  if (!exam) return <Navigate to={`${BASE}/exam`} replace />;
  return <div className="space-y-4"><BackButton to={`${BASE}/exam`} /><ExamView exam={exam} {...ctx} /></div>;
}
