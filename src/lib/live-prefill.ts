import { supabase } from "@/integrations/supabase/client";
import { paragraphsToHtml, plain } from "@/lib/rich-text";

/** Текст і тема, створені в «Читанні», — єдине джерело для Граматики й Письма. */
export async function getReadingSource(classId: string): Promise<{ text: string; title: string; questions: string[]; grammar: string[] } | null> {
  const { data } = await (supabase as any).from("live_class_reading").select("text, topic").eq("class_id", classId).maybeSingle();
  const text = (data?.topic?.text_de as string) || plain(data?.text || "");
  if (!text?.trim()) return null;
  return { text: text.slice(0, 6000), title: data?.topic?.title_de || "", questions: data?.topic?.questions || [], grammar: data?.topic?.grammar_focus || [] };
}

export async function generateGrammarFromText(opts: { level: string; source: { text: string; title: string; grammar: string[] }; count?: number; studentId?: string }) {
  const { data, error } = await supabase.functions.invoke("generate-grammar-lesson", {
    body: { level: opts.level, topic: opts.source.grammar[0] || opts.source.title || "Grammatik im Text", source_text: opts.source.text, examples: 6, practice: opts.count ?? 16, student_id: opts.studentId },
  });
  if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
  return (data as any).lesson;
}

export async function generateWritingFromText(opts: { level: string; source: { text: string; title: string; questions: string[] } }) {
  const { data, error } = await supabase.functions.invoke("generate-writing-topic", {
    body: { level: opts.level, theme: opts.source.title, source_text: opts.source.text, questions: opts.source.questions },
  });
  if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
  return (data as any).topic;
}

/** Після створення тексту в «Читанні» на фоні готує «Граматику» й «Письмо» саме по цьому тексту. */
export async function prefillGrammarAndWriting(opts: {
  classId: string;
  level: string;
  source: { text: string; title: string; questions: string[]; grammar: string[] };
  studentId?: string;
}) {
  const { classId, level, source, studentId } = opts;
  const { data: u } = await supabase.auth.getUser();
  const me = u.user?.id ?? null;

  const grammar = (async () => {
    const l = await generateGrammarFromText({ level, source, studentId });
    const marks = `${l.reading?.title_de ? `<p><b>${l.reading.title_de}</b></p>` : ""}${paragraphsToHtml(l.reading?.text_de || "")}`;
    await (supabase as any).from("live_class_grammar").upsert({ class_id: classId, lesson: l, marks, revealed: [], updated_by: me }, { onConflict: "class_id" });
  })();

  const writing = (async () => {
    const topic = await generateWritingFromText({ level, source });
    await (supabase as any).from("live_class_writing").upsert({ class_id: classId, topic, updated_by: me }, { onConflict: "class_id" });
  })();

  const res = await Promise.allSettled([grammar, writing]);
  return { grammar: res[0].status === "fulfilled", writing: res[1].status === "fulfilled" };
}
