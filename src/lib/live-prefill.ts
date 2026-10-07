import { supabase } from "@/integrations/supabase/client";
import { paragraphsToHtml } from "@/lib/rich-text";

/**
 * Після створення тексту в «Читанні» на фоні готує «Граматику» і «Письмо» на ту саму тему.
 * Помилки не заважають уроку — розділ просто лишиться для ручної генерації.
 */
export async function prefillGrammarAndWriting(opts: {
  classId: string;
  level: string;
  theme: string;
  grammarFocus?: string;
  studentId?: string;
}) {
  const { classId, level, theme, grammarFocus, studentId } = opts;
  const { data: u } = await supabase.auth.getUser();
  const me = u.user?.id ?? null;
  const grammarTopic = (grammarFocus || theme).trim();

  const grammar = (async () => {
    if (!grammarTopic) return;
    const { data, error } = await supabase.functions.invoke("generate-grammar-lesson", {
      body: { level, topic: grammarTopic, examples: 6, student_id: studentId, reading_words: level === "A1" ? 70 : 110 },
    });
    if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
    const l = (data as any).lesson;
    const marks = `${l.reading?.title_de ? `<p><b>${l.reading.title_de}</b></p>` : ""}${paragraphsToHtml(l.reading?.text_de || "")}`;
    await (supabase as any).from("live_class_grammar").upsert(
      { class_id: classId, lesson: l, marks, revealed: [], updated_by: me },
      { onConflict: "class_id" },
    );
  })();

  const writing = (async () => {
    const { data, error } = await supabase.functions.invoke("generate-writing-topic", {
      body: { level, theme },
    });
    if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
    await (supabase as any).from("live_class_writing").upsert(
      { class_id: classId, topic: (data as any).topic, updated_by: me },
      { onConflict: "class_id" },
    );
  })();

  const res = await Promise.allSettled([grammar, writing]);
  return { grammar: res[0].status === "fulfilled", writing: res[1].status === "fulfilled" };
}
