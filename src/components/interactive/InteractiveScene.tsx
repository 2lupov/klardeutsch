import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, ChevronRight, Volume2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { addMyWord } from "@/components/dictionary/AddMyWordForm";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { SceneBlock } from "@/lib/interactivePages";

/** Animated, student-facing rendering of an interactive encyclopedia page. */

const speak = (text: string) => {
  try {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "de-DE";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(u);
  } catch {
    /* ignore */
  }
};

function BlockShell({ title, children }: { title?: string | null; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-border bg-card/80 p-4 md:p-5"
    >
      {title ? (
        <h3 className="font-display font-bold text-foreground text-base md:text-lg mb-3">{title}</h3>
      ) : null}
      {children}
    </motion.section>
  );
}

/* ───────── text ───────── */

function TextBlock({ block }: { block: Extract<SceneBlock, { type: "text" }> }) {
  const terms = (block.terms ?? []).filter(Boolean);
  const render = (p: string) => {
    if (!terms.length) return p;
    const re = new RegExp(`(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`, "gi");
    return p.split(re).map((part, i) =>
      terms.some((t) => t.toLowerCase() === part.toLowerCase()) ? (
        <span key={i} className="font-semibold text-primary">{part}</span>
      ) : (
        part
      ),
    );
  };
  return (
    <BlockShell title={block.title}>
      <div className="space-y-2.5">
        {block.paragraphs.map((p, i) => (
          <p key={i} className="text-sm md:text-base leading-relaxed text-foreground/90">{render(p)}</p>
        ))}
      </div>
    </BlockShell>
  );
}

/* ───────── orbits ───────── */

