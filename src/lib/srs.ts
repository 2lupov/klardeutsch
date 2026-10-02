// Упрощённый SM-2 (как в Anki): 4 оценки, растущий интервал, штраф за "Again".
// Чистые функции без побочных эффектов — легко проверить в голове и протестировать.

export type SrsStatus = "new" | "learning" | "known";
export type SrsGrade = "again" | "hard" | "good" | "easy";

export type SrsCard = {
  ease: number;          // ease factor, старт 2.5, не ниже 1.3
  interval_days: number;
  reps: number;
  due_at: string;         // ISO
  status: SrsStatus;
};

const MIN_EASE = 1.3;
const KNOWN_AT_DAYS = 21; // когда интервал дорастает до 3 недель — считаем слово выученным

export function initCard(now: Date = new Date()): SrsCard {
  return { ease: 2.5, interval_days: 0, reps: 0, due_at: now.toISOString(), status: "new" };
}

export function isDue(card: Pick<SrsCard, "due_at">, now: Date = new Date()): boolean {
  return new Date(card.due_at).getTime() <= now.getTime();
}

export function gradeCard(card: SrsCard, grade: SrsGrade, now: Date = new Date()): SrsCard {
  let { ease, interval_days, reps } = card;

  if (grade === "again") {
    // Не наказываем бесконечно — просто возвращаем слово в очередь скоро (через час)
    // и слегка снижаем ease, не обнуляя весь прогресс по интервалу.
    reps = 0;
    ease = Math.max(MIN_EASE, ease - 0.2);
    interval_days = 1 / 24;
  } else {
    reps += 1;
    if (grade === "hard") ease = Math.max(MIN_EASE, ease - 0.15);
    if (grade === "easy") ease = ease + 0.15;

    if (reps === 1) interval_days = 1;
    else if (reps === 2) interval_days = grade === "hard" ? 3 : grade === "easy" ? 5 : 4;
    else {
      const mult = grade === "hard" ? 0.8 : grade === "easy" ? 1.3 : 1;
      interval_days = Math.round(Math.max(1, interval_days) * ease * mult);
    }
  }

  const due_at = new Date(now.getTime() + interval_days * 86_400_000).toISOString();
  const status: SrsStatus = interval_days >= KNOWN_AT_DAYS ? "known" : reps === 0 ? "new" : "learning";

  return { ease, interval_days, reps, due_at, status };
}
