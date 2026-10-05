import { useEffect, useState } from "react";
import { Exam, L, Question, scoreExam, EXAM_SOURCE } from "./data";
import { DrState, getMedia } from "./store";
import { QuestionCard, UI } from "./ui";

const EXAM_MINUTES = 90;

export function ExamView({ exam, lang, state, update }: { exam: Exam; lang: L; state: DrState; update: (fn: (s: DrState) => DrState) => void }) {
  const ek = `e${exam.id}`;
  const rec = state.exams[ek] ?? { answers: {} };
  const submitted = !!rec.submitted;
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!rec.startedAt && !submitted) update((s) => ({ ...s, exams: { ...s.exams, [ek]: { answers: {}, ...s.exams[ek], startedAt: Date.now() } } }));
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ek]);
  const left = Math.max(0, EXAM_MINUTES * 60 - Math.floor((now - (rec.startedAt ?? now)) / 1000));
  const setA = (k: string, v: string) => update((s) => ({ ...s, exams: { ...s.exams, [ek]: { ...rec, ...s.exams[ek], answers: { ...(s.exams[ek]?.answers ?? {}), [k]: v } } } }));
  const media = getMedia();
  const score = scoreExam(exam, rec.answers);
  // Without a recording the script is shown, so Hören works as a reading-based practice.
  const showH = (part: string) => submitted || !media[`e${exam.id}-${part}`];

  const Q = (q: Question, k: string, i: number) => (
    <QuestionCard key={k + (submitted ? "s" : "")} q={q} idx={i} lang={lang} seed={exam.id} value={rec.answers[k]} reveal={submitted} onAnswer={(v) => !submitted && setA(k, v)} />
  );
  const Part = ({ title, children, audio }: { title: string; children: React.ReactNode; audio?: string }) => (
    <section className="space-y-3">
      <h3 className="font-display text-lg font-bold text-primary">{title}</h3>
      {audio && (media[audio] ? <audio src={media[audio]} controls className="w-full" /> : <p className="text-xs text-muted-foreground">{UI.noAudio[lang]}</p>)}
      {children}
    </section>
  );
  const Txt = ({ t }: { t: string }) => <div className="rounded-xl border border-border bg-card/60 p-4 text-sm whitespace-pre-line">{t}</div>;

  return (
    <div className="space-y-8">
      <div className="sticky top-0 z-10 flex items-center justify-between rounded-2xl border border-border bg-background/90 backdrop-blur px-4 py-2">
        <span className="font-semibold">Modelltest {exam.id}</span>
        {!submitted ? <span className="tabular-nums text-sm">{UI.timeLeft[lang]}: {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}</span>
          : <span className="text-sm font-semibold text-primary">{score.correct}/{score.total} · {score.percent}%</span>}
      </div>

      <Part title="Hören · Teil 1" audio={`e${exam.id}-h1`}>{exam.notes.map((n, i) => <div key={i} className="space-y-2">{showH("h1") && <Txt t={n.text} />}{Q(n.question, `h1-${i}`, i)}</div>)}</Part>
      <Part title="Hören · Teil 2" audio={`e${exam.id}-h2`}>{exam.radio.map((n, i) => <div key={i} className="space-y-2">{showH("h2") && <Txt t={n.text} />}{Q(n.question, `h2-${i}`, i)}</div>)}</Part>
      <Part title="Hören · Teil 3" audio={`e${exam.id}-h3`}>{showH("h3") && <Txt t={exam.dialog.text} />}{exam.dialog.questions.map((q, i) => Q(q, `h3-${i}`, i))}</Part>
      <Part title="Lesen · Teil 1"><Txt t={exam.directory.text} />{exam.directory.questions.map((q, i) => Q(q, `l1-${i}`, i))}</Part>
      <Part title="Lesen · Teil 2"><Txt t={exam.article.text} />{exam.article.questions.map((q, i) => Q(q, `l2-${i}`, i))}</Part>
      <Part title="Lesen · Teil 3">
        <div className="grid sm:grid-cols-2 gap-2">{Object.entries(exam.ads.items).map(([k, v]) => <div key={k} className="rounded-xl border border-border p-3 text-sm"><b className="text-primary mr-1">{k}</b>{v}</div>)}</div>
        <p className="text-xs text-muted-foreground">x = keine passende Anzeige</p>
        {exam.ads.questions.map((q, i) => Q(q, `l3-${i}`, i))}
      </Part>
      <Part title="Schreiben · Teil 1 (Formular)"><Txt t={exam.person} />{exam.fields.map((q, i) => Q(q, `f-${i}`, i))}</Part>
      <Part title="Schreiben · Teil 2">
        <Txt t={exam.letter} />
        <textarea rows={6} value={state.drafts[`${ek}-letter`] ?? ""} onChange={(e) => update((s) => ({ ...s, drafts: { ...s.drafts, [`${ek}-letter`]: e.target.value } }))}
          className="w-full rounded-xl border border-border bg-background p-3 text-sm" />
        <p className="text-xs text-muted-foreground">{UI.selfCheck[lang]}</p>
        {submitted && <div className="rounded-xl bg-primary/10 p-3 text-sm">{exam.model}</div>}
      </Part>
      <Part title="Sprechen">{exam.oral.map((o, i) => <Txt key={i} t={`${i + 1}. ${o}`} />)}</Part>

      {!submitted ? (
        <button onClick={() => update((s) => ({ ...s, exams: { ...s.exams, [ek]: { ...rec, submitted: true } } }))}
          className="w-full py-3 rounded-2xl bg-primary text-primary-foreground font-bold">{UI.submit[lang]}</button>
      ) : (
        <div className="rounded-2xl border border-primary/40 bg-primary/10 p-5 space-y-2 text-center">
          <p className="text-sm text-muted-foreground">{UI.result[lang]}</p>
          <p className="text-3xl font-display font-bold">{score.correct}/{score.total} · {score.percent}%</p>
          <p>{score.percent >= 60 ? UI.passed[lang] : UI.notPassed[lang]}</p>
          <button onClick={() => update((s) => ({ ...s, exams: { ...s.exams, [ek]: { answers: {}, startedAt: Date.now() } } }))}
            className="mt-2 px-4 py-2 rounded-xl border border-border">{UI.retry[lang]}</button>
        </div>
      )}
      <p className="text-xs text-muted-foreground text-center">{UI.disclaimer[lang]} <a className="underline text-primary" href={EXAM_SOURCE} target="_blank" rel="noreferrer">{UI.official[lang]}</a></p>
    </div>
  );
}
