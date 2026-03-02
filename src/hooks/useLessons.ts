import { supabase } from "@/integrations/supabase/client";
import type { VocabCard, GrammarQuestion, ReadingText, ListeningText, CategoryData, Level } from "@/data/lessons";

export async function fetchLevelData(level: Level): Promise<CategoryData> {
  const [vocabRes, grammarRes, questionsRes, readingRes, listeningRes] = await Promise.all([
    supabase.from("vocab_cards").select("*").eq("level", level).order("sort_order"),
    supabase.from("grammar_lessons").select("*").eq("level", level).single(),
    supabase.from("grammar_questions").select("*").eq("level", level).order("sort_order"),
    supabase.from("reading_texts").select("*, reading_questions(*)").eq("level", level).order("sort_order"),
    supabase.from("listening_texts").select("*, listening_questions(*), listening_dictations(*)").eq("level", level).order("sort_order"),
  ]);

  const vocabulary: VocabCard[] = (vocabRes.data ?? []).map((v) => ({
    id: v.id,
    german: v.german,
    russian: v.russian,
    example: v.example ?? undefined,
    article: v.article ?? undefined,
  }));

  const theory = grammarRes.data?.theory ?? "";
  const grammarQuestions: GrammarQuestion[] = (questionsRes.data ?? []).map((q) => ({
    id: q.id,
    question: q.question,
    options: q.options,
    correctIndex: q.correct_index,
    explanation: q.explanation ?? undefined,
  }));

  const reading: ReadingText[] = (readingRes.data ?? []).map((r: any) => ({
    id: r.id,
    title: r.title,
    text: r.text,
    questions: (r.reading_questions ?? [])
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((q: any) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctIndex: q.correct_index,
        explanation: q.explanation ?? undefined,
      })),
  }));

  const listening: ListeningText[] = (listeningRes.data ?? []).map((l: any) => ({
    id: l.id,
    title: l.title,
    text: l.text,
    questions: (l.listening_questions ?? [])
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((q: any) => ({
        id: q.id,
        question: q.question,
        options: q.options,
        correctIndex: q.correct_index,
        explanation: q.explanation ?? undefined,
      })),
    dictations: (l.listening_dictations ?? [])
      .sort((a: any, b: any) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((d: any) => ({
        id: d.id,
        sentence: d.sentence,
      })),
  }));

  return {
    vocabulary,
    grammar: { theory, questions: grammarQuestions },
    reading,
    listening,
  };
}
