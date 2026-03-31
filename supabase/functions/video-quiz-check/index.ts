import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { questions, answers } = await req.json();
    if (!Array.isArray(questions) || !Array.isArray(answers)) {
      return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    let correct = 0;
    const results = questions.map((q: any, i: number) => {
      const userAnswer = answers[i];
      const isCorrect = userAnswer === q.correct_index;
      if (isCorrect) correct++;
      return {
        question: q.question,
        correct: isCorrect,
        correctAnswer: q.options?.[q.correct_index],
        userAnswer: q.options?.[userAnswer],
        explanation: q.explanation || null,
      };
    });

    const score = Math.round((correct / questions.length) * 100);

    return new Response(JSON.stringify({ score, correct, total: questions.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
