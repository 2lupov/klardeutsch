import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  LIVE_SECTIONS,
  LiveSection,
  LiveClass as LiveClassRow,
  LiveItem,
  fetchLiveItems,
  markSectionSeen,
} from "@/lib/live-class";
import { toast } from "sonner";
import { BoardView } from "@/components/live/BoardRender";
import BoardStudentView from "@/components/live/BoardStudentView";
import type { BoardCam } from "@/components/live/BoardRender";
import { signedPageUrl } from "@/lib/books";

export default function LiveClass() {
  const { id } = useParams<{ id: string }>();
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  const [cls, setCls] = useState<LiveClassRow | null>(null);
  const [items, setItems] = useState<LiveItem[]>([]);
  const [section, setSection] = useState<LiveSection>("board");
  const [seen, setSeen] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, { answer: string; is_correct: boolean | null }>>({});
  const [ready, setReady] = useState(false);
  const [boardFull, setBoardFull] = useState(false);
  const [bookPageUrl, setBookPageUrl] = useState<string | null>(null);
  const boardChanRef = useRef<any>(null);

  const reportCam = (cam: BoardCam) => {
    boardChanRef.current?.send({ type: "broadcast", event: "studentcam", payload: { cam } });
  };

  const bookPagePath = cls?.book_page?.image_path ?? null;
  useEffect(() => {
    let cancelled = false;
    if (!bookPagePath) { setBookPageUrl(null); return; }
    (async () => {
      const url = await signedPageUrl(bookPagePath);
      if (!cancelled) setBookPageUrl(url);
    })();
    return () => { cancelled = true; };
  }, [bookPagePath]);

  useEffect(() => {
    if (!loading && !user) navigate("/auth", { replace: true });
  }, [user, loading, navigate]);

  // initial load
  useEffect(() => {
    if (!id || !user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from("live_classes").select("*").eq("id", id).maybeSingle();
      if (cancelled) return;
      if (!data || (data as any).status === "ended") { navigate("/assignments", { replace: true }); return; }
      setCls(data as unknown as LiveClassRow);
      setItems(await fetchLiveItems(id));
      const { data: seenRows } = await supabase
        .from("live_class_seen")
        .select("section, last_seen_at")
        .eq("class_id", id)
        .eq("student_id", user.id);
      const map: Record<string, string> = {};
      (seenRows || []).forEach((r: any) => { map[r.section] = r.last_seen_at; });
      const { data: ansRows } = await supabase
        .from("live_class_answers")
        .select("item_id, answer, is_correct")
        .eq("class_id", id)
        .eq("student_id", user.id);
      const amap: Record<string, any> = {};
      (ansRows || []).forEach((r: any) => { amap[r.item_id] = { answer: r.answer, is_correct: r.is_correct }; });
      if (cancelled) return;
      setSeen(map);
      setAnswers(amap);
      setReady(true);
    })();
    return () => { cancelled = true; };
  }, [id, user, navigate]);

  // realtime
  useEffect(() => {
    if (!id) return;
    const ch = supabase
      .channel(`live-class:${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_classes", filter: `id=eq.${id}` },
        ({ new: c }: any) => {
          setCls(c as LiveClassRow);
          if (c?.status === "ended") {
            toast.success("Урок завершено");
            navigate("/assignments", { replace: true });
          }
        })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_class_items", filter: `class_id=eq.${id}` },
        ({ new: it }: any) => {
          setItems((prev) => [...prev, it as LiveItem]);
          const label = LIVE_SECTIONS.find((s) => s.key === (it as LiveItem).section)?.label;
          if (label) toast.info(`Новий матеріал: ${label}`);
        })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "live_class_items", filter: `class_id=eq.${id}` },
        ({ old: it }: any) => setItems((prev) => prev.filter((p) => p.id !== it.id)))
      .subscribe();

    // Миттєвий стрім дошки від вчителя
    const boardCh = supabase
      .channel(`live-board:${id}`)
      .on("broadcast", { event: "board" }, ({ payload }: any) => {
        if (!payload?.board) return;
        setCls((prev) => (prev ? ({ ...prev, board: payload.board } as LiveClassRow) : prev));
      })
      .subscribe();
    boardChanRef.current = boardCh;

    return () => { supabase.removeChannel(ch); supabase.removeChannel(boardCh); boardChanRef.current = null; };
  }, [id, navigate]);


  // Учень сам вибирає розділ — вчитель його не перекидає.
  // Про новий матеріал повідомляє червоний індикатор у сайдбарі.


  // mark current section as seen
  useEffect(() => {
    if (!id || !user || !ready) return;
    const stamp = new Date().toISOString();
    setSeen((s) => ({ ...s, [section]: stamp }));
    markSectionSeen(id, user.id, section);
  }, [section, items.length, id, user, ready]);

  const newCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const it of items) {
      if (it.section === section) continue;
      const last = seen[it.section];
      if (!last || new Date(it.created_at) > new Date(last)) counts[it.section] = (counts[it.section] || 0) + 1;
    }
    return counts;
  }, [items, seen, section]);

  const sectionItems = items.filter((i) => i.section === section);

  const submitAnswer = async (item: LiveItem, value: string) => {
    if (!id || !user) return;
    const correct = item.kind === "question" && item.content?.correct != null
      ? String(value).trim().toLowerCase() === String(item.content.correct).trim().toLowerCase()
      : null;
    setAnswers((a) => ({ ...a, [item.id]: { answer: value, is_correct: correct } }));
    const { error } = await supabase
      .from("live_class_answers")
      .upsert({ class_id: id, item_id: item.id, student_id: user.id, answer: value, is_correct: correct },
        { onConflict: "item_id,student_id" });
    if (error) toast.error("Не вдалося надіслати відповідь");
    else toast.success("Відповідь надіслано");
  };

  if (!cls) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-background">
        <span className="font-display text-muted-foreground animate-pulse">KLAR</span>
      </div>
    );
  }

  return (
    <div className="h-[100dvh] flex bg-background overflow-hidden">
      {/* Permanent sidebar */}
      <aside className="w-[76px] md:w-56 shrink-0 h-full border-r border-border bg-card/60 flex flex-col">
        <div className="h-16 px-3 md:px-4 flex items-center border-b border-border">
          <span className="font-display font-bold text-primary text-sm">KLAR</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-2 space-y-1">
          {LIVE_SECTIONS.map((s) => {
            const active = s.key === section;
            const badge = newCounts[s.key];
            return (
              <button
                key={s.key}
                onClick={() => setSection(s.key)}
                className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-display font-medium transition ${
                  active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                }`}
              >
                <span className="text-base">{s.icon}</span>
                <span className="hidden md:inline truncate">{s.label}</span>
                {badge ? (
                  <span className="absolute right-2 top-1.5 md:static md:ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border">
          <span className="text-[10px] text-muted-foreground hidden md:block">Урок триває</span>
          <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      </aside>

      <main className={`flex-1 h-full ${section === "board" ? "overflow-hidden flex flex-col" : "overflow-y-auto"}`}>
        <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-5 py-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-widest text-primary font-bold">Живий урок</p>
            <h1 className="font-display text-xl font-bold text-foreground truncate">{cls.title}</h1>
          </div>
          {section === "board" && (
            <button
              onClick={() => setBoardFull(true)}
              className="shrink-0 px-3 py-2 rounded-xl border border-border text-xs font-medium text-foreground hover:bg-muted/60"
            >
              На весь екран
            </button>
          )}
        </header>

        {section === "board" ? (
          <div className={`flex-1 min-h-0 p-3 flex flex-col gap-3 ${cls.book_page ? "overflow-y-auto" : ""}`}>
            <div className={`w-full rounded-2xl border border-border bg-card overflow-hidden ${cls.book_page ? "h-[55vh] shrink-0" : "h-full"}`}>
              <BoardStudentView elements={cls.board || []} className="w-full h-full" onCamChange={reportCam} />
            </div>
            {cls.book_page && (
              <div className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="px-3 py-2 text-xs text-muted-foreground border-b border-border">
                  {cls.book_page.book_title}
                  {cls.book_page.page_number ? ` · с. ${cls.book_page.page_number}` : ""}
                </div>
                {bookPageUrl ? (
                  <img src={bookPageUrl} alt="Сторінка підручника" className="w-full" />
                ) : (
                  <div className="h-40 flex items-center justify-center text-xs text-muted-foreground">
                    Завантаження сторінки…
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="p-5 max-w-3xl">
            {sectionItems.length === 0 ? (
              <p className="text-sm text-muted-foreground">Викладач ще нічого не додав у цей розділ.</p>
            ) : (
              <div className="space-y-4">
                {sectionItems.map((it) => (
                  <ItemCard key={it.id} item={it} answer={answers[it.id]} onAnswer={submitAnswer} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {boardFull && (
        <div className="fixed inset-0 z-50 bg-background flex flex-col">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="font-display font-bold text-foreground text-sm">Дошка — {cls.title}</span>
            <button
              onClick={() => setBoardFull(false)}
              className="px-3 py-1.5 rounded-xl border border-border text-xs font-medium hover:bg-muted/60"
            >
              Закрити
            </button>
          </div>
          <div className="flex-1 min-h-0 p-2">
            <BoardStudentView elements={cls.board || []} className="w-full h-full" onCamChange={reportCam} />
          </div>
        </div>
      )}
    </div>
  );
}

export function Board({ strokes }: { strokes: any[] }) {
  return (
    <div className="rounded-2xl border border-border bg-card aspect-[4/3] w-full overflow-hidden">
      <BoardView elements={strokes || []} className="w-full h-full" />
    </div>
  );
}

function ItemCard({
  item,
  answer,
  onAnswer,
}: {
  item: LiveItem;
  answer?: { answer: string; is_correct: boolean | null };
  onAnswer: (item: LiveItem, value: string) => void;
}) {
  const [value, setValue] = useState(answer?.answer || "");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      {item.title && <h3 className="font-display font-semibold text-foreground mb-2">{item.title}</h3>}

      {item.kind === "text" && (
        <p className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">{item.content?.body}</p>
      )}

      {item.kind === "audio" && (
        <audio ref={audioRef} controls src={item.content?.url} className="w-full mt-1" />
      )}

      {item.kind === "word" && (
        <div className="space-y-1">
          <p className="font-display text-lg text-foreground">
            {item.content?.article ? <span className="text-primary mr-1">{item.content.article}</span> : null}
            {item.content?.term}
          </p>
          <p className="text-sm text-muted-foreground">{item.content?.translation}</p>
          {item.content?.example && <p className="text-xs italic text-muted-foreground/80">{item.content.example}</p>}
        </div>
      )}

      {item.kind === "question" && (
        <div className="space-y-3">
          <p className="text-sm text-foreground/90">{item.content?.question}</p>
          {Array.isArray(item.content?.options) && item.content.options.length > 0 ? (
            <div className="grid gap-2">
              {item.content.options.map((o: string, i: number) => (
                <button
                  key={i}
                  onClick={() => { setValue(o); onAnswer(item, o); }}
                  className={`text-left px-3 py-2 rounded-xl border text-sm transition ${
                    value === o ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted/50"
                  }`}
                >
                  {o}
                </button>
              ))}
            </div>
          ) : (
            <div className="flex gap-2">
              <input
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="Твоя відповідь…"
                className="flex-1 px-3 py-2 rounded-xl border border-border bg-background text-sm"
              />
              <button
                onClick={() => onAnswer(item, value)}
                className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium"
              >
                Надіслати
              </button>
            </div>
          )}
          {answer?.is_correct != null && (
            <p className={`text-xs font-medium ${answer.is_correct ? "text-green-600" : "text-red-500"}`}>
              {answer.is_correct ? "✓ Правильно" : "✗ Спробуй ще"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
