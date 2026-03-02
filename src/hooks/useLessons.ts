import { supabase } from "@/integrations/supabase/client";
import type { VocabCard, GrammarQuestion, ReadingText, ListeningText, CategoryData, Level } from "@/data/lessons";

type Category = "vocabulary" | "grammar" | "reading" | "listening";

export async function fetchTopics(level: Level, category: Category): Promise<string[]> {
  let topics: string[] = [];

  switch (category) {
    case "vocabulary": {
      const { data } = await supabase
        .from("vocab_cards")
        .select("topic")
        .eq("level", level);
      topics = [...new Set((data ?? []).map((d: any) => d.topic as string))];
      break;
    }
    case "grammar": {
      const { data } = await supabase
        .from("grammar_lessons")
        .select("topic")
        .eq("level", level);
      const { data: qData } = await supabase
        .from("grammar_questions")
        .select("topic")
        .eq("level", level);
      const all = [...(data ?? []), ...(qData ?? [])].map((d: any) => d.topic as string);
      topics = [...new Set(all)];
      break;
    }
    case "reading": {
      const { data } = await supabase
        .from("reading_texts")
        .select("topic")
        .eq("level", level);
      topics = [...new Set((data ?? []).map((d: any) => d.topic as string))];
      break;
    }
    case "listening": {
      const { data } = await supabase
        .from("listening_texts")
        .select("topic")
        .eq("level", level);
      topics = [...new Set((data ?? []).map((d: any) => d.topic as string))];
      break;
    }
  }

  return topics.length > 0 ? topics : ["Allgemein"];
}

export async function fetchLevelData(level: Level, topic?: string): Promise<CategoryData> {
  let vocabQuery = supabase.from("vocab_cards").select("*").eq("level", level);
  let grammarQuery = supabase.from("grammar_lessons").select("*").eq("level", level);
  let questionsQuery = supabase.from("grammar_questions").select("*").eq("level", level);
  let readingQuery = supabase.from("reading_texts").select("*, reading_questions(*)").eq("level", level);
  let listeningQuery = supabase.from("listening_texts").select("*, listening_questions(*), listening_dictations(*)").eq("level", level);

  if (topic) {
    vocabQuery = vocabQuery.eq("topic", topic);
    grammarQuery = grammarQuery.eq("topic", topic);
    questionsQuery = questionsQuery.eq("topic", topic);
    readingQuery = readingQuery.eq("topic", topic);
    listeningQuery = listeningQuery.eq("topic", topic);
  }

  const [vocabRes, grammarRes, questionsRes, readingRes, listeningRes] = await Promise.all([
    vocabQuery.order("sort_order"),
    grammarQuery.limit(1),
    questionsQuery.order("sort_order"),
    readingQuery.order("sort_order"),
    listeningQuery.order("sort_order"),
  ]);

  const vocabulary: VocabCard[] = (vocabRes.data ?? []).map((v) => ({
    id: v.id,
    german: v.german,
    russian: v.russian,
    example: v.example ?? undefined,
    article: v.article ?? undefined,
  }));

  const theory = grammarRes.data?.[0]?.theory ?? "";
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
