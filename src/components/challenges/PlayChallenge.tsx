import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle2, XCircle, Trophy, Loader2 } from "lucide-react";
import type { Challenge } from "@/pages/Challenges";

interface Props {
  challenge: Challenge;
  onFinished: () => void;
}

const PlayChallenge = ({ challenge, onFinished }: Props) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [currentRound, setCurrentRound] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [finished, setFinished] = useState(false);
  const [finalScore, setFinalScore] = useState(0);

  if (!user) return null;

  const isChallenger = challenge.challenger_id === user.id;
  const questions = challenge.questions;
  const question = questions[currentRound];

  const handleAnswer = (index: number) => {
    if (selected !== null) return;
    setSelected(index);
    setShowResult(true);

    const newAnswers = [...answers, index];
    setAnswers(newAnswers);

    setTimeout(() => {
      if (currentRound + 1 < questions.length) {
        setCurrentRound((r) => r + 1);
        setSelected(null);
        setShowResult(false);
      } else {
        submitResults(newAnswers);
      }
    }, 1200);
  };

  const submitResults = async (allAnswers: number[]) => {
    setSubmitting(true);
    const score = allAnswers.reduce((s, a, i) => s + (a === questions[i].correct_index ? 1 : 0), 0);
    setFinalScore(score);

    const updateData: any = {};

    if (isChallenger) {
      updateData.challenger_score = score;
      updateData.challenger_answers = allAnswers;
      updateData.status = "challenger_done";
    } else {
      updateData.opponent_score = score;
      updateData.opponent_answers = allAnswers;
      // Determine winner
      const challengerScore = challenge.challenger_score;
      if (score > challengerScore) {
        updateData.winner_id = user.id;
      } else if (score < challengerScore) {
        updateData.winner_id = challenge.challenger_id;
      } else {
        updateData.winner_id = null; // draw
      }
      updateData.status = "completed";
    }

    // Update challenge first
    await supabase.from("challenges").update(updateData).eq("id", challenge.id);

    // If challenger just finished, trigger auto-response for demo opponents
    if (isChallenger) {
      supabase.functions.invoke("auto-duel-response", {
        body: { challenge_id: challenge.id },
      }).then(({ data, error }) => {
        if (data?.auto) console.log("Demo auto-response:", data);
        if (error) console.error("auto-duel-response error:", error);
      });
    }


    // Notify challenger via Telegram when opponent finishes
    if (updateData.status === "completed") {
      const { data: myProfile } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .single();

      supabase.functions.invoke("notify-duel-result", {
        body: {
          challenger_id: challenge.challenger_id,
          opponent_name: myProfile?.display_name || "Соперник",
          challenger_score: challenge.challenger_score,
          opponent_score: score,
          challenge_type: challenge.challenge_type,
          level: challenge.level,
        },
      }).then(({ error }) => {
        if (error) console.error("notify-duel-result error:", error);
      });
      if (updateData.winner_id) {
        await supabase.rpc("award_xp", { p_user_id: updateData.winner_id, p_amount: challenge.xp_reward });
      } else {
        // Draw: both get half
        const half = Math.round(challenge.xp_reward / 2);
        await Promise.all([
          supabase.rpc("award_xp", { p_user_id: challenge.challenger_id, p_amount: half }),
          supabase.rpc("award_xp", { p_user_id: challenge.opponent_id, p_amount: half }),
        ]);
      }
    }

    setSubmitting(false);
    setFinished(true);
  };

  if (finished) {
    const total = questions.length;
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
        <Trophy className="w-12 h-12 text-primary" />
        <h2 className="font-display text-2xl font-bold text-foreground">{t("challengeComplete")}</h2>
        <p className="text-lg font-display font-bold text-gradient">{finalScore}/{total}</p>
        <p className="text-sm text-muted-foreground">
          {isChallenger ? t("waitingForOpponent") : t("resultsReady")}
        </p>
        <button
          onClick={onFinished}
          className="mt-4 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-display font-medium hover:bg-primary/90 transition-colors"
        >
          {t("back")}
        </button>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!question) return null;

  const isCorrect = selected === question.correct_index;

  return (
    <div className="flex-1 flex flex-col">
      {/* Progress */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs font-display font-semibold text-muted-foreground">
          {currentRound + 1}/{questions.length}
        </span>
        <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-300"
            style={{ width: `${((currentRound + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question */}
      <div className="glass-card p-6 mb-4 text-center">
        <p className="font-display text-lg font-bold text-foreground">{question.question}</p>
      </div>

      {/* Options */}
      <div className="flex flex-col gap-2">
        {question.options.map((opt: string, i: number) => {
          let style = "glass-card hover:border-primary/20";
          if (showResult) {
            if (i === question.correct_index) style = "bg-primary/15 border-primary/30 border";
            else if (i === selected && !isCorrect) style = "bg-destructive/15 border-destructive/30 border";
            else style = "glass-card opacity-50";
          }
          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={selected !== null}
              className={`px-4 py-3 rounded-xl text-sm font-display font-medium text-foreground text-left transition-all ${style}`}
            >
              <span className="flex items-center gap-2">
                {showResult && i === question.correct_index && <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />}
                {showResult && i === selected && !isCorrect && <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                {opt}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PlayChallenge;