function OrbitBlock({ block }: { block: Extract<SceneBlock, { type: "orbit" }> }) {
  const reduce = useReducedMotion();
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const count = block.objects.length;

  return (
    <BlockShell title={block.title}>
      <div className="relative w-full aspect-square max-w-[560px] mx-auto">
        {block.objects.map((o, i) => {
          const radius = ((i + 1) / (count + 0.6)) * 50; // % of half-size
          const duration = Math.max(4, 26 / (o.speed || 1)) * (i * 0.35 + 1);
          const size = o.size || 14;
          return (
            <div key={i} className="absolute inset-0">
              {/* orbit path */}
              <div
                className="absolute rounded-full border border-border/60"
                style={{
                  left: `${50 - radius}%`,
                  top: `${50 - radius}%`,
                  width: `${radius * 2}%`,
                  height: `${radius * 2}%`,
                }}
              />
              {/* rotating carrier */}
              <motion.div
                className="absolute"
                style={{
                  left: `${50 - radius}%`,
                  top: `${50 - radius}%`,
                  width: `${radius * 2}%`,
                  height: `${radius * 2}%`,
                }}
                animate={reduce ? undefined : { rotate: 360 }}
                transition={{ duration, ease: "linear", repeat: Infinity }}
              >
                <button
                  onClick={() => setOpenIdx(openIdx === i ? null : i)}
                  title={o.label}
                  className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-background hover:ring-primary transition"
                  style={{
                    left: "100%",
                    top: "50%",
                    width: size * 1.6,
                    height: size * 1.6,
                    background: o.color || "hsl(var(--primary))",
                    boxShadow: o.ring ? `0 0 0 ${Math.max(3, size / 3)}px rgba(255,255,255,0.14)` : undefined,
                  }}
                />
              </motion.div>
            </div>
          );
        })}

        {/* center body */}
        <motion.div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full flex items-center justify-center text-[10px] font-bold text-background"
          style={{
            width: "18%",
            height: "18%",
            background: block.center.color || "hsl(var(--primary))",
            boxShadow: "0 0 60px rgba(250,204,21,0.35)",
          }}
          animate={reduce ? undefined : { scale: [1, 1.05, 1] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          {block.center.label}
        </motion.div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {block.objects.map((o, i) => (
          <button
            key={i}
            onClick={() => setOpenIdx(openIdx === i ? null : i)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
              openIdx === i ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted/50"
            }`}
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-full mr-2 align-middle"
              style={{ background: o.color || "hsl(var(--primary))" }}
            />
            {o.label}
          </button>
        ))}
      </div>

      {openIdx !== null && block.objects[openIdx]?.description ? (
        <motion.p
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 text-sm text-foreground/90 rounded-xl bg-muted/40 border border-border p-3"
        >
          <b className="text-primary">{block.objects[openIdx].label}:</b> {block.objects[openIdx].description}
        </motion.p>
      ) : null}
    </BlockShell>
  );
}

/* ───────── hotspots on the original scan ───────── */

function HotspotsBlock({ block }: { block: Extract<SceneBlock, { type: "hotspots" }> }) {
  const [src, setSrc] = useState<string | null>(block.image_url ?? null);
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    if (block.image_url || !block.image_path) return;
    let cancelled = false;
    supabase.storage
      .from("book-pages")
      .createSignedUrl(block.image_path, 60 * 60)
      .then(({ data }) => {
        if (!cancelled && data?.signedUrl) setSrc(data.signedUrl);
      });
    return () => {
      cancelled = true;
    };
  }, [block.image_url, block.image_path]);

  return (
    <BlockShell title={block.title}>
      <div className="relative rounded-xl overflow-hidden border border-border bg-background">
        {src ? (
          <img src={src} alt={block.title || "Buchseite"} loading="lazy" className="w-full h-auto" />
        ) : (
          <div className="h-48 flex items-center justify-center text-xs text-muted-foreground">Bild wird geladen…</div>
        )}
        {block.points.map((p, i) => (
          <button
            key={i}
            onClick={() => setOpen(open === i ? null : i)}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            <motion.span
              animate={{ scale: [1, 1.25, 1] }}
              transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.2 }}
              className="flex w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold items-center justify-center shadow-lg"
            >
              {i + 1}
            </motion.span>
          </button>
        ))}
      </div>
      <div className="mt-3 space-y-1.5">
        {block.points.map((p, i) => (
          <button
            key={i}
            onClick={() => setOpen(open === i ? null : i)}
            className={`w-full text-left px-3 py-2 rounded-xl border text-sm transition ${
              open === i ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"
            }`}
          >
            <span className="font-semibold text-primary mr-2">{i + 1}.</span>
            <span className="font-medium text-foreground">{p.label}</span>
            {open === i && p.description ? (
              <span className="block mt-1 text-xs text-muted-foreground">{p.description}</span>
            ) : null}
          </button>
        ))}
      </div>
    </BlockShell>
  );
}

/* ───────── scale ───────── */

function ScaleBlock({ block }: { block: Extract<SceneBlock, { type: "scale" }> }) {
  const max = Math.max(...block.items.map((i) => Math.abs(i.value)), 1);
  return (
    <BlockShell title={block.title}>
      <div className="space-y-2.5">
        {block.items.map((it, i) => (
          <div key={i}>
            <div className="flex items-baseline justify-between text-xs mb-1">
              <span className="font-medium text-foreground">{it.label}</span>
              <span className="text-muted-foreground">
                {it.value}
                {block.unit ? ` ${block.unit}` : ""}
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                initial={{ width: 0 }}
                whileInView={{ width: `${(Math.abs(it.value) / max) * 100}%` }}
                viewport={{ once: true }}
                transition={{ duration: 0.9, delay: i * 0.07, ease: "easeOut" }}
              />
            </div>
            {it.note ? <p className="mt-1 text-[11px] text-muted-foreground">{it.note}</p> : null}
          </div>
        ))}
      </div>
    </BlockShell>
  );
}

/* ───────── flip cards ───────── */

function FactsBlock({ block }: { block: Extract<SceneBlock, { type: "facts" }> }) {
  const [flipped, setFlipped] = useState<Record<number, boolean>>({});
  return (
    <BlockShell title={block.title}>
      <div className="grid gap-3 sm:grid-cols-2">
        {block.cards.map((c, i) => (
          <button
            key={i}
            onClick={() => setFlipped((f) => ({ ...f, [i]: !f[i] }))}
            className="relative h-32 [perspective:1000px] text-left"
          >
            <motion.div
              className="absolute inset-0 [transform-style:preserve-3d]"
              animate={{ rotateY: flipped[i] ? 180 : 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="absolute inset-0 rounded-xl border border-border bg-muted/30 p-3 flex items-center [backface-visibility:hidden]">
                <span className="text-sm font-medium text-foreground">{c.front}</span>
              </div>
              <div className="absolute inset-0 rounded-xl border border-primary/40 bg-primary/10 p-3 flex items-center [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <span className="text-sm text-foreground/90">{c.back}</span>
              </div>
            </motion.div>
          </button>
        ))}
      </div>
    </BlockShell>
  );
}

/* ───────── table ───────── */

function TableBlock({ block }: { block: Extract<SceneBlock, { type: "table" }> }) {
  return (
    <BlockShell title={block.title}>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-xs md:text-sm">
          {block.headers.length ? (
            <thead>
              <tr className="bg-primary/10">
                {block.headers.map((h, i) => (
                  <th key={i} className="px-3 py-2 text-left font-bold text-primary">{h}</th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {block.rows.map((r, ri) => (
              <tr key={ri} className="border-t border-border/40 hover:bg-primary/5 transition-colors">
                {r.map((c, ci) => (
                  <td key={ci} className={`px-3 py-2 text-foreground/90 ${ci === 0 ? "font-medium" : ""}`}>{c}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </BlockShell>
  );
}

/* ───────── vocab ───────── */

function VocabBlock({ block }: { block: Extract<SceneBlock, { type: "vocab" }> }) {
  const { user } = useAuth();
  const [saved, setSaved] = useState<Record<number, boolean>>({});

  const save = async (i: number, w: { de: string; article?: string | null; note?: string | null }) => {
    if (!user) return toast.error("Увійдіть, щоб зберігати слова");
    try {
      await addMyWord(user.id, {
        german: w.de,
        russian: w.note || "",
        article: w.article || null,
        example: null,
      });
      setSaved((s) => ({ ...s, [i]: true }));
      toast.success("Слово у вашому словнику");
    } catch {
      toast.error("Не вдалося зберегти слово");
    }
  };

  const articleColor = (a?: string | null) =>
    a === "der" ? "text-blue-400" : a === "die" ? "text-pink-400" : a === "das" ? "text-green-400" : "text-primary";

  return (
    <BlockShell title={block.title}>
      <div className="grid gap-2 sm:grid-cols-2">
        {block.words.map((w, i) => (
          <div key={i} className="rounded-xl border border-border bg-background/60 px-3 py-2">
            <div className="flex items-center gap-2">
              <p className="font-display text-sm md:text-base text-foreground flex-1 min-w-0 truncate">
                {w.article ? <span className={`mr-1 ${articleColor(w.article)}`}>{w.article}</span> : null}
                {w.de}
              </p>
              <button
                onClick={() => speak(`${w.article ? w.article + " " : ""}${w.de}`)}
                className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground"
                title="Aussprache"
              >
                <Volume2 className="w-4 h-4" />
              </button>
              <button
                onClick={() => save(i, w)}
                disabled={saved[i]}
                className="p-1.5 rounded-lg hover:bg-muted/60 text-muted-foreground disabled:text-primary"
                title="У мій словник"
              >
                <Check className="w-4 h-4" />
              </button>
            </div>
            {w.note ? <p className="text-xs text-muted-foreground mt-0.5">{w.note}</p> : null}
          </div>
        ))}
      </div>
    </BlockShell>
  );
}

/* ───────── quiz ───────── */

function QuizBlock({
  block,
  onScore,
}: {
  block: Extract<SceneBlock, { type: "quiz" }>;
  onScore?: (correct: number, total: number) => void;
}) {
  const [picked, setPicked] = useState<Record<number, number>>({});

  const answeredAll = Object.keys(picked).length === block.questions.length;
  const correct = useMemo(
    () => block.questions.filter((q, i) => picked[i] === q.correct_index).length,
    [picked, block.questions],
  );

  useEffect(() => {
    if (answeredAll) onScore?.(correct, block.questions.length);
  }, [answeredAll, correct, block.questions.length, onScore]);

  return (
    <BlockShell title={block.title || "Mini-Test"}>
      <div className="space-y-4">
        {block.questions.map((q, qi) => (
          <div key={qi} className="space-y-2">
            <p className="text-sm font-medium text-foreground">
              {qi + 1}. {q.question}
            </p>
            <div className="grid gap-2">
              {q.options.map((o, oi) => {
                const chosen = picked[qi] === oi;
                const done = picked[qi] !== undefined;
                const isRight = oi === q.correct_index;
                return (
                  <button
                    key={oi}
                    onClick={() => setPicked((p) => (p[qi] === undefined ? { ...p, [qi]: oi } : p))}
                    className={`flex items-center gap-2 text-left px-3 py-2 rounded-xl border text-sm transition ${
                      done && isRight
                        ? "border-green-500/60 bg-green-500/10 text-foreground"
                        : chosen
                          ? "border-red-500/60 bg-red-500/10 text-foreground"
                          : "border-border hover:bg-muted/40"
                    }`}
                  >
                    {done && isRight ? <Check className="w-4 h-4 text-green-500 shrink-0" /> : null}
                    {done && chosen && !isRight ? <X className="w-4 h-4 text-red-500 shrink-0" /> : null}
                    <span>{o}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      {answeredAll ? (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="mt-4 text-sm font-display font-bold text-primary flex items-center gap-2"
        >
          <ChevronRight className="w-4 h-4" />
          {correct} / {block.questions.length} richtig
        </motion.p>
      ) : null}
    </BlockShell>
  );
}

/* ───────── scene ───────── */

export function SceneBlockView({
  block,
  onScore,
}: {
  block: SceneBlock;
  onScore?: (correct: number, total: number) => void;
}) {
  switch (block.type) {
    case "text":
      return <TextBlock block={block} />;
    case "orbit":
      return <OrbitBlock block={block} />;
    case "hotspots":
      return <HotspotsBlock block={block} />;
    case "scale":
      return <ScaleBlock block={block} />;
    case "facts":
      return <FactsBlock block={block} />;
    case "table":
      return <TableBlock block={block} />;
    case "vocab":
      return <VocabBlock block={block} />;
    case "quiz":
      return <QuizBlock block={block} onScore={onScore} />;
    default:
      return null;
  }
}

export default function InteractiveScene({
  scene,
  onScore,
  className = "",
}: {
  scene: SceneBlock[];
  onScore?: (correct: number, total: number) => void;
  className?: string;
}) {
  if (!scene?.length) {
    return <p className="text-sm text-muted-foreground">Ця сторінка ще порожня.</p>;
  }
  return (
    <div className={`space-y-4 ${className}`}>
      {scene.map((b, i) => (
        <SceneBlockView key={i} block={b} onScore={onScore} />
      ))}
    </div>
  );
}
